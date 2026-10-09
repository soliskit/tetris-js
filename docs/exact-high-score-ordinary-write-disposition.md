# Exact stored high score: ordinary lower-write disposition

## Current disposition after the stored-score ceiling

The stored high-score maximum is now 9,007,199,254,740,991, the same as saved-game scores. The plain decimal 9007199254740992 (2^53) is above that maximum and is invalid stored high-score content. S8 counts it as zero. The reader returning zero is therefore consistent with the current numeric-domain rule for this exact value, not a current defect.

The earlier conditional read and lower-write findings below depended on admitting 2^53 as good content under the then-unbounded rule. That premise is superseded. Replacing this invalid stored value with 100 is not established as a current only-higher defect by that argument. The owner has resolved the SCO-3 interpretation: repairing invalid stored high-score content is not lowering a valid high score. The only-higher rule still protects valid stored high scores; see `invalid-high-score-repair-decision.md`. The interpretation question is closed, not implementation certification. REQUIREMENTS.md is not changed here.

The source response, finite route calculations and historical evidence retain their original scope. No new execution, code correction, permanent test, format-wide certification or phase closure follows. Other read/write failures, valid in-range values and their replacement behavior remain separate.

## Historical argument under the earlier rule

The following text is retained as the historical conditional argument, not the current disposition or permission to act. Its unbounded-domain and Confirmed statements apply only to the earlier criterion. The current decision above supersedes that criterion without rewriting the old evidence.

Status: Confirmed defect by independently reviewed conditional source argument for the finite ordinary clear route below. Operative only after documentation review, exact-head checks, authorized merge and postmerge publication verification. Not newly Reproduced, native storage evidence, full SCO3/S8 or Phase4 closure.

## Independent criterion and starting content

The exact plain decimal9007199254740992 uniquely denotes2^53, an S8-good nonnegative whole stored high score under B3/B11/B16. It is exactly representable in binary64 but outside the safe-integer range. The separate read disposition records the reviewed getter rejection to0. This argument closes its previously missing ordinary legal-clear admission, not a new numeric format or upper-limit decision. SCO3 allows replacement only by a higher score.

Successful storage initially holds that exact text. Ordinary numeric built-ins, successful storage reading/writing, scheduler registration/cancellation and no intervening actor/getter/proxy mutation are explicit premises. External good high content need not have been earned by the game. No Continue, legacy/default save interpretation or independently good prior game payload is needed.

## Ordinary factory and action admission

Source main a5483617f4ba6ddd4627b1eeb2d4de796d652e19 has unchanged public tree1e09ad61c19e0b235a231ad8810dae176be4ea77. Its ordinary seven-bag inventory is mapped to the adopted geometry kinds I,O,T,S,Z,J,L. Choose valid random results0.999 for the finite shuffle prefix: floor(0.999*(i+1))=i for i6..1, giving the identity permutation. Eighteen results cover constructor draws, NewGame's reset/refill and the next gameplay refill. This is allowed provider-output admission, not an injected factory or a new randomness-quality claim.

From the opening game-over state, NewGame starts an empty dense20x10 board, score0, ordinary queue and no held piece. The first eight current pieces are I,O,T,S,Z,J,L,I. Keep every piece in spawn orientation. Use ordinary horizontal handleAction calls then HardDrop: firstI threeLeft to column0; O stays4; T/S/Z/J/L each threeLeft to0; eighthI threeRight to6. Every intermediate airborne placement fits and is inbounds. No board/piece/mode/count patch, helper call or held-control/touch activity is used.

Choose the finite engine ordering with these actions completed before each relevant gravity deadline and no delivered callbacks. HardDrop locks immediately and ordinary gravity is canceled/replaced after each lock. Successful cancellation means canceled firings are not later delivered. This is an explicit conditional engine-order premise, not a measured native/physical timing promise.

## Independent geometry and clear

The fixed adopted spawn-cell sets independently give these box anchors at lock:

| Piece | Anchor | Occupied cells |
| --- | --- | --- |
| I | (18,0) | (19,0),(19,1),(19,2),(19,3) |
| O | (18,4) | (18,4),(18,5),(19,4),(19,5) |
| T | (17,0) | (17,1),(18,0),(18,1),(18,2) |
| S | (15,0) | (15,1),(15,2),(16,0),(16,1) |
| Z | (13,0) | (13,0),(13,1),(14,1),(14,2) |
| J | (11,0) | (11,0),(12,0),(12,1),(12,2) |
| L | (9,0) | (9,2),(10,0),(10,1),(10,2) |
| I | (18,6) | (19,6),(19,7),(19,8),(19,9) |

Each next downward placement collides with earlier locked cells or the bottom boundary. The first seven locks form no full row. The eighth completes exactly row19. Thirty-two accumulated cells before clearing become22 after removing that row and translating the remaining cells down1; the first occupied row is10. The next currentO at(0,4) fits, queueT/S/Z and bagJ/L/I remain ordinary, and the resulting score is100.

The retained calculation initially used a generic board field for preclear occupancy, including32 cells at the eighth lock. Review identified that evidence-layer ambiguity. It was corrected to explicitly labelled preclear and separately calculated postclear sets/counts. These are pure cell-set arithmetic, not eight executed game frames or production/model execution.

## Source consequence and precise scope

HardDrop uses the ordinary ghost/dropDistance then lockAndSpawnNext. clearFullRows returns false on the first seven locks, without high-score access. On the eighth it adds LINE_SCORES[1]=100, then computes Math.max(highScore,score). The successful exact2^53 read converts exactly, but Number.isSafeInteger rejects it and the getter returns0. Math.max(0,100)=100; the successful setter writes text100, replacing good2^53 with a strictly lower score. This violates SCO3's only-higher replacement rule.

The high write precedes next-piece generation and the optional session save. Successful later ordinary serialization/storage avoids a later interruption but does not establish B16-good saved content or last-good preservation. The route does not certify whole R1 lowest-row/history correspondence: HardDrop's position assignment does not update anchor history as ordinary downward falls do. That separate correspondence issue does not change the exact fitted lock/clear/high-write facet.

Confirmed by conditional source argument: this admitted ordinary eight-piece clear lowers the exact good stored high2^53 to100 under the stated successful-resource/read/write/noninterference premises. The earlier injected historical clear is no longer the only admission evidence for this facet. Broader numeric formats, all integers/arithmetic, all RNG/action traces, equal-value rewrites, failures, cross-tab/native persistence, full SCO3/S8 and Phase4 remain open. Pending Q2 detector extent is not assumed. No correction, test, model, CI, requirement or public-site change is included.
