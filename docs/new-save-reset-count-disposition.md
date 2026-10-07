# New-save reset-count loss: scoped disposition

Status: Confirmed defect by independently reviewed source argument under the premises below, operative only after this record passes its documentation review, exact-head checks, authorized merge and postmerge verification. Not newly Reproduced. Source argument only. No game launch, fixture, serialization call, storage write, correction, permanent test or certification. This addresses the unresolved actual writer-entry premise of the prior paired information-loss argument, not the existence of a good prior saved payload.

## Claim

Two admitted successful Pause routes reach identical ordinary serialized gameplay fields but different semantic reset counts. Therefore one fixed denotation of their identical payload cannot restore both exact counts, as B16 requires for newly written saves. This is a source-argument counterexample, not runtime reproduction or whole F20/S6 certification.

## Independent criterion

The governing R1 decision B9.1 allows resting playing counts0 through15 and paused counts0 through16. B9.2 counts each legal resting horizontal move which reaches no new lowest row, and Pause during lock delay adds one reset. A pause and resume do not make a new current piece. B16 requires a newly written save to preserve the reset count exactly. B3 requires one semantic value per representation. The adopted O geometry is a fixed2x2 square; rows increase downward. No legacy/default schema interpretation is used.

## Common initial route and mapping

Use an admitted factory draw with O first, a valid ordered queue of three pieces, and a valid bag continuation. The two paths use the same draw sequence and ordinary piece objects, dense empty20x10 board, score0, no held piece, Hold available, no confirmation or held-repeat/touch control activity. Successful scheduler/storage facilities and no unrelated actors, callbacks, getters, proxies or custom serialization are explicit premises.

After the ordinary constructor draws, take New Game through public handleAction from game over with the same admitted factory permutation in both paths, producing O as the new current piece. Schedule ordinary downward firings until the O reaches box row18, column4, without delivering the lock callback. The blocks are (18,4),(18,5),(19,4),(19,5). Its semantic lowest row is19. The current implementation stores anchor row18; under the declared constant-O history correspondence, semantic lowest = anchor history +1. This is a fixed correspondence for this argument, not an assertion that raw anchor18 is semantic row18 or a general cross-orientation decoder.

Each downward firing has a free below position until row18, updates anchor history and resets count0. Arrival at row18 starts a lock delay and leaves gravity outstanding. No row locks or clears, no queue/bag/score/hold change, and the original lock deadline has not fired. The source monitor accepts the playing state. This is an engine-route reachability argument with successful scheduling premises, not a native timing measurement or full UI trace.

## Divergent routes before deadline

A: Pause immediately at this resting count0. The Pause branch sets paused, cancels gravity, increments the active-lock count to1, cancels lock, and calls saveGameSession.

B: Before a lock callback fires, move left once then right once. Both placements fit the empty board, remain on the bottom surface, and reach no new lowest row. Each successful move calls resetLockDelay with an existing lock task; count increments0→1→2 and the lock deadline is restarted. The piece returns to exactly row18,column4. Then Pause increments count2→3 and cancels gravity/lock before saveGameSession.

No piece rotation or replacement occurs. This avoids all anchor-offset changes. No repeat resources are introduced by these direct engine action calls. No cancel refusal, registration throw, storage failure or malicious serializer is used. The timing premise is that these admitted actions happen before the relevant deadline, not that a native platform was measured doing so.

## Exact serialization equality

At writer entry, A/B have identical gameBoard, score, currentTetromino including its own ordinary properties, nextTetrominos, heldTetromino, canHoldTetromino and factory.bag colors. They differ in reset count1/3 and preceding timer/deadline history; both logical timer handles are null at writer entry, and lowest agrees. Under the no-other-actors premises, no gameplay timer remains outstanding. serializeSession selects exactly the seven listed gameplay fields. It does not select reset count, lowest, timer handles or deadline history. Ordinary JSON serialization has no side effects and no count-dependent toJSON hook. Thus both calls return the same payload bytes under the same serialization ordering.

Both payload/flag writes are assumed successful here. That does not establish that either resulting payload is B16-good. The argument intentionally does not use successful write as evidence of good content.

For any fixed payload denotation D, the equal payload can denote at most one reset count. It cannot simultaneously preserve1 and3. This closes a reachable paired-writer information-loss premise without choosing D, invoking production Continue as an expected oracle, or inferring an absent-field default. At least one route violates new-save exact preservation. It does not establish which particular payload is good, that every save is invalid, or any last-good preservation outcome.

## Independent review and disposition

Independent review checked the exact source order, ordinary-field equality, adopted geometry/count criterion and stated finite scheduler/action admission. This supplies the actual writer-entry premise missing from the earlier conditional count-pair argument. The precise defect is confirmed by source argument under these premises, not reproduced by a new execution. Full prior-good F20/S6 preservation, every writer/failure composition, native/UI domains, exact-value restoration of other fields and corrections remain open. No whole R1 validity, universal format invalidity or property certification follows. The next distinct F20 preservation question is an independently good prior game-written payload with its successful-write provenance; this count-loss argument deliberately does not supply it.

Source pins: main505e5e9aa4edd49f89961f83c861b62c87eb5bcd; gameManager SHA25631bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea; session SHA25654acbea460218f0e0a827619eae51e265461fe9ac6575dc8bf48727f6483049b. Source sections: manager resetLockDelay/noteLowestRow/startLockDelay/dropTetromino/performAction pause/saveGameSession; session serializeSession.
