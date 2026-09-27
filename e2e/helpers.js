// Shared helpers for the browser tests. The page does not expose the game
// object, so tests read what the player sees: the DOM and the canvas pixels.

import { GameManager, createMemoryStorage } from '../public/game/gameManager.js';
import { PlayerAction } from '../public/game/gameState.js';
import { allPieces } from '../public/game/tetrominoFactory.js';

export { PieceColors } from '../public/game/tetrominoFactory.js';

export const BOARD_COLOR = '#8E8E93'; // gray, not used by any piece

// Builds a saved game in Node with the real engine, for the page to continue.
// board: list of [row, column] cells to fill. piece: color of every piece.
export function savedGame({ piece, board = [], position, rotationState = 0, score = 0 }) {
  const storage = createMemoryStorage();
  const shape = allPieces().find(p => p.color === piece);
  const game = new GameManager({
    storage,
    scheduler: { setTimeout: () => 0, clearTimeout() {} },
    factory: { generate: () => shape.copy() }
  });
  game.handleAction(PlayerAction.newGame);
  for (const [row, column] of board) game.gameBoard[row][column] = { isFilled: true, color: BOARD_COLOR };
  if (position) game.currentTetromino.position = position;
  game.currentTetromino.rotationState = rotationState;
  game.score = score;
  game.handleAction(PlayerAction.pause);
  return {
    isSessionSaved: 'true',
    savedGameSession: storage.getItem('savedGameSession'),
    highScore: '0'
  };
}

// Rows fully filled except the listed columns, as [row, column] cells.
export function rowsExcept(rows, exceptColumns) {
  const cells = [];
  for (const row of rows) for (let column = 0; column < 10; column++) {
    if (!exceptColumns.includes(column)) cells.push([row, column]);
  }
  return cells;
}

// Opens the game with a saved game in storage and continues it (paused).
export async function continueSavedGame(page, saved) {
  await page.addInitScript(values => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, saved);
  await page.goto('/');
  await page.keyboard.press('KeyC');
  await expectLabel(page, 'Resume');
}

export async function expectLabel(page, label) {
  await page.waitForFunction(text => document.getElementById('playPauseButton').getAttribute('aria-label') === text, label);
}

// The piece color at the center of every board cell, or null when empty.
// Ghost pieces are outlines, so their centers read as empty.
export function boardCells(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const size = canvas.width / 10;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const rows = [];
    for (let row = 0; row < 20; row++) {
      const cells = [];
      for (let column = 0; column < 10; column++) {
        const x = Math.floor((column + 0.5) * size);
        const y = Math.floor((row + 0.5) * size);
        const i = (y * canvas.width + x) * 4;
        cells.push(data[i + 3] > 200 ? '#' + [0, 1, 2].map(k => data[i + k].toString(16).padStart(2, '0')).join('').toUpperCase() : null);
      }
      rows.push(cells);
    }
    return rows;
  });
}

// [row, column] of every cell showing the given color.
export async function cellsOf(page, color) {
  const cells = await boardCells(page);
  const result = [];
  cells.forEach((row, r) => row.forEach((value, c) => { if (value === color) result.push([r, c]); }));
  return result;
}

export async function filledCount(page) {
  return (await boardCells(page)).flat().filter(Boolean).length;
}

// Whether a canvas has any opaque pixels drawn on it.
export function canvasHasDrawing(page, id) {
  return page.evaluate(id => {
    const canvas = document.getElementById(id);
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 200) return true;
    return false;
  }, id);
}

// Touch input through the Chrome DevTools Protocol, in board cell units.
export async function boardTouch(page) {
  const cdp = await page.context().newCDPSession(page);
  const box = await page.locator('#tetris').boundingBox();
  const cell = box.width / 10;
  let last = null;
  const point = (column, row) => ({ x: box.x + cell * column, y: box.y + cell * row });
  const send = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
  return {
    cell,
    async down(column, row) { last = point(column, row); await send('touchStart', last); },
    // Moves in small steps, like a real finger.
    async moveBy(columns, rows, steps = 8) {
      const start = last;
      for (let i = 1; i <= steps; i++) {
        last = { x: start.x + (cell * columns * i) / steps, y: start.y + (cell * rows * i) / steps };
        await send('touchMove', last);
      }
    },
    async up() { await send('touchEnd'); },
    async pinch(scaleFactor) {
      await cdp.send('Input.synthesizePinchGesture', { x: box.x + box.width / 2, y: box.y + cell * 2, scaleFactor });
    }
  };
}

// Collects page errors and console errors, for asserting a clean run.
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}
