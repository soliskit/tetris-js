# Injected zero-cell falling piece: checkpoint detector disposition

Candidate documentation. Finding exact-head review, required checks, authorized merge and postmerge publication verification remain separate gates. No new game run or correction is made.

## Requirement and exact domain

The current-piece checkpoint choice requires checking a valid four-block falling piece at required safety boundaries, rather than relying only on constructor validity and block overlap. The original Q2 target expressly admits an injected empty or malformed current representation, followed by boundary and transition checks, with ordinary writer creation reviewed separately. B6 supplies the independent valid-piece meaning. This is not Q1's queue check extent or F21's separate reachability gate.

## Source argument

At main, public tree 1e09ad61c19e0b235a231ad8810dae176be4ea77, the playing-state monitor calls the current piece's fits method but does not check four occupied blocks or canonical kind geometry. A generic Tetromino whose rotations are [[[]]], rotation is zero, position is (0,4), color is yellow and kicks are [[]] returns no occupied cells. Its actual fits method uses every over that empty cell list, which returns true without a replaced method.

With the selected dense empty 20x10 board, queue of three, safe score zero, live gravity and no lock handle, the selected monitor conditions report no violation. A guarded no-op accepts the zero-cell current piece. One guarded soft drop moves its anchor to (1,4), restarts gravity and again reports no violation. Zero cells cannot denote the independently required four-block falling piece. Overlap acceptance is not validity.

## Retained bounded evidence

The retained October 6 actual454 evidence used two injected playing-state fixtures: a built-in O control and the generic empty piece. Both received a guarded no-op and one soft drop. The real monitor returned null at both boundaries in both fixtures. The O control retained its four literal cells and moved its anchor from row zero to row one; the empty fixture remained empty and moved from row zero to row one. The completed process receipt records exit zero and a finite time bound. Frozen source, method and result identities were rechecked for this comparison; no rerun occurred.

The manual timer stand-in retained callback readiness but delivered no gravity callback. Its resource log records cancellation and replacement at 700 ms, not native scheduling. No storage fault, drawing, ghost, hard drop or drop-distance execution occurred. The empty fixture lacks independently valid lowest-row history. The concrete O anchor is not a full semantic-history certificate, and the positive control is not full R1 certification. Original method amendments and independent execution-review qualifications remain part of the evidence.

## Ordinary writer relation

The generic exported constructor accepts the representation. Shipped factory pieces are canonical and nonempty; ordinary New Game, next and Hold use those pieces, while Continue selects built-in geometry by known color and validates rotation and position. No shipped external JSON path was found that installs arbitrary empty rotation arrays. Those writer-preservation observations assume the canonical factory inventory and exclude custom dependencies and external aliases. They are conditional on the selected source and ordinary dependencies, not an encapsulation or every-writer theorem. The finding does not claim that ordinary gameplay creates this malformed piece.

## Narrow proposed disposition

Confirmed by conditional source argument under the adopted current-piece checkpoint extent: the explicitly admitted injected zero-cell piece passes the required current-piece checkpoint and one soft drop despite its independent four-block invalidity. The retained actual454 acceptance is bounded corroboration, not a new native run.

Unclosed: all other malformed partitions, canonical checker implementation, ordinary malformed creation, native behavior, full Q2/R1 property coverage, correction approval, permanent regression and Phase 4 closure. Public game, tests, reference models and CI are unchanged.


## Later partition: nonempty malformed shapes

An independently reviewed source comparison adds a partition to the same current-piece duty. It is additional source evidence, not a duplicate defect, not Reproduced and not a certificate for full Q2, R1 or SAF-4. The original zero-cell comparison, its earlier run receipt and its status are unchanged.

### Nonempty wrong-geometry pieces

Each row is a shape inside `rotations: [shape]`, with rotation state 0, yellow kind and color, `wallKickData: [[]]`, position (0,4) and unmodified generic Tetromino methods. The prestate is the declared playing state: dense empty 20 x 10 board, canonical three-piece queue, score 0, a gravity handle and a null lock handle, successful ordinary calls.

| Shape at rotation 0 | Why it is invalid | Occupied cells |
|---|---|---|
| `[[true]]` | One block, not four | (0,4) |
| `[[true,true,true,true,true]]` | Five blocks, not four | (0,4) to (0,8) |
| `[[true,true,true,true]]` | Four in a row is not the adopted 2 x 2 O geometry | (0,4) to (0,7) |

All occupied cells and their one-row-down cells are empty and on the board, so the fit check passes and the piece is not on a surface. By source argument the playing monitor accepts each shape under its remaining unchanged predicates, although none is a valid four-block O. The one- and five-block cases do not rely on emptiness. The four-in-a-row case shows that a four-cell count alone would still need a reviewed relation to the canonical kind geometry. This selects no checker.

### Boundaries kept

Paused-mode checking is a separate partition, not covered here. Injected lowest-row and history premises, full playing validity, ordinary writer reachability, fault-terminal contents, ordinary game over and every other malformed representation stay open. No action execution or timer firing is claimed. No code, test, requirement, model or CI change, and no fix is approved.

Evidence: reviewed source packet `Q2-nonempty-malformed-geometry-partitions.md` (SHA-256 `8f08c3d42d2444f813c72fe6f24d88294217d8e31099d764d336ac780079d872`). The packet is not in the repo. Reads were not one atomic snapshot and no run receipt is claimed.
