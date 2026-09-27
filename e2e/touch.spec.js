import { test, expect } from '@playwright/test';
import { BOARD_COLOR, PieceColors, boardTouch, canvasHasDrawing, cellsOf, continueSavedGame, rowsExcept, savedGame } from './helpers.js';

test.skip(({ hasTouch }) => !hasTouch, 'touch gestures run on the phone sized project');

const minColumn = cells => Math.min(...cells.map(([, c]) => c));
const minRow = cells => Math.min(...cells.map(([r]) => r));
const shapeOf = cells => {
  const r0 = minRow(cells);
  const c0 = minColumn(cells);
  return JSON.stringify(cells.map(([r, c]) => [r - r0, c - c0]).sort());
};

async function playSaved(page, options) {
  await continueSavedGame(page, savedGame(options));
  await page.keyboard.press('KeyP');
}

test('tapping the board rotates the piece, even with a little finger wobble [INP-5]', async ({ page }) => {
  await playSaved(page, { piece: PieceColors.purple, position: { row: 5, column: 3 } });
  const touch = await boardTouch(page);
  const t = () => cellsOf(page, PieceColors.purple);
  const first = shapeOf(await t());
  await touch.down(5, 15);
  await touch.up();
  await expect.poll(async () => shapeOf(await t())).not.toBe(first);
  const second = shapeOf(await t());
  await touch.down(5, 15);
  await touch.moveBy(6 / touch.cell, 3 / touch.cell, 2); // about 6px of wobble
  await touch.up();
  await expect.poll(async () => shapeOf(await t())).not.toBe(second);
});

test('tapping the hold box holds the piece [INP-5] [PLY-7]', async ({ page }) => {
  await playSaved(page, { piece: PieceColors.purple });
  await page.locator('#heldPreview').tap();
  await expect.poll(() => canvasHasDrawing(page, 'heldPreview')).toBe(true);
});

test('dragging sideways moves one column per cell dragged [INP-5]', async ({ page }) => {
  await playSaved(page, { piece: PieceColors.purple, position: { row: 5, column: 3 } });
  const touch = await boardTouch(page);
  await touch.down(4, 12);
  await touch.moveBy(2.6, 0, 13);
  await expect.poll(async () => minColumn(await cellsOf(page, PieceColors.purple))).toBe(6);
  await touch.moveBy(-2.6, 0, 13);
  await expect.poll(async () => minColumn(await cellsOf(page, PieceColors.purple))).toBe(3);
  await touch.up();
});

test('dragging down soft drops one row per cell dragged [INP-5] [PLY-3]', async ({ page }) => {
  await playSaved(page, { piece: PieceColors.purple, position: { row: 2, column: 3 } });
  const touch = await boardTouch(page);
  await touch.down(4, 8);
  await touch.moveBy(0, 3.2, 12);
  await expect.poll(async () => minRow(await cellsOf(page, PieceColors.purple))).toBeGreaterThanOrEqual(5);
  await touch.up();
});

test('a dragged piece is never drawn over locked blocks [INP-5] [PCE-6]', async ({ page }) => {
  await playSaved(page, {
    piece: PieceColors.yellow,
    position: { row: 6, column: 4 },
    board: rowsExcept([...Array(16).keys()].map(i => i + 4), [0, 1, 2, 3, 4, 5])
  });
  const touch = await boardTouch(page);
  await touch.down(5, 7);
  await touch.moveBy(1.4, 0, 7);
  const rightEdge = await page.evaluate(() => {
    const canvas = document.getElementById('tetris');
    const size = canvas.width / 10;
    const pixels = canvas.getContext('2d').getImageData(0, Math.floor(size * 7.5), canvas.width, 1).data;
    let last = -1;
    for (let x = 0; x < canvas.width; x++) {
      const [r, g, b] = pixels.slice(x * 4, x * 4 + 3);
      if (r > 200 && g > 170 && b < 90) last = x;
    }
    return last / size;
  });
  expect(rightEdge).toBeLessThanOrEqual(6);
  expect(await cellsOf(page, BOARD_COLOR)).toHaveLength(64);
  await touch.up();
});

test('after pushing into a wall, dragging back responds within a cell [INP-5]', async ({ page }) => {
  await playSaved(page, {
    piece: PieceColors.yellow,
    position: { row: 6, column: 4 },
    board: rowsExcept([...Array(16).keys()].map(i => i + 4), [0, 1, 2, 3, 4, 5])
  });
  const touch = await boardTouch(page);
  await touch.down(5, 7);
  await touch.moveBy(3, 0, 15); // three cells into the wall
  expect(minColumn(await cellsOf(page, PieceColors.yellow))).toBe(4);
  await touch.moveBy(-0.6, 0, 3);
  await expect.poll(async () => minColumn(await cellsOf(page, PieceColors.yellow))).toBe(3);
  await touch.up();
});

test('a drag that outlives its piece leaves the next piece alone [INP-5]', async ({ page }) => {
  await playSaved(page, { piece: PieceColors.purple, position: { row: 17, column: 3 } });
  const touch = await boardTouch(page);
  await touch.down(4, 10);
  await touch.moveBy(0, 1.2, 3); // onto the floor
  await expect.poll(async () => (await cellsOf(page, PieceColors.purple)).filter(([r]) => r < 4).length, { timeout: 3000 }).toBe(4);
  const topPiece = async () => (await cellsOf(page, PieceColors.purple)).filter(([r]) => r < 6);
  const spawned = await topPiece();
  await touch.moveBy(3, 5, 10); // would move it 3 columns and drop it 5 rows
  await page.waitForTimeout(100);
  const after = await topPiece();
  expect(after).toHaveLength(4);
  expect(minColumn(after)).toBe(minColumn(spawned));
  expect(minRow(after) - minRow(spawned)).toBeLessThanOrEqual(1); // at most one gravity step
  await touch.up();
});

test('pinching does not zoom the page [DSP-4]', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  const touch = await boardTouch(page);
  await touch.pinch(2.5);
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
});
