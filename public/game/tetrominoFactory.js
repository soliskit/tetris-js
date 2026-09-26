// Port of Support/TetrominoFactory.swift: 7-bag randomizer with SRS wall kicks.
// The Swift version keeps the bag in static state; here it is an instance so
// the random source can be injected (for tests or a future seeded challenge).

import { position } from './position.js';
import { Tetromino } from './tetromino.js';

// SwiftUI system colors (iOS light appearance).
export const PieceColors = Object.freeze({
  cyan: '#00C0E8',
  yellow: '#FFCC00',
  purple: '#AF52DE',
  green: '#34C759',
  red: '#FF3B30',
  blue: '#007AFF',
  orange: '#FF9500'
});

const kicks = rows => rows.map(row => row.map(([r, c]) => position(r, c)));

const jlstzWallKicks = kicks([
  [[0, 0], [0, -1], [-1, -1], [2, 0], [2, -1]],
  [[0, 0], [0, 1], [1, 1], [-2, 0], [-2, 1]],
  [[0, 0], [0, 1], [-1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, -1], [1, -1], [-2, 0], [-2, -1]]
]);

const iWallKicks = kicks([
  [[0, 0], [0, -2], [0, 1], [1, -2], [-2, 1]],
  [[0, 0], [0, -1], [0, 2], [-2, -1], [1, 2]],
  [[0, 0], [0, 2], [0, -1], [-1, 2], [2, -1]],
  [[0, 0], [0, 1], [0, -2], [2, 1], [-1, -2]]
]);

const oWallKicks = kicks([[[0, 0]]]);

function piece(spawn, color, wallKickData) {
  const rotations = [spawn.map(line => [...line].map(ch => ch === 'X'))];
  while (rotations.length < wallKickData.length) {
    const last = rotations[rotations.length - 1];
    rotations.push(last.map((_, row) => last.map((__, column) => last[last.length - 1 - column][row])));
  }
  return new Tetromino({ rotations, color, wallKickData });
}

export function allPieces() {
  return [
    piece(['....', 'XXXX', '....', '....'], PieceColors.cyan, iWallKicks),
    piece(['XX', 'XX'], PieceColors.yellow, oWallKicks),
    piece(['.X.', 'XXX', '...'], PieceColors.purple, jlstzWallKicks),
    piece(['.XX', 'XX.', '...'], PieceColors.green, jlstzWallKicks),
    piece(['XX.', '.XX', '...'], PieceColors.red, jlstzWallKicks),
    piece(['X..', 'XXX', '...'], PieceColors.blue, jlstzWallKicks),
    piece(['..X', 'XXX', '...'], PieceColors.orange, jlstzWallKicks)
  ];
}

function shuffled(items, random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class TetrominoFactory {
  constructor(random = Math.random) {
    this.random = random;
    this.bag = [];
  }

  generate() {
    if (this.bag.length === 0) {
      this.bag = shuffled(allPieces(), this.random);
    }
    return this.bag.shift();
  }
}
