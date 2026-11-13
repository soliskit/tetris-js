// Generated-distribution browser checks. Source QA-3 and fault suites
// remain unchanged. These cases do NOT run or qualify anything by being written.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  serverFor,
  ready,
  denyWitness,
  cacheSnapshot,
  derivedRelease,
  hash,
  cleanupAll
} from './helpers.js';
const receipt = JSON.parse(
  fs.readFileSync('.release-evidence/release.json', 'utf8')
);
for (const scope of ['/', '/nested/app/']) {
  test(
    'built current game opens offline with usable controls ' +
      scope +
      ' [APP-2] [APP-3] [DSP-2] [DSP-3]',
    async ({ page }, info) => {
      const host = await serverFor(path.resolve('dist'), scope);
      let primary;
      try {
        await ready(page, host.base);
        await denyWitness(host);
        const response = await page.reload();
        expect(response.fromServiceWorker()).toBe(true);
        expect(hash(await response.body())).toBe(receipt.documentSha256);
        await expect(page.locator('#newGameButton')).toBeVisible();
        await page.locator('#newGameButton').click();
        await expect(page.locator('#playPauseButton')).toHaveAttribute(
          'aria-label',
          'Pause'
        );
        await page.locator('#playPauseButton').click();
        await expect(page.locator('#playPauseButton')).toHaveAttribute(
          'aria-label',
          'Resume'
        );
        await page.locator('#playPauseButton').click();
        await expect(page.locator('#playPauseButton')).toHaveAttribute(
          'aria-label',
          'Pause'
        );
        const png = await page.screenshot({
          path: info.outputPath('built-offline.png'),
          fullPage: true
        });
        await info.attach('built-offline', {
          body: png,
          contentType: 'image/png'
        });
      } catch (error) {
        primary = error;
      } finally {
        await cleanupAll([host], primary);
      }
    }
  );

  test(
    'built worker preserves malformed old-pin cache contents and foreign caches ' +
      scope +
      ' [APP-2] [APP-6] [SAF-2]',
    async ({ page }) => {
      const host = await serverFor(path.resolve('dist'), scope);
      let primary;
      try {
        await page.goto(host.base + 'harness.html');
        await page.evaluate(async () => {
          for (const name of [
            'tetris-version-99999-other-app',
            'tetris-pins',
            'foreign-project-cache'
          ]) {
            const cache = await caches.open(name);
            const key = new URL(
              name === 'tetris-pins'
                ? 'pins/retained-malformed-client-note'
                : './',
              location.href
            );
            await cache.put(
              key,
              new Response(
                name === 'tetris-pins' ? 'not json' : 'foreign ' + name,
                { headers: { 'x-foreign': 'retained' } }
              )
            );
          }
          await caches.open('foreign-empty');
        });
        const before = await cacheSnapshot(page);
        await ready(page, host.base);
        await denyWitness(host);
        const response = await page.reload();
        expect(response.fromServiceWorker()).toBe(true);
        expect(hash(await response.body())).toBe(receipt.documentSha256);
        expect(await cacheSnapshot(page)).toEqual(before);
      } catch (error) {
        primary = error;
      } finally {
        await cleanupAll([host], primary);
      }
    }
  );

  test(
    'first built document cannot mix later deployment gameplay ' +
      scope +
      ' [APP-2] [APP-5]',
    async ({ page }) => {
      const a = await derivedRelease('A');
      let b;
      let host;
      let primary;
      try {
        b = await derivedRelease('B');
        host = await serverFor(a.dir, scope);
        const requests = [];
        page.on('request', (request) =>
          requests.push(new URL(request.url()).pathname)
        );
        await page.route(host.base, async (route) => {
          const response = await route.fetch();
          expect(hash(await response.body())).toBe(a.receipt.documentSha256);
          host.state.directory = b.dir;
          await route.fulfill({ response });
        });
        await page.goto(host.base);
        await expect(page).toHaveTitle('Tetris A');
        expect(await page.evaluate(() => window.__releaseTag)).toBe('A');
        expect(
          requests.filter((url) =>
            /\/(script\.js|style\.css|game\/[^/]+\.js)$/.test(url)
          )
        ).toEqual([]);
      } catch (error) {
        primary = error;
      } finally {
        await cleanupAll([host, b, a], primary);
      }
    }
  );

  test(
    'incomplete or corrupt built update cannot replace a complete installed game ' +
      scope +
      ' [APP-2] [SAF-2]',
    async ({ page }) => {
      const a = await derivedRelease('A');
      let b;
      let host;
      let primary;
      try {
        b = await derivedRelease('B');
        host = await serverFor(a.dir, scope);
        await ready(page, host.base);
        await page.reload();
        expect(await page.evaluate(() => window.__releaseTag)).toBe('A');
        host.state.directory = b.dir;
        host.state.corrupt = true;
        const rejected = await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          const result = new Promise((resolve) =>
            registration.addEventListener(
              'updatefound',
              () => {
                const worker = registration.installing;
                if (!worker) return resolve('no-installing');
                worker.addEventListener('statechange', () => {
                  if (worker.state === 'redundant') resolve('redundant');
                });
              },
              { once: true }
            )
          );
          await registration.update();
          return result;
        });
        expect(rejected).toBe('redundant');
        await denyWitness(host);
        const response = await page.reload();
        expect(response.fromServiceWorker()).toBe(true);
        expect(hash(await response.body())).toBe(a.receipt.documentSha256);
        expect(await page.evaluate(() => window.__releaseTag)).toBe('A');
      } catch (error) {
        primary = error;
      } finally {
        await cleanupAll([host, b, a], primary);
      }
    }
  );

  test(
    'held new worker preserves old coherent launch then advances whole ' +
      scope +
      ' [APP-2]',
    async ({ page }) => {
      const a = await derivedRelease('A');
      let b;
      let host;
      let primary;
      try {
        b = await derivedRelease('B');
        host = await serverFor(a.dir, scope);
        await ready(page, host.base);
        await page.reload();
        host.state.directory = b.dir;
        host.holdWorker();
        // The initiating document may be destroyed. Keep no promise/flag there.
        await page.evaluate(() => {
          navigator.serviceWorker
            .getRegistration()
            .then((registration) => registration.update())
            .catch(() => {});
        });
        await expect
          .poll(
            () =>
              host.state.requests.filter((request) => request.path === '/sw.js')
                .length
          )
          .toBeGreaterThan(1);
        const heldResponse = await page.reload();
        expect(heldResponse.fromServiceWorker()).toBe(true);
        expect(hash(await heldResponse.body())).toBe(a.receipt.documentSha256);
        expect(await page.evaluate(() => window.__releaseTag)).toBe('A');
        // Observe the exact incoming worker on the replacement page BEFORE
        // releasing the held response. Capture worker, never re-read installing.
        const transition = page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          await new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error('new worker activation timeout')),
              15000
            );
            const observe = () => {
              const worker = registration.installing;
              if (!worker) return;
              registration.removeEventListener('updatefound', observe);
              const changed = () => {
                if (worker.state === 'redundant') {
                  clearTimeout(timer);
                  reject(new Error('new worker redundant'));
                }
                if (worker.state === 'activated') {
                  clearTimeout(timer);
                  resolve();
                }
              };
              worker.addEventListener('statechange', changed);
              changed();
            };
            registration.addEventListener('updatefound', observe);
            observe();
            // Readiness is DOM state in THIS replacement document, not the
            // document that initiated update and was intentionally reloaded.
            document.documentElement.dataset.updateObserverReady = 'yes';
          });
        });
        const settledTransition = transition.then(
          () => ({ ok: true }),
          (error) => ({ ok: false, error })
        );
        await page.waitForFunction(
          () => document.documentElement.dataset.updateObserverReady === 'yes'
        );
        host.releaseWorker();
        const result = await settledTransition;
        if (!result.ok) throw result.error;
        await expect
          .poll(async () => {
            const response = await page.reload();
            return hash(await response.body());
          })
          .toBe(b.receipt.documentSha256);
        expect(await page.evaluate(() => window.__releaseTag)).toBe('B');
        await denyWitness(host);
        const response = await page.reload();
        expect(response.fromServiceWorker()).toBe(true);
        expect(hash(await response.body())).toBe(b.receipt.documentSha256);
      } catch (error) {
        primary = error;
      } finally {
        await cleanupAll([host, b, a], primary);
      }
    }
  );
}

for (const scope of ['/', '/nested/app/']) {
  test(
    'new built worker takes over legacy source without guessed gameplay bytes ' +
      scope +
      ' [APP-2] [APP-6]',
    async ({ page }) => {
      const host = await serverFor(path.resolve('public'), scope);
      let primary;
      try {
        await ready(page, host.base);
        host.state.directory = path.resolve('dist');
        await page.evaluate(async () => {
          const changed = new Promise((resolve) =>
            navigator.serviceWorker.addEventListener(
              'controllerchange',
              resolve,
              { once: true }
            )
          );
          const registration = await navigator.serviceWorker.getRegistration();
          await registration.update();
          await changed;
        });
        const probes = await page.evaluate(async () =>
          Promise.all(
            [
              'script.js',
              'style.css',
              'game/gameManager.js',
              '%73cript.js'
            ].map(async (file) => {
              try {
                await fetch(file);
                return false;
              } catch {
                return true;
              }
            })
          )
        );
        expect(probes).toEqual([true, true, true, true]);
        await denyWitness(host);
        const response = await page.reload();
        expect(response.fromServiceWorker()).toBe(true);
        expect(hash(await response.body())).toBe(receipt.documentSha256);
        await expect(page.locator('#newGameButton')).toBeVisible();
      } catch (error) {
        primary = error;
      } finally {
        await cleanupAll([host], primary);
      }
    }
  );
}
