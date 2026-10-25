# Test migration: full seed-gate rerun and deviation scope items (D52)

October 24, 2026. This record covers the three items required before the
migration go is presented: the full 200-seed rerun of the l1-clear-after gate,
the named deviation scope items with their trace bounds, and the correction to
the approval paragraph's check count.

## 1. Full seed-gate rerun (the remaining 180 seeds)

The Charter's recovered-scripts row recorded a 20-seed sample (80 trials) and
noted the original 200-seed scope was not rerun in full. This rerun closes
that: the verbatim `l1-clear-after-harness.mjs` from
`docs/tetris-audit/test-migration-provenance/` was run at the full scope,
seeds 1 to 200 with clear sizes 1 to 4 - 800 trials, which includes the
sampled 20.

Result: 800 trials, 0 failures, 0.63 s, node v22.23.3, against main at
48f4c840 (after the F20 fix). The run's log hashes to
`8c7d672472a24bf97c7ee58e95e366a22f604ab30e2cc5a86d1032739c2a81f4`, identical
to the `raw-clear-after.log` checksum recorded in `SHA256SUMS.txt` for the
original October run: the full-scope rerun reproduces the original log byte
for byte.

Deviation used by the rerun (one): the harness's imports were rebound from
the scratch tree its header names (`/tmp/t` at commit 06a43a9, no longer
present) to the repository checkout at 48f4c840; the log path was kept
verbatim. The byte-identical output hash shows the rebind changed nothing the
harness observes.

Node-version limit: the rerun ran on node v22.23.3 (indicative; the
repository asks for node 26+ and CI is authoritative). The identical hash
against the original run, which recorded the same node version in its first
line, is the comparison of record.

## 2. Deviation scope items (named, with trace bounds)

Every deviation of the migrated tests from the verbatim scripts, restating
the migration pull request's deviation list as named scope items with their
trace bounds stated. The S- labels are local to this record, not register
decision numbers.

- S-IMPORTS (all five ports): repository-relative imports replace scratch
  paths, `node --test` / Playwright assertions replace console output and log
  files, and the "outside the repo" comment lines are gone. Trace bound:
  assertion logic is verbatim; for l1-clear-after the byte-identical
  full-scope log (section 1) demonstrates the import and output changes alter
  nothing the checks observe.
- S-TRACE-BOUND (`l1-trace.test.js`): bounded to 500 locks per seed where the
  replacement runs went to 3,738. Trace bound: CI time and determinism; the
  bound is stated in the test file.
- S-SCORE-FIELD (`d74-f21-f22-p7.test.js`): the F22 check sets the writable
  score field instead of the removed level setter, and the file is split into
  three cases so only F21 carries the todo mark. Trace bound: the gravity
  formula assertion is unchanged; F22 and P7 gate, F21's mark names D74.
- S-N1-FORM (`d74-N1.test.js`): assertions added from the blueprint's N1
  checkpoints beyond the script's printed lines (fault report count, no
  dangling timers, recovery path). N1 is recorded as Rejected, set from a
  run (D74, D75); the test ships in must-pass form as a guard for that
  reading (the owner chose must-pass on October 22, 2026).
- S-TOUCH-HARNESS (`f28-touch-lift.spec.js`): no `window.__g` hook;
  `@playwright/test` and the repo's saved-game helpers replace
  `playwright-core` and the hand-started server; rotation is detected by the
  piece's rendered shape instead of counted rotate actions. Trace bound: the
  no-hook reading follows the test file's own header comment, as that comment
  states it; the Chromium phone project scope matches the finding.

## 3. Approval paragraph check-count correction

The Charter's approval-requested row says "the two line-clear checks run as
ordinary gating tests; only the defect checks are todo-marked". The count
understates the gating set: five migrated checks run as ordinary gating
tests - the two line-clear checks, the N1 reading, and the settled F22 and
P7 checks. Only the open-defect checks carry marks: F21 is todo-marked
(node --test) and F28 is marked expected-failure (Playwright test.fail)
while their defects are open. The row's wording should name the five gating
checks instead of the two.
