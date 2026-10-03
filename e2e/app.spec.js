import { test, expect } from './fixtures.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PieceColors, boardCells, expectLabel, fakeWakeLock, filledCount, isChromium, trackErrors, wakeLockCounts, wakeLockRequests } from './helpers.js';

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

// Serves a copy of the game the test can change, like a new deploy.
test('after the first visit the game opens from the cache, and a new version arrives on the next launch [APP-2]', async ({ page }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tetris-'));
  fs.cpSync(fileURLToPath(new URL('../public', import.meta.url)), dir, { recursive: true });
  const server = express().use(express.static(dir)).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const index = path.join(dir, 'index.html');
    fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<title>Tetris</title>', '<title>Tetris Deploy 2</title>'));
    await page.reload();
    await expect(page).toHaveTitle('Tetris');
    await expect.poll(() => page.evaluate(async () => (await (await caches.match('./')).text()).includes('Deploy 2'))).toBe(true);
    await page.reload();
    await expect(page).toHaveTitle('Tetris Deploy 2');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The color space each canvas draws in, and whether this browser has Display P3 canvases at all.
function colorSpaces(page) {
  return page.evaluate(() => {
    const space = context => context.getImageData(0, 0, 1, 1).colorSpace;
    return {
      canvases: [...document.querySelectorAll('canvas')].map(canvas => space(canvas.getContext('2d'))),
      supported: space(document.createElement('canvas').getContext('2d', { colorSpace: 'display-p3' })) === 'display-p3'
    };
  });
}

// The first piece pixel on the board, read in the canvas color space and in sRGB.
function firstPiecePixel(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const size = canvas.width / 10;
    for (let row = 0; row < 20; row++) for (let column = 0; column < 10; column++) {
      const x = Math.floor((column + 0.5) * size);
      const y = Math.floor((row + 0.5) * size);
      const own = [...context.getImageData(x, y, 1, 1).data];
      if (own[3] > 200) return { own, srgb: [...context.getImageData(x, y, 1, 1, { colorSpace: 'srgb' }).data] };
    }
    return null;
  });
}

const hex = ([red, green, blue]) => '#' + [red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();

test('pieces are drawn in the Display P3 color space where the browser has it, so they look more vivid [DSP-6]', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect.poll(() => filledCount(page)).toBe(4);
  const { canvases, supported } = await colorSpaces(page);
  expect(canvases).toEqual(Array(5).fill(supported ? 'display-p3' : 'srgb'));
  const { own, srgb } = await firstPiecePixel(page);
  expect(Object.values(PieceColors)).toContain(hex(own));
  // In P3 the same values lie outside sRGB, so reading them as sRGB differs.
  if (supported) expect(srgb).not.toEqual(own);
});

test('without Display P3 canvases, pieces keep their usual colors [DSP-6]', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return getContext.call(this, type, { ...options, colorSpace: 'srgb' });
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect.poll(() => filledCount(page)).toBe(4);
  expect((await colorSpaces(page)).canvases).toEqual(Array(5).fill('srgb'));
  const { own, srgb } = await firstPiecePixel(page);
  expect(Object.values(PieceColors)).toContain(hex(own));
  expect(srgb).toEqual(own);
});

test('the screen stays on while playing, and may sleep when paused or after game over [DSP-7]', async ({ page }) => {
  await fakeWakeLock(page, 'grant');
  await page.goto('/');
  await expect(page.locator('#newGameButton')).toBeVisible();
  expect(await wakeLockCounts(page)).toEqual({ granted: 0, held: 0 });
  await page.keyboard.press('Enter');
  await expect.poll(() => wakeLockCounts(page)).toEqual({ granted: 1, held: 1 });
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  await expect.poll(() => wakeLockCounts(page)).toEqual({ granted: 1, held: 0 });
  await page.keyboard.press('KeyP');
  await expect.poll(() => wakeLockCounts(page)).toEqual({ granted: 2, held: 1 });
  for (let i = 0; i < 30 && !(await page.locator('#newGameButton').isVisible()); i++) await page.keyboard.press('KeyS');
  await expect(page.locator('#newGameButton')).toBeVisible();
  await expect.poll(() => wakeLockCounts(page)).toEqual({ granted: 2, held: 0 });
});

test('a wake lock granted after play stopped, or after a newer request, is let go [DSP-7]', async ({ page }) => {
  await fakeWakeLock(page, 'hold');
  await page.goto('/');
  // Each step waits for the page to act on it, so no two land in one frame.
  await page.keyboard.press('Enter');
  await expect.poll(() => wakeLockRequests(page)).toBe(1);
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  await page.keyboard.press('KeyP');
  await expect.poll(() => wakeLockRequests(page)).toBe(2);
  await page.evaluate(() => window.grantWakeLocks());
  await expect.poll(() => wakeLockCounts(page)).toEqual({ granted: 2, held: 1 });
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  await page.keyboard.press('KeyP');
  await expect.poll(() => wakeLockRequests(page)).toBe(3);
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  await page.evaluate(() => window.grantWakeLocks());
  await expect.poll(() => wakeLockCounts(page)).toEqual({ granted: 3, held: 0 });
});

for (const mode of ['refuse', 'missing']) {
  test(`the game plays normally when the wake lock is ${mode === 'refuse' ? 'refused' : 'unsupported'} [DSP-7]`, async ({ page }) => {
    const errors = trackErrors(page);
    await fakeWakeLock(page, mode);
    await page.goto('/');
    await page.keyboard.press('Enter');
    await expectLabel(page, 'Pause');
    await expect.poll(() => filledCount(page)).toBe(4);
    await page.keyboard.press('KeyP');
    await expectLabel(page, 'Resume');
    expect(errors).toEqual([]);
  });
}

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
