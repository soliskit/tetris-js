import { test as base, expect } from './fixtures.js';

// Admission tests deliberately observe pending states. Keep the coverage
// fixture, but use a raw page rather than the normal bootstrap waiter.
const test = base.extend({
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  }
});

/**
 * The page's lock witness, which its init script installs.
 * @param {import('@playwright/test').Page} target
 */
async function witnessOf(target) {
  const witness = await target.evaluate(() => window.lockWitness);
  if (!witness) throw new Error('tab-lock: lockWitness was not installed');
  return witness;
}

const blockedMessage = 'Game already open in another tab.';

/**
 * @param {import('@playwright/test').Page} observer
 */
async function waitForRelease(observer) {
  // Observe the browser's actual release, without retrying acquisition/clicks.
  await expect
    .poll(() =>
      observer.evaluate(async () => {
        const snapshot = await navigator.locks.query();
        return !(snapshot.held ?? []).some(
          (lock) => lock.name === 'tetris.game-page'
        );
      })
    )
    .toBe(true);
}

test('only one page starts while the owner is open, paused or hidden [APP-7] [STA-5]', async ({
  page,
  context
}) => {
  await page.goto('/');
  await expect(page.locator('main.app')).toBeVisible();
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await second.locator('#tabLockRetry').click();
  await expect(second.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await page.keyboard.press('Enter');
  await page.keyboard.press('KeyP');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await second.locator('#tabLockRetry').click();
  await expect(second.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await page.close();
  await waitForRelease(second);
  // Closing the owner cannot automatically start the blocked page.
  await expect(second.locator('main.app')).toBeHidden();
  await second.locator('#tabLockRetry').click();
  await expect(second.locator('main.app')).toBeVisible();
});

test('simultaneous startup admits one game page [APP-7]', async ({
  page,
  context
}) => {
  const second = await context.newPage();
  await Promise.all([page.goto('/'), second.goto('/')]);
  await expect
    .poll(async () => {
      const states = await Promise.all(
        [page, second].map((target) => target.locator('main.app').isVisible())
      );
      return states.filter(Boolean).length;
    })
    .toBe(1);
  const blocked = (await page.locator('main.app').isVisible()) ? second : page;
  await expect(blocked.locator('#tabLockMessage')).toHaveText(blockedMessage);
});

test('pending admission and duplicate retry cannot access storage or initialize a game [APP-7]', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.lockRequests = 0;
    window.gameStorageTouches = 0;
    let storageTouches = 0;
    let lockRequests = 0;
    for (const name of ['getItem', 'setItem']) {
      /** @type {unknown} */
      const operation = Reflect.get(Storage.prototype, name);
      if (typeof operation !== 'function')
        throw new Error('tab-lock: Storage.' + name + ' is not a function');
      Reflect.set(
        Storage.prototype,
        name,
        /** @this {Storage} */
        function (/** @type {unknown[]} */ ...args) {
          if (String(args[0]).startsWith('tetris.'))
            window.gameStorageTouches = ++storageTouches;
          /** @type {unknown} */
          const result = Reflect.apply(operation, this, args);
          return result;
        }
      );
    }
    Object.defineProperty(navigator, 'locks', {
      value: {
        request: (
          /** @type {string} */ _name,
          /** @type {LockOptions} */ options,
          /** @type {(lock: null) => void} */ callback
        ) => {
          if (options.ifAvailable !== true)
            throw new Error('Queued request is forbidden');
          window.lockRequests = ++lockRequests;
          window.deliverLock = () => {
            callback(null);
          };
          return new Promise(() => {});
        }
      }
    });
  });
  await page.goto('/');
  await expect(page.locator('main.app')).toBeHidden();
  expect(await page.evaluate(() => window.gameStorageTouches)).toBe(0);
  await page.locator('#tabLockRetry').dispatchEvent('click');
  expect(await page.evaluate(() => window.lockRequests)).toBe(1);
  await page.evaluate(() => {
    const deliver = window.deliverLock;
    if (!deliver) throw new Error('tab-lock: deliverLock was not installed');
    deliver();
  });
  await expect(page.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await page.locator('#tabLockRetry').dispatchEvent('click');
  await page.locator('#tabLockRetry').dispatchEvent('click');
  expect(await page.evaluate(() => window.lockRequests)).toBe(2);
  expect(await page.evaluate(() => window.gameStorageTouches)).toBe(0);
});

for (const failure of ['rejection', 'throw', 'report-refusal']) {
  test(`a lock ${failure} does not start an unlocked game [APP-7]`, async ({
    page
  }) => {
    await page.addInitScript((kind) => {
      if (kind === 'report-refusal')
        console.error = () => {
          throw new Error('Report refused');
        };
      Object.defineProperty(navigator, 'locks', {
        value: {
          request: () => {
            if (kind === 'throw') throw new Error('Request refused');
            return Promise.reject(new Error('Request refused'));
          }
        }
      });
    }, failure);
    await page.goto('/');
    await expect(page.locator('#tabLockMessage')).toHaveText(
      'The game could not get its tab lock. Try again.'
    );
    await expect(page.locator('main.app')).toBeHidden();
    await expect(page.locator('#tabLockRetry')).toBeEnabled();
  });
}

test('reloading the owner requires fresh admission without unblocking another page [APP-7]', async ({
  page,
  context
}) => {
  await page.goto('/');
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await page.reload();
  await expect(page.locator('main.app')).toBeVisible();
  await expect(second.locator('main.app')).toBeHidden();
  await second.locator('#tabLockRetry').click();
  await expect(second.locator('#tabLockMessage')).toHaveText(blockedMessage);
});

test('history restoration retains actual ownership or requires fresh admission [APP-7]', async ({
  page,
  context
}) => {
  await context.addInitScript(() => {
    /** @type {LockWitness} */
    const witness = {
      documentStart: performance.timeOrigin,
      clientId: null,
      granted: false,
      settled: false,
      touches: 0,
      violations: 0,
      shows: []
    };
    window.lockWitness = witness;
    window.addEventListener('pageshow', (event) =>
      witness.shows.push(event.persisted)
    );
    /** @type {unknown} */
    const request = Reflect.get(navigator.locks, 'request');
    if (typeof request !== 'function')
      throw new Error('tab-lock: navigator.locks.request is missing');
    Reflect.set(
      navigator.locks,
      'request',
      (
        /** @type {string} */ name,
        /** @type {LockOptions} */ options,
        /** @type {(lock: Lock | null) => unknown} */ callback
      ) => {
        /** @type {unknown} */
        const outcome = Reflect.apply(request, navigator.locks, [
          name,
          options,
          (/** @type {Lock | null} */ lock) => {
            const result = callback(lock);
            if (lock && name === 'tetris.game-page') {
              witness.granted = true;
              void (async () => {
                try {
                  const snapshot = await navigator.locks.query();
                  witness.clientId =
                    (snapshot.held ?? []).find((item) => item.name === name)
                      ?.clientId ?? null;
                } catch {
                  witness.clientId = null;
                }
              })();
              void (async () => {
                try {
                  await result;
                  witness.settled = true;
                } catch {
                  witness.settled = true;
                }
              })();
            }
            return result;
          }
        ]);
        return outcome;
      }
    );
    for (const name of ['getItem', 'setItem', 'removeItem']) {
      /** @type {unknown} */
      const operation = Reflect.get(Storage.prototype, name);
      if (typeof operation !== 'function')
        throw new Error('tab-lock: Storage.' + name + ' is not a function');
      Reflect.set(
        Storage.prototype,
        name,
        /** @this {Storage} */
        function (/** @type {unknown[]} */ ...args) {
          if (String(args[0]).startsWith('tetris.')) {
            witness.touches++;
            if (!witness.granted || witness.settled) witness.violations++;
          }
          /** @type {unknown} */
          const result = Reflect.apply(operation, this, args);
          return result;
        }
      );
    }
  });
  await page.goto('/');
  await expect(page.locator('main.app')).toBeVisible();
  const initialDocument = (await witnessOf(page)).documentStart;
  await page.goto('/icons/icon.svg');
  const second = await context.newPage();
  await second.goto('/');
  await page.goBack();
  await expect
    .poll(async () => {
      const states = await Promise.all(
        [page, second].map((target) => target.locator('main.app').isVisible())
      );
      return states.filter(Boolean).length;
    })
    .toBe(1);
  const owner = (await page.locator('main.app').isVisible()) ? page : second;
  const blocked = owner === page ? second : page;
  await expect(blocked.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await expect
    .poll(async () => (await witnessOf(owner)).clientId)
    .not.toBeNull();
  const probe = await context.newPage();
  await probe.goto('/icons/icon.svg');
  const actual = await probe.evaluate(async () => ({
    available: await navigator.locks.request(
      'tetris.game-page',
      { ifAvailable: true },
      (lock) => !!lock
    ),
    held: ((await navigator.locks.query()).held ?? [])
      .filter((lock) => lock.name === 'tetris.game-page')
      .map((lock) => lock.clientId)
  }));
  expect(actual.available).toBe(false);
  expect(actual.held).toEqual([(await witnessOf(owner)).clientId]);
  const beforeBlocked = (await witnessOf(blocked)).touches;
  await blocked.keyboard.press('Enter');
  await blocked.locator('#newGameButton').dispatchEvent('click');
  expect((await witnessOf(blocked)).touches).toBe(beforeBlocked);
  await owner.keyboard.press('Enter');
  await owner.keyboard.press('Space');
  await owner.keyboard.press('KeyP');
  await expect(owner.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Resume'
  );
  expect((await witnessOf(owner)).touches).toBeGreaterThan(0);
  expect((await witnessOf(owner)).violations).toBe(0);
  expect((await witnessOf(blocked)).violations).toBe(0);
  const restored = await witnessOf(page);
  console.log(
    'Tab lock restoration evidence:',
    JSON.stringify({
      sameDocument: restored.documentStart === initialDocument,
      persistedRestoreObserved: restored.shows.includes(true),
      actualOwnerMatched: true,
      restoredViolations: restored.violations
    })
  );
  await owner.close();
  await waitForRelease(blocked);
  await blocked.locator('#tabLockRetry').click();
  await expect(blocked.locator('main.app')).toBeVisible();
});

test('a stale request rejection after grant cannot reopen retry [APP-7]', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.requestCalls = 0;
    Object.defineProperty(navigator, 'locks', {
      value: {
        request: (
          /** @type {string} */ _name,
          /** @type {unknown} */ _options,
          /** @type {(lock: Lock) => unknown} */ callback
        ) => {
          window.requestCalls = (window.requestCalls ?? 0) + 1;
          window.returnedHold = callback({
            name: 'tetris.game-page',
            mode: 'exclusive'
          });
          Reflect.deleteProperty(window, 'rejectOldRequest');
          return new Promise((_resolve, reject) => {
            window.rejectOldRequest = reject;
          });
        }
      }
    });
  });
  await page.goto('/');
  await expect(page.locator('main.app')).toBeVisible();
  await page.evaluate(() => {
    const reject = window.rejectOldRequest;
    if (!reject)
      throw new Error('tab-lock: the old request was never captured');
    reject(new Error('Stale controlled rejection'));
  });
  await expect(page.locator('#tabLockStatus')).toBeHidden();
  await page.locator('#tabLockRetry').dispatchEvent('click');
  expect(await page.evaluate(() => window.requestCalls)).toBe(1);
  expect(
    await page.evaluate(() => window.returnedHold instanceof Promise)
  ).toBe(true);
});

test('post-grant bootstrap failure does not release the real lifetime lock [APP-7]', async ({
  page,
  context
}) => {
  await page.addInitScript(() => {
    window.startupFaultReached = false;
    /** @type {WeakSet<HTMLCanvasElement>} */
    const seen = new WeakSet();
    /** @type {unknown} */
    const getContext = Reflect.get(HTMLCanvasElement.prototype, 'getContext');
    if (typeof getContext !== 'function')
      throw new Error('tab-lock: getContext is not a function');
    Reflect.set(
      HTMLCanvasElement.prototype,
      'getContext',
      /** @this {HTMLCanvasElement} */
      function (/** @type {unknown[]} */ ...args) {
        if (!seen.has(this)) {
          seen.add(this);
          /** @type {unknown} */
          const context = Reflect.apply(getContext, this, args);
          return context;
        }
        window.startupFaultReached = true;
        throw new Error('Controlled startup refusal');
      }
    );
  });
  await page.goto('/');
  // Prove the controlled post-admission failure was actually reached.
  await expect
    .poll(() => page.evaluate(() => window.startupFaultReached))
    .toBe(true);
  await expect(page.locator('main.app')).toBeHidden();
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('#tabLockMessage')).toHaveText(blockedMessage);
  await page.close();
  await waitForRelease(second);
  await second.locator('#tabLockRetry').click();
  await expect(second.locator('main.app')).toBeVisible();
});

test('display preflight refusal is visible and never requests game ownership [APP-7] [DSP-6]', async ({
  page,
  context
}) => {
  await page.addInitScript(() => {
    window.preflightReached = false;
    window.preflightLockRequests = 0;
    let lockRequests = 0;
    /** @type {unknown} */
    const request = Reflect.get(navigator.locks, 'request');
    if (typeof request !== 'function')
      throw new Error('tab-lock: navigator.locks.request is missing');
    Reflect.set(
      navigator.locks,
      'request',
      (/** @type {unknown[]} */ ...args) => {
        window.preflightLockRequests = ++lockRequests;
        /** @type {unknown} */
        const result = Reflect.apply(request, navigator.locks, args);
        return result;
      }
    );
    HTMLCanvasElement.prototype.getContext = () => {
      window.preflightReached = true;
      throw new Error('Controlled display preflight refusal');
    };
  });
  /** @type {string[]} */
  const reports = [];
  page.on('console', (message) => {
    if (message.type() === 'error') reports.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('#tabLockMessage')).toHaveText(
    'The game could not prepare its display.'
  );
  await expect(page.locator('#tabLockRetry')).toHaveText('Reload');
  await expect(page.locator('main.app')).toBeHidden();
  expect(await page.evaluate(() => window.preflightReached)).toBe(true);
  expect(await page.evaluate(() => window.preflightLockRequests)).toBe(0);
  expect(reports).toContain('Tetris display setup failed.');
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('main.app')).toBeVisible();
});

test('a refused display-preflight report cannot request ownership or start a game [APP-7] [DSP-6] [QA-3]', async ({
  page,
  context
}) => {
  await page.addInitScript(() => {
    window.preflightReportAttempts = 0;
    window.preflightLockRequests = 0;
    window.preflightStorageTouches = 0;
    let storageTouches = 0;
    for (const name of ['getItem', 'setItem', 'removeItem']) {
      /** @type {unknown} */
      const operation = Reflect.get(Storage.prototype, name);
      if (typeof operation !== 'function')
        throw new Error('tab-lock: Storage.' + name + ' is not a function');
      Reflect.set(
        Storage.prototype,
        name,
        /** @this {Storage} */
        function (/** @type {unknown[]} */ ...args) {
          if (String(args[0]).startsWith('tetris.'))
            window.preflightStorageTouches = ++storageTouches;
          /** @type {unknown} */
          const result = Reflect.apply(operation, this, args);
          return result;
        }
      );
    }
    let lockRequests = 0;
    /** @type {unknown} */
    const request = Reflect.get(navigator.locks, 'request');
    if (typeof request !== 'function')
      throw new Error('tab-lock: navigator.locks.request is missing');
    Reflect.set(
      navigator.locks,
      'request',
      (/** @type {unknown[]} */ ...args) => {
        window.preflightLockRequests = ++lockRequests;
        /** @type {unknown} */
        const result = Reflect.apply(request, navigator.locks, args);
        return result;
      }
    );
    HTMLCanvasElement.prototype.getContext = () => {
      throw new Error('Controlled display preflight refusal');
    };
    let reportAttempts = 0;
    console.error = (/** @type {unknown} */ message) => {
      if (message === 'Tetris display setup failed.')
        window.preflightReportAttempts = ++reportAttempts;
      throw new Error('Controlled display report refusal');
    };
  });
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#tabLockMessage')).toHaveText(
    'The game could not prepare its display.'
  );
  await expect(page.locator('#tabLockRetry')).toHaveText('Reload');
  await expect(page.locator('#tabLockRetry')).toBeEnabled();
  await expect(page.locator('main.app')).toBeHidden();
  expect(await page.evaluate(() => window.preflightReportAttempts)).toBe(1);
  expect(await page.evaluate(() => window.preflightLockRequests)).toBe(0);
  expect(await page.evaluate(() => window.preflightStorageTouches)).toBe(0);
  expect(errors).toEqual([]);
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('main.app')).toBeVisible();
});
