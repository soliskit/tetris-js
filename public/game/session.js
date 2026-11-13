// Saved games. A save comes from localStorage, which can be corrupted,
// truncated or edited, so it is treated as untrusted input: every field is
// checked, pieces are rebuilt from the built in definitions rather than
// from stored shapes, and anything invalid rejects the whole save.

import { UPCOMING_COUNT } from './gameState.js';
import { position } from './position.js';
import { allPieces } from './tetrominoFactory.js';

/** @typedef {import('./gameState.js').Board} Board */
/** @typedef {import('./gameState.js').Cell} Cell */
/** @typedef {import('./tetromino.js').Tetromino} Tetromino */
/** @typedef {import('./gameManager.js').GameManager} GameManager */
/**
 * @typedef {object} Session
 * @property {Board} gameBoard
 * @property {number} score
 * @property {Tetromino} currentTetromino
 * @property {Tetromino[]} nextTetrominos
 * @property {Tetromino | null} heldTetromino
 * @property {boolean} canHoldTetromino
 * @property {Tetromino[]} bag The pieces left in the shuffled bag, dealt next.
 * @property {number} lockDelayResetCount Lock-delay resets used, with paused/resting16 distinguished.
 * @property {number} lowestRowReached Greatest board-row index occupied by a block of the current falling piece during its history.
 */

/**
 * @param {GameManager} game
 * @returns {string}
 */
export function serializeSession(game) {
  return JSON.stringify({
    gameBoard: game.gameBoard,
    score: game.score,
    currentTetromino: game.currentTetromino,
    nextTetrominos: game.nextTetrominos,
    heldTetromino: game.heldTetromino,
    canHoldTetromino: game.canHoldTetromino,
    lockDelayResetCount: game.lockDelayResetCount,
    lowestRowReached: game.lowestRowReached,
    // By color: the type is all a piece in the bag needs.
    bag: (game.factory.bag ?? []).map((piece) => piece.color)
  });
}

// Type guards: saved data is untrusted, so every value starts as unknown.

/**
 * @param {unknown} value
 * @returns {value is number}
 */
const isInteger = (value) => Number.isInteger(value);

/**
 * @param {unknown} value
 * @returns {value is number}
 */
const isSafeInteger = (value) => Number.isSafeInteger(value);

/**
 * @param {unknown} color
 * @returns {Tetromino | null}
 */
function pieceWithColor(color) {
  return allPieces().find((piece) => piece.color === color) ?? null;
}

/**
 * @param {unknown} board
 * @param {number} rows
 * @param {number} columns
 * @returns {Board | null}
 */
function parseBoard(board, rows, columns) {
  if (!Array.isArray(board) || board.length !== rows) return null;
  /** @type {Set<unknown>} */
  const colors = new Set(allPieces().map((piece) => piece.color));
  /** @type {Board} */
  const result = [];
  for (const row of board) {
    if (!Array.isArray(row) || row.length !== columns) return null;
    /** @type {Cell[]} */
    const cells = [];
    for (const cell of row) {
      if (
        !hasFields(cell, ['isFilled', 'color']) ||
        typeof cell.isFilled !== 'boolean'
      )
        return null;
      if (cell.isFilled ? !colors.has(cell.color) : cell.color !== null)
        return null;
      // Checked just above: a piece color when filled, otherwise null.
      cells.push({
        isFilled: cell.isFilled,
        color: /** @type {string | null} */ (cell.color)
      });
    }
    result.push(cells);
  }
  return result;
}

// A piece in play: its type, rotation and position must be valid and it
// must fit on the board.
/**
 * @param {unknown} data
 * @param {Board} board
 * @returns {Tetromino | null}
 */
function parseActivePiece(data, board) {
  if (
    !hasFields(
      data,
      ['color', 'position', 'rotationState'],
      ['rotations', 'wallKickData']
    ) ||
    !hasFields(data.position, ['row', 'column'])
  )
    return null;
  const piece = pieceWithColor(data.color);
  const { row, column } = data.position;
  if (!piece || !isInteger(row) || !isInteger(column)) return null;
  if (
    !isInteger(data.rotationState) ||
    data.rotationState < 0 ||
    data.rotationState >= piece.rotations.length
  )
    return null;
  piece.rotationState = data.rotationState;
  piece.position = position(row, column);
  return piece.fits(board) ? piece : null;
}

// A queued or held piece only needs a valid type; it enters at spawn.
/**
 * @param {unknown} data
 * @param {number} columns
 * @returns {Tetromino | null}
 */
function parseWaitingPiece(data, columns) {
  if (
    !hasFields(
      data,
      ['color'],
      ['position', 'rotationState', 'rotations', 'wallKickData']
    )
  )
    return null;
  return pieceWithColor(data.color)?.spawned(columns) ?? null;
}

// The pieces left in the bag, by color. A bag holds each piece at most once.
/**
 * @param {unknown} colors
 * @returns {Tetromino[] | null}
 */
function parseBag(colors) {
  if (!Array.isArray(colors) || new Set(colors).size !== colors.length)
    return null;
  const pieces = colors.map(pieceWithColor);
  return pieces.every((piece) => piece !== null) ? pieces : null;
}

// Returns the saved game as validated game state, or null when the text is
// missing or anything in it is invalid.
/**
 * @param {string | null} text
 * @param {{ rows: number, columns: number }} size
 * @returns {Session | null}
 */
export function parseSession(text, { rows, columns }) {
  /** @type {unknown} */
  let data = null;
  try {
    // A missing save (null) reads as null and is rejected below.
    data = parseUniqueJSON(text);
  } catch {
    // Not JSON: data stays null and is rejected below.
  }
  if (
    !hasFields(data, [
      'gameBoard',
      'score',
      'currentTetromino',
      'nextTetrominos',
      'heldTetromino',
      'canHoldTetromino',
      'bag',
      'lockDelayResetCount',
      'lowestRowReached'
    ])
  )
    return null;

  const gameBoard = parseBoard(data.gameBoard, rows, columns);
  if (!gameBoard) return null;
  const { score } = data;
  if (!isSafeInteger(score) || score < 0) return null;
  const currentTetromino = parseActivePiece(data.currentTetromino, gameBoard);
  if (!currentTetromino) return null;
  if (
    !Array.isArray(data.nextTetrominos) ||
    data.nextTetrominos.length !== UPCOMING_COUNT
  )
    return null;
  const nextTetrominos = [];
  for (const piece of data.nextTetrominos) {
    const parsed = parseWaitingPiece(piece, columns);
    if (!parsed) return null;
    nextTetrominos.push(parsed);
  }
  let heldTetromino = null;
  if (data.heldTetromino !== null) {
    heldTetromino = parseWaitingPiece(data.heldTetromino, columns);
    if (!heldTetromino) return null;
  }
  if (typeof data.canHoldTetromino !== 'boolean') return null;
  const bag = parseBag(data.bag);
  if (!bag) return null;

  const lockDelayResetCount = data.lockDelayResetCount;
  const lowestRowReached = data.lowestRowReached;
  const greatestRow = Math.max(
    ...currentTetromino.cells.map((cell) => cell.row)
  );
  const resting = !currentTetromino.fits(
    gameBoard,
    position(
      currentTetromino.position.row + 1,
      currentTetromino.position.column
    )
  );
  if (
    !isInteger(lockDelayResetCount) ||
    lockDelayResetCount < 0 ||
    lockDelayResetCount > 16 ||
    (lockDelayResetCount === 16 && !resting)
  )
    return null;
  if (
    !isInteger(lowestRowReached) ||
    lowestRowReached < greatestRow ||
    lowestRowReached >= rows
  )
    return null;

  return {
    gameBoard,
    score,
    currentTetromino,
    nextTetrominos,
    heldTetromino,
    canHoldTetromino: data.canHoldTetromino,
    bag,
    lockDelayResetCount,
    lowestRowReached
  };
}

// One atomic record owns publication. Position text is retained verbatim on withdrawal.
export const SAVE_FORMAT = 'tetris-session-envelope';

/** @param {string | null} text @returns {unknown} The parsed value; a missing save (null) reads as null. */
export function parseUniqueJSON(text) {
  if (text === null) return null;
  const value = /** @type {unknown} */ (JSON.parse(text));
  // JSON.parse has already checked syntax. Walk tokens only to reject duplicate
  // names, including escaped spellings of the same name, at every object depth.
  const tokens = /** @type {RegExpMatchArray} */ (
    text.match(/"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:]+/g)
  );
  let index = 0;
  function visit() {
    const token = tokens[index++];
    if (token === '{') {
      const names = new Set();
      if (tokens[index] !== '}') {
        do {
          // The token walked is a quoted string, so its value is a string.
          const key = String(
            /** @type {unknown} */ (JSON.parse(tokens[index++]))
          );
          if (names.has(key)) throw new SyntaxError();
          names.add(key);
          index++; // colon
          visit();
        } while (tokens[index++] === ',');
      } else index++;
    } else if (token === '[') {
      if (tokens[index] !== ']') {
        do {
          visit();
        } while (tokens[index++] === ',');
      } else index++;
    }
  }
  visit();
  return value;
}

/** @param {unknown} value @param {string[]} required @param {string[]} [optional] @returns {value is Record<string, unknown>} */
export function hasFields(value, required, optional) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every(
      (key) => required.includes(key) || (optional && optional.includes(key))
    )
  );
}

/** @param {string} text @returns {{format: string, available: boolean, position: string} | null} */
export function parseSavedRecord(text) {
  try {
    const data = parseUniqueJSON(text);
    if (
      !hasFields(data, ['format', 'available', 'position']) ||
      data.format !== SAVE_FORMAT ||
      typeof data.available !== 'boolean' ||
      typeof data.position !== 'string'
    )
      return null;
    return {
      format: SAVE_FORMAT,
      available: data.available,
      position: data.position
    };
  } catch {
    return null;
  }
}

/** @param {string} position @param {boolean} available */
export function serializeSavedRecord(position, available) {
  return JSON.stringify({ format: SAVE_FORMAT, available, position });
}
