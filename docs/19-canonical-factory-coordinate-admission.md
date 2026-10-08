# Every canonical factory state: independent coordinate admission

The seven factory definitions produce the adopted piece geometry in all25 valid orientations. A source rotation identity, checked against the separate image and table, establishes the occupied offsets without asking production `cells`, `fits` or `dropDistance` for the answer. This supplies the canonical-coordinate premise of the landing argument, not admission of every caller or saved representation.

Source argument for review. No game/test/model execution, new finding, property certificate, phase exit or production/test/model/CI change. Phase4 remains OPEN.

## Fixed sources and complete local domain

Read main `4675caa66d4a2e8529195c7c2c7a33192d647105`. `public/game/tetrominoFactory.js` SHA256 `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4`; `public/game/tetromino.js` `d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe`; `public/game/position.js` `e598b5ea4ff8f125bcb405b35ab6fb21d64e1fc6fc623a862b46ca839c2b6144`.

Expected geometry is B2's frozen [image](sources/1-SRS-pieces.png), SHA256 `5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236`, and [table](sources/2-srs_table.txt), SHA256 `c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c`. The image's seven rows and four columns were inspected: row order I/J/L/O/S/T/Z, spawn then clockwise states. All displayed occupied sets agree with the listed table offsets using B2's boxes. The O image's padded canvas is not its semantic box; its occupied2x2 square supplies the box. Its four displayed states are identical; B2/PCE4 independently permits only state0.

CF-1 ranges over a normal `allPieces()` result, any one of its seven pieces at a B2-valid rotation index, and any whole-number anchor whose translated occupied cells meet B6. Normal built-ins, dense plain arrays/objects, successful allocation, no intercepted access/iteration and no outside mutation are premises. No arbitrary caller-provided rotations or post-construction mutation are admitted. The construction argument precedes, and does not rely on, successful fit checks.

## Source rotation identity

Factory `piece` maps each spawn character to the boolean `ch === 'X'`. The seven source literals have the adopted spawn sets. For an N-by-N matrix, its next matrix entry `(r,c)` is the old entry `(N-1-c,r)`. Therefore an old occupied offset `(a,b)` appears at new offset `(b,N-1-a)`. This is a bijection of box coordinates, so it preserves exactly four distinct occupied cells and the square box size. Applying the identity successively gives the following independently calculated sets. A local arithmetic comparison of these literal sets with the frozen table agreed for all25 valid states; it did not import or execute factory/Tetromino code.

| Kind | State | Occupied box offsets |
| --- | --- | --- |
| I | 0 | (1,0), (1,1), (1,2), (1,3) |
| I | 1 | (0,2), (1,2), (2,2), (3,2) |
| I | 2 | (2,0), (2,1), (2,2), (2,3) |
| I | 3 | (0,1), (1,1), (2,1), (3,1) |
| O | 0 | (0,0), (0,1), (1,0), (1,1) |
| T | 0 | (0,1), (1,0), (1,1), (1,2) |
| T | 1 | (0,1), (1,1), (1,2), (2,1) |
| T | 2 | (1,0), (1,1), (1,2), (2,1) |
| T | 3 | (0,1), (1,0), (1,1), (2,1) |
| S | 0 | (0,1), (0,2), (1,0), (1,1) |
| S | 1 | (0,1), (1,1), (1,2), (2,2) |
| S | 2 | (1,1), (1,2), (2,0), (2,1) |
| S | 3 | (0,0), (1,0), (1,1), (2,1) |
| Z | 0 | (0,0), (0,1), (1,1), (1,2) |
| Z | 1 | (0,2), (1,1), (1,2), (2,1) |
| Z | 2 | (1,0), (1,1), (2,1), (2,2) |
| Z | 3 | (0,1), (1,0), (1,1), (2,0) |
| J | 0 | (0,0), (1,0), (1,1), (1,2) |
| J | 1 | (0,1), (0,2), (1,1), (2,1) |
| J | 2 | (1,0), (1,1), (1,2), (2,2) |
| J | 3 | (0,1), (1,1), (2,0), (2,1) |
| L | 0 | (0,2), (1,0), (1,1), (1,2) |
| L | 1 | (0,1), (1,1), (2,1), (2,2) |
| L | 2 | (1,0), (1,1), (1,2), (2,0) |
| L | 3 | (0,0), (0,1), (1,1), (2,1) |

The loop creates four rotations for the six non-O kinds and one for O, from wallKickData array lengths4/1. Only these lengths are used in this geometry argument; no wall-kick values or rotation-selection behavior are certified. Source tokens are distinct and bound by these spawn/state sets: I `#00C0E8`, O `#FFCC00`, T `#AF52DE`, S `#34C759`, Z `#FF3B30`, J `#007AFF`, L `#FF9500`. This is the inspected encoding correspondence, not a newly adopted strict saved-format token policy or color-alias rejection rule.

## Constructor, translation and selected joins

The Tetromino constructor stores the supplied rotations without transformation and defaults rotationState to0. Its shape getter chooses exactly the indexed matrix. For an ordinary dense boolean matrix, static cells visits each row/column once and emits one position exactly when that entry is true. The position constructor stores the two supplied coordinates. Hence its output is exactly `{(anchor row+r, anchor column+c) : (r,c) in the listed set}`, with four distinct positions. Under B6's independent in-board/empty premise this supplies CF-1, the canonical-coordinate relation assumed by [DD-1/GH-1](18-canonical-drop-distance-argument.md).

The board has10 columns. The source spawn formula on that width gives box column3 for I and every3x3 kind, and column4 for O, row0/state0. Their listed occupied cells fit an independently empty20x10 board. This is a local empty-board spawn relation, not acceptance on a board whose spawn cells are occupied. Copy and spawn preserve these rotations by reference; later writes through aliases remain outside this preservation premise.

Selected T test TP-03 at anchor `(5,2)` therefore has state0 cells `(5,3),(6,2),(6,3),(6,4)` and state1 cells `(5,3),(6,3),(6,4),(7,3)`. This agrees with the independent selected answer in the child register, without using a factory call as its oracle. Prior O and I records retain their exact board/caller gaps.

## Stopping boundary

CF-1 closes conditional all-kind/all-valid-orientation source construction and translation, not arbitrary malformed piece inputs, all rotation/kick routes, bag shuffle/history, imported raw schema, full manager frames, rendering pixels or complete PCE2/PCE6/PLY4/PLY5 certification. A color-to-kind source match does not decide alternate persisted encodings. No previous private runtime packet was recovered or promoted. Full child-domain, caller and Phase4 obligations remain separate.
