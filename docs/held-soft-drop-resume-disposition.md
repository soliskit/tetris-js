# Held soft drop after resume: ordinary callback disposition

Status: Confirmed defect by independently reviewed conditional source argument for the physical S lineage below. Operative only after documentation review, exact-head checks, authorized merge and postmerge publication verification. Not newly Reproduced, native device evidence, full INP/U4/R1 or Phase4 closure.

## Independent criterion and admission

D34 E2 applies the release-and-press-again resume rule to held soft drop, keyboard directions and gamepad directions. A control still held when the game resumes does not repeat until released and pressed again. E3 preserves that suppression through unrelated control events. The original owner question extending the rule to held soft drop/gamepad and its affirmative answer were independently inspected. Production's canonical held-key Set is not the definition of physical control history.

Source main has public tree1e09ad61c19e0b235a231ad8810dae176be4ea77. InputController hash7454a3c23b9de0acb152fe76bedab74bb4a604ac62ca11d41ff5ee12e3ed27e2 and GameManager hash31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea bind the source comparison.

Choose an ordinary O-first NewGame using the previously reviewed valid zero-valued shuffled-factory prefix: empty dense20x10 board, score0, queueT/S/Z, bagJ/L/I and no held piece. The focused page receives nonmodifier, nonrepeat physical S/P key events. An already exposed connected neutral gamepad remains visible and selected by navigator.getGamepads throughout, with centered axes and no pressed buttons. No blur, disconnect, physical S release/repress or competing actor intervenes. Successful storage/timer/RAF operations and the finite event ordering below are explicit premises, not native platform measurements.

## Shipped callback path and adverse repeat

InputController construction calls startPolling, which registers its ordinary RAF poll. A successful neutral connected sample follows pollGamepads→processInput and leaves another RAF outstanding. No direct helper invocation, patched callback or injected factory is needed by this source argument.

1. Physical S keydown enters KeyS in heldKeys, performs the immediate soft drop from O anchor(0,4) to(1,4), and registers a50ms soft-repeat interval.
2. P keydown pauses the game; P keyup leaves S held. Pause cancels GM gravity and saves ordinary selected fields. O is airborne, so no lock delay is active.
3. Deliver the scheduled S interval while paused. Its callback clears its own interval, sets the handle undefined and returns, without moving O. The separate U4 missing-checkpoint finding concerns this paused firing; it is not the criterion for the later repeat.
4. Resume with another P keydown/keyup before the next RAF poll. GM returns to playing and schedules gravity, but these P edges neither move S nor rearm its interval. Physical S has remained held throughout.
5. Deliver the already-outstanding neutral RAF poll. processInput sets padDown false, then calls updateSoftDrop before its direction early return. heldKeys still contains KeyS, so startSoftDrop registers a NEW50ms interval. No new soft-drop button/stick press or S release/repress occurred. Registration is a resource outcome, separate from movement.
6. Deliver the new interval while playing before GM gravity. It delegates GM.softDrop, moving O anchor(1,4) to(2,4). This is an automatic repeat of the control held across Resume, contrary to E2. A later S keyup clears the interval ordinarily.

## Geometry, resources and limits

The adopted O's four cells occupy columns4/5 and rows0/1, then1/2, then2/3. All fit the empty board and remain airborne. No lock, rotation, clear or piece replacement occurs; fixed O lowest correspondence is anchor history+1 and reset count0. Board/score/queue/bag/hold remain unchanged. Successful GM gravity cancellation/replacement, interval self-stop/rearm/firing and RAF outstanding/fired schedules retain their separate resource roles.

The selected ordering is paused50ms callback, Resume before the next RAF, then neutral RAF and its rearmed50ms callback before700ms gravity. API availability, RAF frequency, human response speed and native timer delivery are not measured or guaranteed. A paused IC repeat resource and whole R1 composite validity are not certified. Neither Q2 detector extent nor the settled U4 finding supplies an exception to E2.

The earlier SRes1 component witness corroborates the same repeat mechanism but used a late-constructed neutral pad and direct polling with partial snapshots/manual scheduling and raw/process limits. This ordinary shipped RAF entry argument closes that callback-entry gap under its stated platform premises; it does not turn historical evidence into native execution or complete fixture certification.

Confirmed by conditional source argument: the ordinary registered neutral-pad RAF path can restart held S after Resume and its callback moves the falling piece without releasing and pressing S again. Broader controls, all event schedules, physical devices, native UI/gamepad/timing, full INP/U4/R1, persistence, Phase4 and corrections remain separate. No new requirement, source, test, model, CI or public-site change is included.
