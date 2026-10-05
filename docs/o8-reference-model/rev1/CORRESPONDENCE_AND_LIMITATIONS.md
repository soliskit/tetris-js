# O8 reference model: source correspondence, limitations, ambiguities

Files: `o8_reference_model.py` (model), `selftest.py` (internal consistency checks only). Python 3 stdlib.
Authoring inputs: only the four supplied files (REQUIREMENTS.md, decision pack v5, SRS image, SRS table). No repository, code, tests or other records were used. The model makes no claim about implementation correctness. Self-tests check the model against its own source-derived predicates, using placeholder stubs for undefined points (kicks, spawn column); those stubs are test controls, not specification.

## Provenance note
The decision pack's header says "MODEL INPUT PACK DRAFT, NOT APPROVED" while its body labels items "owner-approved" and the task calls the inputs "approved". I treated the pack text as the behavioral authority as instructed and did not verify any approval claim. If approval status matters, it needs confirming through the owner's channel.

## Geometry check (B2: table vs image)
Parsed the PNG pixel by pixel against the table (tile boxes, 16 px cells).
- J, L, S, T, Z: all 4 states identical to the table.
- I: all 4 states identical once the white pivot-marker pixels at the box center are ignored.
- O: DISAGREEMENT IN BOX. The image tile is 4 cells wide by 3 tall with the square in columns 1-2, rows 0-1 (cells (0,1),(0,2),(1,1),(1,2)). The table gives a 2x2 box with cells (0,0),(0,1),(1,0),(1,1). Shape is identical, box size and offset differ. B2 says any disagreement makes the reference inconsistent and no state of that kind is defined until the owner decides. The model uses the table's O (shape agrees) but this is the model's reading, not a decision; the choice shifts the O position by one column versus the image. (Ambiguity G1.)

## Source-to-model map
| Source | Model element |
|---|---|
| PCE-1, B5 | ROWS, COLS, board |
| PCE-2, B2, table | GEOM (table values), cells() |
| PCE-3 | _spawn (position from caller; see A2) |
| PCE-4 | rotate: primary direction kicks in order, then other direction, else unchanged; O never rotates |
| PCE-5, D16 s2, V3 | Env.shuffle7 (random source is an input), _draw, new-game deal (first 7 distinct) |
| PCE-6, B6, D16 s6 V1 | fits(), piece_fits(); validity checked at commit boundary by valid_state() |
| PLY-1 | move |
| PLY-2, B14, S10 | gravity_seconds(), last_gravity_request_s (requested delay only) |
| PLY-3 | soft_drop (restarts gravity request) |
| PLY-4 | hard_drop |
| PLY-5, B14 | landing_row() |
| PLY-6, B9.2 | _settle(): lowest row (item 15), reset count, lock_running, lock-at-once at count 15 |
| PLY-7, B8 | hold, hold_used (lock-cycle availability) |
| PLY-8, B7 | queue (3), _next_from_queue |
| SCO-1 | _lock: line clear, LINE_SCORE |
| SCO-2, B14 | level_of() |
| SCO-3 | high (in-memory max; persistence timing unspecified, A7) |
| STA-1, B12, D32 ops 1-3 | new_game, open_confirm, select, answer, _start_game |
| STA-2, B9.2 | pause (count 14-or-less +1, 15 -> 16), resume (16 locks at once, else delay starts) |
| STA-3, S2 | _game_over (withdraw, timers stop, semantic fields None per B6/B8/B10/B12) |
| STA-4, STA-6, B16, L1, L2, C1, C4 | _save, snapshot, validate_save (accept whole/reject whole, L1 default), continue_game (fresh bag if none) |
| STA-5 | page_hidden |
| SAF-1 | validate_save |
| SAF-2, S4-S9, U1 | Env.write_ok, _withdraw, item16, continue_available (S7 returns 'either') |
| SAF-3, D16 s7-8, T1, U3, S3, S6 | fault_stop (game over, no timers, fault_reported, saves untouched, contents retained) |
| SAF-4, U4 | valid_state(): B4-B13 predicates incl. resource states |
| INP-2, INP-3, B12, C3, E2, E3 | press, release, repeat_fire, blur, suppressed set, constants 167/33/50 |
| INP-5, C2, E1 | touch_begin/move_cols/drop_rows/end/cancel (semantic) |
| D16 1.1-1.5, D17, D20, Z1 | state fields: 1-16 present; derived (level, resting, landing, gravity) computed, not stored |

## Explicit undefined points (model raises `Undefined(id)` or needs a caller choice)
- K1 Wall-kick tables: PCE-4 says "standard SRS kicks" but B2 says the reference gives geometry only. No kick data supplied. Caller must pass `choices['kicks'](kind, from_rot, to_rot)`.
- A2 Exact spawn position: "horizontally centered, top two rows". For 3-wide pieces on 10 columns centered is not unique (col 3 or 4); the I (box row 1) and box row 0 vs -1 are also open. Caller passes `choices['spawn']`.
- A5 After releasing the newest held direction while an older opposite direction is held, the sources do not say whether repeat goes to waiting (167 ms) or continues repeating. Caller passes `choices['release_repeat']`.
- A9 Opening queue contents at game over (B7 says three valid pieces in every mode; no source says which). Model uses an empty placeholder; B7 is not claimed at the opening state.
- S7 Failed read: "may" make the save unavailable. Model returns 'either' / raises Undefined('S7-nondeterministic').

## Model readings (deterministic, but the sources do not fix them; each is a candidate owner decision)
- A3 Bag order: shuffle result dealt from the front; new game deals the current piece first, then 3 queue pieces.
- A4 B9.2 literally adds 1 to the count for any move or rotation that leaves the piece resting without a new lowest row, even if it was not resting before. PLY-6 says "while it rests". Model follows B9.2. A fall to rest without a new lowest row starts the delay without incrementing.
- A6 Dialog "any other action": model only dismisses the dialog (stays paused); the action's own effect is not performed.
- A7 When the high score is stored is unspecified; model keeps max in memory.
- A8 Save payload field names, mode field and format are unspecified; model uses a semantic payload. Legacy format syntax (STA-6 fixtures) is not modeled.
- A10 Whether held tokens at game start or after blur suppress repeat is unspecified; model treats them like resume (C3/E2).
- A11 Gravity tick or soft drop when blocked: no state change.
- A12 Hold when already used: no effect (no other state change).
- A13 Whether Continue consumes the stored saved game is unspecified (C4 only covers item 16); model leaves storage unchanged.
- A14 Tap rotation direction: INP-5 says "rotates"; model uses clockwise.
- A15 No points are scored for soft or hard drop (SCO-1 lists only line clears).
- Soft drop vs hold vs rotate while confirm dialog open, and arrow-key order of the two dialog buttons: not modeled (select takes an explicit choice).

## Out of model scope (limits)
Gamepad mapping (INP-4), pixel geometry for touch (10 px, half cell), rendering/DSP, wake lock, APP-1..6 (service worker, cache; D16 s3), QA/process requirements, real time (timers are events: gravity_tick, lock_expire, repeat_fire; durations appear only as constants and the requested gravity delay), tolerance claims beyond S10's requested value, keyboard-layout/key mapping beyond press/release tokens, SAF-5 notice, T1 message text, SAF-6.
