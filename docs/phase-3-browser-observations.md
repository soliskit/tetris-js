# Phase 3 browser observations (bounded, not certification)

Source: public deployed game at https://soliskit.github.io/tetris-js/, October5 approximately15:37-15:42PDT. Environment Chrome153/Linux, remote trusted keyboard/mouse input, no touch hardware. Ten fetched deployed files were compared by the observer with production0f4e510 modulo a trailing newline; this is normalized-content correspondence, not byte-identical deployed-source attribution. The observed page is not tied to an exact deployed commit or workflow run by this comparison. PR76 run37382784191 succeeded separately, but that does not establish this observation session's exact served bytes. The observer added passive event listeners and made no repository or production changes.

## Claims, routes and evidence

- STA-1 dialog subset: trusted Enter while paused opens NewGame question; Cancel is focused and its visible focus ring was inspected in the actual screenshot. Enter on Cancel closes it and keeps paused; reopening works; Escape closes and keeps paused. Routes inputController.handleKey -> manager.handleAction/cancelNewGame plus script dialog focus/rendering. The clean rerun log, not the earlier unreproduced non-opening observation, supports this result. No NewGame-confirmed-by-button, backdrop/inside click, held-repeat, gamepad or selected-left/right matrix claimed.
- STA-2 and INP-1 subset: trusted Escape pauses/resumes; ArrowLeft/Right move,ArrowUp rotates; paused ArrowLeft changes no board position in the1.5s observed interval. Enter starts from start/gameOver and does nothing while playing. No long duration/timer proof,all aliases or all legal states claimed.
- INP-3 default-prevention subset: unmodified trusted Enter/Escape/arrows were default-prevented;Tab was not prevented and reached Hold. No modifier chords/auto-repeat or all browser default actions claimed.
- STA-5 subset: switching browser tabs emitted blur and hidden/visible visibility events and returned paused. Not OS app-switch or iOS/Safari evidence. First background tab loaded hidden yet could start playing; no startup-hidden requirement disposition inferred.
- INP-5 pointer subset: trusted mouse drag60px moved O three columns. Pointer code path only,not real touch;maxTouchPoints0. Mobile UA/viewport spoof is not touch/device evidence.
- INP-6/DSP-5 subset: Hold button was in tab order;paused screenshot visibly has play button and Resume hint. Accessible-name/screen-reader full behavior not assessed.

## Exact preserved evidence

| Artifact | Observed | SHA-256 | What it supports |
| --- | --- | --- | --- |
| INPUT-BROWSER-EVIDENCE.txt | Oct5 approx15:37-15:42PDT | dc129610e45c5a4934fb7e450a4c03baebb0541759856826d70e21f7a38e9e2a | Observer summary,source/environment/gaps;run1transcribed observations |
| inp-run2.log | Oct5 approx15:37-15:42PDT | d33620d7a92dbf5ab08367c05843748f6f010b6671dcc3e8d593dcb39f6897f9 | Clean dialog open/cancel/reopen/Escape,Resume label |
| paused-state.png | Oct5 approx15:37-15:42PDT | cd39de8b04def65da0e2a35a75fc2d19c94623ac8773bb0e0f3bb5973af6f2d0 | Paused board,playbutton,Resume hint |
| dialog-cancel-focused.png | Oct5 approx15:37-15:42PDT | 28963c763c4597315efb38af6aeb092593808bd6221f0dde45594000a4fb7bcb | NewGame question,Cancel focus ring |

Coordinator and parent inspected actual screenshot pixels,not just DOM text. Originals are preserved in the private review bundle;this document is a purpose-written record,not raw internal transcripts/tool logs. No external publication of those artifacts is implied.

## Remaining gaps

C3/E2/E3 held-across-resume and DAS/ARR timing;gamepad;modifier chords and keyboardrepeat;letter/Space keys;actual touch;WebKit/Safari/iOS;OS-level visibility;assistive announcements;phone layout/P3/wake-lock device behavior. One browser/session and a small sample do not establish universal claims. Every result here is bounded observation;certification remains Not assessed. Earlier non-opening Enter was not reproduced and is not a finding. New observations are not already part of PR77's reviewed record.
