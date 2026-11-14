// Hold box taps made while another contact is down on the board (INP-5).
// Every browser gets a synthetic secondary touch beside a mouse contact on
// the board. Chromium also sends two real touches through its DevTools
// touch input, in a context of its own.

import { test, expect } from './fixtures.js';
import {
  PieceColors,
  canvasHasDrawing,
  cellsOf,
  continueSavedGame,
  savedGame
} from './helpers.js';

/**
 * Opens a saved game with a purple piece in the middle of the board and
 * starts play on a paused clock, so the piece only moves when a test acts.
 * @param {import('@playwright/test').Page} page
 * @param {boolean} [outsideFixture] A page the test made itself does not wait
 * for the game on its own.
 */
async function setup(page, outsideFixture = false) {
  await page.clock.install();
  const saved = savedGame({
    piece: PieceColors.purple,
    position: { row: 5, column: 3 }
  });
  if (outsideFixture) {
    await page.addInitScript((values) => {
      for (const [key, value] of Object.entries(values))
        localStorage.setItem(key, String(value));
    }, saved);
    await page.goto('/');
    await page.waitForFunction(
      () => document.documentElement.dataset.tabAdmission === 'ready'
    );
    await page.keyboard.press('KeyC');
    await page.clock.runFor(17);
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Resume'
    );
  } else {
    await continueSavedGame(page, saved);
  }
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.keyboard.press('KeyP');
  await page.clock.runFor(17);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
}

/** @param {import('@playwright/test').Page} page */
const held = (page) => canvasHasDrawing(page, 'heldPreview');

/** @param {import('@playwright/test').Page} page */
const piece = (page) => cellsOf(page, PieceColors.purple);

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function centerOf(page, selector) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`hold-touch: ${selector} has no bounding box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/**
 * Sends the hold box one event of a touch that is not the primary pointer.
 * @param {import('@playwright/test').Page} page
 * @param {string} type
 */
async function touchHold(page, type, options = {}) {
  await page.locator('#heldPreview').evaluate(
    (hold, { type, options }) => {
      const box = hold.getBoundingClientRect();
      hold.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 72,
          pointerType: 'touch',
          isPrimary: false,
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
          ...options
        })
      );
    },
    { type, options }
  );
  await page.clock.runFor(17);
}

for (const boardFirst of [false, true]) {
  for (const dragging of [false, true]) {
    test(`synthetic secondary touch Hold with mouse board contact holds, ${boardFirst ? 'board' : 'Hold'} lifts first, ${dragging ? 'dragging' : 'resting'} [INP-5] [PLY-7]`, async ({
      page,
      browserName,
      browser
    }, testInfo) => {
      await setup(page);
      const board = await centerOf(page, '#tetris');
      await page.mouse.move(board.x, board.y);
      await page.mouse.down();
      if (dragging)
        await page.mouse.move(board.x + board.box.width / 10, board.y + 15);
      await touchHold(page, 'pointerdown');
      if (boardFirst) await page.mouse.up();
      await page.clock.runFor(17);
      const before = await piece(page);
      expect(await held(page)).toBe(false);
      await touchHold(page, 'pointerup');
      expect(await held(page)).toBe(true);
      // The next piece came in at its starting position.
      const entered = await piece(page);
      expect(entered).toHaveLength(4);
      expect(entered).not.toEqual(before);
      if (!boardFirst) {
        // The board contact began with the piece now held: dragging it on,
        // or lifting it as a would-be tap, does nothing to the piece that
        // came in.
        if (dragging)
          await page.mouse.move(board.x + board.box.width / 5, board.y + 50);
        await page.mouse.up();
        await page.clock.runFor(17);
        expect(await piece(page)).toEqual(entered);
      }
      // A fresh board gesture works after the old contact ends.
      await page.mouse.click(board.x, board.y);
      await page.clock.runFor(17);
      const turned = await piece(page);
      expect(turned).toHaveLength(4);
      expect(turned).not.toEqual(entered);
      if (browserName === 'chromium') {
        const nativeContext = await browser.newContext(
          nativeContextOptions(testInfo)
        );
        try {
          await nativeTwoTouch(
            await nativeContext.newPage(),
            boardFirst,
            dragging
          );
        } finally {
          await nativeContext.close();
        }
      }
    });
  }
}

test('synthetic secondary touch Hold ignores canceled, moved and lifted-away taps, and a completed tap holds [INP-5] [PLY-7]', async ({
  page,
  browserName,
  browser
}, testInfo) => {
  await setup(page);
  // A canceled touch is over: a stray lift for it does not hold.
  await touchHold(page, 'pointerdown');
  await touchHold(page, 'pointercancel');
  await touchHold(page, 'pointerup');
  expect(await held(page)).toBe(false);
  // Leaving the box and coming back is not a tap.
  await touchHold(page, 'pointerdown');
  await touchHold(page, 'pointermove', { clientX: 0, clientY: 0 });
  await touchHold(page, 'pointerup');
  expect(await held(page)).toBe(false);
  // Lifting away from the box is not a tap, even with no move event.
  await touchHold(page, 'pointerdown');
  await touchHold(page, 'pointerup', { clientX: 0, clientY: 0 });
  expect(await held(page)).toBe(false);
  // The same events, completed inside the box, hold.
  await touchHold(page, 'pointerdown');
  await touchHold(page, 'pointerup');
  expect(await held(page)).toBe(true);
  if (browserName === 'chromium') {
    const nativeContext = await browser.newContext(
      nativeContextOptions(testInfo)
    );
    try {
      await nativeControls(await nativeContext.newPage());
    } finally {
      await nativeContext.close();
    }
  }
});

/**
 * Chromium's DevTools touch input. On touchEnd the listed contacts are the
 * ones lifted, and an empty list lifts the rest.
 * @param {import('@playwright/test').Page} page
 */
async function nativeTouch(page) {
  const cdp = await page.context().newCDPSession(page);
  return {
    /**
     * @param {'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel'} type
     * @param {Array<{ id: number, x: number, y: number }>} touchPoints
     */
    async send(type, touchPoints) {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
      await page.clock.runFor(17);
    },
    detach: () => cdp.detach()
  };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {boolean} boardFirst
 * @param {boolean} dragging
 */
async function nativeTwoTouch(page, boardFirst, dragging) {
  await setup(page, true);
  // Count the non-primary touches that reach the hold box, to show the
  // second contact really arrived as one.
  await page.locator('#heldPreview').evaluate((hold) => {
    if (!(hold instanceof HTMLElement))
      throw new Error('hold-touch: #heldPreview is not an HTML element');
    hold.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' && !event.isPrimary)
        hold.dataset.secondaryTouches = String(
          Number(hold.dataset.secondaryTouches ?? 0) + 1
        );
    });
  });
  const board = await centerOf(page, '#tetris');
  const hold = await centerOf(page, '#heldPreview');
  const finger = { id: 0, x: board.x, y: board.y };
  const second = { id: 1, x: hold.x, y: hold.y };
  const touch = await nativeTouch(page);
  await touch.send('touchStart', [finger]);
  if (dragging) {
    finger.x += board.box.width / 10;
    finger.y += 15;
    await touch.send('touchMove', [finger]);
  }
  await touch.send('touchStart', [finger, second]);
  if (boardFirst) await touch.send('touchEnd', [finger]);
  const before = await piece(page);
  expect(await held(page)).toBe(false);
  await touch.send('touchEnd', [second]);
  expect(await held(page)).toBe(true);
  await expect(page.locator('#heldPreview')).toHaveAttribute(
    'data-secondary-touches',
    '1'
  );
  const entered = await piece(page);
  expect(entered).toHaveLength(4);
  expect(entered).not.toEqual(before);
  if (!boardFirst) {
    if (dragging) {
      finger.x += board.box.width / 5;
      finger.y += 50;
      await touch.send('touchMove', [finger]);
      expect(await piece(page)).toEqual(entered);
    }
    await touch.send('touchEnd', []);
    expect(await piece(page)).toEqual(entered);
  }
  await touch.send('touchStart', [{ id: 2, x: board.x, y: board.y }]);
  await touch.send('touchEnd', []);
  const turned = await piece(page);
  expect(turned).toHaveLength(4);
  expect(turned).not.toEqual(entered);
  await touch.detach();
}

/** @param {import('@playwright/test').Page} page */
async function nativeControls(page) {
  await setup(page, true);
  const hold = await centerOf(page, '#heldPreview');
  const point = { id: 0, x: hold.x, y: hold.y };
  const away = { id: 0, x: 1, y: 1 };
  const touch = await nativeTouch(page);
  for (const kind of ['cancel', 'release-away', 'leave-return']) {
    await touch.send('touchStart', [point]);
    if (kind === 'cancel') await touch.send('touchCancel', []);
    else {
      await touch.send('touchMove', [away]);
      if (kind === 'leave-return') await touch.send('touchMove', [point]);
      await touch.send('touchEnd', []);
    }
    expect(await held(page), kind).toBe(false);
  }
  await touch.send('touchStart', [point]);
  await touch.send('touchEnd', []);
  expect(await held(page)).toBe(true);
  await touch.detach();
}

/**
 * The project's use options without browserName, keeping every defined entry.
 * @param {import('@playwright/test').TestInfo} testInfo
 */
function nativeContextOptions(testInfo) {
  const options = {};
  for (const [key, value] of Object.entries(testInfo.project.use))
    if (key !== 'browserName' && value !== undefined)
      Reflect.set(options, key, value);
  return options;
}
