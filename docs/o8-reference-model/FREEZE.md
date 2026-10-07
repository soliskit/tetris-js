# O8 reference-model freeze, revisions 1 to 4

Status: frozen source record only. No revision is accepted as a complete specification oracle or as evidence that the implementation is correct. Phase 3 remains open.

The clean author was supplied only the four owner-approved input files recorded by D39. The exact input bytes were independently checked against D39. The owner approved the inputs, not the model or results. All four revisions were hashed and preserved before any implementation comparison by the successor integrator on October 5, 2026. No model logic was copied from production. Author statements are provenance evidence, not independent proof of absence of exposure.

## Historical status scope

The "Phase 3 remains open" status above and in the reconciliation record describes preparation of these historical freezes, not current audit readiness. Later advancement and closure records are `docs/phase-3-limited-advancement-record.md` and `docs/phase-3-formal-criterion-gate.md`; completed publication followthrough is recorded in `docs/audit-status-and-dispositions-2026-10-06.md`. Their stated limits remain. Publishing this archive does not reopen or close a phase.

## Frozen source identities

| Revision | File | SHA-256 |
| --- | --- | --- |
| 1 | `rev1/o8_reference_model.py` | 6ed0c7a7a3c7958b3d174082ee01ece036a3c2e85c1f4bf483b47f46e11a125d |
| 1 | `rev1/CORRESPONDENCE_AND_LIMITATIONS.md` | ba73e7f8d9552ed37a7bddd74c0156d118d93c3af1f8e1217e7693dc8bbf13d4 |
| 1 | `rev1/selftest.py` | e260d13d67208ca383126eeda14276015b0694535b2926220f837a423374fcda |
| 2 | `rev2/o8_reference_model_rev2.py` | cb7d3d869117505e074d3a2ad750f8f844ae77bfb88ddefa943dbab84fdf3cf0 |
| 2 | `rev2/CORRESPONDENCE_AND_LIMITATIONS_REV2.md` | e70232e0a36b51eb4b8bc36d13588ec58f7b553d750491c4cc9ce5bad45ba5f6 |
| 2 | `rev2/selftest_rev2.py` | e260d13d67208ca383126eeda14276015b0694535b2926220f837a423374fcda |

Revision 1 remains unchanged. Revision 2 adds a comment to the model and supplements rather than replaces the full revision-1 correspondence and limitations. The revision-2 self-test is byte-identical to revision 1 and imports the revision-1 module name; running it requires explicit module staging. A successful self-test is self-consistency evidence only, not implementation correspondence or proof.

The author withdrew the proposed O-piece geometry discrepancy in revision 2. B2 explicitly defines a 2x2 local O box; the image's larger rendering canvas is not that box. This is a source interpretation to review, not a new owner decision or an implementation finding. The frozen input header still says DRAFT, NOT APPROVED; D39 and the original owner exchange govern approval, not that unchanged header.

All undefined cases, deterministic candidate readings and omissions listed in the full revision-1 correspondence remain open except its G1 O-box concern as addressed by revision 2. A frozen model is not automatically an accepted oracle. Source completeness, legal state, undefined input handling, persistence formats and independently designed differential evidence remain to be checked. Later model changes require new checksums and a written requirement/approved-decision justification, never a change solely to agree with production.

## Revision 3 freeze

Revision 3 was received and hashed before any implementation comparison on October 5, 2026. It remains pending independent pack-only review; no oracle-readiness or correctness claim follows. It supplements the earlier limitations rather than replacing them.

| File | SHA-256 |
| --- | --- |
| `rev3/o8_reference_model_rev3.py` | 0fb4844a578a7917437d9329b0e92778690202bf5896bb55d735d3aee8e0cde6 |
| `rev3/CORRESPONDENCE_AND_LIMITATIONS_REV3.md` | 1549e1a96481620dd9b34af3d0c3161bdc1f81f7d527f2362dfc2683c43bb503 |
| `rev3/selftest_rev3.py` | 2683847a8efb14a119a0bb1a7d8075a7e52187e6fb3745d6141a7758dfd95a25 |

The author reports pack-only corrections for T3 geometry, opening queue, B3/B12 predicates, caller-supplied A10 choices and touch excursion. Gravity-request representation and the derived interval require further review against S10. These are author claims to check, not acceptance. Continue availability is specified in D20 section 1.2 item 5 and is not an unspecified choice.

## Revision 4 freeze and bounded review

Revision 4 was received and hashed before any implementation comparison on October 5, 2026.

| File | SHA-256 |
| --- | --- |
| `rev4/o8_reference_model_rev4.py` | ad35423776ebda03c8e585d6847faa0fe5fab86431fdda8aed23967f87483430 |
| `rev4/CORRESPONDENCE_AND_LIMITATIONS_REV4.md` | ac2a6ce580b996f990a42d157207bcb2280a5122df12cf437ce28fff5f14f395 |
| `rev4/selftest_rev4.py` | c581a3eee4b6a4d6506e9e1b771be8030c3f9fd5af2ef9a8f35028b193b6d41c |

The revision-4 prose note has a nontechnical publication redaction. Its original source identity remains in the table; its current published SHA-256 is `d27eed85c80824d771306508708ade5134b854c0e88472dcbc4fdf9537bfaced`. All technical corrections and limitations are unchanged. Model, self-check and input bytes are untouched.

The bounded report is recorded in `REV4-PACK-REVIEW.md`. The original review hash is its historical source identity; after removal of the precise reported-review time only, the current published SHA-256 is `1f0f193bbac3456b54aac50d687c78b083d90283541894dc9b57dbc8c36c62b6`. A separate pack-only reviewer reports forced Undefined rollback checks for New Game, rotation, release and touch end, plus a direct geometry comparison of all 28 states. No new blocking defect was found in that review. This is bounded source-review evidence, not blanket oracle certification. Rollback cannot reverse caller storage side effects; the differential harness must preflight required choices and discard a trace that encounters Undefined. The successful-soft-drop restart counter is not a deadline or timer-phase oracle. Other scheduler reissue points and all stated partial choices remain unmodeled or caller supplied. Kicks, spawn position and other choices may never be taken from production to define its expected result. Legacy save formats, stored high-score validity, input mapping, device/display/outer-layer behavior and real timing still need their separate evidence methods.

## Publication and merge scope

The eight executable model and self-check files from historical revisions 1 to 4 are preserved without byte changes from PR75 source commit. They document earlier partial models and their known errors. They are not the latest model, an accepted complete oracle, production code or permanent regression tests. Later revisions 5 and 6 and their separately attributed bounded comparisons are recorded in `docs/phase-3-ledge-observations.md` and `docs/phase-3-observation-integration-record.md`. Those records remain separate; archive publication does not accept any revision as a complete oracle.

The current approved input pack, sanitized correspondence notes, review records and later audit history are retained from main. Publishing these historical executables does not replace those records, reverse the nontechnical publication redactions, accept old model readings, close Phase 4 or certify the game. The frozen self-checks use their own model-derived predicates and test-control choices; a successful run is self-consistency evidence only.
