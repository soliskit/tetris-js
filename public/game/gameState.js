// Port of Model/GameState.swift, Model/PlayerAction.swift and Model/GameCell.swift.

export const GameState = Object.freeze(/** @type {const} */ ({
  playing: 'playing',
  paused: 'paused',
  gameOver: 'gameOver'
}));

/** @typedef {typeof GameState[keyof typeof GameState]} GameStateValue */

export const PlayerAction = Object.freeze(/** @type {const} */ ({
  newGame: 'newGame',
  continueGame: 'continueGame',
  pause: 'pause',
  resume: 'resume',
  moveLeft: 'moveLeft',
  moveRight: 'moveRight',
  hold: 'hold',
  rotate: 'rotate',
  drop: 'drop'
}));

/** @typedef {typeof PlayerAction[keyof typeof PlayerAction]} PlayerActionValue */

/** @typedef {{ isFilled: boolean, color: string | null }} Cell */
/** @typedef {Cell[][]} Board */

/** @returns {Cell} */
function emptyCell() {
  return { isFilled: false, color: null };
}

/**
 * @param {number} rows
 * @param {number} columns
 * @returns {Board}
 */
export function createBoard(rows, columns) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, emptyCell));
}

// Port of Support/Array.swift: returns undefined instead of throwing when out of bounds.
/**
 * @param {Board} board
 * @param {number} row
 * @param {number} column
 * @returns {Cell | undefined}
 */
export function cellAt(board, row, column) {
  if (row < 0 || row >= board.length || column < 0 || column >= board[row].length) {
    return undefined;
  }
  return board[row][column];
}
