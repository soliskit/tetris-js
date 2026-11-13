import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [output, evidence, sourceArg] = process.argv.slice(2);
const sha = sourceArg ?? process.env.EXPECTED_SOURCE_SHA;
if (!sha || !/^[0-9a-f]{40}$/.test(sha))
  throw new Error('exact source SHA required');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(
  await fs.readFile(path.join(evidence, 'release.json'), 'utf8')
);
if (receipt.schema !== 2 || receipt.sourceRevision !== sha)
  throw new Error('receipt source mismatch');
const inventoryBytes = await fs.readFile(path.join(evidence, 'inputs.json'));
if (hash(inventoryBytes) !== receipt.inputInventorySha256)
  throw new Error('inventory mismatch');
const inventory = JSON.parse(inventoryBytes);
if (inventory.sourceRevision !== sha)
  throw new Error('inventory source mismatch');
for (const [file, expected] of Object.entries(inventory.files)) {
  if (file.startsWith('/') || file.split('/').includes('..'))
    throw new Error('unsafe input path');
  if (hash(await fs.readFile(path.join('public', file))) !== expected)
    throw new Error('source drift: ' + file);
}
const builtIn = receipt.builtIn;
for (const [file, expected] of Object.entries(builtIn)) {
  if (file.startsWith('/') || file.split('/').includes('..'))
    throw new Error('unsafe output path');
  if (hash(await fs.readFile(path.join(output, file))) !== expected)
    throw new Error('output drift: ' + file);
}
if (
  hash(await fs.readFile(path.join(output, 'sw.js'))) !== receipt.workerSha256
)
  throw new Error('worker drift');
const html = await fs.readFile(path.join(output, 'index.html'), 'utf8');
const scripts = [
  ...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)
];
if (
  scripts.length !== 1 ||
  hash(Buffer.from(scripts[0][1])) !== receipt.bundleSha256
)
  throw new Error('inline identity mismatch');
if (/<script[^>]*\bsrc=|rel="modulepreload"|rel="stylesheet"/.test(html))
  throw new Error('external gameplay edge');
const preview = await fs.readFile(path.join(output, 'tetris_preview.png'));
if (hash(preview) !== inventory.files['tetris_preview.png'])
  throw new Error('preview drift');
const actual = [];
async function walk(dir, prefix = '') {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('symlink output');
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel + '/');
    else if (entry.isFile()) actual.push(rel);
    else throw new Error('nonregular output');
  }
}
await walk(output);
const expected = [
  ...Object.keys(builtIn),
  'sw.js',
  'tetris_preview.png'
].sort();
if (JSON.stringify(actual.sort()) !== JSON.stringify(expected))
  throw new Error('output inventory mismatch');
// Receipt verification is not a substitute for HTML/CSS syntax closure,
// generated strict typechecking, original-source QA-3, built-browser or hosting evidence.
console.log('Current-source release byte correspondence only: ' + sha);
