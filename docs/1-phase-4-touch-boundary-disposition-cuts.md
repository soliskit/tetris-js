# Touch end: two boundary cuts awaiting final criterion disposition

The selected permanent wobble tests use small wobble and longer drags. They do not check exactly10px or a pointer-up position differing from the last move event. Historical fullpage v6 already checks exact9/10px through trusted Chromium protocol; v3/v4 separately check synthetic down/up60px without move after capture failure. Those original branches remain distinct below. The current handler decides tap from a latched move flag, not from the end position. These two cuts need criterion review before they become findings.

Conditional source comparisons for independent review. No new browser/game execution, pixels, native-event-frequency claim, finding promotion or code/test change.

## Independent criterion and source

REQUIREMENTS INP5 allows10 px finger wobble. D33C2 says rotation commits at touch end only when it ends within10 px of where it started; cancellation commits none. D34E1 further requires never moving beyond10 px during the gesture. The inclusive-equality interpretation of "within"/"beyond" would admit exactly10, but remains a candidate interpretation, not an explicit adopted numeric/equality decision. Screen-coordinate pixel meaning and second-finger cancellation are not established by those words. Previously committed moves/drops stay committed.

Governing criterion records are D33C2 and D34E1. Their original owner exchanges were inspected privately; no owner provenance quotations or response times are included here.

Fresh main13702c297f3c05c082819f65e40cd71fd3e1117d, public/script.js SHA25659fcb3343f35d0022c739cce82c5c9601a9e3bc354a9dc991eb1660c4e599ad4. Pointerdown431-438 records start, currentpiece and pointerid then capture. Pointermove440-483 uses the current start anchors and compares Math.hypot(dx,dy)<10; if not less, moved becomestrue. endDrag486-491 computes tap from !moved, pointerup and currentpiece identity. It never compares event.clientX/Y with the gesture start.

Successful capture/browser transport and numeric values are stated premises, not blanket W1 trust for unlisted pointer capture. No failure, mode change, piece replacement, gravity delivery or intervening actor is admitted. These are selected handler event-value sequences, not a claim that a physical device necessarily emits them.

## Shared admitted prestate

Choose a completed playing canonical T at box(0,3), empty dense20x10 board, currentorientation0, score0, count0, history greatestoccupiedrow1, ordinary dense valid queue/bag, no held control or drag, one outstanding gravity firing and no lock delay. Manager and UI refer to the same current object. The canvas size cache is present and cell width40px. All selected scheduler, geometry, callbacks and drawing dependencies succeed. This is an explicitly admitted canonical snapshot, not a proved ordinary creation history, game-written save or native browser launch.

The independent fixed geometry table gives T0 cells(0,1),(1,0),(1,1),(1,2) and T1 cells(0,1),(1,1),(1,2),(2,1). At box(0,3), both fit the empty board, T1 does not rest and a zero-kick clockwise turn is available. The rotation distinction does not rely on a production returned fit value or shape-changed assertion.

## Cut TE1: equality swallowed as drag

Supply pointerdown at(100,100), matching pointermove at(110,100), then matching pointerup at(110,100), with the same currentpiece throughout. Maximum/end displacement is exactly10px, within allowed wobble and never beyond10. Under the separately stated candidate inclusive-equality reading, this would be a tap that must rotate at end; criterion classification remains open.

Source pointermove calculates hypot(10,0)=10; 10<10 isfalse, so moved becomestrue. The offset10/40=0.25 rounds to0, so no column movement occurs; dy0 causes no row drop. endDrag sees movedtrue and invokes no rotation, then resets the drag. Thus the selected source misses tap rotation under that candidate reading even though no geometric drag occurred. An exactly10px event coordinate is the finite numeric premise, not an assertion of physical measurement precision.

## Cut TE2: endpoint absent from classification

Supply pointerdown at(100,100), no matching pointermove, then matching pointerup at(111,100), same currentpiece. The endpoint is11px from the start, so the independent criterion says no rotation even if no intermediate event was delivered.

Source moved remainsfalse. endDrag never reads the end coordinates, classifies tap and invokes rotate. The ordinary T0 zero-kick turn yields T1 and then resets drag. This is a selected event-value domain, not proof that native transport may omit a pointermove while moving11px. If that admission is required for a native claim, it needs separate browser-contract evidence or a controlled event method. The absence of an end-coordinate read is established directly and remains an implementation-side comparison; do not infer native occurrence from code.

## Historical contrast and permanent coverage

docs/phase-3-fullpage-touch-supplement.md already reports v6: constant random0.3 gives S geometry, trusted Chromium protocol coordinates/capture with no page errors,9px movement/end turns S vertical and exact10px preserves S. Screenshots were inspected historically; independent code/JSON/geometry/screenshot review occurred without independent browser rerun. It explicitly keeps equality interpretation Candidate and covers only one S,x axis,integer coordinates,desktop Chromium protocol. TE1 is a current source/geometry reconciliation of that known cut, not a new discovery or replacement raw receipt.

The same supplement v3/v4 synthetic untrusted pointerdown/up60px with no move rotates a non-O after capture throws "No active pointer with the given id." Cancel does not rotate. That branch is not TE2 successful-capture premise, native omitted-move transport or physical reachability. The original source gap is known and stays separate from its failed-capture result.

## Existing coverage and residuals

The selected touch test declares a6px/3px wobble, not the10px equality, and longer drag samples set moved. It does not independently bound maximum displacement or assert terminal distance. Normalized T2 after two taps is a useful chosen geometry answer, not either cut's admission or execution receipt. Failed capture, missing canvas size, mutable anchors at walls, lost capture, mode changes, gesture cancellation, touch transport and all future geometry remain separate.

TE1 is a conditional source mismatch against the candidate inclusive reading; no settled criterion defect follows until that reading is resolved. TE2 is a conditional source mismatch for the chosen end-value sequence whose native admission remains explicitly unestablished. Neither is a complete W30-W33/frame/checkpoint or physical INP5 result. Independent review must validate admission and meaning separately before recording a narrow Confirmed finding or selecting one new declared measurement.
