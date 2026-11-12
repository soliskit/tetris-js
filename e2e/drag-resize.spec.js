// Private fixture v3 proposal. Not formatted, applied or run.
import { test, expect } from './fixtures.js';
import {
  PieceColors,
  cellsOf,
  canvasWidth,
  continueSavedGame,
  savedGame
} from './helpers.js';
/** @type {WeakMap<import('@playwright/test').Page, string[]>} */
const drawingErrors = new WeakMap();
test.beforeEach(({ page }) => {
  /** @type {string[]} */
  const errors = [];
  drawingErrors.set(page, errors);
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /^(Tetris drawing error, retrying next frame:|Tetris draw request error:)/.test(
        message.text()
      )
    )
      errors.push(message.text());
  });
});
test.afterEach(async ({ page }, testInfo) => {
  const present = drawingErrors.has(page);
  const errors = drawingErrors.get(page);
  // Native stdout is retained by the existing list/github CI reporter.
  console.log(
    'DRAG-RESIZE-DRAWING-EVIDENCE ' +
      JSON.stringify({
        project: testInfo.project.name,
        titlePath: testInfo.titlePath,
        collectorPresent: present,
        errors: errors ?? null
      })
  );
  // Missing collection stays incomplete, never an observed empty array.
  await testInfo.attach('app-drawing-errors', {
    body: JSON.stringify({ collectorPresent: present, errors: errors ?? null }),
    contentType: 'application/json'
  });
  expect(present).toBe(true);
  expect(Array.isArray(errors)).toBe(true);
  expect(errors).toEqual([]);
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function boardBitmapSnapshot(page) {
  return page.locator('#tetris').evaluate((c) => {
    if (!(c instanceof HTMLCanvasElement))
      throw new Error('drag-resize: #tetris is not a canvas');
    const r = c.getBoundingClientRect();
    const style = getComputedStyle(c);
    const width =
      r.width -
      parseFloat(style.borderLeftWidth) -
      parseFloat(style.borderRightWidth) -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const height =
      r.height -
      parseFloat(style.borderTopWidth) -
      parseFloat(style.borderBottomWidth) -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom);
    const expectedWidth = Math.round(width * devicePixelRatio);
    const expectedHeight = Math.round(height * devicePixelRatio);
    return {
      rect: [r.x, r.y, r.width, r.height],
      content: [width, height],
      ratio: devicePixelRatio,
      bitmap: [c.width, c.height],
      expectedBitmap: [expectedWidth, expectedHeight],
      sized:
        width > 0 &&
        height > 0 &&
        c.width === expectedWidth &&
        c.height === expectedHeight
    };
  });
}

/** @typedef {Array<[number, number]>} Cells */
/** @param {Cells} cells */
const minColumn = (cells) => Math.min(...cells.map(([, column]) => column));
/** @param {Cells} cells */
const shapeOf = (cells) => {
  const row = Math.min(...cells.map(([r]) => r));
  const column = minColumn(cells);
  return JSON.stringify(cells.map(([r, c]) => [r - row, c - column]).sort());
};
// Each case uses score0/level1: gravity first runs at700ms. Stop setup
// inconclusively before34playing frames(578ms), never poll through gravity.
/** @type {WeakMap<import('@playwright/test').Page, number>} */
const playingFrames = new WeakMap();
/**
 * @param {import('@playwright/test').Page} page
 */
async function advancePlayingFrame(page) {
  const frames = (playingFrames.get(page) ?? 0) + 1;
  if (frames > 34)
    throw new Error('Fixture exceeded its pre-gravity frame budget');
  playingFrames.set(page, frames);
  await page.clock.runFor(17);
}

test('the initial board bitmap reaches its native CSS size [DSP-2]', async ({
  page
}) => {
  await continueSavedGame(
    page,
    savedGame({
      piece: PieceColors.purple,
      position: { row: 5, column: 3 }
    })
  );
  await expect
    .poll(async () => (await boardBitmapSnapshot(page)).sized, {
      timeout: 5000,
      intervals: [50, 100, 250]
    })
    .toBe(true);
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function pausedClockPiece(page) {
  await page.clock.install();
  await continueSavedGame(
    page,
    savedGame({
      piece: PieceColors.purple,
      position: { row: 5, column: 3 }
    })
  );
  // The game is paused. Native resize delivery is a startup prerequisite,
  // not something advancing mocked animation frames can certify.
  await expect
    .poll(async () => (await boardBitmapSnapshot(page)).sized, {
      timeout: 5000,
      intervals: [50, 100, 250]
    })
    .toBe(true);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  // Seeded T spawn at row5/column3, from tetrominoFactory's .X./XXX.
  /** @type {Cells} */
  const expected = [
    [5, 4],
    [6, 3],
    [6, 4],
    [6, 5]
  ];
  /** @type {Array<[number, number]>} */
  let cells = [];
  let sized = false;
  const sizingSamples = [];
  for (let frame = 0; frame < 20; frame++) {
    await page.clock.runFor(17);
    const sample = await boardBitmapSnapshot(page);
    sizingSamples.push({ frame, ...sample });
    sized = sample.sized;
    if (!sized) continue;
    cells = await cellsOf(page, PieceColors.purple);
    if (JSON.stringify(cells) === JSON.stringify(expected)) break;
  }
  if (!sized || JSON.stringify(cells) !== JSON.stringify(expected))
    console.log(
      'DRAG-RESIZE-SETUP-EVIDENCE ' +
        JSON.stringify({
          project: test.info().project.name,
          titlePath: test.info().titlePath,
          sizingSamples,
          cells,
          expected
        })
    );
  expect(sized).toBe(true);
  expect(cells).toEqual(expected);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Resume'
  );
  await page.keyboard.press('KeyP');
  await advancePlayingFrame(page);
  await expect(page.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Pause'
  );
  expect(await cellsOf(page, PieceColors.purple)).toEqual(expected);
  return expected;
}

for (const resize of ['shrink', 'grow']) {
  for (const ending of ['pointerup', 'pointercancel']) {
    test(`board CSS ${resize} cancels a drag until matching ${ending} [INP-5]`, async ({
      page
    }) => {
      const initial = await pausedClockPiece(page);
      const oldWidth = await page
        .locator('#tetris')
        .evaluate((canvas) => canvas.getBoundingClientRect().width);
      const desiredWidth = oldWidth * (resize === 'shrink' ? 0.75 : 1.25);
      const send = (
        /** @type {string} */ type,
        /** @type {number} */ id,
        /** @type {number} */ dx,
        /** @type {number} */ dy
      ) =>
        page.locator('#tetris').evaluate(
          (canvas, args) => {
            const box = canvas.getBoundingClientRect();
            canvas.dispatchEvent(
              new PointerEvent(args.type, {
                bubbles: true,
                pointerId: args.id,
                pointerType: 'touch',
                isPrimary: args.id !== 72,
                button: 0,
                clientX: box.left + 30 + args.dx,
                clientY: box.top + 80 + args.dy
              })
            );
          },
          { type, id, dx, dy }
        );

      // Synthetic pointers cannot be captured natively. The test suppresses
      // only capture calls; it does not claim native capture/multitouch proof.
      await page.locator('#tetris').evaluate((canvas) => {
        canvas.setPointerCapture = () => {};
      });
      await send('pointerdown', 71, 0, 0);
      await send('pointermove', 71, (0.4 * oldWidth) / 10, 0);
      await advancePlayingFrame(page);
      expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);

      await page.locator('#tetris').evaluate((canvas, width) => {
        canvas.style.setProperty('width', `${String(width)}px`, 'important');
        canvas.style.setProperty(
          'height',
          `${String(width * 2)}px`,
          'important'
        );
      }, desiredWidth);
      // Advance rendering until the actual canvas bitmap reflects observed CSS
      // size. This witnesses delivery to the game's ResizeObserver, not a sleep.
      await expect
        .poll(async () => {
          await advancePlayingFrame(page);
          return page.locator('#tetris').evaluate((canvas) => {
            if (!(canvas instanceof HTMLCanvasElement))
              throw new Error('drag-resize: #tetris is not a canvas');
            return (
              Math.abs(
                canvas.width / devicePixelRatio -
                  canvas.getBoundingClientRect().width
              ) < 1
            );
          });
        })
        .toBe(true);
      const actualWidth = await page
        .locator('#tetris')
        .evaluate((canvas) => canvas.getBoundingClientRect().width);
      expect(Math.abs(actualWidth - oldWidth)).toBeGreaterThan(1);

      // The original held pointer and a second pointer cannot move the piece.
      await send('pointermove', 71, oldWidth, oldWidth);
      await send('pointerdown', 72, 0, 0);
      await send('pointermove', 72, actualWidth, actualWidth);
      await send('pointerup', 72, actualWidth, actualWidth);
      await send(ending, 71, oldWidth, oldWidth);
      await advancePlayingFrame(page);
      expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);

      // Ownership was released by the matching lift. New gestures use new size.
      await send('pointerdown', 73, 0, 0);
      await send('pointermove', 73, (actualWidth / 10) * 0.6, 0);
      await send('pointerup', 73, (actualWidth / 10) * 0.6, 0);
      await advancePlayingFrame(page);
      const moved = await cellsOf(page, PieceColors.purple);
      expect(shapeOf(moved)).toBe(shapeOf(initial));
      expect(minColumn(moved)).toBe(minColumn(initial) + 1);
    });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function syntheticDrag(page) {
  await page.locator('#tetris').evaluate((canvas) => {
    canvas.setPointerCapture = () => {};
  });
  const origin = await page.locator('#tetris').boundingBox();
  if (!origin) throw new Error('drag-resize: #tetris has no bounding box');
  const cell = origin.width / 10;
  return {
    cell,
    send: (/** @type {string} */ type, /** @type {number} */ dx, dy = 0) =>
      page.locator('#tetris').evaluate(
        (canvas, a) => {
          canvas.dispatchEvent(
            new PointerEvent(a.type, {
              bubbles: true,
              pointerId: 81,
              pointerType: 'touch',
              isPrimary: true,
              button: 0,
              clientX: a.x,
              clientY: a.y
            })
          );
        },
        { type, x: origin.x + 30 + dx, y: origin.y + 80 + dy }
      )
  };
}

for (const change of ['preview CSS size', 'pixel density']) {
  test(`${change} alone preserves the active board drag [INP-5] [DSP-2]`, async ({
    page
  }) => {
    if (change === 'pixel density') {
      await page.addInitScript(() => {
        const original = window.matchMedia.bind(window);
        /** @type {EventListenerOrEventListenerObject[]} */
        const resolutionListeners = [];
        window.matchMedia = (query) => {
          const result = original(query);
          if (query.startsWith('(resolution:')) {
            const add = result.addEventListener.bind(result);
            result.addEventListener = (
              /** @type {string} */ type,
              /** @type {EventListenerOrEventListenerObject} */ listener,
              /** @type {boolean | AddEventListenerOptions | undefined} */ options
            ) => {
              if (type === 'change') resolutionListeners.push(listener);
              else add(type, listener, options);
            };
          }
          return result;
        };
        window.testDensityChange = () => {
          const before = devicePixelRatio;
          Object.defineProperty(window, 'devicePixelRatio', {
            configurable: true,
            value: before + 1
          });
          for (const listener of resolutionListeners.splice(0)) {
            if (typeof listener === 'function') listener(new Event('change'));
            else listener.handleEvent(new Event('change'));
          }
        };
      });
    }
    const initial = await pausedClockPiece(page);
    const drag = await syntheticDrag(page);
    await drag.send('pointerdown', 0);
    await drag.send('pointermove', drag.cell * 0.4);
    await advancePlayingFrame(page);
    expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);
    const oldBitmap = await page.locator('#tetris').evaluate(canvasWidth);
    if (change === 'preview CSS size') {
      const boardBefore = await page.locator('#tetris').evaluate((c) => {
        if (!(c instanceof HTMLCanvasElement))
          throw new Error('drag-resize: #tetris is not a canvas');
        const r = c.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height, c.width, c.height];
      });
      const nextBefore = await page.locator('#next0').boundingBox();
      if (!nextBefore)
        throw new Error('drag-resize: #next0 has no bounding box');
      expect(nextBefore.width).toBeGreaterThan(0);
      expect(nextBefore.height).toBeGreaterThan(0);
      const rowBefore = await page
        .locator('.previews')
        .evaluate((c) => c.getBoundingClientRect().height);
      const before = await page.locator('#heldPreview').evaluate(canvasWidth);
      await page.locator('#heldPreview').evaluate((c) => {
        c.style.setProperty('width', '43px', 'important');
        c.style.setProperty('height', '43px', 'important');
      });
      await expect
        .poll(async () => {
          await advancePlayingFrame(page);
          return page.locator('#heldPreview').evaluate(canvasWidth);
        })
        .not.toBe(before);
      // next0 remains60px tall, preserving the preview row and board size.
      const boardAfter = await page.locator('#tetris').evaluate((c) => {
        if (!(c instanceof HTMLCanvasElement))
          throw new Error('drag-resize: #tetris is not a canvas');
        const r = c.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height, c.width, c.height];
      });
      expect(boardAfter).toEqual(boardBefore);
      const nextAfter = await page.locator('#next0').boundingBox();
      expect(nextAfter).not.toBeNull();
      expect(nextAfter).toEqual(nextBefore);
      expect(
        await page
          .locator('.previews')
          .evaluate((c) => c.getBoundingClientRect().height)
      ).toBe(rowBefore);
    } else {
      await page.evaluate(() => {
        const change = window.testDensityChange;
        if (!change)
          throw new Error('drag-resize: testDensityChange was not installed');
        change();
      });
      await expect
        .poll(() => page.locator('#tetris').evaluate(canvasWidth))
        .not.toBe(oldBitmap);
    }
    await drag.send('pointermove', drag.cell * 0.6);
    await drag.send('pointerup', drag.cell * 0.6);
    await advancePlayingFrame(page);
    const moved = await cellsOf(page, PieceColors.purple);
    expect(shapeOf(moved)).toBe(shapeOf(initial));
    expect(minColumn(moved)).toBe(minColumn(initial) + 1);
  });
}

test('board resize cancels a wall-blocked drag without banked travel [INP-5]', async ({
  page
}) => {
  await pausedClockPiece(page);
  const drag = await syntheticDrag(page);
  await drag.send('pointerdown', 0);
  await drag.send('pointermove', -drag.cell * 20);
  await advancePlayingFrame(page);
  const blocked = await cellsOf(page, PieceColors.purple);
  expect(minColumn(blocked)).toBe(0);
  const oldBitmap = await page.locator('#tetris').evaluate(canvasWidth);
  await page.locator('#tetris').evaluate((c) => {
    c.style.setProperty('width', '220px', 'important');
    c.style.setProperty('height', '440px', 'important');
  });
  await expect
    .poll(async () => {
      await advancePlayingFrame(page);
      return page.locator('#tetris').evaluate(canvasWidth);
    })
    .not.toBe(oldBitmap);
  await drag.send('pointermove', drag.cell * 20);
  await drag.send('pointerup', drag.cell * 20);
  await advancePlayingFrame(page);
  expect(await cellsOf(page, PieceColors.purple)).toEqual(blocked);
  const fresh = await syntheticDrag(page);
  await fresh.send('pointerdown', 0);
  await fresh.send('pointermove', fresh.cell * 0.6);
  await fresh.send('pointerup', fresh.cell * 0.6);
  await advancePlayingFrame(page);
  expect(minColumn(await cellsOf(page, PieceColors.purple))).toBe(1);
});

test('a board resize alone consumes an otherwise still tap [INP-5]', async ({
  page
}) => {
  const initial = await pausedClockPiece(page);
  const drag = await syntheticDrag(page);
  await drag.send('pointerdown', 0);
  const oldBitmap = await page.locator('#tetris').evaluate(canvasWidth);
  await page.locator('#tetris').evaluate((c) => {
    c.style.setProperty('width', '220px', 'important');
    c.style.setProperty('height', '440px', 'important');
  });
  await expect
    .poll(async () => {
      await advancePlayingFrame(page);
      return page.locator('#tetris').evaluate(canvasWidth);
    })
    .not.toBe(oldBitmap);
  await drag.send('pointerup', 0);
  await advancePlayingFrame(page);
  expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);
});
