# Selected I clears: exact helper path and row bound

The selected clear helper rotates an I piece, moves its occupied column to9 and drops it into the bottom-row gaps. Under the stated occupancy premises, it writes rows16..19 in column9 and completes exactly the prefilled rows. This supplies the missing geometric setup and full-row bound for GC-01..04 and G-08. Their white blocks and complete game state remain unadmitted.

Source argument for independent review. No game/test/model execution, finding promotion, property certificate, phase exit, new limit or production/test/model/CI change.

## Local domain and independent answers

Select `k` from1,2,3,4. Start with a dense20x10 empty board, then fill columns0..8 in rows `20-k` through19. The current piece is canonical I state0 at box anchor `(0,3)`. These are occupancy and piece premises, not a declaration that every manager field/history is valid. The helper calls clockwise Rotate, four MoveRight actions and HardDrop, with no scheduled firing or outside mutation between them.

R1 B2's independent I states are: state0 offsets `(1,0),(1,1),(1,2),(1,3)` and state1 offsets `(0,2),(1,2),(2,2),(3,2)`. B2 translation, PCE-6, PLY-1 and B14 determine fit and landing. SCO-1 supplies the exact score literals100/300/500/800, separately from implementation arithmetic. Expected geometry is not defined by production `fits` or `dropDistance`.

Claim IC-1: under normal source-route completion and the premises below, the selected path produces an I state1 at box column7, occupying column9. Its landing anchor is row16. Locking adds cells `(16,9),(17,9),(18,9),(19,9)`. Exactly the selected bottom `k` rows become full. After their removal, `4-k` I cells remain at column9 in rows `16+k` through19 (an empty interval for `k=4`). These are exact finite selected path answers, not an all-kick, arbitrary-board or full-state property.

## Source identity and route premises

Read main. Source SHA256: `public/game/gameManager.js` `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`; `public/game/tetromino.js` `d99c1bd6cb4a9e255b9ef2840264281e46a9665dcb30f66c6b45e654d1654bfe`; `public/game/tetrominoFactory.js` `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4`; `test/helpers.js` `81d2c452e9cc6d2f414a0b30a6f2f87604cc06aba66c277f25b044ab2510e55c`; `test/gameManager.test.js` `5d70141e99f4cb0fa43b1d4bc95b37304c2168522826ca27c027836cb3963251`; `test/game.test.js` `6d38429548b6e9b6196476e923be03443b0b05ead72691137a499cf52c3271b6`.

`dropVerticalIIntoColumn9` calls Rotate, four MoveRight, then Drop. `fillRows` targets the selected rows and all columns except9. G-08 writes the same four-row occupancy directly and uses the same rotate/four-right/drop sequence. The fixed cyan factory selects the built-in I; it is not an ordinary seven-bag history. The historical kind-geometry correspondence and its source continuity are recorded in [phase-3-kind-geometry-source-evidence.md](phase-3-kind-geometry-source-evidence.md), not freshly rerun here.

Route premises: playing mode; canonical current I and admitted position; dense ordinary board with the exact declared occupancy; no pending confirmation effect relevant to these board coordinates; ordinary built-ins/data access; normal guard/callback/resource completion; no outside mutation; no gravity/lock/repeat firing during the selected synchronous calls. The source helper makes no scheduler.advance call. That supports the manual-scheduler selection, not a native zero-interleaving claim. Neither a returned action nor absent recorded faults establishes complete R1 validity.

The source rotation algorithm tries state1 with its state0 kick list first. That list begins with `(0,0)`; the first fitting candidate is accepted. This identifies the implementation path, not an independent proof of all SRS kick policy. The retained V55 selected ordinal visitor support has its own declared limits. Here the zero-shift target fits independently, so no later kick candidate is needed for the geometric answer.

## Independent setup and bound argument

1. Before rotation the I occupies row1,columns3..6. The earliest prefilled row is16, so those cells are empty and in-board. At unchanged anchor `(0,3)`, state1 occupies rows0..3,column5, all empty. The first zero-kick candidate therefore fits. Successful ordinary traversal chooses it without any wall shift or fallback.
2. After each of the four right shifts, the occupied column is6,7,8,9 respectively, still at rows0..3. Every cell is in-board and empty. PLY-1 therefore permits each shift; box anchors are columns4,5,6,7. The box itself may extend beyond the board at the final anchor, but B6 constrains occupied cells, not empty padding.
3. Straight-down movement at column9 cannot hit the prefilled rows, because their column9 is empty. For every integer anchor row0..16, the occupied rows are `r..r+3` and stay in-board. Anchor17 would occupy row20 and is invalid. The independent landing is therefore16, not a value inferred from `ghostTetromino`.
4. A correct lock adds exactly four cells at rows16..19,column9. Each chosen prefilled row now has all10 cells occupied. Each other row either remains empty or has only the I cell at column9, so no additional row is full. This proves the local full-row count is exactly `k`, supplying the bound needed for the zero-through-four row-clear argument.
5. Before removal, the I-only rows are16 through `19-k`. Each is above all `k` removed bottom rows, so its final row is original row plus `k`. Thus survivors occupy rows `16+k` through19, at column9. Their count is `4-k`, giving3/2/1/0. For G-08/GC-04, no locked cell remains after the four rows are removed.

The full-row bound follows from this exact occupancy arrangement. It does not follow for arbitrary B15 snapshots, which may already contain other full rows. The canonical-piece lock argument and row-clear argument compose only within their respective entry premises and normal-completion scope.

## White fixtures versus kind-valued witnesses

The actual selected tests use `filled()` or direct `{isFilled:true,color:'#fff'}`. Their collision occupancy is explicit, but no independent B5 locked-kind map for white is established. Therefore IC-1 supplies a conditional occupancy/path answer for those tests, not ordinary committed-state or saved-content admission.

A separately constructed fixture could assign each prefilled cell an independently bound canonical kind token while keeping this occupancy pattern. B15 would permit those full-row arrangements as snapshots without requiring earned history. That describes a different prospective witness, not an executed substitute, amendment to permanent tests or retroactive authentication of these fixtures. Its full manager state, source identity and receipts would still have to be supplied.

SCO-1's literals are independent expected arithmetic, but this record does not prove production score/high-score serialization, next-piece/queue/bag, lowest/reset, Hold/control/resource frame, completed-turn save or ordinary/fault-stop behavior. The present helper's source path and occupancy argument cannot erase those other dependencies.

## Stopping boundary

IC-1 fills the selected I helper geometry and exact full-row/residual-coordinate premise. It joins GC-01..04/G-08 to the local lock and row-clear relations conditionally, without admitting white-kind/full-state/history. No all-state, all-kick or complete writer-domain discharge, new finding classification, property certificate, approved limit or Phase4 exit is asserted. Phase4 remains OPEN.
