# One-time save conversion direction, October 9

Status: Owner direction recorded for documentation. No code, migration, schema, storage, deletion, test or certification change is approved or made by this record. The exact conversion and failure rules named below were conversion-only and are retired with the convert-once target (D58, October 9, 2026). Current-save publication and failure rules, and old-tab and cross-tab interference, stay under review.

## Current target, October 9, 2026

The finalized current save schema has no dedicated format label member (D59). The target game supports only that finalized current save layout (D58): old-layout saves are refused, even when their gameplay contents would otherwise be valid, with no one-time conversion or legacy-default fallback. Refusal of present, successfully read content that fails the finalized current layout and validation attempts ordinary withdrawal under the existing semantics (D60); stored payload bytes are not deleted, and the stored high score is separate and is not erased. This supersedes the convert-once direction and the labeled-format scope recorded below, which remain as history. It does not change the current adopted STA-4/STA-6 requirement contract; implementation is unchanged. Records: `docs/current-save-layout-only-decision-2026-10-09.md`, `docs/current-save-no-format-label-decision-2026-10-09.md` and `docs/refused-current-schema-withdrawal-decision-2026-10-09.md`.

## Direction

Superseded October 9, 2026 by the current target above (D58); the convert-once direction below is preserved as history.

One current version of the game. Old saves are converted once into the new format; afterwards only the new format is kept.

## Scope

Historical target scope: the convert-once direction was superseded October 9, 2026 (D58) and the labeled-format bullet the same day (D59). The high-score separation and the limits on accepting future input remain current.

- The one-time conversion includes otherwise-valid saves that cannot be dated as old or recent.
- The approved older-save defaults apply only to missing history. History already present is preserved.
- A converted default is a selected value for later exact restoration; it is not recovered history and does not guarantee progress preservation.
- The format label denotes decoding layout, not authenticated origin or writer date. (Earlier labeled target, superseded October 9, 2026 by D59: the finalized current schema carries no dedicated format label.)
- Widening conversion applicability is not a semantic-validity waiver, not acceptance of all future untagged input, and not indefinite legacy support.
- The stored high score is separate; old-save policy does not erase it.

## Failed conversion

Historical: this conversion-failure rule belongs to the superseded convert-once target (D58). The ordinary failed-save and failed-withdrawal rules referenced below remain current for current saves.

A failed save of an admitted old save in the new format follows the ordinary failed-save rule: the previous saved game is withdrawn from Continue, with no conversion-specific exception keeping the original available after failed publication. If the withdrawal write itself fails, the ordinary failed-withdrawal rule applies: after a reload nothing is promised. The owner selected this on October 9, 2026. The ordinary failed-save and failed-withdrawal rules live in `docs/phase-1-r2-r5-decision.md` (D21, Save and Withdraw sections).

## Relation to current rules

REQUIREMENTS.md STA-6 supported-format loading remains the current adopted behavior. This record sets the target outcome; it does not amend STA-6 or any other requirement. A requirement changes only with the behavior change in the same commit, after the exact conversion protocol is selected, independently reviewed and authorized. October 9, 2026: the target outcome is now current layout only with no dedicated format label (D58/D59); the rule that a requirement changes only with the same-commit behavior change is unchanged, and the exact-conversion-protocol gate named here is retired with the convert-once target (D58).

## New-format unknown members

A save in the new format that carries an unused extra member at the top level or inside the falling-piece object is rejected whole, even when every required member is present and valid. The exact permitted member set and literal field names are not selected. The owner answered for rejection on October 9, 2026 and, after a correction of the effort data presented with the recommendation, said he wants a stricter game and then reconfirmed the rejection the same day. The full record is `docs/new-format-unknown-member-rejection-decision.md`. This rejection applies to the new layout only: legacy save handling and the approved missing-history defaults are unchanged. Note, October 9, 2026: the legacy-handling target was later superseded by D58 (current layout only); the current adopted STA-4/STA-6 requirement contract and implementation remain unchanged.

## New-format repeated required names

A save in the new format is rejected when a required field name appears more than once in the same object, even if both copies agree. This is not an every-object or every-depth duplicate ban, and the exact required names are not selected. Rejecting repeats avoids specifying a rule for picking one copy; differing copies would not force a guess. The owner selected this on October 9, 2026; the full record is `docs/new-format-required-duplicate-rejection-decision.md`. Legacy save handling is unchanged. Note, October 9, 2026: the legacy-handling target was later superseded by D58 (current layout only); the current adopted STA-4/STA-6 requirement contract and implementation remain unchanged.

## New-format numeric spelling

Numeric fields in the new format use plain whole-number spelling only. Fraction and exponent spellings such as 100.0 and 1e2 are rejected even when their mathematical value is a whole number. The exact numeric domains, signed zero and sign handling, size limits, and the binding to the eventual syntax schema are not selected. The owner selected this on October 9, 2026; the full record is `docs/new-format-plain-integer-spelling-decision.md`. Legacy save handling is unchanged. Note, October 9, 2026: the legacy-handling target was later superseded by D58 (current layout only); the current adopted STA-4/STA-6 requirement contract and implementation remain unchanged.

## Not selected

Migration keys, conversion trigger, durable completion, cleanup ordering and failure ordering beyond the failed-conversion withdrawal rule belonged to the convert-once target and are retired with it after the October 9, 2026 current-layout-only selection (D58). Old cached tab writes remain relevant: an older tab can still write its own layout to shared storage, and that interference stays under review. Duplicate-name handling beyond repeated required names, numeric denotation beyond plain whole-number spelling, syntax and string rules, and preservation of extra members during a later re-save remain unselected. Format-label and unsupported-label dispatch left the open list on October 9, 2026: the owner selected no dedicated format label (D59). The effect of refusing present, successfully read content that fails the finalized current layout and validation was selected on October 9, 2026 (D60): ordinary withdrawal is attempted; stored payload bytes stay. The last-good identity after failed publication is selected in `docs/phase-1-r2-r5-decision.md` (D21, Fault section): only a fully finished save replaces the last-good position. No eager rewrite on every read, destructive migration at first launch, wall-clock cutoff, automatic deletion before commit or cross-tab retirement is adopted.
