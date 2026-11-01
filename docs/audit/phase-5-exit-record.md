# Phase 5 exit record

Read-only record. No code, test, requirement or CI change. Prepared by the auditor; enters the repository through the usual docs review gates.

This record assembles the historical evidence for each Phase 5 exit check as the records stood when the audit stopped. It records no check as passed and claims no exit eligibility: the exit checks were never recorded as passed, and the October records stand as recorded (the Oct 28 reset was queue-scoped: it canceled unfinished queue items and did not erase repository records). Whether Phase 5 may be recorded closed remains a decision for the owner. The blueprint and the records it cites were retired from the working tree on October 31, 2026 (PR #442); they are cited here at commit 1354e77, their last state in git history.

## Exit check 1: every finding has one finding status

Evidence as recorded. The finding universe is 55 unique findings, derived by enumeration: the decisions-register's 41 rows (F1-F20, F24-F39 base rows plus sub-rows F28b, F32b, F32c, F32d, F32e) and 14 non-register findings from phase-5-records.md and phase-5-exit-reconciliation.md (F21, F22, F23, Q1, Q2, Q3, L1, N1, P7, S5, Row 4, Row 7, Row 26, Row 68). The retired crosswalk's count of 53 (44 + 8 + 1) predates register rows F38 and F39, added October 24, 2026. The blueprint's per-finding appendix adds no finding outside the 55, and the phase-4 domain work ledger introduces none. Each of the 55 carries a last recorded status word in the register and phase-5 records cited above. Most words are blueprint 5.1 statuses or scoped variants of them. Three words were not on that scale: F8's "Documented limitation of unverified premise", the register-era "Settled" on F24, F26, F27, F36, F38 and F39, and "Pending work" on F28b, F32b and F32c. The retired crosswalk treated the register's October 23-24 disposition paragraphs as not adopted; this record relies on them as the adoption record. On November 1, 2026 the owner adopted words for the first two: F8 is Rejected (no break was shown on a supported platform; the recorded macOS key-release mechanism and its limits stay beside the status), and F24, F26, F27, F36, F38 and F39 are Fixed, each keeping its recorded evidence and limits beside the status: F24 fixed by #192 and re-checked with an independent run in #304; F26, F27 and F36 fixed October 25, 2026 in #399 within their stated bounds (F26's bounds exclude native-browser measurement; F36 keeps a documented re-read/delete window in public/sw.js); F38 and F39 fixed by #296. "Pending work" on F28b, F32b and F32c remains unadopted, an open owner decision, so this check is still not recorded as passed. No reconfirmation of the October dispositions is requested: the Oct 28 reset was queue-scoped - it canceled unfinished queue items and did not erase these records.

## Exit check 2: every property one certification status; none Not Assessed

Evidence as recorded. phase-5-certification-record.md records O1 to O8 each Partially Established from evidence batch 9, with the batch's stated limits, and states no property is Not Assessed. Each of the 55 in-scope requirements carries a certification status in the same record, which dates the owner's approvals for the Not Established recordings to October 22, 2026 (the record's own dating; not independently re-verified against the channel here).

## Exit check 3: no Candidate except item 26 under its approved limit

Evidence as recorded. The crosswalk's section 4 sweep found item 26 (the iPhone double-tap zoom report) the only recorded Candidate in the 53-finding universe of its day; the two register rows added October 24, 2026 (F38, F39) both carry register-era "Settled", not Candidate, so the recorded Candidate set remains item 26 alone. The exception was owner-approved October 22, 2026 through the ask's own two-step: the drafting pick "2" at 11:37:35 AM and the separate merge yes "1" at 12:01:28 PM, with the merge reported at 12:23:04 PM; the clause stands in the retired blueprint (line 473, D78). Item 26's current home is GitHub issue #339.

## Exit check 4: Requirement Clarifications

Evidence as recorded: none produced (phase-5-exit-reconciliation.md, section 3). Whether that suffices is an open owner decision, not decided here; no reaffirmation route is assumed.

## What this record does not do

It records no closure and no pass, and it claims no correction, certification finality, property strengthening, or current authority for the recorded statuses. Confirmed defects stay open for Phase 6, each needing an owner-approved minimal correction: the serialization-swallow defect, the remaining lock-delay-history scope (issue #371), the holed-board invariant gap watched by the known-defect todo test (issue #358), and any further defects the pending per-row mapping of the 61 open issues confirms. Item 26 stays Candidate until a real-Safari run. Phases 6 to 10 keep their own gates.
