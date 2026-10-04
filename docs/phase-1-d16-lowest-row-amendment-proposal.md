# Phase 1 proposal: D16 historical-low amendment, reset-limit boundary and SRS oracle candidate

Status: **PROPOSAL FOR REVIEW. Not a decision, not approved, not for merge.** It modifies nothing. The approved D16 artifact `docs/phase-1-state-decision.md` (SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182), `AUDIT.md` (D1 to D16), `REQUIREMENTS.md` and the R1 proposal at PR #52 are untouched. No R1 decision is recorded and no owner approval is requested.

Base: main 06d2a59aec07a7c80516f9975e627b09246cddae.

Independence (blueprint O8): the assistant that drafted this has read the production code. Nothing below is taken from production code or tests. It is still not independent of the implementation, and it judges the implementation against nothing.

## Part A. Review material

### A1. Why a D16 amendment is in question

PLY-6 says "reaching a lower row than before resets the count". Two readings were analyzed in the R1 proposal: an adjacent-state relation, and a historical-low reading. The owner has asked for the historical-low reading to be drafted as an owner interpretation for review. The lowest row reached by the current piece is not computable from the board and the current piece. D16 section 1.1 item 9 lists the reset count only. Adding the lowest row reached therefore changes the approved D16 state list and needs a D16 amendment before it can be selected. This document drafts that amendment for review and does not apply it.

Supporting evidence, labeled by strength: the blueprint's Appendix C2 reports, from an unauthenticated copy of the 2009 Tetris Design Guideline, that the count resets when the piece falls one row below the lowest yet reached. This supports the reading and is not an authority for REQUIREMENTS.md. PLY-6's own words, "than before", do not by themselves decide between the readings. A consequence of the adjacent-state reading, stated as a possibility and not shown reachable in this game: a rotation or kick that lifts the piece, followed by a fall back to the earlier row, would reset the count repeatedly.

### A2. Input 1: the lowest-row reference

Owner's proposed interpretation, for review: the lowest row reached is the greatest board-row index occupied by any block of the current semantic piece. Rows increase downward.

Contrast with origin-row semantics (the row of a fixed point of the piece, such as the top-left corner of its bounding box): the two are not equivalent under rotation. In the SRS box a flat I piece in rotation state 0 occupies box row 1 and the vertical I in state 1 occupies box rows 0 to 3. With the box at a fixed board position the greatest occupied row moves from R+1 to R+3 without any origin movement, so a rotation can establish a new historical low under occupied-block semantics and cannot under origin semantics. The converse also occurs: the vertical-to-flat rotation reduces the greatest occupied row and under occupied-block semantics never lowers the stored value. Origin semantics also depends on which point is the origin, which the shape reference must then fix.

Why the occupied-block row is proposed: it needs no origin or anchor convention, so it does not depend on the choice of shape reference or on any coordinate conversion; it is a property of the four occupied positions, which is what PLY-6's "reaching a lower row" most directly describes (a piece reaches a row when a block is on it); and it is evaluated from the semantic piece alone. It is an owner interpretation, not an implementation observation, and not shown to be the only defensible one.

Rules as proposed:
1. When a new current piece is successfully introduced (from the next queue, or from the held slot by Hold), the lowest row reached is initialized to the greatest row occupied by its four blocks in that initial valid state, and the reset count is 0.
2. After any valid move, rotation or fall of the same current piece, compute its greatest occupied row. If it is greater than the stored lowest row reached, the stored value becomes that row and the reset count becomes 0.
3. Otherwise the stored value is unchanged: upward movement or rotation never decreases it, and returning to a row already reached does not reset the count.
4. If one move or rotation would both consume a lock-delay restart and establish a new lowest row, the new-lowest-row reset takes precedence: the resulting count is 0, not incremented.
5. A different piece becoming current starts a new value (rule 1).

Validity (candidate, for the later R1 text): while a current falling piece exists, the lowest row reached is a whole number from 0 to 19 and is not less than the greatest row occupied by the current piece. When there is no current falling piece, the item is semantically absent.

### A3. Input 2: the reset-limit boundary, each case separately

Definition proposed by the owner: the reset count is the number of restart allowances consumed since the most recent lowest-row reset, domain 0 to 15.

| Case | State before | Event | Proposed result | Support in the requirements |
| --- | --- | --- | --- | --- |
| C1 | count < 15, resting | legal move or rotation, stays resting, no new lowest row | count + 1, 0.5 s delay restarts. 14 to 15 is a valid 15th restart | PLY-6 "at most 15 times" |
| C2 | count = 15, resting | legal move or rotation, stays resting, no new lowest row | move permitted; delay is not restarted; the running deadline continues | PLY-6 does not say what a move does after the 15 are used beyond "landing locks at once". Owner interpretation |
| C3 | any count, resting | move off a ledge | delay canceled | PLY-6 "moving off a ledge cancels the delay" |
| C4 | any count | move, rotation or fall establishes a new lowest row | count 0 (takes precedence over C1) | PLY-6 "reaching a lower row ... resets the count", under the historical-low interpretation |
| C5 | count = 14, resting, delay running | pause | delay canceled; the pause consumes reset 15; count 15; on resume the 0.5 s delay starts again | STA-2 "counts as one reset" and "resuming starts it again"; PLY-6 "at most 15" allows a 15th |
| C6 | count < 14, resting, delay running | pause | count + 1; on resume the delay starts again | STA-2 |
| C7 | count = 15, resting, delay running | pause | delay canceled; no 16th allowance; on resume, if still resting, the piece locks at once | Owner interpretation resolving STA-2 ("resuming starts it again") against PLY-6 ("at most 15 times", "once the 15 are used, landing locks at once"). REQUIREMENTS.md does not unambiguously dictate it |
| C8 | not in a lock delay | pause | no reset (STA-2 speaks of pausing during the lock delay) | STA-2 |
| C9 | count = 15, delay canceled by C3 | piece comes to rest again with no new lowest row | lands, locks at once | PLY-6 "once the 15 are used, landing locks at once". Not in the owner's list; added here as a boundary case needing a decision |

Finding: C5 and C7 are not distinguishable by D16's state. After the pause in C5 (count 14 to 15) and after the pause in C7 (count 15 unchanged) the state is identical: paused, resting piece, count 15, no delay running. Resume then has to start a delay in C5 and lock at once in C7. A function of the state alone cannot do both. So C5 and C7 together are not representable by D16's single count, even with the lowest row added. This is a representability result about the proposed interpretation, not a claim about the requirements.

Options, with consequences, labeled; the owner decides:
- **P1.** Keep C5 and C7 as written and add one more authoritative item that records, for a paused resting piece, whether the pause consumed the last allowance (so resume starts a delay) or found it already exhausted (so resume locks). Satisfies the literal wording of STA-2 and PLY-6 in both cases. Costs one more D16 item in the amendment. Not added here.
- **P2.** Resume with count 15 and a resting piece always locks at once. C5 changes: a pause that takes the count to 15 still counts as reset 15, but resume then locks at once. No extra state. It matches PLY-6 literally (the piece comes to rest by "play resuming", and the 15 are used) and departs from STA-2's "resuming starts it again" in that one corner.
- **P3.** A pause does not consume the allowance: the count is unchanged and resume always starts the delay (the earlier R1a reading). No extra state. It departs from STA-2's "counts as one reset" and makes pausing a free restart.
- Drafter's labeled recommendation, not shown sufficient: P2 if no extra D16 item is wanted, P1 if both texts must hold literally. Both rest on owner interpretation.

Resource check for B13 (running states): under C2 the already-running deadline continues, so the delay is outstanding and "running while the piece rests" holds. Under C7/P2 and C9 the piece locks at once on the transition that would otherwise start a delay, so no committed playing state exists with a resting piece at count 15 and no outstanding delay; the resource rule needs no new state in which a delay must run and cannot. A paused state has no delay running. The remaining-time of a running deadline is not state (R3 timing tolerance).

### A4. Input 3: SRS geometry oracle candidate

Candidate artifact: the image `SRS-pieces.png` from the Tetris Wiki.

- Source: https://tetris.wiki/images/3/3d/SRS-pieces.png (file description https://tetris.wiki/File:SRS-pieces.png, used on https://tetris.wiki/Super_Rotation_System). The wiki's API reports the file as imported 2015-12-23 and gives a SHA-1 of 78119b4e42316cc61597a21e51bfb1c02838a39b.
- Bytes: 1218 bytes, PNG, 336 by 480 pixels. SHA-256 5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236 (and SHA-1 as above, matching the wiki's report). Fetched 2026-10-04.
- Frozen copy: the Internet Archive holds a capture of the same URL (https://web.archive.org/web/20260627160739id_/https://tetris.wiki/images/3/3d/SRS-pieces.png). Its bytes are identical to the live file (same SHA-256, byte comparison). The proposal adopts the bytes by checksum. The exact retention route (committing the file under `docs/sources/` in a later approved change, or relying on the archive capture) is an owner choice and is not done here.
- Content: the four rotation states of all seven tetrominoes, spawn state first, then successive clockwise rotations, with circles marking the rotation centers. It is geometry only. Wall-kick tables are text on the wiki page, are not part of this artifact, and are not adopted here (they belong to the later legal-operation specification).
- Coordinate convention: a grid of 16-pixel cells, rows increasing downward and columns increasing to the right, the same orientation as the audit's (row 0 top, column 0 left). Each state is read in a box: 4 by 4 for I, 2 by 2 for O, 3 by 3 for the others, located by the rotation-center circle (the center of the box). A block at box-relative (row, column) with the box top-left at board (R, C) occupies board (R + row, C + column). No axis flip is needed. The board position (R, C) of a spawned piece comes from PCE-3 and is not in the artifact.
- Extraction: I read cell colors from the pixels with a script written for this proposal. No production code or test was consulted. The result is in A5. Consistency check computed independently of the picture: for every kind, state s + 1 equals state s rotated clockwise in its box ((row, col) to (col, n - 1 - row)), including the O piece, which is the same in all four states. All 28 states have four blocks.
- Authenticity limits: the Tetris Wiki is a community site and does not claim to be The Tetris Company. The page calls SRS the Tetris Guideline standard; that is the wiki's claim. The artifact was not checked against the Guideline itself, whose copy referenced in the blueprint (Appendix C1) is leaked and unauthenticated, and no second independent geometry source was fetched for this proposal. A page that can change is not the oracle; the fixed bytes with the checksum are.
- Why independent: it is external to soliskit/tetris-js, was not created from it, and my extraction does not use it. Agreement of this table with the implementation, if any, is not a reason for choosing it and is not examined here.

### A5. Geometry extracted from the artifact (box-relative (row, column))

    I (box 4x4):
      state 0: (1,0) (1,1) (1,2) (1,3)
      state 1: (0,2) (1,2) (2,2) (3,2)
      state 2: (2,0) (2,1) (2,2) (2,3)
      state 3: (0,1) (1,1) (2,1) (3,1)
    J (box 3x3):
      state 0: (0,0) (1,0) (1,1) (1,2)
      state 1: (0,1) (0,2) (1,1) (2,1)
      state 2: (1,0) (1,1) (1,2) (2,2)
      state 3: (0,1) (1,1) (2,0) (2,1)
    L (box 3x3):
      state 0: (0,2) (1,0) (1,1) (1,2)
      state 1: (0,1) (1,1) (2,1) (2,2)
      state 2: (1,0) (1,1) (1,2) (2,0)
      state 3: (0,0) (0,1) (1,1) (2,1)
    O (box 2x2):
      state 0: (0,0) (0,1) (1,0) (1,1)
      state 1: (0,0) (0,1) (1,0) (1,1)
      state 2: (0,0) (0,1) (1,0) (1,1)
      state 3: (0,0) (0,1) (1,0) (1,1)
    S (box 3x3):
      state 0: (0,1) (0,2) (1,0) (1,1)
      state 1: (0,1) (1,1) (1,2) (2,2)
      state 2: (1,1) (1,2) (2,0) (2,1)
      state 3: (0,0) (1,0) (1,1) (2,1)
    T (box 3x3):
      state 0: (0,1) (1,0) (1,1) (1,2)
      state 1: (0,1) (1,1) (1,2) (2,1)
      state 2: (1,0) (1,1) (1,2) (2,1)
      state 3: (0,1) (1,0) (1,1) (2,1)
    Z (box 3x3):
      state 0: (0,0) (0,1) (1,1) (1,2)
      state 1: (0,2) (1,1) (1,2) (2,1)
      state 2: (1,0) (1,1) (2,1) (2,2)
      state 3: (0,1) (1,0) (1,1) (2,0)

SHA-256 of the extracted table text (the lines above, without the four-space indent, as `srs_table.txt`): c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c.

### A6. Updated owner-choice package (nothing here is adopted)

An earlier package pasted from outside advisors recommended choices. Those are advice; the choices below remain the owner's.

| # | Choice | Options | Status |
| --- | --- | --- | --- |
| 1 | Lowest-row semantics | historical low with greatest occupied block row (A2) / adjacent-state | Needs the D16 amendment if historical low |
| 2 | Pause and the 15 allowance | P1, P2 or P3 (A3); C2 and C9 behavior | Owner interpretation; P1 needs one more D16 item |
| 3 | PLY-7 hold | H1 per lock cycle / H2 per piece | Owner interpretation; both fit D16 as approved |
| 4 | Ordinary game-over current piece | none / none or a retained piece satisfying PCE-6 | R1 bracket |
| 5 | Other game-over items | semantically absent / retained within the normal domain; absent means the model has no semantic value, with no duty to clear an implementation field | R1 bracket |
| 6 | Empty bag | valid / invalid / left to the transition decision | R1 bracket |
| 7 | SRS geometry | adopt the A4 artifact by checksum / another artifact / leave as an oracle dependency | Owner |
| 8 | Score domain and stored high score | integer 0 or more / also a multiple of 100 | R1 bracket |
| 9 | Full row; hold-used implies held piece | adopt / not adopted, individually | R1 bracket |
| 10 | Board cell | piece kind / color | R1 bracket |
| 11 | SAF-4 check scope | element validity / length | Later, at SAF-4 mapping |

## Part B. Draft D16 amendment text (DRAFT, NOT APPROVED)

Nothing in Part B is approved or applied. It describes an amendment to section 1.1 of the D16 decision for later review. It does not change the approved D16 artifact.

**Amendment 1 (conditional on the owner selecting the historical-low interpretation of PLY-6).** Section 1.1 gains an item: 15. The lowest row reached by the current falling piece, defined as the greatest board-row index occupied by any block of the piece since it became current, with rows increasing downward. The item exists while a current falling piece exists. It is initialized when a piece becomes current, as the greatest row occupied by that piece in its initial valid state. It never decreases while the piece is current. It is an authoritative item.

**Amendment 2 (conditional on the owner selecting P1).** Section 1.1 gains an item: 16. For a paused game whose current piece is resting, whether the pause consumed the last restart allowance. The item is meaningful only while paused. If the owner selects P2 or P3, this amendment is not made.

**Reset count.** The lock-delay reset count (item 9) is a whole number from 0 to 15. The rules for when it changes are not part of this amendment; they belong to the later valid-state and legal-operation text, after the owner has chosen.

**Unchanged.** Items 1 to 14, the derived items, the runtime resources, the persisted representation and the presentation state of D16 are not altered by these amendments. 
