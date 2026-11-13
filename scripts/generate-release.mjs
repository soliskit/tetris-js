import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build, transform, version } from 'esbuild';
import { format, resolveConfig } from 'prettier';

export async function generateRelease(
  sourceArg,
  outputArg,
  inventoryArg,
  evidenceArg
) {
  if (!sourceArg || !outputArg || !inventoryArg || !evidenceArg)
    throw new Error('all generation paths required');
  const source = await fs.realpath(sourceArg);
  const output = path.resolve(outputArg);
  if (output === source || output.startsWith(source + path.sep)) {
    throw new Error('output must not be inside source');
  }
  // An existing path, including a dangling symlink, is not a fresh output.
  try {
    await fs.lstat(output);
    throw new Error('output already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const read = (relative) => fs.readFile(path.join(source, relative));
  const inventory = JSON.parse(
    await fs.readFile(path.resolve(inventoryArg), 'utf8')
  );
  if (!inventory.sourceRevision || !inventory.files || inventory.schema !== 1)
    throw new Error('invalid input inventory');
  for (const [relative, expected] of Object.entries(inventory.files)) {
    if (path.isAbsolute(relative) || relative.split('/').includes('..'))
      throw new Error('unsafe inventory path');
    if (digest(await read(relative)) !== expected)
      throw new Error('input hash mismatch: ' + relative);
  }
  const htmlSource = (await read('index.html')).toString('utf8');
  const cssSource = (await read('style.css')).toString('utf8');
  const one = (input, needle, replacement) => {
    if (input.split(needle).length !== 2)
      throw new Error('unexpected template shape: ' + needle);
    return input.replace(needle, () => replacement);
  };

  const bundled = await build({
    absWorkingDir: source,
    entryPoints: ['script.js'],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'safari27',
    splitting: false,
    write: false,
    metafile: true,
    minify: false,
    sourcemap: false,
    legalComments: 'inline',
    logLevel: 'silent'
  });
  // Safari 27 target follows APP-4. Target declaration is not browser qualification.
  if (bundled.warnings.length)
    throw new Error('bundle warnings require review');
  if (bundled.outputFiles.length !== 1)
    throw new Error('expected one JS output');
  for (const file of Object.values(bundled.metafile.outputs)) {
    if (file.imports.length) throw new Error('residual output imports');
    if (file.cssBundle) throw new Error('unexpected separate CSS bundle');
  }
  for (const file of Object.values(bundled.metafile.inputs)) {
    for (const entry of file.imports) {
      if (entry.external || entry.kind === 'dynamic-import') {
        throw new Error('external/dynamic input import requires review');
      }
    }
  }
  const css = await transform(cssSource, {
    loader: 'css',
    target: 'safari27',
    minify: false,
    sourcemap: false,
    legalComments: 'inline',
    logLevel: 'silent'
  });
  if (css.warnings.length) throw new Error('CSS warnings require review');
  for (const input of Object.keys(bundled.metafile.inputs)) {
    if (!Object.prototype.hasOwnProperty.call(inventory.files, input))
      throw new Error('unbound module input: ' + input);
  }
  for (const required of [
    'index.html',
    'style.css',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png'
  ]) {
    if (!Object.prototype.hasOwnProperty.call(inventory.files, required))
      throw new Error('missing inventory binding: ' + required);
  }
  const js = bundled.outputFiles[0].text;
  if (/<\/script|<!--|<script/i.test(js) || /<\/style/i.test(css.code)) {
    throw new Error('unescaped inline closing sequence');
  }
  // This source has no CSS URL/import dependencies. Reject rather than silently
  // introducing an emitted external edge. Full syntax-aware closure is still a
  // review obligation; these string checks are not a complete runtime proof.
  if (/@import\b|url\s*\(/i.test(css.code))
    throw new Error('external CSS reference');
  let html = one(
    htmlSource,
    '<link rel="stylesheet" href="style.css" />',
    '<style>\n' + css.code + '</style>'
  );
  const preloads = [
    'gameManager.js',
    'gameState.js',
    'inputController.js',
    'position.js',
    'session.js',
    'tetromino.js',
    'tetrominoFactory.js'
  ];
  for (const file of preloads) {
    html = one(
      html,
      '<link rel="modulepreload" href="game/' + file + '" />',
      ''
    );
  }
  html = one(
    html,
    '<script type="module" src="script.js"></script>',
    '<script type="module">\n' + js + '\n</script>'
  );
  // Format the completed HTML once, including its embedded startup code.
  // Bind the actual inline bytes, not the pre-format esbuild output.
  const formatting = await resolveConfig(path.resolve('.prettierrc.json'));
  html = await format(html, { ...formatting, filepath: 'dist/index.html' });
  const inline = [
    ...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)
  ];
  if (inline.length !== 1) throw new Error('formatted inline script missing');
  const bundleText = inline[0][1];
  const documentBytes = Buffer.from(html, 'utf8');
  const fixedPaths = [
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png'
  ];
  const types = {
    'manifest.webmanifest': 'application/manifest+json',
    'icons/icon.svg': 'image/svg+xml',
    'icons/icon-192.png': 'image/png',
    'icons/icon-512.png': 'image/png',
    'icons/apple-touch-icon.png': 'image/png'
  };
  const payload = {};
  payload['index.html'] = {
    body: documentBytes.toString('base64'),
    digest: digest(documentBytes),
    type: 'text/html; charset=utf-8'
  };
  for (const file of fixedPaths) {
    const bytes = await read(file);
    payload[file] = {
      body: bytes.toString('base64'),
      digest: digest(bytes),
      type: types[file]
    };
  }
  // Deployed attribution still needs independent prepublication verification.
  const workerSource = `// Generated complete-response worker. No CacheStorage access.
const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
/** @type {Record<string, {body: string, digest: string, type: string}>} */
const PAYLOAD = ${JSON.stringify(payload)};
const ROOT = new URL(worker.registration.scope);
/** @type {Map<string, Uint8Array<ArrayBuffer>>} */
const bytes = new Map();
/** @param {string} text */
function decode(text) {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}
/** @param {string} name @returns {Promise<Uint8Array<ArrayBuffer>>} */
async function checked(name) {
  const existing = bytes.get(name);
  if (existing) return existing;
  const record = PAYLOAD[name];
  if (!record) throw new Error('unknown payload');
  const value = decode(record.body);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', value));
  const actual = Array.from(hash, n => n.toString(16).padStart(2, '0')).join('');
  if (actual !== record.digest) throw new Error('built-in payload mismatch');
  bytes.set(name, value);
  return value;
}
/** @param {string} name */
async function answer(name) {
  const value = await checked(name);
  return new Response(value.slice(), {
    status: 200,
    headers: { 'Content-Type': PAYLOAD[name].type }
  });
}
worker.addEventListener('install', event => {
  event.waitUntil((async () => {
    for (const name of Object.keys(PAYLOAD)) await checked(name);
    await worker.skipWaiting();
  })());
});
worker.addEventListener('activate', event => event.waitUntil(worker.clients.claim()));
worker.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  const relative = url.pathname.slice(ROOT.pathname.length);
  // Preserve current worker's non-GET pass-through.
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' && (relative === '' || relative === 'index.html')) {
    event.respondWith(answer('index.html').catch(() => Response.error()));
    return;
  }
  if (relative !== 'index.html' && Object.prototype.hasOwnProperty.call(PAYLOAD, relative)) {
    event.respondWith(answer(relative).catch(() => Response.error()));
    return;
  }
  // Exact known legacy gameplay paths fail closed. Unknown unrelated requests
  // retain network handling rather than inventing an application-wide block.
  const legacy = ['script.js', 'style.css', 'game/gameManager.js', 'game/gameState.js', 'game/inputController.js', 'game/position.js', 'game/session.js', 'game/tetromino.js', 'game/tetrominoFactory.js'];
  /** @type {string | null} */
  let decoded;
  try { decoded = decodeURIComponent(relative); } catch { decoded = null; }
  if (legacy.includes(relative) || (decoded !== null && legacy.includes(decoded))) {
    event.respondWith(Promise.resolve(Response.error()));
  }
});
`;
  const worker = await format(workerSource, {
    ...formatting,
    filepath: 'dist/sw.js'
  });
  // Output directory is created only after complete in-memory generation. This is
  // not a transactional multi-file publish. Any failure leaves owned partial output
  // as evidence; no automatic broad deletion or publication is performed here.
  await fs.mkdir(output, { recursive: false });
  await fs.writeFile(path.join(output, 'index.html'), documentBytes, {
    flag: 'wx'
  });
  await fs.writeFile(path.join(output, 'sw.js'), worker, { flag: 'wx' });
  for (const file of fixedPaths) {
    await fs.mkdir(path.dirname(path.join(output, file)), { recursive: true });
    await fs.writeFile(
      path.join(output, file),
      Buffer.from(payload[file].body, 'base64'),
      { flag: 'wx' }
    );
  }
  await fs.writeFile(
    path.join(path.resolve(evidenceArg), 'release.json'),
    JSON.stringify(
      {
        schema: 2,
        sourceRevision: inventory.sourceRevision,
        inputInventorySha256: digest(
          await fs.readFile(path.resolve(inventoryArg))
        ),
        esbuild: version,
        bundleText,
        bundleSha256: digest(Buffer.from(bundleText, 'utf8')),
        inputFiles: Object.keys(bundled.metafile.inputs),
        documentSha256: digest(documentBytes),
        workerSha256: digest(Buffer.from(worker)),
        builtIn: Object.fromEntries(
          Object.entries(payload).map(([name, record]) => [name, record.digest])
        ),
        evidenceKind: 'generation-only'
      },
      null,
      2
    ),
    { flag: 'wx' }
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 6)
    throw new Error(
      'usage: generate-release.mjs SOURCE OUTPUT INVENTORY EVIDENCE'
    );
  await generateRelease(...process.argv.slice(2));
}
