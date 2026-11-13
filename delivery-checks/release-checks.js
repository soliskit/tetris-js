// Generated-output checks, additive to original-source checks.
// for browser lifecycle/race/storage-injection qualification or legacy tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { createHash } from 'node:crypto';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = process.cwd();
const output = root + '/dist/';
const receipt = JSON.parse(
  fs.readFileSync(root + '/.release-evidence/release.json', 'utf8')
);
const text = (name) => fs.readFileSync(output + name, 'utf8');
function world(scope = 'https://qualification.invalid/nested/app/') {
  const handlers = new Map();
  let cacheAccess = 0;
  const worker = {
    registration: { scope },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (name, handler) => handlers.set(name, handler)
  };
  const sandbox = {
    self: worker,
    URL,
    Uint8Array,
    Map,
    Response,
    atob,
    crypto: webcrypto
  };
  Object.defineProperty(sandbox, 'caches', {
    get() {
      cacheAccess++;
      throw new Error('CacheStorage refused');
    }
  });
  vm.runInNewContext(text('sw.js'), sandbox, { timeout: 2000 });
  return { scope, handlers, cacheAccess: () => cacheAccess };
}
async function event(world, name) {
  let pending;
  world.handlers.get(name)({
    waitUntil: (value) => {
      pending = value;
    }
  });
  assert.ok(pending, 'lifecycle must be awaited');
  await pending;
}
async function fetchFrom(world, relative, mode = 'cors', method = 'GET') {
  let response;
  world.handlers.get('fetch')({
    request: { url: new URL(relative, world.scope).href, method, mode },
    respondWith: (value) => {
      response = value;
    }
  });
  return response ? await response : null;
}
test('generated release has one complete gameplay response and original source binding [APP-5] [APP-2]', () => {
  assert.equal(hash(receipt.bundleText), receipt.bundleSha256);
  const html = text('index.html');
  assert.equal(hash(html), receipt.documentSha256);
  assert.doesNotMatch(
    html,
    /<script[^>]*\bsrc=|rel="modulepreload"|rel="stylesheet"/
  );
  assert.equal([...html.matchAll(/<script type="module">/g)].length, 1);
  const inputs = JSON.parse(
    fs.readFileSync(root + '/.release-evidence/inputs.json', 'utf8')
  );
  assert.equal(inputs.sourceRevision, receipt.sourceRevision);
  assert.equal(
    hash(fs.readFileSync(root + '/public/script.js')),
    inputs.files['script.js']
  );
});
test('generated worker launches without CacheStorage reads or writes [APP-2] [APP-6] [SAF-2]', async () => {
  for (const scope of [
    'https://qualification.invalid/',
    'https://qualification.invalid/nested/app/'
  ]) {
    const w = world(scope);
    await event(w, 'install');
    await event(w, 'activate');
    const response = await fetchFrom(w, '', 'navigate');
    assert.equal(response.status, 200);
    assert.equal(
      hash(Buffer.from(await response.arrayBuffer())),
      receipt.documentSha256
    );
    assert.equal(w.cacheAccess(), 0);
  }
});
test('generated fixed responses have exact bytes and MIME under nested scope [APP-1] [APP-3] [APP-6]', async () => {
  const w = world();
  await event(w, 'install');
  for (const [file, digest] of Object.entries(receipt.builtIn)) {
    if (file === 'index.html') continue;
    const response = await fetchFrom(w, file);
    assert.equal(response.status, 200);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), digest);
    assert.equal(hash(fs.readFileSync(output + file)), digest);
    assert.match(
      response.headers.get('content-type'),
      file.endsWith('.png')
        ? /image\/png/
        : file.endsWith('.svg')
          ? /image\/svg\+xml/
          : /application\/manifest\+json/
    );
  }
});
test('unidentified legacy gameplay requests fail closed without guessed bytes [APP-2] [APP-6]', async () => {
  const w = world();
  for (const file of [
    'script.js',
    'style.css',
    'game/gameManager.js',
    'game/gameState.js',
    'game/inputController.js',
    'game/position.js',
    'game/session.js',
    'game/tetromino.js',
    'game/tetrominoFactory.js',
    '%73cript.js'
  ]) {
    const response = await fetchFrom(w, file);
    assert.equal(response.type, 'error');
    assert.equal(response.status, 0);
  }
  for (const file of ['unrelated.txt', '../other-project/script.js'])
    assert.equal(await fetchFrom(w, file), null);
  assert.equal(await fetchFrom(w, 'script.js', 'cors', 'POST'), null);
  assert.equal(w.cacheAccess(), 0);
});

import { spawn } from 'node:child_process';
import net from 'node:net';
async function openProduction(t) {
  const probe = net.createServer().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    probe.once('listening', resolve);
    probe.once('error', reject);
  });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ['index.js'], {
    env: { ...process.env, PORT: String(port) }
  });
  let closed = false;
  const close = new Promise((resolve) =>
    child.once('close', () => {
      closed = true;
      resolve();
    })
  );
  t.after(async () => {
    if (!closed) child.kill('SIGTERM');
    await Promise.race([
      close,
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);
    if (!closed) child.kill('SIGKILL');
    await Promise.race([
      close,
      new Promise((resolve) => setTimeout(resolve, 2000))
    ]);
    if (!closed) throw new Error('production server cleanup incomplete');
  });
  await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(
      () => reject(new Error('production server startup timeout')),
      5000
    );
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('running on port ' + port)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('production server exited before readiness'));
    });
  });
  return 'http://127.0.0.1:' + port;
}
test('production server serves generated files and refuses raw gameplay fallbacks [APP-3] [APP-5]', async (t) => {
  const base = await openProduction(t);
  for (const [file, type] of [
    ['/', 'text/html'],
    ['/sw.js', 'text/javascript'],
    ['/manifest.webmanifest', 'application/manifest+json'],
    ['/icons/icon.svg', 'image/svg+xml'],
    ['/icons/icon-512.png', 'image/png'],
    ['/tetris_preview.png', 'image/png']
  ]) {
    const response = await fetch(base + file);
    assert.equal(response.status, 200, file);
    assert.ok(response.headers.get('content-type').startsWith(type), file);
  }
  for (const file of [
    '/script.js',
    '/style.css',
    '/game/gameManager.js',
    '/.release-evidence/release.json',
    '/../package.json',
    '/missing.js'
  ])
    assert.equal((await fetch(base + file)).status, 404, file);
  assert.equal(
    hash(await (await fetch(base + '/')).text()),
    receipt.documentSha256
  );
});
