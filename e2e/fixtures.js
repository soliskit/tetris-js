// Every browser test imports test and expect from here. In Chromium each
// test records which parts of the page's own scripts ran, for
// scripts/browser-coverage.js to merge into a coverage report.

import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const COVERAGE_DIR = path.resolve('coverage/browser');

/**
 * @typedef {import('@playwright/test').PlaywrightTestArgs &
 *   import('@playwright/test').PlaywrightTestOptions &
 *   { waitForGameBootstrap: boolean, recordCoverage: void }} TestFixtures
 */
/**
 * @type {import('@playwright/test').TestType<
 *   TestFixtures,
 *   import('@playwright/test').PlaywrightWorkerArgs &
 *     import('@playwright/test').PlaywrightWorkerOptions
 * >}
 */
export const test = base.extend({
  waitForGameBootstrap: [true, { option: true }],
  page: async ({ page, waitForGameBootstrap }, use) => {
    // Load events can precede top-level await resuming. Existing tests must
    // wait for game bootstrap before sending direct keyboard input.
    const ready = async () => {
      if (waitForGameBootstrap && (await page.locator('main.app').count())) {
        await page.waitForFunction(() =>
          ['ready', 'blocked', 'error'].includes(
            document.documentElement.dataset.tabAdmission ?? ''
          )
        );
        const state = await page.evaluate(
          () => document.documentElement.dataset.tabAdmission
        );
        if (state !== 'ready')
          throw new Error(`Game bootstrap did not complete: ${String(state)}`);
      }
    };
    for (const name of ['goto', 'reload', 'goBack', 'goForward']) {
      /** @type {unknown} */
      const original = Reflect.get(page, name);
      if (typeof original !== 'function')
        throw new Error(`page.${name} is not a function`);
      Reflect.set(page, name, async (/** @type {unknown[]} */ ...args) => {
        /** @type {unknown} */
        const result = await Reflect.apply(original, page, args);
        await ready();
        return result;
      });
    }
    await use(page);
  },
  recordCoverage: [
    /**
     * @param {import('@playwright/test').PlaywrightTestArgs &
     *   import('@playwright/test').PlaywrightWorkerArgs &
     *   import('@playwright/test').PlaywrightWorkerOptions} fixtures
     * @param {() => Promise<void>} use
     * @param {import('@playwright/test').TestInfo} testInfo
     */
    async ({ page, browserName }, use, testInfo) => {
      if (browserName !== 'chromium') {
        await use();
        return;
      }
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      /** @type {Promise<void> | undefined} */
      let captured;
      const capture = () => {
        captured ??= (async () => {
          const entries = (await page.coverage.stopJSCoverage()).filter(
            (entry) => /\/script\.js$/.test(new URL(entry.url).pathname)
          );
          fs.mkdirSync(COVERAGE_DIR, { recursive: true });
          fs.writeFileSync(
            path.join(
              COVERAGE_DIR,
              `${testInfo.testId}-${String(testInfo.repeatEachIndex)}.json`
            ),
            JSON.stringify(entries)
          );
        })();
        return captured;
      };
      // Real owner-close tests must retain their evidence before the target
      // disappears. The same promise is awaited at teardown, never recaptured.
      /** @type {unknown} */
      const close = Reflect.get(page, 'close');
      if (typeof close !== 'function')
        throw new Error('page.close is not a function');
      page.close = async (/** @type {unknown[]} */ ...args) => {
        await capture();
        await Reflect.apply(close, page, args);
      };
      try {
        await use();
      } finally {
        await capture();
        Reflect.set(page, 'close', close);
      }
    },
    { auto: true }
  ]
});

export { expect };
