# Phase 1 proposal: R1, exact valid-state semantics

Status: **PROPOSAL FOR REVIEW. This is not an approved decision.** No owner decision is recorded by this document, and no row in `AUDIT.md` refers to it. It is drafted for adversarial review and then for the owner's decisions. Part B is draft candidate text with the owner's choices in brackets.

Revision: this is a narrow revision of `docs/phase-1-r1-proposal.md` as it stood at branch `claude/phase-1-r1-proposal`, head ccb7b50ccbf805d813f46a063219a85eba4e8823 (SHA-256 8d9d80b933dc3beda7e2c6ec964e8e00c9315928374eb829dd06e03d820c7eed), which is kept unchanged for comparison. Revision 2 (after review of PR #52 head 1c8d63c) corrects ten review objections; see A10.

Base: main 06d2a59aec07a7c80516f9975e627b09246cddae (D16 merged). Sources: `REQUIREMENTS.md` (SHA-256 fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc), the blueprint, and the D16 decision `docs/phase-1-state-decision.md` (SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182), which is not modified. Nothing in the blueprint, `REQUIREMENTS.md`, `AUDIT.md`, the code, the tests or CI is changed.

Independence (blueprint O8): the assistant that drafted this has read the production code. No rule below rests on how the code stores or checks anything; each cites the requirement text it comes from. It is still not independent of the implementation. It judges the implementation against no predicate and classifies no finding.

## Part A. Review material

### A0. The gate

- Decides: the exact valid-state predicates for each authoritative item of D16 section 1.1, by game mode, and the representation rule that settles structural questions such as missing entries.
- Leaves open: R2 to R5; the meaning of "fault reported"; the SAF-4 meaning of "timer"; what each operation may change (the complete legal-operation specification of O1 stays on the later Phase 1 list); the oracle choice; trust decisions; proof-obligation mappings; the O8 input pack.
- Depends on: D16. R1 gives predicates to D16's items and does not add, remove or move any of them. Where a requirement might need something D16 does not list, A1 analyzes whether it does, and Part B brackets only what the analysis leaves open.
- Applies to: ordinary committed states (D16 sections 6 and 8). R1 adds no condition to the SAF-3 safe terminal state.
- Not R1 blockers, kept separate: the wording of D14 (record hygiene); CI-record wording; the SAF-3 and SAF-5 gamepad-route classification; observability of V1 intermediate states (a later boundary and correspondence obligation).

### A1. Whether requirements need state D16 does not list

These three questions were raised as possible D16 gaps. Each is analyzed first for whether it needs additional authoritative state at all. D16 is not amended by implication.

**1. "Reaching a lower row than before" (PLY-6).** PLY-6: "Moving or rotating it while it rests restarts that delay, at most 15 times; reaching a lower row than before resets the count". Two readings are defensible.

- **L-pair (adjacent states).** "Before" means the piece's row just before the move, rotation or fall step. The reset is a relation between the pre-transition and post-transition piece position: the count resets exactly when the post row is lower (a larger row number) than the pre row. No stored history is needed, and D16 item 9 (the count) and item 2 (the piece) suffice.
- **L-hist (history).** "Before" means any earlier row of the same piece: the count resets only on reaching a row lower than any it has reached. This needs a remembered lowest row for the current piece, which is not derivable from the board and the current piece and which D16 does not list.

The text does not force L-hist. The word "before" has a natural adjacent-state reading, so history is not shown to be required. The readings differ in one place: a piece that kicks upward and then falls back to the row it held. Under L-pair the fall back is "lower than before" and resets the count, so a sequence of upward kick and fall can restart the delay without a bound if the shape tables contain upward kicks. Under L-hist it does not reset. Which behavior is intended is not stated. If the owner chooses L-hist, the lowest row is an item D16 does not list and needs a D16 clarification (this proposal brackets it and does not add it). This is an owner choice. No recommendation: L-pair needs nothing added, and L-hist prevents the unbounded case, but neither is shown by the text to be intended.

**2. Held gamepad buttons (INP-4).** INP-4 contains: "Buttons act once per press", "two buttons for the same action pressed together act once", "Menu and View act alone: other buttons pressed at the same moment do nothing", dialog selection moves "once per push", and "Moving and soft dropping with the stick or directional pad carry on as held". Two places could hold the memory these need.

- **Outer input state.** A raw sample of the device is compared with the previous raw sample; the comparison produces the conceptual operations (press, release, push) that D16 section 5 already lists. Edge detection ("once per press"), same-moment grouping ("together", "alone") and push detection are properties of turning raw samples into operations. They need the previous raw sample, which is outer-layer runtime input state under D16, and they need nothing from the engine model after the operation has been produced. The engine sees only the resulting operations.
- **Authoritative state.** Required only if future required behavior of the model itself depends on remembering that a button is held, after the operation was produced. For the one-shot buttons (A, B, X, Y, Menu, View, shoulders) no requirement says anything about a held button after its press has acted. For the repeating controls (stick, directional pad) held-ness is already D16 items 12 and 13.

The text does not show that the engine model needs held-button memory. Recommendation (the drafter's, not an adopted rule, and not shown sufficient): treat the previous raw sample as outer input state, and treat the mapping from raw samples to conceptual operations as an outer-layer correspondence and trust item for later phases. Alternative: the owner may want the model to define the edge detection itself. That would make held buttons authoritative and would be a D16 amendment, not an R1 consequence. Focus loss and gamepad disconnect (INP-2, INP-4: "Disconnecting releases everything") are environmental release events. They produce release operations, so they need no additional authoritative state, and they are not D16 omissions.

**3. Which piece a drag controls (INP-5).** D16 item 14 includes "the controlled falling piece". Two successive pieces can have the same kind, so kind, rotation and position do not identify a piece. Proposed without amending D16: item 14 records a flag that the drag still controls the current falling piece. The drag sets it when it begins, and any transition that replaces the current piece clears it. A cleared drag keeps tracking the finger and moves nothing until it ends. No piece identity is added. The flag is within item 14 and is meaningful only for a drag that began while a falling piece was present. Alternative: an opaque identity per piece, which would add to D16 item 2 and is a D16 amendment decision.

### A2. Approach: validity, not reachability

The blueprint forbids strengthening requirements or invariants without evidence. Legal play from a valid state reaches only a subset of the valid states. This proposal keeps three things apart:

- **Validity conditions** (Part B): what the requirements state about a state's items. These are what the valid-state model is and what O4 uses to call a saved game good.
- **Reachability properties** (A6): properties that legal play is expected to preserve but that no requirement states about a state. Adopting one as a validity condition is an owner choice, made item by item.
- **The SAF-4 runtime-check obligation:** what the engine's own check must establish. This is a separate interpretation question (A5, item 3), and R1 validity does not decide it.

A state that legal play can reach must be valid under R1. A3 lists the cases checked against this.

**Semantic domains versus concrete representation.** The predicates range over mathematical values (whole numbers, ordered lists, finite maps). R1 states structural representation rules: a collection has exactly the entries the domain requires, so a missing row, a missing cell, a sparse collection or an extra entry is not a valid representation. R1 does not adopt a numeric format rule. Exact representability in a finite number format and safe-integer limits have no support in `REQUIREMENTS.md`; whether a concrete implementation number can denote the model's value is a later correspondence and trust question, not a validity condition.

### A3. States legal play reaches that a careless rule would reject

| Case | Requirement | Consequence for R1 |
| --- | --- | --- |
| Game over because a new or held piece has no room | STA-3 | Game over does not require a falling piece that fits; otherwise PCE-6 and STA-3 contradict |
| Opening state | STA-1, DSP-8 | Valid as a game over state with an empty board |
| A save without a bag, from before the bag was saved | STA-4 | Continues with a fresh bag. This is a loading rule and does not by itself make an empty bag valid (A4, Bag) |
| Pausing during the lock delay repeatedly | STA-2, PLY-6 | Bears on the reset count domain (A5, item 2) |
| An O piece | PCE-3, PCE-4 | Its only valid rotation state is the first |
| Two pieces of the same kind in a row | PCE-5 | No rule may forbid repeated kinds across a bag boundary |
| Two held-direction sources at once (A and Left) | INP-2 | Both are remembered; releasing one keeps the other (B12) |

### A4. Per-item analysis and recommendations

Recommendations are the drafter's, labeled, not adopted rules, and not shown sufficient. Where the requirements support more than one reading, the reading is a bracketed owner choice in Part B and no recommendation is made.

- **Coordinates.** Rows 0 (top) to 19 (bottom), columns 0 to 9. "Lower" means a larger row number. A naming convention, not a requirement.
- **Piece shapes (PCE-2).** The requirements name the standard Super Rotation System but do not reproduce the shapes. Options: (a) adopt an explicit geometry, either a frozen and checksummed source file or a table written into the decision; (b) leave exact SRS geometry as an owner and oracle dependency. Under (b), R1 cannot be fully exact on the structure of the canonical shapes until the dependency is resolved, and this document says so. A web page reference is not frozen and is not offered as the reference. Choice: owner.
- **Board cells.** Each of 200 positions is empty or a locked block. A locked block records a kind (which fixes its color under PCE-2) [owner alternative: a color from the seven fixed colors, which needs a color list from outside the requirements].
- **Missing entries.** Structural rules stay: a representation is valid only if it denotes exactly one value of the domain; a missing row or cell, a sparse collection or an extra entry is invalid, and a missing position is not read as empty.
- **Upcoming pieces and held piece.** Kinds only (PLY-7, PLY-8).
- **Bag (PCE-5, STA-4).** Domain: an ordered sequence of distinct kinds. Whether the empty sequence is a valid committed state is a separate question from the STA-4 legacy rule. STA-4 says a bag-less save "continues with a fresh bag", which is a rule about the state a legacy load produces, not a statement that the empty bag is valid. Whether an empty bag can occur in a committed state depends on whether refill is part of the same transition as the deal that empties it, which is a commit-boundary and bag-transition question (D16 section 4) and is not decided here. Choice [owner]: an empty bag is valid / is not valid in a committed state / R1 leaves it to the transition decision. If empty is not valid, a dealing transition must refill within itself.
- **Score.** A whole number of zero or more. No upper bound is stated by the requirements and R1 adds none.
- **Current piece at game over.** DSP-8 governs what is displayed. It says nothing about the retained authoritative state. STA-3 means that a new or held piece may have no room. The requirements do not force one answer for the retained value, so this is an owner interpretation: (a) no falling piece, absent; (b) a retained semantic current piece, which must still satisfy PCE-6 (on the board, on empty positions), since PCE-6 constrains committed legal states; residue held by an implementation is not the model's piece. Malformed values are invalid under every choice.
- **Other items at game over.** For each item R1 states one of two things: the item is semantically absent or inactive at game over, or it is retained within its normal value domain. The mode never makes a malformed value valid. Per item, see B8 to B13. Items the requirements show are replaced by New Game or Continue (DSP-8, STA-1, STA-4) are bracketed between those two for the owner; no item is silently unconstrained.
- **While paused.** SAF-4 requires the piece to fit only "while playing". PCE-6's "never" covers committed states of every mode other than game over. The piece must fit while paused.

### A5. Requirement interactions

1. **PCE-6 and STA-3.** Resolved by the game over current piece choice above.
2. **The reset count: PLY-6 and STA-2.** PLY-6 says "at most 15 times" and "once the 15 are used, landing locks at once". STA-2 says pausing counts as one reset. Readings, with consequences:
   - **(R1a) The STA-2 pause does not consume the 15-restart allowance.** Pausing restarts the lock delay on resume but leaves the count unchanged. Domain 0 to 15.
   - **(R1c) The STA-2 pause consumes the allowance like a move or rotate restart.** Domain 0 to 15. Consequence: a pause when the 15 are used and the piece rests means landing locks at once on resume, which the requirements do not state.
   - **(R1b, not selectable under D16 as approved)** pause resets increment a count while only move or rotate restarts consume the 15. One scalar cannot then say how many move or rotate restarts remain, so R1b needs an additional authoritative quantity and a D16 amendment before it can be selected. This document does not add that state and removes R1b as an alternative.
   R1a and R1c share the domain but differ in meaning; the owner chooses the semantic reading, not only the numeric domain. Counts above 15 are not assumed permitted.
3. **SAF-4's runtime check and R1 validity.** These are two questions. R1 semantic queue validity: the queue is three valid semantic pieces, each one of the seven kinds (B7). The SAF-4 obligation: whether the engine's own check must establish element validity or only length ("three pieces queued"). The second is a runtime-check interpretation and R1 does not decide it. Same split for "board 20 by 10": dimensions only, or dimensions and cell validity. Choice: owner, later, when SAF-4 is mapped.

### A6. Reachability properties: candidate individual items

None is adopted as a validity condition by this document. Each is classified, and where adopting is possible it is an individual owner choice, with no "unless adopted" catch-all.

| Property | Classification | Basis |
| --- | --- | --- |
| No row completely filled in a committed state | Derived legal-play property | SCO-1 clears full rows; holds only if lock and clear are one transition, which D16 section 4 does not decide. Not directly required of a state |
| Score is a multiple of 100 | Derived legal-play property | SCO-1 awards fixed values; the table is not restated here. Not directly required of a state. Chosen once, in B11 |
| Hold used implies a piece is held | Derived legal-play property | PLY-7. Not directly required. Hold-used with nothing held is not shown reachable, and is not shown invalid |
| Bag, queue and current piece consistent with whole bags of seven | Derived history property | PCE-5. Cannot be evaluated from one state under B1 without history; not an R1 snapshot-validity condition, a later legal-play/history property |

### A7. Persistence-content boundary (review notes; the normative rules are in B16)

This marks what R1 says about the content of external data and leaves the rest. R1 states: arbitrary external data may be malformed; invalid external data is not authoritative; a saved game is accepted whole or not at all; the accepted pieces map to the built-in definitions; an accepted current-format payload maps to an R1-valid resumable state (paused, STA-4); supported legacy formats are accepted; the legacy level is ignored (STA-6); a pre-bag format maps to a fresh-bag continuation (STA-4). R1 leaves to R2 and R4: forgetting, discoverability, failure behavior, rollback and last-good-save.

### A8. Consequences outside R1

SAF-1's "invalid save is rejected whole" takes its content meaning from R1. Blueprint 4.7 items 5, 7, 8, 9 and 12 depend on R1 and are not classified here. O1's complete legal-operation specification stays on the later Phase 1 list. V1 intermediate-state observability is a later obligation.

### A9. Completeness table

Every D16 authoritative item, derived item and runtime-resource class, and where R1 treats it.

| D16 | Item | Where R1 treats it |
| --- | --- | --- |
| 1.1 (1) | Locked blocks | B5 |
| 1.1 (2) | Current falling piece | B6, A1 item 3 |
| 1.1 (3) | Held piece | B8 |
| 1.1 (4) | Hold-used state | B8 |
| 1.1 (5) | Next-three queue | B7 |
| 1.1 (6) | Bag | B10 |
| 1.1 (7) | Score | B11 |
| 1.1 (8) | Game mode | B4 |
| 1.1 (9) | Reset count | B9 |
| 1.1 (10, 11) | Confirmation pending, choice | B12 |
| 1.1 (12) | Held directions, newest ordering | B12 |
| 1.1 (13) | Repeat position | B12 |
| 1.1 (14) | Touch drag | B12 |
| 1.2 (1) | Level | B14 |
| 1.2 (2) | Resting | B14, defined explicitly |
| 1.2 (3) | Landing (ghost) position | B14, mode-aware |
| 1.2 (4) | Gravity interval | B14 |
| 1.3 (1) | Gravity timer | B13 |
| 1.3 (2) | Lock-delay timer | B13 |
| 1.3 (3) | Key-repeat handles | B13, semantic running state |
| 1.3 (4) | Other scheduled callbacks | B13, parameterized set T |
| 1.3 (5) | Screen wake lock | B13, excluded from ordinary validity |
| 1.4 | Saved game, high score | B16; R2 and R4 own the rest |
| 1.5 | Presentation state | B17, excluded |

### A10. Revision 2 corrections (review of PR #52 head 1c8d63c)

1 hold-used meaning and reset: B8. 2 held-direction chronology: B12. 3 abstract resource semantics, repeat coexistence: B13. 4 persistence content and high score moved into Part B: B16. 5 derived-cache clause removed: B14. 6 board cell kind versus color bracketed: B5. 7 game-over piece alternative that ignored PCE-6 removed: B6. 8 score domain exposed as owner interpretation: B11. 9 four history choices individually bracketed: B15. 10 presentation wording: B17. The SAF-4 timer universe stays parameterized; B13 says a later decision may add constraints without changing the known resources.

### A11. Revision 3 corrections (review of PR #52 head 019e9c4)

1 reset-count alternatives: A5.2 and B9. R1b removed as not representable by D16's single reset-count item (it would need an additional authoritative quantity and a D16 amendment before selection, which this document does not add); R1a and R1c kept distinct by whether the STA-2 pause consumes the 15-restart allowance. 2 hold-used: B8 now defines availability across the lock cycle, with PLY-7's "once per piece" bracketed. 3 clean Part B: A10 and A11 moved before Part B; B7 and B9 no longer cite review material. 4 score divisibility chosen once, in B11 only; B15 holds only the other two properties; B16 high-score alternatives explicit. 5 whole-bag consistency: stated as not an R1 snapshot condition (needs history). 6 saved-game content: B16 states the Continue-restored paused state must be R1-valid and decides no stored mode representation.


## Part B. Clean candidate decision text (DRAFT, NOT APPROVED)

Nothing in Part B is approved. Bracketed text is for the owner's choice. It holds rules only.

**B1. Scope.** These predicates define a valid state for the opening state and every committed state other than the SAF-3 safe terminal state, which keeps its own definition (D16 section 8). Each predicate is evaluated on one state alone.

**B2. Conventions.** Rows 0 at the top to 19 at the bottom, columns 0 to 9; a lower row has a larger number. The kinds are I, O, T, S, Z, J and L. A kind's rotation states are those of the standard Super Rotation System [owner: an explicit adopted geometry (frozen and checksummed source, or a table in the decision) / left as an owner and oracle dependency, in which case R1 is not exact on canonical shape structure until resolved]. The O kind has one valid rotation state, its first; each other kind has four.

**B3. Representation.** Validity is defined on semantic values: whole numbers, ordered lists and finite maps. A representation is valid only if it denotes exactly one value of the item's domain. A missing or extra entry in a collection, a sparse collection, a missing row or cell, or a value of another type is not valid. No numeric format limit is part of R1.

**B4. Game mode.** Exactly one of playing, paused and game over.

**B5. Board.** Exactly 20 rows of 10 positions; each empty or a locked block. A locked block records [owner: one of the seven kinds, which fixes its color under PCE-2 / one of the seven fixed colors, which needs a color list from outside the requirements].

**B6. Current falling piece.** Playing or paused: exactly one, with a kind, one of that kind's valid rotation states and a whole-number position, all four blocks on the board and on empty positions (PCE-6). Game over: [owner: there is no current falling piece / a retained semantic current falling piece exists and satisfies the same PCE-6 conditions]. Implementation residue is not the model's current falling piece. A malformed value is invalid in every mode.

**B7. Upcoming pieces.** In every mode, three valid semantic pieces, each one of the seven kinds. Whether the SAF-4 runtime check must establish element validity or only the count is a separate later interpretation and is not decided here.

**B8. Held piece and hold-used.** The held piece is none or one of the seven kinds. Hold-used false means Hold is currently available; true means it is not. A successful Hold sets it to true. The piece brought in by that Hold does not regain availability merely because it is a different piece. It is set to false when the next piece becomes the current falling piece after the current piece locks, and for a New Game. A Hold that fails (no room) leaves it unchanged. Continue restores the saved value. [Owner interpretation of PLY-7 "Hold works once per piece": (H1) availability is per lock cycle as stated here / (H2) availability belongs to each piece, so a piece brought in by Hold has its own availability, which allows repeated Hold swaps within a lock cycle and changes what the flag records.] Whether hold-used true implies a held piece exists is a separate choice (B15). Playing or paused: held is none or a kind; hold-used is true or false. Game over: [owner, per item: absent (held none, hold-used false) / retained within the same domain].

**B9. Reset count.** Playing or paused: a whole number 0 to 15; 15 means no restarts remain and landing locks at once (PLY-6). [Owner, semantic reading of STA-2: (a) a pause during the lock delay restarts the delay on resume and does not consume the 15-restart allowance, the count unchanged / (b) a pause consumes one of the 15 like a move or rotate restart.] Reaching a lower row than before resets the count by comparing the piece's row before and after the transition; no lowest-row state is kept [owner: this adjacent-state reading / a history reading, which needs an additional authoritative item and a D16 amendment before it can be selected]. Game over: [owner: absent (zero) / retained within the same domain].

**B10. Bag.** Playing or paused: an ordered sequence of distinct kinds [owner: empty valid / empty not valid / left to the transition decision]. Game over: [owner: absent / retained within this domain].

**B11. Score.** In every mode, [owner: a whole number of zero or more / a whole number of zero or more that is a multiple of 100]. SAF-4 says "valid score" without defining it. This choice is made here once and is not repeated in B15.

**B12. Control state.**
- Confirmation pending: yes or no; yes only while paused. Selected choice: Cancel or New Game while pending; absent otherwise.
- Held directions: the held controls, one token per physical control (for example keyboard A, keyboard Left, stick, pad Left). Held horizontal tokens form an ordered sequence from oldest to newest by the time each became held, each with a direction left or right; the newest-direction rule is that the direction of the last token wins, and releasing a token removes it, so the last remaining token wins. Example: A(left), D(right), Left(left), then release Left leaves A, D, and D wins. Held soft-drop tokens are a set. Tokens of the same direction are all remembered.
- Repeat position: for moves, not repeating, waiting for the first repeat, or repeating; for soft drop, not dropping or dropping. Anything but the idle value only while playing and only with a matching direction held (INP-2: repeating stops when the game stops playing). Game over and paused: idle.
- Touch drag: none, or a drag with its start and current points, the whole columns and rows moved, and whether it still controls the current falling piece, yes only while there is a falling piece. Game over: [owner: none / retained within the same domain].

**B13. Runtime resource states.** Semantic running: a resource is running exactly when an outstanding scheduled firing of it exists; it is not running when none exists, and a fired or canceled firing is not outstanding. This is independent of any concrete handle; null or undefined handle handling is later correspondence. Playing: the gravity resource is running; the lock-delay resource is running exactly while the falling piece rests (B14); the horizontal-repeat resource is running exactly while a horizontal held token exists and the repeat position is not idle; the soft-drop repeat resource is running exactly while a soft-drop token is held and soft drop is dropping. The horizontal-repeat and soft-drop repeat schedules are separate resources and may be running at the same time. Paused and game over: none running. The set T of other resources the SAF-4 word "timer" may cover is left open. The later timer-universe decision may add constraints for members of T and does not change the states defined here for gravity, lock delay and the two repeat resources. These known states still depend on the owner choices on the reset count and lowest row (B9) for when the lock delay is running after restarts. The screen wake lock is not an ordinary validity condition: DSP-7 requires only best-effort behavior (the game plays normally if it is unsupported or refused, and the system may take it back), so no state of it is required of a valid game state.

**B14. Derived values (semantic definitions).** Level is the score divided by 1000, rounded down, plus 1 (SCO-2). Gravity interval is max(0.25, 0.7 - 0.02 × (level - 1)) seconds (PLY-2). Resting: playing or paused with a falling piece that cannot move down one row and stay valid under B6; false when there is no falling piece. Landing position: defined only when there is a falling piece, as the lowest position it can reach straight down and stay valid under B6; when there is none, there is no landing position and no ghost. Derived state has no independent semantic authority (D16 1.2). Whether an implementation cache or stored copy agrees with these values is later correspondence evidence and is not an R1 validity condition.

**B15. Legal-play properties, each individually bracketed.** [Owner: a committed state has no completely filled row / no such condition.] [Owner: hold-used true implies a held piece exists / no such condition.] Consistency of the bag, queue and current piece with dealing whole bags of seven (PCE-5) is historical, cannot be evaluated from one state under B1, and is not an R1 snapshot-validity condition.

**B16. Persisted content.** Arbitrary external data may be malformed, and invalid external data is not authoritative. A saved game is accepted whole or not at all. The pieces of an accepted saved game map to the built-in piece definitions. The gameplay contents of an accepted saved game are such that, when Continue restores them paused (STA-4), the resulting authoritative state is R1-valid; the saved payload's own representation of the mode is not decided here. Supported legacy formats are accepted. The level stored by the earlier format is ignored (STA-6). A saved game from before the bag was saved continues with a fresh bag (STA-4). An accepted stored high score is [owner: a value in the B11 score domain / a whole number of zero or more with no divisibility condition]; a stored high-score value outside the chosen domain is invalid and is ignored (SAF-2). Forgetting, discoverability, failure behavior, rollback, last-good-save and persistence ordering belong to R2 and R4 and are not stated here.

**B17. Presentation state.** Presentation state (D16 1.5) is non-authoritative and outside the ordinary authoritative validity predicate. Its own requirements, which may also depend on viewport, device and browser state, are evidenced separately.
