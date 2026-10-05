# Phase 1 candidate: D16 amendment (lowest row reached)

Status: **CANDIDATE normative amendment text, for fidelity review. Not approved, not adopted, not recorded in `AUDIT.md`, not for merge.** It modifies nothing. The approved D16 artifact `docs/phase-1-state-decision.md` (SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182) and `AUDIT.md`, `REQUIREMENTS.md`, the blueprint and the R1 proposal at PR #52 are untouched. This file is a candidate for a separate amendment decision. The owner's drafting permission is not approval of this exact text.

Base: main.

Independence (blueprint O8): the assistant that drafted this has read the production code. Nothing below is taken from production code or tests. It is still not independent of the implementation.

## Part A. Review material

### A1. Source of the selection

The owner selected the historical-low interpretation of PLY-6 (lowest row reached, measured as the greatest occupied block row) and the count-16 pause semantics (P4), on October 4, 2026. The proposal that analyzed both is PR #53, `docs/phase-1-d16-lowest-row-amendment-proposal.md`. The selection and permission to draft are not an approval of this text.

### A2. What this amendment does and does not do

- It adds one authoritative state item, the lowest row reached. The reset count stays the only lock-delay reset-count item. Under the selected P4, no second item is added.
- It states no domain for the reset count. The 0 to 16 domain, the meaning of 16 and where 16 is valid belong to the R1 candidate.
- It states no initialization, update, monotonicity, reset-count effect or precedence rule. Those belong to the later R1 and legal-operation text. A review objection on PR #53 that an earlier draft of Amendment 1 contained such rules was accepted, and they were removed.
- It states the persistence consequence of a new authoritative item, because D16 section 1.4 lists the saved game and STA-4 and STA-6 constrain it. It does not rewrite D16 section 1.4 and does not decide R2 and R4 storage ordering or failure behavior.

### A3. Resulting section 1.1 (for review only)

If the amendment were adopted, section 1.1 would list items 1 to 14 unchanged and then:

15. The lowest row reached by the current falling piece.

## Part B. Candidate amendment text (DRAFT, NOT APPROVED)

Nothing in Part B is approved or applied. It describes an amendment to section 1.1 of the D16 decision.

**Amendment.** Section 1.1 gains an item: 15. The lowest row reached by the current falling piece, represented as the greatest board-row index reached by any block of that piece during its current-piece lifetime, with rows increasing downward. The item exists while a current falling piece exists. It is authoritative game state.

**Reset count.** Item 9, the lock-delay reset count, remains the only lock-delay reset-count item. This amendment adds no other item for the lock delay or for pausing.

**Persistence.** A save newly written under the adopted semantics must preserve enough information to restore the semantic value of item 15 exactly wherever the item applies. Saved games already represented in the released formats required by STA-6 predate item 15. Their absence of the item cannot by itself make those supported saves invalid. How they load is decided by a compatibility rule in the later save-validity text.

**Unchanged.** Items 1 to 14, sections 1.2 to 1.5 and sections 2 to 10 of D16 are not altered by this amendment. Section 1.1 continues to place every item of modeled authoritative game state in section 1.1.
