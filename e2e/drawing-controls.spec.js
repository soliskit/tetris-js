import { test, expect } from './fixtures.js';
import {
  PieceColors,
  continueSavedGame,
  expectLabel,
  filledCount,
  rowsExcept,
  savedGame
} from './helpers.js';

test('persistent canvas faults do not defer controls [DSP-5] [SAF-5]', async ({
  page
}, testInfo) => {
  test.setTimeout(30000);
  /** @type {string[]} */
  const reports = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      message.text().includes('Tetris drawing error')
    ) {
      reports.push(message.text());
    }
  });
  await page.addInitScript(() => {
    /** @type {unknown} */
    const fill = Reflect.get(CanvasRenderingContext2D.prototype, 'fill');
    if (typeof fill !== 'function')
      throw new Error('CanvasRenderingContext2D.fill is not a function');
    window.drawingFails = false;
    window.failedDraws = 0;
    window.successfulFills = 0;
    CanvasRenderingContext2D.prototype.fill = function (
      /** @type {unknown[]} */ ...args
    ) {
      if (window.drawingFails) {
        window.failedDraws = (window.failedDraws ?? 0) + 1;
        throw new Error('injected persistent canvas failure');
      }
      Reflect.apply(fill, this, args);
      window.successfulFills = (window.successfulFills ?? 0) + 1;
    };
  });
  try {
    await continueSavedGame(
      page,
      savedGame({
        piece: PieceColors.yellow,
        board: rowsExcept([19], [4, 5])
      })
    );
    await expect(page.locator('#score')).toHaveText('Score: 0');
    await expect.poll(() => filledCount(page)).toBe(12);
    await expect
      .poll(() => page.evaluate(() => window.successfulFills))
      .toBeGreaterThan(0);
    await page.keyboard.press('KeyP');
    await expectLabel(page, 'Pause');
    await page.evaluate(() => {
      window.failedDraws = 0;
      window.drawingFails = true;
    });
    await page.keyboard.press('Space');
    await expect
      .poll(() => page.evaluate(() => window.failedDraws))
      .toBeGreaterThan(3);
    await expect(page.locator('#score')).toHaveText('Score: 100', {
      timeout: 3000
    });
    expect(await page.evaluate(() => window.drawingFails)).toBe(true);
    await page.keyboard.press('KeyP');
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Resume'
    );
    await expect(page.locator('#menuControls')).toBeVisible();
    await expect(page.locator('#keyHint')).toContainText('P: Resume');
    await page.keyboard.press('Enter');
    await expect(page.locator('#newGameDialog')).toHaveJSProperty('open', true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#newGameDialog')).toHaveJSProperty(
      'open',
      false
    );
    await expect(page.locator('#score')).toHaveText('Score: 100');
    await expectLabel(page, 'Resume');
    expect(await page.evaluate(() => window.drawingFails)).toBe(true);
    expect(reports).toHaveLength(1);
    const fillsBeforeRecovery = await page.evaluate(() => {
      window.drawingFails = false;
      if (window.successfulFills === undefined)
        throw new Error('fill counter was not installed');
      return window.successfulFills;
    });
    await expect
      .poll(() => page.evaluate(() => window.successfulFills))
      .toBeGreaterThan(fillsBeforeRecovery);
    await expect.poll(() => filledCount(page)).toBe(6);
    await expect(page.locator('#score')).toHaveText('Score: 100');
    await expectLabel(page, 'Resume');
    await page.screenshot({
      path: testInfo.outputPath('controls-after-drawing-recovery.png')
    });
  } finally {
    if (!page.isClosed()) {
      await page.evaluate(() => {
        window.drawingFails = false;
      });
    }
  }
});
