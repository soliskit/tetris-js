# Repairing a broken stored high score

Replacing an invalid stored high score is a repair, not a lowering of a valid high score. The rule that a high score is replaced only by a higher score still protects valid stored scores.

## Decision and scope

Interpret SCO-3 together with D21 S8 and R1 B16: a stored high score is valid only when it denotes a whole number from 0 through 9,007,199,254,740,991; otherwise it counts as zero. Replacing invalid content is not prohibited as lowering a high score merely because its raw numeric text is greater than the replacement. No exception is added for lowering a valid stored high score.

This resolves the open invalid-content interpretation. It does not approve a particular write, change the requirement entry, broaden the accepted format, certify implementation behavior, classify other read/write failures or close Phase 4. Production code, permanent tests, models, CI and settings are unchanged.

## Decision record

The owner approved treating repair of a broken saved high score as distinct from lowering a real score. This records the decision and its scope, not approval of final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.

The earlier exact-2^53 conditional arguments remain historical. Under the stored-score ceiling, 9007199254740992 is invalid content; this decision settles the repair-versus-lowering question without changing the retained source evidence.
