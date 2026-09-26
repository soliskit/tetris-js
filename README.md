# Tetris

Tetris for your web browser. The game logic is a JavaScript port of the Swift Tetris 2.0 app, served as static files by a small Express server.

**Play it now: https://soliskit.github.io/tetris-js/**

## Getting started

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Then open http://localhost:3000. Set the `PORT` environment variable to use a different port.

## Deployment

The game is fully static, so the `public` folder is published to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`, after the tests pass. To enable it, set **Settings > Pages > Source** to **GitHub Actions**. The game is then served at https://soliskit.github.io/tetris-js/.

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
  style.css                  Styles
  script.js                  Canvas rendering, touch input and UI wiring
  game/
    gameManager.js           Game engine: gravity, locking, scoring, save and restore
    gameState.js             Game states, player actions and board helpers
    tetromino.js             Piece model, rotation and collision checks
    tetrominoFactory.js      7 bag randomizer, piece shapes and wall kick data
    position.js              Board position helpers
    inputController.js       Keyboard and gamepad input
test/
  game.test.js               Engine tests
```

The engine takes injectable storage, scheduler and piece factory objects, so it runs in Node without a browser.

## Tests

```sh
npm test
```

Tests use the built in `node:test` runner and need no extra dependencies.
