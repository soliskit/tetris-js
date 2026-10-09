# Rejecting repeated required names in the new save format

A save in the new format is rejected when a required field name appears more than once in the same object, even if both copies agree.

## Decision and scope

For the scoped new save layout, a saved record with a required name repeated in the same object is rejected as a whole. A repeat is not accepted even when the copies carry the same value. This selects only repeated required names; it is not an every-object or every-depth duplicate ban, and the exact required names and schema remain candidate.

Rejecting repeats avoids choosing or specifying a rule for picking one copy, such as last-wins. Differing copies do not force a guess: a fixed decoder could pick deterministically, so rejection is a selected policy, not a necessity. Equal repeats can be harmless under such a decoder and are still rejected by this choice.

This does not select duplicate-name handling beyond repeated required names, including repeats inside unused extra members; format-label or unsupported-label dispatch; numeric denotation or spelling; syntax or string rules; name-decoding details such as Unicode handling; legacy save handling; publication layout; or cleanup. The selected rejection of unused extra members is unchanged. No code, test, storage, migration, schema, model, CI, setting or requirement change is approved or made.

## Decision record

On October 9, 2026 at 12:05 PM PDT, with the frequency of duplicates and the comparative effort of the options stated as unmeasured, the owner was asked whether new-format saves with a required field appearing twice should be rejected, as recommended, or accepted when both copies match. He answered "Yes" to rejection at 12:12 PM PDT. Immediately afterward he was sent one correction: differing copies would not force a guess, since a fixed last-copy-wins rule could pick deterministically; rejection simply avoids needing that rule. His answer stands after that correction. The exchange selects the interpretation recorded here; it is not approval of these final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.

Earlier candidate comparisons of duplicate handling remain historical research, superseded only for repeated required-name acceptance.
