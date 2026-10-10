# Default engine fault: no internal-error explanation for the player

Candidate documentation. Exact-head review, required checks, authorized merge and postmerge publication verification remain separate gates. No game run is made and no correction is approved.

## Requirement and exact domain

SAF-3 requires that if anything in the engine throws, the game stops safely and the player is told. D22 T1 splits that into a plain player message explaining that an internal error stopped the game, and a separate signal tests can observe. This record covers only the player-message half.

The route is the default page: the module-local game manager built with only a change callback, a caught engine operation or check exception, successful timer cancellation and reporting calls, normal animation-frame delivery, and successful drawing and page access. Page setup is complete, the shipped modules are unmodified and no unrelated actor is involved.

## Source argument

The default fault reporter writes to the console. The safe stop marks the game over, stops the engine timers and tries to report. The change callback then asks the page to redraw. The page snapshot carries mode, score, saved-game eligibility and pending confirmation, not the fault. The page does not read the manager's fault list and does not supply a fault callback.

If the page had already seen the game playing, its terminal text and announcer say Game Over, which does not say an internal error stopped the game. If the fault comes before the pending playing draw, that terminal display can stay unset. In neither case does the player get the cause. The adjacent input controller was inspected for another carrier: it does not read the fault list or supply a fault callback, and its own gamepad exception path writes to the console.

## Finding

F25, Confirmed defect by conditional source argument, T1 player-message half only. The conditions above stay attached to the finding. This is not a new reproduction, a pixel or timing observation, or a measure of how often players would meet it.

## What this does not claim

- Full SAF-3 stays Not established.
- The separate test-signal half is not classified here.
- Last-good saved-game content, controller and retained timer resources, cancellation refusal, constructor and startup faults, the SAF-5 drawing and controller notice, and every other fault route are separate.
- No claim about arbitrary injected hostile code, severity or frequency.
- F18 and F19 are unchanged history. Their earlier outcomes were not reviewed against this later T1 reading.
- ST-01 and ST-02 stay: their terminal-state and callback assertions protect different things.
- Phase 4 stays open. No finding outside this exact route changes.

## Evidence

Reviewed source packet `default-engine-fault-notice-source-cut.md`, SHA-256 `fbea627f9ae1c36a5c9cf399651925a8fe50499233514a4c52ce458fe3bbd57e`, and classification proposal SHA-256 `e74b7fcd09bb136b1b02403ff73bf4180e3dda639ebeb8c8d735f052a2e33d0c`. Both were independently reviewed. The input controller source SHA-256 is `7454a3c23b9de0acb152fe76bedab74bb4a604ac62ca11d41ff5ee12e3ed27e2`. The reads were not one atomic snapshot. D22 T1 in `docs/phase-1-fault-timer-decision.md` is the criterion.

No UI, production code, permanent test, requirement, model, CI, settings, storage or release change. Any correction, regression test or visual check is separate approved work.
