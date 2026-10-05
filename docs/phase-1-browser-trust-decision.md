# Phase 1 decision: trust boundary for browser features

Status: decision text recorded by ledger row D27 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: the blueprint's O6 trust ledger, the trust assumptions of D23 U1 (storage), D24 V1 (hosting and the offline cache), and the SAF-5 reporting rule of D23 U2. This file changes no bytes of any of them.

## Decision text

**W1. Browser implementation of specified features, when the call succeeds.** The browser's own implementation of a specified web feature is trusted to behave as that feature's specification or documentation says, but only when the call succeeds. Examples are drawing to the page, reading controller input and requesting the screen wake lock. The audit does not test whether the browser itself is correct. This trust covers the browser's side of the call and nothing else.

**W2. Everything on the project's side stays inside the audit.** The game's own logic around a browser feature is not trusted. That includes how the game calls the feature, how it uses what the feature returns, and what it does when the feature is missing, refused or throws an error. All of it is audited under the rules already decided and the requirements that apply: SAF-5 and D23 U2 for drawing and controller faults, and DSP-7 for the wake lock (if it is unsupported or refused, the game plays normally). W2 adds no requirement and changes none.

**W3. What is not claimed.** The audit claims no protection against bugs in the browser, against a browser that does not follow its documentation, or against a feature that reports success but does not work. A test may replace a browser feature with a controlled stand-in; that stand-in is a trusted test control, as AUDIT.md F5 and F6 state.

W1 does not replace D23 U1 (storage) or D24 V1 (hosting and the offline cache), which keep their own wording. This file does not list every browser feature; a feature not named here is not trusted by this file.

## Not decided here

- Any list of browsers or devices on which the features are checked. The eight device and browser dependent requirements named in D15 keep their evidence gaps until the evidence is obtained.
- Any change to REQUIREMENTS.md and any code change.
- Closure of the Phase 1 exit item on trust assumptions, or of any other Phase 1 exit item. This file records one further entry toward the trust assumptions. It does not close the item.
