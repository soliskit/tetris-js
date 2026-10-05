# Phase 1 decision: D16 Amendment 1 (lowest row reached)

Status: decision text recorded by ledger row D17 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code.

Baseline: the approved D16 decision, `docs/phase-1-state-decision.md` (SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182). Its bytes are unchanged. This file adds to section 1.1 of D16 and alters nothing else in it. The authority for the Phase 1 state model is D16 together with this amendment.

## 1. Amendment

Section 1.1 of D16 gains an item:

15. The lowest row reached by the current falling piece, represented as the greatest board-row index reached by any block of that piece during its current-piece lifetime, with rows increasing downward. The item exists while a current falling piece exists. It is authoritative game state.

## 2. Reset count

Item 9 of D16, the lock-delay reset count, remains the only lock-delay reset-count item. This amendment adds no other item for the lock delay or for pausing.

## 3. Persistence

A save newly written under the adopted semantics must preserve enough information to restore the semantic value of item 15 exactly wherever the item applies. Saved games already represented in the released formats required by STA-6 predate item 15. Their absence of the item cannot by itself make those supported saves invalid. How they load is decided by a compatibility rule in the later save-validity text (R1, B16).

## 4. Scope

- It adds one authoritative state item, the lowest row reached.
- It states no domain for the reset count. The domain 0 to 16, the meaning of 16 and where 16 is valid belong to the R1 text.
- It states no initialization, update, monotonicity, reset-count effect or precedence rule for item 15. Those belong to the R1 text and the later legal-operation text.
- It does not rewrite D16 section 1.4 and does not decide R2 and R4 storage ordering or failure behavior.

## 5. Unchanged

Items 1 to 14 of D16, sections 1.2 to 1.5 and sections 2 to 10 of D16 are not altered by this amendment. Section 1.1 continues to place every item of modeled authoritative game state in section 1.1.
