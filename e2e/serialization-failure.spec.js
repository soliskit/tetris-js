// Route interception exposes the existing private manager only in this test.
// The injected JSON failure is not an ordinary-play or physical-device claim.
import { test, expect } from './fixtures.js';
import { jsonString, parseJsonObject, present } from '../test/json.js';

for (const refusedWithdrawal of [false, true]) {
  test(`serialization failure on page Pause shows the internal-error notice with withdrawal refused=${String(refusedWithdrawal)} [SAF-3] [STA-4] [SAF-2]`, async ({
    page
  }, testInfo) => {
    /** @type {string[]} */
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
    const beforePosition = jsonString(
      parseJsonObject(present(before)).position
    );
    expect(parseJsonObject(beforePosition).gameBoard).toHaveLength(20);
    await page.locator('#playPauseButton').click();
    await expect(page.locator('#playPauseButton')).toHaveAttribute(
      'aria-label',
      'Pause'
    );
    await page.evaluate((refusedWithdrawal) => {
      const game = window.testGame;
      if (!game) throw new Error('testGame was not exposed');
      /** @type {unknown} */
      const original = Reflect.get(JSON, 'stringify');
      if (typeof original !== 'function')
        throw new Error('JSON.stringify is not a function');
      const storage = game.storage;
      /** @param {string} text */
      const availableOf = (text) => {
        /** @type {unknown} */
        const parsed = JSON.parse(text);
        /** @type {unknown} */
        const available =
          typeof parsed === 'object' && parsed !== null
            ? Reflect.get(parsed, 'available')
            : undefined;
        return available;
      };
      window.withdrawalAttempts = 0;
      window.serializerAttempts = 0;
      const injected = new Error('injected session serialization failure');
      window.serializerError = injected;
      Reflect.set(
        JSON,
        'stringify',
        function (
          /** @type {unknown} */ value,
          /** @type {unknown[]} */ ...args
        ) {
          // Original gate was `value && Object.hasOwn(value, ...)`: null and
          // other falsy values skip; objects and functions are inspected;
          // other primitives box to objects without these own keys.
          if (
            ((typeof value === 'object' && value !== null) ||
              typeof value === 'function') &&
            Object.hasOwn(value, 'gameBoard') &&
            Object.hasOwn(value, 'nextTetrominos')
          ) {
            window.serializerAttempts = (window.serializerAttempts ?? 0) + 1;
            throw injected;
          }
          /** @type {unknown} */
          const result = Reflect.apply(original, JSON, [value, ...args]);
          return result;
        }
      );
      game.storage = {
        getItem: (key) => storage.getItem(key),
        setItem: (key, value) => {
          if (
            key === 'tetris.savedGameSession' &&
            availableOf(value) === false
          ) {
            window.withdrawalAttempts = (window.withdrawalAttempts ?? 0) + 1;
            if (refusedWithdrawal) throw new Error('withdrawal refused');
          }
          storage.setItem(key, value);
        }
      };
      window.restoreSerializationProviders = () => {
        Reflect.set(JSON, 'stringify', original);
        game.storage = storage;
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
        if (!game) throw new Error('testGame was not exposed');
        const storedAvailable = () => {
          const text = localStorage.getItem('tetris.savedGameSession');
          if (text === null) throw new Error('no saved record');
          /** @type {unknown} */
          const parsed = JSON.parse(text);
          /** @type {unknown} */
          const available =
            typeof parsed === 'object' && parsed !== null
              ? Reflect.get(parsed, 'available')
              : undefined;
          return available;
        };
        return {
          state: game.state,
          gravity: game.gameLoopTask,
          lock: game.lockDelayTask,
          attempts: window.serializerAttempts,
          eligible: game.isSessionSaved,
          withdrawalAttempts: window.withdrawalAttempts,
          storedAvailable: storedAvailable(),
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
      expect(parseJsonObject(present(result.bytes)).position).toBe(
        parseJsonObject(present(before)).position
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
      await page.evaluate(() => {
        const restore = window.restoreSerializationProviders;
        if (!restore)
          throw new Error('serialization providers were not patched');
        restore();
      });
    }
  });
}
