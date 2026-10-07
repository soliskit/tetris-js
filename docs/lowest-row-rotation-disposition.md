# Lowest-row history: ordinary rotation information loss

Status: Confirmed defect by independently reviewed conditional source argument for the paired ordinary I histories below. Operative only after documentation review, exact-head checks, authorized merge and postmerge publication verification. Not newly Reproduced, native evidence, all-state correctness, full R1 or Phase4 closure.

## Independent meaning and representation

D17 adds authoritative item15, the lowest row reached. B9.2 defines it as the greatest board row occupied by any current-piece block during its entire time as current. A newly current piece starts at its occupied maximum; reaching a greater maximum updates the history, and returning upward or to an earlier orientation never decreases it. B3 requires a fixed semantic denotation for the representation. An external unretained action trace or clock is not an adopted representation of item15.

The original adopted history rules and D17 amendment were independently inspected. Raw box-row identity or a current-orientation offset mismatch alone would not rule out every other decoder. This argument instead gives equal retained authoritative values with two different required histories.

## Paired ordinary histories

Source main d5af092a4ad8f54f2ba256255500fed41bf07253 has public tree1e09ad61c19e0b235a231ad8810dae176be4ea77. Choose ordinary identity seven-bags using twelve valid random results0.999 for constructor and NewGame refills. NewGame produces currentI at box(0,3), rotation0, queueO/T/S, bagZ/J/L, empty dense20x10 board, score0, heldnone and Hold available. Successful storage withdrawal and scheduler/guard/onChange operations, no held controls or intervening actor and no delivered gravity/lock callback are premises.

A retains that NewGame state without rotating. B performs four ordinary public clockwise rotations before gravity, giving states0→1→2→3→0. For each rotation the first shipped I kick(0,0) succeeds: every adopted four-cell state at box(0,3) fits the empty board and can move down. The box position therefore stays(0,3); no fallback kick, injected piece/factory or position patch is used.

The adopted I states have maximum occupied local rows1,3,2,3,1 in that sequence. A's required historical lowest is1. B reaches3 on its first rotation and must retain3 after returning to state0. Both reset counts remain0: the piece stays airborne, and reaching a new semantic lowest sets count0.

## Equal retained authoritative values

Each B rotation calls resetLockDelay. noteLowestRow compares box row0 with stored anchor0, so it does not update that field. With a null lock handle, landIfResting finds the piece airborne and starts no lock delay. No factory generation, storage write, gravity replacement or reset-count increment occurs during the rotations.

At the end, A/B have the same by-value board, mode, current kind/geometry/kick data/position/rotation, queue, bag, held piece, Hold flag, score, count0, stored anchor history0 and selected authoritative control/withdrawal values. The original gravity remains outstanding and lock delay absent in both. No retained authoritative history field distinguishes whether the I previously occupied local row3.

This is not byte equality, object identity or equality of the entire UI/runtime. Rotation allocates position objects, and B invokes onChange four times. Successful nonauthoritative redraw/cache work may differ. No retained generation log or object tag encodes historical occupied maximum. As an optional presentation ordering, all four rotations may occur before NewGame's already-requested drawing frame fires, keeping that request pending; no claim depends on equal rendered intermediate frames. Presentation caches and an external execution log are not substituted for item15.

For any fixed extensional decoder of those retained authoritative values, equal inputs give equal decoded lows. It cannot denote both required1 and3. At least one admitted history therefore fails exact lowest-row meaning. This establishes information loss without choosing raw anchor0 or anchor plus current-orientation offset as the semantic oracle. It does not identify which history an arbitrary decoder represents correctly, or certify a decoder for other states.

## Limits and disposition

The older rotation-history observations remain qualified corroboration; no game, reference-model or harness execution was performed for this paired source argument. Geometry, first-kick success, source field updates, successful providers, finite action ordering and a fixed extensional retained-authoritative decoder are explicit premises. Other kinds, rotations with kicks, ledges, reset counts, storage/Continue, aliases, native timing, full R1 and Phase4 remain separate. Q2 detector extent is not assumed.

Confirmed by conditional source argument: at least one of these ordinary I histories cannot retain the required exact lowest-row history in the selected current authoritative representation. No correction, permanent test, model, requirement, CI or public-site change is included.
