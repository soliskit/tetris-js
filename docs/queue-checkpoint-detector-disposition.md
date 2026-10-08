# The queue check can miss three empty slots

The safety check counts the next pieces but does not check what is in those slots. A three-slot queue containing no real pieces can pass. This conflicts with the adopted requirement to check three valid upcoming pieces at each required safety boundary. The comparison below is a source argument for an explicitly injected malformed queue, not a new game run or evidence that ordinary play creates it.

Phase 4 stays open. This draft confirms no finding until independent review and publication gates pass. It changes no code, tests, model, requirements or CI.

## Independent meaning and admitted input

The published queue decision requires three valid semantic upcoming pieces. R1 B3 rejects missing entries, sparse collections and values of another type; B7 requires three valid pieces in every mode. Waiting pieces do not acquire the current falling piece's live position, board-fit or timer rules. The original audit blueprint's Q1 method explicitly selects `[null, null, null]` and a sparse length-three array for invariant-boundary comparison, with ordinary writer creation examined separately.

Take a completed ordinary opening game-over state with its dense 20 x 10 empty board, score zero, null gravity and lock handles, no pending confirmation and successful ordinary dependencies. Replace only the upcoming queue with one of these declared scratch inputs:

- A dense list `[null, null, null]`. Its three values are not semantic pieces.
- A sparse list of length three, with no entries. Length does not supply its missing semantic entries.

Both fail the independent queue criterion. The current falling-piece fields have no semantic falling-piece value in ordinary game over; this argument does not borrow a paused or playing piece-history certificate. No custom getter, replaced monitor, storage change, callback delivery or external actor is included.

## Exact source result

At source main `4b4e2c0bd3c64ef9b604cdfb007a4ea009569663`, the production tree remains `1e09ad61c19e0b235a231ad8810dae176be4ea77`.

`findInvariantViolation` checks the board dimensions, then evaluates `this.nextTetrominos.length !== UPCOMING_COUNT`. Both declared inputs have length three. No queue element is visited or classified. Score zero passes the subsequent score predicate. In game-over mode the remaining resource condition checks that both engine handles are null. Under the stated unchanged opening fields, the function returns null for either malformed queue.

An injected boundary check therefore misses invalid upcoming content. The governing rule calls for checking three real pieces, not merely successful downstream use of those pieces. No attempted `spawned` call or natural queue fault is needed for this specific detector comparison. A later next-piece operation could fail for another reason; that does not supply the earlier required check.

This is inspection of the finite source predicates, not an executed return value. No historical Q1 output or process receipt is claimed recovered here. The expected rejection comes from the adopted criterion, not the implementation's own validator.

## Ordinary writer relation

The inspected constructor and New Game fill the queue through three factory draws. The built-in factory generates fresh canonical pieces from its seven-kind inventory under its valid random-output and ordinary-object premises. Next-piece generation shifts the current queue head and appends another draw. An already malformed queue may fail during that consumption before its later checkpoint; this does not show an ordinary writer created it.

Continue first checks a list of length three and then visits each waiting entry through `parseWaitingPiece`, which selects built-in geometry by known kind/color. Null entries and holes do not become accepted queued pieces on that inspected successful reconstruction route. Whole accepted-save validity, complete history and failure prefixes remain separate.

These named writers supply conditional successful-path preservation evidence. They are not every-writer or alias-exposure proof, and do not replace runtime checking under the selected detector extent. No shipped ordinary path creating the two malformed inputs is established by this argument. Custom factories, external aliases and arbitrary object-shaped queues need separate comparisons.

## Proposed narrow disposition

Confirmed by conditional source argument, if independent review accepts these premises: the explicitly admitted dense-null and empty sparse length-three queue inputs pass the selected ordinary-over invariant boundary despite the requirement to check three valid upcoming pieces.

Not established here: ordinary malformed creation, all Q1 partitions, queue behavior in every mode, every writer/checkpoint/failure composition, native execution, complete R1 or SAF-4 certification. F21's separate board-reachability gate and the current-piece Q2 disposition are unchanged. A correction and its regression/collateral review require their own approval; this finding cannot authorize them.

## Source pins

- `public/game/gameManager.js:93-126,182-195,230-242,397-432`: SHA256 `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`.
- `public/game/tetrominoFactory.js:91-110`: SHA256 `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4`.
- `public/game/session.js:123-126,163-169`: SHA256 `54acbea460218f0e0a827619eae51e265461fe9ac6575dc8bf48727f6483049b`.
- Criteria: `docs/queue-piece-check-decision.md`; R1 B3/B7; blueprint section 4.8 Q1. Source identities do not authenticate historical execution.
