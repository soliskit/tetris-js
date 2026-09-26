// Port of Model/GameState.swift, Model/PlayerAction.swift and Model/GameCell.swift.

export const GameState = Object.freeze({
  playing: 'playing',
  paused: 'paused',
  gameOver: 'gameOver'
});

export const PlayerAction = Object.freeze({
  newGame: 'newGame',
  continueGame: 'continueGame',
  pause: 'pause',
  resume: 'resume',
  moveLeft: 'moveLeft',
  moveRight: 'moveRight',
  hold: 'hold',
  rotate: 'rotate',
  drop: 'drop'
});

export function emptyCell() {
  return { isFilled: false, color: null };
}

export function createBoard(rows, columns) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, emptyCell));
}

// Port of Support/Array.swift: returns undefined instead of throwing when out of bounds.
export function cellAt(board, row, column) {
  if (row < 0 || row >= board.length || column < 0 || column >= board[row].length) {
    return undefined;
  }
  return board[row][column];
}
