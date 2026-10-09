# Phase 1 decision: R2, R3, R4 and R5

Status: decision text recorded by ledger row D21 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: D16 (`docs/phase-1-state-decision.md`, SHA-256 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182), D16 Amendment 1 (D17), the R1 decision (`docs/phase-1-r1-decision.md`, D18, SHA-256 aacf5189a6aa3b21660e8bfe1a5bf8ab2d62f8e853df3febaa54d81412707dec) and D16 Amendment 2 (`docs/phase-1-d16-amendment-2.md`, ledger row D20), whose items 16 (section 1.1), 5 (section 1.2) and 3 (section 1.4) this text uses. None is changed by this file.

## Decision text

**S1. Meaning of forgetting (R2).** "Forgets the saved game" in STA-1 and STA-3 means withdrawing the saved game from Continue. Deleting its stored bytes is not required. Withdrawn data may remain stored.

**S2. When withdrawal happens (R2).** The saved game is withdrawn when a New Game is confirmed and when normal game over occurs, meaning a new or held piece has no room (STA-3). A later error does not undo a withdrawal that has been made.

**S3. Compatibility with SAF-3 (R2).** STA-3 applies to normal game over. SAF-3 applies when the engine throws, and keeps the last good save (S6). The two have different triggers and do not conflict. A fault stop by itself does not withdraw the saved game.

**S4. Failed withdrawal (R4).** If writing a withdrawal fails, the game continues. In the running session the previous saved game is not offered by Continue (item 16 is true). After a reload nothing is promised: the previous saved game may be offered again. No retry mechanism and no new save format are required.

**S5. Failed save (R4).** If saving the current game fails, the previous saved game is withdrawn from Continue. If that withdrawal also fails, S4 applies.

**S6. Last good save (R4).** A saved game that was written successfully with valid content (R1, B16) is the last good save even if the same step later faults. It is not rolled back, consistent with D16 section 7 item 1. On a fault stop the last good save is kept.

**S7. Failed read (R4).** A failed read of storage, as opposed to stored content that is invalid, may make the saved game unavailable to Continue. A failed read does not by itself withdraw the saved game and does not change any stored value. Stored content that is invalid is rejected whole and withdrawn, as before (SAF-1). Nothing is promised about when the saved game becomes available again after a failed read.

**S8. Definitions (R4).** The saved-game eligibility indicator is eligible only for the exact stored value "true" (D16 Amendment 2, item 3 of section 1.4). A stored high score is good when it is a whole number from 0 through 9,007,199,254,740,991, with no divisibility condition; otherwise it counts as zero (R1, B16). The later stored-score ceiling replaces the original unbounded S8 domain; see the current amendment in AUDIT.md.

**S9. Item 16 lifetime (R4).** Item 16 is set when a saved game is withdrawn from Continue or a withdrawal is attempted. It is cleared when the session starts and when this session writes a saved game successfully. A session does not track other sessions: item 16 in a session stays set even if another session saves a game.

**S10. Gravity timing (R3).** PLY-2 is judged against the delay the game requests from its scheduler, compared with max(0.25, 0.7 - 0.02 x (level - 1)) seconds (R1, B14) expressed in milliseconds, with an absolute tolerance for numerical rounding. The tolerance is 0.000000001 millisecond. The claim covers the value requested. Conversion of that value by the browser, actual elapsed time, lateness and throttling are not claimed. Whether timer registration and cancellation are inside the trusted boundary remains a separate Phase 1 item.

**S11. Hand-edited persisted state (R5).** Persisted state that was edited by hand is judged only by the untrusted-input rules: it is accepted whole if it is valid under R1 (B16), otherwise rejected whole. Gameplay requirements such as PLY-7 govern the play the game itself produces. They are not applied to the history of an accepted saved game, and no claim is made that an accepted state could be reached by legal play. No check that a result was earned through play, no anti-cheating protection and no tamper protection is claimed.

## Not decided here

- The observable criterion for "fault reported" (SAF-3, SAF-5).
- The meaning of "timer" for SAF-4.
- Any change to REQUIREMENTS.md, including whether S1 to S11 should become requirement text, and the class of any later change.
- Any code change. Some of S4, S5, S7 and S9 may differ from how the code behaves today; that is a later separate decision with its own tests and approval.
