import { test, expect } from './fixtures.js';
import { boardCells } from './helpers.js';

const pieceCells = async page => (await boardCells(page)).flatMap((row, r) => row.flatMap((color, c) => color ? [[r, c]] : []));
for (const start of ['Enter', 'button']) for (const [key, axis] of [['KeyA', 1], ['KeyD', 1], ['KeyS', 0]]) {
  test(`New Game ignores an old ${key} hold via ${start} until release and press [INP-2]`, async ({ page }) => {
    await page.goto('/');
    await page.keyboard.down(key);
    if (start === 'Enter') await page.keyboard.press('Enter');
    else await page.locator('#newGameButton').click();
    await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
    const first = await pieceCells(page);
    await page.waitForTimeout(220); // past DAS and several soft-drop ticks, before first gravity
    const held = await pieceCells(page);
    expect(held.map(cell => cell[axis])).toEqual(first.map(cell => cell[axis]));
    await page.keyboard.up(key);
    await page.keyboard.press(key);
    await expect.poll(async () => (await pieceCells(page)).map(cell => cell[axis])).not.toEqual(first.map(cell => cell[axis]));
  });
}


for (const [key, axis] of [['KeyA', 1], ['KeyD', 1], ['KeyS', 0]]) {
  test(`Game Over releases an active ${key} hold before button restart [INP-2]`, async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Enter');
    await page.keyboard.down(key);
    // Ordinary hard drops finish the game, without changing the engine or
    // installing a hook. Keep the direction/soft-drop hold throughout.
    for (let i = 0; i < 50 && !(await page.locator('#gameOverMessage').isVisible()); i++) {
      await page.keyboard.press('Space');
    }
    await expect(page.locator('#gameOverMessage')).toBeVisible();
    await page.locator('#newGameButton').click();
    await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
    const first = await pieceCells(page);
    await page.waitForTimeout(220);
    expect((await pieceCells(page)).map(cell => cell[axis])).toEqual(first.map(cell => cell[axis]));
    await page.keyboard.up(key);
    await page.keyboard.press(key);
    await expect.poll(async () => (await pieceCells(page)).map(cell => cell[axis])).not.toEqual(first.map(cell => cell[axis]));
  });
}
