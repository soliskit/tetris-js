# F23 entry: a serialization failure inside saveGameSession

Read-only evidence record. No code, test, requirement or CI change. Prepared by the auditor. This record shows what a source inspection and one scratch run establish for the blueprint's F23 entry. It classifies nothing, adopts no status word, establishes no requirement violation, and identifies no implementation defect. The blueprint says to classify only after comparing with SAF-2, SAF-3, and O4, and that the existence of a catch is not itself a defect; this record stops before that comparison.

## The entry

Appendix F23: "Status: Candidate pending independent reproduction. `saveGameSession` catches serialization failures in a way that may allow an engine failure during persistence to be swallowed rather than entering SAF-3. This is evaluated together with O4 but remains a separate finding until reproduction establishes the exact failure boundary and behavior. If F23 is shown to be solely a mechanism by which the F20 persistence-ordering violation occurs, it may be classified as a manifestation of F20 rather than a separate defect. If it independently violates SAF-2 or SAF-3 without an O4 ordering violation, it remains separate."

## Governing texts

- SAF-2 (REQUIREMENTS.md:85): "Storage that is missing, blocked, full, or throws on reads or writes never stops the game. Invalid stored values are ignored."
- SAF-3 (REQUIREMENTS.md:86): "If anything in the engine throws, the game stops in a safe state (game over, no timers running), the fault is reported, and the last good save is kept."
- Blueprint section 4.7, item 2 ("F23: serialization failure"): inject a failure at serialization and record whether serialization throws; whether `saveGameSession` catches it; what the caller observes (success or failure); what `runChecked()` observes; whether the invariant boundary runs; whether SAF-3 fault handling runs; whether game-over is reached; timer state; fault reporting; storage contents; preservation of the previous save.
- O4 (blueprint section O4): the persistence-ordering property; its text states it is subordinate to the applicable requirement semantics and decides none of the requirement questions by itself.
- D8 (DECISIONS.md, 2026-10-04, Settled): records that a failed save withdraws the previous one, so an out-of-date game is never offered. The blueprint's R4 Status line records R4 as decided in D21 and keeps the question text as originally written; the "Until it is made" wording in its R4 section is that retained question text, not the current decision status. R4 was decided the same day (DECISIONS.md D21, 2026-10-04; `docs/audit/phase-1-r2-r5-decision.md`): as recorded there, a failed save withdraws the previous saved game, and withdrawal means Continue no longer offers it without requiring deletion of the stored bytes. This record classifies nothing.
- D73 (DECISIONS.md, 2026-10-17): F23 is a Confirmed Defect at the scope of its existing record (`docs/audit/serialization-failure-scoped-disposition.md`): the declared injected nonstorage serializer exception is swallowed, and Pause stays paused with no required SAF-3 stop or test signal. The auditor for that record read the code and did not run it; no ordinary or native cause is claimed. The appendix text quoted above is the blueprint's own wording; the entry's ledger status is in DECISIONS.md.

## Source structure (Obs, main `0f1e3ab`)

- `saveGameSession` (`gameManager.js:222-229`): `try { this.storage.setItem(SAVED_SESSION_KEY, serializeSession(this)); this.isSessionSaved = true; } catch { this.isSessionSaved = false; }`. One catch covers both a throw from `serializeSession` and a throw from `setItem`; its only write is the flag assignment.
- Callers: `lockAndSpawnNext` (`:325`, when a lock clears lines while playing) and the pause branch of `performAction` (`:499`). Both run inside the guarded operation.
- The flag: `get isSessionSaved` (`:159-162`) reads the `tetris.isSessionSaved` storage key through an in-memory cache; `set isSessionSaved` (`:165-172`) clears the cache and writes the key inside its own try/catch. The saved game itself lives under `tetris.savedGameSession` (`:36-37`).
- `serializeSession` (`session.js:29-40`) is one `JSON.stringify` over a plain object of picked fields: gameBoard, score, currentTetromino, nextTetrominos, heldTetromino, canHoldTetromino, and the bag's colors. Evaluation order (source-read): `serializeSession(this)` runs before `setItem`, so a serialization throw means `setItem` is never reached.
- Can serialization throw in real play (source reading, bounded): `JSON.stringify` throws on cyclic structures, BigInt values, or a throwing `toJSON`/getter on an own enumerable property. No `toJSON` is defined anywhere in `public/game/` (pattern search over that directory). The picked fields are data properties: board rows of cell objects (`{isFilled, color}`), a numeric score, and `Tetromino` instances whose fields (`color`, `position`, `rotations`, `rotationState`, `wallKickData`) are constructor-assigned data properties - the class's two getters (`shape` `tetromino.js:41`, `cells` `:85`) sit on the prototype and are not own properties, so stringification never invokes them. Shared piece constant data is acyclic. (Bounded; caveat in Limits.)

## Committed coverage (Obs)

- A local `grep -E 'saveGameSession|serializeSession|stringify|failNextSave' -r test/ e2e/` over the checkout at `0f1e3ab` matches: the `serializeSession`/`parseSession` round-trip tests (`test/session.test.js`); a direct `game.saveGameSession()` call (`test/audit/d74-f21-f22-p7.test.js:57`) with a `stringify` fixture write at `:63`; `stringify` fixture writes of the saved-session key (`test/gameManager.test.js:720`, helper at `:24`); and the SAF-1 malformed-save fixtures (`e2e/safety.spec.js:10` and `:14`). Other `stringify` matches are gameplay snapshots unrelated to session saving (`test/safety.test.js`, `test/audit/l1-trace.test.js`, `test/audit/l1-clear-after.test.js`, `e2e/game.spec.js`, `e2e/touch.spec.js`, `e2e/f28-touch-lift.spec.js`, `e2e/fixtures.js`). `failNextSave` matches nothing. No match injects a serialization failure into `saveGameSession`.
- `e2e/safety.spec.js:62` ("the game plays normally when storage is blocked [SAF-2]") makes `Storage.prototype.getItem`/`setItem` throw and asserts normal play with no page errors - the storage-call failure, not a serialization failure.

## Scratch run (Obs, one indicative local run)

Method: two scratch tests outside the repository (raw capture: `f23-serialization-throw-run-raw.txt`, added 2026-10-23 at 950134d, deleted 2026-10-24 at a048ecd, kept in git history; last path `docs/tetris-audit/f23-serialization-throw-run-raw.txt`) against the scratch copy at `9db0855f`, whose `public/game/gameManager.js` and `public/game/session.js` are byte-identical to main `0f1e3ab` (cmp verified for this run). Node 22.23.3. The injection patches `JSON.stringify` once, to throw `Error('injected serialization failure')` on the next session-shaped value (an object with `gameBoard` and `nextTetrominos`), then restore itself. A wrapped storage records every `setItem` by key, and a wrapped `findInvariantViolation` counts invariant checks. All assertions pass (2 tests).

- Pause path (guarded caller): with a real save already written by a control pause, the injected throw during a second pause escapes nothing; the pause completes (state `paused`); `onFault` is not called, `failSafe` is not called (spied), and the faults list stays empty (asserted); the invariant boundary runs after the swallowed failure (counter); the scheduler's pending count goes from 1 (gravity) before the action to 0 after it, and the save runs after the stop within the pause branch (`:494-499`); the previous save text is preserved byte-for-byte and no write to the save key occurs during the failed save; the flag key reads `false` from storage afterward (persisted read; the setter is its only write path, `:165-172`).
- Direct call: `saveGameSession()` with the throw armed returns `undefined` (captured); the saved-session key is unchanged while the flag key is written `false`; `failSafe` is not called and the faults list stays empty. A later unarmed `saveGameSession()` succeeds: the flag reads `true` and the new save text parses.

## The blueprint's record list, item by item

- Whether serialization throws: under the injection, yes. Real-play reachability is the bounded source reading above.
- Whether `saveGameSession` catches it: yes; nothing escapes on either the guarded pause path or a direct call.
- What the caller observes: a normal return with no error signal, while persistence has failed and the flag reads `false` - not persistence success. The pause action completes; the direct call's `undefined` return is captured by assertion.
- What `runChecked()` observes: no error. The guarded action completes and `runChecked` proceeds to the invariant check.
- Whether the invariant boundary runs: yes; the check counter incremented after the swallowed failure.
- Whether SAF-3 fault handling runs: no. `failSafe` was not called (spied), the faults list stayed empty (asserted), and the state never becomes `gameOver`. This is the shape D73 records from its source reading, observed here in a run.
- Whether game-over is reached: no.
- Timer state: the pending count went from 1 (gravity) before the pause action to 0 after it (measured); the save runs after the stop within the pause branch, so the stop is the pause's own. Timer identities beyond the pending count were not tracked.
- Fault reporting: none. `onFault` was not called and no fault was recorded.
- Storage contents: the save key keeps its previous text (the throw precedes `setItem`); the flag key is written `false` by the catch's assignment.
- Preservation of the previous save: the previous save text survives byte-for-byte, marked unavailable. The decided R4 rule (DECISIONS.md D21, 2026-10-04) is that a failed save withdraws the previous saved game, with deletion of the stored bytes not required; the observation matches the decided behavior's shape. Whether it classifies as compliant is the audit's later-phase work; this record does not decide it.
- Additionally observed: a later ordinary save succeeds and produces a parseable save.

## Limits

- Local Node 22.23.3 is indicative, not authoritative; CI runs Node 26 or newer. One local run; the scratch tests change nothing.
- The injection patches `JSON.stringify` globally for one call; it simulates a serialization throw at the exact boundary the blueprint names, but it is not a naturally occurring failure.
- The reachability reading is a pattern search of `public/game/` plus a field-shape reading of the serialized types, not a completeness proof.
- Only the pause caller and a direct call were exercised; the line-clear caller (`:325`) invokes the same function with the same catch and was covered by source reading only.

## What this record does not do

- This record classifies nothing and changes no status: it adds one independent scratch run to the entry's evidence without moving the D73 disposition above.
- It performs neither the SAF-2/SAF-3/O4 comparison the blueprint requires before classification, nor the F20 folding decision the entry describes.
- It establishes no requirement violation and no implementation defect.
- It proposes no fix, no test change, and no requirement change, and it moves no phase.
- It asks for no owner decision.
