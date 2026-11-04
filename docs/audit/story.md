# Tetris audit

What the safety audit established, what it has not, and where it stands.

The audit checks the game against eight security properties (O1 to O8), from the authoritative transition boundary to an independent reference model. It ran in October 2026, was stopped before its fix phase, and restarted November 1, 2026 at the owner's direction.

## What it established

Each of the eight properties stands at Partially Established: tested within stated bounds, with limits on record. No property is untested, and none is fully proven. The main limits: browser evidence is Chromium, not Safari or a real phone; fault-injection tests use scripted breaks, not organic failures.

The classification record lists twelve requirement rows as Not Established in whole or in part: eight were linked to a confirmed defect, the rest to evidence limits. Eight more rows had a device, display or Safari half that repository evidence alone could not test. These are historical classification counts, not current defect totals or updated certification results after later corrections. Their limits remain until the applicable evidence establishes more.

One finding needs its status stated as last recorded. F19 (invariant-guard fault reporting): fixed historically, reverified October 23, 2026 within stated scope - two Node tests break the invariant check and the guard still catches and reports the fault; browser corroboration covers a generic engine failure with injected console and draw refusals, not the Node throw routes; scripted fault injection, not an organic failure; browser viewports, not a physical device. Deployment and current behavior stayed pending later-phase evidence.

## Classification and corrections

Phase 5 classification closed in November 2026. The [exit record](phase-5-exit-record.md) records all four classification exit dispositions, their evidence and their limits. The closure change merged in [PR #455](https://github.com/soliskit/tetris-js/pull/455), and its required test and deployment checks passed. Classification closure is not final certification or proof that every defect is fixed.

All 55 findings have a recorded status, and each of the 55 in-scope requirements, a different set, has a certification status. The recorded status-word choices are no longer pending. F8 is Rejected; F24, F26, F27, F36, F38 and F39 are Fixed at their recorded bounds; F28b, F32b and F32c are Closed (historical note), not fixed or refuted by that closure. The separate register item 26, the iPhone double-tap report, remains Candidate under its approved exception, tracked as issue #339; it is not finding F26. The existing Partially Established and Not Established property and requirement limits remain.

Corrections merged after classification: the swallowed serialization error (#445, PR #456), answer selection after dialog-interior clicks (#450, PR #457), saved-game publication and validity (PR #458), and absent browser coverage measurements (#426, PR #459). These are merged correction records, not fresh verification of every affected claim. The SAVE-1 and VALID-1 decisions still need their implementation and evidence checks reconciled at the current scope.

## What stays open

QA-2 native coverage qualification is not established. PR #461 remains unmerged; this is its evidence status, not an active implementation plan. Authored regressions and green ordinary checks do not establish qualification. This summary starts no correction or qualification run.

The holed-board finding (#358) and the lock-history self-check-extent record (#371) retain their evidence and unresolved requirement-interpretation boundaries. Both report direct state injection under Node, not a defect reached through ordinary play. #371 concerns which history fields the checkpoint must check; it is not the saved-history repair. The existing F21 known-defect todo witness for #358 remains in test/audit/d74-f21-f22-p7.test.js; its todo mark does not make the defect pass. No correction or broader interpretation is approved by this summary.

The eight property claims, the requirement evidence limits and the real-device gaps still need their applicable later-phase evidence. Corrections require verification of their original counterexamples and affected protections. Final certification requires a code-to-claim record with methods, assumptions, evidence and limits, plus owner approval. Any test removal needs a stated replacement protection and owner approval. None of those phase exits or approvals follows from classification closure or this summary.

## The record

The full audit record - blueprint, phase evidence, run captures and reconciliations - remains in git history. This page is the current summary; it certifies nothing new.
