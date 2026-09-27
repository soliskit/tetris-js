import { test, expect } from '@playwright/test';
import { boardCells, expectLabel, filledCount, trackErrors } from './helpers.js';

test('nothing is redrawn while the game is paused [DSP-3]', async ({ page }) => {
  await page.addInitScript(() => {
    window.drawCalls = 0;
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      window.drawCalls++;
      return fill.apply(this, args);
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  const before = await page.evaluate(() => window.drawCalls);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.drawCalls)).toBe(before);
});

test('the board is redrawn at the new size after a resize [DSP-2]', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('KeyP');
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.width - 40, height: size.height - 120 });
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.getElementById('tetris');
    return canvas.width === Math.round(canvas.getBoundingClientRect().width * devicePixelRatio);
  })).toBe(true);
  expect(await filledCount(page)).toBe(4);
});

test('the page cannot be zoomed, scrolled by touch or text selected [DSP-4]', async ({ page }) => {
  await page.goto('/');
  const styles = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const gesture = new Event('gesturestart', { cancelable: true });
    document.dispatchEvent(gesture);
    return { touchAction: html.touchAction, userSelect: html.userSelect, pinchCancelled: gesture.defaultPrevented };
  });
  expect(styles).toEqual({ touchAction: 'none', userSelect: 'none', pinchCancelled: true });
});

test('the game can be installed as an app [APP-1]', async ({ page }) => {
  await page.goto('/');
  const cdp = await page.context().newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.errors).toEqual([]);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});

test('the game works offline after the first visit [APP-2]', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#newGameButton')).toBeVisible();
  await page.keyboard.press('Enter');
  await expectLabel(page, 'Pause');
  expect(await filledCount(page)).toBe(4);
  await context.setOffline(false);
});

test('a whole game runs to the end without errors [SAF-6] [STA-3]', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 60; i++) {
    if (await page.locator('#newGameButton').isVisible()) break;
    for (const key of ['KeyW', 'KeyA', 'KeyD', 'KeyH', 'KeyS']) await page.keyboard.press(key);
  }
  await expect(page.locator('#newGameButton')).toBeVisible();
  expect((await boardCells(page)).flat().filter(Boolean).length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
