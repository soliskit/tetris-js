import { test, expect } from './fixtures.js';
import { boardCells } from './helpers.js';

test.beforeEach(async ({ page }) => {
  // Advance only declared browser time: slow WebKit round trips must not
  // turn a 220 ms held-input check into a gravity tick.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
});

const pieceCells = async page => (await boardCells(page)).flatMap((row, r) => row.flatMap((color, c) => color ? [[r, c]] : []));
for (const start of ['Enter', 'button']) for (const [key, axis] of [['KeyA', 1], ['KeyD', 1], ['KeyS', 0]]) {
  test(`New Game ignores an old ${key} hold via ${start} until release and press [INP-2]`, async ({ page }) => {
    await page.goto('/');
    await page.keyboard.down(key);
    if (start === 'Enter') await page.keyboard.press('Enter');
    else await page.locator('#newGameButton').click();
    await page.clock.runFor(32);
    await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
    const first = await pieceCells(page);
    await page.clock.runFor(220); // past DAS and several soft-drop ticks, before first gravity
    const held = await pieceCells(page);
    expect(held.map(cell => cell[axis])).toEqual(first.map(cell => cell[axis]));
    await page.keyboard.up(key);
    await page.keyboard.press(key);
    await page.clock.runFor(32);
    await expect.poll(async () => (await pieceCells(page)).map(cell => cell[axis])).not.toEqual(first.map(cell => cell[axis]));
  });
}


for (const [key, axis] of [['KeyA', 1], ['KeyD', 1], ['KeyS', 0]]) {
  test(`Game Over releases an active ${key} hold before button restart [INP-2]`, async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Enter');
    await page.clock.runFor(32);
    await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
    await page.keyboard.down(key);
    // Ordinary hard drops finish the game, without changing the engine or
    // installing a hook. Keep the direction/soft-drop hold throughout.
    for (let i = 0; i < 50 && !(await page.locator('#gameOverMessage').isVisible()); i++) {
      await page.keyboard.press('Space');
      await page.clock.runFor(16);
    }
    await expect(page.locator('#gameOverMessage')).toBeVisible();
    await page.locator('#newGameButton').click();
    await page.clock.runFor(32);
    await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
    const first = await pieceCells(page);
    await page.clock.runFor(220);
    expect((await pieceCells(page)).map(cell => cell[axis])).toEqual(first.map(cell => cell[axis]));
    await page.keyboard.up(key);
    await page.keyboard.press(key);
    await page.clock.runFor(32);
    await expect.poll(async () => (await pieceCells(page)).map(cell => cell[axis])).not.toEqual(first.map(cell => cell[axis]));
  });
}

test('a pad direction used in the New Game question stays spent after confirmation [INP-4]', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { connected: true, buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] };
    Object.defineProperty(window, 'testPad', { value: pad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad], configurable: true });
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.clock.runFor(32);
  await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
  await page.keyboard.press('KeyP');
  await page.keyboard.press('Enter');
  await page.clock.runFor(32);
  await expect(page.locator('#newGameDialog')).toBeVisible();
  await page.evaluate(() => { window.testPad.axes[0] = -1; });
  await page.clock.runFor(32);
  await page.locator('#confirmNewGameButton').click();
  await page.clock.runFor(32);
  await expect(page.locator('#newGameDialog')).toBeHidden();
  await expect.poll(async () => (await pieceCells(page)).length).toBe(4);
  const first = await pieceCells(page);
  await page.keyboard.up('KeyD');
  await page.clock.runFor(220);
  expect((await pieceCells(page)).map(cell => cell[1])).toEqual(first.map(cell => cell[1]));
  await page.evaluate(() => { window.testPad.axes[0] = 0; });
  await page.clock.runFor(32);
  await page.evaluate(() => { window.testPad.axes[0] = -1; });
  await page.clock.runFor(32);
  await expect.poll(async () => (await pieceCells(page)).map(cell => cell[1])).not.toEqual(first.map(cell => cell[1]));
});
