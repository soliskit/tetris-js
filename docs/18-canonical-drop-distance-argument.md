# Canonical falling pieces: bounded landing and ghost preservation

For an admitted canonical piece on a fixed board, the drop loop checks successive one-row falls and stops at the first blocked step. The floor supplies a finite bound. The returned distance is the lowest position reachable by that uninterrupted downward path, not the deepest unrelated free space below a blocking row. The ghost uses that distance without moving the original piece.

Source argument for independent review. No game/test/model execution, new finding, property certificate, phase exit, limit approval or production/test/model/CI change.

## Complete local domain and independent landing definition

Claim DD-1 ranges over every canonical kind, B2-valid rotation and whole-number box anchor admitted by B6 on a dense20x10 board. The four occupied coordinates are distinct, in-board and empty at entry. Every board cell has an independently admitted empty/locked-kind value; the own boolean `isFilled` denotes that value. The board and piece remain fixed during the call. The canonical shape-to-coordinate relation is a premise, not inferred from a successful production fit check.

Let `C` be those four initial occupied board coordinates, and `m` their greatest row. Entry admission gives `0 <= m <=19`. Define `F(d)` independently: after moving every member of `C` down by integer `d`, all four are empty and in-board. Define `t` as the first positive integer with `F(t)` false. The reachable landing distance is `t-1`: `F(0)` is true and each of the preceding one-row moves is valid. B14/PLY-4/PLY-5 govern this reachable landing meaning. A free pocket at some later distance after a blocked step is not reachable by that straight-down path.

DD-1: normal `dropDistance` return equals `t-1`, between0 and `19-m`, without changing the piece or board. Claim GH-1: on the same admitted current piece, `ghostTetromino` returns a distinct piece with the same kind/shape/state and column, at row plus DD-1 distance; original position and fields remain unchanged. This is a local object/geometry relation, not all authoritative state or rendering.

## Source identity and operational premises

Read main `4675caa66d4a2e8529195c7c2c7a33192d647105`. Source SHA256: `public/game/tetromino.js` `d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe`; `public/game/gameManager.js` `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`; `public/game/gameState.js` `4d4d88f18f8d2335fac4104e746b972214991df8b1c6e72e0cc5d8d12cb30878`; `public/game/position.js` `e598b5ea4ff8f125bcb405b35ab6fb21d64e1fc6fc623a862b46ca839c2b6144`; `test/tetromino.test.js` `248f10e8600c030d4aca2723742f202b47d05ce9ccb317d8e69b3a579d9a95f0`.

Normal built-ins, ordinary writable plain data, no proxy/getter/iterator interception, no outside mutation, and successful allocation/access are premises. Outside-row numeric properties are absent from board prototype chains, so row20 yields undefined rather than an inherited fake row. The [empty-board access argument](12-empty-board-fixture-admission-argument.md) explains why this property premise matters. Here arbitrary admitted board contents are stipulated independently; construction of the empty fixture is not a validator for them. These are conditional premises, not new blanket trust.

`Tetromino.cells` supplies exactly the independently admitted four coordinates by offset addition. `isFree` returns true exactly when `cellAt(...)?.isFilled === false`. Under the board/property premises that predicate agrees with the independent in-board empty relation at every queried coordinate. This correspondence is argued from the representation; a production boolean result is not its own oracle.

## Termination and exact return argument

At downward distance `20-m`, at least one occupied cell reaches row20. It is outside the board and not free under the stated lookup premise. Thus a first failure `t` exists with `1 <= t <=20-m`, independently of intervening locked cells. All arithmetic is over these small bounded row indices.

Initially `rows=0`. At a loop condition with value `d`, the code tests exactly `F(d+1)`. If true it increments to `d+1`; if false it returns `d`. Induction shows it visits the distances1,2,... in order, never skips a failure and performs at most `19-m` increments. It returns at first failure `t`, with value `t-1`. There are at most `20-m` condition evaluations. No enumeration run is claimed.

The method only reads piece/board properties and creates a local coordinate list/counter. No source statement assigns the original position, rotation, board or cells. Ordinary side-effect-free access therefore preserves those values and identities. This is not preservation against getters, external actors or mutable aliases used by another writer.

GH-1 follows from `copy()` constructing a distinct Tetromino, initially sharing the original position and rotation/kick data. The ghost setter then replaces only the ghost's position with a fresh `(old row + distance, old column)` object. It does not mutate the shared old position. No shape/kick array is written. The four ghost coordinates are the independent translated landing cells. Sharing those arrays is not a universal mutation-isolation guarantee.

## Exact selected joins and caller boundary

For canonical O at `(0,4)` on the empty board, `m=1`; first failure is distance19, so return18. With an occupied support at `(15,5)`, the first blocked step is14, so return13. Starting already at `(13,4)` on that support yields first failure1 and return0, with original position unchanged. These bind the three literals and preservation assertion in `test/tetromino.test.js:92-103`. Its white support token still lacks independent B5-kind admission; the support relation is conditional occupancy geometry, not a whole valid fixture.

GM-15's support at `(15,4)` gives the same exact O distance by a different occupied coordinate. Empty-O/G-07 and selected-I/GC landing answers retain their exact admission records. DD-1 does not supply their full manager state, history or runtime receipts.

HardDrop assigns the independently obtained ghost landing to the current position before lock. Under DD-1 premises, that landing fits and each intervening downward step was free, supplying a selected geometric lock-entry premise. Subsequent lock/clear/spawn/score/resources/save and guard/failure conversion remain separate. Intermediate assignments are not silently conceptual committed transitions.

Zero-cell or malformed shapes do not meet DD-1's four-cell premise. In particular, an empty cell list makes every predicate vacuously true and removes this floor witness. This argument does not bless such input, prove its termination, repair the implementation or discharge hostile shape/domain routes. Admitting the canonical input is a real obligation, not a reason to drop those attacks from Phase4.

## Stopping boundary

DD-1/GH-1 close the conditional canonical landing-loop bound/first-blocked-step and ghost-original-preservation premises after review. They do not establish every reachable caller, piece construction, hostile representation, full W14/W35 frame, browser ghost pixels or complete PLY-4/PLY-5 certification. No finding promotion, approved limit or Phase4 exit follows. Phase4 remains OPEN.
