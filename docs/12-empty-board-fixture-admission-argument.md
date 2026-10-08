# Empty-board fixtures: exact construction and access argument

A completed `createBoard(20,10)` call builds all 200 empty cells with distinct objects. That discharges the missing density and pairwise-cell-independence argument for the newly created board in MP-03. The selected access answers in MP-04 follow from the same representation, under ordinary JavaScript property-lookup assumptions. Neither result establishes every game state, external board or later writer.

Candidate source argument for independent review. No game/test/model execution, new finding, property certification, phase exit, permanent-test change or additional trusted-boundary approval. MP-03/MP-04 refer to the [supporting test register](11-support-test-child-oracle-register.md).

## Claim and complete local domain

**EB-1 construction.** At successful return from the ordinary call `createBoard(20,10)`, the result denotes an ordered board of exactly20 rows, each exactly10 positions. Every position is empty. Distinct coordinate pairs refer to distinct mutable cell objects; distinct row indices refer to distinct row arrays. The local domain is the 200 coordinate pairs `(r,c)` with `0 <= r <20`, `0 <= c <10`, and every pair of distinct such coordinates. This is not an arbitrary-board or full-state claim.

**EB-2 access.** On that board, before outside mutation, `cellAt` returns the exact stored cell for each of those200 coordinate pairs. It returns undefined for each of MP-04's five exact outside coordinates `(-1,0)`, `(0,-1)`, `(20,0)`, `(0,10)`, `(25,25)`, under the property assumptions below. This closes the selected expected answers, not a claim over every numeric/object/proxy coordinate or malformed board.

No enumeration run is claimed. The argument covers EB-1's complete finite local domain by construction and EB-2's exact coordinate cases by source/property semantics. Its status is proposed argument support, not a 5.2 Proven certificate.

## Governing meaning, independent of implementation output

PCE-1 in `REQUIREMENTS.md` fixes ten columns/twenty rows and no contents outside. R1 B2 fixes row0..19 and column0..9 conventions; B3 requires dense, uniquely denoting ordered collections; B5 permits each board position to be empty or a locked kind. For an all-empty fixture, no locked-color/kind inference is needed.

The explicit local representation map is: own row/column array indices in those ranges denote semantic positions, and a cell whose own `isFilled` value is false and own `color` value is null denotes empty. It is a proposed correspondence argument for this created value, not a new representation rule for arbitrary external encodings. R1 adoption/status comes from AUDIT D18; the historical D16 file header does not override AUDIT D16's approval record. No whole R1 validity follows from a board-only map.

## Source identity

Read main `db1da2395800be2455bb73cf86a7e92e132bbbb4`. Only source/text was inspected.

| Source | SHA256 |
|---|---|
| `public/game/gameState.js` | `4d4d88f18f8d2335fac4104e746b972214991df8b1c6e72e0cc5d8d12cb30878` |
| `public/game/gameManager.js` | `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea` |
| `test/model.test.js` | `4f509cd814fc74ae0a210b4a7006d8caf7c06dda568068a4deae80fffe1b3281` |
| `REQUIREMENTS.md` | `fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc` |
| `docs/phase-1-r1-decision.md` | `aacf5189a6aa3b21660e8bfe1a5bf8ab2d62f8e853df3febaa54d81412707dec` |

The production source is `emptyCell` returning a new `{isFilled:false,color:null}` object, outer `Array.from({length:rows}, () => Array.from({length:columns}, emptyCell))`, and `cellAt(board,row,column)` returning `board[row]?.[column]`. Expected dimensions/emptiness come from the adopted relation, not a production validator or observed test output.

## Operational assumptions

- The built-in `Array.from`, array allocation and object-literal evaluation have ordinary JavaScript semantics; the two `{length:...}` input objects have no inherited iterator that overrides the array-like path.
- Allocation and callback evaluation complete normally. This argument describes successful return, not allocation failure or partially constructed caller state.
- Before the selected access/mutation comparison, no outside actor changes the array/cell properties or their prototypes. For EB-2's outside cases, relevant numeric properties are absent from row/board prototype chains, with no interception/getters supplying them.
- Ordinary literal numeric coordinate arguments are used. No proxy/string/object coercion, hostile prototype mutation or monkey-patched built-in behavior is included.

These are explicit conditional premises, not newly approved blanket platform trust. A scoped grep of tracked public source found no matching Array.from replacement, Object.prototype/setPrototypeOf or indexed Array.prototype mutation; that selected source search does not prove environmental noninterference. Adversarial/native contexts need their own applicability argument or approved limit.

## EB-1 argument: density, empty meaning and alias separation

1. With array-like length20 and the ordinary built-in, the outer call produces own entries0..19, no holes. Its callback runs once for each entry.
2. Each callback makes a separate inner `Array.from` call with array-like length10. Each result has own entries0..9, no holes and exact length10. Distinct outer callbacks receive distinct newly allocated inner arrays.
3. Each inner entry calls `emptyCell`. Its evaluated object literal allocates a distinct object with own false/null values. Thus there are200 cells, not one object copied200 times. There is no source operation that stores a prior cell reference in another position during this construction.
4. For any two distinct coordinate pairs, either their rows differ, in which case the cell-producing calls occur in distinct inner calls, or their rows agree and columns differ, in which case they occur in distinct mapping invocations of that inner call. In both cases the object evaluations differ, so cell identity differs.
5. Under the local map every entry denotes empty. The two dimensions and all dense entries satisfy the board-only B3/B5 fixture relation. This says nothing about the fixture's current piece, bag, score, controls, resources or legal history.
6. Mutating an own `isFilled` property of one cell cannot change another cell's own property through alias identity, because there is no shared cell object. This supplies all-pairs separation beyond MP-03's two selected examples. It does not prevent deliberate separate writes, row replacement or later alias introduction.

## EB-2 argument: exact selected access answers

For each in-range pair, both own array entries exist. Ordinary property lookup resolves the own row array, then its own cell object, and optional chaining does not short-circuit. The return is the stored object, not a reconstructed cell. MP-04's(0,0) and(19,9) identity answers are included.

For(-1,0),(20,0),(25,25), the relevant row property has no own entry and, by the stated prototype premise, no inherited entry. Lookup yields undefined; optional chaining returns undefined without reading the column. For(0,-1),(0,10), own row0 exists but those column properties have no own or inherited entry, so the column lookup yields undefined. These cases are exact arithmetic/property cases, not conclusions from a passed endpoint test.

## Caller admission and stopping boundary

GameManager constructor sets `rows=20`, `columns=10`, then assigns a completed createBoard result. MP-03 directly uses those same dimensions. `resetGameSession` also calls createBoard with manager dimensions; the local result applies only if dimensions remain20/10 and the call completes. The reset route still has other state writes, factory, resource and persistence obligations. A board returned by parsing is not this construction path and is not admitted by EB-1. New rows created during line clearing use a variable row count; this argument does not silently discharge that writer.

This can close the local missing MP-03 construction/density/all-pairs alias argument and MP-04's exact expected access relation after review. It does not close A-dimensions/A-cells or W01/W06/W16/W35 as whole domains, assert ordinary full-game fixture admission, settle malformed/prototype inputs, classify a candidate, or certify PCE-1. Full semantic-kind mapping for locked cells remains separate. Phase4 stays OPEN.

## Language-semantics sources

These current references support operational language facts, not new owner-adopted game semantics:

- [Array.from](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from): callback per element, array-like length handling and no sparse output.
- [Object initializer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer): object-literal properties and object creation.
- [Optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining): nullish short-circuit and bracket access.
- [Property accessors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors): bracket keys/property lookup inputs.
- [Inheritance and prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain): inherited lookup explains why the prototype premise is required.
