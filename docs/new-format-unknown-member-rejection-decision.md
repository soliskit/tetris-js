# Rejecting unused extra members in the new save format

A save in the new format that carries an unused extra member at the top level or inside the falling-piece object is rejected whole, even when every required member is present and valid.

## Decision and scope

For the scoped new save layout, no unused-member tolerance is adopted: an otherwise valid save with an extra member that nothing reads, at the top level or inside the falling-piece object, is rejected as a whole rather than loaded with the extra skipped. The specific permitted member set and the literal field names are not selected by this decision.

This selects only unknown-member handling for the two scopes named. It does not select duplicate-member handling, format-label or unsupported-label dispatch, numeric denotation, syntax or string rules, preservation of extra members during a later re-save, storage layout, recovery, cleanup, retirement or a completion protocol. Legacy save handling and the approved missing-history defaults are unchanged. Projected-field validity, full-state acceptance and the selected invalid-content withdrawal still apply. No code, test, storage, migration, schema, model, CI, setting or requirement change is approved or made.

## Decision record

On October 9, 2026 at 11:53 AM PDT the owner answered "No" to the question "Yes (ignore the extra) or No (reject the save)?", selecting rejection. The recommendation he had just answered described the comparative effort of the two options as about equal; that claim was wrong. Minutes later he was sent a correction: comparative effort and the prevalence of extra members are unmeasured, no independently certified population of saves under the new format was found, and the listed ways an extra member could appear are scenarios without frequency data. After that correction, at 11:54 AM PDT, the owner said he wants a stricter game, matching the rejection, and at 11:55 AM PDT he approved a decision priority order: never let the game run in a state that makes no sense; within that, the simplest app. At 1:13 PM PDT the same day, after the saved-position-loss correction, the owner flipped the decision order to simplest app first, then avoid an invalid state. That later order supersedes the earlier priority ranking, not this unknown-member rejection decision or its reconfirmation.

After the correction the owner was asked to reconfirm: knowing that comparative effort is unmeasured, should new-format saves with an unused extra field be rejected. On October 9, 2026 at 12:04 PM PDT he answered "Yes" to rejection, making this selection final. The exchange selects the interpretation recorded here; it is not approval of these final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.

Earlier candidate reports that recommended ignoring extra members are superseded for this fork and remain historical. Neither the prevalence of extra members nor the comparative effort of rejecting versus ignoring was measured; both were corrected to the owner as unknowns and are not part of the rationale.
