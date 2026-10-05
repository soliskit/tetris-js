# Phase 1 candidate: R1, exact valid-state semantics (owner selections applied)

Status: **CANDIDATE normative text, for fidelity review. Not approved, not adopted, not recorded in `AUDIT.md`, not for merge.** Part B applies the owner's selections of October 4, 2026 to the R1 proposal at PR #52 (`docs/phase-1-r1-proposal-rev1.md`, which is unchanged). The owner's drafting permission is not approval of this exact text, and no decision is recorded by it.

Base: main. Approved D16 (`docs/phase-1-state-decision.md`, SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182), `AUDIT.md`, `REQUIREMENTS.md`, the blueprint, the code and the tests are not modified. Part B assumes the D16 amendment candidate (`docs/phase-1-d16-amendment-candidate.md`), which adds the lowest row reached as authoritative item 15, if that amendment is later approved.

Independence (blueprint O8): the assistant that drafted this has read the production code. No rule below is taken from production code or tests; each cites a requirement or an owner selection. It is still not independent of the implementation.

## Part A. Review material

### A1. Owner selections and where each is applied

| Selection (initial package) | Applied in |
| --- | --- |
| Lowest row: historical low, greatest occupied block row | B6, B9 |
| Pause boundary: P4, count 0 to 16, 16 marks a pause taken after the 15 allowances were used | B9 |
| C2 and C9 as drafted in the P4 proposal | B9 |
| Legacy L1 (missing lowest row) and L2 (legacy paused, resting, count 15, no C5/C7 distinction), as compatibility defaults and not recovered history | B16 |
| H1, one hold per lock cycle | B8 |
| Game over: semantic absence for the current piece kind, row and column coordinates, orientation, lowest row and reset count; no duty to clear implementation residue for these items | B6, B9 |
| Empty bag valid | B10 |
| SRS: the frozen TetrisWiki image and extracted table, by full SHA-256, as the owner-adopted external geometry reference | B2 |
| Score: whole number 0 or more, no divisibility predicate | B11, B16 |
| Board cells identify piece kind | B5 |
| Reject the full-row and hold-used-implies-held predicates as R1 snapshot invariants; legal-play and history obligations stay separate | B15 |

### A2. Items the selections do not settle (not drafted as rules)

The owner's final selection of game-over absence names the current piece kind, row and column coordinates, orientation, lowest row and reset count. It does not name the held piece, hold-used, the bag, the touch-drag state, or any other item. An earlier pasted package proposed wider absence ("other game-over items"). That package is advice and is not carried into Part B. Part B therefore marks three places "OWNER SELECTION OUTSTANDING" and drafts no rule there:

- G1. Held piece and hold-used while the game is over (B8). Options: absent (held none, hold-used false) / retained within the same domain.
- G2. Bag while the game is over (B10). Options: absent / retained within the same domain.
- G3. Touch-drag state while the game is over (B12). Options: none / retained within the same domain (a retained drag cannot control a falling piece, since none exists).

Each item is stated separately so the owner can choose individually. Until they are chosen, Part B is not bracket-free and cannot be approved as complete.

Other points the drafter flags, which are not choices the owner made:

- G4. Retention of the geometry bytes. B2 identifies the reference by SHA-256. Whether the PNG and the extracted table are committed to the repository (for example under `docs/sources/`) or kept elsewhere is not selected. This text claims no repository path for them.
- Position convention. The geometry reference reads each state in a box, and B2 takes the piece position to be the box's top-left cell. That follows from the adopted reference and is not a separate owner choice. A position may be negative where the box extends off the board while all four blocks are on the board.
- B9 states the meaning of the lowest row and the count, not only their domains. This matches the proposal at PR #52 (which stated reset rules in B9). Whether the meaning rules stay in R1 or move to the later legal-operation text is a structure question for review. The values and where 16 is valid are validity predicates and stay in R1.
- The pause analysis P4 and its phrase-by-phrase comparison with PLY-6 and STA-2 are in PR #53 (`docs/phase-1-d16-lowest-row-amendment-proposal.md`, A3b). P4 departs from the literal STA-2 words "resuming starts it again" only at count 16. That is an owner interpretation and is not forced by the requirements.

### A3. Changes from Part B of PR #52

B2 (geometry reference), B5 (board cell), B6 (game over current piece), B8 (H1; G1), B9 (rewritten), B10 (empty bag; G2), B11 (score), B12 (G3), B13 (last sentence), B15, B16 (L1, L2, high score, newly written saves). B1, B3, B4, B7, B14 and B17 are unchanged.

## Part B. Candidate decision text (DRAFT, NOT APPROVED)

Nothing in Part B is approved. It holds rules only. Three places are marked OWNER SELECTION OUTSTANDING and are not drafted.

**B1. Scope.** These predicates define a valid state for the opening state and every committed state other than the SAF-3 safe terminal state, which keeps its own definition (D16 section 8). Each predicate is evaluated on one state alone.

**B2. Conventions.** Rows 0 at the top to 19 at the bottom, columns 0 to 9; a lower row has a larger number. The kinds are I, O, T, S, Z, J and L. The rotation states of each kind are the geometry of the owner-adopted external geometry reference: the image `SRS-pieces.png` from the Tetris Wiki (1218 bytes, SHA-256 5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236) and the table of its states extracted from that image (SHA-256 c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c). The reference is the fixed bytes identified by those checksums, not the content of any web page. It gives geometry only; wall-kick data is not part of it. In the reference each state is a set of four cells (row, column) in a box that is 4 by 4 for I, 2 by 2 for O and 3 by 3 for the other kinds, rows increasing downward and columns increasing to the right. The position of a piece is the board position of the top-left cell of its box. A block at box cell (row, column) occupies the board cell (position row + row, position column + column). A kind has four rotation states in the table's order, spawn state first and then each clockwise rotation, except that the O kind has one valid rotation state, its first (PCE-4).

**B3. Representation.** Validity is defined on semantic values: whole numbers, ordered lists and finite maps. A representation is valid only if it denotes exactly one value of the item's domain. A missing or extra entry in a collection, a sparse collection, a missing row or cell, or a value of another type is not valid. No numeric format limit is part of R1.

**B4. Game mode.** Exactly one of playing, paused and game over.

**B5. Board.** Exactly 20 rows of 10 positions; each is empty or a locked block. A locked block identifies one of the seven kinds.

**B6. Current falling piece.** Playing or paused: exactly one, with a kind, one of that kind's valid rotation states and a whole-number position, all four blocks on the board and on empty positions (PCE-6). Game over (ordinary): there is no semantic current falling piece. The piece kind, the row and column coordinates, the orientation, the lowest row reached (B9) and the reset count (B9) have no semantic value. An implementation is not required to clear a field that holds such a value. The attempted new or held piece that had no room is not a semantic current piece merely because it caused game over. No ordinary-piece validity is imposed on the SAF-3 safe terminal state. A malformed value is invalid in every mode.

**B7. Upcoming pieces.** In every mode, three valid semantic pieces, each one of the seven kinds. Whether the SAF-4 runtime check must establish element validity or only the count is a separate later interpretation and is not decided here.

**B8. Held piece and hold-used.** The held piece is none or one of the seven kinds. Hold-used represents whether Hold is unavailable for the current piece. A New Game begins with Hold available. Continue restores the saved semantic value. Playing or paused: held is none or a kind; hold-used is true or false. Game over: OWNER SELECTION OUTSTANDING (G1), not drafted. Interpretation of PLY-7 ("Hold works once per piece"), per lock cycle: Hold is available at the start of a lock cycle; any successful Hold consumes that availability; a piece brought in by that Hold does not make Hold available again; availability returns when the next piece becomes the current falling piece after the current lock cycle ends.

**B9. Lowest row and reset count.**

Values. Playing or paused: the lowest row reached is a whole number from 0 to 19 and is at least the greatest row occupied by any block of the current falling piece. The reset count is a whole number from 0 to 16. A reset count of 16 is valid only when the game is paused and the current falling piece is resting (B14). It is not valid in a playing state, for a piece that is not resting, or when there is no current falling piece. Game over: no semantic lowest row and no semantic reset count (B6).

Lowest row reached. It is the greatest board-row index occupied by any block of the current falling piece during its time as the current piece, with rows increasing downward. When a piece becomes the current falling piece it is the greatest row occupied by that piece's four blocks in its initial valid state, and a different piece becoming current starts a new value. After a valid move, rotation or fall of that piece, if its current greatest occupied row is greater than the stored value, the stored value becomes that row and the reset count becomes 0. Moving or rotating upward never decreases it. Returning to a row already reached does not reset the count. A move or rotation that would both restart the lock delay and reach a new lowest row sets the reset count to 0 and does not increment it.

Reset count. It counts reset events since the most recent lowest-row reset. The values 0 to 15 count events within the 15-restart allowance of PLY-6. The value 16 does not represent a 16th restart. It marks a pause taken during the lock delay after the 15 were used.

Resting piece, count below 15. A legal move or rotation that leaves the piece resting and reaches no new lowest row adds 1 to the count and restarts the 0.5-second lock delay. The step from 14 to 15 is the 15th restart.

Resting piece, count 15. A legal move or rotation is permitted. If the piece remains resting and reaches no new lowest row, the delay is not restarted and the already running lock deadline continues. Moving off a ledge cancels the delay. If a piece at count 15 whose delay was canceled comes to rest again without reaching a new lowest row, it locks at once (PLY-6).

Pause. A pause during the lock delay cancels the delay and counts as one reset (STA-2). If the count is 14 or less, the count increases by 1, and on resume a resting piece starts the 0.5-second delay again. If the count is 15, the paused, resting state records count 16, and on resume the piece locks at once and the delay is not restarted. A resume from a paused, resting piece with count 15 starts the delay. A pause when the piece is not in a lock delay is not a reset.

**B10. Bag.** Playing or paused: an ordered sequence of distinct kinds; the empty sequence is valid. Game over: OWNER SELECTION OUTSTANDING (G2), not drafted.

**B11. Score.** In every mode, a whole number of zero or more, with no divisibility condition. SAF-4 says "valid score" without defining it. This choice is made here once and is not repeated in B15.

**B12. Control state.**
- Confirmation pending: yes or no; yes only while paused. Selected choice: Cancel or New Game while pending; absent otherwise.
- Held directions: the held controls, one token per physical control (for example keyboard A, keyboard Left, stick, pad Left). Held horizontal tokens form an ordered sequence from oldest to newest by the time each became held, each with a direction left or right; the newest-direction rule is that the direction of the last token wins, and releasing a token removes it, so the last remaining token wins. Example: A(left), D(right), Left(left), then release Left leaves A, D, and D wins. Held soft-drop tokens are a set. Tokens of the same direction are all remembered.
- Repeat position: for moves, not repeating, waiting for the first repeat, or repeating; for soft drop, not dropping or dropping. Anything but the idle value only while playing and only with a matching direction held (INP-2: repeating stops when the game stops playing). Game over and paused: idle.
- Touch drag: none, or a drag with its start and current points, the whole columns and rows moved, and whether it still controls the current falling piece, yes only while there is a falling piece. Game over: OWNER SELECTION OUTSTANDING (G3), not drafted.

**B13. Runtime resource states.** Semantic running: a resource is running exactly when an outstanding scheduled firing of it exists; it is not running when none exists, and a fired or canceled firing is not outstanding. This is independent of any concrete handle; null or undefined handle handling is later correspondence. Playing: the gravity resource is running; the lock-delay resource is running exactly while the falling piece rests (B14); the horizontal-repeat resource is running exactly while a horizontal held token exists and the repeat position is not idle; the soft-drop repeat resource is running exactly while a soft-drop token is held and soft drop is dropping. The horizontal-repeat and soft-drop repeat schedules are separate resources and may be running at the same time. Paused and game over: none running. The set T of other resources the SAF-4 word "timer" may cover is left open. The later timer-universe decision may add constraints for members of T and does not change the states defined here for gravity, lock delay and the two repeat resources. A resting piece in a committed playing state with reset count 15 has an outstanding lock delay (B9), and a resting piece with reset count 16 exists only while paused, when no resource runs. The screen wake lock is not an ordinary validity condition: DSP-7 requires only best-effort behavior (the game plays normally if it is unsupported or refused, and the system may take it back), so no state of it is required of a valid game state.

**B14. Derived values (semantic definitions).** Level is the score divided by 1000, rounded down, plus 1 (SCO-2). Gravity interval is max(0.25, 0.7 - 0.02 × (level - 1)) seconds (PLY-2). Resting: playing or paused with a falling piece that cannot move down one row and stay valid under B6; false when there is no falling piece. Landing position: defined only when there is a falling piece, as the lowest position it can reach straight down and stay valid under B6; when there is none, there is no landing position and no ghost. Derived state has no independent semantic authority (D16 1.2). Whether an implementation cache or stored copy agrees with these values is later correspondence evidence and is not an R1 validity condition.

**B15. Legal-play properties.** No R1 snapshot-validity condition requires that a committed state has no completely filled row. No R1 snapshot-validity condition requires that hold-used true implies a held piece exists. Whether legal play or history produces or forbids either property is not decided by R1. Consistency of the bag, queue and current piece with dealing whole bags of seven (PCE-5) is historical, cannot be evaluated from one state under B1, and is not an R1 snapshot-validity condition.

**B16. Persisted content.** Arbitrary external data may be malformed, and invalid external data is not authoritative. A saved game is accepted whole or not at all. The pieces of an accepted saved game map to the built-in piece definitions. The gameplay contents of an accepted saved game are such that, when Continue restores them paused (STA-4), the resulting authoritative state is R1-valid; the saved payload's own representation of the mode is not decided here. Supported legacy formats are accepted. The level stored by the earlier format is ignored (STA-6). A saved game from before the bag was saved continues with a fresh bag (STA-4). A save newly written under these rules preserves the lowest row reached and the reset count exactly, including a reset count of 16 where applicable, so that Continue restores the same semantic values. Saved games in the released formats required by STA-6 predate the lowest row and the reset count of 16. Two compatibility defaults apply when loading them. They are deterministic defaults and are not recovered history. L1: a missing lowest row is the greatest board-row index occupied by any block of the current falling piece. L2: a legacy paused, resting saved game with reset count 15 and no information that distinguishes a pause that took the count from 14 to 15 from a pause taken after the 15 were used resumes with the lock delay starting. An accepted stored high score is a whole number of zero or more with no divisibility condition (B11); a stored high-score value outside that domain is invalid and is ignored (SAF-2). Forgetting, discoverability, failure behavior, rollback, last-good-save and persistence ordering belong to R2 and R4 and are not stated here.

**B17. Presentation state.** Presentation state (D16 1.5) is non-authoritative and outside the ordinary authoritative validity predicate. Its own requirements, which may also depend on viewport, device and browser state, are evidenced separately.
