// Exposes the private manager only in the intercepted test response.
import { test, expect } from './fixtures.js';

test('refused record and withdrawal writes keep prior bytes and hide Continue on the page [STA-4] [SAF-2]', async ({
  page
}) => {
  await page.route('**/script.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\nwindow.testGame = gameManager;`
    });
  });
  await page.goto('/');
  await page.locator('#newGameButton').click();
  await page.locator('#playPauseButton').click();
  const a = await page.evaluate(() =>
    localStorage.getItem('tetris.savedGameSession')
  );
  await page.locator('#playPauseButton').click();
  await page.evaluate(() => {
    const storage = window.testGame.storage;
    window.testGame.storage = {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => {
        if (key === 'tetris.savedGameSession') throw new Error('refused');
        storage.setItem(key, value);
      }
    };
  });
  await page.locator('#playPauseButton').click();
  const saved = await page.evaluate(() => ({
    bytes: localStorage.getItem('tetris.savedGameSession'),
    flag: localStorage.getItem('tetris.isSessionSaved'),
    available: window.testGame.isSessionSaved,
    state: window.testGame.state,
    faults: window.testGame.faults.length
  }));
  expect(saved).toEqual({
    bytes: a,
    flag: null,
    available: false,
    state: 'paused',
    faults: 0
  });
  // Present the main menu without resetting storage or the local latch.
  await page.evaluate(() => {
    window.testGame.guard(() => {
      window.testGame.state = 'gameOver';
    });
  });
  await expect(page.locator('#continueGameButton')).toHaveCount(1);
  await expect(page.locator('#continueGameButton')).toBeHidden();
});

test('invalid content never offers Continue and is withdrawn during availability checking [STA-4] [SAF-1]', async ({
  page
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('tetris.isSessionSaved', 'true');
    localStorage.setItem('tetris.savedGameSession', '{invalid');
  });
  await page.goto('/');
  await expect(page.locator('#continueGameButton')).toHaveCount(1);
  await expect(page.locator('#continueGameButton')).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('tetris.isSessionSaved'))
    )
    .toBe('false');
  expect(
    await page.evaluate(() => localStorage.getItem('tetris.savedGameSession'))
  ).toBe('{invalid');
});
