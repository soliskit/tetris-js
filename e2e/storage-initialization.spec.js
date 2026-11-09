import { test, expect } from '@playwright/test';

// One-shot discriminator, not release qualification.
test('bare-page storage initialization and first event', async ({
  page,
  context
}) => {
  const key = 'other.app';
  const initialized = process.env.RECEIVER_STORAGE_INITIALIZED === '1';
  if (!['0', '1'].includes(process.env.RECEIVER_STORAGE_INITIALIZED))
    throw new Error('Explicit diagnostic condition required');
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
      document.addEventListener('DOMContentLoaded', () => record('dom-ready'));
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
  await context.route('**/storage-initialization.html', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Storage initialization</title>'
    })
  );
  await attach(page, 'receiver');
  const writer = await context.newPage();
  await attach(writer, 'writer');
  const path = '/storage-initialization.html';
  const writes = [];
  let before = null;
  let preRead = null;
  let outcome = 'preparation-failure';
  try {
    await page.goto(path);
    await writer.goto(path);
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
    // The sole independent variable. Control does not touch receiver storage.
    // Reading the synthetic key initializes storage but changes no stored value.
    if (initialized) {
      preRead = await page.evaluate((expectedKey) => {
        const value = localStorage.getItem(expectedKey);
        return value === null ? 'null' : value === '4200' ? 'first' : 'other';
      }, key);
      expect(preRead).toBe('null');
    }
    outcome = 'first-write-or-event-failure';
    const first = await write('4200', 'changed-write');
    expect(first.alreadyEqual).toBe(false);
    await expect
      .poll(() => page.evaluate(() => window.storageContrast.expectedEvents))
      .toBe(1);
    outcome = 'observation-complete';
  } finally {
    // Best-effort collection shares the whole-test timeout.
    // Timeout may obscure the original result or prevent evidence printing.
    try {
      const after = {
        receiver: await snapshot(page),
        writer: await snapshot(writer)
      };
      // Post-poll reads only, after these memory snapshots. Not causal evidence.
      const read = async (target) => {
        try {
          return await target.evaluate((expectedKey) => {
            const value = localStorage.getItem(expectedKey);
            return {
              origin: location.origin,
              missing: value === null,
              value:
                value === null ? 'null' : value === '4200' ? 'first' : 'other'
            };
          }, key);
        } catch {
          return null;
        }
      };
      const receiverRead = await read(page);
      const writerRead = await read(writer);
      const expectedOrigin = 'http://localhost:4173';
      console.log(
        'Storage initialization evidence:',
        JSON.stringify({
          surface: 'bare',
          receiverStorageInitialized: initialized,
          receiverPreRead: preRead,
          key,
          outcome,
          writes,
          host,
          before,
          after,
          postPoll: {
            originEqual:
              receiverRead && writerRead
                ? receiverRead.origin === writerRead.origin
                : null,
            receiverExpectedOrigin: receiverRead
              ? receiverRead.origin === expectedOrigin
              : null,
            writerExpectedOrigin: writerRead
              ? writerRead.origin === expectedOrigin
              : null,
            sameContext: page.context() === writer.context(),
            receiverValue: receiverRead?.value ?? null,
            writerValue: writerRead?.value ?? null,
            receiverMissing: receiverRead?.missing ?? null,
            writerMissing: writerRead?.missing ?? null,
            receiverReadSucceeded: receiverRead !== null,
            writerReadSucceeded: writerRead !== null
          }
        })
      );
    } catch {
      // Collection is best-effort and shares the unchanged whole-test limit.
    }
  }
});
