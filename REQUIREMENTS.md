# Requirements

Every behavior of the game is written down here with an ID. Every test names the requirements it verifies in its title, for example `clearing 4 lines at once scores 800 [SCO-1]`. `test/traceability.test.js` fails the build if a requirement has no test, or a test names a requirement that does not exist, or a test names none.

Unit tests live in `test/`, browser tests in `e2e/`. To list the tests for a requirement, search for its ID, for example `grep -rn "SCO-1" test e2e`.

## Pieces and board

| ID | Requirement |
| --- | --- |
| PCE-1 | The board is 10 columns by 20 rows. Positions outside it hold nothing. |
| PCE-2 | There are seven pieces (I, O, T, S, Z, J, L), each made of four blocks, with the standard Super Rotation System (SRS) rotation states and fixed colors. |
| PCE-3 | A new piece appears in its first rotation, horizontally centered, in the top two rows. |
| PCE-4 | Rotation is clockwise, trying the SRS wall kicks in order. If every clockwise kick is blocked, counterclockwise is tried the same way. If nothing fits, the piece is unchanged. The O piece does not rotate. |
| PCE-5 | Pieces are dealt from a shuffled bag of all seven, so each appears once per seven. The random source can be replaced (for tests). |
| PCE-6 | A piece can never be outside the board or overlap a locked block. |

## Play

| ID | Requirement |
| --- | --- |
| PLY-1 | Moving left or right shifts the piece one column when that space is free. |
| PLY-2 | Gravity moves the piece down one row every max(0.25, 0.7 - 0.02 × (level - 1)) seconds while playing. |
| PLY-3 | Soft drop moves the piece down one row and restarts the gravity timer. |
| PLY-4 | Hard drop moves the piece straight to where it would land and locks it at once. |
| PLY-5 | The ghost piece shows where the current piece would land. |
| PLY-6 | A piece that lands locks after 0.5 seconds. Moving or rotating it while it rests restarts that delay, at most 15 times; reaching a lower row than before resets the count; moving off a ledge cancels the delay; once the 15 are used, landing locks at once. |
| PLY-7 | Hold puts the current piece aside in its starting state and brings in the held piece, or the next piece if none is held. Hold works once per piece. |
| PLY-8 | The next three pieces are always known and shown. |

## Scoring

| ID | Requirement |
| --- | --- |
| SCO-1 | Clearing 1, 2, 3 or 4 lines at once scores 100, 300, 500 or 800. Cleared rows disappear and everything above moves down. |
| SCO-2 | The level is the score divided by 1000, rounded down, plus 1. |
| SCO-3 | The high score is stored on the device and only replaced by a higher score. |

## Game states

| ID | Requirement |
| --- | --- |
| STA-1 | The game opens at game over. New Game works only from game over and resets the board, score, level, held piece and queue. |
| STA-2 | Pause works only while playing and resume only while paused. While paused nothing moves: no gravity, no lock delay, no input. Pausing during the lock delay cancels it and counts as one reset. |
| STA-3 | The game ends when a new or held piece has no room to appear. All timers stop and the saved game is forgotten. |
| STA-4 | Pausing saves the game, and so does clearing lines. Continue, from game over only, restores exactly what was saved, paused. |
| STA-5 | The game pauses when the page is hidden, for example when switching apps. |

## Safety

| ID | Requirement |
| --- | --- |
| SAF-1 | A saved game is untrusted input. Every field is checked and pieces are rebuilt from the built in definitions. Any invalid save is rejected whole and forgotten, never partly loaded. |
| SAF-2 | Storage that is missing, blocked, full, or throws on reads or writes never stops the game. Invalid stored values are ignored. |
| SAF-3 | If anything in the engine throws, the game stops in a safe state (game over, no timers running), the fault is reported, and the last good save is kept. |
| SAF-4 | After every action and every timer the engine checks its invariants: board 20 by 10, three pieces queued, a valid score, and while playing the piece fits and gravity is running, otherwise no timers run. A broken invariant is handled like SAF-3. Legal play never breaks one. |
| SAF-5 | An error while drawing or reading a gamepad is reported and the drawing and polling loops keep running. |
| SAF-6 | The rules hold throughout long random play: no overlaps, valid scores and levels, no faults. |

## Input

| ID | Requirement |
| --- | --- |
| INP-1 | Keys: A or Left moves left, D or Right moves right, W or Up rotates, S or Down hard drops, H holds, P or Escape pauses and resumes, Enter starts a new game, C continues. |
| INP-2 | Holding a move key moves once, then again after 167 ms, then every 33 ms. The newest direction wins; releasing it goes back to the one still held. Repeating stops when the game stops playing or the window loses focus. |
| INP-3 | Keys pressed with Cmd, Ctrl or Alt, and the keyboard's own key repeat, are ignored. Game keys do not trigger the browser's default action (such as scrolling). |
| INP-4 | Gamepad (standard mapping): A hard drops, B rotates, X holds, Y continues, Menu pauses or starts a new game at game over. Buttons act once per press. The stick moves with the same repeat timing as keys; stick down soft drops every 50 ms. A resting stick does not cancel keyboard moves. Disconnecting releases everything. |
| INP-5 | Touch: a tap on the board rotates, allowing 10 px of finger wobble. Dragging sideways moves one column per cell, starting after half a cell; dragging down soft drops one row per cell. The piece stays on the grid and in step with the finger, even after pushing into a wall. A drag only controls the piece that was falling when it began. Tapping the hold box holds. |
| INP-6 | Touch: a quick flick down on the board hard drops the piece. In the last 100 ms before the finger lifts it must cover at least one cell, more down than sideways, at 1 px per ms or faster. A drag that is slower, or comes to rest before lifting, only soft drops. A flick only drops the piece that was falling when the gesture began. |

## Display

| ID | Requirement |
| --- | --- |
| DSP-1 | In portrait on a phone the whole game fits the screen with no scrolling, and the board keeps a 1:2 shape. |
| DSP-2 | Canvases draw at the screen's full pixel resolution and redraw correctly after the window changes size. |
| DSP-3 | While nothing changes, nothing is redrawn, storage is not read again, and the page does not wake up every frame, to save battery. |
| DSP-4 | The page cannot be zoomed, scrolled by touch, or have its text selected. |
| DSP-5 | The score, high score, buttons and hints always match the game state. |
| DSP-6 | Pieces are drawn in the Display P3 color space using their usual color values, so they look more vivid on iPhone screens. Saved games keep the usual colors. |
| DSP-7 | The screen stays on while playing. Pausing or game over lets it sleep again. If the wake lock is unsupported or refused, the game plays normally. |

## App

| ID | Requirement |
| --- | --- |
| APP-1 | The game can be installed to the home screen and opens full screen with its own icon. |
| APP-2 | After the first visit the game opens from its cached copy straight away, online or offline. A new version is downloaded in the background and used from the next launch. |
| APP-3 | Every file the page uses exists and is referenced by a relative path, so the game works from any folder (GitHub Pages serves it from /tetris-js/). The local server serves each file with the right type. |
| APP-4 | The game supports iOS 27 (Safari 27) and later, on the iPhone 14 Pro Max and newer, in portrait. |
| APP-5 | The page asks for all of its scripts at once rather than one import level at a time, so it starts faster. |

## Process

| ID | Requirement |
| --- | --- |
| QA-1 | Every requirement is verified by at least one test, every test names the requirements it verifies, and those requirements exist. |
| QA-2 | The unit tests exercise every line, branch and function of the game logic (`public/game/`). `npm test` fails below 100%. Code that cannot be reached is removed rather than left untested. |
| QA-3 | The browser tests exercise every line, branch and function of the page script (`public/script.js`), measured in Chromium. `npm run test:e2e` fails below 100%. |
| QA-4 | The browser tests pass in WebKit (Safari's engine) at iPhone size, as well as in Chromium at iPhone and desktop sizes. |
| QA-5 | Everything the browser loads (`public/`) passes TypeScript's strictest type checks, with types written as comments in the JavaScript. `npm run typecheck` runs before the tests in CI. |
| QA-6 | Mutation testing (Stryker) of the game logic leaves no mutant alive: every small wrong change to `public/game/` is caught by a failing test, or makes the tests run past the time limit (for example a piece with no blocks, whose ghost falls forever). Loops in tests are bounded, so a broken game fails a test rather than hanging it. A mutant that cannot change behavior is marked in the code with the reason. `npm run test:mutation` fails if any survive, and runs weekly in CI. |
