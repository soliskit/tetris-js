# Piece and bag assertions: canonical geometry, fixtures and production-oracle cuts

The piece tests contain literal geometry and selected rotation answers. The factory tests contain finite bag and object-identity answers. These are different from proving every admitted piece is canonical, every custom fixture has ordinary seven-bag history, or every parser and safety checkpoint independently validates those properties.

Candidate source reconciliation for independent review. No game or test execution, finding promotion, correction, permanent-test change, property certification or Phase 4 exit.

## Source and method

Fetched main `3fd5e4fb8eb5b8a186d049d61ae562a9802cb54f`, repository tree `4b7a443e84a51c46f6903b2f0ec212f568a58615`. Source was read without importing production modules or running the tests. All declaration bodies in the two selected files were inspected: tetromino has 18 standalone named tests and one seven-entry generated family, giving 25 selected names at 19 declaration sites; factory has eight named tests. These counts identify finite source selections, not runtime executions or whole-domain coverage.

| Source | SHA256 |
|---|---|
| `test/tetromino.test.js` | `248f10e8600c030d4aca2723742f202b47d05ce9ccb317d8e69b3a579d9a95f0` |
| `test/factory.test.js` | `d27ecaf0c8d5b6d5acefda08a434f545964d9faacd23b61b16819e85b9345489` |
| `test/helpers.js` | `81d2c452e9cc6d2f414a0b30a6f2f87604cc06aba66c277f25b044ab2510e55c` |
| `public/game/tetromino.js` | `d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe` |
| `public/game/tetrominoFactory.js` | `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4` |
| `public/game/position.js` | `e598b5ea4ff8f125bcb405b35ab6fb21d64e1fc6fc623a862b46ca839c2b6144` |

## Canonical geometry cut

R1 B2 adopts the fixed image `docs/sources/1-SRS-pieces.png` (SHA256 `5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236`) and extracted table `docs/sources/2-srs_table.txt` (SHA256 `c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c`). The image was visually inspected and the table read. Both show the same occupied-cell patterns for the selected states. R1 gives O one valid state despite the table's four identical O entries. The reference governs geometry only, not wall kicks or color hex values.

A static text extraction of `SRS_SHAPES`, with each X converted to its row/column pair, agrees with the adopted table for all 25 selected literal states. This local comparison executes only a text-analysis script, not the production constructor, rotation algorithm or test body. The committed `phase-4-geometry-literal-comparison.json` records the same finite relation; it is not an actual-output receipt for factory generation.

| Generated child / line 26 | Canonical relation and assertion limit |
|---|---|
| TG-I cyan piece has the standard rotation states [PCE-2] | Four 4x4 literal states agree with B2 I states 0..3. The test compares production rotations rendered through shapeStrings and separately counts four truthy blocks per rotation. Actual returned values are not newly observed here. |
| TG-O yellow piece has the standard rotation states [PCE-2] | One 2x2 literal state agrees with B2 O state 0; expected rotation-list length is one. No extra O states are silently admitted from the repeated table entries. |
| TG-T purple piece has the standard rotation states [PCE-2] | Four 3x3 literals agree with B2 T states 0..3. Same rendered-shape and four-truthy-block assertion boundary as TG-I. |
| TG-S green piece has the standard rotation states [PCE-2] | Four 3x3 literals agree with B2 S states 0..3; same assertion boundary. |
| TG-Z red piece has the standard rotation states [PCE-2] | Four 3x3 literals agree with B2 Z states 0..3; same assertion boundary. |
| TG-J blue piece has the standard rotation states [PCE-2] | Four 3x3 literals agree with B2 J states 0..3; same assertion boundary. |
| TG-L orange piece has the standard rotation states [PCE-2] | Four 3x3 literals agree with B2 L states 0..3; same assertion boundary. |

`pieceByColor` selects from production `allPieces` using production `PieceColors`. The independently matched literal table supplies an expected geometry, but does not make that selector independent. `shapeStrings` maps truthy cells to X and falsy cells to dots; the count uses filter(Boolean). Those checks distinguish the named occupied patterns but do not separately establish strict Boolean representation, dense arrays, immutable tables or rejection of malformed custom objects. B3 representation and object correspondence remain separate.

## Existing independent audit evidence

`phase-3-kind-geometry-source-evidence.md` attributes V40's independent comparison of extracted factory definitions against the frozen geometry table: seven exact token-kind matches, ordered states/box dimensions and a separate unordered-state comparison. It also attributes an image/table comparison. These are retained audit evidence with source continuity, not new execution or permanent-test oracle provenance. They must be joined rather than reported missing; the local text comparison here neither replaces nor strengthens their receipts.

`phase-3-current-restored-domain-relations.md`, section V55, records a separately selected standard SRS kick extract excluding the Arika variant, 48 literal kick-data rows and 550 actual ordinal visitor traces with zero recorded mismatches. It states requested-direction candidates before opposite-direction candidates, first-fit selection, unchanged when none fits and O unchanged. This supplies bounded independent audit support. Its fit answers are an ordinal stand-in, not independent real-board collision decisions. A per-row binding from that selected extract to the permanent tests' literal tables and obstacle candidates remains distinct; this register does not claim independent kick data is absent from the audit.

## Fixture admission cut

`createBoard(20,10)` is production setup, not an independent board validator. Its inspected implementation constructs dense rows of `{isFilled:false,color:null}`; tests then use direct board writes. `position` constructs ordinary row/column objects. Exact geometry answers can be calculated from B2 cell offsets without consulting production fits, cells or dropDistance.

`filled()` defaults to `{isFilled:true,color:'#fff'}`. Its filled flag supplies a selected obstacle for local collision calculations, but the token is not one of the seven `PieceColors` literals. It therefore needs an explicit local-obstacle representation relation before being treated as a B5 locked-kind state. Such obstacles and fully filled boards do not by themselves establish ordinary gameplay reachability. B15 does not reject a snapshot merely because it has a complete row; historical admission is still distinct from snapshot validity.

`fixedFactory` repeatedly calls allPieces-based pieceByColor for one kind; `sequenceFactory` repeats its supplied colors and resets an index. They can supply selected canonical shapes conditionally, but are not the ordinary seven-bag source. A repeated-kind fixture may be useful for a local injected-dependency assertion without becoming PCE-5 ordinary-history evidence. `seededRandom` is a finite deterministic arithmetic test control; V3 assumes valid random-source values and requires bag behavior, not unpredictability, fairness or cryptographic security.

## Standalone tetromino children

Literal endpoints are retained below. Production predicates appearing as setup or postconditions are named separately from independent expected values.

| Child / source line | Test and actual oracle boundary |
|---|---|
| TP-01, line 35 | every piece spawns in its first rotation, centered in the top rows [PCE-3]<br>Seven selected pieces are changed to last rotation/anchor(12,0), then spawned(10). Literal state0 and columns I3/O4/others3 are independent selected centering answers. The cells<=1 check uses production cells and has no independent lower-bound assertion. No arbitrary board width, source mutation isolation or whole New Game route. |
| TP-02, line 48 | copy is an independent piece that shares the rotation data [PCE-2]<br>T anchor(4,4); equality then replacement of copy.position with (9,9) and state2 leaves original anchor/state unchanged. Identity of rotations and kicks is deliberately shared. This does not test in-place mutation of the shared original position object, shared table writes or deep isolation; position's readonly annotation is not runtime enforcement. |
| TP-03, line 61 | cells are the board positions of the current rotation [PCE-2]<br>T at anchor(5,2): state0 expects (5,3),(6,2),(6,3),(6,4); state1 expects (5,3),(6,3),(6,4),(7,3). B2 supplies exact translation answers. No other state/kind, malformed shape or coordinate domain. |
| TP-04, line 69 | fits checks walls, floor, the space above the board and locked blocks [PCE-6] [PCE-1]<br>O true at (0,0)/(18,8), false at (0,-1)/(0,9)/(19,0)/(-1,0). Obstacle(10,5) makes (9,4) false and (8,4) true. B2 occupied cells and B6 bounds/nonoverlap supply local answers; white-obstacle semantic admission remains separate. No all-kind/representation enumeration. |
| TP-05, line 83 | fits uses the current position by default [PCE-6]<br>O anchor(18,0) initially fits; obstacle(19,1) makes it not fit. Tests optional-position selection for this shape, not every default-position alias or malformed board. |
| TP-06, line 92 | drop distance is how many rows the piece falls before it lands [PLY-5]<br>O anchor(0,4) expects 18 on empty board, 13 with obstacle(15,5); at anchor(13,4) expects 0 and unchanged position. B2/B14 give the selected distances. No ghost drawing, invalid-start behavior, zero-cell termination or all overhang geometries. |
| TP-07, line 104 | rotating in open space turns clockwise through all four states and back [PCE-4]<br>T anchor(8,4) yields state sequence1,2,3,0 and unchanged anchor. Selected no-kick first-candidate answer; no obstacles or every kind. |
| TP-08, line 115 | rotating counterclockwise in open space turns through all four states the other way [PCE-4]<br>Same T fixture, literal sequence3,2,1,0 and unchanged anchor. No blocked candidates or full direction-specific kick ordering. |
| TP-09, line 126 | the O piece never changes when rotated [PCE-4]<br>O anchor(8,4), clockwise then counterclockwise, final state0/anchor unchanged. Explicit PCE-4 O outcome, not malformed O data or all fields. |
| TP-10, line 136 | a J piece kicks left off the right wall [PCE-4]<br>J state3 anchor(10,8) has production cells including column9; expected state0/anchor(10,7), plus production fits. Literal endpoint is independent of fits; complete earlier-candidate blockage needs the chosen kick-table relation. |
| TP-11, line 148 | wall kick lets an I piece rotate against the right wall [PCE-4]<br>I state1 anchor(5,7) expects state2, production fits and all production cells.column<=9. No exact endpoint or assertion identifying the first valid kick; legal fit alone cannot certify ordered SRS selection. |
| TP-12, line 159 | when clockwise is blocked, rotation falls back to counterclockwise [PCE-4]<br>T anchor(10,4), obstacles(9,4),(12,4),(12,5), expects state3/anchor(10,5), plus production fits. Exact answer is outside rotate, but full first-direction exhaustion/second-direction order requires independent candidate enumeration and fixture relation. |
| TP-13, line 170 | turning counterclockwise, a J piece kicks right off the left wall [PCE-4]<br>J state1 anchor(10,-1) is admitted by production cells/fits; expects state0/anchor(10,0), then fits. Negative box-column is not itself B6-invalid when all occupied blocks are on-board. Selected exact endpoint, not every left-wall state/kick. |
| TP-14, line 182 | when counterclockwise is blocked, rotation falls back to clockwise [PCE-4]<br>T anchor(10,4), obstacles(9,6),(12,6),(12,5), expects state1/anchor(10,3), plus production fits. Same independent candidate-order/obstacle admission residual as TP-12. |
| TP-15, line 193 | a piece that cannot rotate anywhere stays exactly as it was [PCE-4]<br>I anchor(10,3); board filled except row11 columns3..6. Production fits admits start; both requested directions leave state0/anchor unchanged. These fields do not assert every object field unchanged; full candidate exhaustion and dense white-block fixture mapping are separate. No ordinary history is established. |
| TP-16, line 227 | wall kicks match the standard SRS tables for every piece [PCE-4]<br>Five JLSTZ arrays and one I array compare four literal five-offset rows after x/y to column/downward-row conversion; O compares one zero offset. Literal equality is outside factory, but B2's adopted image/table contains no kicks. The test's SRS labels alone do not authenticate its tables as the governing external kick oracle. No rotate delivery/order execution is asserted by array equality. |
| TP-17, line 235 | each piece has its fixed color [PCE-2]<br>PieceColors compares seven exact hex literals; selected spawn shapes compare SRS_SHAPES under I/O/T/S/Z/J/L labels. This binds this finite token-to-geometry relation conditionally on test outcomes, not a claim that the geometry reference adopts these hex colors or that display rendering/color space is correct. |
| TP-18, line 245 | the counterclockwise fallback uses the inverted kicks, including their rows [PCE-4]<br>J anchor(10,4), obstacles(12,5),(13,6),(9,4),(12,4), requested clockwise expects state3/anchor(9,5). Selected upward/right fallback answer; full earlier-candidate enumeration and kick authority remain separate. |

## Factory and bag children

B10 permits an empty or ordered distinct-kind remainder. B15 distinguishes this snapshot predicate from historical whole-bag dealing. PCE-5 requires ordinary New Game to start a full bag and ordinary dealing to emit all seven kinds once per bag. Factory-only calls and sets of colors do not prove the manager's reset, queue consumption, Hold or Continue histories.

| Child / source line | Test and actual oracle boundary |
|---|---|
| FB-01, line 9 | there are seven pieces, one per color [PCE-2]<br>allPieces length7 and sorted colors equals production PieceColors values. Length is a literal answer; the inventory side is production-derived. Without TG and TP-17 token/shape relations, seven color matches do not prove seven canonical kinds, nonempty cells or valid rotations. |
| FB-02, line 15 | 7-bag hands out every piece exactly once in each of many bags [PCE-5]<br>seed42, 50 aligned groups of seven (350 generate calls), each color Set.size7. This checks distinct color counts in those groups, not an independent exact seven-kind inventory per group, all random streams, arbitrary alignment or New Game first-seven behavior. Canonical inventory correspondence must be joined separately. |
| FB-03, line 22 | the same random source gives the same piece order [PCE-5]<br>Two seed7 streams compare 21 colors equal; seed7 versus seed8 compare 21 unequal. Relational repeatability/difference, not an independent expected order or normative need for two particular seeds to differ. No RNG-state persistence requirement follows. |
| FB-04, line 27 | the shuffle uses the injected random source [PCE-5]<br>constant0; expected order starts with production allPieces colors and repeats descending swap-with-zero steps. This mirrors the selected shuffle algorithm; it independently exercises the injected-source distinction only conditionally on the inventory. PCE-5 does not prescribe this exact Fisher-Yates order. The finite order can be independently derived as O,T,S,Z,J,L,I from the inspected initial I,O,T,S,Z,J,L order; that source-order choice is not external SRS authority. |
| FB-05, line 36 | every generated piece is a fresh object [PCE-5]<br>seed1,14 generated references have Set.size14; replacing first position with (9,9) leaves remaining row0. Exact reference-distinctness and selected replacement isolation, not deep independence of rotations/kicks or caller-supplied resetBag arrays. |
| FB-06, line 44 | the default factory uses Math.random [PCE-5]<br>random function identity equals Math.random; one generated seven-color Set.size7. Provider identity/selected uniqueness only; no randomness quality, range-validation theorem or independence from global later mutation. V3 excludes unpredictability/unbiasedness claims. |
| FB-07, line 50 | resetting the bag starts a full one, or carries on with the pieces given [PCE-5]<br>seed4, consume3/reset/next7 distinct colors; then reset with allPieces indices0,4, expect those two colors in order and a subsequent seven-color Set.size7. This is factory restart/selected ordered-remainder behavior, not whole Continue admission/history or ordinary New Game integration. Source resetBag aliases the supplied list; the test does not check ownership or later external mutation. |
| FB-08, line 61 | the shuffle can leave every piece where it is [PCE-5]<br>constant0.999, seven colors equal production allPieces order. For seven-item descending steps the selected indices are self-swaps. Source-derived ordering, not arbitrary valid random values, a probabilistic claim or complete boundary-range coverage. |

## Production-oracle and writer cuts

| Cut | Retained relation and unresolved extent |
|---|---|
| Built-in definitions versus test literals | Factory source starts with seven literal spawn shapes and generates clockwise matrices; TG tests compare generated results with separately written full-state literals. The static literal/table match establishes expected geometry, not observed production outputs. Source inspection supports the selected construction relation, but malformed shared kick/rotation data, aliases and all runtime representations remain separate. |
| cells/fits/dropDistance | Production cells, fits and dropDistance share the same occupied-cell and cellAt/isFree path. Testing one through another does not provide an independent canonical-validity oracle. B2 cell translation, B6 bounds/nonoverlap and B14 downward landing supply the independent criterion; exact fixture admission must accompany a comparison. |
| Rotation | Production rotate builds clockwise and inverted-counterclockwise attempts, reverses their priority on request, and accepts the first production fits success. Selected literal endpoints can challenge that path; postcondition fits and in-bounds cells cannot independently prove ordered first-fit correctness. V55 supplies the separate selected-extract/ordinal-visitor relation; permanent-test table binding and independent real-board rejection of every earlier candidate remain separate. |
| Bag refill and reset | Built-in generate refills only on empty, shuffles allPieces using valid received random values, then shifts one entry. resetBag assigns the supplied list directly. Ordinary successful construction can preserve distinct-kind remainders conditionally on canonical inventory and ordinary ownership; custom dependencies, external aliases, invalid inputs and partial failures are not discharged by the eight test rows. |
| Manager writers | Constructor/New Game/current-next/Hold consume production or injected factory outputs; New Game calls optional resetBag before fresh current and queue draws. Repeated-kind helpers do not certify this ordinary PCE-5 history. Every writer/failure prefix and exposed reference needs its own admitted-domain relation. |
| Session reconstruction | parseActivePiece chooses built-in geometry by known color, checks integer position/rotation range, then uses production fits. Waiting entries choose built-in geometry and spawn; parseBag checks list/uniqueness and reconstructs known colors. Those are source validator paths, not independent B6/B7/B10/B16 oracles. Missing-bag legacy handling, whole saved content and ordinary deal history remain separate from local list validation. |
| Required safety checkpoints | findInvariantViolation uses current.fits while playing and queue.length in every mode; it does not independently match canonical occupied cells or visit queue kinds. The existing zero-cell and queue detector dispositions retain their own bounded evidence and governing scope. These tests do not strengthen or promote those findings and do not replace required checkpoint validation with successful factory construction. |

## What remains

Join each child to its independent criterion, exact fixture/caller admission and existing execution receipt before closeout. Literal agreement, finite Set sizes and production-fit postconditions must not become whole canonical-piece or historical seven-bag certificates. Per-test binding to V55 selected kick data and independent real-board first-candidate comparisons, strict representation and alias ownership, all malformed current/waiting/bag partitions, ordinary writer/failure compositions and native display behavior remain open. No source execution receipt is newly supplied; Phase 4 and the parent piece/bag domains remain OPEN.
