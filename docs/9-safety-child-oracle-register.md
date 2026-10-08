# Safety assertions: stop requests are not the whole stop criterion

The safety tests check selected game-over endpoints, cancelled fake timers and recorded callbacks. They do not, by those checks alone, prove the player received the required notice, that a prior save was independently good, or that every timer and fault route was covered. This child register keeps those obligations visible.

Candidate source reconciliation for independent review. No execution, finding promotion, correction, permanent-test change, property certification or Phase 4 exit.

## Source, fixtures and shared assertion

Fetched main 3fd5e4fb8eb5b8a186d049d61ae562a9802cb54f retains unchanged public tree 1e09ad61c19e0b235a231ad8810dae176be4ea77. `test/safety.test.js` SHA256 382be803b77881957f2e71e058c1e5f841f478eac15dc365fcf6b01b8ffd1c5f. All 25 named declaration bodies and 10 explicit generated violation entries inspected. The generated family is separate from the named declaration count; neither is a whole-domain/runtime coverage denominator.

assertSafeStop compares game over, scheduler.pending = 0, gameLoopTask = null, lockDelayTask = null, reported length = 1/reason and game.faults equality. Its literal expectations are outside the production guard. It does not observe controller held-repeat resources or real page notice, and most uses make no save-content assertion. T1 requires both a player message and a separate observable signal; callback/console existence alone is incomplete. T2 does not require a stored fault record. T3/U3 distinguish successful cancellation trust from cancellation refusal/retained firing; fake-scheduler pending = 0 does not test those cuts.

recordingGame uses a callback array plus newGame helper with manual scheduler and memory storage. breakableFactory repeatedly produces one allPieces-derived kind until a flag makes generate throw. This is an injected/custom-dependency fixture, not ordinary seven-bag admission. fixedFactory and manual board/history mutations also need their own exact admission relation. Production fits/dropDistance/isOnSurface setup predicates do not independently prove semantic geometry/history. No helper mutation becomes an approved correction.

## Named declarations and retained oracle limits

| Child / source line | Test and actual oracle boundary |
|---|---|
| ST-01, line 38 | an error during a player action stops the game safely and is reported [SAF-3]<br>SAF-3 conditional factory-refusal action checks no throw and selected mock scheduler/state/report fields. assertSafeStop does not assert held-repeat resource state, actual page notice or saved bytes in this row. |
| ST-02, line 47 | the page is told about a fault too, so it shows the stopped game [SAF-3] [DSP-5]<br>SAF-3/DSP-5 one onChange call plus game over. Callback count is a redraw request, not rendered stopped screen or T1 player message. |
| ST-03, line 58 | an error inside a timer stops the game safely and is reported [SAF-3]<br>SAF-3 lock callback failure 500 mock-ms after production isOnSurface landing. Exact trigger admission depends on fixed-factory geometry/history and scheduler; no native 500-ms deadline or all timer failures. |
| ST-04, line 67 | an error inside the gravity timer stops the game safely and is reported [SAF-3]<br>SAF-3 gravity failure 700 mock-ms at manually injected reset 15/lowest(position.row+1); selected one pending gravity and no lock. Injection/history/semantic-low validity unresolved; no ordinary count15 source admission from this test alone. |
| ST-05, line 81 | an error during a soft drop is contained [SAF-3]<br>SAF-3 soft drop uses same injected reset 15/lowest fixture, one-row-to-land production distance. Checks containment/safe-stop helper, not complete ordinary admitted writer history. |
| ST-06, line 92 | after a fault the last good save is kept exactly and can still be continued [SAF-3]<br>SAF-3 byte-string preservation/eligibility true/continued paused column 3. Good-save semantic B16 admission must be proved independently; production writer plus equality alone does not establish last-good content. No full restoration/history/other save race. |
| ST-07, line 112 | after a fault New Game starts a clean game [SAF-3]<br>SAF-3 New Game after factory recovery restores playing/empty board and one gravity row 1. Fixed-kind/custom-factory validity and fresh bag/full reset fields not fully asserted. |
| ST-08, line 126 | after a fault no action or timer restarts play or changes the game [SAF-3]<br>SAF-3 eight named actions plus soft drop/toggle/time after direct guard fault preserve serialized selected core, game over and pending = 0 after each attempt, with one report asserted after the loop. No cancelled-but-retained callback delivery, controller repeats or external alias; serializer snapshot omits resources/history/other fields. |
| ST-09, line 173 | the invariant monitor catches a lock delay running while paused [SAF-4]<br>SAF-4 direct startLockDelay after Pause then no-op guard yields safe-stop reason. Exact detection/paused fixture, not ordinary writer/no-bypass or T3 start/cancel failure. |
| ST-10, line 181 | the invariant monitor catches timers running while paused [SAF-4]<br>SAF-4 direct startGameLoop after Pause then no-op guard yields same stop. Selected manual resource corruption, not native paused lifecycle completeness. |
| ST-11, line 189 | normal play never trips the invariant monitor [SAF-4] [SAF-6]<br>SAF-4/SAF-6 fixed I/manual filled row/turn-and-drop/Hold/Pause/Resume/20000 mock-ms/bounded drops/New Game/Pause/Continue yield reported[]. No independent full-validity oracle at each step or all normal play; canonical shape/memory/color/factory/helper premises needed. |
| ST-12, line 204 | a fault reporter that throws does not make things worse [SAF-3]<br>SAF-3 throwing reporter action does not throw/game over/pending = 0. Does not assert T1 observable signal/player notice, last good save or failed cancel/U3. |
| ST-13, line 213 | an error while checking the invariants stops the game safely, even if reporting it fails [SAF-3] [SAF-4]<br>SAF-3/SAF-4 queue=null makes check throw; gravity 700 yields safe-stop,one fault, unexpected reason/TypeError despite throwing reporter. Selected pre-check fault cut and record, not notice; not all guard/provider failures. |
| ST-14, line 224 | a fault record that fails does not stop the report, the redraw or the safe stop [SAF-3]<br>SAF-3 failed faults=null plus board pop with reporter works/fails gives no escape/game over/pending = 0/onChange 1 and reason array when working. Callback request/empty array is not actual player notice or a durable record requirement; T2 does not require a storage log. |
| ST-15, line 241 | only the 20 most recent faults are kept [SAF-3]<br>SAF-3 failSafe called 25 times expects ring 20/fault 5..24. Exact retention policy, not required T1/T2 limit or all record throws. |
| ST-16, line 249 | by default faults are reported to the console [SAF-3]<br>SAF-3 mock console one prefix/reason at factory failure. Console alone is insufficient T1 player notice + separate signal; does not make named report complete. |
| ST-17, line 262 | pause is ignored unless playing, and resume unless paused [STA-2]<br>STA-2 startup over Pause/Resume inert, New Game/Resume inert playing, double Pause paused. Mode-only guard coverage; timer/checkpoint/persistence/event histories unasserted. |
| ST-18, line 276 | an unknown action does nothing [STA-2]<br>STA-2 unknown fly preserves serialized current piece/reported[]. No assertion of all core/resources/mode; cannot mean universal unknown input normalization. |
| ST-19, line 292 | storage whose reads throw still gives a playable game [SAF-2]<br>SAF-2 all storage getItem throws;fixed I/manual clear score 100,Pause/two New Game return playing score 0,no faults. Exact compatibility/state outcomes, not all storage write/failure ordering or semantic good save. |
| ST-20, line 307 | continue with unreadable storage stays at game over [SAF-2]<br>SAF-2 constructor with unreadable storage then Continue leaves game over. No stored value or recovery timing assertion, S7 distinction retained. |
| ST-21, line 313 | a stored high score that is negative or fractional reads as 0 [SAF-2]<br>SAF-2/S8 negative -50/fraction 12.5/Infinity textual invalidity versus 1e400 numeric-format caveat. Infinite semantic value invalid, but exact decimal 1e400 denotes a finite whole nonnegative integer if that raw encoding is admitted by the fixed mathematical-number map; The production reader's Number overflow cannot independently establish B11 invalidity; no new format adoption or finding promotion follows. Raw high-score correspondence/default scope remains. |
| ST-22, line 321 | localStorage is used when the browser provides it [SAF-2]<br>SAF-2 injected localStorage memory object captures literal 700 string. Selected provider selection/write, not actual browser storage durability, quota, origin or external concurrency. |
| ST-23, line 330 | if touching localStorage throws, memory storage is used instead [SAF-2]<br>SAF-2 accessor get throw fallback, highScore 400 reads 400. Same-instance fallback outcome; no persistence/reload guarantee or all property getter failures. |
| ST-24, line 338 | by default gravity runs on the browser timers [PLY-2]<br>PLY-2 default native task non-null after New Game/null after Pause. Real registration handle observation only, no delivered tick/requested-delay oracle, latency or T3 cancel/registration failure. |
| ST-25, line 346 | by default a broken invariant is reported to the console without an error object [SAF-4]<br>SAF-4 mock console arguments prefix/upcoming missing/empty error after queue pop/no-op guard. Exact log format not normative T1 reporting; direct count defect has B7 meaning, canonical kind checkpoint extent separate. |

## Generated violation children

Each calls fixedFactory(yellow), applies the listed injection, then game.guard(no-op), then shared assertSafeStop. Expected reason strings establish selected diagnostic text, not the independent validity criterion. None establishes ordinary writer reachability or every safety checkpoint.

| Child / injection | Semantic basis and residual |
|---|---|
| SV01 board.pop | B5 semantic 20 rows under fixed board-map admission; shape reasons are diagnostic, not oracle. |
| SV02 gameBoard[5].pop | B5 semantic 10 positions per row, map/admission as above. |
| SV03 nextTetrominos.pop | B7 exactly three semantic upcoming; valid-kind extent and all other fields separate. |
| SV04 score -100 | B11 nonnegative semantic domain, exact encoding assumed. |
| SV05 score 12.5 | B11 whole semantic domain, exact encoding assumed. |
| SV06 block at 1,4 overlap | B2/B6 exact yellow O geometry/position fixture must independently establish overlap; filled() default white versus valid locked-kind representation needs admission. |
| SV07 stopGameLoop while playing | B14/U4 required running-resource relation at relevant checkpoint; manual resource injection, not all failure/lifetime cases. |
| SV08 score 150 | B11 allows whole 150 with no divisibility condition. Expected safe-stop is apparent oracle conflict, not evidence 150 invalid. Other valid state/correspondence admission remains necessary for a defect promotion. |
| SV09 startLockDelay while airborne | B14 conditional timer legality; production surface predicate not independent airborne proof. |
| SV10 block at 2,4 produces resting without lock | B2/B6/B14 exact nonoverlap/resting geometry/valid board representation and transition legality must be independently bound. |

## What remains

Source-specific oracle conflicts/fixtures are not new executed defects. Join individual rows to governing T1/T3/U4, R1 and existing finding records plus exact execution receipts before child closeout. Independently establish declared injected-domain validity versus ordinary writer admission; do not discard either requirement because one permanent test passes. Native notice/pixels/default event delivery, all callback scheduling/provider throws/late firing, same-session withdrawal/save history and full authoritative-state restoration remain unexhausted. Phase 4 OPEN; safety property not newly certified.
