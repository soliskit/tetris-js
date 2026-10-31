# Tetris audit

What the safety audit established, what it has not, and where it stands.

The audit checks the game against eight security properties (O1 to O8), from the authoritative transition boundary to an independent reference model. It ran in October 2026 and is stopped. Nothing here starts it again.

## What it established

Each of the eight properties stands at Partially Established: tested within stated bounds, with limits on record. No property is untested, and none is fully proven. The main limits: browser evidence is Chromium, not Safari or a real phone; fault-injection tests use scripted breaks, not organic failures.

Twelve requirement rows are Not Established in whole or in part; eight of them sit on a confirmed defect, the rest on evidence limits. Eight more rows have a device, display or Safari half that repository evidence alone cannot test; those halves stay open for later device evidence.

One finding needs its status stated as last recorded. F19 (invariant-guard fault reporting): fixed historically, reverified October 23, 2026 within stated scope - two Node tests break the invariant check and the guard still catches and reports the fault; browser corroboration covers a generic engine failure with injected console and draw refusals, not the Node throw routes; scripted fault injection, not an organic failure; browser viewports, not a physical device. Deployment and current behavior stayed pending later-phase evidence.

## What stays open

The audit stopped mid-classification. Twelve findings still need a final status: F8 (a Mac-only key report on a platform the game does not support); F1, F2, F10, F13, F14, F16 and F28a (recorded repairs or resolved-no-change rows whose final wording was never adopted); F33, F34, F35 and F37 (defect-confirmation narratives whose status word was proposed but not settled). Some confirmed defects remain open, among them F23 (an injected serialization exception that Pause swallows without the required stop signal) and the remaining scope of F20 (partly repaired by PR #293); two others, F26 and F36, were settled with named tests, and F19 was fixed historically. The audit stopped before its fix phase. One touch-responsiveness item stands as a Candidate by design: its single real-iPhone attempt could not show the taps were fast enough, so no status was proposed; a later real-device run can settle it.

## The record

The full audit record - blueprint, phase evidence, run captures and reconciliations - remains in git history. This page is the current summary; it certifies nothing new.
