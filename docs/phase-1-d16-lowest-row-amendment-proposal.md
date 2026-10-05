# Phase 1 proposal: D16 historical-low amendment, reset-limit boundary and SRS oracle candidate

Status: **PROPOSAL FOR REVIEW. Not a decision, not approved, not for merge.** It modifies nothing. The approved D16 artifact `docs/phase-1-state-decision.md` (SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182), `AUDIT.md` (D1 to D16), `REQUIREMENTS.md` and the R1 proposal at PR #52 are untouched. No R1 decision is recorded and no owner approval is requested.

Base: main 06d2a59aec07a7c80516f9975e627b09246cddae.

Independence (blueprint O8): the assistant that drafted this has read the production code. Nothing below is taken from production code or tests. It is still not independent of the implementation, and it judges the implementation against nothing.

## Part A. Review material

### A1. Why a D16 amendment is in question

PLY-6 says "reaching a lower row than before resets the count". Two readings were analyzed in the R1 proposal: an adjacent-state relation, and a historical-low reading. The owner asked for the historical-low reading to be drafted for review. It is a proposed owner interpretation. The owner has not selected it. The lowest row reached by the current piece is not computable from the board and the current piece. D16 section 1.1 item 9 lists the reset count only. Adding the lowest row reached therefore changes the approved D16 state list and needs a D16 amendment before it can be selected. This document drafts that amendment for review and does not apply it.

Supporting evidence, labeled by strength: the blueprint's Appendix C2 reports, from an unauthenticated copy of the 2009 Tetris Design Guideline, that the count resets when the piece falls one row below the lowest yet reached. This supports the reading and is not an authority for REQUIREMENTS.md. PLY-6's own words, "than before", do not by themselves decide between the readings. A consequence of the adjacent-state reading, stated as a possibility and not shown reachable in this game: a rotation or kick that lifts the piece, followed by a fall back to the earlier row, would reset the count repeatedly.

### A1a. Review history

Gemini objected that Part B Amendment 1 contained transition semantics (initialization and a never-decreases rule) that belong to the later valid-state and legal-operation text and not to the D16 state-category amendment. The objection was accepted. Initialization, update, monotonicity, reset-count effect and precedence rules remain review material in A2, for the later R1 and legal-operation text. Amendment 1 now adds only the authoritative state item and its snapshot meaning.

### A2. Input 1: the lowest-row reference

Proposed owner interpretation, for owner decision: the lowest row reached is the greatest board-row index occupied by any block of the current semantic piece. Rows increase downward.

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

Proposed definition for owner decision: the reset count is the number of restart allowances consumed since the most recent lowest-row reset, domain 0 to 15.

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
- **P4 (count-16 alternative, proposed by the owner for review; P1 above is unchanged).** Item 9 stays the sole reset-count item and its later R1 domain becomes 0 to 16. A pause with count 15 and a running delay records count 16, which marks exhaustion and is not a 16th restart. Full analysis in A3b.
- Previously labeled reviewer recommendation, not adopted and not shown sufficient: **P1**, because it keeps the literal STA-2 behavior for the legitimate 15th reset (resume starts a delay) without allowing a 16th restart (C7 still locks at once). It needs the extra D16 item and the persistence consequences in A3a. P2 is the alternative if no extra item is wanted. The owner has stated a preference for P4 over P1 if review finds P4 coherent; A3b reports that review. Every option rests on an owner interpretation, and the owner decides.

Resource check for B13 (running states): no additional authoritative game-state item is required for C2. D16 already places the lock-delay timer handle and state in the runtime resources. When C2 says the existing deadline continues, the existing scheduled firing and deadline remain part of that runtime-resource state. The exact timer representation and how it corresponds to elapsed time are later evidence questions. Under C7/P2 and C9 the piece locks at once on the transition that would otherwise start a delay, so no committed playing state has a resting piece at count 15 and no outstanding delay, and no state exists in which a delay must run and cannot. While paused, STA-2 leaves no running lock-delay resource. Runtime timer state therefore cannot distinguish the two paused/resting/count-15 states of C5 and C7. That is why P1 needs an authoritative item and not a resource.

### A3a. Persistence and legacy-save consequences (material, not resolved here)

Historical low affects future PLY-6 behavior: whether a later move reaches a new lowest row depends on the stored value. Under P1 the paused-state discriminator affects future behavior on resume. STA-4 says pausing saves the game and Continue restores exactly what was saved, paused. Consequence, stated as a requirement-derived [L] consequence: if either item is adopted into D16, a save newly written under the adopted semantics must preserve enough information to restore that item's semantic value exactly wherever the item applies (the lowest row for a current piece; the discriminator for a paused resting piece at count 15). Otherwise Continue could resume with future behavior different from the game that was saved.

The compatibility case is distinct. Saved games already represented in the released formats required by STA-6, including the released format STA-6 calls the current format, predate these semantic items. Their absence therefore cannot simply make those supported saves invalid. Loading them requires an explicit compatibility rule, because the missing historical information cannot in general be reconstructed exactly.

Compatibility problem from STA-6:

- The currently supported released save formats predate these items. STA-6 requires every supported format to keep loading, so rejecting a saved game only because the new fields are absent is not permissible.
- An old payload generally cannot reconstruct the historical-low history. The board and current piece give the current greatest occupied row only.
- For a paused, resting piece at count 15, an old payload also cannot tell whether the pause consumed reset 15 (C5) or occurred after exhaustion (C7).
- Missing historical information cannot be recovered exactly, so any rule for loading such a save is an owner interpretation or compatibility rule. This document does not choose a default.

Policies that could be analyzed, none adopted, each an owner interpretation / compatibility rule:

1. Initialize a missing lowest row to the current piece's greatest occupied row. Consequence: a piece that had already been lower and moved up gets extra restart room after loading, so behavior can differ from the uninterrupted game.
2. Choose a defined compatibility value for the P1 discriminator when it is missing (for example, treat the allowance as consumed, or as not consumed). Consequence: one of the two cases C5 or C7 is resumed wrongly for legacy saves at paused/resting/count 15.
3. Introduce a version-specific compatibility rule, so loads of saves in the released formats follow a stated rule and loads of saves newly written under the adopted semantics restore exactly. Consequence: a format-version distinction in the later save text.

STA-4 already states one precedent in kind: a save from before the bag was saved continues with a fresh bag. It is a precedent for a compatibility default, not a ruling on these items.

This issue must be resolved before the final R1 and save-validity text can be approved. R2/R4 storage ordering and failure behavior are not resolved here.

### A3b. Alternative P4 (count-16), review only, not adopted

P4 is a separately named alternative. It does not change the meaning of P1 above. It remains a proposed owner interpretation resolving a boundary interaction between PLY-6 and STA-2. This review does not claim it is forced by the requirements.

**Proposed semantics, for owner decision.**

1. D16 item 9 remains the sole lock-delay reset-count item. No second authoritative item is added (P1's item 16 is not needed).
2. Its later R1 domain becomes 0 to 16, conditional on selecting P4.
3. The values 0 to 15 count reset events through the legitimate 15-reset allowance.
4. A pause during a lock delay counts as one reset (STA-2). If the count is already 15, the paused, resting state is recorded as count 16.
5. Count 16 does not represent a 16th restart allowance. It marks "the allowance was already used when the pause happened".
6. Resume from paused, resting, count 15: the 0.5 s delay starts. Resume from paused, resting, count 16: the piece locks at once, with no further restart.
7. Reaching a new lowest row resets the count to 0 (C4), including from 15 or 16 where applicable.
8. C2 and C9 stay as drafted in the table above.

Because D16 item 9 states no domain, "0 to 16" is a later R1 domain, not a D16 amendment. The definition in A3 ("number of restart allowances consumed ... 0 to 15") would be replaced under P4 by "number of reset events counted since the most recent lowest-row reset, 0 to 16, where 16 marks a pause taken after the 15 were used".

**Cases under P4.**

| Case | State before | Event | Result under P4 |
| --- | --- | --- | --- |
| P4-1 | count < 14, resting, delay running | pause | count + 1; resume starts the delay (C6) |
| P4-2 | count 14, resting, delay running | pause | count 15; resume starts the delay (C5) |
| P4-3 | count 15, resting, delay running (C2) | pause | delay canceled; count 16; resume locks at once (C7) |
| P4-4 | paused, resting, count 15 | resume | delay starts (the 15th restart) |
| P4-5 | paused, resting, count 16 | resume | lock at once; no restart |
| P4-6 | count 15, delay canceled by C3, not resting | pause | no reset (C8); count stays 15; paused, not resting. Resume keeps falling; a later rest locks at once (C9) |
| P4-7 | count 16 | any playing event | not applicable: see validity below |

**Why this separates C5 from C7 without a second item.** After the pause in C5 the stored count is 15; after the pause in C7 the stored count is 16. The two paused states differ in item 9 itself, so the future behavior on resume is a function of the semantic state. This is also true of reachability: a paused, resting, count-15 state can only come from a pause at count 14 with a delay running, because every playing resting state at count 15 has a running delay (C2, C9) and a pause there records 16. So no paused, resting, count-15 state comes from an exhausted allowance.

**Where count 16 may exist.** Count 16 is needed only to separate "exhausted at the pause" from "15th restart still owed" for a paused game whose current piece is resting. The proposed validity condition is: count 16 is valid only when the game is paused and the current piece is resting. It is not valid in any playing state: resume from 16 locks at once, so no committed playing state holds 16 (consistent with the B13 resource check above: no playing state exists in which a delay must run and cannot). It is not valid for a paused piece that is not resting (P4-6 keeps 15). It is not valid with no current falling piece. This condition is a new validity constraint on item 9 for the later valid-state text; P1 would need an equivalent applicability constraint on its discriminator.

**Compatibility with the four requirement phrases.**

- PLY-6 "at most 15 times". Compatible if "restart" means a restart of the delay. Delay restarts happen at counts 1 to 15 (including the resume at count 15 in P4-4); no delay restart follows from count 16. The count domain has 16 values of "reset events", so the sentence is read as about delay restarts, not about the number stored. That reading is an owner interpretation.
- PLY-6 "once the 15 are used, landing locks at once". Compatible at count 16 and at C9. Reading P4-4 (resume at count 15 starts the delay) as consistent requires reading the 15th use as the delay that the resume starts; that is the same owner reading as C5.
- STA-2 "counts as one reset". Satisfied literally: every pause during a lock delay changes the count by one, including 15 to 16. Count 16 is a counted reset that does not grant a restart.
- STA-2 "resuming starts it again". Satisfied for counts below 16 (P4-1, P4-2, P4-4). Not satisfied at count 16, where resume locks at once. This is the same corner in which P2 departs from STA-2, now limited to a pause taken after the 15 were used. Under P1, C7 also locks at once on resume, so P1 and P4 depart from the same literal words in the same case (C7). The difference between P1 and P4 is where the distinction is stored, not the behavior.

**Honest comparison with P1.** P1 and P4 give the same behavior in every case. P4 stores the distinction inside item 9 by giving the count a seventeenth value (0 to 16). P1 stores it in a separate item. The information needed is the same one extra distinction in either; neither is "free". P4 avoids a second authoritative item, but it changes item 9's meaning from restart allowances consumed to reset events counted, adds the validity constraint on 16, and makes 16 depend on the pause rule (a count of 16 cannot be reached by any move or rotation). The question for the owner is which representation determines all required future behavior from the semantic state with the least additional authority. Mutation-testing convenience is not a reason for either choice. Mutation tests could later test the selected semantics, but they are not authority for the state model.

**Persistence under P4.** A save newly written under the adopted semantics must preserve the exact lowest row and the exact reset count, including 16 where applicable (A3a). If P4 is selected, the separate P1 discriminator and its legacy-missing-field compatibility choice do not exist.

### A3c. Legacy-save compatibility analysis (proposed rules, analyzed and not adopted)

Two version-specific compatibility rules are proposed for owner review. They apply only to saved games already represented in the released formats required by STA-6, which predate the lowest-row item and the P4 count 16. Saves newly written under the adopted semantics are not affected: they must preserve the exact lowest row and the exact reset count, including 16 where applicable.

- **L1.** A released supported save lacking the lowest row initializes it to the current semantic piece's greatest occupied row.
- **L2.** A released supported save with reset count 15 and no information allowing C5 or C7 reconstruction is interpreted under the legacy-load rule as the C5-compatible state: resume starts the delay.

Both are deterministic compatibility defaults. Neither reconstructs the unknowable history of the saved game, and neither claims to. They are owner interpretations / compatibility rules.

Consequences:

- L1: a piece that had already been lower than its current row and moved up gets restart room after loading that the uninterrupted game would not have, so behavior can differ from the uninterrupted game. If the piece is at its lowest row the default is exact. A released save cannot show which case applies.
- L2: the ambiguity exists only for a paused, resting piece at count 15. If the save came from a pause at count 14 (C5) the default is exact. If it came from a pause with the allowance already used (C7 origin), the default grants one delay that the exhausted-allowance reading would not. Released saves at count 15 with a piece that is not resting, or at counts other than 15, have no such ambiguity. L2 never produces a count of 16 from a legacy save. It maps to the existing value 15 and a delay.
- L2 is stated for P4 and for P1. Under P4 the choice is exactly this one: there is no discriminator field to default. Under P1 the same default is the value given to the missing discriminator. Under P2 and P3 L2 is not needed.
- A released save is accepted under STA-6; neither rule makes it invalid. Whether a legacy-loaded value later saves in the new format is decided in the later save-validity text and is not resolved here. R2/R4 storage ordering and failure behavior are not resolved here.

### A4. Input 3: SRS geometry oracle candidate

Candidate artifact: the image `SRS-pieces.png` from the Tetris Wiki.

- Source: https://tetris.wiki/images/3/3d/SRS-pieces.png (file description https://tetris.wiki/File:SRS-pieces.png, used on https://tetris.wiki/Super_Rotation_System). The wiki's API reports the file as imported 2015-12-23 and gives a SHA-1 of 78119b4e42316cc61597a21e51bfb1c02838a39b.
- Bytes: 1218 bytes, PNG, 336 by 480 pixels. SHA-256 5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236 (and SHA-1 as above, matching the wiki's report). Fetched 2026-10-04.
- Frozen copy: the Internet Archive holds a capture of the same URL (https://web.archive.org/web/20260627160739id_/https://tetris.wiki/images/3/3d/SRS-pieces.png). Its bytes are identical to the live file (same SHA-256, byte comparison). The proposal adopts the bytes by checksum. The exact retention route (committing the file under `docs/sources/` in a later approved change, or relying on the archive capture) is an owner choice and is not done here.
- O piece: the image shows four identical geometries for O. They do not independently establish semantic non-rotation. PCE-4 independently requires that the O piece does not rotate. An adopted geometry artifact may define O's occupied geometry, while the normative one-state/non-rotation rule comes from REQUIREMENTS.md and not from inference from the four identical image columns.
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

An earlier package pasted from outside advisors recommended choices. Those are advice. The choices below remain the owner's. Where the Status column says "proposed by the owner for review", the owner stated the choice for analysis and has not adopted it.

| # | Choice | Options | Status |
| --- | --- | --- | --- |
| 1 | Lowest-row semantics | historical low with greatest occupied block row (A2) / adjacent-state | Proposed by the owner for review: historical low, occupied block row. Needs the D16 amendment (Amendment 1) |
| 2 | Pause and the 15 allowance | P1 (extra item), P2, P3, P4 (count 0 to 16) (A3, A3b) | Owner interpretation. P4 proposed by the owner for review, preferred over P1 if coherent; A3b finds the behavior identical to P1 with the distinction stored in item 9. P1 was the earlier reviewer recommendation. Not adopted |
| 2a | C2 and C9 behavior | as drafted in A3 / other | Proposed by the owner for review: as drafted. Owner interpretation |
| 3 | PLY-7 hold | H1 per lock cycle / H2 per piece | Proposed by the owner for review: H1. Owner interpretation; both fit D16 as approved |
| 4 | Ordinary game-over current piece | none / none or a retained piece satisfying PCE-6 | Proposed by the owner for review: no semantic current piece. R1 bracket |
| 5 | Other game-over items | semantically absent / retained within the normal domain; absent means no semantic value, with no duty to clear an implementation field | Proposed by the owner for review: semantically absent, no duty to clear implementation residue. R1 bracket |
| 6 | Empty bag | valid / invalid / left to the transition decision | Proposed by the owner for review: valid. R1 bracket |
| 7 | SRS geometry artifact | adopt the A4 image by SHA-256 / another artifact / leave as an oracle dependency | Proposed by the owner for review: the frozen TetrisWiki image by SHA-256 (candidate, external, independent of production code, community source). O non-rotation comes from PCE-4, not from the image |
| 7a | Extracted geometry table | adopt the A5 table by SHA-256 / re-extract / none | Proposed by the owner for review: the A5 table by SHA-256 (extraction provenance in A4). Not adopted |
| 8 | Score domain and stored high score | integer 0 or more / also a multiple of 100 | Proposed by the owner for review: whole number 0 or more, no multiple-of-100 predicate. R1 bracket |
| 9 | Full row; hold-used implies held piece | adopt / not adopted, individually | Proposed by the owner for review: no full-row snapshot invariant and no hold-used implies held-piece invariant. R1 bracket |
| 10 | Board cell | piece kind / color | Proposed by the owner for review: piece kind. R1 bracket |
| 11 | SAF-4 check scope | element validity / length | Later, at SAF-4 mapping |
| 12 | Legacy-save default for a missing lowest row | L1: current greatest occupied row / other / version-specific rule (A3c) | Proposed by the owner for review: L1. Deterministic compatibility default, not exact reconstruction. Owner interpretation / compatibility rule; must precede final R1 and save-validity text |
| 13 | Legacy-save default for a paused, resting, count-15 save | L2: resume starts the delay / lock at once / other (A3c) | Proposed by the owner for review: L2 (resume with delay). Same status as 12. Under P4 there is no discriminator field to default; under P1 L2 supplies the missing discriminator |

## Part B. Draft D16 amendment text (DRAFT, NOT APPROVED)

Nothing in Part B is approved or applied. It describes an amendment to section 1.1 of the D16 decision for later review. It does not change the approved D16 artifact.

**Amendment 1 (conditional on the owner selecting the historical-low interpretation of PLY-6).** Section 1.1 gains an item: 15. The lowest row reached by the current falling piece, represented as the greatest board-row index reached by any block of that piece during its current-piece lifetime, with rows increasing downward. The item exists while a current falling piece exists and is authoritative.

**Amendment 2 (conditional on the owner selecting P1).** Section 1.1 gains an item: 16. For a paused game whose current piece is resting, whether the pause consumed the last restart allowance. The item is meaningful only while paused. If the owner selects P2 or P3, this amendment is not made.

**Reset count.** The lock-delay reset count (item 9) remains the lock-delay reset-count item. Its domain and the rules for when it changes are not part of this amendment; they belong to the later R1 and legal-operation text, after the owner has chosen.

**Unchanged.** Items 1 to 14, the derived items, the runtime resources and the presentation state of D16 are not altered by these amendments. These amendments do not rewrite the persisted representation of D16. If the added items are part of the game state, a save newly written under the adopted semantics must preserve enough information to restore their semantic values exactly wherever they apply. Saved games already represented in the released formats required by STA-6, which predate these items, cannot simply be made invalid by the absence of the new values; how they load requires an explicit compatibility rule decided in the later save-validity text. 
