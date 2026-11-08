import {
  parseSavedRecord,
  serializeSavedRecord
} from '../public/game/session.js';
// Fault injection in the real page: corrupted saves, drawing errors and
// blocked storage must never crash or freeze the game.

import { test, expect } from './fixtures.js';
import {
  expectLabel,
  filledCount,
  savedGame,
  PieceColors,
  trackErrors,
  boardCells
} from './helpers.js';

const good = savedGame({ piece: PieceColors.purple });
const broken = {
  'text that is not JSON': '{"gameBoard": [',
  'a save missing its upcoming pieces': serializeSavedRecord(
    JSON.stringify({
      ...JSON.parse(parseSavedRecord(good['tetris.savedGameSession']).position),
      nextTetrominos: undefined
    }),
    true
  ),
  'a save with the piece inside locked blocks': (() => {
    const data = JSON.parse(
      parseSavedRecord(good['tetris.savedGameSession']).position
    );
    data.gameBoard[1][4] = { isFilled: true, color: PieceColors.red };
    return serializeSavedRecord(JSON.stringify(data), true);
  })()
};

for (const [name, text] of Object.entries(broken)) {
  test(`checking ${name} withdraws before offering Continue and New Game still works [SAF-1]`, async ({
    page
  }) => {
    const errors = trackErrors(page);
    await page.addInitScript((value) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('tetris.isSessionSaved', 'true');
      localStorage.setItem('tetris.savedGameSession', value);
    }, text);
    await page.goto('/');
    await expect(page.locator('#continueGameButton')).toHaveCount(1);
    await expect(page.locator('#continueGameButton')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('tetris.isSessionSaved'))
      )
      .toBe('false');
    expect(
      await page.evaluate(() => localStorage.getItem('tetris.savedGameSession'))
    ).toBe(text);
    await expect(page.locator('#newGameButton')).toBeVisible();
    await page.locator('#newGameButton').click();
    await expectLabel(page, 'Pause');
    await expect.poll(() => filledCount(page)).toBe(4);
    expect(errors).toEqual([]);
  });
}

test('an error while drawing does not stop the game from drawing [SAF-5]', async ({
  page
}) => {
  const logged = [];
  page.on('console', (message) => {
    if (message.type() === 'error') logged.push(message.text());
  });
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fill;
    window.failNextDraw = false;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      if (window.failNextDraw) {
        window.failNextDraw = false;
        throw new Error('injected drawing failure');
      }
      return fill.apply(this, args);
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect.poll(() => filledCount(page)).toBe(4);
  await page.evaluate(() => {
    window.failNextDraw = true;
  });
  await page.keyboard.press('Space');
  await expect.poll(() => filledCount(page)).toBe(8);
  expect(
    logged.filter((text) => text.includes('Tetris drawing error'))
  ).toHaveLength(1);
});

test('each unbroken streak of drawing errors is reported once [SAF-5]', async ({
  page
}) => {
  const logged = [];
  page.on('console', (message) => {
    if (message.type() === 'error') logged.push(message.text());
  });
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fill;
    window.drawingFails = false;
    window.failedDraws = 0;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      if (window.drawingFails) {
        window.failedDraws += 1;
        throw new Error('injected drawing failure');
      }
      return fill.apply(this, args);
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect.poll(() => filledCount(page)).toBe(4);
  const streak = async (cells) => {
    await page.evaluate(() => {
      window.failedDraws = 0;
      window.drawingFails = true;
    });
    await page.keyboard.press('Space');
    await expect
      .poll(() => page.evaluate(() => window.failedDraws))
      .toBeGreaterThan(3);
    await page.evaluate(() => {
      window.drawingFails = false;
    });
    await expect.poll(() => filledCount(page)).toBe(cells);
  };
  const reports = () =>
    logged.filter((text) => text.includes('Tetris drawing error'));
  await streak(8);
  expect(reports()).toHaveLength(1);
  await streak(12);
  expect(reports()).toHaveLength(2);
});

test('the game plays normally when storage is blocked [SAF-2]', async ({
  page
}) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expectLabel(page, 'Pause');
  for (let i = 0; i < 3; i++) await page.keyboard.press('Space');
  await expect.poll(() => filledCount(page)).toBe(16);
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Resume');
  await page.keyboard.press('KeyP');
  await expectLabel(page, 'Pause');
  expect(errors).toEqual([]);
});

test.describe('refused draw requests', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'getGamepads', {
        value: () => [],
        configurable: true
      });
      const frame = window.requestAnimationFrame.bind(window);
      const timer = window.setTimeout.bind(window);
      const report = console.error;
      window.refuseFrames = 0;
      window.drawFrameRequests = 0;
      window.retryRequests = 0;
      window.refuseRetryTimer = false;
      window.refuseDrawReport = false;
      window.requestAnimationFrame = (callback) => {
        if ((new Error().stack ?? '').includes('requestDraw')) {
          window.drawFrameRequests++;
          if (window.refuseFrames > 0) {
            window.refuseFrames--;
            throw new Error('injected frame refusal');
          }
        }
        return frame(callback);
      };
      window.setTimeout = (callback, delay, ...args) => {
        if (
          delay === 100 &&
          (new Error().stack ?? '').includes('requestDraw')
        ) {
          window.retryRequests++;
          if (window.refuseRetryTimer)
            throw new Error('injected retry timer refusal');
        }
        return timer(callback, delay, ...args);
      };
      console.error = (...args) => {
        if (window.refuseDrawReport && String(args[0]).includes('draw request'))
          throw new Error('injected report refusal');
        return report(...args);
      };
    });
    await page.goto('/');
    await page.keyboard.press('Enter');
    await page.clock.runFor(32);
    await expect.poll(() => filledCount(page)).toBe(4);
  });

  for (const refusals of [1, 2]) {
    test(`a draw request gets one 100 ms retry after ${refusals} frame refusals [SAF-5]`, async ({
      page
    }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const logged = [];
      page.on('console', (message) => {
        if (message.type() === 'error') logged.push(message.text());
      });
      const before = await boardCells(page);
      const requests = await page.evaluate(() => window.drawFrameRequests);
      await page.evaluate((count) => {
        window.refuseFrames = count;
      }, refusals);
      await page.keyboard.press('KeyD');
      await page.clock.runFor(99);
      expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
        requests + 1
      );
      expect(await boardCells(page)).toEqual(before);
      await page.clock.runFor(1);
      expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
        requests + 2
      );
      await page.clock.runFor(250);
      expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
        requests + 2
      );
      expect(await page.evaluate(() => window.retryRequests)).toBe(1);
      if (refusals === 1) expect(await boardCells(page)).not.toEqual(before);
      else expect(await boardCells(page)).toEqual(before);
      await page.keyboard.press('KeyP');
      await page.clock.runFor(32);
      await expectLabel(page, 'Resume');
      expect(await boardCells(page)).not.toEqual(before);
      expect(
        logged.some(
          (text) =>
            text.includes('draw request') &&
            text.includes('injected frame refusal')
        )
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('a new refused redraw gets one retry after the previous retry was refused [SAF-5]', async ({
    page
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await boardCells(page);
    const requests = await page.evaluate(() => window.drawFrameRequests);
    await page.evaluate(() => {
      window.refuseFrames = 4;
    });
    await page.keyboard.press('KeyD');
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 1
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(1);
    await page.clock.runFor(99);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 1
    );
    await page.clock.runFor(1);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 2
    );
    await page.clock.runFor(250);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 2
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(1);
    await page.keyboard.press('KeyP');
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 3
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(2);
    await page.clock.runFor(99);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 3
    );
    await page.clock.runFor(1);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 4
    );
    await page.clock.runFor(250);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 4
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(2);
    expect(await boardCells(page)).toEqual(before);
    expect(errors).toEqual([]);
  });

  test('a new refused redraw replaces its pending retry [SAF-5]', async ({
    page
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await boardCells(page);
    const requests = await page.evaluate(() => window.drawFrameRequests);
    await page.evaluate(() => {
      window.refuseFrames = 2;
    });
    await page.keyboard.press('KeyD');
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 1
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(1);
    await page.clock.runFor(50);
    await page.keyboard.press('KeyP');
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 2
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(2);
    await page.clock.runFor(50);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 2
    );
    await page.clock.runFor(49);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 2
    );
    await page.clock.runFor(1);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 3
    );
    await page.clock.runFor(250);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 3
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(2);
    await expectLabel(page, 'Resume');
    expect(await boardCells(page)).not.toEqual(before);
    expect(errors).toEqual([]);
  });

  test('a genuine redraw cancels its pending fallback rather than double-drawing [SAF-5] [DSP-3]', async ({
    page
  }) => {
    const requests = await page.evaluate(() => window.drawFrameRequests);
    await page.evaluate(() => {
      window.refuseFrames = 1;
    });
    await page.keyboard.press('KeyD');
    await page.keyboard.press('KeyP');
    await page.clock.runFor(250);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 2
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(1);
    await expectLabel(page, 'Resume');
  });

  test('a refused fallback timer reports once and waits for a genuine redraw [SAF-5]', async ({
    page
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const logged = [];
    page.on('console', (message) => {
      if (message.type() === 'error') logged.push(message.text());
    });
    const before = await boardCells(page);
    const requests = await page.evaluate(() => window.drawFrameRequests);
    await page.evaluate(() => {
      window.refuseFrames = 1;
      window.refuseRetryTimer = true;
    });
    await page.keyboard.press('KeyD');
    await page.clock.runFor(250);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 1
    );
    expect(await page.evaluate(() => window.retryRequests)).toBe(1);
    expect(await boardCells(page)).toEqual(before);
    expect(logged.some((text) => text.includes('injected frame refusal'))).toBe(
      true
    );
    expect(
      logged.some((text) => text.includes('injected retry timer refusal'))
    ).toBe(true);
    await page.evaluate(() => {
      window.refuseRetryTimer = false;
    });
    await page.keyboard.press('KeyP');
    await page.clock.runFor(32);
    await expectLabel(page, 'Resume');
    expect(await boardCells(page)).not.toEqual(before);
    expect(errors).toEqual([]);
  });

  for (const hideAfterFallback of [false, true]) {
    test(`hiding ${hideAfterFallback ? 'after a refused fallback' : 'while retrying'} keeps Pause and redraws on return [SAF-5] [STA-5]`, async ({
      page
    }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.evaluate(() => {
        window.refuseFrames = 2;
      });
      await page.keyboard.press('KeyD');
      if (hideAfterFallback) await page.clock.runFor(100);
      await page.evaluate(() => {
        window.refuseFrames = 10;
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          configurable: true
        });
        Object.defineProperty(document, 'hidden', {
          value: true,
          configurable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      const hiddenRequests = await page.evaluate(
        () => window.drawFrameRequests
      );
      await page.clock.runFor(500);
      expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
        hiddenRequests
      );
      await page.evaluate(() => {
        window.refuseFrames = 0;
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true
        });
        Object.defineProperty(document, 'hidden', {
          value: false,
          configurable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.clock.runFor(32);
      await expectLabel(page, 'Resume');
      await page.clock.runFor(250);
      await expectLabel(page, 'Resume');
      expect(errors).toEqual([]);
    });
  }

  test('a retry callback does not request a frame if hidden before its event is handled [SAF-5] [STA-5]', async ({
    page
  }) => {
    const requests = await page.evaluate(() => window.drawFrameRequests);
    await page.evaluate(() => {
      window.refuseFrames = 1;
    });
    await page.keyboard.press('KeyD');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      });
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true
      });
    });
    await page.clock.runFor(132);
    expect(await page.evaluate(() => window.drawFrameRequests)).toBe(
      requests + 1
    );
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange'))
    );
    await page.clock.runFor(32);
    await expectLabel(page, 'Resume');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true
      });
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(32);
    await expectLabel(page, 'Resume');
  });

  test('a refused error report cannot suppress the one redraw retry [SAF-5]', async ({
    page
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await boardCells(page);
    await page.evaluate(() => {
      window.refuseFrames = 1;
      window.refuseDrawReport = true;
    });
    await page.keyboard.press('KeyD');
    await page.clock.runFor(132);
    expect(await boardCells(page)).not.toEqual(before);
    await expectLabel(page, 'Pause');
    expect(await page.evaluate(() => window.retryRequests)).toBe(1);
    expect(errors).toEqual([]);
  });
});
