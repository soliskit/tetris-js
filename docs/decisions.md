# Game decisions and evidence limits

Current requirements are in [requirements.md](requirements.md). Detailed semantic rules are in [Valid Game State](audit/phase-1-r1-decision.md), [Saving, Withdrawing, and Reading a Game](audit/phase-1-r2-r5-decision.md), [Storage, Error Reporting, and Timers](audit/phase-1-trust-and-timer-scope-decision.md) and [Queue Piece Check](audit/queue-piece-check-decision.md).

Historical findings, selected target directions and current implementation are different. Old Settled/Pending work cells record decision workflow, not runtime verification. Every dated result keeps its method and limits; later scoped fixes supersede earlier defect premises only where stated. A source argument is not execution and a test name is not proof of its whole requirement.

## Findings

The condensed Phase 4 working papers were removed from `docs/` and remain in git history. References to Phase 5 records section 3B identify historical evidence, not current runtime proof.

| ID | Raised | Finding | Status | Evidence and resolution |
| --- | --- | --- | --- | --- |
| F1 | 2026-10-03 | New Game dialog answers raced the dialog's close event: a key pressed right after cancelling still went to the question | Settled | CI failed on it in WebKit and in Chromium at iPhone size; reproduced locally under load (1 run in 30). Answers now reach the engine at once. Fixed before merge in PR #32<br><br>October 23, 2026: Fixed at the stated bounds - historical repair in PR #32; current coverage test/gameManager.test.js:146 (manager level) and e2e/game.spec.js:117-135 (all five close routes). Boundary carried: the original race timing is not recreated in the current suite; the page-route recheck for that exact timing is unestablished. |
| F2 | 2026-10-03 | Gamepad: Menu or View pressed in the same frame as another button let both act (Menu and A at game over hard dropped the new game's first piece; View and A on the pause screen cancelled the question it had just asked) | Settled | Reproduced against the real input controller. Menu and View now act alone (INP-4). PR #34, an Intentional Change<br><br>October 23, 2026: Fixed at the stated bounds - historical repair in PR #34 (Intentional Change); current coverage test/inputController.test.js:294 (stand-in manager action log; controller action selection, not gameplay end to end) and test/inputController.test.js:316 (real-game View and A on the pause screen). Node level. |
| F3 | 2026-10-03 | The O piece has four rotation states | Rejected | It has one: its wall kick table has one row, so one state is built. `test/game.test.js` checks it |
| F4 | 2026-10-03 | Rotating a resting O piece resets the lock delay | Rejected | Its rotation state never changes, so no reset happens. Tested by "pressing rotate when the piece cannot turn does not extend the lock delay [PLY-6]" |
| F5 | 2026-10-03 | A cancelled lock delay timer can still fire and lock the piece | Rejected | The browser's `clearTimeout` never runs a cleared timer (HTML standard), the test scheduler deletes cleared timers, and SAF-4 checks that timers run only while playing. The scheduler and random source are trusted test controls, not untrusted input |
| F6 | 2026-10-03 | A cancelled gravity timer can still fire and double the gravity | Rejected | As F5; also, starting gravity stops the previous timer first |
| F7 | 2026-10-03 | A key let go while Ctrl is held stays held | Rejected | Only key presses with a modifier are ignored; releases still clear the key. Reproduced the reported sequence: the key is released |
| F8 | 2026-10-03 | On a Mac, a key let go while Cmd is held may stay held, because macOS sends no release | Settled | Cannot be reproduced off a Mac. INP-3 only covers keys pressed with a modifier. If confirmed, fixing it is an Intentional Change to INP-3. Low relevance: the supported platform is the iPhone (APP-4)<br><br>October 23, 2026: Documented limitation of unverified premise, as a documented limitation - the reported Mac behavior this row names. Mechanism verified in code: a key release removes the key from the held set unconditionally, so only a missing release can strand a key, and only the left, right and soft-drop keys can stick. Bounds: a stuck key stops moving pieces while the game is paused or ended (the repeat timers stop themselves) but stays held and can act again on resume; it clears only on window blur, gamepad disconnect, or pressing and releasing that key again. The premise that macOS withholds the release is unverified; the identified supported-device path, a hardware keyboard attached to an iPhone, is untested. Any fix stays available later as an Intentional Change to INP-3. |
| F9 | 2026-10-03 | A saved game can hold all seven pieces in its bag | Rejected | True but not a bug: normal play never saves more than six (largest in 28,356 saves of seeded play), a seven piece bag loads and breaks nothing, and no requirement makes it invalid. STA-4 accepts an empty bag, which has the same effect. The proposed cross field checks would have rejected 42.9% of real saves. A correct check exists (at most six pieces, none among the upcoming pieces dealt from the bag; rejects none of the 28,356) but is not required |
| F10 | 2026-10-03 | The documented Stryker exclusion on the bag shuffle covers more than its stated reason | Rejected | Earlier disposition: Resolved, No Change<br><br>Run with the exclusion removed: `i <= 0` is caught by the tests; `i >= 0` survives and is the harmless swap of the first piece with itself the comment describes. Stryker can only exclude both together<br><br>October 23, 2026: Rejected under the October 17 rule - evaluated, no defect: with the exclusion removed, `i <= 0` is caught by the tests and `i >= 0` survives as the harmless swap of the first piece with itself; Stryker can only exclude both together. Historical register evidence, not a fresh run. |
| F11 | 2026-10-03 | STA-4 describes a save without a bag, a format no release stored under the current storage names | Rejected | Earlier disposition: Open, Low<br><br>The bag was added (PR #22) before saves moved to the current names (PR #26), and the old names are not read. Harmless and tested. Removing the sentence would be an Intentional Change |
| F12 | 2026-10-03 | Stryker passes when it mutates nothing (a score of NaN meets the threshold) | Rejected | Earlier disposition: Rejected, Not Reachable<br><br>The pull request mutation workflow only runs a targeted run when the change includes engine files that still exist, so the list is never empty |
| F13 | 2026-10-03 | No browser test checks that a click inside the New Game dialog, away from its buttons, keeps the question open | Settled | Found by the page script mutation pilot: making the dialog's click check always answer no survived. A test now clicks inside the dialog, and STA-1 says such a click does nothing; the test fails with that mutation put back. PR #39<br><br>October 23, 2026: Closed (historical note) under the October 17 rule - the concern was only about tests; the test exists in the current suite at `e2e/game.spec.js:269` and fails with the mutation restored (historical register evidence). |
| F14 | 2026-10-03 | No browser test checks that Enter or Space on the focused hold box are kept from the browser's default action | Settled | Found by the pilot: removing the hold box handler's `preventDefault` survived. No visible effect today, since the page never scrolls (DSP-1), but INP-3 requires game keys to keep the browser's default action from happening. A test now checks both keys; it fails with that mutation put back. PR #39<br><br>October 23, 2026: Closed (historical note) under the October 17 rule - same shape as F13; current test `e2e/game.spec.js:251` [INP-3] [INP-6]. |
| F15 | 2026-10-03 | Removing `preventDefault` from the dialog's cancel event handler survives the tests | Rejected | Earlier disposition: Rejected, equivalent<br><br>Without it the browser closes the dialog itself, one frame sooner than the engine would; the question is already answered no either way, so the end state is the same |
| F16 | 2026-10-03 | With a controller, the New Game dialog's selection could not be moved, and A always started a new game, even while Cancel, focused as the dialog opened, looked selected | Settled | Reported during controller play; confirmed in the code, where INP-4 made A always confirm and the pad do nothing. Now left and right move the selection, A presses the selected button and B cancels; the arrow keys move it too, and the selection is always highlighted (INP-4, STA-1). PR #37, an Intentional change<br><br>October 23, 2026: Fixed at the stated bounds - historical repair in PR #37 (Intentional Change); current coverage test/inputController.test.js:340 (stand-in manager plus move/press callbacks; emitted action selection, not DOM selected-button activation). Node level. |
| F17 | 2026-10-04 | A stored high score no game can reach, such as 150, is accepted and shown, while a saved game with a score of 150 is rejected | Rejected | Earlier disposition: Rejected, harmless<br><br>Found in the SAF-2 audit. The game only stores real scores, so such a value needs a hand edit of storage. The high score is only shown and compared, never enters the game's state, and is replaced once a real score beats it. Anything that isn't a whole number of 0 or more already reads as 0 (tests in `test/safety.test.js` and `test/gameManager.test.js`). No requirement makes a high score a multiple of 100, and adding one would be a rule for a theoretical invariant (see F9). No change |
| F18 | 2026-10-04 | After a fault that leaves the game broken, such as the queue a piece short, every later action reports the same fault again, because the invariants are still checked at game over | Rejected | Earlier disposition: Rejected, harmless<br><br>Found in the SAF-3 audit. SAF-4 requires a check after every action and every timer, game over included. Skipping it after a fault would leave a blind spot: a regression that let an action change a stopped game would go unreported. Only the 20 most recent faults are kept, so the record stays bounded, and New Game or Continue replaces the broken state. No change. PR #40 |
| F19 | 2026-10-04 | An error in the invariant check itself escaped the guard: with the queue or the piece broken in a way the check does not expect, the game kept running, nothing was reported and the page was not told to redraw. The safe stop's own fault record could also throw, so the fault was neither reported nor shown | Settled | Found in the SAF-4 audit and reproduced: with the queue broken, every gravity tick threw until a piece locked. Not reachable by legal play, but SAF-3 says that if anything in the engine throws, the game stops safely. The check now runs inside the guard's try, and the record and the report are tried apart with empty catches, so nothing in them can throw. Left outside a catch on purpose: clearing the timers, which the scheduler, a trusted control, never fails at, and telling the page to redraw, which is the page's and part of SAF-5. Two tests failed before the fix and pass now. PR #42, a Bug fix<br><br>October 23, 2026: Reverified at the stated composition - Node halves test/safety.test.js:213 (invariant check broken via nextTetrominos = null) and test/safety.test.js:224 (faults = null plus a broken invariant); browser corroboration e2e/engine-fault-notice.spec.js at its separate scope (generic engine failure; console refusal and draw refusal separate injections; does not recreate the Node throw routes). Qualifications: scripted fault injection, not the organic reproduction; Playwright WebKit/Chromium at iPhone 14 Pro Max viewport plus desktop Chromium 1440 x 900, not a physical device; the current-main CI run at config-level selection (test check-run 120421221563, deploy 120422427676, Node 26), per-test execution logs not retrievable. |
| F25 | 2026-10-09 | On the default page, a caught engine fault with successful cancellation and page providers does not give the player an explanation that an internal error stopped the game | Settled | Found in the SAF-3 audit, player-message half. Fixed in commit f186150 (recorded earlier as d12162f, a commit no longer on main; see phase-5-records 3 B): the board message and the screen reader announcement now say "The game stopped because of an internal error.", and the notice stays until the game recovers. `e2e/engine-fault-notice.spec.js` covers it. Rechecked in `public/script.js` on main. Full SAF-3 and the test-signal half stay Not Established |
| F26 | 2026-10-11 | A page can load files from different releases after the clock jumps forward. A page that is still loading can lose its cached version after a forward clock jump. Conditions: the loading version is outside the newest two, and a forward jump expires its pin before cleanup runs. Cleanup then deletes every older version except the second-newest and the unexpired pins. Schedule from the removed paper: one complete version V1 and a page pinned to it at time 1000, two later serial complete versions V2 and V3, then a clock jump to 601001 before cleanup reads the pin (age 600001 is over the 600000 ms limit). Cleanup keeps V3 and V2, drops the pin and deletes V1. The page's next file request falls back to V3 after it received V1 HTML, which breaks APP-2 (every file of a page from the version it opened with). Premises: successful cache, fetch and event behavior, complete 16-file versions, distinct version names, no foreign cache, failed call or simultaneous download. Limits: not a recovered clock experiment or a native browser measurement, backward jumps and every other loading schedule are not covered, and APP-6 is not violated because the deleted cache is the game's own. | Settled | Earlier disposition: Confirmed Defect (D72): conditional source argument, not run. That historical loading-page argument predates the PR #399 repair below.<br><br>`public/sw.js` (`removeOldVersions`, `PIN_MS`).<br><br>October 25, 2026: Fixed at the stated bounds. A live page's record no longer expires by wall-clock age: cleanup asks the browser to include uncontrolled pages when it reads the records, and only a record whose page is gone expires by age. Under APP-2; unit coverage test/staticFiles.test.js ('a clock jump forward cannot cost a loading page its version [APP-2]', 'a record whose page is gone expires by age, and its version is deleted [APP-2]'), running the real worker file against a simulated Cache and Clients API, not a native browser measurement. |
| F27 | 2026-10-11 | Activation deletes the caches named tetris and tetris-2 without checking who created them. Condition: another same-origin owner uses either fixed cache name. Then this conflicts with APP-6. From the removed paper: the condition is a declared input, a cache named tetris made by another project on the same origin before activation, with no game takeover and no concurrent change. The activate handler deletes both fixed names with no creator check, and successful `caches.delete` removes that binding, which breaks APP-6 (delete only caches the game made). Limits: the other-owner condition is not checked, since a name used by older game workers does not show who created a given cache. The claim is about the name binding, not erasure of backing bytes. The original V47 raw run is not recovered, and the earlier permanent tests create these names as game-owned fixtures, so they do not answer this. This is a different trigger from the failed-download cleanup finding recorded elsewhere. | Settled | Earlier disposition: Confirmed Defect (D72), worded "if another project uses either name". Conditional source argument; the other-owner condition is unverified.<br><br>`public/sw.js` (`OLD_CACHES`, activate handler).<br><br>October 25, 2026: Fixed at the stated bounds. Activation deletes one of the old fixed-name caches only when it is non-empty and every stored address sits under this worker's scope; empty, mixed, or another project's caches stay. Under APP-6; unit coverage test/staticFiles.test.js ('activation deletes only the old caches this app made [APP-6]', "an old cache mixing this app's and another project's addresses stays [APP-6]", 'an empty old cache stays, its maker unknown [APP-6]'), running the real worker file against a simulated Cache and Clients API, not a native browser measurement. |
| F28a | 2026-10-11 | The game once treated a touch at the tap limit as a drag; that source error is corrected. Touch tap boundary, historical: an older source treated a finger that moved exactly 10 px as a drag, and the older run output of 9 and 10 px is a historical record separate from current behavior. TE1 source corrected and six permanent boundary cases added in merged PR 175; not executed or deployed in this read-only review. At the source recorded for this finding, pointermove returns while no drag has been recorded and the distance is at most 10 px (script.js: 483). Once a move past 10 px sets the moved flag, going back to 0 is still a drag. The six cases (9, 10, 11, 10 then 0, 11 then 0, cancel at 10) are in a parametrized loop in e2e/touch.spec.js. All six use mouse input and assert the delivered move distances; only cancel at 10 dispatches synthetic pointercancel. These cases do not establish touch-type or physical-device delivery at 10 px. See the [writer-frame matrix](audit/phase-3-writer-frame-checkpoint-matrix.txt), L09 and L15, for the separate hidden-page/touch-cancel composition. | Settled | Earlier disposition: TE1 historical, source corrected in merged PR #175.<br><br>`public/script.js`, `e2e/touch.spec.js`.<br><br>October 23, 2026: Fixed at the stated bounds - TE1 source corrected in PR #175; current coverage e2e/touch.spec.js:36-79 (six boundary cases: 9 px, 10 px, 10-and-back rotate; 11 px, 11-and-back, cancel-at-10 do not). Boundary carried: native mouse pointer events at exact CSS pixels with a synthetic cancel, not touch delivery; source check public/script.js:483, TAP_SLOP_PX = 10 at : 427. |
| F28b | 2026-10-11 | A faraway finger lift can count as a tap in a simulated touch test. TE2: endDrag (script.js: 521 to 526) tests only the moved flag, the event type, and the piece, and reads no coordinates, so a lift away from the last move position is not checked. The native omitted-move case is not established. See the [writer-frame matrix](audit/phase-3-writer-frame-checkpoint-matrix.txt), L09 and L15, for the separate hidden-page/touch-cancel composition. | Pending work | Earlier disposition: TE2 Confirmed Defect, synthetic event (D72 run, Chromium with simulated touch).<br><br>`public/script.js`, `e2e/touch.spec.js`. |
| F29 | 2026-10-11 | A saved game that the game wrote itself is not shown to be a good save. A successful write proves the storage call worked. Historically, a successful write did not prove complete saved content because reset count and lowest-row history were not saved. PR #293 later repaired those fields; this old missing-field premise is not current. The independent good-save construction gap remains separate from that repair. A test of 'the last good save is kept' needs a save that is good on independent grounds and that the game itself wrote. No such save has been built. No default for a missing reset count is adopted. This is a blocked target: a particular good payload is needed, not a claim that every other payload is invalid. | Pending work | Earlier disposition: Folded into F20 (D72); the gap is carried as a limit.<br><br>`public/game/session.js` (`serializeSession`). |
| F30 | 2026-10-11 | Test assertions are narrower than their names. Engine, piece, session, controller, touch, browser, support, and safety tests check selected values. Several use values the game's own code built, so they are not independent answers. Historical limits, tied to the older source the registers read, not a current exhaustive test review: they did not show that a real finger or controller delivers input, that the player sees the required fault message, that every save-corruption input is invalid for a reason the rules give, that the 47 controller tests exercise the real game and not stand-ins, or that JSON syntax rules define a valid save. Current main, stated separately: the engine fault message is implemented in script.js and e2e/engine-fault-notice.spec.js exists. That does not establish every fault route. | Rejected | Earlier disposition: Rejected as a defect (D72), limits carried. The fault message gap is historical.<br><br>`public/script.js`, `e2e/engine-fault-notice.spec.js`. |
| F31 | 2026-10-11 | Coverage gaps for writers, routes, and candidates. A few narrow witnesses (a Hard Drop that wrote a null score and requested a NaN gravity delay, and a prior save kept after an error report) do not cover every writer, route, or candidate. The direct storage write paths have uneven coverage by trigger and failure point. Phase 4 can exit only when every declared area is exhausted, proven, or has an approved limit. Counting merged documents does not meet that. | Rejected | Earlier disposition: Rejected as a defect (D72); limits carried as the Phase 4 family limits (D71).<br><br>Historical record, no single code location. |
| F32a | 2026-10-11 | Confirmation dialog focus. One local Chrome run: clicking the dialog's question text moved focus from Cancel to the dialog while the game stayed paused and the question stayed open. No controller input was delivered. | Rejected | Earlier disposition: Rejected. D72.<br><br> |
| F32b | 2026-10-11 | Confirmation dialog focus. The Controller A section below retains the scoped missing selected-Cancel response as a narrow conditional Confirmed disposition. Limits kept: successful providers, logical Cancel, a fresh isolated A press, a consumed edge, causal closure, nonnative evidence, and no completed answer inferred. Completed opening and interior no-op preserve logical Cancel. A successful fresh isolated standard-mapping A press is delivered while pending is true and the dialog is focused. The press is consumed. Inspected synchronous callbacks complete with no answer continuation, competing transition, reentrant getter or uninspected carrier, and no required Cancel activation follows. This is a missing response. It is not proof of a completed conceptual answer or a B12-invalid state (a state that breaks B12, the audit's recorded rule about the confirmation-open and selection flags and the order of held direction presses). The Controller A section retains this as Confirmed at that scope. The older completed-answer claim is kept separately: its delivered-A-to-completed-answer relation is not established, an unfinished-A and no-commit continuation is not excluded, and it is not a Confirmed INP-4 defect. Neither DOM button having focus is part of the source fact, not the whole finding. | Pending work | Earlier disposition: Confirmed at its stated scope. D72.<br><br>(b) is the Controller A section below. |
| F32c | 2026-10-11 | Confirmation dialog focus. Pending Resume: the Resume route sets the game to playing while the rule says any action other than an answer keeps it paused. This holds for programmatic or direct events and is limited by the pre-native-open admission. The composite operation is unresolved and the native cut is open. The papers do not classify every pending Resume as a physical one-event defect. | Pending work | Earlier disposition: Confirmed Defect (programmatic or direct events only). D72.<br><br> |
| F32d | 2026-10-11 | Confirmation dialog focus. A real click on the page's Resume button cannot reach it while the modal is open once the modal opened successfully. This does not cover programmatic or assistive events. | Rejected | Earlier disposition: Rejected. D72.<br><br> |
| F32e | 2026-10-11 | Confirmation dialog focus. An older explanation covers an unfinished open and cannot be reused for a settled one. | Settled | Earlier disposition: Closed (historical note). D72.<br><br> |
| F36 | 2026-10-11 | A page can load files from different releases when old saved copies are removed while it opens. Pin-order race in the cache. Cleanup lists the pins, then a page that opened earlier writes its pin after the list was taken, receives old HTML, cleanup then deletes that old version, and the page's script comes from a newer version. Eight-step schedule with ordinary navigation clients, one worker, two successful serial publications, and a long first download. Premises: the successful-API schedule. Limits: native worker lifetime and request timeout are not measured, long downloads are a conditional premise, the earlier empty-client history is retained as history, and the original raw evidence is not recovered. Awaiting the pin before answering does not stop cleanup using its earlier list. Separate from the forward-clock row F26. | Settled | Earlier disposition: Confirmed Defect (D72): conditional source argument at the pre-PR #399 worker source, not a claim about the current repaired pin-order route.<br><br>`public/sw.js`.<br><br>October 25, 2026: Fixed at the stated bounds. Cleanup re-reads the page records immediately before deleting each version, so a record written after the list was taken keeps its version. Under APP-2; unit coverage test/staticFiles.test.js ('a page record saved while cleanup runs keeps its version [APP-2]'), running the real worker file against a simulated Cache and Clients API, not a native browser measurement. A window between the re-read and the delete remains and is documented in public/sw.js. |
| F38 | 2026-10-24 | The saved-game reset-count cap check carries an excluded mutant that hides a killable one. The cap check reads: if there is a cap and the count is over it, refuse the save. Replacing "there is a cap" with always-true changes nothing, because a count checked against no cap is never over it - that mutant is equivalent. The line exclusion that skips it also skips the always-false mutant, which a live test kills. One hidden killable mutant. | Settled | Flagged in `public/game/session.js` with a line-scoped Stryker disable during the F20 fix (PR #293). The registered rewrite gives the check one cap value that means no limit instead of testing whether a cap exists, removing the equivalent mutant and the exclusion with it.<br><br>October 24, 2026: Settled by #296: the check now reads the count against one cap value that means no limit (the parameter defaults to Infinity, session.js: 196), so there is no always-true form to exclude, and the line-scoped Stryker disable is removed. The mutation check was green on the pull request's head with the exclusion gone. |
| F39 | 2026-10-24 | The shuffle loop's lower bound carries an excluded equivalent mutant. The loop stops before the first item; including it would swap the first item with itself, so a mutant that also visits the first item changes nothing | Settled | Flagged in `public/game/tetrominoFactory.js` with a line-scoped Stryker disable during the F20 fix (PR #293). The registered rewrite removes the exclusion.<br><br>October 24, 2026: Settled by #296: the shuffle loop visits indices from 1 up, so a mutant that widens the range writes past the array's end (or never shuffles) instead of performing an invisible swap of the first item with itself, and the line-scoped Stryker disable is removed. The mutation check was green on the pull request's head with the exclusion gone. |


## Source relations kept from the removed Phase 4 working papers 12 to 21

Four plain game facts that only those papers argued. Each was checked against current `public/game/` source on 2026-10-11. They are source arguments, not executed, and hold under normal successful calls and no outside mutation of the board or bag. Requirements PCE-1, SCO-1, PCE-5 and PLY-5 already state the player-facing rule for each. These rows keep the implementation fact. The papers remain in git history.

| ID | Fact | Source |
| --- | --- | --- |
| SR1 | `createBoard(20, 10)` builds 200 separate cells: every row is its own array and every cell is its own object, so writing one cell never changes another. Covers PCE-1 | `public/game/gameState.js` (`createBoard`, `emptyCell`) |
| SR2 | `clearFullRows` removes the full rows from the bottom up and adds the same number of empty rows on top. The board stays 20 by 10 with every entry present, and the surviving rows keep their contents and order, each moving down by the number of removed rows below it. Zero full rows changes nothing. Covers SCO-1 | `public/game/gameManager.js` (`clearFullRows`) |
| SR3 | A refill starts from one of each of the seven pieces and shuffles that list in place with swaps, and drawing takes the first entry. So each piece is dealt once per refill, for any random value in [0, 1). This says nothing about fairness, unpredictability or every seven-piece window across refills. Covers PCE-5 | `public/game/tetrominoFactory.js` (`allPieces`, `shuffle`, bag draw) |
| SR4 | The ghost piece is a copy of the current piece moved down by `dropDistance`, the number of one-row falls that stay free before the first blocked row. A free gap further down behind a blocked row is not used. The current piece itself does not move. Covers PLY-5 | `public/game/gameManager.js` (`ghostTetromino`), `public/game/tetromino.js` (`dropDistance`) |


## Test cuts 3 to 6

| ID | Raised | Finding | Status | Evidence and resolution |
| --- | --- | --- | --- | --- |
| D90 | 2026-10-26 | Cut 3 removes the lock-delay-timer safe-stop test (9 deleted lines in `test/safety.test.js`). Given up: An error entering the safe-stop-and-report guard from the lock-delay timer while a piece is landing. Kept: The gravity-timer test checks the shared schedule-and-guard route and reported message. Player-action and post-fault tests stay. This is not the same lock-delay landing input. The bounded cuts 3-6 exception permits this specific loss; it does not establish same-input, same-boundary equivalence. Game code, application behavior requirements and QA-1 to QA-6 stay unchanged. | Settled | The owner's approval on October 26, 2026 of the combined cuts 3-6 policy, PR-description and same-PR decision-record correction. Merge remains conditional on 100% line, branch and function coverage, mutation score 100 across all seven game files on the exact expanded head, and independent review by someone other than the author named to the owner before merge. A failed required check stops the cut, with no retry, repair or automatic rollback. |
| D91 | 2026-10-26 | Cut 4 removes the Escape pause-release test (17 deleted lines in `test/inputController.test.js`). Given up: Escape's held-input-release witness. Kept: P-key and gamepad Menu tests exercise the shared pause-release path. Escape keeps pause-toggle and dialog tests. A different pause key is not the same Escape input. The bounded cuts 3-6 exception permits this specific loss; it does not establish same-input, same-boundary equivalence. Game code, application behavior requirements and QA-1 to QA-6 stay unchanged. | Settled | The owner's approval on October 26, 2026 of the combined cuts 3-6 policy, PR-description and same-PR decision-record correction. Merge remains conditional on 100% line, branch and function coverage, mutation score 100 across all seven game files on the exact expanded head, and independent review by someone other than the author named to the owner before merge. A failed required check stops the cut, with no retry, repair or automatic rollback. |
| D92 | 2026-10-26 | Cut 5 removes the paused-repeat test (8 deleted lines in `test/inputController.test.js`). Given up: The direct assertion that KeyD held through 1,000 ms paused produces no repeat. Kept: A kept test holds KeyD through 200 ms paused and later checks the unreset full action history. This is indirect evidence, not the removed pause-time assertion. Gamepad pause and after-resume pause-release tests stay. The bounded cuts 3-6 exception permits this specific loss; it does not establish same-input, same-boundary equivalence. Game code, application behavior requirements and QA-1 to QA-6 stay unchanged. | Settled | The owner's approval on October 26, 2026 of the combined cuts 3-6 policy, PR-description and same-PR decision-record correction. Merge remains conditional on 100% line, branch and function coverage, mutation score 100 across all seven game files on the exact expanded head, and independent review by someone other than the author named to the owner before merge. A failed required check stops the cut, with no retry, repair or automatic rollback. |
| D93 | 2026-10-26 | Cut 6 removes the soft-drop focus-loss test (8 deleted lines in `test/inputController.test.js`). Given up: A repeating soft-drop key stops on window blur. Kept: The kept `losing window focus releases every held key [INP-2]` test checks that a repeating move key stops and is forgotten on blur. KeyA is not the removed KeyS soft-drop input. The bounded cuts 3-6 exception permits this specific loss; it does not establish same-input, same-boundary equivalence. Game code, application behavior requirements and QA-1 to QA-6 stay unchanged. | Settled | The owner's approval on October 26, 2026 of the combined cuts 3-6 policy, PR-description and same-PR decision-record correction. Merge remains conditional on 100% line, branch and function coverage, mutation score 100 across all seven game files on the exact expanded head, and independent review by someone other than the author named to the owner before merge. A failed required check stops the cut, with no retry, repair or automatic rollback. |
| D94 | 2026-10-27 | PR description completion. Use the Tetris-format PR description with this repository's code boundary and native D-number records. A structural helper checks completion on main-target PRs, rejects unsupported Markdown and shared-head PRs, and uses trusted main code. It does not establish truth or remove SHA-status races. Required-check activation waits for a real later PR result with verified GitHub Actions source; fresh live body, head, record, checks and shared-head review is required before merge. Existing review, test and cost gates remain. | Settled | Process choice selected October 27, 2026. The helper was installed by bootstrap PR #409. Required-status activation is a separate settings step requiring a real exact-head success and verified GitHub Actions source. This row records the decision, not an activation receipt. |
| D95 | 2026-10-27 | Commit guide and issue-template cleanup. New commits use clean subjects and required Why, How and Tags in the body. Use any applicable allowed project tags, including both kinds or an area alone; use None only alone when none fits. The tracked editor guide is optional per-clone setup, not a commit-message gate. Remove only the two empty issue-template assignees lines. History and existing assignments stay unchanged. | Settled | Process choice selected October 27, 2026. This guide PR adds the tracked guide and removes the two empty issue-template defaults. Per-clone setup remains optional and is not performed by this rollout. This row records the decision, not a claim that any clone was configured. |

# Change, testing and audit boundaries

The requirements and audit blueprint govern the full change/testing rules. These conventions do not grant permission for a new code, test or requirements change.

## Changes and tests

Historical decisions at October 3, 2026: no generation tokens were added for lock-delay or gravity timers because no bug was demonstrated under the scheduler contract (D2); the separate F5/F6 cancellation arguments are not a substitute for that design choice. At that time, supported saves were the then-current bag/no-level format and the PR #26-27 bag-plus-level format with level ignored. Each had a fixture written by that release's own code; names used before PR #26 were not read (D3, STA-6, PR #38). Later finalized-format target directions supersede current admission choices only to their stated extent; they do not erase this historical fixture binding.

Game-code/requirement changes are classified as refactor, bug fix, intentional change and/or clarification, with the evidence required in docs/requirements.md. Observable behavior must be recorded, protection does not shrink without the applicable rule change/replacement, and only described behavior is guaranteed. Intent comes from requirements, not inferred code.

The pull-request mutation plan discovers public/game files, including future new files. A game-only change mutates the changed game files; test/workflow changes mutate every game file. Each file keeps the break-100 bar. The aggregate "mutation (all)" runs for every PR, passing an empty plan and failing any failed/cancelled leg; test and mutation (all) are the recorded merge checks. Weekly full mutation remains separate. No runtime gate reduction or test removal follows.

Historical evidence: full runs were observed at 33-57 minutes, while the first split run was 3 minutes 22 seconds, with file legs 23 seconds to 3 minutes 14 seconds (run 40147193782). Its session leg logged 201 caught, 0 survived, 100.00 score. These dated results do not promise today's timing. Earlier baselines measured approximately 18 local minutes/four cores and 30 CI minutes. The separate CI-speedup direction deferred optimization until after Phase 10  and used the Phase 0 timings as its baseline; it selected no sharding/caching/restructure/test-removal mechanism at that time. The later explicit split decision is distinct.

The page script stays outside the PR mutation gate. The October 3, 2026 hold/dialog pilot found 45 mutants, 35 killed, 7 timeouts, 3 survivors (93.3% under its timeout-as-caught convention), in 29 minutes 15 seconds, revealing two test gaps and one equivalent mutant. About 39 seconds each, one at a time on a fixed browser-test port, implied about 5.3 hours for 488 mutants. That is a dated estimate, not current measurement or a selected browser-mutation project.

Test-rewrite cuts have their own boundary: map every unit/audit/browser test to its requirement and real failure first. Apparent repeats are candidates. Research and the recorded test-specific go precede cuts; each cut group needs its own yes, failed groups split. Unit removal needs 100% coverage and mutation plus another test for the requirement. Browser cuts need their own coverage or deliberate-break proof, or stay out of round one. Heavy document-cut authority is not test-cut authority.

## Audit and evidence

The historical October 22, 2026 records D78-D79 describe the item-26-only Candidate closure limit and decision sets A/B, including Not Established for the eight device/display/Safari halves. These are recorded status selections with retained gaps, not new correction authority, a device-evidence plan or a change to code, tests, requirements or CI.

Specific approval gates remain in the blueprint even though automatic phase advancement was selected. Phase exit criteria are not bypassed. A historical phase closure is not whole-product proof or permission to make unrelated changes.

Phase 4 closed from existing eight-family records without new checks, with explicit limits: pixel-density change across displays (row 7), Safari quick-tap zoom (row 26), on-device lost/restored drawing surface (row 68), a real live-host offline install and timing beyond level 1. No retest was scheduled by that closure. Later row 7 wording and other finding verdicts must be read at their own recorded scope.

The Phase 5 exception permits only item 26 to remain Candidate at closure; physical-iPhone rechecking is optional. Every requirement/property still needs its certification status. The twelve set-A dispositions keep their named gaps and split Partially wording; eight device/display/Safari halves remain Not Established in scope, with later evidence possible. This chooses statuses, not fixes/device trials/tests/requirements/CI changes.

Confirmed injected outcomes are not ordinary-play incidence. Q3's undefined timer-handle argument is code-only, with no real browser returning undefined shown. Drawing S5 keeps three separate outcomes: first report/retry, a different later error not reported, persistent bad color starving controls. L1 replacement random-play and one-to-four-clear checks found no fault, but do not recover the original unseeded 3738 lock trace. Simulated second-finger takeover and 60 px release-without-move results do not establish real-phone/Safari sequences. Existing precise finding homes retain these method/scope distinctions.

F29 complete-good-save input remains an evidence limit with F20, not a separate repair or assertion every save is invalid. PR #293 repaired the recorded reset-count/lowest-history defect; older D72f's 'fix unfinished' is historical, not current. F30 test-evidence gaps and F31 audit coverage limits are not game defects on their own. Modal F32 direct-call/before-open cases are distinct from real clicks blocked after showModal succeeds, and the obsolete unfinished-opening explanation is historical only.

F23's current record is the injected nonstorage serializer exception swallowed at manager scope: Pause stays paused without the required stop/test signal. No ordinary cause or browser measurement is shown; storage failures remain SAF-2 exempt. Earlier D73 wording is history, not separate classification. S10's rounding tolerance, S2 withdrawal-after-later-error and S11 hand-edit meanings are audit settings, not requirements independently prescribed by a person.

## Historical source-validity comparison

On October 4, 2026, the official 13-page Google Secure by Design report (https://storage.googleapis.com/gweb-research2023-media/pubtools/7665.pdf) was compared with the secondary summary's statements about it. The report supported them with one attribution discrepancy: the summary placed the syzkaller bug counts after its data-race remark, while the report cited those counts for bug finding outpacing bug fixing. Android-blog figures were not checked and the summary stayed unchanged. The four source summaries were assistant-written secondary summaries, not primary sources or a conformance claim. This is the bounded D10 comparison referenced by the evidence record, not a new external verification.

## Existing publication losses and bindings

The historical migration record preserved existing individual dispositions as governing at their own stated scope; migration did not replace them, erase their limits or recreate missing evidence. Later scoped repairs supersede them only where recorded. This is retained historical meaning, not new execution authority.

The D86 reduction omitted the concrete Phase 7 command table, Phase 5-9 input lists, dated phase-position/correction table and remaining reserved-approval list. Those operational and historical details are not preserved in this page; no claim that their exact inventory survives is made. The shorter page retains results and limits, not a replacement execution packet or new approval.


Earlier working-paper removals/shortenings already lost detail and remain history, not current full records. The Phase 5 closure record holds the 53 finding union, 18 appendix entries, 3 unclassified entries and its unresolved checks 3/4/coverage limit. Its count is dated, not all current issues. Lost originals cannot be recreated by migration; a nonreplayable counterexample needs a recorded replacement run before re-falsification.

The shortened Phase 3 PCE/PLY/SCO paper retains 17 candidate entries, assumptions/limits, 15 observations and 10 mapping gaps; only PLY-6 and SCO-2 keep original claim wording, the other 15 have summaries. Many full claims, proof methods, mapping/evidence fields and source lists are history-only. The O1-O8 paper retains assumptions/limits, O6 trust ledger, 9 mapping gaps and recorded unknowns, not all old definitions/methods/code/evidence fields. These candidate papers are not established as the source of later certification limits. Current requirement-scope pointers distinguish Claim from Summary, and old method/evidence pointers may refer to history-only detail.

The shortened writer matrix retains W03/W04/W05, checkpoint placement, absences/limits, 10 gaps and 21 source-operation limits. Most concrete writes/specifications, 21 state assignments and item-centric index are history-only. The route index retains 35 anchors/gaps. L09/L15 citations now resolve to retained limits, not full old assignments. Original/source/public identity distinctions remain material wherever an evidence claim depends on them.

The shortened blueprint retains R1-R5, exit criteria, requirement texts, appendices/properties and finding record; it removed amendment narration/repetition and repaired dated citations/paths. A historical hash identifies the historical bytes only. This rewrite proposes no new hash-chain archive. Existing input/reference bindings needed to interpret retained evidence must remain with those claims.


# State, failure and trust rules retained from the phase ledger

## Scope and state

The recorded scope covers all 55 requirements. The eight device/browser-dependent rows APP-1, APP-4, DSP-1, DSP-2, DSP-4, DSP-6, DSP-7 and QA-4 remain in scope with evidence gaps until the necessary evidence exists. Scope follows applicability, not anticipated proofability or a chosen trusted boundary. Scope is not certification; inability to establish a requirement becomes an evidence gap or result, not retroactive exclusion.

The state model has exactly five categories: authoritative game state, derived state, runtime resources, persisted representation and presentation state. Service-worker/cache/version state lies outside this state model, not outside APP-2/APP-6 audit scope. PCE-6's recorded interpretation and the lack of ordinary-state rollback are model boundaries, not implementation certification.


The authoritative boundary is the conceptual commit point of a specified legal operation's permitted authoritative changes and authorized persistence effects, independent of function structure. Validation alone gives no authority. Environmental routes may change external/runtime/persisted state without committing game state; external data gains authority only through acceptance in an authorized transition. Drawing/polling do not directly commit game state absent an explicit later exception. No privileged exception was adopted.

Ordinary validity is required at successful committed boundaries, not every invisible intermediate mutation. This does not weaken SAF-4's after-every-action/timer checkpoints. A throw after mutation retains the reached ordinary contents except the changes needed for fault stopping; retained partial contents do not become valid just by remaining. There is no ordinary-state rollback guarantee. The safe-terminal skeleton is game over, no timers running, fault reported and last-good save kept, without additional board/queue/piece/score/hold validity. Persistence meaning is separately governed by R2/R4.

Authoritative items are locked blocks; falling kind/rotation/position; held piece; hold-used; next-three; bag; score; mode; reset count; confirmation pending/selection; held directions/order; repeat position; touch drag and controlled piece; later-added lowest row; later-added withdrawn indicator. Derived values are level, resting, ghost landing, gravity interval and later Continue availability. Runtime resources include gravity/lock/repeat/other modeled callback handles and wake lock. Persisted representations are session/highscore and later eligibility; presentation includes rendered UI and locked-block redraw marker. Random draws/generator are inputs, not authoritative state; resulting bag content is authoritative, with no generator-state preservation requirement.

R1's full B1-B17 predicates remain in the valid-state record, including four-block geometry, semantic game-over absence versus physical field clearing, three valid upcoming pieces in every mode, one Hold per lock cycle, empty-bag validity, reset count 0-16 and the special paused-resting meaning of 16, and exact Continue history. The lowest row is the greatest board-row index reached by any block during that piece's lifetime, with rows increasing downward, not its box origin. A new current piece resets its count to zero; resume is not a new piece and Continue restores saved values.

The image and extracted table are jointly fixed geometry references; neither overrides the other. Disagreement leaves that kind undefined until separately settled. Extraction from image pixels is provenance, not independence proof. The second machine-readable source matched 24 non-O states and the O shape, but names the same community wiki as origin. That check does not make the sources independent. Exact retained geometry identities stay in R1 and the evidence record; repeated historical checksums need not fill the phase ledger.

## Withdrawal, failure and reporting

A session-local, nonpersisted withdrawn indicator is authoritative. Continue availability is derived from saved eligibility, the indicator and content validity. Eligibility requires the exact stored string "true". The indicator is set by this session's withdrawal or attempted withdrawal, starts clear on page load and clears after this session's successful save. Another session's save does not clear it. This is the recorded narrow exception to DSP-5 for Continue availability only; its other display obligations remain. It is a semantic reading, not proof of implementation or a newly granted requirement edit.

The R2-R5 record keeps failed-save/withdrawal/read distinctions, last-good save, requested gravity timing and hand-edited-content validity. Its 0.000000001 millisecond rounding tolerance is a drafting figure, not a separately selected number. Requested delay is not browser conversion, elapsed time, lateness or throttling. Hand-edited valid content need not be legally reachable or earned; no anti-cheating/tamper protection is claimed. Eager rewriting on every read, destructive first-launch migration, wall-clock cutoff, deletion before commit and cross-tab retirement were not adopted by these rules.

SAF-3 reporting means a plain player-visible stopped-for-internal-error message plus a separate test-observable signal. No stored fault log or extra board/queue/piece/score/hold condition is added. SAF-5 instead keeps drawing/polling running with a small nonblocking, nonpopup problem notice plus a separate test signal. Exact notice wording and placement are not selected by that rule.

A successfully cancelled timer is trusted not to fire. Registration/cancellation that throws invokes safe stopping and reporting. If cancellation itself fails during stopping, a retained timer may fire but must not change the stopped game: game over, last-good save kept, fault reported. This chooses an outcome, not a mechanism. Gravity, lock delay and held-repeat timers are covered after each firing and for caused actions, and are stopped while paused/over. Drawing and controller-polling loops are not timers in this sense.

The blueprint source grounding says no outside source was verified for O5, O6, O8 or the O4 write-ordering method; those rested on recorded adoption, not borrowed authority. A checksum detects accidental corruption, not tamper resistance. CSP, a header proxy, CodeQL, Dependabot version updates, SHA pinning and storage persistence were distinct unresolved controls, not automatic requirements. Later statuses must be read separately.

## Trust boundaries

Successful browser storage operations are trusted, contents are not: validate whole content. Storage may be edited/lost, has no permanent-storage or tamper guarantee, and failures must not stop gameplay.

GitHub Pages is trusted to serve deployed bytes and successful cache operations to follow documented semantics. The game's cache logic and same-origin project interference remain audited. There is no compromised-account protection or availability promise. CI/settings evidence is dated; GitHub's execution/reporting is trusted, but green checks are not proof of complete safety. The random source is assumed to give valid values; the seven-piece bag is checked, with no unpredictability/cryptographic claim or new generator selected.

Successful documented browser-feature behavior is trusted for the specifically listed canvas/color-space, animation frame, gamepad events/reads, wake lock, resize/viewport/pixel-density/media-query, dialog, visibility, keyboard/blur and active-element facilities. Game arguments, call order, state changes, painting decisions, mappings, retry/result/failure handling remain inside scope. Missing/refused features are not excluded. A facility not listed gains no trust by analogy. No protection against browser bugs or false success is claimed. Controlled stand-ins are permitted evidence with their own limits.

Successful service-worker registration and fetch are likewise trusted to follow documented semantics, without a success guarantee; requests, results and refusal/failure handling remain audited. Clock accuracy and steadiness are not trusted. Forward/backward jumps must be checked where time controls loading or cleanup; a jump alone cannot prove a version safe to delete. The original clock question concerned a forward jump during loading; the two-direction elaboration is audit drafting, not an extra selected accuracy promise. Existing tests alone do not guarantee safety; failures become findings through the normal process.

## Legal-operation frame and selected consequences

A legal operation changes only explicitly assigned authoritative state and preserves the rest. This principle did not adopt the implementation-exposed authored operation table. D32's assignments were sourced readings, not separately approved entries.

A line-clear save captures the completed turn including the next piece; if that turn ends the game it writes no save and withdraws the old one. A cancelled touch makes no rotation and returns gesture state to none. A touch exceeding 10 pixels at any time is not a tap even if it returns, while already committed moves remain. A held direction, soft drop, stick or pad direction does not repeat on resume until released and pressed again. Token representation is an implementation choice. Continue leaving the withdrawal indicator unchanged is a sourced consequence, not a new choice.

## Model and evidence boundaries

The historical D39 model-input composition was D16-D34 decision text with status, Not-decided, code, ledger and baseline annotations removed. D27 W4 and D29 K2 were replaced by D35 code-free restatements. These bounded transformations define that historical model input, not a claim that the full decision ledger or current rewritten page was the exact input.


Normative decisions are separate from status/provenance, Not-decided lists, code locations, observed behavior and finding history. Implementation-exposed route inventories and proof-obligation records must not be given to an unexposed independent-model author. The historical inventory's ten observations and 55 requirement obligations were candidates, not findings or certifications.

The historical model input approval covered only four exact files: rule text, the then-current requirements and the image/table geometry. It did not approve the model, freeze, results, correspondence or findings. The requirements copy differs from today's rewritten requirements; old checksum identity is not current identity. The input pack's DRAFT header did not override its recorded input-only status. The model author received only those four inputs. A reviewer without production exposure checked the pack's fidelity/leaks and all 28 geometry states; this is distinct from implementation correspondence.

Four model revisions and original limitations were frozen historically; revision 1 stayed unchanged and revision 2 changed no model logic. Self-tests show self-consistency only. Source completeness, explicit undefined cases, stored-format correspondence and independent differential evidence remained open at that freeze. No complete oracle, Phase 3 closure or implementation claim follows.

These records were drafted by an implementation-exposed author under O8, with source-recorded semantic selections distinct from final prose/checksum approval. Phase completion matrices and automatic-advancement chronology do not certify game properties or authorize new changes. Historical pending cells are not current runtime verdicts. Existing rule/requirement and later-fix comparisons govern any present-tense statement.

## Historical property applicability and operation assignments

Recovered from git commit `c7c4c12ae9accf2a3f9d95b56f7e37897a697bc6`, not newly adopted or runtime-verified. These implementation-exposed authored sourced mappings were not separately approved as tables. Their predicates and cited scope remain bounded by the later selected consequences above and current requirement changes. In particular, old prebag/legacy acceptance and pause-token wording must not be read as today's implemented behavior. Historical source wording is retained here to avoid silently losing the exact mappings while consolidating the ledger.

| Property | Applicable requirements | Phase 1 decisions that shape it |
| --- | --- | --- |
| O1 Authoritative transition boundary | PCE-6, STA-1, STA-2, STA-3, SAF-3, SAF-4 | D16, D17, D20 |
| O2 Valid transitions only | PCE-1, PCE-3, PCE-4, PCE-6, PLY-1, PLY-3, PLY-4, PLY-6, PLY-7, SCO-1, SCO-2, STA-1, STA-2, STA-3, SAF-4, SAF-6 | D16, D17, D18, D23 (U4) |
| O3 Validated persisted state | SAF-1, SAF-2, STA-4, STA-6, SCO-3 | D18, D21 (S7, S8, S11) |
| O4 Persistence ordering | STA-1, STA-3, STA-4, SAF-2, SAF-3 | D21, D22, D23 (U1) |
| O5 Code-to-claim link | QA-1, QA-2, QA-3, QA-6 | none |
| O6 Trust ledger | SAF-2, SAF-3, SAF-5, STA-6, PCE-5, APP-2, APP-3, APP-6 | D22, D23, D24 |
| O7 Boundary enforcement | SAF-3, SAF-4, PCE-6 | D16, D20, D23 (U4) |
| O8 Independent executable reference model and correspondence | none: no requirement text prescribes it; the blueprint adopts it | none |

The requirement list for O3 includes SCO-3 for the stored high score, whose goodness is decided under R4 and is not restated here. The lists are identified from the requirement text and the blueprint wording for each property and are open to correction by later phases.

## Conflict register

Each row names a tension between requirement texts, or between a requirement and a decision, and how it stands. Rows marked resolved are settled by an existing selected rule. No row creates a requirement.

| # | Tension | Status | Where settled |
| --- | --- | --- | --- |
| 1 | STA-3 "the saved game is forgotten" at game over against SAF-3 "the last good save is kept" on a fault | Resolved: different triggers | D21 S2, S3 |
| 2 | "Forgets the saved game" (STA-1, STA-3, SAF-1) read as deletion | Resolved: forgetting is withdrawal from Continue | D21 S1 |
| 3 | SAF-3 "no timers running" against a timer whose cancellation fails | Resolved for that case by the selected interpretation | D23 U3 |
| 4 | SAF-3, SAF-4 and STA-3 "timers" against the drawing and polling loops that SAF-5 keeps running | Resolved: timer scope | D23 U4 |
| 5 | "Reported" in SAF-3 and SAF-5 undefined | Resolved: two criteria | D22 T1, D23 U2 |
| 6 | SAF-2 "storage never stops the game" against SAF-3 "if anything throws the game stops" | Resolved: storage failure does not stop gameplay | D21 S4 to S7, D23 U1 |
| 7 | PLY-2 gravity interval against the timer delay the browser actually uses | Resolved: judged on the requested delay | D21 S10 |
| 8 | STA-4 "restores exactly what was saved" against hand-edited or damaged saves | Resolved: accepted whole or rejected whole | D18, D21 S11 |
| 9 | DSP-5 "buttons ... always match the game state, including changes made in another tab" against D21 S9, where a tab that has withdrawn a saved game keeps Continue unavailable even if another tab then saves | Resolved by the selected interpretation: the D21 S9 limit stays, as a narrow exception to DSP-5's wording for Continue availability only. DSP-5's other display obligations are unchanged. REQUIREMENTS.md is not edited and the class of any later requirement edit is not decided. | D25 (the recorded conflict resolution) |


## Operation assignments stated by the sources

Control operations (D16 section 5):

| Operation | Items changed and source |
| --- | --- |
| 1. Confirmation open | 10 to pending, only while paused; 11 to Cancel (B12, STA-1) |
| 2. Confirmation selection change | 11 (STA-1, INP-4) |
| 3. Confirmation answer | New Game: the game is given up and a new one starts (STA-1): board, score, held piece, queue and bag reset, hold available (B8), saved game withdrawn (S1, S2; item 16 set, S9); 10 and 11 cleared (B12). Cancel, Escape, a click outside the dialog or any other action: 10 and 11 cleared, the game stays paused (STA-1, B12) |
| 4. Direction or control press | 12 gains a token in order of pressing (B12). A press with Cmd, Ctrl or Alt never counts as held (INP-3). The game effect of a pressed control is the gameplay operation below |
| 5. Direction or control release | 12 loses the token; the last remaining token wins (B12, INP-2); disconnecting a gamepad releases everything (INP-4) |
| 6. Repeat-control progression | 13 advances (INP-2: first repeat after 167 ms, then every 33 ms; soft drop at once, then every 50 ms); each repeat is a move or soft drop below; repeating stops when the game stops playing or the window loses focus (INP-2; 13 idle when paused or over, B12) |
| 7. Touch begin | 14 (B12, INP-5); see Historical operation points not specified by those sources |
| 8. Touch update | 14 (B12); a drag moves one column per cell after half a cell, and soft drops one row per cell (INP-5); those are the move and soft drop below; 14 controls only the piece that was falling when the drag began (INP-5, B12) |
| 9. Touch end or cancel | 14 (B12); see Historical operation points not specified by those sources |

Gameplay operations (not enumerated in D16 section 5):

| Operation | Items changed and source |
| --- | --- |
| Move left or right, rotate | 2 if legal (PLY-1, PCE-4; unchanged if nothing fits). If the piece reaches a new lowest row, 15 becomes that row and 9 becomes 0; otherwise a resting piece with 9 below 15 gets 9 plus 1 and the 0.5 second delay restarts; at 9 equal to 15 the delay is not restarted; moving off a ledge cancels the delay (B9.2, PLY-6) |
| Gravity tick, soft drop | 2 down one row (PLY-2, PLY-3); 15 and 9 as for a fall (B9.2: "move, rotation or fall") |
| Hard drop | 2 to its landing position, then lock (PLY-4) |
| Lock (hard drop, delay expiry, landing at count 15 after a cancelled delay) | 1 gains the piece, full rows removed and rows above shift (SCO-1); 7 scores 100,300,500 or 800 for 1, 2, 3 or 4 rows (SCO-1); the next piece becomes current from 5 and 5 refills from 6, 6 refills with a full bag when empty (PCE-3, PCE-5, D16 1.1); 4 returns to available (B8); 9 becomes 0 and 15 becomes the greatest row of the new piece (B9.2); 14 no longer controls the old piece (INP-5, B12). If the new piece has no room: ordinary game over (STA-3) |
| Hold | 2 and 3 swap, the held piece in its starting state, or the next piece from 5 and 6 when none is held (PLY-7); 4 set (B8); the piece brought in has 9 equal to 0 and 15 at its initial row (B9.2); no room means ordinary game over (STA-3) |
| Pause, page hidden | 8 to paused (STA-2, STA-5); a pause during the lock delay cancels the delay and counts as one reset: 9 plus 1 when 9 is 14 or less, and 9 becomes 16 when it was 15 (B9.2, STA-2); gravity, lock delay and repeat stop (STA-2, U4); 13 idle (B12); pausing saves the game (STA-4) |
| Resume | 8 to playing (STA-2); a resting piece starts the 0.5 second delay again, except that at 9 equal to 16 it locks at once (B9.2) |
| Continue (from game over only, when Continue is available) | 1 to 9 and 15 restored exactly as saved, 8 to paused; a fresh bag if the save has none (STA-4, B9.2, STA-6) |
| New Game from game over | as New Game under operation 3 (STA-1, INP-4 "a game Menu just started", B8) |
| Ordinary game over (new or held piece has no room) | 8 to game over; all timers stop; saved game withdrawn (STA-3, S2; item 16 set, S9); items 2, 3, 4, 6, 9, 14 and 15 have no semantic value, and clearing them is not required (B6, B8, B12) |
| Engine fault stop (SAF-3) | not an ordinary transition: game over, no timers running (a failed cancel may still fire but must not change the stopped game, U3), fault reported (T1), last good save kept (S6); the ordinary contents reached at the fault are retained (D16 section 7); a fault alone does not withdraw the saved game (S3) |

Persistence effects stated by the sources: item 16 is set when this session withdraws the saved game or attempts to, and cleared when the session starts and when this session writes a saved game successfully (S9); a failed save withdraws the saved game from Continue (S5); a failed withdrawal is covered by S4.



## Historical operation points not specified by those sources

This is the historical unresolved list at the operations record, not a statement that later changes did not happen. The source did not assign or exclude these points. Later scoped touch and held-input decisions and fixes are described separately in this page and supersede a point only to their stated extent.

1. The effect of a cancelled touch on the controlled piece, and which of the touch operations (7, 8 or 9) commits the rotation that INP-5 says a tap causes.
2. When the save that STA-4 says line clearing causes is written, relative to the next piece appearing and to a game-over result. STA-4 says only that clearing lines saves; B16 says what a valid saved game contains, not when it is written.
3. Whether the held-direction tokens (item 12) survive a pause, and whether repeat (item 13) restarts on resume while a direction is still held.
4. Whether Continue changes item 16. S9 lists only withdrawal or its attempt, session start and this session's successful save, so by S9's wording Continue does not.

## Not decided here

- The historical unspecified operation points.
- Closure of the Phase 1 exit item on operations (blueprint O1). The unspecified points must be specified, or the exit criterion shown to be met without it, before that item can close; recording the points as unspecified does not meet it.
- Any change to REQUIREMENTS.md and any code change.


# Selected save, offline and touch directions

## Save rules and target scope

D52 records the R2-R5 save rules as organized into Save, Withdraw, Read and Fault. Their rule index preserves the original S1-S9 references; S8's stored-high-score clause and S10/S11 remain separate. The reorganization itself changed no behavior.

D53: a save is finished only after valid content is written and made available for Continue. A write that is not published does not replace the last-good save. Recovery, rollback or retention mechanisms for that case are not selected. An admitted conversion that fails to save followed ordinary failed-save withdrawal, without a special exception, under the now-superseded convert-once target.

D58: the later selected target supports only its finalized current save layout. It refuses otherwise-valid older layouts, without a one-time converter or legacy-default fallback. This supersedes the convert-once direction. For the finalized reader target this supersedes the R1 B9/B16 legacy acceptance, ignored old level, prebag fresh-bag and L1/L2 compatibility-default clauses. The R1 paper nevertheless preserves those clauses as its historical/current-adopted-contract text, pending separately authorized paired behavior-and-requirement work. The remaining state predicates, stored-score bounds, paused restoration and exact current-save history are unchanged. The ledger and R1 paper predate later requirement edits, so their implementation-unchanged wording is not a fresh claim about current code. Refusal may cost a whole saved position, not merely a high score. The high score is separate and is not erased by old-save policy.

D59: the finalized target has no dedicated format-label member. A former label member is an unknown extra member. This does not date or authenticate the writer and does not ban every version-like gameplay string. Later schema changes must define admission and meaning distinctly and must not silently reinterpret same-shaped older stored saves. No compatibility converter or malformed-content repair is introduced.

D60: for present, successfully read saved-game content that fails the finalized current layout and validation, ordinary withdrawal is attempted. This covers old-layout, unknown-layout and malformed-current records. No gameplay from the refused record loads. Payload bytes are not deleted, storage is not cleared, and the separate high score is untouched. Failed reads and successfully established absence are distinct and do not themselves mutate storage. Other withdrawal triggers, failed-save rules and last-good-save rules remain unchanged. No retry, recovery, marker, key, transaction or cleanup mechanism is selected by this refusal rule.

These are selected target directions, not a claim that each target admission rule is implemented. Current requirements remain operative. Implementation changes need paired behavior-and-requirement work where required by the change rules. In particular, the current loader's acceptance of unknown members, duplicate names and exponent spellings is tracked separately in issues #349-351; acceptance today does not by itself violate a future target rule.

## Finalized-format admission choices

- D54: reject the whole record for an unused extra member at the top level or within the falling-piece object, even when every required member is present and valid. The permitted member set and literal names remain unselected.
- D55: reject a required field name repeated in the same object even if both values agree. This is not a duplicate ban at every depth or in every object. The required names and complete schema remain candidate. Differing copies do not inherently force a guess; rejection is the selected rule, not a necessity proved by that argument.
- D56: numeric fields use plain whole-number spelling. Reject fraction or exponent forms such as `100.0` and `1e2` even if the value is a whole number. Exact numeric domains, signed zero, signs, size limits and the binding to the eventual syntax schema remain candidate. Accepted spelling alone does not validate content or select score ceilings or count relations.

Still unselected: duplicate-name handling beyond repeated required names; numeric denotation beyond plain whole-number spelling; syntax, strings and name decoding; re-encoding preservation; storage layout, recovery, cleanup, retirement and completion protocol. Format-label dispatch and conversion-only encoding, keys, trigger, durable completion and source/target cleanup/failure ordering were retired with the convert-once target, rather than left as live migration tasks. Old cached tabs can still write; their interference remains relevant and under review.

Comparative effort and frequency of unknown members or alternative spellings in hand-edited/foreign saves are unmeasured. No independently certified population of new-format saves was found. The earlier claim that unknown-member options had about equal effort was corrected; the selection remained. Repeated-name discussion was corrected to remove the claim that differing copies force guessing.

The numeric-spelling comparison recorded no fraction or exponent output from native number-to-text conversion across 100,005 integers from -4 through 100,000, with the maximum allowed score and negative zero checked separately. Five retained historical boundary writers used that conversion. This does not certify the current serializer as the future writer. Scratch classifier sizes were 21, 6 and 6 nonblank lines; shared token reading was 60 function lines, 61 with export. These are discarded scratch sketches, not measured production cost or effort. The recorded numeric choice was reconfirmed after four corrections to the evidence report.

## Design priority

D57: simplest app first, then avoid an invalid state. This supersedes the earlier invalid-state-first order without changing validity rules. It selects no compatibility policy, field list or implementation by itself.

## Offline release direction

D61: the whole game works offline, with no feature deliberately disabled for lack of a connection. A release is one matching set of game files. One place gives the current-release answer and everything else reads that answer.

This does not promise an uncached first visit without a connection or select a cache layout, cache/retained-release count, file count, release-ID representation, resource-list format, build/deployment mechanism, update/cleanup mechanism, test change or global state layout. A single answer does not prove complete-release loading or safety. Practical limits and fallbacks must preserve the selected offline behavior and be justified by evidence; reliable detection of every consumer is not assumed. Operational values come from purpose and current evidence, not arbitrary numbers. Implementation paths, consumer detection, hosting constraints and cost remain unresolved. No failure rate, effort saving or runtime saving was measured by this selection. Existing offline requirements remain operative.

## Tap threshold

D62: a touch that moves 10 pixels or less counts as a tap. Apple's default long-press movement limit and default minimum drag distance are 10 points. Those defaults are a starting point, not a points-to-pixels conversion or proof of this game's physical-touch behavior. Touch testing remains needed for that evidence.

Sources recorded in D62:
- https://developer.apple.com/documentation/SwiftUI/View/onLongPressGesture(minimumDuration:maximumDistance:pressing:perform:)
- https://developer.apple.com/documentation/swiftui/draggesture/init(minimumdistance:coordinatespace:)-8ffe5

## Evidence limits

The rule drafter had read production code and was not implementation-independent under O8; the source records say no rule was taken from code or tests. Semantic selections and implementation-exposed authored final prose/checksums are different: the ledger does not record separate checksum approval of the final drafting. This consolidation is not a new implementation, model/test acceptance, phase closure or runtime proof. Historical hashes identify earlier bytes, not current rule-file bytes.


## Formal mapping and selected executed units (D50-D51)

D50 records claim-appropriate mapping for the then-current 63 correspondence entries and seven support documents, while differential evidence remains bounded by its own method. Four Not Established relations stay in scope. A completed mapping/publication step does not promote any property to Proven or complete Phase 4/finding certification. The later consolidation records the specific postmerge publication receipt as deleted and unavailable; this candidate does not recover or newly authenticate it.

D51 records four previously executed units: confirmed New Game factory cut; paused held-repeat checkpoint; cache delete/reopen identity; and valid ResizeObserver sizing prefix. Their S2/U4/APP-6/U2 relations are Candidate recommendations, not Confirmed Defects or property certifications. Independent bounded raw/source/criterion review and later documentation readback have their separate limits. The original failed/partial resize attempt and historical evidence gaps remain. The exact approved cache-wording attachment was not recovered, so cache criterion comparison used the inspected pinned blueprint rather than claiming that missing attachment was checked. No new execution is implied.

## Historical bounded evidence limits

October 5, 2026 candidate evidence, not today's implementation or current certification. These distinct result and independence limits remain; the detailed surviving Phase 3 papers have their own paths.

For D42-D49, all observations and mappings remain Candidate and certification Not Assessed. None selects a source rule or accepted oracle, disposes a finding, closes Phase 3, or changes production, public-site, permanent-test, CI or executable code. Each row below is read with this shared limit; its unique limits remain in the row.

| Original record | Meaning and limits retained |
|---|---|
| D42 | Historical documentation record. Independent bounded reviews are evidence, not oracle or implementation acceptance. D39 inputs and D41 freezes unchanged. Proposed methods and remaining gaps remain explicit. |
| D43 | Historical documentation record. Bounded independent reruns and fidelity reviews retain their declared limits; nineteen legal-operation source-citation checks remain pending. No production/public-site/test/CI/executable change; D39 inputs and D41/D42 records preserved. |
| D44 | Nineteen previously pending L rows received bounded source-citation review, not full runtime or adoption proof; D43 remains historical and unchanged. Static source spot reviews, independent Node conditional-cutpoint reproduction and source/JSON/pixel-only browser reviews have distinct limits. Silent normal-return cancellation delivery is outside D22 T3 successful-cancel trust, not a firm U3/U4 violation; throwing cancellation variants are conditional adapter evidence. Synthetic capture-failure, trusted mouse and protocol-emulated touch are separate. Exact 10 px equality remains a candidate E1 reading, not a rule selection or classified finding. No Phase 3 closure, oracle acceptance, finding disposition, production/public-site/permanent-test/CI/executable change. Later gamepad/controlled-clock work is not included. |
| D45 | Browser source/JSON/pixel reviews without independent browser rerun remain separate from independent Node factory/manager reruns and documentation wording reviews. Post hoc ghost raster classifier, non-discriminating priority cases, one-kind Hold restoration, current source-byte identity not historical attestation, corrected failed harnesses and sampler attempts remain explicit. Factory 5040 discrete choices and manager 5040 NewGame cases do not establish random fairness, universal correspondence or full Continue reachability. v14 excluded. |
| D46 | Finite growing-stack/post hoc raster observations, two SAF-5 adapters, ten first-method cuts, and two measured alpha/resize/ArrowLeft followups. Source/JSON/pixel reviews are not browser reruns; alpha measured, cause inferred, save-stack depth unproved. Failed harnesses and identical cut images retained; no native-fault or all-context reachability. D45 unchanged. |
| D47 | Final V18 additional-right count one; stale first-run two count corrected. Physical-token survival and resume-suppression contrasts remain unclassified. Mouse-pointer excursion and Hold identity guard do not establish physical touch or complete gesture withdrawal. Actual final JSON checks and source/JSON/pixel reviews have distinct limits. |
| D48 | Independent Node packed-source byte-identical reruns for v22/v24 remain separate from browser source/JSON reviews without rerun. Outstanding scheduled callbacks, not handle truthiness; fakeControllable pause is not engine proof. Fullpage actual GM pause resolves UI lag but source fields are not full semantic A1-A16. Getter availability and session withdrawal have inverse polarity; S4/S9 contrasts remain candidates. Serialized JSON null is not direct raw undefined evidence. |
| D49 | Final closed focus blank in both, reopened Cancel; stale first-run focus/variation claims corrected and stdout retained. Coordinator captured-field equality differs from reviewer limited-field comparisons. Default autofocus cause inferred; identical open/reopen images are not trace provenance. Pending DOM-focus choice projection is finite, not all-modal or full A1-A16 frame proof. |


## Eligibility-read failure: Continue withdrawal disposition

These historical disposition arguments retain their own injected, source-only, ordinary-route and measured premises below. None is a new native or physical-device reproduction, full R1/property certification, Phase 4 closure, or approval for a fix or a code, permanent-test, model, requirement, CI or public-site change. Later scoped repairs remain separate. Reading a subsection alone requires this shared limit as well as its own distinct bounds.


Historical repaired route; the later scoped findings govern current status.

The older public Continue route converted an eligibility-read failure alone into a persisted withdrawal. The later flag-read guard is covered separately by PR #302; the payload-read repair is PR #192. Confirmed Defect, by source argument plus qualified historical reproduction. S7 forbids stored mutation or withdrawal from a read failure alone. The historical Original119 and its source comparison showed the flag read throwing, no payload read, then a successful false-flag write. The premises are a fresh cache, a side-effect-free read throw and normal writes; the historical launches are repeated, not one fresh measurement. Unread payload goodness is unnecessary for this narrow rule but is needed for stronger S6 loss claims. This narrow historical route did not establish the whole F24 property. This record moves here from the deleted October 6 status and dispositions page.

## New-save reset-count preservation disposition

Historical defect argument; fixed by PR #293 at the scope in F20.

Finding F20 (see the table under "Findings carried from deleted disposition papers") records a source-argument defect under ordinary engine-route premises. Two finite legal Pause routes yield reset counts 1 and 3 but identical ordinary saved payloads, so one fixed denotation cannot preserve both exact counts under R1 B3/B9/B16. This closes the earlier paired-argument writer-entry admission gap, not prior-good payload construction, whole F20/S6/B16 certification, native reproduction or Phase 4. 

## Injected serialization-failure handling disposition

`docs/audit/serialization-failure-scoped-disposition.md` records a narrow independently reviewed F23 source-argument defect: the declared injected nonstorage serializer exception is swallowed, and under normal post-operation check premises public Pause remains paused without the required SAF-3 stop/test signal. The original injection domain does not require a naturally occurring unmodified-JSON cause. S5 withdrawal remains expected and is not itself this defect. Historical115 is qualified repeated artificial-mechanism corroboration, not new native reproduction, full R1/T1/S6/F20 certification or Phase 4 closure. 

## Historical paused count 15 Resume: changed in PR #288

Finding F34 (same table) records a conditional source-argument defect on an admitted ordinary seven-bag route: eighteen gravity firings, fourteen resting horizontal restarts and Pause produce same-session paused 15; Resume immediately locks the old O instead of starting the delay B9.2 requires. Valid random 0 prefixes, successful resources and finite callback ordering, fixed-O anchor-to-semantic-low offset and V1 intermediate-state limits are explicit. Earlier controlled-factory evidence remains qualified historical corroboration, not new native reproduction, whole R1/B16/SAF-6 certification or Phase 4 closure. Pending Q2/Q1 detector choices are unchanged. 

## Exact stored high-score read disposition

The earlier exact stored high-score read disposition, whose paper is deleted, recorded a conditional source-argument defect (now superseded, see "Current amendment: one ceiling for stored scores"): good stored high-score text 9007199254740992 denotes exact 2^53 under S8/B3/B11/B16, but the safe-integer reader returns 0. Ordinary game-writer creation is not required to admit this valid external stored content. Successful read/unmodified numeric built-ins/noninterference premises and qualified historical 42-case limits are explicit. Ordinary legal-clear lower overwrite remains a separate admission gap; no all-format/arithmetic/native/full SCO-3 or Phase 4 certification follows. 

### Exact stored high score: ordinary lower-write admission

The independently reviewed finite ordinary seven-bag route I0/O4/T0/S0/Z0/J0/L0/I6 closes the exact 2^53 read disposition's legal-clear gap: the eighth unrotated HardDrop completes only row 19, score 100, and successful source reading/writing replaces good stored 9007199254740992 with 100. The geometry and premises lived in a paper that is deleted. This disposition is history, superseded by "Current amendment: one ceiling for stored scores". Narrow Confirmed conditional source argument, not new reproduction or Phase 4 completion; recorded as a historical scoped conclusion. No numeric limit, Q2 decision or correction is adopted.

## Held soft drop after resume: ordinary callback disposition

Historical defect argument; fixed by PR #287 at the scope in F33.

Finding F33 (same table) records a conditional source-argument defect under D34E2: physical S remains held across Pause/paused interval self-stop/Resume, and the ordinary already-registered neutral-gamepad RAF poll starts a new soft-drop interval whose callback moves the piece without release/repress. This closes the older direct-poll/late-pad entry gap at the stated focused-key/API/resource/order premises, not native execution, full INP/U4/R1 or Phase 4 certification. Interval registration and later movement are separate; the paused U4 checkpoint and remaining Q2 evidence remain distinct. No correction or new rule is adopted. 

## Failed withdrawal: ordinary Continue availability disposition

Historical defect argument; fixed by PR #289 at the scope in F37.

Finding F37 (same table) records a conditional source-argument defect under S4/S9: failed eligibility false writes at NewGame and an admitted eleven-piece ordinary no-fit route leave stored true, and game-over plus a successful drawing/syncControls step offers Continue despite this session's uncleared withdrawal history. No prior-good payload or Continue repair is required for this availability-only facet; actual restoration, native pixels, whole R1/S6 and Phase 4 remain separate. Geometry/resource/provider/order premises and historical V24/E3 limits are explicit. Q2 and correction authority are unchanged. 

## Lowest-row history: ordinary rotation information loss

Historical defect argument; fixed by PR #293 at the scope in F20.

Finding F20 (same table) records, as its lowest-row half, a conditional source-argument defect under D17/B3/B9.2: ordinary I-first NewGame without rotation and four first-kick clockwise rotations return the same retained authoritative values but require historical occupied lows 1 and 3. No fixed extensional decoder can recover both, so at least one admitted history loses exact meaning. This is stronger than raw-anchor/current-offset mismatch, not byte/object/entire-UI equality, native execution, all-state/full R1 or Phase 4 certification. Successful provider/order/nonauthoritative redraw and representation premises are explicit; Q2 and correction authority remain separate. 

## Ordinary Pause: held soft-repeat resource remains outstanding

Historical defect argument; fixed by PR #287 at the scope in F35.

Finding F35 (same table) rests on an independently reviewed conditional source argument that confirms the narrow U4 stopped-resource defect: registered physical S/P events leave the same 50 ms held soft-repeat interval outstanding after successful ordinary Pause, with no callback, release or cancellation of that interval in the prefix. Successful providers and finite event ordering are explicit premises; later self-stop/nonmutation is not stopping at Pause. This is distinct from the paused-firing checkpoint omission and E2 Resume rearm/movement. Historical V38/SRes1 remains qualified corroboration, not new Reproduced/native evidence, full U4/R1/Phase 4 closure or correction approval. 

## Held soft-repeat registration refusal: no safe-stop conversion

Independently reviewed conditional source argument in the historical soft-repeat registration-refusal disposition confirms the narrow T3 wrong-mode/no-safe-conversion defect: ordinary registered S keydown completes guarded O movement, then its held-repeat interval registration outside that guard throws before callback acceptance, leaving the game playing with gravity outstanding. Successful earlier providers, ordinary geometry and one refusal cut are explicit premises. T1 notice/signal and good-save preservation are not inferred. Cancellation, orphan, Pause, paused-firing checkpoint and Resume findings remain separate. Not newly Reproduced, native scheduling evidence, full SAF/T3/U4/R1/Phase 4 closure or correction approval. 


## Current falling piece: safety-check extent

The selected current-piece detector extent is: required safety checks verify a valid four-block falling piece rather than rely only on constructor validity and overlap checking. This resolves Q2's current-piece extent question, not B7/Q1's separate queue-element question, a blanket full-R1 checker, a finding or property classification, code/test/model/CI/public-site approval or phase advancement. It adopts no new save parser, factory, timer, held-piece or historical-state checking rule. Historical injected-boundary evidence and ordinary production reachability remain separate review obligations. Operative only after exact-head review, required checks, authorized documentation merge and publication verification.

## Injected zero-cell falling piece: checkpoint detector disposition

Historical injected detector argument, preceding the later current/upcoming-piece checks; not current acceptance proof.

The narrow disposition in `docs/audit/zero-cell-current-piece-detector-disposition.md` records Confirmed by conditional source argument under the adopted current-piece checkpoint extent: at the historical source an expressly admitted injected zero-cell piece passed the required current-piece checkpoint and one soft drop despite independent four-block invalidity. Retained bounded acceptance corroboration is historical, uses non-delivering manual timer resources and is not a new native run or proof of ordinary malformed creation. Lowest-row-history and positive-control limitations remain; ordinary writer preservation is conditional on canonical factory inventory and excludes custom dependencies and external aliases. Other malformed partitions, full Q2/R1, checker implementation, correction/regression approval and Phase 4 closure remain open. No game, permanent-test, model or CI change. Operative only after exact-head review, required checks, authorized documentation merge and publication verification.


## Upcoming queue: element-validity detector extent

`docs/audit/queue-piece-check-decision.md` records the selected interpretation of SAF-4's "three pieces queued": at each required safety checkpoint, exactly three valid semantic upcoming pieces under R1 B3/B7, not count alone. This resolves B7's deferred detector extent without editing REQUIREMENTS.md, changing the waiting-piece domain or imposing active-piece fit/history/timer conditions. Source count-only comparison remains separate from malformed-state reachability, ordinary-writer preservation and executed evidence. No Q1/all-state R1/Phase 4 closure or production/test/model/CI/public-site correction approval. This records a detector rule, not fresh implementation verification.


## Controller A: scoped missing selected-Cancel response

The scoped classification proposal for this finding, a Phase 4 working paper removed from `docs/` (it remains in git history), records the narrow INP-4 Confirmed Defect disposition by independently reviewed conditional source argument: after the named successful opening/interior-nonbutton prefix retains logical Cancel, a fresh isolated controller A edge is consumed while the dialog stays active, but the selected-Cancel response does not occur. Successful providers, the consumed-edge policy, finite causal closure and explicit focus premises are bounds, not native-pad measurements. Logical Cancel stays B12-valid; no completed answer or invalid selected-button state is inferred. This promotes only the exact missing-response Candidate, not a new Reproduced status, broader focus/property certification or Phase 4 exit. No fix, game/permanent-test/model/CI/requirement/public-site change is approved. No new repair or phase advancement is selected here.


## Current amendment: one ceiling for stored scores

The selected maximum is 9,007,199,254,740,991 for both saved-game scores and the stored high score. This amends the stored-content domain in R1 B16 and D21 S8. It does not change B3 or B11's semantic in-session score domain. Stored high-score content outside the bounded whole-number domain counts as zero; no divisibility requirement is added.

D18 and D21's earlier checksums identify their historical source bytes. Their current decision files now carry this amendment; those old checksums must not be read as hashes of the amended files. Earlier publication and finding records remain historical at their exact scope.

The exact 2^53 read and ordinary lower-write dispositions are superseded for current policy: 9007199254740992 is now invalid stored content, so returning zero is not the earlier valid-content read defect. The lower-write argument no longer establishes a current defect from replacing that invalid content with 100. Both disposition papers are deleted; the summaries above are all that remains of those arguments, kept as history.

Resolved SCO-3 interpretation: repairing invalid stored high-score content is not lowering a valid high score. This reading was recorded on October 8, 2026; the original invalid high-score repair paper remains in git history. The only-higher rule still protects valid stored high scores. This closes the interpretation question, not SCO-3 implementation certification. REQUIREMENTS.md, production code, tests, models, CI and repository settings are unchanged. No finding outside these exact 2^53 premises is reclassified; The original Phase 4 open-status sentence is historical; later closure retained its five limits.


## Gravity timing limits

Gravity follows PLY-2: max(0.25, 0.7 - 0.02 x (level - 1)) seconds per row, which reaches the 0.25 second floor at level 24. Two limits apply. A gravity timer that is already waiting keeps the delay it was given and need not reflect the latest level until it fires or restarts. The step from score to level is not proved for scores beyond the largest safe integer, 9,007,199,254,740,991.


## Findings carried from deleted disposition papers

Each row below summarizes a finding that had its own paper in `docs/`. Those papers are deleted. Their full step sequences and geometry are in the repository history before this change. Every row was historically checked on the then-main commit 4250207, not the current rewrite base 024cdfdf. That historical check ran the shipped game code (`GameManager` and `InputController`) with in-memory storage, a manual clock and stand-in browser functions. These runs are not runs on a real device or in a real browser. No fix, test, requirement or CI change is made here.

| ID | Raised | Finding | Status | Evidence and resolution |
| --- | --- | --- | --- | --- |
| F20 | 2026-10-06 | A saved game does not keep the lock delay reset count or the lowest row reached, so different play histories can save identical games | Settled | Reset count: pausing a resting O piece directly leaves count 1. Moving it left and right on the surface first leaves count 3. Both saves are the same text. Lowest row: an I piece paused at spawn and one paused after four clockwise rotations save the same text, yet the rows the piece occupied differ (highest occupied row 1 against 3), and the game's own lowest-row value is 0 in both. Reproduced on main with ordinary pieces, successful storage and timers. Not Established: real device runs, other save routes, the whole save format. An external action trace or clock that the game does not keep is not a representation of the lowest-row value.<br><br>October 24, 2026: Confirmed Defect (source argument) per phase-5-finding-crosswalk.md and phase-5-exit-reconciliation.md, section 1.<br><br>October 24, 2026: Fixed at the stated bounds - the save now keeps the lock-delay reset count and the lowest row reached: both are written on save and restored on load, a save from before the fix loads with the same fresh defaults as before, and a save whose new values are invalid is refused whole; landed in PR #293 under PLY-6, STA-4 and STA-6; current coverage test/gameManager.test.js:494-544 (a continued game keeps the count and the low, a pre-fix save starts fresh, a remembered low below the piece is restored) and test/session.test.js:283-349 (the fields round-trip, a pre-fix save loads with fresh defaults, invalid values are refused, and a save with no reset cap keeps any whole non-negative count). Two excluded mutants found during the fix are flagged in the code and registered as follow-ups F38 and F39. Boundary carried: real device runs, other save routes and the whole save format stay Not Established; the F29 limit stands (a save produced by the game whose contents are independently shown complete has not been built, D72f). |
| F24 | 2026-10-07 | Continue after a failed read of the saved game text withdraws the save, because a failed read is treated as empty content | Settled | Reproduced on main: the saved flag is true, reading the saved text throws, and Continue at game over writes the flag false. The saved text itself is untouched. A failed read of the flag itself is a separate F24 case, recorded in the paragraph "Eligibility-read failure: Continue withdrawal disposition" above. Not Established: real storage failures, a failing flag write, other failure combinations, what the player sees. A later minimal fix must keep a failed read distinct from invalid returned content, must keep withdrawing invalid content, and must not add a retry or save format policy without authority. The finding does not need a specific retry time or a new save format.<br><br>October 24, 2026: Fixed by #192 (October 11): loadGameSession returns when the saved game text cannot be read (gameManager.js: 211), so a failed read no longer reaches the flag write. Verified by independent re-run: the test 'Continue with an unreadable save does not write to storage' (added in #192) passes on main with zero storage writes and fails on 784ad24~1, the commit before the fix. The separate flag-read case has its own guard test, added in #302. |
| F33 | 2026-10-07 | A soft drop held across Pause and Resume starts repeating again without releasing and pressing the key | Settled | Reproduced on main with stand-in browser functions: S is held, Pause fires the repeat timer once while paused so it stops itself, Resume, then the next poll with a connected neutral gamepad starts a new repeat and the piece moves from row 1 to row 2 with S never released. Needs the held key to stay held, a connected gamepad polled every frame, and the same event order. Not Established: real gamepads, real timing, other controls. The game's held-key set is not the definition of which physical controls are held.<br><br>October 23, 2026: Confirmed Defect under the October 17 rule, at the narrative's exact scope - physical S held across Pause/paused interval self-stop/Resume starts a new soft-drop interval via the ordinary already-registered neutral-gamepad RAF poll, moving the piece without release/repress, under the stated focused-key/API/resource/order premises. Limits carried: not native execution; not full INP/U4/R1 or Phase 4 certification; Not Established: real gamepads, real timing, other controls.<br><br>October 23, 2026: Fixed at the stated bounds - pausing releases the held soft drop, so the neutral-gamepad poll after resume no longer starts a repeat without a fresh press; landed in PR #287 under the new STA-2 sentence; current coverage test/inputController.test.js:728-780. |
| F34 | 2026-10-07 | Pausing with the lock delay at its last allowed reset makes Resume lock the piece at once instead of starting a delay | Settled | Reproduced on main: with a resting O piece and a reset count of 14, Pause raises it to 15 and Resume locks the piece immediately (four filled cells, no lock delay). The run set the count directly. The longer play route that reaches count 14 was not replayed.<br><br>October 23, 2026: Confirmed Defect under the October 17 rule, at the narrative's exact admitted route (eighteen gravity firings, fourteen resting horizontal restarts, Pause, Resume locks the old O instead of starting the delay B9.2 requires), with its stated premises and V1 intermediate-state limits. Limits carried: the run set the count directly; the longer play route to count 14 was not replayed.<br><br>October 24, 2026: Fixed at the stated bounds - the pause still counts as one reset but never the last one: the reset count clamps one below the cap, so resume always starts the lock delay again; landed in PR #288 under STA-2; current coverage test/gameManager.test.js:669-688 (pause at 14 or 15 clamps to 14, resume starts the delay, and the piece locks when the delay runs out). |
| F35 | 2026-10-07 | Pausing leaves the held soft drop repeat timer running | Settled | Reproduced on main: after S is held and the game is paused, one repeat timer is still outstanding. It stops itself the first time it fires while paused. Not Established: real timing, other controls, whether the leftover timer can do harm beyond F33.<br><br>October 23, 2026: Confirmed Defect under the October 17 rule, at the narrative's narrow U4 stopped-resource scope with premises as stated; historical V38/SRes1 stays qualified corroboration. Limits carried: Not Established: real timing, other controls, whether the leftover timer can do harm beyond F33.<br><br>October 23, 2026: Fixed at the stated bounds - pausing stops the repeat timers, so no soft-drop timer is left outstanding; landed in PR #287 under the new STA-2 sentence; current coverage test/inputController.test.js:728-750. |
| F37 | 2026-10-07 | After a failed write that withdraws the saved game, Continue can be offered again in the same session | Settled | Reproduced on main with storage that refuses the false write: after New Game and drops until game over, the saved flag still reads true. The run used repeated O pieces, not the original eleven-piece route. The page showing the Continue button was not run. Not Established: real storage quota, actually restoring a game, other tabs.<br><br>October 23, 2026: Confirmed Defect under the October 17 rule, at the narrative's availability-only facet under S4/S9 with the admitted eleven-piece no-fit route; actual restoration, native pixels, whole R1/S6 stay separate. Limits carried: the run used repeated O pieces, not the original route; the page showing Continue was not run; Not Established: real storage quota, actually restoring a game, other tabs.<br><br>October 23, 2026: Fixed at the stated bounds - the session-scoped withdrawal note landed in PR #289 under the new STA-4 sentence; current coverage test/gameManager.test.js:352-388 (the refused withdrawal write holds for the session, and a refused save-flag write does not withdraw the stored save). |

Two older high-score dispositions (an exact 9007199254740992 read, and an ordinary lower write replacing it) were deleted with their papers. Both are history, superseded by "Current amendment: one ceiling for stored scores". On main the high score getter in `public/game/gameManager.js` uses `Number.isSafeInteger`, so 9007199254740992 reads as 0.


## Reviewed factory research

Independently reviewed source-only factory research binds the module-local default page route to the built-in factory and joins retained canonical-coordinate, bag, writer and test-child evidence at their stated scopes. Successful geometry preservation excludes arbitrary supplied outputs and outside mutation. Thrown writer prefixes follow the separate F2 fault-state criterion; a shortened retained queue is not itself a rollback/ordinary-validity defect, while SAF-4 after-every-action/timer obligations remain unchanged. No new execution, finding-status change, phase closure, correction or permanent-test removal approval.

The review covers eight research packets and the 20-input source manifest for the first four. It is a source and criterion review, not certification or an execution receipt. The packets bind actual default page construction to the built-in factory, join conditional canonical-coordinate preservation to finite permanent assertions, separate successful writer induction from partial failure prefixes, and apply F2 without reducing SAF-4 checking. First and later Hold assignment order and the not-fit early return are explicit. No arbitrary hostile dependency domain, whole canonical/history theorem or test-replacement value is selected.

### Default engine-fault notice: superseded source premise

The historical source-only missing-message comparison predates the implemented internal-error explanation in F25. It is not a present missing-notice claim. Its successful-cancel/provider, finite-path, player-message-only and no-native/whole-property limits remain historical qualifications.

### Ordinary geometry-alias consumer preservation

Independently reviewed conditional source argument joins canonical geometry construction to the selected shipped page/engine nonwriting consumers. Shared rotations and kick references remain mutable, but successful ordinary plain-data consumers preserve or replace canonical geometry without editing those arrays. This supplies a conditional ordinary ownership premise, not immutable snapshots, arbitrary custom/hostile alias resistance, valid fit/history, runtime detector replacement, certification, finding promotion or removal approval. The finite module set and the successful-call, plain built-in and no-outside-mutation premises stay in force.

### Draw-history composition

Independently reviewed conditional source composition distinguishes factory draw history from current-display events when Hold redisplays earlier pieces. Successful refill/shuffle/shift preserves a permutation per aligned refill segment under canonical inventory, valid-random, plain-successful-call and no-outside-mutation premises. New Game resets the segment; later fitting Hold makes no draw. Continue's admitted remainder is a suffix/refill relation, not recovered prior history. Historical 5040 enumeration remains finite corroboration; no new execution, fairness claim, full PCE-5 certificate, finding change or test-removal approval.

### Fixture restart versus production reset

Independently reviewed source-only child-admission comparison separates helper-only factory.restart from production factory.resetBag. The sequence fixture's initial rewind is a test-control effect, not evidence that later public New Game resets that custom fixture. Built-in seeded GM-47 still exercises production resetBag, including its second public-started game; GM-48 is a selected remainder-preservation assertion. No runtime result, arbitrary custom-source reset requirement, test removal, finding change or certification follows.

The source reads were not one atomic commit snapshot. These are conditional source relations, not runtime proof or test-removal permission.


## Controller, drawing and action research, October 9, 2026

This dated register entry records narrow reviewed proposals, bounded measurement reconciliations and unreviewed source preparation separately. It assigns no new finding status, correction permission, phase exit or property certificate. Historical findings and evidence keep their original scopes. This section retains the bounded results, not their full raw receipts.

### Reviewed classification preparation

The five proposals below passed independent source review only at their stated child scopes. A proposed Confirmed classification is not a Confirmed assignment here. Source hashes bind returned text, not one atomic historical main snapshot; historical observations are corroboration, not fresh execution.

- Gamepad-read player notice: on the selected default-page read-throw path, completing console reporting and successor-frame registration do not produce the required small controller-problem notice. The engine-fault notice is not a carrier for this separate route. Signal, hardware failure incidence, reporting/frame refusal and full SAF-5 remain separate.
- Drawing player notice: a selected operation error caught by drawSafely invalidates caches, attempts reporting and requests retry, but supplies no drawing-problem player notice under completing report/retry premises. The current engine-notice selection does not explain a recoverable drawing problem. Context restoration, refused dependencies, transient pixels and full drawing recovery remain open.
- Physical direction-token survival: the A-down, D-down, Left-down, Left-up, D-up comparison loses still-held physical A because Left shares its stored alias token. The independent last-remaining rule expects A to survive. This is the token/selection child, not all input ordering, timing, hardware or board displacement.
- Historical Resume-suppressed survivor (old Pause retained A premise is superseded by Pause-release): after an accepted paused repeat stops movement while retaining A, Resume followed by D-down/D-up can rearm A without A release/repress. The suppression exception is separate from nominal newest-survivor behavior, alias-token loss, soft-drop rearm and outstanding-resource/checkpoint findings.
- Gamepad read plus refused report: the delivered read-throw/console-refusal prefix exits before successor registration with polling still true; a later connection notification makes no new attempt. The conditional source argument has bounded injected-mechanism corroboration, not native failure-frequency or full-game evidence. Refused successor registration and initial construction have different obligations; neither is assigned this proposed child status.

Potential corrections, including notice wording/lifecycle and physical-token or report/continuation changes, remain unselected and require their own approved scope. The engine-notice approval is not reused. No test, protection or QA gate is retired.

### Bounded W04/W05 measurements

The reconciled packet records sixteen direct-entry cases and six isolated local Chromium mouse/touch receipts, not an independent rerun. Direct Cancel and nonplaying softDrop preserve the captured frame apart from pending/derived absence and notification count; playing softDrop moves one row and replaces gravity in the declared empty-spawn fixture. Refused notifications escape after pending or movement changes without safe stop/report at that cut. Manual timers, Map storage, deterministic factory, directly assigned paused pending and incomplete model correspondence limit these comparisons.

All six native receipts admit captured downward movement while paused/pending, produce two softDrop calls and clear pending without falling-row or captured gameplay/storage change. Held-modal-open retains the dialog/Cancel focus until the next draw; natural-modal-open admits the move with ordinary frame delivery. Subsequent Escape resumes the already-no-answer paused game. This is bounded native-browser admission, not physical-device proof, a presumed STA-1 defect or a browser-nonconformity finding. Supplied touch before/after images were independently inspected by the reconciliation lane, not newly rendered here. Chromium only and Node 22 versus the declared >=26 toolchain remain explicit limits. Parent W04/W05, surfaces/locks, provider cuts, platforms and full R1 stay open.

### Bounded gamepad-loop refusal measurements

The reconciliation records one run per case and 600 ms windows in Chromium 154 with a Node 22 harness, real controller on a blank local page, stub manager/question methods, injected refusals, observer-wrapped frames and synthetic connection. Read plus refused console, and read plus completing console plus refused successor registration, each leave no outstanding successor and polling=true; the later connect makes no new attempt. The control repeatedly reports with one successor, then intentionally stops when no pad is returned. It is not successful connection/restart evidence, physical hardware, player-notice evidence or whole SAF-5 certification.

The packet reports main f17929c8 and a controller hash matching the independently read source. Archive/member hashes were checked by its reconciliation lane, not rerun here. Served bytes versus the reported source identity remain a binding limit; the reported head/hash is not upgraded to an independently verified identity for every served probe byte. These bounded refusal cuts are measured rather than only hypothetical, but classification and broader recovery obligations remain separate.

### Unreviewed Source Preparation: D22 and W17

D22 preparation separates ordinary storage-event cache invalidation from later draw/getter/Continue effects. The source argument names no immediate gameplay or persisted-storage write, and a refused new frame registration escapes after cache invalidation without rollback/safe stop; an already-pending frame is different. Native event ordering, later read refusal, payload admission, withdrawal history and full external-actor behavior remain open. This is unreviewed source preparation, not new execution or a finding assignment.

W17 preparation separates unavailable/no-op Hold, fitting held replacement, no-held queue/factory draw and each no-fit branch. It names changed identities, legitimate spawned copies, resource/factory failure prefixes and the different outer assignment order. Stale ordinary game-over bytes do not by themselves impose clearing or rollback. This is unreviewed batched collateral, not a complete frame/history proof, fresh suite result or new defect. Parent W17 retains full-state projection, no-fit admission, provider cuts, lowest-history and control/drag/session-withdrawal composition gates.



# Security sources and unresolved directions

Historical research, not current-site verification or newly adopted requirements. Outside facts and verification dates are in [evidence-record.md](evidence-record.md). Apple's encryption-category counts conflict and remain Unproven; neither 15/25 nor 14/23 is a settled pair.

The October 4/12 research compared iCloud with app commit 06d2a59, not today's app or its release history. That snapshot was a client-only static GitHub Pages game, localStorage saves/highscore, worker-cached app shell, one same-origin module/no third-party runtime scripts/no CSP tag, express only for local serving, and development Playwright/Stryker/TypeScript/coverage. Workflow content/permissions/pinning/dependency audit were not verified; no dependabot file was found then. Snapshot absence is not present absence.

The Apple comparison supplies analogy, not conformance: device-first encryption is not the game's untrusted-input validation; OS version gating resembles no-mixed-release loading; retrying key rotation resembles persistence ordering; signed device state is not a local-player checksum or tamper defense. CloudKit private data has device-generated per-user keys while public databases are not encrypted. ADP's minimum OS prevents older clients mishandling new service keys; its device-signed activation cannot be removed or changed by Apple servers; key rotation retries until it succeeds; and recovery setup precedes commitment because Apple cannot recover end-to-end data. These were dated Apple-source readings, not controls the game has or proof those facts hold today.

HSM/account-two-factor/cloud encryption have no corresponding surface in that snapshot. CSRF/CORS/authentication/session/server-validation controls depend on an actual backend, authenticated session or cross-origin API; the exposed local dev server is a different surface. Adding accounts/backend/cloud sync changes this scope. Third-party scripts would add same-origin storage access and supply-chain exposure.

Still unresolved, not silently adopted by this rewrite:
- Cite Apple only as non-conformance inspiration for persistence ordering, and OWASP as APP-6/worker-attack grounding. The blueprint currently says inspiration without Apple conformance; a source citation is not adopted by research alone.
- Record no stored secrets/personal data, no local-player tamper resistance, zero third-party runtime code and shared GitHub Pages origin as explicit trust boundaries rather than relying on old snapshots.
- Decide the documented Continue limit for Safari-tab storage eviction. WebKit's seven-day policy and Home Screen exception are source statements, not physical-current-iOS tests or guarantees against other storage loss. A week-idle tab losing a paused game is a data-loss risk, not confidentiality protection.
- Decide a feasible meta CSP as defense in depth, not a replacement for safe code; it changes shipped behavior and needs the relevant requirements/tests. Meta-tag/header limits stay in the blueprint; the community custom-header claim remains unverified.
- Decide a documented recovery route to unregister a faulty service worker and clear its caches, without inventing permission to perform it.
- Keep sensitive data out of localStorage; keep dependencies/build protection under review. Zero third-party runtime code and future CDN SRI are advice here, not newly adopted requirements.

Dated source URLs, duplicate facts and status are maintained in docs/evidence-record.md. Unique historical Apple-source URLs retained for the analogy:
- https://support.apple.com/guide/security/icloud-security-overview-secacde2d0da/web
- https://support.apple.com/guide/security/icloud-encryption-sec3cac31735/web
- https://support.apple.com/guide/security/advanced-data-protection-for-icloud-sec973254c5f/1/web/1
- https://support.apple.com/en-us/102651

## Historical model-input identity

D39's input-only selection referred to a deleted rule-text file, historical requirements SHA-256 `fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc`, geometry image `5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236` and table `c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c`. Those are original input identities, not hashes of current rewritten requirements/publications. The deleted image copy matched the retained geometry image; the table matched the retained source table at the recorded comparison. Later status-label/title/publication changes do not retrospectively change what the model author received.

Source/original, reduced publication and later rewritten bytes are distinct. The old disclosure table's mostly empty identities do not authenticate successor bytes. Exact-file proof ledgers were previously removed; their missing bindings and deleted D50 postmerge receipt are not restored by this consolidation. Historical PR #75 model publication was not model acceptance or new certification.

## Earlier finite test and performance evidence

October 3-4, 2026 only, not today's suite or broad safety certification:
- An early SAF-3 review added three deliberate-break tests after gaps: gravity skipping the guard had only been caught by a drawing test, rewriting a still-loadable save had passed, and stopped-state checks had only observed the immediate moment. Each new test failed with its break restored. The review covered player action, soft drop, lock and gravity entry, throwing reporter, exact save bytes and later stopped actions/timers (PR #40), not every later provider failure.
- The saved-session review recorded 43 corrupted-save kinds rejected whole, released fixtures loaded, invalid saves forgotten and built-in shapes rebuilt. An off-board cell is not free. A no-bag save used the then-applicable fresh-bag default. The session mutation run caught every generated change; it did not prove all malformed content or future formats. The storage review recorded missing/throwing localStorage fallback to memory, caught writes and exact-true eligibility. Its old unbounded high-score wording was superseded by the stored-score ceiling.
- Engine mutation, four local workers/cores: 1,126 mutants, 1,100 killed, 24 timed out/counted caught, zero survivors and two documented shuffle exclusions, 18 minutes. Early CI scored 100% in 30 minutes 26 seconds.
- Phase 0 at 409faf4, with code/tests/config matching 30e0085: 288 runner entries (287 tests+helper file), all pass; engine coverage 100% lines/branches/functions, 1434 physical lines/465 branches/138 functions; typecheck passes. Browser 183 tests: 164 pass/19 declared skips/0 fail. Local Chromium page coverage 591 physical lines/176 branches/29 functions; worker coverage unmeasured.
- That Phase 0 mutation found 1152 mutants: 1128 killed/24 timeouts/0 survivors/0 errors/two shuffle exclusions locally, 18 minutes 24 seconds. CI 1120 killed/32 timeouts/0 survivors/0 errors, 32 minutes 17 seconds. These are same-scope historical finite runs, not current counts.
- Phase 0 CI test job about 2 minutes 30 seconds (browser 79 seconds/install 49/setup+install 14/typecheck+unit 3), deploy 16 seconds, mutation job 32 minutes 39 seconds including 32 minutes 17 seconds Stryker. Separate 2 minutes 18 seconds queue wait is not job time. Deployment then served all 16 files byte-identical to public/; that is historical host-byte evidence, not current behavior.

## Historical decision lookup

These IDs locate retained subject matter, not a verbatim copy of the historical row or fresh approval. Earlier citations to specific original words or hashes refer to git history.

| ID | Current subject home |
|---|---|
| D1 | Changes and tests |
| D2 | Changes and tests; Trust boundaries; Withdrawal, failure and reporting |
| D3 | Changes and tests |
| D4 | Changes and tests |
| D5 | Changes and tests |
| D6 | Changes and tests |
| D7 | Changes and tests |
| D8 | Withdrawal, failure and reporting |
| D9 | Earlier finite test and performance evidence |
| D10 | Historical source-validity comparison |
| D11 | Earlier finite test and performance evidence |
| D12 | Earlier finite test and performance evidence |
| D13 | Earlier finite test and performance evidence |
| D14 | Earlier finite test and performance evidence |
| D15 | Scope and state |
| D16 | Scope and state |
| D17 | Scope and state |
| D18 | Scope and state |
| D19 | Scope and state |
| D20 | Scope and state |
| D21 | Withdrawal, failure and reporting |
| D22 | Withdrawal, failure and reporting |
| D23 | Withdrawal, failure and reporting |
| D24 | Trust boundaries |
| D25 | Trust boundaries |
| D26 | Trust boundaries |
| D27 | Trust boundaries |
| D28 | Trust boundaries |
| D29 | Trust boundaries |
| D30 | Trust boundaries |
| D31 | Legal-operation frame and selected consequences |
| D32 | Legal-operation frame and selected consequences |
| D33 | Legal-operation frame and selected consequences |
| D34 | Legal-operation frame and selected consequences |
| D35 | Model and evidence boundaries |
| D36 | Model and evidence boundaries |
| D37 | Model and evidence boundaries |
| D38 | Model and evidence boundaries |
| D39 | Model and evidence boundaries |
| D40 | Model and evidence boundaries |
| D41 | Model and evidence boundaries |
| D42 | Historical bounded evidence limits |
| D43 | Historical bounded evidence limits |
| D44 | Historical bounded evidence limits |
| D45 | Historical bounded evidence limits |
| D46 | Historical bounded evidence limits |
| D47 | Historical bounded evidence limits |
| D48 | Historical bounded evidence limits |
| D49 | Historical bounded evidence limits |
| D50 | Formal mapping and selected executed units (D50-D51) |
| D51 | Formal mapping and selected executed units (D50-D51) |
| D52 | Save rules and target scope |
| D53 | Save rules and target scope |
| D54 | Save rules and target scope |
| D55 | Save rules and target scope |
| D56 | Save rules and target scope |
| D57 | Save rules and target scope |
| D58 | Save rules and target scope |
| D59 | Save rules and target scope |
| D60 | Save rules and target scope |
| D61 | Offline release direction |
| D62 | Tap threshold |
| D63 | Audit and evidence |
| D64 | Audit and evidence |
| D65 | Audit and evidence |
| D66 | Audit and evidence |
| D67 | Audit and evidence |
| D68 | Audit and evidence |
| D69 | Audit and evidence |
| D70 | Audit and evidence |
| D71 | Audit and evidence |
| D72a | Audit and evidence |
| D72b | Audit and evidence |
| D72c | Audit and evidence |
| D72d | Audit and evidence |
| D72e | Audit and evidence |
| D72f | Audit and evidence |
| D72g | Audit and evidence |
| D72h | Audit and evidence |
| D72i | Audit and evidence |
| D72j | Audit and evidence |
| D72k | Audit and evidence |
| D72l | Audit and evidence |
| D72m | Audit and evidence |
| D72n | Audit and evidence |
| D73 | Audit and evidence |
| D74 | Audit and evidence |
| D75 | Audit and evidence |
| D76 | Audit and evidence |
| D77 | Audit and evidence |
| D78 | Audit and evidence |
| D79 | Audit and evidence |
| D80 | Audit and evidence |
| D81 | Audit and evidence |
| D82 | Audit and evidence |
| D83 | Changes and tests |
| D84 | Changes and tests |
| D85 | Changes and tests |
| D86 | Existing publication losses and bindings |
| D87 | Existing publication losses and bindings |
| D88 | Existing publication losses and bindings |
| D89 | Existing publication losses and bindings |
