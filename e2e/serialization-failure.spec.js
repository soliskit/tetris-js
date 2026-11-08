// Route interception exposes the existing private manager only in this test.
// The injected JSON failure is not an ordinary-play or physical-device claim.
import { test, expect } from './fixtures.js';

for (const refusedWithdrawal of [false, true]) {
  test(`serialization failure on page Pause shows the internal-error notice with withdrawal refused=${refusedWithdrawal} [SAF-3] [STA-4] [SAF-2]`, async ({
    page
  }, testInfo) => {
    const reports = [];
    page.on('console', (message) => {
      if (message.type() === 'error') reports.push(message.text());
    });
    await page.route('**/script.js', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: `${await response.text()}\nwindow.testGame = gameManager;`
      });
    });
    await page.goto('/');
    await page.waitForFunction(() => window.testGame);
    await page.locator('#newGameButton').click();
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Pause'
    );
    // Establish literal earlier engine-written bytes. This is not a claim
    // that their semantic history satisfies B9/B16 or closes F29.
    await page.locator('#playPauseButton').click();
    const before = await page.evaluate(() =>
      localStorage.getItem('tetris.savedGameSession')
    );
    expect(typeof before).toBe('string');
    expect(JSON.parse(JSON.parse(before).position).gameBoard).toHaveLength(20);
    await page.locator('#playPauseButton').click();
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Pause'
    );
    await page.evaluate((refusedWithdrawal) => {
      const original = JSON.stringify;
      const storage = window.testGame.storage;
      window.withdrawalAttempts = 0;
      window.serializerAttempts = 0;
      window.serializerError = new Error(
        'injected session serialization failure'
      );
      JSON.stringify = function (value, ...args) {
        if (
          value &&
          Object.hasOwn(value, 'gameBoard') &&
          Object.hasOwn(value, 'nextTetrominos')
        ) {
          window.serializerAttempts += 1;
          throw window.serializerError;
        }
        return original(value, ...args);
      };
      window.testGame.storage = {
        getItem: (key) => storage.getItem(key),
        setItem: (key, value) => {
          if (
            key === 'tetris.savedGameSession' &&
            JSON.parse(value).available === false
          ) {
            window.withdrawalAttempts += 1;
            if (refusedWithdrawal) throw new Error('withdrawal refused');
          }
          storage.setItem(key, value);
        }
      };
      window.restoreSerializationProviders = () => {
        JSON.stringify = original;
        window.testGame.storage = storage;
      };
    }, refusedWithdrawal);
    try {
      await page.locator('#playPauseButton').click();
      await expect(page.locator('#gameOverMessage')).toBeVisible();
      await expect(page.locator('#gameOverMessage')).toHaveText(
        'The game stopped because of an internal error.'
      );
      await expect(page.locator('#announcer')).toHaveText(
        'The game stopped because of an internal error.'
      );
      const result = await page.evaluate(() => {
        const game = window.testGame;
        return {
          state: game.state,
          gravity: game.gameLoopTask,
          lock: game.lockDelayTask,
          attempts: window.serializerAttempts,
          eligible: game.isSessionSaved,
          withdrawalAttempts: window.withdrawalAttempts,
          storedAvailable: JSON.parse(
            localStorage.getItem('tetris.savedGameSession')
          ).available,
          originalError: game.faults.at(-1)?.error === window.serializerError,
          reason: game.faults.at(-1)?.reason,
          bytes: localStorage.getItem('tetris.savedGameSession')
        };
      });
      expect(result.state).toBe('gameOver');
      expect(result.gravity).toBeNull();
      expect(result.lock).toBeNull();
      expect(result.attempts).toBe(1);
      expect(result.withdrawalAttempts).toBe(1);
      expect(result.storedAvailable).toBe(refusedWithdrawal);
      expect(result.eligible).toBe(false);
      expect(result.originalError).toBe(true);
      expect(result.reason).toBe('unexpected error');
      expect(JSON.parse(result.bytes).position).toBe(
        JSON.parse(before).position
      );
      if (refusedWithdrawal) expect(result.bytes).toBe(before);
      expect(
        reports.some((text) =>
          text.includes(
            'Tetris stopped safely: unexpected error Error: injected session serialization failure'
          )
        )
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath('serialization-fault-notice.png')
      });
    } finally {
      await page.evaluate(() => window.restoreSerializationProviders());
    }
  });
}
