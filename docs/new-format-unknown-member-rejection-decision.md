# Rejecting unused extra members in the new save format

A save in the new format that carries an unused extra member at the top level or inside the falling-piece object is rejected whole, even when every required member is present and valid.

## Decision and scope

For the scoped new save layout, no unused-member tolerance is adopted: an otherwise valid save with an extra member that nothing reads, at the top level or inside the falling-piece object, is rejected as a whole rather than loaded with the extra skipped. The specific permitted member set and the literal field names are not selected by this decision.

This selects only unknown-member handling for the two scopes named. It does not select duplicate-member handling, format-label or unsupported-label dispatch, numeric denotation, syntax or string rules, preservation of extra members during a later re-save, storage layout, recovery, cleanup, retirement or a completion protocol. Legacy save handling and the approved missing-history defaults are unchanged. Projected-field validity, full-state acceptance and the selected invalid-content withdrawal still apply. No code, test, storage, migration, schema, model, CI, setting or requirement change is approved or made.

## Decision record

On October 9, 2026 at about 11:52 AM PDT, after a researched recommendation that reported the prevalence of extra members and the comparative effort of the two options as unmeasured, the owner was asked whether a save in the new format with an unused extra field should be loaded with the extra ignored, as recommended, or rejected whole. He answered "No" to the recommended ignore option, selecting rejection of the whole save. That exchange selects the interpretation recorded here; it is not approval of these final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.

Earlier candidate reports that recommended ignoring extra members are superseded for this fork and remain historical. No independently certified population of actual saves under the new format was found, and neither the prevalence of extra members nor the comparative effort of rejecting versus ignoring was measured; those unknowns were presented as unknowns and are not part of the rationale.
