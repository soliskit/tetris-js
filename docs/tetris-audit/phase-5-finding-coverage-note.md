# Phase 5 finding-coverage note

Read-only record. No code, test, requirement or CI change. Prepared by the auditor; enters the repository through the usual docs review gates.

## Question

`phase-5-closure-record.md` records one coverage question over exit checks 3 and 4: whether the named-source union's 53 finding IDs cover every finding the exit criterion means. This note answers it at token level against `main` at 3c6653f68cf767a9105ad257d7382603949fd792.

## Method

- Enumerated finding identifiers in each named source: the DECISIONS.md findings register (both tables; 33 + 6 = 39 rows, matching the crosswalk's stated 39), `phase-5-records.md` sections 2, 3A and 3B, and `phase-5-exit-reconciliation.md` section 1.
- Swept every tracked text file at this commit for finding-shaped tokens in the families the crosswalk's union uses: F-numbers (F1 to F37, including the F28a/F28b and F32a to F32e parts), Q1, Q2, Q3, N1, P7, L1, S5, and the numbered rows 4, 7, 26 and 68. Binary files were excluded.
- Checked for any higher-numbered F-finding (F38 or above): none found in tracked text at this commit.
- Reconciled the crosswalk's stated 53 against its own tables: section 1 has 44 rows (33 F-form findings and 11 non-F family items: N1, P7, Q1, Q2, Q3, L1, S5, and rows 4, 7, 26 and 68), section 2 has 8, section 3 has 1 (F19); 44 + 8 + 1 = 53. The union's F-form findings total 42 (33 + 8 + 1) and its non-F family items total 11. Bare family references F28 and F32 in the Phase 5 records fold into F28a/F28b and F32a-F32e and add no rows.

## Findings

- Every finding token of the swept families found in tracked text at this commit is inside the crosswalk's 53 IDs. The single out-of-union match, "F04i", is a sha512 integrity fragment in `package-lock.json` (line 463), not a finding.
- F34 appears both as a register row in the second table (Status: Pending work) and in the disposition narratives; its section-5.1 word is the crosswalk's proposed mapping, not adopted. It is already one of the twelve open items named in the closure record.
- F19 is one known status source outside the named union: its current status record sits in the blueprint's carried-forward finding record, as the crosswalk already records. This note does not review where every status word lives; that is a separate question from identifier coverage.

## Limits

Token-level sweep of the declared families over tracked text files at this commit only. Binary files, deleted files in git history, and unnumbered defects are outside the method. The answer covers identifier coverage for the swept families, not the completeness of all possible identifiers, and not whether any status word is current.
