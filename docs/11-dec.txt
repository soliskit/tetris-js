# Phase 1 decision: trust boundary for browser features

Status: decision text recorded by ledger row D27 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: the blueprint's O6 trust ledger, the trust assumptions of D23 U1 (storage), D24 V1 (hosting and the offline cache), and the SAF-5 reporting rule of D23 U2, and the timer decisions of D22 and D23. This file changes no bytes of any of them.

## Decision text

**W1. Browser implementation of specified features, when the call reports success.** The browser's implementation of a specified web feature is trusted, when the call reports success, to follow that feature's documented semantics. The audit does not test whether the browser itself is correct. This trust does not cover the game's arguments to the feature, its sequencing of calls, its state changes, its rendering decisions, its controller mapping, its wake-lock policy, its retries, or its handling of the feature's result.

**W2. Everything on the project's side stays inside the audit.** The game's own logic around a browser feature is not trusted. That includes how the game calls the feature, how it uses what the feature returns, and what it does when the feature is missing, refused or throws an error. All of it is audited under the rules already decided and the requirements that apply: SAF-5 and D23 U2 for drawing and controller faults, and DSP-7 for the wake lock (if it is unsupported or refused, the game plays normally). W2 adds no requirement and changes none.

**W3. No requirement is established by this trust.** W1 is an assumption about the browser, not evidence about the game. It does not by itself establish any requirement, including any INP, DSP, APP or SAF requirement. Each requirement still needs its own evidence. Trusting a browser feature is not a way to shrink the audit: the audit's aim is to demonstrate as much of the game's own behavior as practical.

**W4. The browser facilities the game depends on.** Read from the production files on main at f39f565 (`public/script.js`, `public/game/*.js`, `public/sw.js`). The list is a point-in-time reading, not a requirement.

- Covered by W1 to W3: the 2D canvas context, including the display color space option it requests; `requestAnimationFrame`; the Gamepad API (`navigator.getGamepads`, `gamepadconnected`, `gamepaddisconnected`); the Screen Wake Lock API (`navigator.wakeLock.request`); `ResizeObserver`, `window.visualViewport`, `window.devicePixelRatio` and `matchMedia` for the display resolution; `HTMLDialogElement.showModal`; the page visibility event and `document.visibilityState`; keyboard and window blur events; `document.activeElement`.
- Already decided elsewhere and not changed here: `localStorage` (D23 U1); the timers `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval` (D22 T3, D23 U3 and U4); the service worker, the Cache API, `fetch`, `Date.now` and service worker registration (D24 V1); `Math.random` (D24 V3).
- A browser facility not named in this list is not trusted by this file.

**W5. What is not claimed.** The audit claims no protection against bugs in the browser, against a browser that does not follow its documentation, or against a feature that reports success but does not work. A test may replace a browser feature with a controlled stand-in; that stand-in is a trusted test control, as AUDIT.md F5 and F6 state.

## Not decided here

- Any list of browsers or devices on which the features are checked. The eight device and browser dependent requirements named in D15 keep their evidence gaps until the evidence is obtained.
- Any change to REQUIREMENTS.md and any code change.
- Closure of the Phase 1 exit item on trust assumptions, or of any other Phase 1 exit item. This file records one further entry toward the trust assumptions. It does not close the item.
