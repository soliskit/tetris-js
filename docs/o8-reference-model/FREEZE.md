# O8 reference-model freeze, revisions 1 to 4

Status: frozen source record only. No revision is accepted as a complete specification oracle or as evidence that the implementation is correct. Phase 3 remains open.

The clean author was supplied only the four owner-approved input files recorded by D39. The exact input bytes were independently checked against D39. The owner approved the inputs, not the model or results. All four revisions were hashed and preserved before any implementation comparison by the successor integrator on October 5, 2026. No model logic was copied from production. Author statements are provenance evidence, not independent proof of absence of exposure.

## Frozen bytes

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

The bounded report is recorded in `REV4-PACK-REVIEW.md` (SHA-256 33cd355217cffeda3166c240f60a46075945d2d44b023899359ccab14156bb7b). A separate pack-only reviewer reports forced Undefined rollback checks for New Game, rotation, release and touch end, plus a direct geometry comparison of all 28 states. No new blocking defect was found in that review. This is bounded source-review evidence, not blanket oracle certification. Rollback cannot reverse caller storage side effects; the differential harness must preflight required choices and discard a trace that encounters Undefined. The successful-soft-drop restart counter is not a deadline or timer-phase oracle. Other scheduler reissue points and all stated partial choices remain unmodeled or caller supplied. Kicks, spawn position and other choices may never be taken from production to define its expected result. Legacy save formats, stored high-score validity, input mapping, device/display/outer-layer behavior and real timing still need their separate evidence methods.

## Publication and merge scope

The exact executable source and self-check bytes remain preserved on the unmerged `soliskit-patch-17` branch at 3cc3956783184def0eaf3d7d6b86d536c80c9e0b (PR75). The documentation-only branch includes the approved inputs, correspondence notes, freeze hashes and reconciliation, but excludes all eight Python files. Their presence on the retained source branch is not owner approval to merge them. This documentation records their exact identity and known limits without changing the game or its tests.
