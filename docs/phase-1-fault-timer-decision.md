# Phase 1 decision: fault reporting for SAF-3 and timer trust

Status: decision text recorded by ledger row D22 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: D16 (`docs/phase-1-state-decision.md`, SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182), whose section 8 lists "fault reported" as part of the SAF-3 safe terminal/fault state without deciding its meaning, and the R2 to R5 decision (`docs/phase-1-r2-r5-decision.md`, D21, SHA-256 2d2de112e371b8b23094652bcb8c991d8d2c6097575a4c61c059a21292b93ed8), whose S10 left the trust of timer registration and cancellation open. This file decides those two points. It changes no bytes of either file.

## Decision text

**T1. Fault reported, SAF-3.** When the engine throws and the game stops in the SAF-3 safe state, the fault counts as reported when both of these happen: (a) the player is shown a plain message that the game stopped because of an internal error, so that no developer console is needed to see that something went wrong, and (b) a separate signal that a test can observe is raised. The criterion is independent of any particular callback or interface the implementation uses today.

**T2. No stored fault record.** No fault record is required to be written to storage. T1 does not add a stored error log, and it adds no condition on the board, queue, current piece, score or hold beyond those in D16 section 8.

**T3. Timer registration and cancellation.** A timer that was cancelled successfully is trusted not to run afterwards. Registering a timer and cancelling a timer are inside the SAF-3 behavior: if either throws, the engine stops in the SAF-3 safe state and the fault is reported under T1. No defense against a scheduler that runs a timer after a successful cancellation is required. This records the trust assumption that D2, F5 and F6 already relied on.

**T4. Relation to earlier text.** T3 settles the sentence in D21 S10 that left the trust of timer registration and cancellation as a separate Phase 1 item. Nothing else in D21 changes.

## Not decided here

- What "fault reported" means for SAF-5, an error while drawing or reading a gamepad, where the drawing and polling loops keep running. T1 is stated for the SAF-3 stop only and is not extended to SAF-5 by this file.
- What the safe state requires if cancelling a timer itself throws while the game is already stopping after another fault, including whether "no timers running" can be required in that case. This depends on the meaning of "timer" for SAF-4, which remains undecided (D16 section 9).
- The remaining trust-ledger entries, including storage, the service worker, hosting and repository settings.
- Any change to REQUIREMENTS.md and any code change. Some of T1 and T3 may differ from how the code behaves today; that is a later separate decision with its own tests and approval.
- Closure of the Phase 1 exit items on fault reporting and trust assumptions. This file records two decisions toward them and does not close either item.
