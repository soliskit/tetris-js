# Gravity requests: where the numerical result reaches the scheduler

The published numerical method covers the requested delay for an ordinary finite nonnegative integer score. This source map connects that result to each textual call of the engine's gravity-request method. It does not claim that an old pending timer always has the latest level, or that a scheduled callback runs on time.

Proposed method extension for independent review only. Phase4, F22 and PLY2 remain open. No execution, correction, test or CI change is included.

## The common request point

Pinned main keeps gameManager.js hash31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea unchanged.

`startGameLoop` (359-367) calls stopGameLoop first. Only after that returns does it read standardDropInterval into a local. That getter (178-180) computes max(0.25,0.7-0.02*(level-1)); level (118-120) floors score/1000 and adds one. The local is multiplied by1000 and passed to schedule (382-384), which forwards the same ms argument to scheduler.setTimeout with a guarded callback.

Thus, whenever this call reaches setTimeout under the numerical packet's stable ordinary getter/Math/score premises, its supplied ms has the S10 bound. A cancel throw can prevent the request entirely. A registration throw, partial retained callback or returned handle does not change which argument was supplied, but its effects are separate. Successful delivery, returned handle/resource correspondence and safe stop are not proved by the arithmetic relation.

## All textual engine callers

A source search of the complete pinned gameManager.js finds the following six textual invocations, aside from the method definition. No other engine method passes standardDropInterval to a scheduler.

| Caller | Conditions and order before request | What remains separate |
|---|---|---|
| dropTetromino,255 | Returns outside playing. May move one row and update lowest/reset fields; landIfResting may lock/spawn. Requests only if still playing afterward. | Legal geometry, lock effects, failures and callback execution. |
| Lock callback,268 | lockAndSpawnNext first; requests only if state is still playing. | Actual callback delivery/removal and cancellation, save/generate failures. |
| Confirmed New Game,480 | Skips while playing; paused unconfirmed action only asks. Confirmed reset then sets playing then requests. | Reset/factory/storage failure prefixes and initial resting-piece resource semantics. |
| Resume,500 | Requires paused; sets playing then landIfResting, then requests only if still playing. | Resting/reset-limit immediate lock, aliases, guard and failure outcomes. |
| Hard Drop,545 | Requires playing; assigns ghost position then locks/spawns; requests only if still playing. | Ghost/fit validity, save/generate failures, authoritative position and lock relations. |
| Hold,579 | Requires playing and canHold. Stops old timers first, rebuilds incoming/spawns next, sets held/canHold, then requests only if still playing. | Incoming overlap can stop normally before request; held-state, partial writes and failures. |

The gravity callback (364-365) clears its handle then calls dropTetromino; it does not separately compute a delay. `tick` guards the same drop method. Soft Drop action routes to the same method. Moving/rotating can invoke lockAndSpawnNext through resting/reset-limit handling without their own new gravity request. Therefore an existing timer can retain an earlier requested interval after a level-changing lock on those routes.

## Correcting the scope of the earlier source claim

The earlier P3-C PLY2 record claimed each lock path restarts gravity and a pending timer always carries the current level's interval. Its own listed callers do not establish that. The current row-clear source record already distinguishes count-limit move/rotate locking while a timer remains pending.

S10 compares the value requested at the time it is requested. It does not independently require cancel/reissue after every later level change. The retained-interval case therefore cannot be promoted to a requested-value mismatch from this source map alone. Whether another adopted requirement demands a different pending deadline is a separate criterion question, not a new default in this packet.

## Conditional scope and remaining gates

Combined with the reviewed numerical packet, this source argument extends the supplied-request-value relation to the six textual engine caller sites whenever they reach the common setTimeout call with an ordinary finite represented nonnegative integer score and stable ordinary getter/Math semantics.

It does not prove all admitted boundary scores meet those premises, semantic representation of every unbounded integer, every writer's admission, ordinary reachability, direct custom calls or altered scheduler behavior, native accuracy, all failure checkpoints, gravity movement, lock behavior, resource state or full F22/PLY2. The repository's sole schedule wrapper also carries lock-delay requests; S10 is not silently extended to them.

No original execution receipt is recovered, no new scheduler argument is logged, no process success is asserted. Independent source-map review and claim-specific certification are still required. The next concrete gate is writer/admission/failure reconciliation, not another broad timing-policy question.
