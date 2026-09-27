// Saved games. A save comes from localStorage, which can be corrupted,
// truncated or edited, so it is treated as untrusted input: every field is
// checked, pieces are rebuilt from the built in definitions rather than
// from stored shapes, and anything invalid rejects the whole save.

import { position } from './position.js';
import { allPieces } from './tetrominoFactory.js';

const UPCOMING_COUNT = 3;

export function serializeSession(game) {
  return JSON.stringify({
    gameBoard: game.gameBoard,
    score: game.score,
    level: game.level,
    currentTetromino: game.currentTetromino,
    nextTetrominos: game.nextTetrominos,
    heldTetromino: game.heldTetromino,
    canHoldTetromino: game.canHoldTetromino
  });
}

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

function pieceWithColor(color) {
  return allPieces().find(piece => piece.color === color) ?? null;
}

function parseBoard(board, rows, columns) {
  if (!Array.isArray(board) || board.length !== rows) return null;
  const colors = new Set(allPieces().map(piece => piece.color));
  const result = [];
  for (const row of board) {
    if (!Array.isArray(row) || row.length !== columns) return null;
    const cells = [];
    for (const cell of row) {
      if (!isObject(cell) || typeof cell.isFilled !== 'boolean') return null;
      if (cell.isFilled ? !colors.has(cell.color) : cell.color !== null) return null;
      cells.push({ isFilled: cell.isFilled, color: cell.color });
    }
    // Full rows are cleared as soon as they form, so a saved one is corrupt.
    if (cells.every(cell => cell.isFilled)) return null;
    result.push(cells);
  }
  return result;
}

// A piece in play: its type, rotation and position must be valid and it
// must fit on the board.
function parseActivePiece(data, board) {
  if (!isObject(data) || !isObject(data.position)) return null;
  const piece = pieceWithColor(data.color);
  const { row, column } = data.position;
  if (!piece || !Number.isInteger(row) || !Number.isInteger(column)) return null;
  if (!Number.isInteger(data.rotationState) || data.rotationState < 0 || data.rotationState >= piece.rotations.length) return null;
  piece.rotationState = data.rotationState;
  piece.position = position(row, column);
  return piece.fits(board) ? piece : null;
}

// A queued or held piece only needs a valid type; it enters at spawn.
function parseWaitingPiece(data, columns) {
  if (!isObject(data)) return null;
  return pieceWithColor(data.color)?.spawned(columns) ?? null;
}

// Returns the saved game as validated game state, or null when the text is
// missing or anything in it is invalid.
export function parseSession(text, { rows, columns }) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;

  const gameBoard = parseBoard(data.gameBoard, rows, columns);
  if (!gameBoard) return null;
  const { score } = data;
  if (!Number.isSafeInteger(score) || score < 0 || score % 100 !== 0) return null;
  const currentTetromino = parseActivePiece(data.currentTetromino, gameBoard);
  if (!currentTetromino) return null;
  if (!Array.isArray(data.nextTetrominos) || data.nextTetrominos.length !== UPCOMING_COUNT) return null;
  const nextTetrominos = data.nextTetrominos.map(piece => parseWaitingPiece(piece, columns));
  if (nextTetrominos.includes(null)) return null;
  let heldTetromino = null;
  if (data.heldTetromino !== null) {
    heldTetromino = parseWaitingPiece(data.heldTetromino, columns);
    if (!heldTetromino) return null;
  }
  if (typeof data.canHoldTetromino !== 'boolean') return null;

  return {
    gameBoard,
    score,
    level: Math.floor(score / 1000) + 1, // derived, never trusted from the save
    currentTetromino,
    nextTetrominos,
    heldTetromino,
    canHoldTetromino: data.canHoldTetromino
  };
}
