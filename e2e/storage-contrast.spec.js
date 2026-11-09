import { test, expect } from './fixtures.js';

// One-shot hosted diagnostic. Not release qualification or a replacement gate.
for (const surface of ['bare', 'game']) {
  for (const key of ['other.app', 'tetris.highScore']) {
    test(`storage delivery contrast: ${surface}, ${key}`, async ({
      page,
      context
    }) => {
      const hostStart = performance.now();
      const host = { records: [], overflow: 0 };
      const mark = (label) => {
        if (host.records.length < 32)
          host.records.push({
            label,
            ms: Math.round(performance.now() - hostStart)
          });
        else host.overflow++;
      };
      const attach = async (target, role) => {
        target.on('framenavigated', (frame) => {
          if (frame === target.mainFrame()) mark(`${role}-navigation`);
        });
        target.on('close', () => mark(`${role}-close`));
        target.on('crash', () => mark(`${role}-crash`));
        await target.addInitScript((expectedKey) => {
          const start = performance.now();
          const state = {
            documentStart: performance.timeOrigin,
            records: [],
            overflow: 0,
            expectedEvents: 0
          };
          window.storageContrast = state;
          const record = (label, fields = {}) => {
            if (state.records.length < 32)
              state.records.push({
                label,
                ms: Math.round(performance.now() - start),
                ...fields
              });
            else state.overflow++;
          };
          record('document-start');
          document.addEventListener('DOMContentLoaded', () =>
            record('dom-ready')
          );
          window.addEventListener('pageshow', () => record('page-show'));
          window.addEventListener('pagehide', () => record('page-hide'));
          document.addEventListener('visibilitychange', () =>
            record('visibility', {
              visible: document.visibilityState === 'visible'
            })
          );
          window.addEventListener('storage', (event) => {
            if (event.key === expectedKey) state.expectedEvents++;
            const bucket = (value) =>
              value === null
                ? 'null'
                : value === '4200'
                  ? 'first'
                  : value === '4201'
                    ? 'second'
                    : 'other';
            record('storage', {
              key:
                event.key === expectedKey
                  ? 'expected'
                  : event.key === null
                    ? 'null'
                    : 'other',
              oldValue: bucket(event.oldValue),
              newValue: bucket(event.newValue),
              trusted: event.isTrusted,
              local: event.storageArea === localStorage
            });
          });
        }, key);
      };
      const snapshot = async (target) => {
        try {
          return await target.evaluate(() => ({
            state: window.storageContrast,
            ready: document.readyState,
            visible: document.visibilityState === 'visible'
          }));
        } catch {
          return null;
        }
      };
      if (surface === 'bare') {
        await context.route('**/storage-contrast.html', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<!doctype html><title>Storage contrast</title>'
          })
        );
      }
      await attach(page, 'receiver');
      const writer = await context.newPage();
      await attach(writer, 'writer');
      const path = surface === 'game' ? '/' : '/storage-contrast.html';
      const writes = [];
      let before = null;
      let outcome = 'preparation-failure';
      try {
        await page.goto(path);
        await writer.goto(path);
        if (surface === 'game') {
          await expect(page.locator('#highScore')).toHaveText('High Score: 0');
          await expect(writer.locator('#highScore')).toHaveText(
            'High Score: 0'
          );
        }
        before = {
          receiver: await snapshot(page),
          writer: await snapshot(writer)
        };
        const write = async (value, label) => {
          mark(`${label}-start`);
          const facts = await writer.evaluate(
            ({ key, value }) => {
              const previous = localStorage.getItem(key);
              localStorage.setItem(key, value);
              return {
                alreadyEqual: previous === value,
                previousMissing: previous === null,
                documentStart: performance.timeOrigin
              };
            },
            { key, value }
          );
          mark(`${label}-return`);
          writes.push({ label, ...facts });
          return facts;
        };
        outcome = 'first-write-or-event-failure';
        const first = await write('4200', 'changed-write');
        expect(first.alreadyEqual).toBe(false);
        await expect
          .poll(() =>
            page.evaluate(() => window.storageContrast.expectedEvents)
          )
          .toBe(1);
        outcome = 'equal-or-second-write-failure';
        const equal = await write('4200', 'equal-write');
        expect(equal.alreadyEqual).toBe(true);
        const second = await write('4201', 'second-changed-write');
        expect(second.alreadyEqual).toBe(false);
        await expect
          .poll(() =>
            page.evaluate(() => window.storageContrast.expectedEvents)
          )
          .toBeGreaterThanOrEqual(2);
        outcome = 'observation-complete';
      } finally {
        // Memory-only final snapshots. Preserve the original assertion/error.
        try {
          console.log(
            'Storage contrast evidence:',
            JSON.stringify({
              surface,
              key,
              outcome,
              writes,
              host,
              before,
              after: {
                receiver: await snapshot(page),
                writer: await snapshot(writer)
              }
            })
          );
        } catch {
          // Collection is best-effort and shares the unchanged whole-test limit.
        }
      }
    });
  }
}
