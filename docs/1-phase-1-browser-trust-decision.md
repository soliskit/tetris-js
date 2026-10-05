# Phase 1 decision: trust boundary for browser features

Status: decision text recorded by ledger row D27 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: the blueprint's O6 trust ledger, the trust assumptions of D23 U1 (storage), D24 V1 (hosting and the offline cache), and the SAF-5 reporting rule of D23 U2. This file changes no bytes of any of them.

## Decision text

**W1. Browser features that succeed.** When a browser feature the game uses works, the game trusts it to work as that feature is documented. The features this covers are drawing to the page, reading controller input, and requesting the screen wake lock. The audit does not test whether the browser itself is correct.

**W2. Browser features that are missing, refused or fail.** The game's own handling of a feature that is missing, refused or throws an error is not trusted. It is audited under the rules already decided and the requirements that apply: SAF-5 and D23 U2 for drawing and controller faults, and DSP-7 for the wake lock (if it is unsupported or refused, the game plays normally). W2 adds no requirement and changes none.

**W3. What is not claimed.** The audit claims no protection against bugs in the browser, against a browser that does not follow its documentation, or against a feature that reports success but does not work. A test may replace a browser feature with a controlled stand-in; that stand-in is a trusted test control, as AUDIT.md F5 and F6 state.

## Not decided here

- Any list of browsers or devices on which the features are checked. The eight device and browser dependent requirements named in D15 keep their evidence gaps until the evidence is obtained.
- Any change to REQUIREMENTS.md and any code change.
- Closure of the Phase 1 exit item on trust assumptions, or of any other Phase 1 exit item. This file records one further entry toward the trust assumptions. It does not close the item.
