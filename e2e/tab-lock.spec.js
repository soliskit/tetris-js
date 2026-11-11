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

const blockedMessage = 'Game already open in another tab.';

async function waitForRelease(observer) {
  // Observe the browser's actual release, without retrying acquisition/clicks.
  await expect
    .poll(() =>
      observer.evaluate(
        async () =>
          !(await navigator.locks.query()).held.some(
            (lock) => lock.name === 'tetris.game-page'
          )
      )
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
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (String(key).startsWith('tetris.')) window.gameStorageTouches++;
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (String(key).startsWith('tetris.')) window.gameStorageTouches++;
      set.call(this, key, value);
    };
    Object.defineProperty(navigator, 'locks', {
      value: {
        request: (_name, options, callback) => {
          if (options.ifAvailable !== true)
            throw new Error('Queued request is forbidden');
          window.lockRequests++;
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
  await page.evaluate(() => window.deliverLock());
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
    window.lockWitness = {
      documentStart: performance.timeOrigin,
      clientId: null,
      granted: false,
      settled: false,
      touches: 0,
      violations: 0,
      shows: []
    };
    const witness = window.lockWitness;
    window.addEventListener('pageshow', (event) =>
      witness.shows.push(event.persisted)
    );
    const request = navigator.locks.request.bind(navigator.locks);
    navigator.locks.request = (name, options, callback) =>
      request(name, options, (lock) => {
        const result = callback(lock);
        if (lock && name === 'tetris.game-page') {
          witness.granted = true;
          void (async () => {
            try {
              const snapshot = await navigator.locks.query();
              witness.clientId =
                snapshot.held.find((item) => item.name === name)?.clientId ??
                null;
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
      });
    for (const name of ['getItem', 'setItem', 'removeItem']) {
      const operation = Storage.prototype[name];
      Storage.prototype[name] = function (key, ...args) {
        if (String(key).startsWith('tetris.')) {
          witness.touches++;
          if (!witness.granted || witness.settled) witness.violations++;
        }
        return operation.call(this, key, ...args);
      };
    }
  });
  await page.goto('/');
  await expect(page.locator('main.app')).toBeVisible();
  const initialDocument = await page.evaluate(
    () => window.lockWitness.documentStart
  );
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
    .poll(() => owner.evaluate(() => window.lockWitness.clientId))
    .not.toBeNull();
  const probe = await context.newPage();
  await probe.goto('/icons/icon.svg');
  const actual = await probe.evaluate(async () => ({
    available: await navigator.locks.request(
      'tetris.game-page',
      { ifAvailable: true },
      (lock) => !!lock
    ),
    held: (await navigator.locks.query()).held
      .filter((lock) => lock.name === 'tetris.game-page')
      .map((lock) => lock.clientId)
  }));
  expect(actual.available).toBe(false);
  expect(actual.held).toEqual([
    await owner.evaluate(() => window.lockWitness.clientId)
  ]);
  const beforeBlocked = await blocked.evaluate(
    () => window.lockWitness.touches
  );
  await blocked.keyboard.press('Enter');
  await blocked.locator('#newGameButton').dispatchEvent('click');
  expect(await blocked.evaluate(() => window.lockWitness.touches)).toBe(
    beforeBlocked
  );
  await owner.keyboard.press('Enter');
  await owner.keyboard.press('Space');
  await owner.keyboard.press('KeyP');
  await expect(owner.locator('#playPauseButton')).toHaveAttribute(
    'aria-label',
    'Resume'
  );
  expect(
    await owner.evaluate(() => window.lockWitness.touches)
  ).toBeGreaterThan(0);
  expect(await owner.evaluate(() => window.lockWitness.violations)).toBe(0);
  expect(await blocked.evaluate(() => window.lockWitness.violations)).toBe(0);
  const restored = await page.evaluate(() => window.lockWitness);
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
        request: (_name, _options, callback) => {
          window.requestCalls++;
          window.returnedHold = callback({
            name: 'tetris.game-page',
            mode: 'exclusive'
          });
          window.rejectOldRequest = undefined;
          return new Promise((_resolve, reject) => {
            window.rejectOldRequest = reject;
          });
        }
      }
    });
  });
  await page.goto('/');
  await expect(page.locator('main.app')).toBeVisible();
  await page.evaluate(() =>
    window.rejectOldRequest(new Error('Stale controlled rejection'))
  );
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
    const seen = new WeakSet();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (!seen.has(this)) {
        seen.add(this);
        return getContext.apply(this, args);
      }
      window.startupFaultReached = true;
      throw new Error('Controlled startup refusal');
    };
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
    const request = navigator.locks.request.bind(navigator.locks);
    navigator.locks.request = (...args) => {
      window.preflightLockRequests++;
      return request(...args);
    };
    HTMLCanvasElement.prototype.getContext = () => {
      window.preflightReached = true;
      throw new Error('Controlled display preflight refusal');
    };
  });
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
    for (const name of ['getItem', 'setItem', 'removeItem']) {
      const operation = Storage.prototype[name];
      Storage.prototype[name] = function (key, ...args) {
        if (String(key).startsWith('tetris.')) window.preflightStorageTouches++;
        return operation.call(this, key, ...args);
      };
    }
    const request = navigator.locks.request.bind(navigator.locks);
    navigator.locks.request = (...args) => {
      window.preflightLockRequests++;
      return request(...args);
    };
    HTMLCanvasElement.prototype.getContext = () => {
      throw new Error('Controlled display preflight refusal');
    };
    console.error = (message) => {
      if (message === 'Tetris display setup failed.')
        window.preflightReportAttempts++;
      throw new Error('Controlled display report refusal');
    };
  });
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
