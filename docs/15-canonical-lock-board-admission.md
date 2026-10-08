# Locking a canonical piece: exact board-writer admission

An admitted four-cell piece can be locked without changing any other board cell: the writer replaces its four empty positions with fresh locked cells of that piece's kind. This is a conditional board-only argument for `lockTetrominoInPlace`. It does not make the intermediate lock result a committed valid game state or prove the subsequent clear, spawn and save.

Source argument for independent review. No game/test/model execution, new finding, property certificate, phase exit, limit approval or production/test/model/CI change.

## Complete local claim and entry premises

Claim LK-1 ranges over each of the seven canonical kinds, each B2-valid rotation and every whole-number box anchor whose four distinct occupied positions are empty and in-board. The entry board is dense20x10, with distinct ordinary row arrays and distinct cell objects. Every cell independently denotes empty or a B5 locked kind. The current piece's ordered shape and box dimensions agree with the adopted B2 geometry; its concrete token is bound to that kind. Its position denotes the B2 integer anchor. No mutation occurs during the call.

After normal successful return, exactly those four coordinates denote locked blocks of the current kind. Every other board coordinate retains its original object and semantic value. Board dimensions/density and pairwise row/cell independence are preserved. This is not a full-state claim, and no legal-history/complete-frame relation is supplied by its entry premises.

R1 B2 fixes four occupied offsets and their translation; B5 fixes locked-kind meaning. PLY-4 requires a hard drop to land and lock; the operation record's lock row assigns the piece to locked blocks before clearing/spawning. These supply the independent board expectation. A comment that the piece always fits, or a successful production monitor, is not entry admission.

## Source identity and canonical token relation

Read main `bbc03451ba0bf207975bd6c8c790425c4c293110`:

| Source | SHA256 |
|---|---|
| `public/game/gameManager.js` | `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea` |
| `public/game/tetromino.js` | `d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe` |
| `public/game/tetrominoFactory.js` | `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4` |

The [kind-geometry source record](phase-3-kind-geometry-source-evidence.md) supplies the historical token/geometry correspondence and its explicit evidence identities. Current factory bytes match its recorded factory hash. That is source continuity and attributed prior support, not a claim that the private raw packet was newly recovered or a fresh runtime comparison was run.

For the local built-in relation, the token table is I `#00C0E8`, O `#FFCC00`, T `#AF52DE`, S `#34C759`, Z `#FF3B30`, J `#007AFF`, L `#FF9500`. The tokens are distinct. A token identifies the selected built-in kind through its independently bound canonical shape, not through apparent color or a new normative hex requirement. The present argument takes that canonical binding as an entry premise; it does not re-prove all factory rotations, external aliases, parser encodings or color case variants. The exact O correspondence is separately argued in the [O fixture record](13-o-piece-exact-geometry-admission.md).

Under that local map, a fresh own `{isFilled:true,color:token}` at a board coordinate denotes a locked block of the token's bound kind. This extends the empty/occupied representation at those newly written cells only. It does not admit any arbitrary truthy flag or unknown token such as the white `#fff` test fixture.

## Operational conditions and source argument

The call uses ordinary writable plain data properties, normal object allocation and iteration, no proxies/getters or monkey patches, no outside mutation, and normal completion of all writes. The admitted shape consists of dense Boolean rows with exactly four true cells in its declared box. These are conditional premises, not new trust approval. Allocation/assignment errors and partial prefixes remain outside LK-1 and inside the wider writer audit.

`Tetromino.cells` visits each admitted Boolean shape entry and appends the sum of the integer anchor and each true offset. Since the four offsets are distinct, translation is injective: equal translated coordinates would require equal offsets. Thus the resulting coordinate list contains exactly the four distinct occupied board positions, and the entry-fit premise puts each on an empty existing cell.

`lockTetrominoInPlace` loops over that list and assigns a newly evaluated object literal to `gameBoard[row][column]`, with own true and the unchanged current token. Each loop iteration allocates a distinct cell object. The four target indices are distinct, so no iteration overwrites another target. Row lengths and board length are unchanged because all indices are in their existing ranges. No row array is replaced.

No source statement writes any nontarget cell. Those cell objects and values are therefore preserved. Every newly allocated cell is distinct from each other new cell and all retained cells. Row identities remain distinct. LK-1's board-only density, value and alias relation follows over every entry satisfying its premises, not from sampled assertions or an execution count. The separate boardVersion increment is not semantic board content and is not a DSP-3 correctness proof.

## Exact joins and composition boundary

For the independently admitted O landing at row18,column4, the written coordinates are `(18,4),(18,5),(19,4),(19,5)`, each with the O token. This supplies the missing four-cell board relation behind G-07's two selected cell checks. At an independently admitted support landing row13,column4, they are `(13,4),(13,5),(14,4),(14,5)`, as selected by GM-16. That support test's white cell remains unadmitted; LK-1 does not repair its whole fixture.

LK-1 can be composed with a row-clear board argument only when the actual lock result meets that argument's premises, including a separately established full-row bound and admitted survivor kinds. A canonical four-cell lock alone does not prove at most four full rows if the entry board already had full rows: B15 permits full rows in snapshots. The clear helper's zero-through-four domain is not automatically met. No saved-content, score or complete lock-and-spawn consequence is inferred from this conditional composition.

D16 V1 permits unfinished transition microsteps to differ from committed validity. At this intermediate point the current falling piece still overlaps the newly locked cells, so B6 for a playing committed state would not hold. Neither the helper return nor its board argument establishes the conceptual commit point. Subsequent current replacement, queue/bag dealing, lowest/reset, Hold availability, controls/resources, ordinary game over, persistence and failure conversion retain separate proof obligations.

## Stopping boundary

LK-1 closes the local canonical four-cell write/untouched-board/alias premise after review. It does not admit every caller, factory history or support fixture, classify a defect, certify PCE-6 or whole W16/W34, establish full-frame behavior or close Phase4. Source hashing is not complete-domain property certification. Phase4 remains OPEN.
