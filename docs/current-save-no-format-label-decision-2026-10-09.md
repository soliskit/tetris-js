# No dedicated format label in the current save layout

## Decision

The finalized current save schema has no dedicated format label member. The target reader accepts only records denoting the exact finalized current schema, validates each accepted record whole, and refuses all nonmatching records whole without an old-layout or default fallback. This supersedes the earlier-morning selection of a labeled new layout. The current-layout-only choice (D58) remains; exact reset-count and lowest-row history remain required, and the actual field names and member set remain to be finalized after the audit.

A former dedicated format-label member has no permitted role in that schema; a record carrying it is an unknown-extra record under the selected top-level unused-member rejection. This is a schema-meaning consequence conditional on identifying that member as the dedicated former label, not a selection of literal "format" or a blanket ban on every version-like gameplay string. Final keys remain unchosen. No label authenticity, date or publication guarantee was ever adopted.

No compatibility converter or malformed-save repair is introduced. This target does not identify actual writer software age: an older or custom writer emitting the identical admitted schema cannot be distinguished by origin from the contents alone. Later schema evolution must define its admission and meaning distinctly and be reviewed, not silently reinterpret same-shaped stored records. No permanent future policy is chosen here.

Refusal does not authorize deletion of bytes, clearing storage or automatic persisted-eligibility changes for otherwise-valid old or unsupported layout; that persistence effect remained a separate owner question at selection time; it was resolved at 1:30 PM PDT the same day by D60: refusal attempts ordinary withdrawal; stored payload bytes are not deleted. Invalid malformed content versus unsupported target layout must retain the selected or separately reviewed result classification. The high score is separate and unchanged.

This is unimplemented target direction, not code, test, requirement, model, CI, settings, storage or release permission. The current adopted STA-4/STA-6 requirement contract remains unchanged; implementation is unchanged until paired authorized behavior and requirement work. Historical label and conversion research, decisions and source identities are preserved; no phase or property closes.

## Decision record

On October 9, 2026 at 1:21 PM PDT the owner answered "Remove it" to the question "Remove it, or keep it?", asked about the dedicated format-label member of the current save layout. This record carries the selection and its scope; it is not approval of final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.
