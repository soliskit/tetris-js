# Tetris

Tetris for your web browser. Built with plain JavaScript and served as static files by a small Express server.

**Play it now: https://soliskit.github.io/tetris-js/**

## Getting started

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Then open http://localhost:3000. Set the `PORT` environment variable to use a different port.

## Deployment

The game is fully static, so the `public` folder is published to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`, after the unit and browser tests pass. To enable it, set **Settings > Pages > Source** to **GitHub Actions**. The game is then served at https://soliskit.github.io/tetris-js/.

## Features

* 10 by 20 board with a ghost piece showing where the current piece will land
* 7 bag randomizer so every piece appears once per bag
* Super Rotation System wall kicks
* Hold piece (once per drop) and a preview of the next three pieces
* Lock delay of 0.5 seconds, reset by moving on the surface up to 15 times
* Scoring of 100, 300, 500 and 800 points for 1 to 4 lines
* Level rises every 1000 points, speeding up gravity from 0.7s down to 0.25s per row
* High score and paused games are saved in `localStorage`, so you can continue later
* The game pauses automatically when the tab is hidden
* Installable as an app: use Add to Home Screen (iPhone, Android) or the install button in the address bar (desktop Chrome and Edge) to play full screen without the browser bar, even offline

## Controls

### Keyboard

| Action | Keys |
| --- | --- |
| Move left / right | A / D or Left / Right arrows |
| Rotate | W or Up arrow |
| Hard drop | S or Down arrow |
| Hold | H |
| Pause | P or Esc |
| New game | Enter |
| Continue saved game | C |

Holding a move key repeats the move (167ms delay, then every 33ms).

### Gamepad

Any controller with the standard mapping works through the Gamepad API.

| Action | Input |
| --- | --- |
| Move left / right | Left stick |
| Soft drop | Left stick down |
| Hard drop | A |
| Rotate | B |
| Hold | X |
| Continue saved game | Y |
| Pause or new game | Menu / Start |

### Touch and mouse

* Drag sideways on the board to move the piece
* Drag down to soft drop
* Tap the board to rotate
* Tap the hold preview to hold
* Use the on screen buttons for new game, continue and pause

## Project structure

```
index.js                     Express server for the public folder
public/
  index.html                 Page layout
  manifest.webmanifest       App name, icons and display mode for installing
  sw.js                      Service worker that caches the game for offline play
  icons/                     App icons (icon.svg is the source for the PNGs)
  style.css                  Styles
  script.js                  Canvas rendering, touch input and UI wiring
  game/
    gameManager.js           Game engine: gravity, locking, scoring, save and restore
    gameState.js             Game states, player actions and board helpers
    tetromino.js             Piece model, rotation and collision checks
    tetrominoFactory.js      7 bag randomizer, piece shapes and wall kick data
    position.js              Board position helpers
    session.js               Saving games, and checking saved games before loading them
    inputController.js       Keyboard and gamepad input
test/                        Unit tests (node:test): engine, pieces, input, server, app files
e2e/                         Browser tests (Playwright): the real page at iPhone and desktop sizes
playwright.config.js         Browser test setup
scripts/browser-coverage.js  Browser coverage report and 100% check for the page script
REQUIREMENTS.md              Every behavior, with an ID that tests trace to
```

The engine takes injectable storage, scheduler and piece factory objects, so it runs in Node without a browser.

## Reliability

The game is built the way safety critical software is:

* **Written requirements.** [REQUIREMENTS.md](REQUIREMENTS.md) lists every behavior with an ID. Each test names the requirements it verifies, and a test fails the build if any requirement is untested or any test is untraced.
* **Full coverage.** The unit tests run every line, branch and function of the game logic, and the browser tests do the same for the page script (`public/script.js`, measured in Chromium). `npm test` and `npm run test:e2e` fail below 100%, so untested code cannot be added. Code that can never run is removed instead of left untested. After a browser test run, `coverage/browser-report/index.html` shows the page script line by line.
* **Untrusted saves.** Saved games are checked field by field before loading, and pieces are rebuilt from the built in shapes. A corrupted or edited save is refused whole.
* **Fault containment.** Every action and timer runs inside a guard. If anything throws, or the game's invariants break (board size, piece overlap, score, timers), the game stops safely at game over, reports the fault and keeps the last good save. Drawing and gamepad loops recover from errors on the next frame. Blocked or full storage never stops play.
* **Fault injection tests** prove each of these by breaking things on purpose.

## Tests

```sh
npm test            # unit tests, about a second
npm run test:e2e    # browser tests
npm run test:all    # both
```

**Unit tests** use the built in `node:test` runner. They cover every piece and rotation, wall kicks, the 7 bag, all game rules (movement, gravity, lock delay, line clears, scoring, levels, hold, pause, continue, game over, storage failures) with a fake clock, keyboard and gamepad input with mocked timers, the Express server, and the page, manifest, service worker and icons.

**Browser tests** use Playwright. They run three times: in WebKit (Safari's engine) and Chromium sized like an iPhone 14 Pro Max with touch, and in Chromium at desktop size. In WebKit, finger drags are driven with the mouse, since the game reads both through the same pointer events, and the pinch and install checks run in Chromium only. They cover starting, pausing, continuing and ending games, keyboard and touch controls, the layout fitting the screen, drawing, zoom blocking, installing and playing offline. Saved games in `localStorage` set up exact board positions. The first time, install the browsers with `npx playwright install --with-deps chromium webkit`. Playwright's WebKit is close to Safari but is not a real iPhone, so check touch feel on a device too.

Both suites run on every pull request and before every deploy.
