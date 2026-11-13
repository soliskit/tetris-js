import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ready, denyWitness, serverFor, hash, cleanupAll } from './helpers.js';

const receipt = JSON.parse(
  fs.readFileSync('.release-evidence/release.json', 'utf8')
);
for (const scope of ['/', '/nested/app/']) {
  test(
    'built game survives a persistent browser close and offline relaunch ' +
      scope +
      ' [APP-2] [APP-3]',
    async ({ playwright, browserName }, info) => {
      const profile = fs.mkdtempSync(
        path.join(os.tmpdir(), 'tetris-persistent-')
      );
      let host;
      let context;
      let primary;
      let closeUncertain = false;
      let launchUncertain = false;
      let retainedLaunch;
      let retainedClose;
      const use = info.project.use;
      const browserType = playwright[browserName];
      async function launch(offline) {
        // The exact launch promise remains observed even after a checked timeout.
        launchUncertain = true;
        retainedLaunch = browserType.launchPersistentContext(profile, {
          headless: true,
          viewport: use.viewport,
          deviceScaleFactor: use.deviceScaleFactor,
          isMobile: use.isMobile,
          hasTouch: use.hasTouch,
          serviceWorkers: 'allow',
          offline,
          timeout: 15000
        });
        const result = await retainedLaunch;
        launchUncertain = false;
        return result;
      }
      async function closeContext() {
        if (!context) return;
        const owned = context;
        closeUncertain = true;
        let timer;
        try {
          await Promise.race([
            retainedClose || (retainedClose = owned.close()),
            new Promise((_resolve, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(
                      'persistent context close unsettled; profile retained'
                    )
                  ),
                10000
              );
            })
          ]);
          context = null;
          retainedClose = null;
          closeUncertain = false;
        } finally {
          clearTimeout(timer);
        }
      }
      try {
        host = await serverFor(path.resolve('dist'), scope);
        context = await launch(false);
        let page = context.pages()[0] || (await context.newPage());
        await ready(page, host.base);
        await page.reload();
        await expect(page.locator('#newGameButton')).toBeVisible();
        await denyWitness(host);
        await closeContext();
        context = await launch(true);
        page = context.pages()[0] || (await context.newPage());
        const response = await page.goto(host.base);
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
          path: info.outputPath('persistent-offline.png'),
          fullPage: true
        });
        await info.attach('persistent-offline', {
          body: png,
          contentType: 'image/png'
        });
      } catch (error) {
        primary = error;
      } finally {
        const resources = [
          { close: closeContext },
          host,
          {
            close: () => {
              if (closeUncertain || launchUncertain)
                throw new Error(
                  'persistent browser ownership uncertain; profile retained: ' +
                    profile
                );
              fs.rmSync(profile, { recursive: true });
            }
          }
        ];
        await cleanupAll(resources, primary);
      }
    }
  );
}
