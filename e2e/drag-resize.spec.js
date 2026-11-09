// Proposed NEW e2e/drag-resize.spec.js. Privately formatted, not applied or run.
import { test, expect } from './fixtures.js';
import {
  PieceColors,
  cellsOf,
  continueSavedGame,
  savedGame
} from './helpers.js';
const minColumn = (cells) => Math.min(...cells.map(([, column]) => column));
const shapeOf = (cells) => {
  const row = Math.min(...cells.map(([r]) => r));
  const column = minColumn(cells);
  return JSON.stringify(cells.map(([r, c]) => [r - row, c - column]).sort());
};
async function playSaved(page, options) {
  await continueSavedGame(page, savedGame(options));
  await page.keyboard.press('KeyP');
}

for (const resize of ['shrink', 'grow']) {
  for (const ending of ['pointerup', 'pointercancel']) {
    test(`board CSS ${resize} cancels a drag until matching ${ending} [INP-5]`, async ({
      page
    }) => {
      await page.clock.install();
      await playSaved(page, {
        piece: PieceColors.purple,
        position: { row: 5, column: 3 }
      });
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      await page.clock.runFor(17);
      const initial = await cellsOf(page, PieceColors.purple);
      expect(initial).toHaveLength(4);
      const oldWidth = await page
        .locator('#tetris')
        .evaluate((canvas) => canvas.getBoundingClientRect().width);
      const desiredWidth = oldWidth * (resize === 'shrink' ? 0.75 : 1.25);
      const send = (type, id, dx, dy) =>
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
      await page.clock.runFor(17);
      expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);

      await page.locator('#tetris').evaluate((canvas, width) => {
        canvas.style.setProperty('width', `${width}px`, 'important');
        canvas.style.setProperty('height', `${width * 2}px`, 'important');
      }, desiredWidth);
      // Advance rendering until the actual canvas bitmap reflects observed CSS
      // size. This witnesses delivery to the game's ResizeObserver, not a sleep.
      await expect
        .poll(async () => {
          await page.clock.runFor(17);
          return page
            .locator('#tetris')
            .evaluate(
              (canvas) =>
                Math.abs(
                  canvas.width / devicePixelRatio -
                    canvas.getBoundingClientRect().width
                ) < 1
            );
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
      await page.clock.runFor(17);
      expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);

      // Ownership was released by the matching lift. New gestures use new size.
      await send('pointerdown', 73, 0, 0);
      await send('pointermove', 73, (actualWidth / 10) * 0.6, 0);
      await send('pointerup', 73, (actualWidth / 10) * 0.6, 0);
      await page.clock.runFor(17);
      const moved = await cellsOf(page, PieceColors.purple);
      expect(shapeOf(moved)).toBe(shapeOf(initial));
      expect(minColumn(moved)).toBe(minColumn(initial) + 1);
    });
  }
}

async function syntheticDrag(page) {
  await page.locator('#tetris').evaluate((canvas) => {
    canvas.setPointerCapture = () => {};
  });
  const origin = await page.locator('#tetris').boundingBox();
  const cell = origin.width / 10;
  return {
    cell,
    send: (type, dx, dy = 0) =>
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

async function pausedClockPiece(page) {
  await page.clock.install();
  await playSaved(page, {
    piece: PieceColors.purple,
    position: { row: 5, column: 3 }
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.runFor(17);
  const cells = await cellsOf(page, PieceColors.purple);
  expect(cells).toHaveLength(4);
  return cells;
}

for (const change of ['preview CSS size', 'pixel density']) {
  test(`${change} alone preserves the active board drag [INP-5] [DSP-2]`, async ({
    page
  }) => {
    if (change === 'pixel density') {
      await page.addInitScript(() => {
        const original = window.matchMedia.bind(window);
        const resolutionListeners = [];
        window.matchMedia = (query) => {
          const result = original(query);
          if (query.startsWith('(resolution:')) {
            const add = result.addEventListener.bind(result);
            result.addEventListener = (type, listener, options) => {
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
          for (const listener of resolutionListeners.splice(0))
            listener(new Event('change'));
        };
      });
    }
    const initial = await pausedClockPiece(page);
    const drag = await syntheticDrag(page);
    await drag.send('pointerdown', 0);
    await drag.send('pointermove', drag.cell * 0.4);
    await page.clock.runFor(17);
    expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);
    const oldBitmap = await page.locator('#tetris').evaluate((c) => c.width);
    if (change === 'preview CSS size') {
      const before = await page
        .locator('#heldPreview')
        .evaluate((c) => c.width);
      await page.locator('#heldPreview').evaluate((c) => {
        c.style.setProperty('width', '77px', 'important');
        c.style.setProperty('height', '77px', 'important');
      });
      await expect
        .poll(async () => {
          await page.clock.runFor(17);
          return page.locator('#heldPreview').evaluate((c) => c.width);
        })
        .not.toBe(before);
      expect(await page.locator('#tetris').evaluate((c) => c.width)).toBe(
        oldBitmap
      );
    } else {
      await page.evaluate(() => window.testDensityChange());
      await expect
        .poll(() => page.locator('#tetris').evaluate((c) => c.width))
        .not.toBe(oldBitmap);
    }
    await drag.send('pointermove', drag.cell * 0.6);
    await drag.send('pointerup', drag.cell * 0.6);
    await page.clock.runFor(17);
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
  await page.clock.runFor(17);
  const blocked = await cellsOf(page, PieceColors.purple);
  expect(minColumn(blocked)).toBe(0);
  const oldBitmap = await page.locator('#tetris').evaluate((c) => c.width);
  await page.locator('#tetris').evaluate((c) => {
    c.style.setProperty('width', '220px', 'important');
    c.style.setProperty('height', '440px', 'important');
  });
  await expect
    .poll(async () => {
      await page.clock.runFor(17);
      return page.locator('#tetris').evaluate((c) => c.width);
    })
    .not.toBe(oldBitmap);
  await drag.send('pointermove', drag.cell * 20);
  await drag.send('pointerup', drag.cell * 20);
  await page.clock.runFor(17);
  expect(await cellsOf(page, PieceColors.purple)).toEqual(blocked);
  const fresh = await syntheticDrag(page);
  await fresh.send('pointerdown', 0);
  await fresh.send('pointermove', fresh.cell * 0.6);
  await fresh.send('pointerup', fresh.cell * 0.6);
  await page.clock.runFor(17);
  expect(minColumn(await cellsOf(page, PieceColors.purple))).toBe(1);
});

test('a board resize alone consumes an otherwise still tap [INP-5]', async ({
  page
}) => {
  const initial = await pausedClockPiece(page);
  const drag = await syntheticDrag(page);
  await drag.send('pointerdown', 0);
  const oldBitmap = await page.locator('#tetris').evaluate((c) => c.width);
  await page.locator('#tetris').evaluate((c) => {
    c.style.setProperty('width', '220px', 'important');
    c.style.setProperty('height', '440px', 'important');
  });
  await expect
    .poll(async () => {
      await page.clock.runFor(17);
      return page.locator('#tetris').evaluate((c) => c.width);
    })
    .not.toBe(oldBitmap);
  await drag.send('pointerup', 0);
  await page.clock.runFor(17);
  expect(await cellsOf(page, PieceColors.purple)).toEqual(initial);
});
