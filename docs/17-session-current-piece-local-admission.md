# Session corruption children: the exact current O piece

The session helper's current piece after Hold and MoveLeft is O, at box anchor `(0,3)`, not the opening T. This binds the missing kind/geometry premise for seven selected corruption children. Their fractional position, out-of-range rotations, outside-board position and overlap are independently invalid local values under the adopted semantics. Whole-save and raw-format admission stay separate.

Source argument for independent review. No game/test/model execution, new finding, property certificate, phase exit, new encoding rule, limit approval or production/test/model/CI change. IDs refer to the [session child register](6-session-child-oracle-register.md).

## Source and normal-completion conditions

Read main `1308722b050d8dcd7424c7ab3bcdcaff193ff5fd`. Source SHA256: `test/session.test.js` `5cb5e8bed805b3eb34fc340e7e2b5231e92991e74e421d36f4da668521175152`; `public/game/session.js` `54acbea460218f0e0a827619eae51e265461fe9ac6575dc8bf48727f6483049b`; `test/helpers.js` `81d2c452e9cc6d2f414a0b30a6f2f87604cc06aba66c277f25b044ab2510e55c`; `public/game/gameManager.js` `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`. Piece/position identities and O correspondence are in the [O admission argument](13-o-piece-exact-geometry-admission.md); board construction is in the [empty-board argument](12-empty-board-fixture-admission-argument.md).

`validSave` uses sequenceFactory with purple/yellow/green/red/orange, then newGame, Hold and MoveLeft. Assume ordinary source/data semantics and normal constructor, factory, scheduler, storage, guard, callback and JSON serialization/parsing completion; no outside mutation or delivered timer occurs during this synchronous helper. These are conditional premises, not full manager admission or newly approved trust.

## Exact source path, not a parser oracle

The constructor consumes four sequence entries. `newGame` then restarts the custom sequence index before dispatching New Game. The reset deals current purple(T), queue yellow(O)/green(S)/red(Z), and leaves the sequence's next draw orange(L). The board is newly empty. These facts follow the finite declared sequence and source call order, not a runtime trace.

Hold finds no held piece. It stores the outgoing T at spawn, takes O from the queue and spawns it at `(0,4)`, refilling the queue with L. O at rows0/1,columns4/5 fits the independently empty board and is airborne. Hold availability becomes false. MoveLeft is free and changes the O anchor to `(0,3)`, with state0 unchanged. No rotation or fall is requested. The current occupied cells are therefore `(0,3),(0,4),(1,3),(1,4)`.

The subsequent direct locked-cell writes at `(19,0)` and `(19,1)` do not overlap that O; direct score1300 does not move it. The ordinary serializer includes current color, rotation and position; ordinary JSON round-trip preserves these small finite values. That describes this source projection only. It does not prove lowest/reset, supported-format provenance, complete B16 goodness or all other saved-field relations.

The current O kind is bound by the canonical two-by-two built-in shape and distinct yellow token, not by `parseSession` accepting it. R1 B2 gives O exactly one valid rotation, state0, notwithstanding four identical picture/table depictions. B6 requires a whole-number anchor and four empty in-board occupied cells.

## Seven exact local comparisons

| Child | Independently interpreted selected value | Local result and boundary |
|---|---|---|
| SC-24 fractional column | O anchor `(0,2.5)` | Column is not a whole number, violating B2/B6 directly. It need not be passed to production fits to establish this. |
| SC-25 rotation4 | O with state4 | O's only valid state is0;4 is outside the adopted domain. |
| SC-26 rotation-1 | O with state-1 | Negative state is not0 and is outside the adopted domain. |
| SC-27 rotation1.5 | O with state1.5 | Fractional state is outside the adopted rotation domain. |
| SC-28 one past last | Helper selects canonical O whose production list has one shape, so the mutation writes1 | B2 independently gives only state0. State1 is invalid even though the picture/table repeats the same O shape; the production list length identifies the supplied test value, not the normative bound. |
| SC-29 outside board | O anchor `(0,-3)` | Occupied columns-3/-2 are outside0..9; all four occupied cells violate the in-board requirement. Empty shape padding is irrelevant. |
| SC-30 overlap | Current O at `(0,3)`; loop fills rows0..2,columns3..5 with blue-token blocks | The loop's row19 exception never applies because selected row0..2 is not19. All four O coordinates are filled, so B6 fails. Blue's canonical J token relation is attributed in the kind-geometry record; conditional occupied meaning alone suffices for this local overlap calculation. |

The complete selected domain is those seven mutations of this exact current-piece projection. No arbitrary rotation/coordinate/shape/raw token domain is exhausted.

## Raw text and complete-save boundary

Under the explicit direct object/numeric/token correspondence used for these local comparisons, each mutation denotes an invalid current piece. For SC-30, the inserted locked-cell kind relation is a separate premise; it is not derived from production color membership. Other baseline fields need not be proved valid to establish that an independently invalid current piece makes a purported B16 restored-paused state invalid.

That local semantic implication does not independently choose a supported JSON schema, required-field grammar, numeric-only encoding, alternate decoder policy or compatibility default. Those remain the [raw-format proposal's](8-session-raw-format-oracle-cuts-proposal.md) applicability cuts. No universal raw-null expectation is certified by `parseActivePiece` rejecting the data, by the literal test output, or by `validSave` being its helper name. No acceptance or last-good-save result follows.

The sequence factory is not ordinary seven-bag play; R5 separates edited snapshot acceptance from earned history. No complete snapshot, history or format denotation is invented here. New-write versus supported-legacy lowest/reset/default applicability remains open. Phase4 stays OPEN; no finding promotion, property certification, approved limit or parent-family closure follows.
