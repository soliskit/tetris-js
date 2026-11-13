# Current correction evidence transfer

Evidence recorded November 4, 2026. Documentation only. No finding or certification status changes, requirement changes, repair approval, test removal or phase exit.

## Source and scope

The reviewed implementation is `11ad0a7d5d765c5e19cfecd4e5b93b7fda675032`, the documentation-only PR #466 merge. Since retained `1354e7711d02070b0f6d54849646657e1965aeef`, nine of 17 public files are byte-identical, five have inspected comment-only changes and three have behavior changes. The behavior changes are PR #456 (serializer exceptions), PR #457 (dialog selection) and PR #458 (saving and validity). PR #459 changes the separate browser-coverage script and its controls. Source identity does not verify current deployment or correctness.

| File                                | Transfer observation                        | SHA-256 at 11ad0a7                                                 |
| ----------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `public/game/gameManager.js`        | behavior-changing correction diff inspected | `ac1a005eea8535e184354e52e12588b08763c0b1517ae99181caa760810337c2` |
| `public/game/gameState.js`          | comment-only diff inspected                 | `e8b11ab58994388ef6ca6c7c1d7dce86ea1cd1b9b7f08a0fb01a71922a1be013` |
| `public/game/inputController.js`    | comment-only diff inspected                 | `302d45c423832dbdfb46ba2a4930b72a600ab1db494383ac78e1ad90083c4d44` |
| `public/game/position.js`           | comment-only diff inspected                 | `009078adcb6bc30fe29c70c9e8337b3d89031ec125ffbb57d67c827f28f78bdd` |
| `public/game/session.js`            | behavior-changing correction diff inspected | `2b2f80a79b36690c327defcde090fae66afe241f7fd0f158ab42f034794792f3` |
| `public/game/tetromino.js`          | comment-only diff inspected                 | `40711b2df08839fbe7520176f9150bf0a7369e5295b4a94de200db95a074ff7d` |
| `public/game/tetrominoFactory.js`   | comment-only diff inspected                 | `0d68aa1b2c85e8b3196e32c25674f28fb6e5544f02dcc3507e6616cc1dfc7b1c` |
| `public/icons/apple-touch-icon.png` | byte-identical                              | `0aeea8d0ab4909514a97b4db2216d55c1ecb05b4c18935e768d5b8a95f5181f1` |
| `public/icons/icon-192.png`         | byte-identical                              | `ae98494e7f50a2014cc81b26932937dda62d8a2dd353e580caaffcbf1d5ca876` |
| `public/icons/icon-512.png`         | byte-identical                              | `2c7aa12144eff81c956c4529819d4a511bc8eed863b25ce69fa9c878a61609fc` |
| `public/icons/icon.svg`             | byte-identical                              | `8d96a421dd234365a2285a410dfe94b2148b85209ebd6f8b4244e4626cb031a0` |
| `public/index.html`                 | byte-identical                              | `8de645841df5ea1e98abd5cb07d37759e141f7f2281fa56721567d0cef1be1ee` |
| `public/manifest.webmanifest`       | byte-identical                              | `b8e0c8ff8236a827cd8326a71bfe83b3a30a58be5b151adfc5223f7d4333b403` |
| `public/script.js`                  | behavior-changing correction diff inspected | `9e30936865b59ebb49131e478d61db206cf2258c9711beb9912b0a4c9d4a4dee` |
| `public/style.css`                  | byte-identical                              | `b58dd8a8175dd2036f444c03c16759bc4b1b49be8a2972edefe7897ce9939c08` |
| `public/sw.js`                      | byte-identical                              | `bb7fb85ae7565b060e39b72e5ef843060aac76cbaf73b0c179c446f612caba94` |
| `public/tetris_preview.png`         | byte-identical                              | `c771b5614a0fbab3ed24004bcfec5b9fc4c5995849b9fcfc072dcbafb9ffb18e` |

## Separate accounting fields

The current classification has 55 finding records. Certification has a different denominator: 55 requirements plus eight adopted properties. Finding status, certification status, evidence gap, correction approval, implementation and verification are separate. Historical Fixed is not a current certification.

All 55 full original requirement records and their later historical correspondence have been recovered for reconciliation; their claim, method, assumptions, covered code or model, evidence and limitations remain source-bound. The original P3-C/D/E records and later correspondence are retained at `60a505addf970c67ca99a65f86ee5a2132753cf8`. The later correspondence describes historical tree `1e09ad61c19e0b235a231ad8810dae176be4ea77`, explicitly not current main or later piece-check changes. Original Candidate/Not Assessed mapping statuses are not the later Phase 5 certification words. No current certification word is adopted by this transfer.

All eight original property methods and limits have also been recovered. Their historical Partially Established words do not become universal claims. Current transfer requires clause-level evidence and assumptions, not a test-title count.

## Confirmed-defect reconciliation

The full 55-finding reconciliation retains 17 historical Fixed records at their stated bounds, including intentional changes where named. It neither reopens nor strengthens them. F23 has the actual serializer correction in PR #456. F21 retains its injected holed-board case and the unresolved requirement-interpretation boundary in issue #358. Q3 retains the earlier explicit fix deferral; it is not completed by this record. Row 4's earlier deferral is superseded: PR #427 (merged October 29, 2026) closed issue #317 as completed. S5 is Reproduced for rows 5, 10 and 61, with no new defect claimed by its adopted disposition. Row 68 is Reproduced desktop evidence with a device gap, not an automatic new Confirmed Defect.

Issues #445, #450 and #426 are closed after their corrections. Issues #358 and #371 remain open at their stated injected scopes. Issue existence does not approve a repair or establish a requirement violation outside that scope.

## Affected properties and remaining gates

The persistence effect transfer distinguishes confirmed New Game, missing or unreadable Continue, invalid present content, construction or serialization failure, refused publication, completed publication, a later engine fault, ordinary no-room game over, terminal line clear and stored high score. Metadata availability, exact position retention and independent semantic goodness are different premises. Selected stand-in storage cuts and callback interleavings are not a theorem about every concurrent writer, crash or native provider failure.

The relevant remaining work is the exact current claim-to-evidence relation, affected protection transfer and the applicable disposition of deferred confirmed defects under the governing sequence. This is not permission to build them and does not mark them corrected. Final certification needs the required claim records and approval; minimization needs trusted-component accounting and any removal's replacement protection and approval. No blanket waiver or universal rerun follows from this evidence.
