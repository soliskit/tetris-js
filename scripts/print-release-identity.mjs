import fs from 'node:fs';
import { createHash } from 'node:crypto';
const raw = fs.readFileSync('.release-evidence/release.json');
const receipt = JSON.parse(raw);
if (receipt.schema !== 2 || !/^[0-9a-f]{40}$/.test(receipt.sourceRevision))
  throw new Error('Invalid release receipt');
const identity = {
  schema: 1,
  sha: receipt.sourceRevision,
  documentSha256: receipt.documentSha256,
  workerSha256: receipt.workerSha256,
  bundleSha256: receipt.bundleSha256,
  inputInventorySha256: receipt.inputInventorySha256,
  receiptSha256: createHash('sha256').update(raw).digest('hex')
};
for (const [key, value] of Object.entries(identity)) {
  if (
    key !== 'schema' &&
    key !== 'sha' &&
    (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value))
  )
    throw new Error('Invalid release identity hash');
}
console.log('TETRIS-RELEASE-V1 ' + JSON.stringify(identity));
