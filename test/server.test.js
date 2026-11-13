import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const serverFile = fileURLToPath(new URL('../index.js', import.meta.url));

/** @returns {Promise<number>} */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer().listen(0, () => {
      const address = probe.address();
      if (address === null || typeof address === 'string') {
        throw new Error('server test: probe has no port');
      }
      const { port } = address;
      probe.close(() => {
        resolve(port);
      });
    });
    probe.on('error', reject);
  });
}

// Starts index.js on a free port and resolves once it is listening.
/** @param {import('node:test').TestContext} t */
async function startServer(t) {
  const port = await freePort();
  const child = spawn(process.execPath, [serverFile, '--source-test'], {
    env: { ...process.env, PORT: String(port) }
  });
  t.after(() => child.kill());
  /** @type {Promise<void>} */
  const listening = new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (/** @type {Buffer | string} */ chunk) => {
      output += String(chunk);
      if (output.includes(`running on port ${String(port)}`)) resolve();
    });
    child.on('exit', (code) => {
      reject(new Error(`server exited with ${String(code)}: ${output}`));
    });
  });
  await listening;
  return `http://localhost:${String(port)}`;
}

void test('the server serves the game and its files with the right types [APP-3]', async (t) => {
  const base = await startServer(t);
  const expectations = [
    ['/', 'text/html'],
    ['/style.css', 'text/css'],
    ['/script.js', 'text/javascript'],
    ['/game/gameManager.js', 'text/javascript'],
    ['/sw.js', 'text/javascript'],
    ['/manifest.webmanifest', 'application/manifest+json'],
    ['/icons/icon-512.png', 'image/png'],
    ['/icons/icon.svg', 'image/svg+xml']
  ];
  for (const [path, type] of expectations) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const contentType = response.headers.get('content-type');
    assert.ok(
      contentType !== null && contentType.startsWith(type),
      `${path}: ${String(contentType)}`
    );
  }
  const page = await (await fetch(base + '/')).text();
  assert.match(page, /<title>Tetris<\/title>/);
});

void test('the server answers 404 for files that do not exist [APP-3]', async (t) => {
  const base = await startServer(t);
  for (const path of ['/missing.js', '/game/nope.js', '/../package.json']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
