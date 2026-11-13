import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8'
}).trim();
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('invalid source SHA');
if (
  execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
    encoding: 'utf8'
  }).trim()
) {
  throw new Error('build requires clean exact checkout');
}
if (
  process.env.EXPECTED_SOURCE_SHA &&
  process.env.EXPECTED_SOURCE_SHA !== sha
) {
  throw new Error('source SHA mismatch');
}
const source = path.join(root, 'public');
const output = path.join(root, 'dist');
const evidence = path.join(root, '.release-evidence');
// Neither existing output nor evidence is silently reused or deleted.
for (const p of [output, evidence]) {
  try {
    await fs.lstat(p);
    throw new Error('existing release path: ' + p);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = {};
async function walk(dir, prefix = '') {
  for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name, 'en')
  )) {
    const rel = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('symlink input: ' + rel);
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel + '/');
    else if (entry.isFile())
      files[rel] = hash(await fs.readFile(path.join(dir, entry.name)));
    else throw new Error('nonregular input: ' + rel);
  }
}
await walk(source);
await fs.mkdir(evidence);
const inventory = path.join(evidence, 'inputs.json');
await fs.writeFile(
  inventory,
  JSON.stringify({ schema: 1, sourceRevision: sha, files }, null, 2),
  { flag: 'wx' }
);
execFileSync(
  process.execPath,
  ['scripts/generate-release.mjs', source, output, inventory, evidence],
  { stdio: 'inherit' }
);
// Preserve online preview metadata referenced by index, without claiming an
// offline gameplay dependency or adding it to worker storage.
await fs.copyFile(
  path.join(source, 'tetris_preview.png'),
  path.join(output, 'tetris_preview.png'),
  1
);
// A complete verifier is a required additional delta, not a pretend success.
execFileSync(
  process.execPath,
  ['scripts/verify-release.mjs', output, evidence, sha],
  { stdio: 'inherit' }
);
if (
  execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
    encoding: 'utf8'
  }).trim()
)
  throw new Error('checkout changed during build');
