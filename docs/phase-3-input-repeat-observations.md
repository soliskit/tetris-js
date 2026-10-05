# Input-owned repeat observations (bounded)

Status: independently reviewed engine-plus-controller candidates, not findings disposition, certification or real-device evidence. Production `0f4e51047ad177a247a3461ed34263599fe01949`, public-identical main `902d5044b64ac12b7ffd53c417e971f1588ba874`. No code, permanent test or CI changes. Not part of PR77.

Sources: D23 U4 (`phase-1-trust-and-timer-scope-decision.md`) covers repeat stopping and timer checkpoints; D18 B12/B13 (`phase-1-r1-decision.md`) defines physical tokens, repeat phase and outstanding firings; D33 C3/D34 E2/E3 define held-across-resume suppression. D22 T1 defines player-visible message plus separate signal; D23 U3 governs failed cancellation, which this class does not inject. Requirements INP-2/INP-4, STA-2, SAF-3/SAF-4 are implicated. Writer matrix references W08/W09/W19 and W25-W29 are mapping leads, not verified frame proof.

Seven predeclared cases use actual GameManager and InputController with fake window listeners, RAF and map-backed global timers, injected engine scheduler, successful memory storage and a fixed O factory. Actions enter through `handleKey` and public game actions. A factory throw is the only fault injection. The harness manually fires actual registered callbacks; no real elapsed duration is claimed.

| Case | Observation | Source relation |
| --- | --- | --- |
| Horizontal pause | One repeat remains outstanding after pause; first fire clears it without moving | U4/B13 say repeats stop while paused; bounded deferred-stop candidate |
| Soft-drop pause | One interval remains; first fire clears it without moving | Same bounded deferred-stop candidate |
| Both pause | Two repeats remain; first horizontal fire clears its own, leaving soft drop until its firing | Separate-resource projection, not handle-name inference |
| Horizontal factory fault | Game over, one repeat remains, one fault signal; next repeat clears itself | U4/SAF-3 stop candidate; T1 visible message unassessed |
| Horizontal ordinary top-out | Game over, one repeat remains until its fire | U4/B13 ordinary-over stop candidate |
| Held direction across resume | Resume before DAS firing, then registered firing moves column 3 to 2 without release/repress | Bounded C3/E2/E3 suppression candidate |
| ArrowLeft plus A, release ArrowLeft | Aliases share KeyA token; releasing Left clears the still-physically-held A and stops repetition | D18 B12 explicitly keeps separate tokens for keyboard A and Left, as D40 integrator section 3 records; the observed alias collapse is a grounded bounded candidate, not a classified finding |

The held-resume setup presses Left once while playing, pauses using Escape before any first-repeat callback, releases Escape, presses Escape once to resume, then fires the retained direction callback. The direction itself is never released or re-pressed.

Independent Node22 review reran all seven outputs byte-identically and checked the routes and resource mapping. Escape remains in the harness held-key set in some rows because it is not released; it does not cause the movement. Paused callback firings do not move the piece. No asynchronous grace period is added to U4/B13 merely because the implementation stops at the next firing.

The static page observation is at script.js line 12 (onChange: requestDraw), lines 355-362 (requestDraw schedules drawing) and line 526 (controller construction). A search of script.js for releaseAllInput/stopMoving/stopSoftDrop found no calls. That static observation does not replace full page integration. Real browser focus, trusted events, rendering/RAF coupling, elapsed DAS/ARR/soft-drop durations, gamepad, touch, device behavior and the plain player-visible fault notice remain untested. No semantic model was run for this class. These implementation-exposed observations are not clean-author input.

## Preserved scratch identity

The v18 manifest records `input-repeat-resources.mjs` SHA-256 `b2a39b631a536899b7d84acfda8fe140b67259f6bedf02460c9cd8e7af8ab5b8` and `input-repeat-resources.json` SHA-256 `ef4745326455cded4a5f5e147ecae7be378751f9d8d24f7e71f6dc9e5473bf6a`. These hashes identify the coordinator-held exact bytes; fidelity review did not independently hash the raw artifacts. The state/input reviewer did rerun all seven output rows.
