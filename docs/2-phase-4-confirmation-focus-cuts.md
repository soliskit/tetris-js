# Confirmation focus: distinguish the settled dialog from its unfinished and lost-focus cuts

The ordinary dialog has useful settled tests: Cancel is focused when shown, arrows move between two buttons, and the chosen answer acts. The same source and tests also expose pending states with no selected button. That needs an operation/commit comparison, not an assumption that focus is only presentation or that a passing settled test covers every history.

Working source and existing-evidence reconciliation for independent review. No new execution, native timing claim, finding promotion or criterion change.

## Criterion and concrete adapter

R1 B12 requires Cancel or New Game while confirmation is pending, absent otherwise. D32 operation1 sets pending and choiceCancel; operation2 changes choice; operation3 clears both or starts confirmed New Game. D16 evaluates a specified operation's conceptual commit, not automatically a function return. D31 frame principle and the existing operations remain governing. No asynchronous grace, overlap/abort rule or extra no-choice option is adopted here.

Current main13702c2 has unchanged manager31bb2160 and script59fcb334. The manager stores pending, not selectedchoice. script derives selection from document.activeElement while pending, and native autofocus/focus changes are writers of that projection. showModal is called later in syncControls during drawing; pending changes earlier in manager action. A missing choice cannot be quietly projected toCancel because press selects no button and performs no click when none is active. The move callback's next arrow selectingCancel is a later transition, not retroactive denotation.

## Existing branch table

| Cut | Source/selected evidence | Exact unresolved relation |
|---|---|---|
| Settled open | HTML autofocusCancel; permanent game.spec92-149 asks, waitsvisible and assertsCancel focus, accessible name/description, arrows/highlight and answers. Phase3 browser observation has inspected Cancel-focus pixels. | Successful native projection under settled wait is bounded, not all initial commit/callback failures or focus states. |
| Before native open | Fullpage supplement records same-task NewGame click returns dialogclosed/activeElementempty before frames; later rendered dialogopen/Cancelactive. Earlier V56/V85 source histories include outside second NewGame before native open. | Need legal-operation existence/cutpoint comparison. Do not invent that pending is committed at manager return or that later rendering permits unlimited unfinished pending. |
| Focus absent while pending | Permanent controller test152-207 explicitly blursCancel, pressesA and expects dialog to remain; nextRight selectsCancel, nextRight selectsNewGame. Source press optional-clicks active known button only. | The test constructs a no-choice state and accepts no-answer behavior, but does not independently reconcile that state with B12/op2. Programmatic blur is not physical Tab/focus-loss frequency. |
| Native arrow selection | script move clamps active index+step intoCancel/NewGame; with no choice both directions resolveCancel due index-1. | Correct chosen two-button transitions and recovery are distinct from admission of no-choice. No engine check follows focus write. |
| Native Tab / click / restoration | DOM may change activeElement without the move callback. Dialog close can restore focus; selected semantic value is absent after pendingclear. | Enumerate reachable focus states and legal op2/op3 frames, distinguishing browser feature semantics from project's adapter. No all-AT/native guarantee. |
| Resume while pending | Shipped paused Resume caller clearspending then setsplaying; current-clause-process-support LANE-D-PENDING-NONKEY explicitly retains this adverse literal-any-other-action outcome. | Whether one source action admits no-answer then separately legalResume needs an exact sequence/cutpoint argument. Not automatically a new violation or compliant composite. |
| Failure of showModal/focus/draw | draw catch logs and retries; manager pending may staytrue. | SAF5/U2 notice/test-signal/continuation and valid selected-state commit are separate. API success trust does not cover thrown project handling. |

## Important-test independence

Focus/text/role/highlight literals are useful independent selected expected answers. The production-generated saved fixture does not supply a full paused-state/good-history premise. The tests' awaited settling and twoRAF controller helper narrow the method to endpoints. The explicit blurred-no-choice expected outcome is an implementation-policy assertion, not authority to widen B12. Native activation, all modifier/held-event edges, programmatic delivery, assistive technology and pending-before-render histories remain separate.

## Next classification cut

Use the existing legal-operation-existence method against the no-choice branch and the pre-native-open branch, carrying both successful and abandoned histories. Recover the exact V85 source method/results before choosing new cases; a newly narrated table cannot replace them. If an adopted commit/choice rule cannot answer the comparison, it is a precise criterion gap to prepare, not permission to default selection or bless an asynchronous state.

This advances W22-W24 by tying actual selected assertion branches to specific commit/projection deficits. It does not complete the focus writer domain or prove the whole STA1/INP4/B12 property.
