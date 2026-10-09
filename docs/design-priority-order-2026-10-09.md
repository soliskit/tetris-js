# October 9, 2026 - design decision priority order

David's order for design decisions is now: simplest app first, then avoid an invalid state. This replaces the earlier order of avoiding an invalid state first and choosing the simplest app within that.

This is a priority change, not a rewrite of R1's state-validity predicates, a certification of any implementation, or authorization to ship invalid states. Existing requirement and behavior changes still require their own reviewed authorization. No particular save compatibility, no-label design, field list, marker set, history replacement rule, deletion, storage withdrawal or implementation is selected by this order alone.

At 1:12 PM PDT David initially framed the consequence as losing a top score. Before he confirmed the priority flip, he was corrected that refusal of an old save can instead cost the whole saved position (board, score, pieces), while top score is stored separately. This record does not assert that this is every possible worst consequence or blanket approval for destroying game progress or top scores.

## Decision record

On October 9, 2026 at 1:13 PM PDT the owner answered "Yes flip the order of priorities" to the renewed keep-or-flip question, selecting the new order. This record carries the selection and its scope; it is not approval of final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.
