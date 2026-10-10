# D61: Whole-game offline play, one current-release decision

October 9, 2026. Decision record D61. Documentation only: nothing here is implemented.

## Decision

The whole game should work offline. No game feature is deliberately disabled just because the connection is absent.

A release is one matching set of game files. One place says which matching set is current, and everything else reads that answer. Other parts use that decision rather than making competing current-release decisions.

This selects the offline product direction and a single place for the current-release decision. It does not select a physical layout or claim that the game already follows this rule.

## Why

The owner wants offline play retained and versioning kept in one place rather than scattered through the code. One current-release decision makes the intended relationship clear: the matching game files used together follow the same answer.

The choice should explain itself from this intent. Operational values should be derived from their purpose and current evidence, not supplied as arbitrary numbers by the owner. This does not turn an unresearched implementation into a settled one.

## Owner exchange

October 9, 2026, America/Los_Angeles:

- The owner approved offline support with one source for the current-release decision.
- The owner approved whole-game offline play.
- One place says which matching set of game files is current, and everything else reads that answer.
- The owner approved that single current-release decision.

The last answer selects the stated matching-set default. It is not approval of every implementation idea in the earlier research packet.

## Limits and open research

This decision does not select:

- A cache layout, number of caches or retained releases, source-file count, release-ID representation, resource-list format, or build/deployment mechanism.
- Download, admission, update, retention, cleanup, fallback or stale-client mechanics. Any practical limit and fallback still need to preserve the chosen offline behavior and be justified from evidence. Reliable detection of every consumer is not assumed.
- Changes to tests, fixtures, test independence, requirements, models, code, storage, settings, CI or release procedures.
- A single global app-state object or an ownership layout for gameplay, control, persistence or other app state beyond the current-release decision. The owner's broader app-state concern remains separate.
- Changes to the current-only save layout, no-format-label direction, refused-save withdrawal, high score or state-validity rules.

Offline availability still depends on obtaining the required game files. The decision does not promise an uncached first visit without a connection or choose how initial provisioning works. Existing offline requirements remain operative; no requirement text is changed by this draft.

Implementation paths, consumer detection, hosting constraints and cost remain unresolved and need research. No failure rate, effort saving or runtime saving is asserted. Selecting one place for the current-release decision does not itself prove complete-release loading or safety.

## Documentation follow-through

This record and its ledger row are documentation only. Prior decisions and historical research stay as history; an online-first research proposal is not rewritten as though it had been adopted. Any later implementation or requirement change needs its own scoped work.
