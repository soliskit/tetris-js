# Continue after a failed payload read

Status: Confirmed defect by independently reviewed conditional source argument under the named premises, operative only after independent exact-head documentation review, checks, authorized merge and postmerge verification. Conditional source argument, not a new runtime reproduction, native storage failure, accepted correction, complete S7 property or Phase 4 closure.

## Independent criterion

D21 S7 distinguishes a failed storage read from invalid stored content. Read failure may make Continue unavailable, but does not itself withdraw the game or change any stored value. Invalid content, in contrast, is rejected whole and withdrawn. This criterion does not require a specific retry time or a new save format.

## Finite admitted prefix

Source main, manager31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea, session54acbea460218f0e0a827619eae51e265461fe9ac6575dc8bf48727f6483049b.

Start at ordinary game over with an otherwise completed constructor, successful ordinary piece factory and scheduler, no outstanding gameplay timers, no confirmation, and no unrelated actor. The saved eligibility key has exact value true. Its getter read succeeds. An earlier payload exists as opaque bytes. No new assertion is made that these bytes are B16-good or restorable: the claim concerns a failure to read them before their contents can be classified.

Take Continue through public handleAction. The payload storage getItem call throws before returning any payload. Eligibility writes subsequently succeed. The failure-provider behavior is an explicit admitted storage-read exception, not a claim that native storage spontaneously throws or that an arbitrary malicious provider modifies other values. No failed write, callback failure, getter/proxy interference or concurrent tab is included.

## Actual source order

1. handleAction runs performAction through guard. The Continue branch requires game over and calls loadGameSession.
2. isSessionSaved reads eligibility true and permits the payload read.
3. readItem catches the payload getItem exception and returns null, losing the distinction between failed read and an empty value.
4. parseSession rejects null. JSON.parse(null) yields null; the record-shape check rejects it. No previously stored payload content was actually returned or classified.
5. loadGameSession's no-session branch sets isSessionSaved false. That setter clears cached eligibility and attempts setItem for the eligibility key with exact text false.
6. Under the successful-write premise, eligibility changes from true to false. The payload remains opaque and unchanged. The game stays over. The resulting guarded checkpoint does not restore or roll back the eligibility value.

The source response collapses failure to read with invalid/absent content and performs a withdrawal write solely because the payload read failed. The successful false write violates the no-stored-value-change facet of S7 in this prefix. No prior-good content premise, raw-format default, actual Continue restoration, last-good-loss conclusion or user-visible pixels is needed for that facet.

The source sets confirmation false before the switch. That write is distinct and not part of the stored-value violation. The source guard may run its ordinary invariant check, but that does not undo the false storage write; the conclusion does not rely on monitor omission. A separately malformed payload successfully returned by the provider is outside this failure prefix and retains its legitimate reject/withdraw rule.

## Existing F24 relation

The published `audit-status-and-dispositions-2026-10-06.md` already confirms the separate eligibility-read failure prefix with no payload read. This payload-read failure is an additional cut within the already-open F24 family, not a new defect family or full F24 closure. The historical receipts of the two cuts remain distinct.

## Historical evidence and boundary

The published Phase3 storage/scoring observations already report a payload-read-throw case with old bytes retained and a false flag write. Its historical raw process/source receipts have not been recovered in this continuation, so it remains attributed corroboration, not fresh reproduction. The argument above uses the freshly fetched unchanged source and independently stated S7 criterion.

Disposition: Confirmed defect by conditional source argument for successful false-eligibility write following a failed payload read under the named premises. Independent review passed the bounded source/criterion argument. Full read-failure compositions, false/unknown eligibility, flag-read failure, failed withdrawal write, current session-history mapping, native storage, UI discoverability and B16/S6/F20 remain separate. No implementation, permanent test, model, CI, requirement or public-site change is proposed.

A later minimal correction must preserve the distinction between read failure and invalid returned content; it must not remove invalid-content withdrawal or create a retry/format policy without authority. Correction approval and failing-before/passing-after regression are separate from this finding draft.
