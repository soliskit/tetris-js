import { test, expect } from './fixtures.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boardCells, expectLabel, filledCount, isChromium, trackErrors } from './helpers.js';

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

test('the page does not wake up every frame while nothing changes [DSP-3]', async ({ page }) => {
  await page.addInitScript(() => {
    window.frameRequests = 0;
    const request = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => {
      window.frameRequests++;
      return request(callback);
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  await page.waitForTimeout(100);
  const before = await page.evaluate(() => window.frameRequests);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.frameRequests)).toBe(before);
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

test('the canvases are rebuilt when the screen pixel density changes [DSP-2]', async ({ page }) => {
  test.skip(!isChromium(page), 'only Chromium can change the pixel density during a test');
  await page.goto('/');
  await page.keyboard.press('Enter');
  const size = page.viewportSize();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 2, mobile: false });
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.getElementById('tetris');
    return devicePixelRatio === 2 && canvas.width === Math.round(canvas.getBoundingClientRect().width * 2);
  })).toBe(true);
  await expect.poll(() => filledCount(page)).toBe(4);
});

test('the page cannot be zoomed, scrolled by touch or text selected [DSP-4]', async ({ page }) => {
  await page.goto('/');
  const styles = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const gesture = new Event('gesturestart', { cancelable: true });
    document.dispatchEvent(gesture);
    // WebKit only reports the prefixed property.
    return { touchAction: html.touchAction, userSelect: html.userSelect ?? html.webkitUserSelect, pinchCancelled: gesture.defaultPrevented };
  });
  expect(styles).toEqual({ touchAction: 'none', userSelect: 'none', pinchCancelled: true });
});

test('the game can be installed as an app [APP-1]', async ({ page }) => {
  test.skip(!isChromium(page), 'Safari has no install check to query; the manifest and icons are checked by the unit tests');
  await page.goto('/');
  const cdp = await page.context().newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.errors).toEqual([]);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});

// Truly offline: the test starts its own server and shuts it down. (Playwright's
// simulated offline mode does not pass through the service worker in WebKit.)
test('the game works offline after the first visit [APP-2]', async ({ page }, testInfo) => {
  const port = 4300 + testInfo.workerIndex * 10 + testInfo.repeatEachIndex;
  const server = spawn(process.execPath, [fileURLToPath(new URL('../index.js', import.meta.url))], { env: { ...process.env, PORT: String(port) } });
  try {
    await new Promise(resolve => server.stdout.once('data', resolve));
    await page.goto(`http://localhost:${port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  } finally {
    server.kill();
  }
  await new Promise(resolve => server.once('exit', resolve));
  await page.reload();
  await expect(page.locator('#newGameButton')).toBeVisible();
  await page.keyboard.press('Enter');
  await expectLabel(page, 'Pause');
  await expect.poll(() => filledCount(page)).toBe(4);
});

test('a whole game runs to the end without errors [SAF-6] [STA-3]', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#newGameButton')).toBeHidden();
  for (let i = 0; i < 60; i++) {
    if (await page.locator('#newGameButton').isVisible()) break;
    for (const key of ['KeyW', 'KeyA', 'KeyD', 'KeyH', 'KeyS']) await page.keyboard.press(key);
  }
  await expect(page.locator('#newGameButton')).toBeVisible();
  expect((await boardCells(page)).flat().filter(Boolean).length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
