// Read-only generated formatting and identity check.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { check, resolveConfig } from 'prettier';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(
  await fs.readFile('.release-evidence/release.json', 'utf8')
);
const html = await fs.readFile('dist/index.html', 'utf8');
const worker = await fs.readFile('dist/sw.js', 'utf8');
if (
  hash(html) !== receipt.documentSha256 ||
  hash(worker) !== receipt.workerSha256
)
  throw new Error('final release bytes changed before checks');
const scripts = [
  ...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)
];
if (scripts.length !== 1 || hash(scripts[0][1]) !== receipt.bundleSha256)
  throw new Error('exact final inline module identity differs');
const options = await resolveConfig(path.resolve('.prettierrc.json'));
for (const [name, text] of [
  ['dist/index.html', html],
  ['dist/sw.js', worker],
  ['dist/icons/icon.svg', await fs.readFile('dist/icons/icon.svg', 'utf8')]
]) {
  // Direct pinned formatter API checks bypass .gitignore/.prettierignore file
  // discovery without changing any formatting option or writing product bytes.
  if (
    !(await check(text, {
      ...options,
      filepath: name,
      ...(name.endsWith('.svg') ? { parser: 'html' } : {})
    }))
  )
    throw new Error('final generated formatting differs: ' + name);
}
if (
  hash(await fs.readFile('dist/index.html')) !== receipt.documentSha256 ||
  hash(await fs.readFile('dist/sw.js')) !== receipt.workerSha256
)
  throw new Error('release bytes changed while checked');
