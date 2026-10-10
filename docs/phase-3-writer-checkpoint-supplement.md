# Phase 3 writer-anchor and conditional checkpoint supplement

Source main, whose public tree remains identical to D43 scoped source. No repository edits, execution, tests, model author contact, rule adoption or finding classification. These are direct static reads of actual fetched source bytes.

Checked anchor groups: W01-W21 and W25-W33. W22-W24 and W34-W35 direct static anchors are checked below; their full native-focus, alias/reachability/category relations are still not proved. No full writer exhaustiveness or runtime proof is claimed.

## Results
W01/W02: constructor and factory/piece spawn writes match cited lines. IC RAF registration at112 is outside its callback try. Concrete starting values do not prove semantic opening validity.
W03-W05: performAction A10 clear468 is inside GM guard; softDrop clear528 is before guard529. cancelNewGame clear535 is inside guard. onChange391 remains outside runChecked catch.
W06-W09: reset/load/pause/resume actual writes and line anchors match. Accepted load216 uses resetLockDelayForNewPiece308/309, not saved reset/lowest restoration. Resume499 calls landIfResting and pieceLanded280 uses >=15. Source expected count15/count16 distinction remains D18 B9.2 line45.
W10-W14: movement position554 and rotate state145/position146 precede outer check. Lowest helper300-310 records box row. Gravity callback364 clears handle before drop; drop245 has mode gate. Harddrop542 assigns ghost position then lock. This is static correspondence, not model agreement.
W15-W18: lock callback267 calls lock without a mode guard; conditional state check only controls gravity restart268. Helpers317-350 contain board/row/score/highscore and queue/spawn effects; hold559-580 and reset helpers match citations. Any failed-cancel counterexample must honor actual source scheduler failure assumptions, not arbitrary successful-cancel firing.
W19: failSafe sets mode437 then stop/cancel438-439 before fault push/onFault. Only reporting blocks are caught. Controller repeats are not referenced here. Required visible-message/output handling and failedcancel cutpoints remain evidence gaps.
W20/W21: save payload221 precedes eligibility222; eligibility setter catches flag writes internally. storageChanged175 sets cacheundefined. This proves the cache is invalidated, not that it models the separate A16 session lifetime. Cross-tab storage event553 invalidates and redraws, no GM guard.
W25-W29: alias120 occurs before held-set126/127; own control writes have no GM monitor. startMoving writes movement259, clears260, GM action261, registers270; reissue268 after GM action267. repeat stop264 performs no GM check. Soft timer291 callback mode292/stop293 before GMsoftDrop296. releaseAll clears through stop calls306/307 then sets/clears308-311, so a throwing cancel may stop later clearing. No failure trace run here.
W30-W33: drag begin433-436 precedes capture437; pointermove mutable anchors/offsets and inner GM operations match. endDrag488 does not read final client coordinates and resets after inner rotation489. Hidden reset546 precedes optional GMpause547. These anchor checks do not prove tap/excursion or combined visibility frame correctness.

W22-W24: SC226-229 show/close dialog, HTML64-73 contains Cancel autofocus69, SC528/529 queries activeElement and focuses a clamped button, SC531 clicks only a focused question button. No focusin/focusout handler or explicit A11 field found in these source files. Browser focus behavior, initial focus latency, Tab/accessibility/pointer routes and visual highlight still need runtime evidence.
W34-W35: direct source scan of shipped SC/IC manager calls found handleAction/softDrop/togglePause/cancelNewGame/storageChanged plus getters and public field reads, no direct GM lock/hold/reset helper call. This is a two-file scan, not universal reachability proof. Tetromino.copy45-52 shares position and rotation/kick arrays; ghost353-356 replaces its copied position, not the current piece position. session parse builds new board cells90 and built-in active/waiting pieces, then load assigns accepted pieces. Fresh value objects are not runtime-immutable: position11 returns a plain object; external mutation possibility and shared geometry references remain relation gaps.

## Independent review limits
Independent spot review hashed the first six snapshots and checked about forty-five specified line anchors. It did not compare those hashes to the fetched commit, check all clauses, verify helper317-350/guard structure/source adoption, or run failures. Coordinator attribution to fetched Git bytes is separate. Later bounded fidelity review checked W22-W24 focus/ghost anchors and found them matching. A later optional gap check hashed the actual session/position snapshots and inspected session parse line90 fresh cells and position line11 plain-object/no-freeze anchors. Full W34-W35 external-mutation/shared-geometry/reachability relations and complete two-file call scan remain unreviewed. Conditional cutpoints received the separate state-worker reproduction/source-scope review recorded below; the document-fidelity reviewer did not rerun them.

## Distinctions retained
Private source checks do not change merged D43 pending wording or certify claims. Concrete absence of a field is not a proven absence of semantic representation. Ordinary gameover semanticabsence is not mandatoryclearing; fault retained contents have a separate projection. A guard after an inner action does not establish an outer control/touch commit or all-state frame.

## Actual source identities
public/game/gameManager.js SHA256 31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea
public/game/inputController.js SHA256 7454a3c23b9de0acb152fe76bedab74bb4a604ac62ca11d41ff5ee12e3ed27e2
public/game/tetromino.js SHA256 d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe
public/game/tetrominoFactory.js SHA256 25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4
public/index.html SHA256 96f7fb5b112d6890b33b0f38d51e2bb47fe2289875354559a82ab4e036ab85c1
public/script.js SHA256 59fcb3343f35d0022c739cce82c5c9601a9e3bc354a9dc991eb1660c4e599ad4

public/game/session.js SHA256 54acbea460218f0e0a827619eae51e265461fe9ac6575dc8bf48727f6483049b
public/game/position.js SHA256 e598b5ea4ff8f125bcb405b35ab6fb21d64e1fc6fc623a862b46ca839c2b6144
public/game/gameState.js SHA256 4d4d88f18f8d2335fac4104e746b972214991df8b1c6e72e0cc5d8d12cb30878

## Conditional checkpoint observations and correction

Scratch Node22 adapters; no native browser failure or public-action reachability claim. Before running, the cases and expected source domains were written in cutpoint-plan.md. The initial plan's silent-cancellation attribution was too broad and is corrected here while preserving its artifacts.

- onChange throws after Move: piece moves column4 to3, game stays playing, gravity registered, zero faults/reports; exception escapes. GM guard391 calls onChange after runChecked. Applicability of this callback failure to the SAF-3 boundary remains open.
- Factory throws during HardDrop, then gravity cancellation throws while failSafe runs: mode becomes over, four blocks retained, gravity outstanding, no fault record/report, cancel exception escapes. Conditional T3/U3 failure evidence, not a claim that native clearTimeout throws.
- The two original silent no-op cancel cases return normally, then deliver a retained lock callback while paused or over; board changes from zero to four blocks and concrete piece changes. D22T3 trusts a successful cancellation not to fire. These adversarial success-return cases fall outside that trust assumption. They are no-entry-mode-gate observations, not firm U3/U4 violations.
- The separately preserved reviewer throwing-lock variant was reproduced with only imports changed. Both throw-all and throw-lock-only cases have modeover, zero blocks, zero faults/reports after failSafe escapes. Delivering the actually retained lock callback makes four locked blocks and a new concrete piece while still over. This is within the conditional failed-cancel fault-stop domain of U3. The throw-all delivery also escapes cancel; throw-lock-only delivery does not.
- Successful pause cancellation control retains no lock firing and none is delivered.

The resting prestate is injected built-in O at row18,column4, empty board, resetcount0 and lowest occupiedrow19. It is a declared valid semantic prestate, not proved public-action reachable. The fault case invokes the real guard with an injected throwing operation. Full board/piece/mode/count/lowest/timer/effect/report snapshots are retained in the manifest's artifacts.

## Independent checkpoint review
The reviewer reran the five original probes, obtaining byte-identical JSON after changing import paths to its source copy, and ran the throwing-lock variants. It checked the source/scope and supplied the silent-cancel correction. It did not rerun the static record or establish native failure/public reachability. Its source comparison to0f4e510 was modulo a reconstructed trailing newline; actual Git-byte/source identities are the coordinator's separate evidence. No conditional result is a formal finding or certification.
