// Rule-derived save oracle. It reads the retained geometry table, not the
// production parser, piece cells, validity checker or serializer round-trip.
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** @type {Record<string, string>} */
const colors = {
  '#00C0E8': 'I',
  '#FFCC00': 'O',
  '#AF52DE': 'T',
  '#34C759': 'S',
  '#FF3B30': 'Z',
  '#007AFF': 'J',
  '#FF9500': 'L'
};
/** @type {Map<string, [number, number][]>} */
const geometry = new Map();
/** @type {string | undefined} */
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
      `${String(kind)}${state[1]}`,
      [...state[2].matchAll(/\((\d),(\d)\)/g)].map((m) => [+m[1], +m[2]])
    );
}
/**
 * The saved position, rebuilt from the fields this oracle checked.
 * @typedef {{ isFilled: boolean, color: string | null }} OracleCell
 * @typedef {{
 *   gameBoard: OracleCell[][],
 *   score: number,
 *   currentTetromino: {
 *     color: string,
 *     rotationState: number,
 *     position: { row: number, column: number }
 *   },
 *   nextTetrominos: { color: string }[],
 *   heldTetromino: { color: string } | null,
 *   canHoldTetromino: boolean,
 *   bag: string[],
 *   lockDelayResetCount: number,
 *   lowestRowReached: number
 * }} OracleSave
 */

/**
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
function get(value, key) {
  if (value === null || value === undefined)
    throw new TypeError(
      `Cannot read properties of ${String(value)} (reading '${key}')`
    );
  return Reflect.get(Object(value), key);
}

/**
 * @param {unknown} value
 * @returns {unknown[]}
 */
function list(value) {
  assert.ok(Array.isArray(value));
  return value;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function integer(value) {
  assert.ok(typeof value === 'number' && Number.isInteger(value));
  return value;
}

/**
 * @param {unknown} color
 * @returns {string}
 */
function knownColor(color) {
  assert.ok(colors[String(color)]);
  return String(color);
}

/**
 * @param {unknown} raw The stored bytes; String() coercion below handles whatever the storage boundary returns, as before.
 * @returns {OracleSave}
 */
export function oracle(raw) {
  /** @type {unknown} */
  const envelope = JSON.parse(String(raw));
  assert.equal(get(envelope, 'format'), 'tetris-session-envelope');
  assert.equal(get(envelope, 'available'), true);
  const position = get(envelope, 'position');
  /** @type {unknown} */
  const data = JSON.parse(String(position));
  const rows = list(get(data, 'gameBoard'));
  assert.equal(rows.length, 20);
  /** @type {OracleCell[][]} */
  const gameBoard = [];
  for (const row of rows) {
    const cellsInRow = list(row);
    assert.equal(cellsInRow.length, 10);
    /** @type {OracleCell[]} */
    const checkedRow = [];
    for (const cell of cellsInRow) {
      const isFilled = get(cell, 'isFilled');
      assert.equal(typeof isFilled, 'boolean');
      const color = get(cell, 'color');
      assert.ok(isFilled ? colors[String(color)] : color === null);
      checkedRow.push({
        isFilled: isFilled === true,
        color: color === null ? null : knownColor(color)
      });
    }
    gameBoard.push(checkedRow);
  }
  const piece = get(data, 'currentTetromino');
  const pieceColor = get(piece, 'color');
  const name = colors[String(pieceColor)];
  assert.ok(name);
  const rotationState = get(piece, 'rotationState');
  assert.ok(
    typeof rotationState === 'number' && Number.isInteger(rotationState)
  );
  // B2/PCE-4 permits only O's first state even though the table repeats it.
  assert.ok(rotationState >= 0 && rotationState < (name === 'O' ? 1 : 4));
  const pieceRow = integer(get(get(piece, 'position'), 'row'));
  const pieceColumn = integer(get(get(piece, 'position'), 'column'));
  const shape = geometry.get(`${name}${String(rotationState)}`);
  assert.ok(shape);
  const cells = shape.map(([r, c]) => [r + pieceRow, c + pieceColumn]);
  for (const [r, c] of cells) {
    assert.ok(r >= 0 && r < 20 && c >= 0 && c < 10);
    assert.equal(gameBoard[r][c].isFilled, false);
  }
  const score = get(data, 'score');
  assert.ok(
    typeof score === 'number' && Number.isSafeInteger(score) && score >= 0
  );
  const queue = list(get(data, 'nextTetrominos'));
  assert.equal(queue.length, 3);
  const nextTetrominos = queue.map((q) => ({
    color: knownColor(get(q, 'color'))
  }));
  const held = get(data, 'heldTetromino');
  assert.ok(held === null || colors[String(get(held, 'color'))]);
  const canHoldTetromino = get(data, 'canHoldTetromino');
  assert.equal(typeof canHoldTetromino, 'boolean');
  const bag = list(get(data, 'bag'));
  assert.equal(new Set(bag).size, bag.length);
  const bagColors = bag.map((color) => knownColor(color));
  const lockDelayResetCount = get(data, 'lockDelayResetCount');
  assert.ok(
    typeof lockDelayResetCount === 'number' &&
      Number.isInteger(lockDelayResetCount) &&
      lockDelayResetCount >= 0 &&
      lockDelayResetCount <= 16
  );
  const resting = cells.some(
    ([r, c]) => r === 19 || gameBoard[r + 1][c].isFilled
  );
  if (lockDelayResetCount === 16) assert.ok(resting);
  const lowestRowReached = get(data, 'lowestRowReached');
  assert.ok(
    typeof lowestRowReached === 'number' &&
      Number.isInteger(lowestRowReached) &&
      lowestRowReached >= Math.max(...cells.map(([r]) => r)) &&
      lowestRowReached <= 19
  );
  return {
    gameBoard,
    score,
    currentTetromino: {
      color: String(pieceColor),
      rotationState,
      position: { row: pieceRow, column: pieceColumn }
    },
    nextTetrominos,
    heldTetromino: held === null ? null : { color: String(get(held, 'color')) },
    canHoldTetromino: canHoldTetromino === true,
    bag: bagColors,
    lockDelayResetCount,
    lowestRowReached
  };
}
