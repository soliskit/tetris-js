# Revision 4 note. Revisions 1-3 are frozen and untouched. Inputs: the four supplied files plus the pack-only reviewer feedback relayed by main (no other source).

## Corrections to revision 3
1. Revision 3 note item 7 was wrong in saying the invalid-save Continue path is reachable only by bypassing availability. continue_game calls availability first and, when it is false because an eligible, not-withdrawn save fails validation, withdraws it. So the path is reachable normally. It stays a reading (A17): D32/D20 do not say when validation runs relative to the Continue press, and S7 gives no read timing. Availability including validity itself is sourced (D20 section 1.2 item 5).
2. Atomic Undefined handling. Every public operation is now wrapped: if it reaches an undefined point (A2, A5, A9, A10, K1, S7), model state and the random source are restored exactly as before the operation, then Undefined is re-raised. Revision 3 left a partially started game (no piece, valid_state failing) after a missing A10 choice, and reset repeats before a missing blur choice. Tested in selftest_rev4.py. Limit: a caller-supplied storage write callable (Env.write_ok) cannot be rewound.
3. PLY-3 restart. Revision 3's note implied the restart was modeled; it was not. Now `gravity_restarts` counts soft drops that move the piece (observable runtime-resource effect, not authoritative state). Whether a blocked soft drop restarts the timer is unspecified (A11) and not counted. Other re-issue times of the scheduler request stay unmodeled (A16). gravity_interval_s() gives the derived B14/S10 value.
4. Portability: selftest_rev4.py loads the model by file glob in its own directory (or env O8_MODEL) and the table by env O8_TABLE (default path /downloads/...); it no longer depends on a module name.
5. Noted: `opening_queue` is not validated at construction; valid_state catches a bad queue.

## Unchanged
Revision 3 corrections (GEOM T3, opening queue choice, widened valid_state, A10 choices, single touch excursion source) and all open points: K1, A2, A5, S7, A6, A7, A14, A3, A4, A8, A11-A13, A15, A16, A17. G1 stays withdrawn (revision 2).
