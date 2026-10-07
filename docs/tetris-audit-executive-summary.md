# Tetris audit: the game, the checks, the next step

Imagine a falling block game where the usual moves work. Now pause it, edit its saved data, hold two keys, or make a browser service fail. Does the game still follow its rules? That is what this audit is checking.

## What exists today

The game already exists. This publication changes its audit documentation, not the game. No behavior has been fixed by these records, and no new permanent tests have been added.

## What we checked

An audit phase is one stage of work with its own completion criteria. Phase 3 connects each rule to the code and a way to check it without simply trusting the code's own answer. Some checks compare one worked example. Others inspect every listed code path under stated assumptions. Independent reviews have checked bounded comparisons; they have not certified every rule.

Phone recordings show installation, launch, portrait gameplay and Safari magnification followed by a reported pinch returning the page to normal size. The owner approved moving forward with four checks marked Not established, meaning the evidence does not establish them. That decision was not published promptly. This record preserves it, without pretending it certifies the whole game or completes every mapping review.

## What looked wrong, and under what conditions

Controlled tests found behaviors that look wrong and are not yet classified: saved data losing a reset counter, which tracks how many times a landed piece has restarted its lock delay, two physical keys sharing one held-key state, and a later action happening after pausing. Other tests forced browser services to fail or used an adjustable clock. In a private test copy, a forced drawing-request failure left the paused screen showing its earlier controls. Controlled cache tests, which exercise the browser's stored copies of files, produced different versions of game files together. These are bounded examples, not claims that every player sees them.

A resize experiment did not reach its required starting condition. It has no completed failure image or recovery result, so it does not count as a successful experiment.

## What remains unverified

The recordings do not identify every finger contact or the exact files run from the phone's stored copies. Delivery of both quick taps, double-tap recovery, recovery after reloading while enlarged, and exact cached-file identity remain Not established. Other hardware, accessibility, color and timing relations still need claim-specific review; the four approved limits do not settle them.

## What happens next

Publish the reviewed record. Finish the remaining mapping judgments and Phase 4 domains. Then separately decide which behaviors are defects and which rules are supported strongly enough to certify. Corrections and regression tests need their own approvals. New features and CI improvements, which change automated checks on each commit, remain on hold. There is no grounded Phase 10 finish time yet.

## Later bounded Phase 4 checks

Four later checks are now ready to record. In one controlled failure after confirming New Game, a fresh saved-flag check still treated the old save as eligible. In one paused held-key callback, the expected safety checkpoint was not called. In one controlled cache failure, the download-failure handler removed a foreign cache's name binding. A separate resize test left the board blank after a drawing call was refused, without the chosen small player notice; a later resize drew the board again.

These are candidate findings at the tested scopes, not confirmed defects or fixes. The New Game check did not establish that its old payload was a valid last-good save or that Continue was shown to the player. The cache check used a controlled fixture, not a native installation. The resize result does not prove the whole game continued correctly. The earlier unsuccessful resize attempt is still recorded as unsuccessful.

Phase 4 remains open. Wider failure, timing, input, saved-content and native-device domains remain, as do the four previously approved phone-evidence limits. No property is certified by this update. The next step is to disposition the candidates and finish the remaining declared domains, with evidence or separately approved limits, before requesting corrections or final certification.

## Current status consolidation

The later [status and disposition record](audit-status-and-dispositions-2026-10-06.md) separates the old Candidate reports from later narrow defect decisions. It also records Phase3's completed publication checks. That is not proof that the whole game is correct.

The repository stayed quiet after PR90 while private evidence was reconciled. That work corrected real mistakes in the evidence, but did not finish Phase4. The next step is to close a specific remaining evidence or interpretation gate, rather than keep producing repeated source summaries. No fix is approved by this update, and there is no grounded finish date.
