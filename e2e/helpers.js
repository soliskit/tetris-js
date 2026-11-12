// Shared helpers for the browser tests. The page does not expose the game
// object, so tests read what the player sees: the DOM and the canvas pixels.

import {
  GameManager,
  createMemoryStorage
} from '../public/game/gameManager.js';
import { PlayerAction } from '../public/game/gameState.js';
import { allPieces } from '../public/game/tetrominoFactory.js';
import { present } from '../test/json.js';

import { PieceColors } from '../public/game/tetrominoFactory.js';

export { PieceColors };

// Locked blocks in test boards. Saves may only hold real piece colors, and
// no test moves a blue piece, so blue cells are always locked blocks.
export const BOARD_COLOR = PieceColors.blue;

// Builds a saved game in Node with the real engine, for the page to continue.
// board: list of [row, column] cells to fill. piece: color of every piece.
/**
 * @param {object} options
 * @param {string} options.piece
 * @param {Array<[number, number]>} [options.board]
 * @param {{ row: number, column: number }} [options.position]
 * @param {number} [options.rotationState]
 * @param {number} [options.score]
 * @param {number} [options.lockDelayResetCount]
 * @returns {Record<string, string | null>}
 */
export function savedGame({
  piece,
  board = [],
  position,
  rotationState = 0,
  score = 0,
  lockDelayResetCount = 0
}) {
  const storage = createMemoryStorage();
  const shape = present(allPieces().find((p) => p.color === piece));
  const game = new GameManager({
    storage,
    scheduler: { setTimeout: () => 0, clearTimeout() {} },
    factory: { generate: () => shape.copy() }
  });
  game.handleAction(PlayerAction.newGame);
  for (const [row, column] of board)
    game.gameBoard[row][column] = { isFilled: true, color: BOARD_COLOR };
  if (position) game.currentTetromino.position = position;
  // Teleporting the piece bypasses the tracker, so the save must record the row the piece now rests at.
  game.currentTetromino.rotationState = rotationState;
  game.lowestRowReached = Math.max(
    ...game.currentTetromino.cells.map((cell) => cell.row)
  );
  // With the resets used up, landing locks at once (PLY-6).
  game.lockDelayResetCount = lockDelayResetCount;
  game.score = score;
  game.handleAction(PlayerAction.pause);
  return {
    'tetris.isSessionSaved': 'true',
    'tetris.savedGameSession': storage.getItem('tetris.savedGameSession'),
    'tetris.highScore': '0'
  };
}

// Rows fully filled except the listed columns, as [row, column] cells.
/**
 * @param {number[]} rows
 * @param {number[]} exceptColumns
 */
export function rowsExcept(rows, exceptColumns) {
  /** @type {Array<[number, number]>} */
  const cells = [];
  for (const row of rows)
    for (let column = 0; column < 10; column++) {
      if (!exceptColumns.includes(column)) cells.push([row, column]);
    }
  return cells;
}

// Opens the game with a saved game in storage and continues it (paused).
/**
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, string | null>} saved
 */
export async function continueSavedGame(page, saved) {
  await page.addInitScript((values) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [key, value] of Object.entries(values))
      localStorage.setItem(key, String(value));
  }, saved);
  await page.goto('/');
  await page.keyboard.press('KeyC');
  await expectLabel(page, 'Resume');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
export async function expectLabel(page, label) {
  await page.waitForFunction((text) => {
    const button = document.getElementById('playPauseButton');
    if (!button) throw new Error('#playPauseButton not found');
    return button.getAttribute('aria-label') === text;
  }, label);
}

// The piece color at the center of every board cell, or null when empty.
// Ghost pieces are outlines, so their centers read as empty.
/**
 * @param {import('@playwright/test').Page} page
 */
export function boardCells(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('tetris');
    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error('boardCells: #tetris is not a canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('boardCells: no 2d context');
    const size = canvas.width / 10;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const rows = [];
    for (let row = 0; row < 20; row++) {
      const cells = [];
      for (let column = 0; column < 10; column++) {
        const x = Math.floor((column + 0.5) * size);
        const y = Math.floor((row + 0.5) * size);
        const i = (y * canvas.width + x) * 4;
        cells.push(
          data[i + 3] > 200
            ? '#' +
                [0, 1, 2]
                  .map((k) => data[i + k].toString(16).padStart(2, '0'))
                  .join('')
                  .toUpperCase()
            : null
        );
      }
      rows.push(cells);
    }
    return rows;
  });
}

// [row, column] of every cell showing the given color.
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} color
 */
export async function cellsOf(page, color) {
  const cells = await boardCells(page);
  /** @type {Array<[number, number]>} */
  const result = [];
  cells.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === color) result.push([r, c]);
    });
  });
  return result;
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function filledCount(page) {
  return (await boardCells(page)).flat().filter(Boolean).length;
}

// Whether a canvas has any opaque pixels drawn on it.
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} id
 */
export function canvasHasDrawing(page, id) {
  return page.evaluate((id) => {
    const canvas = document.getElementById(id);
    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error(`canvasHasDrawing: #${id} is not a canvas`);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvasHasDrawing: no 2d context');
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 200) return true;
    return false;
  }, id);
}

/**
 * @param {import('@playwright/test').Page} page
 */
export const isChromium = (page) => {
  const browser = page.context().browser();
  if (!browser) throw new Error('isChromium: page has no browser');
  return browser.browserType().name() === 'chromium';
};

// Finger input on the board, in board cell units. Chromium gets real touch
// events through the DevTools Protocol. Playwright cannot drag a finger in
// WebKit, so there the same gestures use the mouse; the game reads both
// through the same pointer events.
/**
 * @param {import('@playwright/test').Page} page
 */
export async function boardTouch(page) {
  const box = await page.locator('#tetris').boundingBox();
  if (!box) throw new Error('boardTouch: #tetris has no bounding box');
  const cell = box.width / 10;
  /** @type {{ x: number, y: number } | null} */
  let last = null;
  /**
   * @param {number} column
   * @param {number} row
   */
  const point = (column, row) => ({
    x: box.x + cell * column,
    y: box.y + cell * row
  });
  /** @type {(type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number, y: number }) => Promise<unknown>} */
  let send;
  if (isChromium(page)) {
    const cdp = await page.context().newCDPSession(page);
    send = (type, p) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
  } else {
    send = async (type, p) => {
      if (type === 'touchStart') {
        if (!p) throw new Error('boardTouch: touchStart needs a point');
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
      } else if (type === 'touchMove') {
        if (!p) throw new Error('boardTouch: touchMove needs a point');
        await page.mouse.move(p.x, p.y);
      } else await page.mouse.up();
    };
  }
  return {
    cell,
    /**
     * @param {number} column
     * @param {number} row
     */
    async down(column, row) {
      last = point(column, row);
      await send('touchStart', last);
    },
    // Moves in small steps, like a real finger.
    /**
     * @param {number} columns
     * @param {number} rows
     * @param {number} [steps]
     */
    async moveBy(columns, rows, steps = 8) {
      const start = last;
      if (!start) throw new Error('boardTouch: moveBy before down');
      for (let i = 1; i <= steps; i++) {
        last = {
          x: start.x + (cell * columns * i) / steps,
          y: start.y + (cell * rows * i) / steps
        };
        await send('touchMove', last);
      }
    },
    async up() {
      await send('touchEnd');
    }
  };
}

// Collects page errors and console errors, for asserting a clean run.
/** @param {import('@playwright/test').Page} page */
export function trackErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

// Replaces the Screen Wake Lock API with a fake the test controls. mode:
// 'grant' grants requests at once, 'refuse' rejects them, 'hold' waits for
// window.grantWakeLocks(), 'missing' removes the API. Like the real one, a
// lock fires 'release' when let go; window.revokeWakeLocks() lets every
// lock go the way the system does when the battery runs low.
/**
 * @param {import('@playwright/test').Page} page
 * @param {'grant' | 'refuse' | 'hold' | 'missing'} mode
 */
export async function fakeWakeLock(page, mode) {
  await page.addInitScript((mode) => {
    if (mode === 'missing') {
      if (
        !Reflect.deleteProperty(Navigator.prototype, 'wakeLock') ||
        !Reflect.deleteProperty(navigator, 'wakeLock')
      )
        throw new Error('could not remove the wakeLock API');
      return;
    }
    /** @type {WakeLockWitness[]} */
    const wakeLocks = [];
    window.wakeLocks = wakeLocks;
    window.wakeLockRequests = 0;
    /** @type {Array<() => void>} */
    const pending = [];
    window.grantWakeLocks = () => {
      pending.splice(0).forEach((grant) => {
        grant();
      });
    };
    window.revokeWakeLocks = () => {
      for (const lock of [...wakeLocks]) void lock.release();
    };
    const request = (/** @type {string} */ type) =>
      new Promise((resolve, reject) => {
        window.wakeLockRequests = (window.wakeLockRequests ?? 0) + 1;
        if (mode === 'refuse') {
          reject(new DOMException('Wake lock refused', 'NotAllowedError'));
          return;
        }
        /** @type {WakeLockWitness} */
        const sentinel = Object.assign(new EventTarget(), {
          type,
          released: false,
          /** @this {WakeLockWitness} */
          release() {
            if (!this.released) {
              this.released = true;
              this.dispatchEvent(new Event('release'));
            }
            return Promise.resolve();
          }
        });
        const grant = () => {
          wakeLocks.push(sentinel);
          resolve(sentinel);
        };
        if (mode === 'hold') pending.push(grant);
        else grant();
      });
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request },
      configurable: true
    });
  }, mode);
}

// How many wake locks the fake was asked for.
/** @param {import('@playwright/test').Page} page */
export function wakeLockRequests(page) {
  return page.evaluate(() => window.wakeLockRequests);
}

// How many wake locks the fake has granted, and how many are still held.
/** @param {import('@playwright/test').Page} page */
export function wakeLockCounts(page) {
  return page.evaluate(() => {
    const locks = window.wakeLocks;
    if (!locks) throw new Error('the wake lock fake was not installed');
    return {
      granted: locks.length,
      held: locks.filter((lock) => !lock.released).length
    };
  });
}

// For Locator.evaluate on a canvas element: its bitmap width in pixels.
/** @param {Element} element */
export function canvasWidth(element) {
  if (!(element instanceof HTMLCanvasElement))
    throw new Error('the element is not a canvas');
  return element.width;
}
