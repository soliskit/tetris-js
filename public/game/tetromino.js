// Port of Model/Tetromino.swift.
// Swift's Tetromino is a value type, so every method that "copies" in Swift
// returns a new instance here. rotations and wallKickData are never mutated
// and are shared between copies.

import { position } from './position.js';
import { cellAt } from './gameState.js';

/** @typedef {import('./position.js').Position} Position */
/** @typedef {import('./gameState.js').Board} Board */
/** @typedef {boolean[][]} Shape */
/**
 * @typedef {object} TetrominoData
 * @property {Shape[]} rotations Every rotation state, clockwise from spawn.
 * @property {string} color
 * @property {Position[][]} wallKickData Kicks to try when turning clockwise from each state.
 * @property {Position} [position]
 * @property {number} [rotationState]
 */

/**
 * @param {Board} gameBoard
 * @param {number} row
 * @param {number} column
 * @returns {boolean} Whether the cell is on the board and empty.
 */
function isFree(gameBoard, row, column) {
  return cellAt(gameBoard, row, column)?.isFilled === false;
}

export class Tetromino {
  /** @param {TetrominoData} data */
  constructor({ rotations, color, wallKickData, position: pos = position(0, 0), rotationState = 0 }) {
    this.color = color;
    this.position = pos;
    this.rotations = rotations;
    this.rotationState = rotationState;
    this.wallKickData = wallKickData;
  }

  get shape() {
    return this.rotations[this.rotationState];
  }

  copy() {
    return new Tetromino({
      color: this.color,
      position: this.position,
      rotations: this.rotations,
      rotationState: this.rotationState,
      wallKickData: this.wallKickData
    });
  }

  /**
   * @param {number} columns
   * @returns {Tetromino}
   */
  spawned(columns) {
    const piece = this.copy();
    const width = this.rotations[0][0].length;
    piece.rotationState = 0;
    piece.position = position(0, Math.max(0, Math.trunc((columns - width) / 2)));
    return piece;
  }

  /**
   * @param {Shape} shape
   * @param {Position} pos
   * @returns {Position[]}
   */
  static cells(shape, pos) {
    /** @type {Position[]} */
    const result = [];
    shape.forEach((blocks, row) => {
      blocks.forEach((filled, column) => {
        if (filled) {
          result.push(position(pos.row + row, pos.column + column));
        }
      });
    });
    return result;
  }

  get cells() {
    return Tetromino.cells(this.shape, this.position);
  }

  /**
   * @param {Shape} shape
   * @param {Position} pos
   * @param {Board} gameBoard
   * @returns {boolean}
   */
  static fits(shape, pos, gameBoard) {
    return Tetromino.cells(shape, pos).every(cell => isFree(gameBoard, cell.row, cell.column));
  }

  /**
   * @param {Board} gameBoard
   * @param {Position} [pos]
   * @returns {boolean}
   */
  fits(gameBoard, pos = this.position) {
    return Tetromino.fits(this.shape, pos, gameBoard);
  }

  // How many rows the piece can fall before it lands. Finds the cells once
  // instead of building new ones for every row checked, since the ghost
  // piece needs this on every redraw.
  /**
   * @param {Board} gameBoard
   * @returns {number}
   */
  dropDistance(gameBoard) {
    const cells = this.cells;
    let rows = 0;
    while (cells.every(cell => isFree(gameBoard, cell.row + rows + 1, cell.column))) {
      rows += 1;
    }
    return rows;
  }

  // Mutating, like the Swift `mutating func rotate`. Tries clockwise with SRS
  // kicks first, then counterclockwise with the inverted kicks.
  /** @param {Board} gameBoard */
  rotate(gameBoard) {
    const count = this.rotations.length;
    const clockwise = (this.rotationState + 1) % count;
    const counterClockwise = (this.rotationState + count - 1) % count;
    /** @type {Array<[number, Position[]]>} */
    const attempts = [
      [clockwise, this.wallKickData[this.rotationState]],
      [counterClockwise, this.wallKickData[counterClockwise].map(kick => position(-kick.row, -kick.column))]
    ];
    for (const [state, kicks] of attempts) {
      for (const kick of kicks) {
        const candidate = position(this.position.row + kick.row, this.position.column + kick.column);
        if (Tetromino.fits(this.rotations[state], candidate, gameBoard)) {
          this.rotationState = state;
          this.position = candidate;
          return;
        }
      }
    }
  }
}
