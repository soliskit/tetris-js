// Every browser test imports test and expect from here. In Chromium each
// test records which parts of the page's own scripts ran, for
// scripts/browser-coverage.js to merge into a coverage report.

import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const COVERAGE_DIR = path.resolve('coverage/browser');

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
          throw new Error(`Game bootstrap did not complete: ${state}`);
      }
    };
    for (const name of ['goto', 'reload', 'goBack', 'goForward']) {
      const navigate = page[name].bind(page);
      page[name] = async (...args) => {
        const result = await navigate(...args);
        await ready();
        return result;
      };
    }
    await use(page);
  },
  recordCoverage: [
    async ({ page, browserName }, use, testInfo) => {
      if (browserName !== 'chromium') {
        await use();
        return;
      }
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
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
              `${testInfo.testId}-${testInfo.repeatEachIndex}.json`
            ),
            JSON.stringify(entries)
          );
        })();
        return captured;
      };
      // Real owner-close tests must retain their evidence before the target
      // disappears. The same promise is awaited at teardown, never recaptured.
      const close = page.close;
      page.close = async (...args) => {
        await capture();
        return close.apply(page, args);
      };
      try {
        await use();
      } finally {
        await capture();
        page.close = close;
      }
    },
    { auto: true }
  ]
});

export { expect };
