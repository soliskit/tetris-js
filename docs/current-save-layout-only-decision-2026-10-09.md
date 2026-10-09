# Supporting only the current save layout

## Decision

The target game supports only its finalized current save layout. Old-layout saves are refused, even when their gameplay contents would otherwise be valid. There is no one-time conversion or legacy-default fallback in that target reader. Every current save is validated whole; a malformed current save is not turned into legacy data. Current-layout saves preserve exact reset count and lowest-row history going forward under the existing selected meaning.

This replaces the earlier convert-once direction, including conversion of undatable preexisting saves and the earlier old-history and default preservation work as a target compatibility plan. Literal fields and routing names remain unfinalized. The labeled-format decision was unchanged by this selection and was settled separately the same day (D59): the finalized current schema carries no dedicated format label.

Old saved positions may become unavailable to Continue: board, score, pieces, bag and progress, not only the high score. The high score is separate and is not erased by this compatibility choice. The existing high-score ceiling, invalid-repair and only-higher rules remain. Refusal does not authorize deleting stored bytes or clearing storage. Whether refusal of otherwise-valid old-layout content changes persisted eligibility is a separate unresolved owner decision; such records are not silently classified as malformed content under the generic invalid-withdrawal rule. Resolved by D60: present, successfully read content that fails the finalized current layout and validation triggers ordinary withdrawal; stored payload bytes are not deleted.

This is a selected target, not implemented behavior. The current adopted STA-4/STA-6 requirement contract is unchanged, and implementation is unchanged, until a separately authorized paired behavior-and-requirement change. The contract is not evidence that the implementation meets it. Historical fixtures, charters, findings, source hashes and bounded evidence remain preserved as history.

## Decision record

The owner approved current save layout only. This records the decision and its scope, not approval of final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.
