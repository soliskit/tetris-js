import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateRelease } from '../scripts/generate-release.mjs';
import { stop } from 'esbuild';
import { createHash } from 'node:crypto';
import express from 'express';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export async function derivedRelease(tag) {
  if (!['A', 'B'].includes(tag)) throw new Error('unexpected fixture tag');
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tetris-derived-release-')
  );
  const source = path.join(root, 'source');
  const output = path.join(root, 'dist');
  const evidence = path.join(root, 'evidence');
  let generationSettled = true;
  try {
    fs.cpSync('public', source, { recursive: true });
    fs.mkdirSync(evidence);
    const original = JSON.parse(
      fs.readFileSync('.release-evidence/release.json', 'utf8')
    );
    const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
    if (html.split('<title>Tetris</title>').length !== 2)
      throw new Error('source template changed');
    fs.writeFileSync(
      path.join(source, 'index.html'),
      html.replace('<title>Tetris</title>', '<title>Tetris ' + tag + '</title>')
    );
    fs.appendFileSync(
      path.join(source, 'script.js'),
      '\nwindow.__releaseTag = ' + JSON.stringify(tag) + ';\n'
    );
    const files = {};
    function walk(dir, prefix = '') {
      for (const item of fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
        const rel = prefix + item.name;
        if (item.isDirectory()) walk(path.join(dir, item.name), rel + '/');
        else if (item.isFile())
          files[rel] = hash(fs.readFileSync(path.join(dir, item.name)));
        else throw new Error('nonregular fixture input');
      }
    }
    walk(source);
    const inventory = path.join(evidence, 'inputs.json');
    fs.writeFileSync(
      inventory,
      JSON.stringify({
        schema: 1,
        sourceRevision:
          'DERIVED-FIXTURE-' + tag + '-FROM-' + original.sourceRevision,
        files
      })
    );
    generationSettled = false;
    const generation = generateRelease(source, output, inventory, evidence);
    const settled = generation
      .then(
        () => ({ ok: true }),
        (error) => ({ ok: false, error })
      )
      .then((result) => {
        generationSettled = true;
        return result;
      });
    async function waitSettled(milliseconds) {
      let timer;
      try {
        return await Promise.race([
          settled,
          new Promise((resolve) => {
            timer = setTimeout(() => resolve(null), milliseconds);
          })
        ]);
      } finally {
        clearTimeout(timer);
      }
    }
    let result = await waitSettled(20000);
    if (result === null) {
      stop();
      result = await waitSettled(5000);
      if (result === null)
        throw new Error(
          'generation did not settle after stop; owned root retained: ' + root
        );
      throw new Error(
        'generation timed out; settled after stop',
        result.ok ? undefined : { cause: result.error }
      );
    }
    stop();
    if (!result.ok) throw result.error;
    return {
      root,
      dir: output,
      tag,
      receipt: JSON.parse(
        fs.readFileSync(path.join(evidence, 'release.json'), 'utf8')
      ),
      close: () => fs.rmSync(root, { recursive: true })
    };
  } catch (error) {
    const errors = [error];
    if (generationSettled) {
      try {
        fs.rmSync(root, { recursive: true });
      } catch (cleanup) {
        errors.push(cleanup);
      }
    } else
      errors.push(
        new Error('INCOMPLETE: generation unsettled; root retained ' + root)
      );
    throw errors.length === 1
      ? error
      : new AggregateError(
          errors,
          'Derived release failed with cleanup evidence'
        );
  }
}
export async function serverFor(directory, scope) {
  const state = {
    directory,
    deny: false,
    requests: [],
    hold: null,
    corrupt: false
  };
  const app = express();
  app.use(scope, async (request, response, next) => {
    state.requests.push({ path: request.path, deny: state.deny });
    if (state.deny)
      return response
        .status(503)
        .set('x-delivery-denial', 'active')
        .send('DENIED');
    if (request.path === '/harness.html')
      return response
        .type('html')
        .send('<!doctype html><title>Private test harness</title>');
    if (request.path === '/sw.js') {
      if (state.hold) await state.hold.promise;
      let worker = fs.readFileSync(path.join(state.directory, 'sw.js'), 'utf8');
      if (state.corrupt) {
        // One known embedded body, unchanged digest: installation must reject.
        const match = worker.match(/\bbody: '([A-Za-z0-9+/=]+)'/);
        if (!match) throw new Error('worker payload shape changed');
        const body = match[1];
        const changed = (body[0] === 'A' ? 'B' : 'A') + body.slice(1);
        worker = worker.replace(match[0], () => "body: '" + changed + "'");
      }
      return response.set('Cache-Control', 'no-store').type('js').send(worker);
    }
    return express.static(state.directory)(request, response, next);
  });
  const server = app.listen(0, '127.0.0.1');
  async function closeServer() {
    state.hold?.release();
    server.closeAllConnections();
    let timer;
    try {
      await Promise.race([
        new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        ),
        new Promise((_resolve, reject) => {
          timer = setTimeout(
            () =>
              reject(new Error('server cleanup timeout; absence unverified')),
            5000
          );
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  let timer;
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('server startup timeout')),
          5000
        );
      })
    ]);
  } catch (primary) {
    try {
      await closeServer();
    } catch (cleanup) {
      throw new AggregateError(
        [primary, cleanup],
        'Server acquisition and cleanup failed',
        { cause: cleanup }
      );
    }
    throw primary;
  } finally {
    clearTimeout(timer);
  }
  const base = 'http://127.0.0.1:' + server.address().port + scope;
  return {
    state,
    base,
    holdWorker() {
      let release;
      const promise = new Promise((resolve) => {
        release = resolve;
      });
      state.hold = { promise, release };
    },
    releaseWorker() {
      state.hold?.release();
      state.hold = null;
    },
    close: closeServer
  };
}
export async function cleanupAll(resources, primary) {
  const errors = primary ? [primary] : [];
  for (const resource of resources) {
    if (!resource) continue;
    try {
      await resource.close();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1)
    throw new AggregateError(
      errors,
      'Primary failure and all independent cleanup errors'
    );
}
export async function ready(page, base) {
  await page.goto(base);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {
          once: true
        })
      );
  });
}
export async function denyWitness(host) {
  host.state.deny = true;
  const response = await fetch(host.base + 'deny-proof');
  if (
    response.status !== 503 ||
    response.headers.get('x-delivery-denial') !== 'active'
  )
    throw new Error('server denial not active');
}
export async function cacheSnapshot(page) {
  return page.evaluate(async () => {
    const result = [];
    for (const name of (await caches.keys()).sort()) {
      const cache = await caches.open(name);
      const records = [];
      for (const request of (await cache.keys()).sort((a, b) =>
        a.url.localeCompare(b.url)
      )) {
        const response = await cache.match(request);
        records.push({
          url: request.url,
          status: response.status,
          headers: [...response.headers],
          bytes: [...new Uint8Array(await response.arrayBuffer())]
        });
      }
      result.push({ name, records });
    }
    return result;
  });
}
