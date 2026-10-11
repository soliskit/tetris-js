# Status-label publication migration

Base: 3edfab9aa98f3086242b239fac48489f37fd7db8.

This receipt records title-case restyling of human-authored labels in current and historical publication copies. Source evidence, status assignments, scope, limits, model semantics, normative requirement rows and privacy redactions are unchanged. Old hashes identify the sanitized pre-migration base; new hashes identify the current publication copies. Original older source hashes retain their historical meanings.

## Current publication identities

| Path | Sanitized Base SHA-256 | Base Bytes | Current Publication SHA-256 | Current Bytes |
| --- | --- | ---: | --- | ---: |
| `.github/pull_request_template.md` | `9907fa18645a9b1a16447b350d9b1225ffe8d24f9d9917b39c2149c70964fc5c` | 1663 | `b5a2c240d0a8bc7c77218a243019d4d77bc3c8fbc14ccb8ce3656552e77ef887` | 1663 |
| `AUDIT.md` | `3d40a2dde6de25b032fb8c62a4d0ae839705effde6b6a2dc82291ea786e7a2d8` | 147733 | `0f4bc4dece36548f9cacdca6cedcc36df94eebbf0e8b420dda85fb3a03d0dc30` | 149323 |
| `REQUIREMENTS.md` | `fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc` | 15045 | `c1638c722df5bb25f81fbf42dfd2751ef872290ff13d164763df3e321a7f2020` | 15045 |
| `docs/1-focus-native-heading-criterion-comparison.md` | `3b64beaa37a647adcfdf238e7f229d4c52414e4cd429a858507b8b10f5d2fb68` | 7365 | `980391c6272ca093fba878d3adbec351c0108e21ab06942948fcdb6fdd021b79` | 7365 |
| `docs/1-phase-4-breadth-reconciliation.md` | `7b7486e67c42b2dc6baca42ad0fd4bd29f61353562f393097680fc5f7edab68c` | 8135 | `6a3b3b16096fe5dc81e29b91d116f1d8377b725d30821340e8e93f9c00e39e9e` | 8135 |
| `docs/10-browser-app-game-safety-child-oracle-register.md` | `b4449cac6f5ccae48e9f1c60db56dc1e6fef147cbc5511dbc98b7a6a89a1e7c9` | 27245 | `40c7e687b5949fb98530a906ff7f09d8ec2edbcaf87b21c5b9eb81543ea80578` | 27245 |
| `docs/10-engine-game-child-oracle-register.md` | `be5fa193a844e8c19b513f329cf28a5e3d7d344a94d6fc7a1c0f5cc399fde0ad` | 30765 | `f7d9ae5be1357c7c0998e4e430d9eda906df9b10faf4331b91601fb100a5e3c5` | 30765 |
| `docs/10-tetromino-factory-child-oracle-register.md` | `c3c0b2c983a8f9dd0f169dd54162cee8c6b18d54421cb1459bd4ce5df8c60607` | 20985 | `caf8e6079735dc9d204a1abaa69161327c292132d26459fc3136d7fd1e46ef80` | 20985 |
| `docs/10-touch-browser-child-oracle-register.md` | `ff2bbbb7e197cbeebadeb133746c0618764dcf4ebbedc89c18adabb250b79861` | 17231 | `a8dc1a2e3f113e912f6e8abe544f40810775785cabd3d772c0b3d5c34488b5e4` | 17231 |
| `docs/12-empty-board-fixture-admission-argument.md` | `2df4419a1b50e92b35dd9e0fd1bb15f71c630bd796ed8e8f73c5edcc4a739195` | 9442 | `7ee26d05b6a5407504a188423c5e2cb4d152eb3d0afef32981cb29fccec2baac` | 9848 |
| `docs/13-o-piece-exact-geometry-admission.md` | `8d05084f0f4b4e90c20c2a05507ee90e65ac7633d507efce194648bc1cc5f0b2` | 7947 | `0d8359705dcc062299e80a3e47b8cf2da7447926b7864aeaf0153fb7512b3ecf` | 7947 |
| `docs/14-row-clear-board-relation.md` | `bb21e8f5f28749e328c7bf1d869d42833319868b0e818145e44a3d3ecbc16e0b` | 8213 | `88eacd0ce200e02fb835d8241b13380453c1e6cb58cd12dbf2625d9b708c82af` | 8213 |
| `docs/15-canonical-lock-board-admission.md` | `e1e8c90d7f09f2d833149d56902238546dd25528a802003fb117acbc5a79b8c7` | 7329 | `a4b4951a7d17c54e25b0ddc392922647d5d708b62e070f40917be8e1bfa7caaa` | 7329 |
| `docs/16-i-clear-helper-path-admission.md` | `e31536ae363123cf412a8cfac0a849bee1a1ded3ebf7ce76ada3711f397adbfb` | 7607 | `a4ba06ff49f58301bb7c248343acde932e90a8695f864ea8a90ec983a22095c3` | 7607 |
| `docs/17-session-current-piece-local-admission.md` | `73ba1b6cd49a1e5109d1e3fb0386474ef0ad1b9163fb81a28657ba292d0afc37` | 6339 | `6cde1a62ddd53c595a42aed29c67a4c83c9e67c24509c23186e8c0a4973b9762` | 6339 |
| `docs/18-canonical-drop-distance-argument.md` | `b8cd71dce73f75f9273fab77622449c976d57b028d824f55d367e1f1d29f13f8` | 7273 | `15e157959990917ef335d83f707169b8959bb91e4ee7151d4036ee43697aafba` | 7273 |
| `docs/19-canonical-factory-coordinate-admission.md` | `ad74e3c6dccef9b75f2ae3661f97df3d7012a7c0bc39b36c957edaa662c21d88` | 6273 | `ee9c53a06432900a86036c1f3cc059920c836a9fb8c6b2b5a42326b163b0ae83` | 6273 |
| `docs/2-focus-native-prefix-source-certificate-proposal.md` | `97b13137cb121416350201fe4723bc0bd944c4c957e047c56d464f0f8b934df2` | 6102 | `dfa1e0f68acd3f2ab25bdb4e0747ca049141e9eb1ea83d4618dfa00bf335f665` | 6102 |
| `docs/2-focus-v85-suffix-reconciliation.md` | `a82eb0764dffb5859e464f103a63675fe3cdc3416f6efa20b52bf01f8362f403` | 4074 | `991195cf86ab7e4bdd2d438f9ca62f396996758a7f911626fc088b4581856bf8` | 4074 |
| `docs/20-seven-kind-remainder-source-induction.md` | `7858750fb10b06b5f3f3f51a0f1d0c248c56191ca8da25d9c5432bbe418976e2` | 7857 | `4b1d877942279f4e95a81b2113865dabb9771c73f0c87567f4199cb15b6f9156` | 7857 |
| `docs/21-board-density-writer-relation.md` | `fc3e64a4d7a6ae290f62cc3450b7972876379c30cd6582f356e00b6615002acc` | 7041 | `fa6043ccf0c8acee15cd0d71438d70f7dfb4e20eaba0f9663ee1f97cfb8d6306` | 7041 |
| `docs/3-cache-order-reviewed-classification.md` | `5f12480c474fc629b5a5e2a3ff71f975eaf84f91cd7d7b212acc287682a3dca5` | 3534 | `2c58fa740b088cbfbfde17a104339d16c827f789554ede499b6d7d4ca481dae3` | 3534 |
| `docs/3-focus-admission-final-boundary.md` | `c2dc12e4f72308c7488f96e26a9eb21d439a5ba3e0c51a4070b9edd1a524eaa3` | 3925 | `23e60dece3d46a68877e8f9394115a1df19c4245ae1f0ab71548c61c90a80a32` | 3925 |
| `docs/3-focus-inp4-missing-response-candidate.md` | `00657ff5e403ebcb90efdcbff3e4959270c98fe374045627e4d8137fa124f61b` | 6307 | `0f8b187f6be09af93bd50bdc073c3630b521272bb2b5514428847e0b53198f5d` | 6307 |
| `docs/4-cache-reviewed-findings-disposition.md` | `bf194f644fb96684778684851ca09795bdd53fb521193303de2131417f25b0d8` | 4190 | `2b6e44c6d71bc17bd726952f764dbf161e2a43385f86c528d85739e429d371e8` | 4190 |
| `docs/4-focus-inp4-scoped-classification-proposal.md` | `2da56d8cdc99900bce97d0532e00a3c501b2dfd912de8c8e3400b83fb4950a1a` | 5575 | `ffe42a047b5cd6b4bc3ee411d65d4658a7bbb35964e151822ee02e67fba93343` | 5575 |
| `docs/4-phase-4-exit-checkpoint.md` | `b6e36809d509556d0b7e1c7aa36686fdb6b2fe2e9c26ceef54b7cbbb63924a8d` | 8464 | `8a5de6a3236dfb4838628f682416830af6b600a7a23556bcde8d24578af81628` | 8464 |
| `docs/5-current-save-blocked-target-resolution.md` | `4f04ddcc1fcc3533f936895b6c9e998588577ea5b952c85398ffb6286803ad9a` | 3788 | `84ad0f12957de88112cf113074b46e5a39d9b73ce127423758f903840e7dbe5e` | 3788 |
| `docs/5-phase-4-closeout-matrix.md` | `5fcf5701b6f6a067100e5556e06b7b3d6eac6811c1e842972ac141df1d7356e9` | 58251 | `2b1d620b0ce9e0fb120c23bd397e6e297dee6a41eb4f6073e12d211c7205491c` | 58251 |
| `docs/6-session-child-oracle-register.md` | `abf43d3e8aff4cf0991c51f3c2b27898dccf838228254f3085f3d92d8a8a4535` | 16907 | `6b4b12697b1816db69d34b5ea957dc7cdfcc7c5698c24ebf0ffc19a917aa7cc8` | 16907 |
| `docs/7-controller-child-oracle-register.md` | `88f20f7fcb2cab201029984aa6265e71543b00deef688a0a5319054bcf4521b6` | 15918 | `8ef4b98afc0bc67ec3220e08e81b93e46c6951a96dc883da9dad33948c225444` | 15918 |
| `docs/8-session-raw-format-oracle-cuts-proposal.md` | `42c25c974af1ed0196de5291981b21dbdf3b2a3087ede6cffb23e9e5629d5f9b` | 6565 | `d774f83ea4f6cadcdc3f2524394988b4fce78628db2de2252c8e2fcaa31b9d1d` | 6566 |
| `docs/9-safety-child-oracle-register.md` | `565afd5ecdb64464480c7ac46b09f6ae375ab784dc107631019c96e8ec522d89` | 12186 | `f61eb23de5837bd2f2ca139db3947f309c4d3a55d59989707e92caabea09cf38` | 12186 |
| `docs/audit-blueprint.pdf` | `ae35c5c8f4b2ddcc2f12eeaa319eb6f55e9708f1a4aa0dd4157c4767f64789ca` | 355468 | `8a35b80036219ed6581882045e1e38567ec6c86d31091564c01f33b714ff64b1` | 144509 |
| `docs/audit-blueprint.txt` | `833ba9827d1eb9cb522b524fa4de7c757a63e089c223b66b6aa7bd38db39e464` | 120534 | `299ad0329c1614f02e78b9b5315ee0ff579e6768193dc4b48fbd1856a4c6ca44` | 121053 |
| `docs/audit-status-and-dispositions-2026-10-06.md` | `f4932a89fedd090de4ed6a02954c8317149930ce23f58f06e264b52288ed15f4` | 10605 | `282889b9b02ce07ff626a83300569ed22db260c09859403e321470d07a007452` | 10605 |
| `docs/continue-payload-read-failure-scoped-disposition.md` | `1fe076f871b498c7c903f2d85208301305eb454447a4f1c87f28441fd6d06989` | 5192 | `360417036709fef0818721824d39455d98e84d5fdb238b7acbffeee0f1d57533` | 5192 |
| `docs/default-engine-fault-message-disposition.md` | `c31821772164e18c6fb72a43de246f6bd36f8c61c5ebd4cc27e19f2f7cb0b515` | 3428 | `2787830c649d97ea7202fc5c2732787043a682a895fe67121e83124b0b6d4b80` | 3428 |
| `docs/exact-high-score-ordinary-write-disposition.md` | `9e6773a5832ebc00b4c4102367c2a7cc18fb45b041638f41d0047c687967c69c` | 7311 | `33619d33744ac7acde1da92c8215e3ae6ef052d7afe1305a5936cf76abc3c4ef` | 7311 |
| `docs/exact-high-score-read-disposition.md` | `1c8b4738c407fe19533ce1e9c370efbf7341f5cd293da6d1d747d195390dcb42` | 6579 | `3c26cc8f34ceb5a9630157692b1d930e7d87b0f28b7bf75e94c36586d5c35473` | 6579 |
| `docs/failed-withdrawal-availability-disposition.md` | `828dc10b8a55f7edbe7d6fc55b21f3f4c1c54e88a817833525bcaf04c1b58cff` | 5278 | `45d6c8aa037035977b1c5c51fad4156bb3e008736bac3ad4f6756777edcd0085` | 5278 |
| `docs/held-soft-drop-resume-disposition.md` | `17e6069d9b425789e6784429d46f048b16a7876e338e7076cb7aa3e9d2e509e4` | 5243 | `104b76409f95f39758de493466f169d7c2483ca3e9b4f57b8ae238eaebdb221a` | 5243 |
| `docs/lowest-row-rotation-disposition.md` | `eba52a1354447450b8d121a2e3a950024520fe1dc62060b744b53367df118b03` | 5058 | `e7675c4da25178519e58d5dea8acf94a080a20a25f8063880cddfdc3d7006eb9` | 5058 |
| `docs/milestones/modern-gameplay.txt` | `acd16d13069d6a2944bf865a366374900a3fb2681cc72147e5fc197364c0d2da` | 43455 | `ac5cbb3cb9557b3e1a80bf9dcb3feddcc1a8168c3db6786a5fd2d13b70bbe279` | 43455 |
| `docs/new-save-reset-count-disposition.md` | `1a8a6d0c34763245a9006a56b09d6808ba23862bc32a375b6e04078b12781bfe` | 6694 | `e4e182a924cb3ab5df906da220b41e7bc6332d3c4b4bdb466b5b75d850e5d761` | 6694 |
| `docs/o8-model-input-pack/REQUIREMENTS.md` | `fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc` | 15045 | `c1638c722df5bb25f81fbf42dfd2751ef872290ff13d164763df3e321a7f2020` | 15045 |
| `docs/o8-reference-model/FREEZE.md` | `fa3133427ed10a70f38f2cce5c243bdad9a19932e14d426a941f95e384f6690b` | 7331 | `86fcb4182217adaf8fd26b8ef5f5d8a97acb58b2f381ae93577357c68b119320` | 8080 |
| `docs/paused-count15-resume-disposition.md` | `e831276d04201999e92d78e6fd07811e9b2f7030ed59d08eaeb65f2210ddc3c0` | 5857 | `d11a24b1e840366d77ad0adb90914308b63ad54708e4376c6bc083b1d4170932` | 5857 |
| `docs/paused-held-repeat-resource-disposition.md` | `bc44cc935c816680e2c11b52c713db0fbdeef9ddeeab132042b95207ec98bac9` | 4686 | `273c664625c770a66c9e3eac2a575cc8fc14178f9da31f124d6c1398cfbf8095` | 4686 |
| `docs/phase-0-baseline.md` | `b895da3e0609f24e3ba4c3192ee6ff4a83af398c06b71c4d116c6d327355afab` | 31626 | `425982a0208fcad4e93e38f7733fa517fdd3123619dc8da594856ac114fbe732` | 31626 |
| `docs/phase-1-normative-text-register.md` | `853d13d45d040c5514e6b36d2f5b8968e73060e30827190df0e64d31abe2bc33` | 4934 | `f163c451698e718e611458573a0124b38280d402197c7a5aeb91e94631a33060` | 4934 |
| `docs/phase-1-r1-proposal-rev1.md` | `e8b07e12337ffae78c377bec2f1079851a719b7d29d26b1e7e3fa46ee8bc0798` | 33114 | `c35412d3f98648683a24fd2328ad8be69f51061b4fe5e4b4d2b2195da1437432` | 33520 |
| `docs/phase-1-r1-valid-state-proposal.md` | `1bf080536089b55c15b34fe0927349e0c6a7669b54855f222ac1dc67bbea1b5d` | 41950 | `e88510c23f4a729f35d0366ecf9c69b25891179714f6207862f75916e174eace` | 41950 |
| `docs/phase-1-record-index.md` | `9b248307a153dfa94eee135a019262a5a9a0e71c60768820893737700f59a27e` | 4586 | `50914b48901aa06792f4d67f61690a032ae6eb893112db964109a77bbe3a6b41` | 4935 |
| `docs/phase-1-requirement-scope.md` | `2f804297e6f650ced0419c9a4f6cd4a42c1fbd28466f9032c0089043a095b328` | 14730 | `b52478294493f271bc28de2bfcd62ea00eae27aec82605f1df3478599ceadbda` | 15226 |
| `docs/phase-3-O1-O8-obligations.txt` | `cc84e0357fde2c8648d050b41600d9233ba42f2aef52f1dcfa9307334e1a3357` | 47059 | `c98c86bdb66711e17d91becc74a7a5dc88f403ed4d166146debc50d46f6e1af2` | 47062 |
| `docs/phase-3-browser-observations.md` | `0ccc9c25250bc9f91a9dafc371c4b7084f0abd4c2bfac5df523860121f7607ed` | 4066 | `8d1aebee5354063942668d43febb697e82196c581833613ac86409308834e233` | 4066 |
| `docs/phase-3-claim-method-supplement.md` | `fcd362766142e740b0ce64364ef19e29c3b07438eadadcb8e957547809f7af5d` | 15237 | `c9ab8f714430259cd152f0eed0f7f4380d23695b82dea561ae0e2d052ff3f5f0` | 15237 |
| `docs/phase-3-current-clause-process-support.md` | `5a6a0a5f9bd02ddaa4518f6ee5e7e898792d80cfb6aea18c91f888a786460d64` | 54245 | `d8a8a3db6445f7f623a9f2a9d787a1a9ff2da6f944f34dd4cb6477fed0f59239` | 54252 |
| `docs/phase-3-current-source-identities.md` | `4272ee692ba5f0240d56b4dadfdd8fc17c53c0cd4230208f068dc1284d459313` | 6826 | `0e3bf7b5b31125b2c17d811db51b5436903a1ed801ad4ae7e9c9c31cc9a7e89b` | 7564 |
| `docs/phase-3-current63-correspondence-record.md` | `3dce5214987a336edc5773c2b28f473e349ab4420dd952c59542d6ea387f059c` | 125384 | `5202657c9af5812acfb56a9d5566a4563511a48798c69429ead2e4216690149c` | 125973 |
| `docs/phase-3-differential-evidence.md` | `410e805bf62f2099f3a76b1389e548f62a3e56f1d0b6b711a0e77107b279fca1` | 12349 | `2672ea82ba9823fa392417aa7981bb98ed78cbf3f7ffd182918322e752ddf4fb` | 12357 |
| `docs/phase-3-formal-criterion-gate.md` | `18e84440300cca04274632ba90cbeefea610fd4925e6f9f4b175aeffd085f6eb` | 5321 | `1c06c5fdde2b2c377bb57c163d5422c9216789320aed1fc97f7b60cff5b7c8c7` | 5845 |
| `docs/phase-3-legacy-capture-source-evidence.md` | `0e65054febaf4a76802647c4d81a218ee842cf33b27b30b5a7c7dcc7f261f961` | 3464 | `1142afe1b0cfca2d545968d99deef23bab4470e6d62a90b686105a85b71a83d4` | 3798 |
| `docs/phase-3-legal-source-supplement.md` | `5eefc5c75c7f48d1b0c44647755e3064199666a5b7ec300555772def371df151` | 12530 | `5eaa9609b43c332a95e13a21a3495c5c2b7431b82daf0113e0aa07a63ac9fdbf` | 12936 |
| `docs/phase-3-limited-advancement-record.md` | `471db09758a79481874c878c4b6980932a0c894bc5ec96df45ca776da5136fe4` | 4261 | `d068c68d540015e99e2d8143b88712fe99a0b5ca4b7947aa6c34b3e22e1f2a52` | 4261 |
| `docs/phase-3-model-method-mapping.md` | `f0883a8bba0f3df3475438e75425232cdfc129306387c8c3c060c19cec74640c` | 12843 | `272b5ceba8e01d2912834904200332ac073c3c70473c12eef2656864ba7c35e7` | 12843 |
| `docs/phase-3-native-contract-evidence.md` | `97205f7131c51ce7b97a48cc98add5ca4c0441eba583edd9d4406db9006ac6fc` | 7715 | `41b771fb997cfefe351daea63963decb2e6247f69844de5a66209d227d4c06bd` | 7715 |
| `docs/phase-3-native-recording-evidence.md` | `e49e1aae0c88c94ab730e775ccf03d984d19ccaa48edb34e95b5e5fc77fcd9b7` | 4656 | `10f103eb15484d2ac768f5c4f1cba2acccbf3be19a2eb1b703f0d0279707ec91` | 4656 |
| `docs/phase-3-obligations-P3-C.txt` | `f70122ed1adf1cc5f65a413f3cb87fba7cdea271ee6a064fa4dd826cadd21306` | 48099 | `740bef182775908be0f5de99cbcd966599deaf0f98d4bd82fded28d8c14148d3` | 48099 |
| `docs/phase-3-obligations-P3-D.txt` | `bd8a52a23e3c148c838256c5c586c42a8a9f1518a47fd72cd4a977d932082cee` | 45742 | `13f11153e04d65e563955d2708da90cb0db0a7e5b32da4f40159310d471be2da` | 45742 |
| `docs/phase-3-obligations-P3-E.txt` | `f6ae93ba9b125ae4b7e11b2a06fba2eb978799b3846d2d0a43cb0896070f1b48` | 49193 | `620fb2b6c7f0c10305bd3aba9b677f5b75ec28f6cece79936ac88878684cb452` | 49599 |
| `docs/phase-3-proof-obligation-record.md` | `244f8b029e1354d4cd5792b56cf1a790376635159c6b76b52bb06563930c7e30` | 4355 | `c2c129a1e6bcbf837402e3f2ef8ab31a0909e42de6cd4d1cd000e218665a8741` | 4987 |
| `docs/phase-3-supplement-record.md` | `37949faf7fdb86d296b5132a889125b27049913b9a449233e32b680c57c53186` | 2661 | `902a1945b411d7885a82a5082d66f322e25d53c15734059aedab7e9ea2f867c3` | 3080 |
| `docs/phase-3-writer-frame-checkpoint-matrix.txt` | `3f899ffbe55b79acf07205158f4f2e8818c5e9802944d26989ecc4ad7855f1d2` | 51866 | `74eb1f611c9cbc0bcb0f8296524829273b2f461d1dda74c10c3e9698a848a0bb` | 51868 |
| `docs/phase-4-selected-independent-expectations.md` | `da1f3e2a49230e62c5bd5dfb2503e693725397ab7310de0b34b17c4283579407` | 10885 | `8a10d9b10e7aa223eb6be72c61f7301461157a5aaa3eccd0fcf9b9b7496c3ca3` | 10885 |
| `docs/phase-4-work-in-progress.md` | `b88af799fb5f37bac2457a85ac4bd66c4718bace4b7af870aaff8808451abb0d` | 12872 | `563fc6970b4f3a47a60c181d0b6f11667deb714cca71279f0d60e39065a73e7e` | 12872 |
| `docs/phase-5-10-preparation-inventory.md` | `2894cdf973d37cd153137ba69da4056c22c54c03e8dad3e8125ac978c87d465e` | 15233 | `3b1ceb33e2f265b6ed3c7a08dd5bded24a0b6c0415b1ee2ed13dfc12f27ac0b3` | 15233 |
| `docs/queue-checkpoint-detector-disposition.md` | `25d696dc391978b7fb3e0cbc7d8ae6658f0170d2c754d81547ebfeabf89c81a1` | 8383 | `b32a3705c088a667b0778733a5a4de200e4719eb6878d4ab7bf9b7148f7cf9ce` | 8383 |
| `docs/serialization-failure-scoped-disposition.md` | `fb8df034902bbd6291c868c392855eb92252d55f6fcdc1d951600b3b45f23527` | 5698 | `ed1be82874033d82662efba0ef6faa42b7d85b77f21000645947e52545408b6f` | 5698 |
| `docs/soft-repeat-registration-refusal-disposition.md` | `eccb56089cf9e1cd2f8948d67edfc490c140016e433daf31dc4d7b860c6a5e96` | 4473 | `3e7a5063f95d9bf5a095f7396342efdbf96f6f5d7b40d7d2a6a130a1cd0bbbca` | 4473 |
| `docs/tetris-audit-executive-summary.md` | `de58db37286ba70172537116816acf84f490de83c256583073287be33ac3c43d` | 5010 | `3f40413c094a712d18d44f4af3ef7bf3d52a6071eeabfe14d898a3cae4bb31c0` | 5010 |
| `test/fixtures/README.md` | `a073f21ee6855acef2df84bef471c24da4c4b29f90aacca0fc72733a9955d8df` | 1348 | `883d26f53ab16cb2f4a6fa2b3810a4d2d31a0236a4cf7b18c31ee14a6cff84a3` | 1348 |

## Historical selected-source manifest

`docs/phase-4-selected-source-manifest.json` is unchanged in schema and bytes. Its REQUIREMENTS.md and fixture README source hashes identify the historical inspected snapshot, not the later restyled copies. Current-publication identities are listed above, without replacing original captured evidence.

## Exclusions

Runtime/model/test/fixture/raw archive/source PDF bytes, identifiers, filenames, original machine codes, normative requirement-ID rows and verbatim external quotations remain unchanged. Ordinary English is not title-cased merely because it contains a status word.

## Verification

The local exact-manifest comparison confirms 723 label edits and the reviewed provenance operations. All 55 normative requirement-ID rows in each of the root and published model-input copies are byte-identical to the sanitized base. Every other tracked path outside this migration is byte-identical, including the historical selected-source JSON, production code, executable models, tests, raw evidence archives and four reference PDFs. Original hash literals are retained. Blueprint extracted text agrees with the TXT after layout whitespace normalization; all 29 rendered pages were visually inspected for clipping, overlap and hierarchy.

Local type checking and unit tests passed under Node 26.11.1 and npm 12.2.0, with all 360 unit tests passing and the existing 100% line, branch and function coverage gates. The execution logs and toolchain check were returned with the review package. Local browser verification could not complete because the environment lacks WebKit system libraries. Independent exact-diff review passed with minor publication corrections; those corrections and hosted required checks are pending final confirmation; this receipt does not claim they passed. Their results belong to the reviewed commit/PR checks, not a historical evidence rerun.

The table excludes this receipt itself to avoid a self-hash cycle. Its repository commit binds the receipt and all table entries together. Earlier ledger hashes remain historical; these entries identify successor publication bytes only.
