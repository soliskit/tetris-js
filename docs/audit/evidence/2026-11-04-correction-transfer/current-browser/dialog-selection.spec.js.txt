import { test, expect } from './fixtures.js';
import { boardCells, continueSavedGame, savedGame, PieceColors, expectLabel } from './helpers.js';

for (const answer of ['Cancel', 'New Game']) {
  test(`interior question clicks preserve selected ${answer} and Enter uses it [STA-1] [INP-4]`, async ({ page }, testInfo) => {
    await continueSavedGame(page, savedGame({ piece: PieceColors.purple, score: 300 }));
    const kept = await boardCells(page);
    const dialog = page.locator('#newGameDialog');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#cancelNewGameButton')).toBeFocused();
    if (answer === 'New Game') await page.keyboard.press('ArrowRight');
    const selected = page.locator(answer === 'Cancel' ? '#cancelNewGameButton' : '#confirmNewGameButton');
    const content = page.locator('.dialog-content');
    for (const target of ['question', 'padding']) {
      if (target === 'question') await page.locator('#newGameQuestion').click();
      else {
        const { height } = await content.boundingBox();
        await content.click({ position: { x: 10, y: height / 2 } });
      }
      await expect(selected).toBeFocused();
      expect(await selected.evaluate(button => {
        const style = getComputedStyle(button);
        return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      })).toBe(true);
      await expect(dialog).toBeVisible();
      await expectLabel(page, 'Resume');
      await expect(page.locator('#score')).toHaveText('Score: 300');
      expect(await boardCells(page)).toEqual(kept);
    }
    await page.screenshot({ path: testInfo.outputPath('retained-answer.png') });
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    if (answer === 'Cancel') {
      await expectLabel(page, 'Resume');
      expect(await boardCells(page)).toEqual(kept);
      await expect(page.locator('#score')).toHaveText('Score: 300');
    } else {
      await expectLabel(page, 'Pause');
      await expect(page.locator('#score')).toHaveText('Score: 0');
    }
  });
}

test('only a primary left pointer press inside question content suppresses focus default [STA-1]', async ({ page }) => {
  await continueSavedGame(page, savedGame({ piece: PieceColors.purple }));
  await page.keyboard.press('Enter');
  await expect(page.locator('#newGameDialog')).toBeVisible();
  // Synthetic events check the event filter only. The tests above supply
  // the ordinary browser-click focus-loss and recovery witnesses.
  const prevented = await page.evaluate(() => {
    const question = document.getElementById('newGameQuestion');
    const cases = [[false, 0], [true, 2], [true, 0]];
    return cases.map(([isPrimary, button]) => {
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary, button });
      question.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(prevented).toEqual([false, false, true]);
});
