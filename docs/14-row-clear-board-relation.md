# Row clearing: dense boards and survivor order

Removing full rows from bottom to top, then adding the same number of empty rows at the top, preserves a dense 20-by-10 board. Each surviving row keeps its contents and order. This argument covers the board result of `clearFullRows` for zero through four full rows. It does not admit the permanent tests' white blocks, prove their setup path or certify a complete lock/save transition.

Source argument for independent review. No game/test/model execution, new finding, property certificate, Phase4 exit, limit approval or production/test/model/CI change.

## Claim and complete local domain

Let the entry board be an ordinary dense array of20 distinct row arrays, each with10 own cell entries. Every cell independently denotes either empty or a B5 locked kind; distinct board coordinates have distinct cell objects. Each own `isFilled` is a boolean and corresponds exactly to that empty/locked classification. `columns` is10. The complete local domain consists of all such boards having `k` full rows, where `0 <= k <=4`, including every placement of those rows and every admitted survivor content. A full row has all10 positions locked.

Claim RC-1: after a normal successful call, the board remains dense20x10 with distinct rows/cells. If `k=0`, its contents and identities are unchanged and the return is false. If `k>0`, the first `k` rows are fresh empty rows; the remaining rows are the original nonfull rows in their original order, retaining cell values and identities; the return is true. For an original surviving row at index `r`, its new index is `r + b(r)`, where `b(r)` counts removed rows strictly below it.

SCO-1 requires full rows to disappear and rows above to move down. PCE-1 fixes dimensions; R1 B3/B5 require dense uniquely denoting board contents. The survivor formula and these governing rules supply the expected result independently of production output. R1 B15 does not prohibit full rows in a valid snapshot, so this local board domain does not need an earned-play history. It also does not establish the other fields of a valid snapshot.

## Source and operational premises

Read main. Source identities: `public/game/gameManager.js` SHA256 `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`; `public/game/gameState.js` `4d4d88f18f8d2335fac4104e746b972214991df8b1c6e72e0cc5d8d12cb30878`; `test/gameManager.test.js` `5d70141e99f4cb0fa43b1d4bc95b37304c2168522826ca27c027836cb3963251`. Normative relations retain the source identities in the [empty-board argument](12-empty-board-fixture-admission-argument.md).

The source visits each row, pushes indices whose every-cell predicate is true, returns early when none qualify, reverses the collected indices, removes each by `splice(index,1)`, creates `k` rows with `createBoard(k,10)`, and prepends them by `unshift(...newLines)`. It then updates boardVersion, score and highScore. RC-1 concerns only the board and boolean return, not correctness of those other updates.

Premises: ordinary array/property operations, normal built-ins, dense writable ordinary data arrays, no proxy/getter/species interception, no inherited iterator overriding array-like construction, no outside concurrent mutation, and all allocations/writes complete normally. These premises exclude exceptions and intermediate failure prefixes, which remain separate writer obligations. They are conditional assumptions, not newly approved trust or a practical-limit grant.

The entry-board kind interpretation is a required independent premise. This argument does not define a new color-to-kind rule, accept `#fff`, or infer admission from the production monitor's acceptance.

## Argument over the complete local domain

1. Density gives exactly20 visited rows and10 visited cells per row. With the stipulated boolean classification, `every` is true exactly for a full row. Thus collected indices are exactly the distinct full-row indices, in ascending order. The usual sparse-array omission cannot arise under this premise.
2. For `k=0`, the function returns before any board write. RC-1's zero-clear relation follows immediately; this is not a general all-state/frame claim.
3. For `k>0`, reversal makes indices strictly descending. Removing an index larger than another cannot change that smaller index. Induction over these removals shows each targeted original full row, and no survivor, is removed.
4. Splice preserves the order and references of entries outside each deleted range. After all removals, the array is dense of length `20-k`, consisting exactly of the original nonfull row references in order. It does not rewrite the surviving row arrays or cells.
5. The nested Array.from construction argument extends directly from20 outer callbacks to the finite count `k`: `createBoard(k,10)` creates `k` distinct dense rows and `10k` fresh empty cells. None is a survivor object. Prepending these rows produces dense length20, each row length10, with empty meaning and all pairwise row/cell separation preserved.
6. An original survivor `r` first shifts up by the number `a(r)` of removed rows above it, then down by `k` when new rows are prepended. Since `r` is not removed, `k=a(r)+b(r)`. Its final index is therefore `r-a(r)+k = r+b(r)`. Its contents, order and cell identities are unchanged.

This is an argument for every board in RC-1's conditional domain, not an executed enumeration or a blueprint5.2 Proven certificate. Aliased/sparse boards, malformed cell types, arbitrary widths, five-or-more full rows and failing built-ins are outside the claim, not silently approved exclusions from the whole audit.

## Exact permanent-test joins

For GC-01..04, independently suppose a vertical I occupies rows16..19 in column9 and the chosen bottom `k` rows each already have their other nine positions locked. No other cells are filled. Exactly those `k` rows become full. RC-1 removes them; `4-k` I cells remain, independently giving3/2/1/0 for `k=1/2/3/4`. SCO-1 independently supplies100/300/500/800, but RC-1 does not prove the production score update or the helper's rotation/move/drop setup.

GM-17's single removed row19 moves each survivor above it down1. Thus original `(10,0)` moves to `(11,0)`, and `(12,3)` moves to `(13,3)` with its color unchanged. The vacated test coordinates receive the originally empty rows9 and11, respectively; the new top row is empty. This uses the selected fixture's other cells being empty, not a universal claim that every old coordinate is emptied by a clear.

GM-18's assumed I cells at16..19 column9 complete rows17/19. Original row18, with its gap at0 and occupied columns1..9, moves to19 because one removed row is below it. Original row16's I cell moves to18 because two removed rows are below it. Nine cells survive in the former row and one in the latter, total10. Nonadjacency therefore causes no special survivor-order exception.

The actual `fillRows` helper supplies white `#fff` cells. Their locked-kind meaning is not independently admitted. The I geometry/helper path, fixed-factory history, complete manager state, score arithmetic, next-piece/reset/resource/persistence effects and runtime receipts stay open. These are conditional expected relations, not ordinary valid-play witnesses or passing executions.

## Stopping boundary and language evidence

RC-1 fills the variable-row construction and exact survivor-order premise left open by the empty-board argument, including the selected generated-clear and nonadjacent-row expectations. It does not close W16, SCO-1 or complete A-dimensions/A-cells, establish every writer/failure prefix, promote a finding or certify a property. Phase4 remains OPEN.

Language references fetched for the operational facts: [splice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice), [unshift](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift), and [reverse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse). Array.from and object-creation sources are linked in the empty-board argument. These support language semantics only, not game-policy adoption.
