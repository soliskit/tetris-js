# Frozen O8 revisions 1 and 2: source reconciliation

Status: model review, not an implementation finding. Phase 3 remains open. Revision 2 cannot yet be used as the complete correctness oracle. This integrator record is implementation-exposed and is never clean-author input. The separate pack-only reviewer supplies its own pack-derived feedback to the author.

## Independently checked model issues

- Geometry: direct enumeration of all 28 model states against the approved table found one discrepancy. T state 3 in both frozen models ends with (2,0), while B2's approved table ends with (2,1). The other three cells are (0,1),(1,0),(1,1). This is transcription error, not missing specification. The old correspondence's claim that all non-O states match is false for T state 3.
- Opening state: default Model() has an empty queue and its own valid_state reports B7. B1 applies the R1 predicates to opening; B7 requires three valid queue elements in every mode. The actual contents may be supplied input, but an invalid placeholder must not stand for a legal initial state.
- B12 predicates: valid_state accepts game over with a pending confirmation and an invalid held-direction value. The confirmation restriction only runs in its playing/paused branch, and token domains and uniqueness are not checked. These are missing predicates, not owner decisions.
- More completeness checks are needed for B3 strict types, high score, token uniqueness, repeat domains, touch-drag state, B13 resource correspondence and fault-state versus ordinary-state validation. Semantic absence at game over must not be confused with mandatory clearing or with permission for malformed semantic values.

## Partial specification versus model coverage

The pack does not supply the kick table. B2 expressly adopts geometry only; PCE-4's SRS rule does not put published kick bytes into the pack. No production-derived kicks may fill this gap. Spawn placement, release-repeat timing, opening queue contents, optional failed-read outcome, tap rotation direction, held controls at start/refocus, and high-score write timing need explicit supplied choices, allowed-result relations or an undefined result wherever the pack does not fix them. These are not automatic requests for new owner decisions: partial specifications can support bounded claims without inventing behavior.

By contrast, the already-adopted frame principle supports unchanged unassigned state; C3/E2/E3 explicitly cover resume suppression only. New-game/refocus suppression cannot be imported from those rules. B9.2 governs lowest-row/reset behavior. D32/D33 fix confirmation cancellation, completed-turn line-clear saving and Continue's assigned effects. Candidate deterministic readings must each be traced to those statements, not labeled universally as missing owner decisions.

Requested gravity timing is incompletely represented: the frozen model only updates its request value on gravity tick/soft drop, although legal start and resume also schedule gravity. S10's requested-delay reading does not certify actual firing time. Touch excursion encoding requires further source review. Continue availability is explicitly specified by D20 section 1.2 item 5: eligibility true, item 16 false and saved content valid. The initial concern about prevalidation was mistaken and is withdrawn. Stored semantic payload validation does not establish acceptance of the exact released formats required by STA-6.

## Next evidence

A clean source-only correction retains both freezes, supplies a new revision checksum and a requirement/approved-decision justification for each change. A separate pack-only review checks geometry, state predicates, legal transitions and explicit partiality. Independently designed implementation differential tests follow only for classes where the revised oracle is defined and its mapping is justified. Agreement is correspondence evidence, not formal proof. Device, display, outer-layer, timer-failure and released-format evidence still require their own methods.

## Revision 4 review disposition

The pack-only review reports no new blocking defect in revision 4 after the revision-3 Undefined partial-mutation defect was addressed. Revision 4 does not erase the earlier freezes or their known errors. It supports only defined semantic transitions with independently grounded supplied choices. Storage side-effect rollback is not provided, so harness preflight and trace rejection on Undefined are mandatory. Timer-phase/deadline, legacy-format and outer-layer claims do not become covered merely because the revised semantic model runs. The successful soft-drop restart counter represents only the declared successful-drop case. Blocked soft-drop handling and other request scheduling need their independent source analysis and separate evidence.
