# Phase 3 row-clear and level source evidence

Conditional source arguments, not machine-checked proof, universal valid-state coverage, finding classification or phase closure.

## Row transformation

Assume a dense ordinary 20-by-10 board with ordinary cells, fixed columns, no throwing or mutating getters/proxies/reentrancy, and normal completion of clearFullRows. Let R be the set of original indices of full rows and k its size. The source collects each full row once, removes indices in descending order, then prepends k empty rows of the configured width. Descending removal preserves the identities of earlier indices. Survivors retain their original relative order. Each original survivor i moves to i plus the number of removed rows below i. This includes noncontiguous full rows.

Removing k rows and prepending k rows preserves 20 rows, each of width 10. Surviving row/cell objects are reused, not deep-copied; no alias elimination or hostile mutation protection follows. If k is zero, the early return changes neither board, version nor score. The row transform argument covers k from zero through 20 under its premises. The score table is separate: for k from one through four, the source adds 100, 300, 500 or 800 respectively.

## Ordinary-history count bound

If constructor/New Game starts with no full rows, only a fitted four-cell lock changes occupancy between completed clears, and every lock is followed by completed clear, at most four rows can become newly full at a lock. That induction excludes load/import, external aliases, malformed providers, interrupted/fault-retained histories and any preexisting full row. It is not a restriction of the independently defined valid-state domain. Parser rejection of full rows cannot narrow that domain. For k above four LINE_SCORES[k] is undefined, so score += undefined produces NaN. The invariant check rejects that score as not a safe integer. This is a conditional source observation, not proof such a state is reachable through ordinary public play.

## Safe-integer level lemma

For an integer score s from zero through 2^53-1, assume binary64 division rounded to nearest. q=s/1000 is below 2^44. Binary64 spacing there is at most 2^-9, so division rounding error is at most 2^-10, less than 1/1000. A nonintegral exact q is at least 1/1000 from either adjacent integer. Rounding therefore cannot cross an integer boundary. An integral q is exactly representable. Math.floor(s/1000)+1 equals exact integer division plus one in this domain.

This does not prove the lemma for every finite whole Number allowed by the wider requirement. It excludes beyond-safe integer arithmetic, score-update overflow, number grammar and transport behavior. The application getter is not its own independent expected oracle: the arithmetic argument supplies the comparison.

## Requested timing relation

Among the inspected routes, hard-drop, lock-callback, drop, Hold and Resume issue a new gravity request using the current level only while playing. Resume has an explicit playing guard after landIfResting. A count-limit move/rotate route can clear/replace a piece while retaining an already pending gravity timer without issuing a new request at that point. Retaining an earlier request is not itself a requested-value mismatch: S10 judges the delay requested, not native elapsed time or a requirement that every level change cancel and reissue a timer. The later pending callback requests the current level if play continues. Source anchors: drop 245-258, lock callback 264-269, hard drop 539-547, Hold 560-580 and Resume 496-501. This list is not exhaustive.

## Source binding and limits

Public tree `1e09ad61c19e0b235a231ad8810dae176be4ea77`. `public/game/gameManager.js` SHA-256 `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`, level getter at 118-120, clearFullRows at 334-351, score table at 38 and score invariant at 415-430. `public/game/gameState.js` SHA-256 `4d4d88f18f8d2335fac4104e746b972214991df8b1c6e72e0cc5d8d12cb30878` defines createBoard at 42-44 with separate row/cell creation. These source arguments do not establish complete queue/spawn/save/fault/resource composition, physical timing, hostile records or all imported boards. The held finite line-clear comparisons are separate execution evidence, not the premises of a universal source claim.
