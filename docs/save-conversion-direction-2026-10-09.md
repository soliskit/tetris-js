# One-time save conversion direction, October 9

Status: Owner direction recorded for documentation. No code, migration, schema, storage, deletion, test or certification change is approved or made by this record. The exact conversion and failure rules remain under review.

## Direction

One current version of the game. Old saves are converted once into the new format; afterwards only the new format is kept.

## Scope

- The one-time conversion includes otherwise-valid saves that cannot be dated as old or recent.
- The approved older-save defaults apply only to missing history. History already present is preserved.
- A converted default is a selected value for later exact restoration; it is not recovered history and does not guarantee progress preservation.
- The format label denotes decoding layout, not authenticated origin or writer date.
- Widening conversion applicability is not a semantic-validity waiver, not acceptance of all future untagged input, and not indefinite legacy support.
- The stored high score is separate; old-save policy does not erase it.

## Relation to current rules

REQUIREMENTS.md STA-6 supported-format loading remains the current adopted behavior. This record sets the target outcome; it does not amend STA-6 or any other requirement. A requirement changes only with the behavior change in the same commit, after the exact conversion protocol is selected, independently reviewed and authorized.

## Not selected

Migration keys, conversion trigger, durable completion, cleanup ordering, failure ordering, old cached tab writes and S6 identity remain unselected. No eager rewrite on every read, destructive migration at first launch, wall-clock cutoff, automatic deletion before commit or cross-tab retirement is adopted.
