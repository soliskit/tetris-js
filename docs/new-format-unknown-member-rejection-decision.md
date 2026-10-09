# Rejecting unused extra members in the new save format

A save in the new format that carries an unused extra member at the top level or inside the falling-piece object is rejected whole, even when every required member is present and valid.

## Decision and scope

For the scoped new save layout, no unused-member tolerance is adopted: an otherwise valid save with an extra member that nothing reads, at the top level or inside the falling-piece object, is rejected as a whole rather than loaded with the extra skipped. The specific permitted member set and the literal field names are not selected by this decision.

This selects only unknown-member handling for the two scopes named. It does not select duplicate-member handling, format-label or unsupported-label dispatch, numeric denotation, syntax or string rules, preservation of extra members during a later re-save, storage layout, recovery, cleanup, retirement or a completion protocol. Legacy save handling and the approved missing-history defaults are unchanged. Projected-field validity, full-state acceptance and the selected invalid-content withdrawal still apply. No code, test, storage, migration, schema, model, CI, setting or requirement change is approved or made.

## Decision record

The owner selected rejection of unused extra members. An earlier claim that the options required about equal effort was corrected: comparative effort and the prevalence of extra members are unmeasured, no independently certified population of saves under the new format was found, and the listed ways an extra member could appear are scenarios without frequency data. The earlier invalid-state-first priority order was later superseded by simplest app first, then avoid an invalid state. That later order does not change this unused-member rejection decision or its reconfirmation.

The owner confirmed rejection of unused extra members after the correction that comparative effort is unmeasured. This records the decision and its scope, not approval of final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.

Earlier candidate reports that recommended ignoring extra members are superseded for this fork and remain historical. Neither the prevalence of extra members nor the comparative effort of rejecting versus ignoring was measured; both were corrected to the owner as unknowns and are not part of the rationale.
