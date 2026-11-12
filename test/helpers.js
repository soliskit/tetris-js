// Shared test helpers. node --test also loads this file, which has no tests.
//
// Loops in tests are always bounded: a broken game must make a test fail,
// never hang it.

import assert from 'node:assert/strict';

import {
  GameManager,
  createMemoryStorage
} from '../public/game/gameManager.js';
import { PlayerAction } from '../public/game/gameState.js';
import { allPieces, PieceColors } from '../public/game/tetrominoFactory.js';

/**
 * @typedef {import('../public/game/gameManager.js').GameManagerOptions} GameManagerOptions
 * @typedef {import('../public/game/gameManager.js').PieceSource} PieceSource
 * @typedef {import('../public/game/gameManager.js').KeyValueStorage} KeyValueStorage
 * @typedef {import('../public/game/gameManager.js').Scheduler} Scheduler
 * @typedef {import('../public/game/gameState.js').Board} Board
 * @typedef {import('../public/game/tetromino.js').Shape} Shape
 */

// Manual clock so timer driven behavior (gravity, lock delay) is deterministic.
export function createFakeScheduler() {
  let now = 0;
  let nextHandle = 1;
  /** @type {Map<number, { callback: () => void, at: number }>} */
  const timers = new Map();
  return {
    /**
     * @param {() => void} callback
     * @param {number} ms
     */
    setTimeout(callback, ms) {
      const handle = nextHandle++;
      timers.set(handle, { callback, at: now + ms });
      return handle;
    },
    /** @param {number} handle */
    clearTimeout(handle) {
      timers.delete(handle);
    },
    /** @param {number} ms */
    advance(ms) {
      const end = now + ms;
      for (let fired = 0; ; fired++) {
        assert.ok(fired < 10000, 'timers keep firing without time passing');
        /** @type {[number, { callback: () => void, at: number }] | undefined} */
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= end)
          .sort((a, b) => a[1].at - b[1].at)
          .at(0);
        if (!due) break;
        const [handle, timer] = due;
        timers.delete(handle);
        now = timer.at;
        timer.callback();
      }
      now = end;
    },
    get pending() {
      return timers.size;
    }
  };
}

// Calls step until done() is true, failing after limit steps.
/**
 * @param {() => boolean} done
 * @param {() => void} step
 * @param {string} what
 * @param {number} [limit]
 */
export function repeatUntil(done, step, what, limit = 100) {
  for (let i = 0; i < limit; i++) {
    if (done()) return;
    step();
  }
  assert.fail(`${what} did not happen within ${String(limit)} steps`);
}

/** @param {unknown} color */
export function pieceByColor(color) {
  const found = allPieces().find((piece) => piece.color === color);
  if (found === undefined) {
    throw new Error(`no piece with color ${String(color)}`);
  }
  return found;
}

// Factory that always hands out the same piece type.
/** @param {unknown} color */
export function fixedFactory(color) {
  return { generate: () => pieceByColor(color) };
}

// Factory that hands out the given colors in order, then repeats. newGame
// restarts it after the manager's constructor has used some pieces, so the
// sequence starts with the first piece of the new game.
/** @param {unknown[]} colors */
export function sequenceFactory(colors) {
  let index = 0;
  return {
    generate: () => pieceByColor(colors[index++ % colors.length]),
    restart: () => {
      index = 0;
    }
  };
}

// Deterministic random numbers in [0, 1).
/** @param {number} seed */
export function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * @param {GameManagerOptions & { factory?: PieceSource & { restart?(): void }, scheduler?: ReturnType<typeof createFakeScheduler> }} [options]
 * @returns {{ game: GameManager, scheduler: ReturnType<typeof createFakeScheduler>, storage: KeyValueStorage }}
 */
export function newGame(options = {}) {
  const scheduler = options.scheduler ?? createFakeScheduler();
  const storage = options.storage ?? createMemoryStorage();
  const game = new GameManager({ ...options, scheduler, storage });
  options.factory?.restart?.();
  game.handleAction(PlayerAction.newGame);
  return { game, scheduler, storage };
}

/** @param {string | null} [color] */
export function filled(color = PieceColors.cyan) {
  return { isFilled: true, color };
}

// Fills the given rows completely except for the listed columns.
/**
 * @param {GameManager} game
 * @param {number[]} rows
 * @param {number[]} [exceptColumns]
 */
export function fillRows(game, rows, exceptColumns = []) {
  for (const row of rows) {
    for (let column = 0; column < game.columns; column++) {
      if (!exceptColumns.includes(column))
        game.gameBoard[row][column] = filled();
    }
  }
}

/** @param {GameManager} game */
export function filledCells(game) {
  return game.gameBoard.flat().filter((cell) => cell.isFilled).length;
}

// Drops the current I piece vertically into column 9. It must have just spawned.
/** @param {GameManager} game */
export function dropVerticalIIntoColumn9(game) {
  game.handleAction(PlayerAction.rotate); // vertical, column 5
  for (let i = 0; i < 4; i++) game.handleAction(PlayerAction.moveRight);
  game.handleAction(PlayerAction.drop);
}

// Renders a shape as strings, for readable assertions.
/** @param {Shape} shape */
export function shapeStrings(shape) {
  return shape.map((row) => row.map((block) => (block ? 'X' : '.')).join(''));
}
