// Test-only loading evidence for the incomplete/corrupt built update case.
// The WebKit iPhone run of that case once found the original version marker
// missing immediately after a reload; this collector records synthetic
// loading events and browser state so that failure can be diagnosed. It
// records only this fixture's own origin and path: no cookies, no storage
// contents, no request headers, no page dumps and no external requests.
// Error text is expected to come only from the fixture's own public game
// and worker code or from browser-standard messages about fixture
// requests; it is still truncated to bound what an artifact can carry. The collector
// changes nothing the page or test does: no interception, no injected
// script, no cache-storage writes, no request blocking, no extra reload and
// no new waits. The version check stays the first await after the reload.
import fs from 'node:fs';
import { hash } from './helpers.js';

// One collector per test. Every event lands in one ordered list with a
// millisecond offset from collector creation.
export function startReloadEvidence(host) {
  const origin = new URL(host.base).origin;
  const scope = new URL(host.base).pathname;
  const start = Date.now();
  const events = [];
  const pending = [];

  function record(type, details) {
    events.push({ at: Date.now() - start, type, ...details });
  }

  function sameFixture(url) {
    try {
      const parsed = new URL(url);
      return parsed.origin === origin && parsed.pathname.startsWith(scope);
    } catch {
      return false;
    }
  }

  // Collector errors are recorded, never thrown. A failed write fails the
  // test; a missing file fails the workflow's upload step.
  function guard(label, collect) {
    try {
      collect();
    } catch (error) {
      record('collector-error', { label, message: String(error) });
    }
  }

  function pathOf(url) {
    return new URL(url).pathname;
  }

  const onResponse = (response) => {
    guard('response', () => {
      if (
        !response.request().isNavigationRequest() ||
        !sameFixture(response.url())
      )
        return;
      record('navigation', {
        path: pathOf(response.url()),
        status: response.status(),
        fromServiceWorker: response.fromServiceWorker()
      });
    });
  };
  const onRequestFailed = (request) => {
    guard('requestfailed', () => {
      if (!sameFixture(request.url())) return;
      record('request-failed', {
        path: pathOf(request.url()),
        error: request.failure()?.errorText ?? 'unknown'
      });
    });
  };
  const onConsole = (message) => {
    guard('console', () => {
      if (message.type() !== 'error') return;
      const location = message.location();
      record('console-error', {
        text: message.text().slice(0, 300),
        path:
          location && location.url && sameFixture(location.url)
            ? pathOf(location.url)
            : null
      });
    });
  };
  const onPageError = (error) => {
    guard('pageerror', () => {
      record('page-error', {
        name: error.name,
        message: String(error.message).slice(0, 300)
      });
    });
  };
  const listeners = [
    ['response', onResponse],
    ['requestfailed', onRequestFailed],
    ['console', onConsole],
    ['pageerror', onPageError]
  ];
  record('collector-start', { scope });

  return {
    attach(page) {
      for (const [event, listener] of listeners) page.on(event, listener);
    },
    // Synchronous response getters only, so the version check keeps its
    // exact place as the first await after the reload. The body hash is
    // deferred and read during finish, after that check has run.
    navigation(response) {
      guard('reload', () => {
        if (!response) {
          record('reload', { absent: 'reload returned no response' });
          return;
        }
        record('reload', {
          path: pathOf(response.url()),
          status: response.status(),
          fromServiceWorker: response.fromServiceWorker()
        });
        pending.push(async () => {
          try {
            record('reload-body', { sha256: hash(await response.body()) });
          } catch (error) {
            record('reload-body', { absent: String(error) });
          }
        });
      });
    },
    // The same single immediate evaluation the case already made, widened
    // to carry the browser state beside the version marker.
    immediate(state) {
      record('immediate-state', {
        releaseTagPresent: state.releaseTag !== undefined,
        releaseTag: state.releaseTag === undefined ? null : state.releaseTag,
        readyState: state.readyState,
        controller: state.controller
      });
    },
    async finish(page, info) {
      for (const [event, listener] of listeners) page.off(event, listener);
      for (const job of pending) await job();
      const report = {
        schema: 1,
        test: 'incomplete or corrupt built update cannot replace a complete installed game',
        scope,
        events
      };
      fs.writeFileSync(
        info.outputPath('reload-evidence.json'),
        JSON.stringify(report, null, 2) + '\n'
      );
    }
  };
}

// Always leaves a diagnostic file in the test's own output path: when the
// collector never started, the file says so instead of staying absent.
export async function writeReloadEvidence(evidence, page, info) {
  if (!evidence) {
    fs.writeFileSync(
      info.outputPath('reload-evidence.json'),
      JSON.stringify(
        {
          schema: 1,
          test: 'incomplete or corrupt built update cannot replace a complete installed game',
          absent: 'collector did not start'
        },
        null,
        2
      ) + '\n'
    );
    return;
  }
  await evidence.finish(page, info);
}
