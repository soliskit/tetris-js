# Phase 1 record: reading of DSP-5 for Continue availability, and provenance note for D29

Status: record recorded by ledger row D30 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: D20 (`docs/phase-1-d16-amendment-2.md`: item 16, the withdrawn-from-Continue indicator, and Continue availability), D21 S9 (`docs/phase-1-r2-r5-decision.md`) and D25 row 9 of the conflict register (`docs/phase-1-property-mapping.md`). This file changes no bytes of any of them and does not edit `REQUIREMENTS.md`.

## Part 1. Reading of DSP-5

**P1. Reading.** DSP-5 reads: "The score, high score, buttons and hints always match the game state, including changes made in another tab." For this audit, DSP-5 is read in full, with one exception that the owner already decided (D25 row 9): Continue availability in a session follows item 16. Item 16 is set when this session withdraws the saved game from Continue or attempts to, and is cleared when the session starts (a reload) and when this session writes a saved game successfully (D21 S9). While item 16 is set, Continue is unavailable in this session even if another tab saves a game. A session does not track other sessions. DSP-5's other obligations are unchanged.

**P2. What this does not do.** It does not change `REQUIREMENTS.md`. Whether the requirement text should later be edited to state the exception, and the class of such an edit, stay undecided. If the edit is made, its class depends on whether the game already behaves as P1 reads; that has not been checked here. This reading creates no claim that the game behaves as P1 says.

## Part 2. Provenance note on D29

D29 records what the owner chose: not to assume the clock is accurate or steady, and to test clock jumps (reply "Go with option 2", phonemsg-01M46891V9W4EXVV218BTXQPGT). The words "forward and backward" in D29 K2 are the audit's scoped test elaboration of that choice, not words the owner used. The question he answered named a forward jump while a page loads (phonemsg-01M4684EC8RN7KM05S264DGPGY). D29 is not edited. This note adds no accuracy guarantee and no requirement.

## Not decided here

- Any change to REQUIREMENTS.md and any code change.
- Closure of the Phase 1 exit item on DSP-5 or on any other exit item.
