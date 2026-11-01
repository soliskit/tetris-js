# Tetris audit

What the safety audit established, what it has not, and where it stands.

The audit checks the game against eight security properties (O1 to O8), from the authoritative transition boundary to an independent reference model. It ran in October 2026, was stopped before its fix phase, and restarted November 1, 2026 at the owner's direction.

## What it established

Each of the eight properties stands at Partially Established: tested within stated bounds, with limits on record. No property is untested, and none is fully proven. The main limits: browser evidence is Chromium, not Safari or a real phone; fault-injection tests use scripted breaks, not organic failures.

Twelve requirement rows are Not Established in whole or in part; eight of them sit on a confirmed defect, the rest on evidence limits. Eight more rows have a device, display or Safari half that repository evidence alone cannot test; those halves stay open for later device evidence.

One finding needs its status stated as last recorded. F19 (invariant-guard fault reporting): fixed historically, reverified October 23, 2026 within stated scope - two Node tests break the invariant check and the guard still catches and reports the fault; browser corroboration covers a generic engine failure with injected console and draw refusals, not the Node throw routes; scripted fault injection, not an organic failure; browser viewports, not a physical device. Deployment and current behavior stayed pending later-phase evidence.

## What stays open

Every finding carries a last recorded status label: the audit's records give all 55 findings a recorded status word from the phase's October 2026 records, set under the status rules the owner established on October 17, 2026 (among them: a point that shows no break in the game, or concerns only tests or old notes, is recorded Rejected or closed). Two label wordings on three findings are not on the audit's adopted status list, and adopting them to it is one of the owner's pending word picks. The only Candidate is the touch-responsiveness item under its owner-approved exception (a later real-Safari run can settle it; tracked as issue #339). Every property O1 to O8 stands at Partially Established, and each of the 55 in-scope requirements (a different set from the 55 findings) carries a certification status. The phase's exit checks were never recorded as passed; recording that reconciliation is pending review and has not happened.

Three confirmed defects are identified open without a merged fix, and the finding-to-issue mapping is still in progress, so this is not an exhaustive count: an injected serialization failure during save that Pause swallows without the required stop or report (issue #445, Reproduced); the remaining scope of the lock-delay history loss (issue #371, Reproduced); and the invariant check's holed-board gap (issue #358, Reproduced), watched by a known-defect todo test until its approved fix lands. F19 (invariant-guard fault reporting): fixed historically, reverified October 23, 2026 within stated scope - two Node tests break the invariant check and the guard still catches and reports the fault; browser corroboration covers a generic engine failure with injected console and draw refusals, not the Node throw routes; scripted fault injection, not an organic failure; browser viewports, not a physical device. Deployment and current behavior stayed pending later-phase evidence.

The audit stopped before its fix phase. Fixes, certification, and test removals each remain owner-approved steps.

## The record

The full audit record - blueprint, phase evidence, run captures and reconciliations - remains in git history. This page is the current summary; it certifies nothing new.
