import { test, expect } from './fixtures.js';

test('startup controls read another tab before the first draw [DSP-5]', async ({
  page,
  context
}) => {
  const writer = await context.newPage();
  await writer.goto('/icons/icon.svg');
  await writer.evaluate(() => {
    localStorage.setItem('tetris.highScore', '4200');
  });
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window);
    const nativeResize = window.ResizeObserver;
    const frames = [];
    const resizes = [];
    let released = false;
    window.requestAnimationFrame = (callback) => {
      frames.push(callback);
      return frames.length;
    };
    window.ResizeObserver = class extends nativeResize {
      constructor(callback) {
        super((entries, observer) => {
          if (released) callback(entries, observer);
          else resizes.push(() => callback(entries, observer));
        });
      }
    };
    window.releaseStartupDrawing = () => {
      released = true;
      window.requestAnimationFrame = nativeFrame;
      window.ResizeObserver = nativeResize;
      for (const callback of resizes.splice(0)) callback();
      for (const callback of frames.splice(0)) nativeFrame(callback);
    };
  });
  await page.goto('/');
  let failure;
  try {
    // Static HTML says zero. No drawing callback can supply this value.
    await expect(page.locator('#highScore')).toHaveText('High Score: 4200');
    await expect(page.locator('#continueGameButton')).toHaveAttribute(
      'hidden',
      ''
    );
    await writer.evaluate(() => {
      localStorage.setItem('tetris.highScore', '4300');
    });
  } catch (error) {
    failure = error;
    try {
      console.log(
        'Startup control evidence:',
        await page.evaluate(() => ({
          highScore: document.querySelector('#highScore')?.textContent,
          continueHidden: document
            .querySelector('#continueGameButton')
            ?.hasAttribute('hidden'),
          readyState: document.readyState
        }))
      );
    } catch {
      // Diagnostic failure must not replace the original assertion.
    }
  } finally {
    try {
      await page.evaluate(() => window.releaseStartupDrawing());
    } catch (error) {
      if (!failure) failure = error;
    }
  }
  if (failure) throw failure;
  await expect(page.locator('#highScore')).toHaveText('High Score: 4300');
  await writer.evaluate(() => {
    localStorage.clear();
  });
  await expect(page.locator('#highScore')).toHaveText('High Score: 0');
});
