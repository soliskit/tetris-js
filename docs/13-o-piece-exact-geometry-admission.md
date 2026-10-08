# O-piece fixtures: exact geometry and selected movement answers

The O piece occupies a two-by-two square. On an empty 20-by-10 board its box can move from column0 through column8 and lands at row18. A support block at row15 in column4 stops an O piece in column4 at row13. These answers follow from the adopted geometry, not production `fits`, `isOnSurface` or `dropDistance` results. The support tests use a white block whose semantic kind is not established, so their whole-state admission remains open.

Source argument for independent review. No game/test/model execution, new finding, property certificate, phase exit, limit approval or production/test/model/CI change. Child IDs refer to the [engine assertion register](10-engine-game-child-oracle-register.md). This closes selected geometry/representation premises only, not each child's full transition or history claim.

## Exact local domain and governing relation

R1 B2 uses a box anchor and adds the shape's offsets to it. Its adopted O geometry is `(0,0),(0,1),(1,0),(1,1)`, in a two-by-two box, with one valid rotation state. Both retained reference files were inspected: the table states those offsets; the image's yellow row shows the same four occupied cells in every depicted orientation. The O portion agrees. No other kind's image/table comparison is claimed here.

PCE-1 gives board dimensions; PCE-6/B6 require all occupied cells on empty in-board positions. PLY-1 permits a one-column shift when free. B14 defines landing by valid downward movement, and PLY-4/PLY-5 use that landing. These rules determine the answers below independently of observed implementation output.

The complete local geometric domain is integer O box anchors `(r,c)` on the dense, empty 20-by-10 board, and the three exact support/lock arrangements below. No rotation/kick domain, arbitrary board grammar, manager history or full R1 state is included. Successful construction and ordinary noninterference assumptions from the [empty-board argument](12-empty-board-fixture-admission-argument.md) apply to the board and plain data properties. They are conditional premises, not additional platform trust.

## Source identity and representation admission

Read main; inspected source only.

| Source | SHA256 |
|---|---|
| `public/game/tetromino.js` | `d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe` |
| `public/game/tetrominoFactory.js` | `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4` |
| `public/game/position.js` | `e598b5ea4ff8f125bcb405b35ab6fb21d64e1fc6fc623a862b46ca839c2b6144` |
| `test/helpers.js` | `81d2c452e9cc6d2f414a0b30a6f2f87604cc06aba66c277f25b044ab2510e55c` |
| `test/game.test.js` | `6d38429548b6e9b6196476e923be03443b0b05ead72691137a499cf52c3271b6` |
| `test/gameManager.test.js` | `5d70141e99f4cb0fa43b1d4bc95b37304c2168522826ca27c027836cb3963251` |
| `docs/sources/1-SRS-pieces.png` | `5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236` |
| `docs/sources/2-srs_table.txt` | `c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c` |

The local correspondence maps the built-in `piece(['XX','XX'], PieceColors.yellow, oWallKicks)` entry to O by its exact adopted occupied shape, not by the word yellow alone. `piece` turns each X into true; the one-element O wall-kick list means only that one shape is constructed. Its color is `#FFCC00`, distinct from the other six declared built-in color values. Thus the selected `pieceByColor(PieceColors.yellow)` finds this built-in entry. This is a source-selection argument, not color perception or universal external-color decoding.

`position(r,c)` returns own row/column values in a fresh plain object. For the selected integer arguments, these denote the B2 box anchor. `spawned(10)` copies the O, sets rotation0 and sets its anchor to `(0, trunc((10-2)/2)) = (0,4)`. That agrees with horizontal centering and placement in the top two rows. The fresh position object replaces the earlier shared reference; this does not prove arbitrary copy alias safety or freeze mutable properties.

`Tetromino.cells` adds exactly those four true offsets to the anchor. Therefore the selected production representation denotes the adopted O geometry, under normal access and no outside mutation. No production fit/landing answer was used to define that geometry.

## Independent finite-domain argument

For an O anchor `(r,c)`, occupied rows are `r,r+1` and columns `c,c+1`. All four cells are in the empty board exactly when `0 <= r <=18` and `0 <= c <=8`, for integer anchors. This covers the whole stated integer-anchor domain by inequalities, not a run or sampled endpoints.

At column4 with no support, every successive row0 through18 is valid; row19 would occupy row20 and is invalid. Hence the lowest reachable straight-down anchor is18, with occupied cells `(18,4),(18,5),(19,4),(19,5)`.

With only a support at `(15,4)`, anchors0 through13 remain disjoint from it. Anchor14 would occupy `(15,4)` and is invalid. Hence landing is13. With only a block at `(1,6)` and current O anchor `(0,4)`, a right shift to column5 would occupy that block; it must be refused. A left shift to column3 occupies rows0/1 and columns3/4, all free, so it is permitted.

## Child joins and exact remaining admission

| Child | Selected expected relation discharged | Still not established |
|---|---|---|
| GM-11 | Starting O at `(0,4)`, ten successful-or-blocked left requests must end at column0; ten right requests then end at8. The finite free interval and PLY-1 determine this. | Full manager validity, resources, reset/lowest history, all movement frame and runtime receipt. No timer advances are called in this source path, but that is not a native noninterference proof. |
| GM-12 | Exact occupancy-only block at `(1,6)` refuses right from4 and permits left to3. | `filled()` creates `#fff`, not any declared built-in kind color. No adopted map from this value to a B5 locked kind is shown. The answer is conditional occupancy geometry, not a B6-valid whole-state witness. |
| GM-15 | Empty-board ghost anchor18; support at `(15,4)` gives anchor `(13,4)`. | White support-kind admission, current preservation, distinct ghost identity, full ghost/frame relation and runtime receipt. |
| GM-16 | On that support, immediate O lock occupies all four cells at rows13/14 and columns4/5, with the admitted O's color. None of those rows is full, so local line-clear score increment is0. | White support-kind admission, starting score/full state, next T spawn/queue/lowest/reset/resource/save transition, sequence-factory history and runtime receipt. |
| G-07 | Empty-board O landing18 entails its two asserted occupied cells `(19,4)` and `(18,5)` after a correct lock. | Remaining locked cells/color, next spawn, full frame, fixed-factory history, runtime receipt and ordinary complete-state admission. |

The fixed O factory repeats O, and the O/T sequence factory repeats that sequence. They select geometry for these children but are not ordinary PCE-5 seven-bag histories. Snapshot geometry validity cannot supply legal history or excuse other authoritative state. None of the rows is declared a fully admitted manager fixture.

## Stopping boundary

The local O kind/position map and exact expected wall/landing/support geometry are now explicit arguments available for review. White support fixtures remain unadmitted as semantic locked-kind values; no new mapping or requirement is invented to make them valid. Independent construction of a valid-kind replacement would be a different fixture and would need its own source/execution identity.

This does not certify PCE-1/PCE-3/PCE-6, PLY-1/PLY-4/PLY-5, close W10/W14/W16/W35 or settle A-pieces/A-positions/A-cells as complete domains. It does not promote any candidate or supply an approved limitation. Full child admission, actual receipts, complete-domain discharge and every-candidate disposition remain separate. Phase4 stays OPEN.
