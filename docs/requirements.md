# Tetris Requirements

The game's behavior, safeguards, and rules for changing them.

Each behavior has an ID. Tests name the IDs they check, such as `[SCO-1]`
for scoring. The traceability test fails the build if an ID has no test,
a test names an unknown ID, or a test names none. This checks the link
between requirements and test titles, not whether an assertion proves a rule.

Unit tests live in `test/`; browser tests live in `e2e/`. Search both for
an ID to find its tests, for example `grep -rn "SCO-1" test e2e`.

SRS wall kicks are the ordered small position adjustments the Super
Rotation System tries to make a rotation fit. This explanation is not
part of the requirement text.

## Rules for changes

1. Behavior changes are written down. What the player sees, does, saves, or can load changes only when this file changes in the same commit.
2. Protection does not shrink. A runtime check, or the test that proves it works, is loosened only when a requirement changes, and then it is replaced by whatever protection the new rule needs, if any. Otherwise a test must show the same input gets the same result at the same boundary. Types do not count as evidence.
3. Only what is described is protected. Behavior that no requirement and no test describes has no guarantee.

### Classifying changes

Each change to game code (anything under public/) or to a requirement row is one or more of these, and each kind needs its own evidence.

| Class | What changes | Evidence |
| --- | --- | --- |
| Refactor | Code, not behavior | Requirement rows stay unchanged and tests pass. Tests change only to follow renamed or moved code, never to expect different behavior. |
| Bug Fix | Code, to match an existing requirement | A test for that requirement that failed before the fix |
| Intentional Change | Code and requirements | Requirement rows edited in the same commit, with tests updated to match |
| Clarification | Requirements, to describe what the game already does | The new rows and their tests |


A change to neither code nor requirement rows needs no kind. The three rules still apply: weakening a test falls under rule 2, and the gates QA-1 to QA-6 are never lowered or removed, except for the one test named in "Exception for the second-finger test" below.

### Exception for test cuts 3-6

Rule 2 has one exception for the four unit-test cuts below. This is permission to give up these specific witnesses, not a claim that a kept test proves the same input at the same boundary. It permits no other runtime-check or test removal. Application behavior requirements and QA-1 to QA-6 stay unchanged.

| Cut | Removed test | Specific witness given up | Kept evidence and its limit |
| --- | --- | --- | --- |
| 3 | `an error inside a timer stops the game safely and is reported [SAF-3]`, the lock-delay-timer variant in `test/safety.test.js` | An error entering the safe-stop-and-report guard from the lock-delay timer while a piece is landing | The gravity-timer test checks the shared schedule-and-guard route and reported message. Player-action and post-fault tests stay. This is not the same lock-delay landing input. |
| 4 | `the Escape that pauses releases held input [STA-2]` in `test/inputController.test.js` | Escape's held-input-release witness | Kept P-key and gamepad Menu tests exercise the shared pause-release path. Escape keeps pause-toggle and dialog tests. A different pause key is not the same Escape input. |
| 5 | `auto repeat stops once the game is no longer playing [INP-2]` in `test/inputController.test.js` | The direct assertion that KeyD held through 1,000 ms paused produces no repeat | A kept test holds KeyD through 200 ms paused and later checks the unreset full action history. This is indirect evidence, not the removed pause-time assertion. Gamepad pause and after-resume pause-release tests stay. |
| 6 | `losing window focus stops the soft drop key [INP-2]` in `test/inputController.test.js` | A repeating soft-drop key stops on window blur | The kept `losing window focus releases every held key [INP-2]` test checks that a repeating move key stops and is forgotten on blur. KeyA is not the removed KeyS soft-drop input. |

Each cut needs a filled PR description, 100% line, branch and function coverage, mutation score 100 across all seven game files on the PR's exact head, and independent review of that head by someone other than its author, named to the owner before merge. Mutants that only make tests run too long count as caught under the existing gate. A failed required check stops that cut, with no retry, repair or automatic rollback. A surviving fault means the cut does not merge and the test stays. Passing these checks is not proof that the removed specific witness is still present.

The first PR uses the existing No Class Needed classification because no game code or requirement rows change. It must separately state this new policy-prose exception plainly. There is no new class and no exception for later work.

### Exception for the second-finger test
QA-4 requires the browser tests to pass in WebKit at iPhone size. This exception is for exactly one test: `a second finger on the board does nothing: the first keeps its drag, and neither lift is a tap [INP-5]` in `e2e/touch.spec.js`. It is not a pass. That test does not run in WebKit or on the desktop project, and it does not verify Safari or real-device behavior.

The current test setup sends two fingers at once only through Chromium's DevTools touch input. The desktop project has no touch. The test runs, and must pass, in Chromium at iPhone size.

The exception covers only those two skipped project runs. They are named in `.github/expected-browser-skips.txt`, and the browser skip limit in `.github/workflows/pages.yml` is 29 so that these two entries fit. It covers no other test, no other skip and no later test. The seven WebKit skips already on that list are not reviewed or approved here. The wording of QA-1 to QA-6 does not change.

## Pieces and board

| ID | Requirement |
| --- | --- |
| PCE-1 | The board is 10 columns by 20 rows. Positions outside it hold nothing. |
| PCE-2 | There are seven pieces (I, O, T, S, Z, J, L), each made of four blocks, with the standard Super Rotation System (SRS) rotation states and fixed colors. |
| PCE-3 | A new piece appears in its first rotation, horizontally centered, in the top two rows. |
| PCE-4 | Rotation turns the piece clockwise or counterclockwise, trying that direction's SRS wall kicks in order. If every kick is blocked, the other direction is tried the same way. If nothing fits, the piece is unchanged. The O piece does not rotate. |
| PCE-5 | Pieces are dealt from a shuffled bag of all seven, so each appears once per seven. Every new game starts with a full bag, so its first seven pieces are all different. The random source can be replaced (for tests). |
| PCE-6 | A piece can never be outside the board or overlap a locked block. |

## Play

| ID | Requirement |
| --- | --- |
| PLY-1 | Moving left or right shifts the piece one column when that space is free. |
| PLY-2 | Gravity moves the piece down one row every max(0.25, 0.7 - 0.02 × (level - 1)) seconds while playing. |
| PLY-3 | Soft drop moves the piece down one row and restarts the gravity timer. |
| PLY-4 | Hard drop moves the piece straight to where it would land and locks it at once. |
| PLY-5 | The ghost piece shows where the current piece would land. |
| PLY-6 | A piece locks 0.5 seconds after it comes to rest on the floor or a block, however it got there: falling, moving, turning, appearing, or play resuming. Moving or rotating it while it rests restarts that delay, at most 15 times; reaching a lower row than before resets the count; moving off a ledge cancels the delay; once the 15 are used, landing locks at once. |
| PLY-7 | Hold puts the current piece aside in its starting state and brings in the held piece, or the next piece if none is held. Hold works once per piece. |
| PLY-8 | The next three pieces are always known, and shown while a game is in play or paused. |

## Scoring

| ID | Requirement |
| --- | --- |
| SCO-1 | Clearing 1, 2, 3 or 4 lines at once scores 100, 300, 500 or 800. Cleared rows disappear and everything above moves down. |
| SCO-2 | The level is the score divided by 1000, rounded down, plus 1. |
| SCO-3 | The high score is stored on the device and only replaced by a higher score. |

## Game states

| ID | Requirement |
| --- | --- |
| STA-1 | The game opens at game over. New Game works from game over, or while paused to give up that game, never while playing. It resets the board, score, level, held piece, queue and bag, and forgets the saved game. While paused it first asks in a dialog ("Start a new game? This game will be lost."), so one stray press cannot end a game: New Game in the dialog gives the game up, while Cancel, Escape, a click outside the dialog, or any other action before the answer keeps it paused; a click inside the dialog, away from its buttons, does nothing. Cancel is selected when it opens, so a second Enter keeps the game, and the selected button is always highlighted. While the dialog is open, keys go to its buttons, the left and right arrow keys move between them, and a held key repeating presses nothing. |
| STA-2 | Pause works only while playing and resume only while paused. While paused nothing moves: no gravity, no lock delay, no input. Pausing during the lock delay cancels it and counts as one reset, and resuming starts it again. Pausing releases held keys and buttons: movement and soft drop stop at once, and a key, button or stick direction still held when play resumes does nothing until it is let go and pressed again. |
| STA-3 | The game ends when a new or held piece has no room to appear. All timers stop and the saved game is forgotten. |
| STA-4 | Pausing saves the game, and so does clearing lines. Continue, from game over only, restores exactly what was saved, paused, including the pieces left in the bag. If forgetting the saved game fails because storage refuses the write, it still counts as forgotten for the rest of the session: Continue is not offered until the page reloads or a new save succeeds. |
| STA-5 | The game pauses when the page is hidden, for example when switching apps. |
| STA-6 | Only the current saved-game format loads. Older formats are refused. A saved game stored under the names used before APP-6 (without the `tetris.` prefix) is not read. |

## Safety

| ID | Requirement |
| --- | --- |
| SAF-1 | A saved game is untrusted input. Every field is checked and pieces are rebuilt from the built in definitions. Any invalid save is rejected whole and forgotten, never partly loaded. |
| SAF-2 | Storage that is missing, blocked, full, or throws on reads or writes never stops the game. Invalid stored values are ignored. |
| SAF-3 | If anything in the engine throws, the game stops in a safe state (game over, no timers running), the fault is reported, and the last good save is kept. |
| SAF-4 | After every action and every timer the engine checks its invariants: board 20 by 10, three pieces queued, a valid score, and while playing the piece fits, gravity is running and the lock delay runs exactly while the piece rests, otherwise no timers run. A broken invariant is handled like SAF-3. Legal play never breaks one. |
| SAF-5 | An error while drawing or reading a gamepad is reported and the drawing and polling loops keep running. |
| SAF-6 | The rules hold throughout long random play: no overlaps, valid scores and levels, no faults. |

## Input

| ID | Requirement |
| --- | --- |
| INP-1 | Keys: A or Left moves left, D or Right moves right, W or Up rotates clockwise, Z rotates counterclockwise, S or Down soft drops, Space hard drops, H holds, P or Escape pauses and resumes, Enter starts a new game, C continues. |
| INP-2 | Holding a move key moves once, then again after 167 ms, then every 33 ms. The newest direction wins; releasing it goes back to one still held, on the keyboard, the stick or the directional pad. Holding S or Down soft drops a row at once, then every 50 ms, and a resting stick does not cancel it. Repeating stops when the game stops playing or the window loses focus. |
| INP-3 | Keys pressed with Cmd, Ctrl or Alt, and the keyboard's own key repeat, are ignored. A key pressed with Cmd, Ctrl or Alt never counts as held, because macOS may not report its release. Game keys do not trigger the browser's default action (such as scrolling). |
| INP-4 | Gamepad (standard mapping): A hard drops, B rotates, X holds, Y continues, Menu pauses or starts a new game at game over, and View starts a new game. While the pause screen asks to confirm a new game, left and right on the directional pad or stick move between Cancel and New Game, once per push, A presses the one selected and B cancels; nothing else acts. The right shoulder button also rotates and the left one rotates counterclockwise. Buttons act once per press, and two buttons for the same action pressed together act once. Menu and View act alone: other buttons pressed at the same moment do nothing, so A cannot hard drop the first piece of a game Menu just started, and if Menu and View are pressed together, Menu acts. Moving and soft dropping with the stick or directional pad carry on as held. The stick and the directional pad move with the same repeat timing as keys; holding either down soft drops every 50 ms, and up on the directional pad hard drops. A resting stick or pad does not cancel keyboard moves, and letting either go back to the middle returns to a move key still held. Disconnecting releases everything. |
| INP-5 | Touch: a tap on the board rotates, allowing 10 px of finger wobble. Dragging sideways moves one column per cell, starting after half a cell; dragging down soft drops one row per cell. The piece stays on the grid and in step with the finger, even after pushing into a wall. A drag only controls the piece that was falling when it began. While a drag is under way, a second finger on the board does nothing to the piece, and the gesture does not count as a tap. Tapping the hold box holds. |
| INP-6 | The hold box is a button to keyboards and screen readers: Tab reaches it, it is named Hold with H as its shortcut, and with keyboard focus Enter or Space hold while playing. Clicking it does not take focus, so those keys keep their game actions. |

## Display

| ID | Requirement |
| --- | --- |
| DSP-1 | In portrait on a phone the whole game fits the screen with no scrolling, and the board keeps a 1:2 shape. The board keeps one size whether the game is starting, playing, paused or over. |
| DSP-2 | Canvases draw at the screen's full pixel resolution and redraw correctly after the window changes size. |
| DSP-3 | While nothing changes, nothing is redrawn (the engine counts changes to the locked blocks, so the page knows when they need drawing), storage is not read again, and the page does not wake up every frame, to save battery. |
| DSP-4 | The page cannot be zoomed, scrolled by touch, or have its text selected. Quick taps never zoom it in Safari, and the second of two quick taps still works. If Safari zooms in anyway, or opens the page still zoomed after a reload, its pinch and double tap work again, so the player can zoom back out. |
| DSP-5 | The score, high score, buttons and hints always match the game state, including changes made in another tab. |
| DSP-6 | Pieces are drawn in the Display P3 color space using their usual color values, so they look more vivid on iPhone screens. Each canvas gets its drawing context as the page starts, so nothing else can change its color space first, and draws vivid colors only if it really is Display P3. Saved games keep the usual colors. |
| DSP-7 | The screen stays on while playing. Pausing or game over lets it sleep again. If the system takes the wake lock back during play, the game asks for it again. If the wake lock is unsupported or refused, the game plays normally. |
| DSP-8 | At game over the board shows only the locked blocks, with no falling piece, ghost, held or upcoming pieces, since a new game deals its own. So the page opens to an empty board. Once a game ends, Game Over shows over the board until a new game starts or a saved one is continued, and screen readers announce it. |

## App

| ID | Requirement |
| --- | --- |
| APP-1 | The game can be installed to the home screen and opens full screen with its own icon. |
| APP-2 | After the first visit the game opens from its cached copy straight away, online or offline. A new version is downloaded in the background and used from the next launch, and only once every file of it has downloaded. A page loads every file from the version it opened with, even if a newer one finishes downloading while it loads, so the game never runs a mix of two versions. |
| APP-3 | Every file the page uses exists and is referenced by a relative path, so the game works from any folder (GitHub Pages serves it from /tetris-js/). The local server serves each file with the right type. |
| APP-4 | The game supports iOS 27 (Safari 27) and later, on the iPhone 14 Pro Max and newer, in portrait. |
| APP-5 | The page asks for all of its scripts at once rather than one import level at a time, so it starts faster. |
| APP-6 | GitHub Pages serves every project of an account from one origin, which they all share storage and caches with, so the game touches only its own: it stores the high score and saved game under names of its own, and deletes only caches it made. |

## Detailed rules

The detailed rules behind the requirement rows above: the valid-state rules for positions, pieces, controls, scores and saved data; how saving, withdrawal and reading behave; storage trust, fault reporting and timer scope; what the queue safety check must verify; and recorded gaps and defects.

### Valid game state

The selected rules for positions, pieces, controls, scores, and saved data, defined independently of the implementation.

**B1. Scope.** These predicates define a valid state for the opening state and every committed state other than the SAF-3 safe terminal state, which keeps its own definition (SAF-3). Each predicate is evaluated on one state alone.

**B2. Conventions.** Rows 0 at the top to 19 at the bottom, columns 0 to 9; a lower row has a larger number. The kinds are I, O, T, S, Z, J and L. The rotation states of each kind are the geometry of the adopted external geometry reference: the image `SRS-pieces.png` from the Tetris Wiki (1218 bytes, SHA-256 5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236) and the table of its states extracted from that image (SHA-256 c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c). The reference is the fixed bytes identified by those checksums, not the content of any web page. It gives geometry only; wall-kick data is not part of it. In the reference each state is a set of four cells (row, column) in a box that is 4 by 4 for I, 2 by 2 for O and 3 by 3 for the other kinds, rows increasing downward and columns increasing to the right. The position of a piece is the board position of the top-left cell of its box. A block at box cell (row, column) occupies the board cell (position row + row, position column + column). The two files are retained in the repository at `docs/sources/1-SRS-pieces.png` and `docs/sources/2-srs_table.txt`. Neither governs the other. If the table and the image disagree about any state of any kind, the reference is inconsistent: no state of that kind is defined by it until it is decided. A kind has four rotation states in the table's order, spawn state first and then each clockwise rotation, except that the O kind has one valid rotation state, its first (PCE-4).

**B3. Representation.** Validity is defined on semantic values: whole numbers, ordered lists and finite maps. A representation is valid only if it denotes exactly one value of the item's domain. A missing or extra entry in a collection, a sparse collection, a missing row or cell, or a value of another type is not valid. No numeric format limit is part of these rules.

**B4. Game mode.** Exactly one of playing, paused and game over.

**B5. Board.** Exactly 20 rows of 10 positions; each is empty or a locked block. A locked block identifies one of the seven kinds.

**B6. Current falling piece.** Playing or paused: exactly one, with a kind, one of that kind's valid rotation states and a whole-number position, all four blocks on the board and on empty positions (PCE-6). Game over (ordinary): there is no semantic current falling piece. The held piece, hold-used, the bag and the touch-drag state also have no semantic value (B8, B10, B12). The piece kind, the row and column coordinates, the orientation, the lowest row reached (B9) and the reset count (B9) have no semantic value. An implementation is not required to clear a field that holds such a value. The attempted new or held piece that had no room is not a semantic current piece merely because it caused game over. No ordinary-piece validity is imposed on the SAF-3 safe terminal state. A malformed value is invalid in every mode.

**B7. Upcoming pieces.** In every mode, three valid semantic pieces, each one of the seven kinds. The SAF-4 runtime-check interpretation is settled under "Queue piece check" below.

**B8. Held piece and hold-used.** The held piece is none or one of the seven kinds. Hold-used represents whether Hold is unavailable for the current piece. A New Game begins with Hold available. Continue restores the saved semantic value. Playing or paused: held is none or a kind; hold-used is true or false. Game over: the held piece and hold-used have no semantic value, and an implementation is not required to clear a field that holds one. Interpretation of PLY-7 ("Hold works once per piece"), per lock cycle: Hold is available at the start of a lock cycle; any successful Hold consumes that availability; a piece brought in by that Hold does not make Hold available again; availability returns when the next piece becomes the current falling piece after the current lock cycle ends.

**B9. Lowest row and reset count.**

*B9.1 Validity predicates (the values; they stand alone on one state).*

Values. Playing or paused: the lowest row reached is a whole number from 0 to 19 and is at least the greatest row occupied by any block of the current falling piece. The reset count is a whole number from 0 to 16. A reset count of 16 is valid only when the game is paused and the current falling piece is resting (B14). It is not valid in a playing state, for a piece that is not resting, or when there is no current falling piece. Game over: no semantic lowest row and no semantic reset count (B6).

*B9.2 Meaning and operation rules (what the values denote and how legal operations change them; separate from B9.1, and not a validity predicate on one state).*

Lowest row reached. It is the greatest board-row index occupied by any block of the current falling piece during its time as the current piece, with rows increasing downward. When a piece becomes the current falling piece it is the greatest row occupied by that piece's four blocks in its initial valid state, and a different piece becoming current starts a new value. After a valid move, rotation or fall of that piece, if its current greatest occupied row is greater than the stored value, the stored value becomes that row and the reset count becomes 0. Moving or rotating upward never decreases it. Returning to a row already reached does not reset the count. A move or rotation that would both restart the lock delay and reach a new lowest row sets the reset count to 0 and does not increment it.

Reset count. It counts reset events since the most recent lowest-row reset. The values 0 to 15 count events within the 15-restart allowance of PLY-6. The value 16 does not represent a 16th restart. It marks a pause taken during the lock delay after the 15 were used.

Reset count when a piece becomes the current falling piece. A piece becomes the current falling piece at the start of a game, when the next piece appears after a lock, and when Hold brings a piece in. At that moment the reset count is 0 and the lowest row reached is the greatest row occupied by that piece in its initial valid state. A pause and its resume do not make a piece current. Continue restores the saved reset count and lowest row exactly and does not apply this rule. A saved game in a released format required by STA-6 takes its saved reset count; the lowest row is given by L1 only when it is missing from the save, and a legacy paused, resting save with count 15 is handled by L2 only when it carries no information distinguishing a pause that took the count from 14 to 15 from a pause taken after the 15 were used (B16).

Resting piece, count below 15. A legal move or rotation that leaves the piece resting and reaches no new lowest row adds 1 to the count and restarts the 0.5-second lock delay. The step from 14 to 15 is the 15th restart.

Resting piece, count 15. A legal move or rotation is permitted. If the piece remains resting and reaches no new lowest row, the delay is not restarted and the already running lock deadline continues. Moving off a ledge cancels the delay. If a piece at count 15 whose delay was canceled comes to rest again without reaching a new lowest row, it locks at once (PLY-6).

Pause. A pause during the lock delay cancels the delay and counts as one reset (STA-2). If the count is 14 or less, the count increases by 1, and on resume a resting piece starts the 0.5-second delay again. If the count is 15, the paused, resting state records count 16, and on resume the piece locks at once and the delay is not restarted. A resume from a paused, resting piece with count 15 starts the delay. A pause when the piece is not in a lock delay is not a reset.

**B10. Bag.** Playing or paused: an ordered sequence of distinct kinds; the empty sequence is valid. Game over: the bag has no semantic value, and an implementation is not required to clear a field that holds one.

**B11. Score.** In every mode, a whole number of zero or more, with no divisibility condition. SAF-4 says "valid score" without defining it; this choice is made here once.

**B12. Control state.**
- Confirmation pending: yes or no; yes only while paused. Selected choice: Cancel or New Game while pending; absent otherwise.
- Held directions: the held controls, one token per physical control (for example keyboard A, keyboard Left, stick, pad Left). Held horizontal tokens form an ordered sequence from oldest to newest by the time each became held, each with a direction left or right; the newest-direction rule is that the direction of the last token wins, and releasing a token removes it, so the last remaining token wins. Example: A(left), D(right), Left(left), then release Left leaves A, D, and D wins. Held soft-drop tokens are a set. Tokens of the same direction are all remembered.
- Repeat position: for moves, not repeating, waiting for the first repeat, or repeating; for soft drop, not dropping or dropping. Anything but the idle value only while playing and only with a matching direction held (INP-2: repeating stops when the game stops playing). Game over and paused: idle.
- Touch drag: none, or a drag with its start and current points, the whole columns and rows moved, and whether it still controls the current falling piece, yes only while there is a falling piece. Game over: the touch-drag state has no semantic value, and an implementation is not required to clear a field that holds one.

**B13. Runtime resource states.** Semantic running: a resource is running exactly when an outstanding scheduled firing of it exists; it is not running when none exists, and a fired or canceled firing is not outstanding. This is independent of any concrete handle; null or undefined handle handling is later correspondence. Playing: the gravity resource is running; the lock-delay resource is running exactly while the falling piece rests (B14); the horizontal-repeat resource is running exactly while a horizontal held token exists and the repeat position is not idle; the soft-drop repeat resource is running exactly while a soft-drop token is held and soft drop is dropping. The horizontal-repeat and soft-drop repeat schedules are separate resources and may be running at the same time. Paused and game over: none running. Which further resources the SAF-4 word "timer" covers is settled by U4 below, which does not change the states defined here for gravity, lock delay and the two repeat resources. A resting piece in a committed playing state with reset count 15 has an outstanding lock delay (B9), and a resting piece with reset count 16 exists only while paused, when no resource runs. The screen wake lock is not an ordinary validity condition: DSP-7 requires only best-effort behavior (the game plays normally if it is unsupported or refused, and the system may take it back), so no state of it is required of a valid game state.

**B14. Derived values (semantic definitions).** Level is the score divided by 1000, rounded down, plus 1 (SCO-2). Gravity interval is max(0.25, 0.7 - 0.02 × (level - 1)) seconds (PLY-2). Resting: playing or paused with a falling piece that cannot move down one row and stay valid under B6; false when there is no falling piece. Landing position: defined only when there is a falling piece, as the lowest position it can reach straight down and stay valid under B6; when there is none, there is no landing position and no ghost. Derived state has no independent semantic authority. Whether an implementation cache or stored copy agrees with these values is later correspondence evidence and is not a validity condition.

**B15. Legal-play properties.** No snapshot-validity condition requires that a committed state has no completely filled row. No snapshot-validity condition requires that hold-used true implies a held piece exists. Whether legal play or history produces or forbids either property is not decided here. Consistency of the bag, queue and current piece with dealing whole bags of seven (PCE-5) is historical, cannot be evaluated from one state under B1, and is not a snapshot-validity condition.

**B16. Persisted content.** Arbitrary external data may be malformed, and invalid external data is not authoritative. A saved game is accepted whole or not at all. The pieces of an accepted saved game map to the built-in piece definitions. The gameplay contents of an accepted saved game are such that, when Continue restores them paused (STA-4), the resulting authoritative state is valid under the rules above; the saved payload's own representation of the mode is not decided here. Supported legacy formats are accepted. The level stored by the earlier format is ignored (STA-6). A saved game from before the bag was saved continues with a fresh bag (STA-4). A save newly written under these rules preserves the lowest row reached and the reset count exactly, including a reset count of 16 where applicable, so that Continue restores the same semantic values. Saved games in the released formats required by STA-6 predate the lowest row and the reset count of 16. Two compatibility defaults apply when loading them. They are deterministic defaults and are not recovered history. L1: a missing lowest row is the greatest board-row index occupied by any block of the current falling piece. L2: a legacy paused, resting saved game with reset count 15 and no information that distinguishes a pause that took the count from 14 to 15 from a pause taken after the 15 were used resumes with the lock delay starting. Accepted saved-game scores and stored high scores are whole numbers from 0 through 9,007,199,254,740,991, with no divisibility condition; this stored-score ceiling does not change the in-session score domain in B11. An accepted stored high score is in that bounded domain; a stored high-score value outside that domain is invalid and is ignored (SAF-2). Forgetting, discoverability, failure behavior, rollback, last-good-save and persistence ordering belong to the saving and withdrawal rules below and are not stated here.

**B17. Presentation state.** Presentation state is non-authoritative and outside the ordinary authoritative validity predicate. Its own requirements, which may also depend on viewport, device and browser state, are evidenced separately.

Current-format note: loading only the current saved-game layout supersedes the legacy acceptance and compatibility-default clauses in B9 and B16 (the supported-legacy acceptance, the ignored old level, the prebag fresh bag, and the L1 and L2 defaults) for the current-layout reader. The rest of B9 and B16 remains active, and STA-4 and STA-6 remain the current requirement contract: stored content that is present and successfully read but fails the full current layout and validation is refused, ordinary withdrawal is attempted, and its stored bytes stay.

### Saving, withdrawing, and reading a game

#### Save

A save succeeds when the valid saved position is written and marked available for Continue. If the position writes but marking it available fails, the save failed. A failed save attempts withdrawal as described below.

New saves preserve the exact reset count and lowest-row history.

The stored high score is separate and is not erased by old-save policy. No future unlabeled save format is admitted and there is no indefinite legacy support. An old cached tab can still write saved-game data; that interference is a recorded open limit.

#### Withdraw

Withdrawal means Continue no longer offers the saved game. Deleting its stored bytes is not required.

Withdrawal happens when:
- New Game is confirmed;
- normal game over occurs because a new or held piece has no room;
- stored saved-game content is invalid and rejected whole;
- stored saved-game content is present and successfully read but fails the full current layout and validation, covering old-layout, unknown-layout and malformed-current records; ordinary withdrawal is attempted and no gameplay from the refused record is loaded;
- saving the current game fails, including failure to publish the saved position.

When withdrawal happens or is attempted, this running session's withdrawn indicator is set. If writing withdrawal fails, gameplay continues and this session does not offer the previous save; only in that failure case, after a reload nothing is promised: the save may be offered again. No retry system and no new save format are required by this rule.

A later error does not undo a withdrawal already made. Another session saving a game does not clear this session's withdrawn indicator. The indicator starts clear on page load and clears when this session successfully saves. It is not persisted.

Continue is available only when stored eligibility is exactly the string "true", the session's withdrawn indicator is clear, and the saved content passes the persisted-content validity rules. Other stored flag values or absence are ineligible.

#### Read

A storage read failure is not invalid stored content and is not absence established by a successful read. A failed read may make the saved game unavailable, but does not by itself withdraw it or change stored values. Nothing is promised about when availability returns.

Invalid stored content is rejected whole and withdrawn. The game does not partly load it or use conversion defaults to repair invalid content. Accepted gameplay content is restored whole and paused under the persisted-content rules. Present and successfully read content that fails the full current layout and validation is refused and ordinary withdrawal is attempted; a failed read and a successfully established absence remain distinct from this refusal and do not themselves mutate storage.

#### Fault

An engine fault by itself does not withdraw the saved game. Normal game over and an engine fault have different triggers.

The last-good rule keeps a save successfully written with valid content even if the same step later faults, without rolling it back. On a fault stop, the last good save is kept. Only a fully finished save replaces the last-good position: a position written but not published does not become the last-good target. The mechanism, whether recovery, rollback or retention, is not selected.

This does not expand the safe-terminal definition, promise rollback for ordinary state, or certify any current game-written payload as valid.

#### Stored high score

A stored high score is good when it is a whole number from 0 through 9,007,199,254,740,991, with no divisibility condition; otherwise it counts as zero (B16).

#### Gravity timing judgment

PLY-2 is judged against the delay the game requests from its scheduler, compared with max(0.25, 0.7 - 0.02 × (level - 1)) seconds (B14) expressed in milliseconds, with an absolute tolerance for numerical rounding. The tolerance is 0.000000001 millisecond. The claim covers the value requested. Conversion of that value by the browser, actual elapsed time, lateness and throttling are not claimed.

#### Hand-edited saves

Persisted state that was edited by hand is judged only by the untrusted-input rules: it is accepted whole if it is valid under B16, otherwise rejected whole. Gameplay requirements such as PLY-7 govern the play the game itself produces. They are not applied to the history of an accepted saved game, and no claim is made that an accepted state could be reached by legal play. No check that a result was earned through play, no anti-cheating protection and no tamper protection is claimed.

### Storage trust, error reporting, and timers

**U1. Storage trust.** When a browser storage operation succeeds, the game trusts that operation. The game never trusts stored contents without validation: contents read back are judged by the validity rules above, accepted whole or rejected whole. Stored data can be edited or lost, so the game promises no permanent storage and no protection against tampering. A storage failure must not stop gameplay; what the game does about the saved game after a failed write or read is decided under "Saving, withdrawing, and reading a game" above. This records a trust assumption and adds no requirement.

**U2. Fault reported, SAF-5.** When drawing or reading a gamepad fails, the drawing and polling loops keep running (SAF-5). The fault counts as reported when both of these happen: (a) the player is shown a small notice that drawing or controller input had a problem, which does not interrupt play and is not a popup, and (b) a separate signal that a test can observe is raised. No fault record is required to be written to storage. U5 is unchanged by this rule and still governs the SAF-3 stop.

**U3. Failed timer cancellation during a fault stop.** If cancelling a timer fails while the game is stopping safely after a fault, a timer may still fire, but it must not change the stopped game. The game remains over, the last good save is kept and the fault is reported. This interprets "no timers running" in SAF-3 for that case only. It adds no trust in a scheduler that runs a timer after a successful cancellation: U6 still applies to successful cancellation. This text states the outcome and selects no mechanism.

**U4. Timer scope for SAF-3 and SAF-4.** The timers these rules cover are the gravity timer, the lock-delay timer and the held-key repeat timers. The invariant checks of SAF-4, and the safe stop of SAF-3 on a broken invariant, apply after each firing of these timers and to the actions they cause. These timers are stopped when the game is paused or over. The drawing loop and the controller-polling loop are not timers in this sense; they keep running under SAF-5 and U2. This interprets the word "timer" and does not change the check points SAF-4 names.

**U5. Fault reported, SAF-3.** When the engine throws and the game stops in the SAF-3 safe state, the fault counts as reported when both of these happen: (a) the player is shown a plain message that the game stopped because of an internal error, so that no developer console is needed to see that something went wrong, and (b) a separate signal that a test can observe is raised. The criterion is independent of any particular callback or interface the implementation uses. No fault record is required to be written to storage, and the rule adds no condition on the board, queue, current piece, score or hold beyond SAF-3's own.

**U6. Timer registration and cancellation.** A timer that was cancelled successfully is trusted not to run afterwards. Registering a timer and cancelling a timer are inside the SAF-3 behavior: if either throws, the engine stops in the SAF-3 safe state and the fault is reported under U5. No defense against a scheduler that runs a timer after a successful cancellation is required.

Trust assumptions not yet decided: the service worker, hosting, repository settings and the random source.

### Queue piece check

Each required safety check must verify three real upcoming pieces, not merely a list with three slots. A list with an empty or malformed slot must not pass just because its length is three.

Detector extent: interpret SAF-4's "three pieces queued" using the upcoming-piece semantics in B3 and B7: an ordered, complete list of exactly three entries, each denoting a valid semantic upcoming piece of one of the seven adopted kinds. Null entries, holes and non-piece values do not satisfy this criterion. This resolves B7's deferred runtime-check interpretation; B7's valid-state domain is unchanged.

Waiting pieces do not inherit the current falling piece's board-fit, live position, lowest-row history, lock-delay or timer conditions. No specific class, object layout, checker function or duplicated geometry is required. Representation must denote the adopted semantic piece; recognizable color alone does not certify an otherwise malformed representation without a reviewed reconstruction or representation mapping.

This rule covers only the upcoming queue; the current-piece check is separate.

## Process

| ID | Requirement |
| --- | --- |
| QA-1 | Every requirement is verified by at least one test, every test names the requirements it verifies, and those requirements exist. |
| QA-2 | The unit tests exercise every line, branch and function of the game logic (`public/game/`). `npm test` fails below 100%. Code that cannot be reached is removed rather than left untested. |
| QA-3 | The browser tests exercise every line, branch and function of the page script (`public/script.js`), measured in Chromium. `npm run test:e2e` fails below 100%. |
| QA-4 | The browser tests pass in WebKit (Safari's engine) at iPhone size, as well as in Chromium at iPhone and desktop sizes. |
| QA-5 | Everything the browser loads (`public/`) passes TypeScript's strictest type checks, with types written as comments in the JavaScript. `npm run typecheck` runs before the tests in CI. |
| QA-6 | Mutation testing (Stryker) of the game logic leaves no mutant alive: every small wrong change to `public/game/` is caught by a failing test, or makes the tests run past the time limit (for example a piece with no blocks, whose ghost falls forever). Loops in tests are bounded, so a broken game fails a test rather than hanging it. A mutant that cannot change behavior is marked in the code with the reason. `npm run test:mutation` fails if any survive. It runs weekly in CI, and on every pull request that changes the game logic or its tests: a change to the game logic alone mutates just the changed files, and a change to the tests runs the full suite. |

## Open items

### Recorded gaps and defects

What the audit recorded where the code did not meet, or was not shown to meet, the rules above. The first two entries predate a later change to the safety check, named in each entry with its evidence; they keep their recorded status, and this file does not reclassify them.

**Queue checkpoint gap.** Recorded as an open gap: "The safety check counts the next pieces but does not check what is in those slots. A three-slot queue containing no real pieces can pass." The same gap was recorded for a queue of three plain numbers, a `{ length: 3 }` object, and three zero-cell pieces. After this record the safety check changed (PR #171, commit `62b1a2a`, "Check every piece in the safety check"): at current main the monitor checks every queued piece (`isValidPieceList`), and unit tests in `test/safety.test.js` pin a null entry, a hole in the list, the `{ length: 3 }` object and a zero-blocks piece in the queue. The audit did not rerun its comparisons against that change, and the finding's recorded status is unchanged; whether the gap is settled is an audit-status question this file does not answer.

**Current-piece checkpoint.** The current-piece checkpoint requires a valid four-block falling piece at required safety boundaries, not only constructor validity and block overlap. Recorded as a defect by conditional source argument: an injected zero-cell piece (empty rotation shape) passed the playing-state checkpoint and one soft drop; injected one-block, five-block and four-in-a-row shapes also passed; and the paused-state checkpoint did not read the current piece at all. Ordinary gameplay creating such a piece was not established. After this record the check changed (same PR #171): at current main the monitor validates the falling piece in every state except game over (`isValidFallingPiece`), and the malformed-current suite in `test/safety.test.js` pins the no-blocks, one-block, five-block and wrong-four-blocks shapes in both playing and paused states. The audit did not rerun its comparisons, and the finding's recorded status is unchanged; whether it is settled is an audit-status question this file does not answer.

**Serialization failure (confirmed defect).** An exception while serializing the saved game, before any storage call, is an engine exception, not a storage-operation failure: SAF-3 requires the safe stop and the reported fault (U5), a failed save still attempts withdrawal of the previous save, and storage errors must not stop gameplay (SAF-2). The recorded defect, scoped: an injected serialization exception during the save on Pause is caught and swallowed - the game stays paused with no safe stop and no test-observable fault signal. Current main has the same structure: `saveGameSession` in `public/game/gameManager.js` wraps serialization and the storage write in one `try`, and its `catch` only sets the session-saved flag to false. A naturally occurring serialization failure without injection remains Not Established. Any correction must preserve both the failed-save withdrawal and the SAF-2 storage-error continuation while separating non-storage engine exceptions.

**Drawing console reports (adopted rule, not yet implemented).** Drawing failures produce one console report per unbroken failure streak. A successful drawing frame resets the report flag; the next failure after recovery produces a new console report. Only repeats within the same unbroken streak are suppressed. A console report is an error message in the browser's developer console. The on-screen notice limit, once per kind of error in a session, is unchanged. Console reporting is the separate test-observable signal for SAF-5 (U2). This covers drawing console reporting only, not gamepad report frequency. An idle callback that checks unchanged caches is not the successful drawing witness. Current behavior does not yet meet this rule: `renderErrorReported` in `public/script.js` is set after the first caught failure and never cleared, so no later failure in the session produces a console report.
