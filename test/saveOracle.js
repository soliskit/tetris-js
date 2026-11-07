// Rule-derived save oracle. It reads the retained geometry table, not the
// production parser, piece cells, validity checker or serializer round-trip.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const colors = {
  '#00C0E8': 'I',
  '#FFCC00': 'O',
  '#AF52DE': 'T',
  '#34C759': 'S',
  '#FF3B30': 'Z',
  '#007AFF': 'J',
  '#FF9500': 'L'
};
const geometry = new Map();
let kind;
for (const line of fs
  .readFileSync(
    new URL('../docs/sources/2-srs_table.txt', import.meta.url),
    'utf8'
  )
  .split('\n')) {
  if (/^[IOTSZJL] /.test(line)) kind = line[0];
  const state = line.match(/state (\d): (.*)/);
  if (state)
    geometry.set(
      kind + state[1],
      [...state[2].matchAll(/\((\d),(\d)\)/g)].map((m) => [+m[1], +m[2]])
    );
}
export function oracle(raw) {
  const envelope = JSON.parse(raw);
  assert.equal(envelope.format, 'tetris-session-envelope');
  assert.equal(envelope.available, true);
  const data = JSON.parse(envelope.position);
  assert.equal(data.gameBoard.length, 20);
  for (const row of data.gameBoard) {
    assert.equal(row.length, 10);
    for (const cell of row) {
      assert.equal(typeof cell.isFilled, 'boolean');
      assert.ok(cell.isFilled ? colors[cell.color] : cell.color === null);
    }
  }
  const piece = data.currentTetromino;
  const name = colors[piece.color];
  assert.ok(name);
  assert.ok(Number.isInteger(piece.rotationState));
  // B2/PCE-4 permits only O's first state even though the table repeats it.
  assert.ok(
    piece.rotationState >= 0 && piece.rotationState < (name === 'O' ? 1 : 4)
  );
  assert.ok(Number.isInteger(piece.position.row));
  assert.ok(Number.isInteger(piece.position.column));
  const cells = geometry
    .get(name + piece.rotationState)
    .map(([r, c]) => [r + piece.position.row, c + piece.position.column]);
  for (const [r, c] of cells) {
    assert.ok(r >= 0 && r < 20 && c >= 0 && c < 10);
    assert.equal(data.gameBoard[r][c].isFilled, false);
  }
  assert.ok(Number.isSafeInteger(data.score) && data.score >= 0);
  assert.equal(data.nextTetrominos.length, 3);
  for (const q of data.nextTetrominos) assert.ok(colors[q.color]);
  assert.ok(data.heldTetromino === null || colors[data.heldTetromino.color]);
  assert.equal(typeof data.canHoldTetromino, 'boolean');
  assert.ok(Array.isArray(data.bag));
  assert.equal(new Set(data.bag).size, data.bag.length);
  for (const color of data.bag) assert.ok(colors[color]);
  assert.ok(
    Number.isInteger(data.lockDelayResetCount) &&
      data.lockDelayResetCount >= 0 &&
      data.lockDelayResetCount <= 16
  );
  const resting = cells.some(
    ([r, c]) => r === 19 || data.gameBoard[r + 1][c].isFilled
  );
  if (data.lockDelayResetCount === 16) assert.ok(resting);
  assert.ok(
    Number.isInteger(data.lowestRowReached) &&
      data.lowestRowReached >= Math.max(...cells.map(([r]) => r)) &&
      data.lowestRowReached <= 19
  );
  return data;
}
