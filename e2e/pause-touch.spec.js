import { test, expect } from './fixtures.js';
import {
  PieceColors,
  cellsOf,
  continueSavedGame,
  savedGame
} from './helpers.js';

/**
 * @param {import('@playwright/test').Page} page
 * @param {boolean} [frameDriven]
 */
async function setup(page, frameDriven = false) {
  await page.clock.install();
  const saved = savedGame({
    piece: PieceColors.purple,
    position: { row: 5, column: 3 }
  });
  if (frameDriven) {
    await page.addInitScript((values) => {
      for (const [key, value] of Object.entries(values))
        localStorage.setItem(key, String(value));
    }, saved);
    await page.goto('/');
    await page.waitForFunction(() =>
      ['ready', 'blocked', 'error'].includes(
        document.documentElement.dataset.tabAdmission ?? ''
      )
    );
    await page.keyboard.press('KeyC');
    await page.clock.runFor(17);
    try {
      await expect(page.locator('#playPauseButton')).toHaveAttribute(
        'aria-label',
        'Resume'
      );
    } catch (error) {
      console.log(
        'pause-touch setup state:',
        await page.evaluate(() => ({
          tabAdmission: document.documentElement.dataset.tabAdmission ?? '',
          pauseLabel: document
            .getElementById('playPauseButton')
            ?.getAttribute('aria-label'),
          savedKeys: Object.keys(localStorage)
        }))
      );
      throw error;
    }
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

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} type
 */
async function touchPause(page, type, options = {}) {
  await page.locator('#playPauseButton').evaluate(
    (button, { type, options }) => {
      const box = button.getBoundingClientRect();
      button.dispatchEvent(
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
    test(`synthetic secondary touch Pause with mouse board contact acts once, ${boardFirst ? 'board' : 'Pause'} lifts first, ${dragging ? 'dragging' : 'resting'} [INP-5]`, async ({
      page,
      browserName,
      browser
    }, testInfo) => {
      await setup(page);
      const board = await page.locator('#tetris').boundingBox();
      if (!board) throw new Error('pause-touch: #tetris has no bounding box');
      const x = board.x + board.width / 2;
      const y = board.y + board.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      if (dragging) await page.mouse.move(x + board.width / 10, y + 15);
      await touchPause(page, 'pointerdown');
      if (boardFirst) await page.mouse.up();
      await touchPause(page, 'pointerup');
      await expect(page.locator('#playPauseButton')).toHaveAttribute(
        'aria-label',
        'Resume'
      );
      // A compatibility click for the handled touch must not resume the game.
      await touchPause(page, 'click');
      await expect(page.locator('#playPauseButton')).toHaveAttribute(
        'aria-label',
        'Resume'
      );
      await page.keyboard.press('KeyP');
      await page.clock.runFor(17);
      const before = await cellsOf(page, PieceColors.purple);
      if (!boardFirst) {
        await page.mouse.move(x + board.width / 5, y + 50);
        await page.mouse.up();
        await page.clock.runFor(17);
        expect(await cellsOf(page, PieceColors.purple)).toEqual(before);
      }
      // A fresh board gesture works after the old contact ends.
      await page.mouse.click(x, y);
      await page.clock.runFor(17);
      expect(await cellsOf(page, PieceColors.purple)).not.toEqual(before);
      if (browserName === 'chromium') {
        const contextOptions = nativeContextOptions(testInfo);
        const nativeContext = await browser.newContext(contextOptions);
        const nativePage = await nativeContext.newPage();
        try {
          await nativeTwoTouch(nativePage, boardFirst, dragging);
        } finally {
          await nativeContext.close();
        }
      }
    });
  }
}

test('synthetic secondary touch Pause ignores canceled and leave-return taps but keeps independent activations [INP-5]', async ({
  page,
  browserName,
  browser
}, testInfo) => {
  await setup(page);
  await touchPause(page, 'pointerdown');
  await touchPause(page, 'pointercancel');
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  await touchPause(page, 'pointerdown');
  await touchPause(page, 'pointermove', { clientX: 0, clientY: 0 });
  await touchPause(page, 'pointerup');
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  await touchPause(page, 'pointerdown');
  await touchPause(page, 'pointerup');
  await touchPause(page, 'click');
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Resume'
  );
  // Mouse clicks and the keyboard pause shortcut remain independent activations.
  await page.locator('#playPauseButton').click();
  await page.clock.runFor(17);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  await page.locator('#playPauseButton').focus();
  await page.keyboard.press('KeyP');
  await page.clock.runFor(17);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Resume'
  );
  await page.locator('#playPauseButton').dispatchEvent('click');
  await page.clock.runFor(17);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  if (browserName === 'chromium') {
    const contextOptions = nativeContextOptions(testInfo);
    const nativeContext = await browser.newContext(contextOptions);
    const nativePage = await nativeContext.newPage();
    try {
      await nativeControls(nativePage);
    } finally {
      await nativeContext.close();
    }
  }
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function recordNative(page) {
  await page.evaluate(() => {
    /** @type {PauseEvent[]} */
    const events = [];
    window.pauseEvents = events;
    window.pauseEventOverflow = 0;
    window.pauseStates = [];
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'click'
    ]) {
      document.addEventListener(
        type,
        (event) => {
          if (events.length >= 64) {
            window.pauseEventOverflow = (window.pauseEventOverflow ?? 0) + 1;
            return;
          }
          /** @type {unknown} */
          const pointerType = Reflect.get(event, 'pointerType');
          /** @type {unknown} */
          const pointerId = Reflect.get(event, 'pointerId');
          /** @type {unknown} */
          const isPrimary = Reflect.get(event, 'isPrimary');
          const targetId =
            event.target instanceof Element ? event.target.id : '';
          const button = document.getElementById('playPauseButton');
          if (!button)
            throw new Error('pause-touch: #playPauseButton not found');
          const label = button.getAttribute('aria-label');
          events.push({
            type,
            constructor:
              event instanceof PointerEvent
                ? 'PointerEvent'
                : event instanceof MouseEvent
                  ? 'MouseEvent'
                  : 'other',
            pointerType:
              typeof pointerType === 'string' &&
              ['touch', 'mouse', 'pen'].includes(pointerType)
                ? pointerType
                : 'other',
            pointerId:
              typeof pointerId === 'number' && Number.isFinite(pointerId)
                ? pointerId
                : null,
            isPrimary: typeof isPrimary === 'boolean' ? isPrimary : null,
            target: ['playPauseButton', 'tetris'].includes(targetId)
              ? targetId
              : 'other',
            stateAtCapture: ['Pause', 'Resume'].includes(String(label))
              ? label
              : 'other'
          });
        },
        true
      );
    }
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {boolean} boardFirst
 * @param {boolean} dragging
 */
async function nativeTwoTouch(page, boardFirst, dragging) {
  await setup(page, true);
  await recordNative(page);
  const board = await page.locator('#tetris').boundingBox();
  const button = await page.locator('#playPauseButton').boundingBox();
  if (!board) throw new Error('pause-touch: #tetris has no bounding box');
  if (!button)
    throw new Error('pause-touch: #playPauseButton has no bounding box');
  const finger = {
    id: 0,
    x: board.x + board.width / 2,
    y: board.y + board.height / 2
  };
  const pause = {
    id: 1,
    x: button.x + button.width / 2,
    y: button.y + button.height / 2
  };
  const cdp = await page.context().newCDPSession(page);
  /**
   * @param {'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel'} type
   * @param {Array<{ id: number, x: number, y: number }>} touchPoints
   */
  const send = async (type, touchPoints) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await page.clock.runFor(17);
    await page.evaluate((type) => {
      const states = window.pauseStates;
      if (!states)
        throw new Error('pause-touch: pauseStates was not installed');
      if (states.length >= 32) return;
      const button = document.getElementById('playPauseButton');
      if (!button) throw new Error('pause-touch: #playPauseButton not found');
      const label = button.getAttribute('aria-label');
      states.push({
        dispatch: type,
        label: ['Pause', 'Resume'].includes(String(label)) ? label : 'other'
      });
    }, type);
  };
  await send('touchStart', [finger]);
  if (dragging) {
    finger.x += board.width / 10;
    finger.y += 15;
    await send('touchMove', [finger]);
  }
  await send('touchStart', [finger, pause]);
  if (boardFirst) await send('touchEnd', [finger]);
  await send('touchEnd', [pause]);
  try {
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Resume'
    );
  } catch (error) {
    let evidence = null;
    try {
      evidence = await page.evaluate(() => ({
        events: window.pauseEvents,
        overflow: window.pauseEventOverflow,
        statesAfterDispatch: window.pauseStates
      }));
    } catch {
      /* Diagnostic reads must not replace the original assertion. */
    }
    try {
      console.log('Native Pause failure evidence:', JSON.stringify(evidence));
    } catch {
      /* Diagnostic logging is best-effort. */
    }
    throw error;
  }
  const events = await page.evaluate(() => {
    const recorded = window.pauseEvents;
    if (!recorded)
      throw new Error('pause-touch: pauseEvents was not installed');
    return recorded;
  });
  console.log(
    'Native two-touch events',
    JSON.stringify({ boardFirst, dragging, events })
  );
  expect(
    events.some(
      (event) =>
        event.type === 'pointerdown' &&
        event.target === 'playPauseButton' &&
        event.isPrimary === false
    )
  ).toBe(true);
  await page.keyboard.press('KeyP');
  await page.clock.runFor(17);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  const before = await cellsOf(page, PieceColors.purple);
  if (!boardFirst) {
    finger.x += board.width / 5;
    finger.y += 50;
    await send('touchMove', [finger]);
    expect(await cellsOf(page, PieceColors.purple)).toEqual(before);
    await send('touchEnd', []);
    expect(await cellsOf(page, PieceColors.purple)).toEqual(before);
  }
  await send('touchStart', [
    { id: 2, x: board.x + board.width / 2, y: board.y + board.height / 2 }
  ]);
  await send('touchEnd', []);
  expect(await cellsOf(page, PieceColors.purple)).not.toEqual(before);
  await cdp.detach();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function nativeControls(page) {
  await setup(page, true);
  await recordNative(page);
  const box = await page.locator('#playPauseButton').boundingBox();
  if (!box)
    throw new Error('pause-touch: #playPauseButton has no bounding box');
  const point = { id: 0, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const away = { ...point, x: 1, y: 1 };
  const cdp = await page.context().newCDPSession(page);
  /**
   * @param {'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel'} type
   * @param {Array<{ id: number, x: number, y: number }>} touchPoints
   */
  const send = async (type, touchPoints) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await page.clock.runFor(17);
    await page.evaluate((type) => {
      const states = window.pauseStates;
      if (!states)
        throw new Error('pause-touch: pauseStates was not installed');
      if (states.length >= 32) return;
      const button = document.getElementById('playPauseButton');
      if (!button) throw new Error('pause-touch: #playPauseButton not found');
      const label = button.getAttribute('aria-label');
      states.push({
        dispatch: type,
        label: ['Pause', 'Resume'].includes(String(label)) ? label : 'other'
      });
    }, type);
  };
  for (const kind of ['cancel', 'release-away', 'leave-return']) {
    await send('touchStart', [point]);
    if (kind === 'cancel') await send('touchCancel', []);
    else {
      await send('touchMove', [away]);
      if (kind === 'leave-return') await send('touchMove', [point]);
      await send('touchEnd', []);
    }
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Pause'
    );
    console.log(
      'Native negative control',
      kind,
      JSON.stringify(await page.evaluate(() => window.pauseEvents))
    );
  }
  await send('touchStart', [point]);
  await send('touchEnd', []);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Resume'
  );
  await send('touchStart', [point]);
  await send('touchEnd', []);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  console.log(
    'Native single-touch Pause and Resume',
    JSON.stringify(await page.evaluate(() => window.pauseEvents))
  );
  await cdp.detach();
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
