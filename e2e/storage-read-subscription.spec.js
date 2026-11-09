import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// One-shot discriminator, not release qualification.
//
// Question: is a receiver page's first storage data read associated with its
// subscription to cross-page storage events in WebKit?
//
// Arms (10 repetitions each, fixed round-robin order, zero retries). Each
// bare arm awaits one same-shaped receiver evaluation just before the
// writer's write:
//   N   (k) => { void k; return 0 }                         control
//   G   (k) => { localStorage.getItem(k); return 0 }        one data read
//   ND  N's evaluation, then a 2,000 ms host-side wait      elapsed time
//       before the write                                    (covers G's
//                                                           synchronous
//                                                           round trip)
//   P   N's evaluation in launchPersistentContext           session type
//       (tests prewarm directly). This is a bundle: the session type
//       changes, and with it every property that follows from the profile
//       being on disk. It is not an isolated single-flag change.
//   R   the real game page: record the game's own reads and event arrival
//
// All arms use identical context options (viewport, device scale factor,
// mobile, touch - taken from the project), so P differs from N only in the
// persistent-session bundle and R only in the page under test.
//
// Read/write timing in R: both pages share the host system clock, so
// Date.now() values are comparable across pages. The writer reports the
// absolute times immediately before and after its setItem; receiver reads
// are classified strictly before that window, inside it, or after it. The
// inside-window bucket is an honest unclassified overlap, never counted as
// 'before the write'.
//
// Record retention: all 50 slots are preinitialized as not-run records and
// the final results line prints from a finally, so an ordinary escape still
// yields the full record. A hard job kill or a hung cleanup cannot be
// guaranteed to retain anything; that limit is stated in STORAGE-PACKET.md.
// A cleanup failure invalidates the repetition (outcome cleanup-failure).
//
// Every repetition uses a fresh context and (for the bare arms) a unique
// route-fulfilled origin, so no connected storage area carries over.
// Outcomes are recorded, never asserted; the predeclared decision rule lives
// in STORAGE-PACKET.md. The only test-level assertion is that every planned
// repetition reached 'observation-complete'; a missing or inconclusive
// repetition is recorded, not retried. A cleanup failure is recorded on the
// repetition and never costs the current record or the remaining arms.

const ARMS = ['N', 'G', 'ND', 'P', 'R'];
const REPS = 10;
const KEY = 'other.app';
const DELAY_MS = 2000;
const POLL_MS = 5000;
const GAME_URL = process.env.DIAG_GAME_URL || 'http://localhost:4173';
// Grounded in public/game/gameManager.js: the game stores under
// 'tetris.highScore' (and 'tetris.isSessionSaved').
const GAME_KEY = process.env.DIAG_GAME_KEY || 'tetris.highScore';
const BARE_HTML = '<!doctype html><title>Storage read subscription</title>';

const hostWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bare-page receiver instrumentation: a storage listener from document start,
// plus frame and visibility markers. No storage access of its own.
const bareReceiverInit = (expectedKey) => {
  const start = performance.now();
  const state = {
    documentStart: performance.timeOrigin,
    events: 0,
    firstFrame: null,
    visibility: []
  };
  window.discriminator = state;
  requestAnimationFrame(() => {
    state.firstFrame = Math.round(performance.now() - start);
  });
  document.addEventListener('visibilitychange', () => {
    state.visibility.push([document.visibilityState, Math.round(performance.now() - start)]);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === expectedKey) state.events++;
  });
};

// Game-page recorder. Grounded structure (public/game/gameManager.js): the
// game captures localStorage once at construction (defaultStorage) and calls
// this.storage.getItem/setItem, which resolve through Storage.prototype.
// Assigning an own property onto the Storage instance is unsafe (Storage
// named-property semantics), so interception wraps the prototype methods and
// verifies each descriptor afterwards. The wrappers only forward the game's
// calls; installation itself makes no storage call. Reads (getItem) are
// recorded separately from writes (setItem/removeItem).
const gameReceiverInit = (expectedKey) => {
  const start = performance.now();
  const now = () => Math.round(performance.now() - start);
  const state = {
    documentStart: performance.timeOrigin,
    events: 0,
    reads: [],
    writes: [],
    firstFrame: null,
    visibility: [],
    interceptionInstalled: false
  };
  window.discriminator = state;
  const wrap = (name, bucket) => {
    const original = Storage.prototype[name];
    const wrapped = function (...args) {
      const entries = state[bucket];
      if (entries.length < 64) entries.push({ t: now(), abs: Date.now(), key: args[0] });
      return original.apply(this, args);
    };
    Object.defineProperty(Storage.prototype, name, {
      value: wrapped, writable: true, configurable: true
    });
    const desc = Object.getOwnPropertyDescriptor(Storage.prototype, name);
    return !!desc && desc.value === wrapped;
  };
  state.interceptionInstalled =
    [wrap('getItem', 'reads'), wrap('setItem', 'writes'), wrap('removeItem', 'writes')]
      .every(Boolean);
  requestAnimationFrame(() => {
    state.firstFrame = { t: now(), abs: Date.now() };
  });
  document.addEventListener('visibilitychange', () => {
    state.visibility.push([document.visibilityState, now()]);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === expectedKey) state.events++;
  });
};

async function pollEvents(page) {
  const deadline = Date.now() + POLL_MS;
  let events = 0;
  while (Date.now() < deadline) {
    events = await page.evaluate(() => window.discriminator.events);
    if (events >= 1) return { events, waited: true };
    await hostWait(100);
  }
  return { events, waited: false };
}

async function bareRep(browser, engine, arm, rep, projectUse) {
  const origin = `http://diag-${engine}-${arm.toLowerCase()}-${rep}.example.invalid`;
  const record = {
    engine, arm, rep, origin,
    outcome: 'preparation-failure',
    delivered: null,
    events: null,
    postPollReceiverValue: null,
    postPollWriterValue: null,
    receiverOrigin: null,
    writerOrigin: null,
    originEqual: null,
    firstFrame: null,
    visibility: null,
    cleanupError: null,
    error: null
  };
  let context;
  let userDataDir = null;
  try {
    // Identical context options in every arm, so P differs from N only in
    // the persistent-session bundle.
    const contextOptions = {
      viewport: projectUse.viewport,
      deviceScaleFactor: projectUse.deviceScaleFactor,
      isMobile: projectUse.isMobile,
      hasTouch: projectUse.hasTouch
    };
    if (arm === 'P') {
      userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diag-persistent-'));
      context = await browser.browserType().launchPersistentContext(userDataDir, contextOptions);
    } else {
      context = await browser.newContext(contextOptions);
    }
    await context.route('**/*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: BARE_HTML }));
    const receiver = await context.newPage();
    await receiver.addInitScript(bareReceiverInit, KEY);
    const writer = await context.newPage();
    await receiver.goto(origin + '/page.html');
    await writer.goto(origin + '/page.html');
    // One same-shaped awaited receiver evaluation per arm (see the arm
    // table in the header). Only G's evaluation touches storage; the
    // no-op keeps the round trip identical across arms.
    const receiverEval =
      arm === 'G'
        ? (k) => { localStorage.getItem(k); return 0; }
        : (k) => { void k; return 0; };
    await receiver.evaluate(receiverEval, KEY);
    if (arm === 'ND') {
      await hostWait(DELAY_MS); // after the evaluation; host-side only
    }
    record.outcome = 'armed';
    const wrote = await writer.evaluate((k) => {
      const previous = localStorage.getItem(k);
      localStorage.setItem(k, '4200');
      return { previousMissing: previous === null };
    }, KEY);
    if (!wrote.previousMissing) throw new Error('unexpected pre-existing value');
    const polled = await pollEvents(receiver);
    record.events = polled.events;
    record.delivered = polled.events >= 1;
    // Post-poll readbacks only; they say nothing about visibility during the
    // missed interval.
    const read = (target) =>
      target.evaluate((k) => ({ origin: location.origin, value: localStorage.getItem(k) }), KEY);
    const receiverRead = await read(receiver);
    const writerRead = await read(writer);
    record.postPollReceiverValue = receiverRead.value;
    record.postPollWriterValue = writerRead.value;
    record.receiverOrigin = receiverRead.origin;
    record.writerOrigin = writerRead.origin;
    record.originEqual = receiverRead.origin === writerRead.origin;
    const snap = await receiver.evaluate(() => ({
      firstFrame: window.discriminator.firstFrame,
      visibility: window.discriminator.visibility
    }));
    record.firstFrame = snap.firstFrame;
    record.visibility = snap.visibility;
    record.outcome = 'observation-complete';
  } catch (error) {
    record.error = String((error && error.message) || error);
  }
  // Guarded finalize: cleanup failures are recorded on the record and
  // invalidate the repetition; remaining repetitions always continue.
  if (context) {
    try {
      await context.close();
    } catch (error) {
      record.cleanupError = 'context close: ' + String((error && error.message) || error);
    }
  }
  if (userDataDir) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      record.cleanupError = (record.cleanupError ? record.cleanupError + '; ' : '') +
        'profile delete: ' + String((error && error.message) || error);
    }
  }
  if (record.cleanupError) record.outcome = 'cleanup-failure';
  return record;
}

async function gameRep(browser, engine, rep, projectUse) {
  const record = {
    engine, arm: 'R', rep, gameUrl: GAME_URL, gameKey: GAME_KEY,
    outcome: 'preparation-failure',
    delivered: null,
    events: null,
    interceptionInstalled: null,
    receiverOrigin: null,
    writerOrigin: null,
    writeWindowAbs: null,
    receiverGetItemCallsBeforeWrite: null,
    receiverGetItemCallsInWriteWindow: null,
    receiverGetItemCallsAfterWrite: null,
    receiverFirstFrame: null,
    firstFrameBeforeWrite: null,
    receiverVisibility: null,
    allReceiverReads: null,
    allReceiverWrites: null,
    cleanupError: null,
    error: null
  };
  let context;
  try {
    if (!GAME_URL) throw new Error('DIAG_GAME_URL is required for arm R');
    context = await browser.newContext({
      viewport: projectUse.viewport,
      deviceScaleFactor: projectUse.deviceScaleFactor,
      isMobile: projectUse.isMobile,
      hasTouch: projectUse.hasTouch
    });
    const receiver = await context.newPage();
    await receiver.addInitScript(gameReceiverInit, GAME_KEY);
    const writer = await context.newPage();
    await receiver.goto(GAME_URL);
    await writer.goto(GAME_URL);
    // Fail closed: without verified prototype interception the recorded read
    // pattern would be meaningless, so the repetition stops before any write.
    const installed = await receiver.evaluate(() => window.discriminator.interceptionInstalled);
    record.interceptionInstalled = installed;
    if (installed !== true) throw new Error('storage interception not installed');
    record.receiverOrigin = await receiver.evaluate(() => location.origin);
    record.outcome = 'armed';
    // One changed write only, with an absolute-time witness: the writer
    // reports the host-clock times immediately before and after its setItem
    // plus its own origin. The value differs from any stored value; the
    // writer does not rewrite or touch the receiver.
    const value = `diag-${engine}-${rep}-${Date.now()}`;
    const witness = await writer.evaluate(({ k, v }) => {
      const origin = location.origin;
      const beforeAbs = Date.now();
      localStorage.setItem(k, v);
      const afterAbs = Date.now();
      return { origin, beforeAbs, afterAbs };
    }, { k: GAME_KEY, v: value });
    record.writerOrigin = witness.origin;
    record.writeWindowAbs = [witness.beforeAbs, witness.afterAbs];
    const deadline = Date.now() + POLL_MS;
    let snap;
    do {
      snap = await receiver.evaluate(() => ({
        events: window.discriminator.events,
        reads: window.discriminator.reads,
        writes: window.discriminator.writes,
        visibility: window.discriminator.visibility,
        firstFrame: window.discriminator.firstFrame
      }));
      if (snap.events >= 1) break;
      await hostWait(100);
    } while (Date.now() < deadline);
    record.events = snap.events;
    record.delivered = snap.events >= 1;
    record.allReceiverReads = snap.reads;
    record.allReceiverWrites = snap.writes;
    record.receiverVisibility = snap.visibility;
    record.receiverFirstFrame = snap.firstFrame;
    record.firstFrameBeforeWrite =
      !!(snap.firstFrame && snap.firstFrame.abs < witness.beforeAbs);
    // Classified against the write's absolute window: strictly before,
    // inside the window (honest unclassified overlap), or after.
    record.receiverGetItemCallsBeforeWrite =
      snap.reads.filter((r) => r.abs < witness.beforeAbs);
    record.receiverGetItemCallsInWriteWindow =
      snap.reads.filter((r) => r.abs >= witness.beforeAbs && r.abs <= witness.afterAbs);
    record.receiverGetItemCallsAfterWrite =
      snap.reads.filter((r) => r.abs > witness.afterAbs);
    record.outcome = 'observation-complete';
  } catch (error) {
    record.error = String((error && error.message) || error);
  }
  if (context) {
    try {
      await context.close();
    } catch (error) {
      record.cleanupError = 'context close: ' + String((error && error.message) || error);
    }
  }
  if (record.cleanupError) record.outcome = 'cleanup-failure';
  return record;
}

test('storage read subscription discriminator', async ({ browser, browserName }, testInfo) => {
  test.setTimeout(900000);
  // All 50 slots preinitialized as not-run records; each repetition replaces
  // its own slot.
  const results = [];
  for (let rep = 1; rep <= REPS; rep++) {
    for (const arm of ARMS) {
      results.push({
        engine: browserName, arm, rep,
        outcome: 'not-run', delivered: null, events: null,
        error: 'repetition did not execute'
      });
    }
  }
  const slot = (arm, rep) => results.findIndex((r) => r.arm === arm && r.rep === rep);
  try {
    for (let rep = 1; rep <= REPS; rep++) {
      for (const arm of ARMS) {
        const record = arm === 'R'
          ? await gameRep(browser, browserName, rep, testInfo.project.use)
          : await bareRep(browser, browserName, arm, rep, testInfo.project.use);
        results[slot(arm, rep)] = record;
        console.log('DISCRIMINATOR_REP ' + JSON.stringify(record));
      }
    }
  } finally {
    // An ordinary escape still prints the full 50-slot record. A hard job
    // kill or a hung cleanup cannot guarantee retention; see the packet.
    console.log('DISCRIMINATOR_RESULTS ' + JSON.stringify(results));
  }
  const incomplete = results.filter((r) => r.outcome !== 'observation-complete');
  expect(incomplete, 'every planned repetition must be recorded').toEqual([]);
});
