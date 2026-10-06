# Exact grouped result identity and execution scope

Each hash identifies a held result/harness/review artifact. Identity is separate from actual execution, independent rerun and physical or cached response authenticity. The index preserves the actual execution/review scope; it does not infer those from hash equality.

## V56/V75

Browser actual trace coordinator-attributed, source/hash review only; no independent browser rerun.

| Artifact | SHA256 | Bytes |
|---|---|---|
| confirmation-interleave-v56/INDEPENDENT-REVIEW.txt | a1e14ae5c31fb2a7dfc62dd3acc21c0c618cf16aa0e417553d3ac8d66fd98089 | 3652 |
| confirmation-interleave-v56/PLAN.md | a9879f534a3526b68615f493482bbc4dbd34c8d751b819abc81a5e4187a94608 | 819 |
| confirmation-interleave-v56/RELATION.md | 5bd5cc702d258d4349b5727238b5e2545afa22227b725d1e69b77069264647d6 | 2620 |
| confirmation-interleave-v56/actual-v56.json | 5642aadb6a176a2801d78f2e7f0b5c8d08a21ec2310d6ef79f66696043e484de | 2283 |
| confirmation-interleave-v56/actual-v56.mjs | 481550c805ab1da0a3db9ce7b1b4f3911b43a6dbec62016138ac2a1d21d3f257 | 2911 |
| confirmation-interleave-v56/source-binding.json | bc7f946abdf227808b495109cbd4a315aeb521e44cffd41b5acf9a6551a0dba1 | 205 |

## V57

Actual Node and independent Python rerun byte equal per review.

| Artifact | SHA256 | Bytes |
|---|---|---|
| hold-history-v57/INDEPENDENT-REVIEW.txt | 9c18767340be6cdec1894743df1d387356d1359e20cabf163fa6bf305fd246d0 | 5722 |
| hold-history-v57/RELATION.md | bc155a14366a923de6bb2916f46483e695528dba0f83ae9055224d1b906bd3f0 | 1429 |
| hold-history-v57/actual-v57.json | a25532f0f74d7c9b88aa3fcddf53253021b8222d5f34a1ebea5ffb7dd9777548 | 2859 |
| hold-history-v57/actual-v57.mjs | 7f4c3d6403eb903ed7876481318c58ef609a91fd494d48d2762eb2ff48dd3ca3 | 1600 |
| hold-history-v57/independent-v57.json | 6d2742052dc77f836d3b34977ff7c7e337a5d4470fc79d77afee7d7f751c531b | 1542 |
| hold-history-v57/independent-v57.py | 8fb745b93018707300fdb6f795d224138db4cc01fdff6e412e2b990210798eb1 | 1911 |

## V62

Actual Node and independent Python rerun byte equal per review.

| Artifact | SHA256 | Bytes |
|---|---|---|
| rotation-history-v62/INDEPENDENT-REVIEW.txt | 0b7237888774b3db5f141c8156234fa201928aae547e9a4d26576b737c211198 | 4159 |
| rotation-history-v62/RELATION.md | 78bbd32c2ca6af57a2e91036a705253ca8576907e0c198375189408706c6d0b4 | 1542 |
| rotation-history-v62/actual-v62.json | ab8ab1bab68ef4539325baf92ec4f403ff34e6056067fc7e916c450a6c95bf00 | 4264 |
| rotation-history-v62/actual-v62.mjs | 3c754ac72b21b99127a0fcad08fd56fad379e3596136fdd6e9f0c3dfb6a68f49 | 1820 |
| rotation-history-v62/independent-v62.json | ed44abb0f08dab05a8d5c2285a62a157ce1810df0e20b4099ab2842cdb9e3a01 | 1393 |
| rotation-history-v62/independent-v62.py | ec72ba9e9e6752d5fabc4cbcf1b5f42bef09f2f87b43ef11c0156e581230953e | 1382 |

## V59

Actual browser coordinator-attributed; independent Python byte equal plus hand wall relation. Misleading noIntermediateMove field qualified to down/up window.

| Artifact | SHA256 | Bytes |
|---|---|---|
| gesture-evidence-v59/INDEPENDENT-REVIEW.txt | a3441e0dda9cf5a4e25d620fb479b3e2829c46d3b401bafbaf1879a80abd9860 | 3433 |
| gesture-evidence-v59/RELATION.md | 9aff6d82e689986aea17af25832eec4d3eab590f6521a4c9e672e25f2f11575c | 2261 |
| gesture-evidence-v59/actual-v59.json | 895b13a57688189c7bf5f26f5708b4d92c378d693e2ebf6113e1531b569aa77e | 3880 |
| gesture-evidence-v59/actual-v59.mjs | d1d3eb03f757dc053ef5b9a6dc97301cb5ac45ffac901d1844e8496150986b9b | 3678 |
| gesture-evidence-v59/independent-v59.json | 9dda995894b77612f3ba870fb6077e56d923a1ed4b4bcee6af4752120761e566 | 558 |
| gesture-evidence-v59/independent-v59.py | 38cb0223a0e862418260afb1ad9e5c1d43da352ef884a759e01462ebb6cb935e | 1458 |
| gesture-evidence-v59/index.html | 96f7fb5b112d6890b33b0f38d51e2bb47fe2289875354559a82ab4e036ab85c1 | 3433 |
| gesture-evidence-v59/script.js | 59fcb3343f35d0022c739cce82c5c9601a9e3bc354a9dc991eb1660c4e599ad4 | 23071 |

## V60

Node rerun equal except Node version; Python byte equal, labelled-body atomic VM premise.

| Artifact | SHA256 | Bytes |
|---|---|---|
| cache-full-resource-v60/INDEPENDENT-REVIEW.txt | 380835b39103e49af52d5bb1b44bdb7df1cdc9c5c126402bc8531d7b24db887a | 2209 |
| cache-full-resource-v60/PLAN.md | cc6160f01723e1f74535bc4eca3a2b2213c018a9d85dd94359cfefe7a9437eed | 651 |
| cache-full-resource-v60/RELATION.md | c3df92a589a556f6dfb38dc070a122240c87b9a96e06374c7a8db68a18c23678 | 1277 |
| cache-full-resource-v60/actual-v60.json | 857b8e986ee15be34129f6d7b218565688a1ffb3ca94a8e01c8ea4fcbed9c6ee | 10460 |
| cache-full-resource-v60/actual-v60.mjs | 85b0d3501917b71ecc8eda60753d10470b5750c01d83c4935db4cd95ee813396 | 3735 |
| cache-full-resource-v60/independent-v60.json | c43a3c4a0e218c8f6a6e5aea24c879a29d3b2fa2229b01f4f2c987d3795d8588 | 536 |
| cache-full-resource-v60/independent-v60.py | 7bc9291bce9ac21bb76580881a3688056ff79a3ce435b7fbf4a599f139e63e80 | 1180 |
| cache-full-resource-v60/sw.js | c8bfb09536e73cf206270f3645bcee9e26ec3c3469b9893ae773b2339f861a96 | 6973 |

## V61

Actual browser coordinator-attributed; independent Python byte equal; recorded screenshot independently inspected in original review. No new pixel inspection.

| Artifact | SHA256 | Bytes |
|---|---|---|
| render-idle-v61/INDEPENDENT-REVIEW.txt | c155b74820d40edf1ee8dfaf7d2e08f2bb490bd2712efff64e4c8508a38ff90a | 3081 |
| render-idle-v61/RELATION.md | 4175a502969474baba4bfd38cb48f714f2b7a6d5d028f7f0e094b3156e28ae3e | 2299 |
| render-idle-v61/actual-v61.json | 5f95ddee71d8c8e602c5d75cff892c86ddd7539f12fbe3a938b8f68ee0ed22a5 | 12577 |
| render-idle-v61/actual-v61.mjs | 43d40dfca3fab34f859e4dbd7cdb19d433662320a2be6291ea38e845d1468e29 | 3956 |
| render-idle-v61/independent-v61.json | 3a54472222ee4b188f2bc22bd130b14b720a0ee191b5d9b128339677b8b592a7 | 1900 |
| render-idle-v61/independent-v61.py | 6270afcf3216b420abfa45efa7254fa0f59d349146f5d9c497f7b2c3d44ee8c4 | 2962 |
| render-idle-v61/index.html | 96f7fb5b112d6890b33b0f38d51e2bb47fe2289875354559a82ab4e036ab85c1 | 3433 |
| render-idle-v61/render-idle-v61.png | 9153250edc664da156aa184de8812f332c35fe71f40153ca2fce0265230b583a | 404755 |
| render-idle-v61/script.js | 59fcb3343f35d0022c739cce82c5c9601a9e3bc354a9dc991eb1660c4e599ad4 | 23071 |

## V66

Node equal except Node version; Python byte equal with same earlier geometry table, pack copy not directly compared by reviewer.

| Artifact | SHA256 | Bytes |
|---|---|---|
| legacy-semantic-v66/INDEPENDENT-REVIEW.txt | b7c699a656734901d145571eec1531e7f63df5df788e1f4d8f2c17911292dab1 | 3924 |
| legacy-semantic-v66/LEGACY-COUNT-FALLBACK-DECISION-v65.md | d23cf32c507b1858018f77609027fa70fbe24c7de25a918656e439da605b7f0a | 1699 |
| legacy-semantic-v66/RELATION.md | ad830a71c8077d627111c238a4a838d3bfc7411bf07ff26c50bdda41e69df572 | 2137 |
| legacy-semantic-v66/actual-v66.json | 1d38044d1290af61a50f20a898966e95e5ddba10807c117b0ab50e7e9a788f0c | 9367 |
| legacy-semantic-v66/actual-v66.mjs | 890cea1be3406fd9e43cb02d7caa0c9e70fcc07ced66930551207c58c7d5dc5f | 1783 |
| legacy-semantic-v66/independent-v66.json | 66c4d8cda4dcc778f798049ddac28ae6c50ddd6a232128e9efa6d33d02d8ca66 | 10045 |
| legacy-semantic-v66/independent-v66.py | 94201f40a884dd6b6ffe418b2a44035048aeb06e47bcf7ac3d56376da57fc82a | 3341 |
| legacy-semantic-v66/saved-game-current.json | 5db92314408a59661f17e47887778df96de91e19ae433827b1f74a42227e126e | 10197 |
| legacy-semantic-v66/saved-game-with-level.json | c628f4442aab487f185b2ba88c58adce6fbf6c55310c3f0314e1dc1e7abc1ebb | 10211 |

## V58

Source equations, not an execution.

| Artifact | SHA256 | Bytes |
|---|---|---|
| A14-SOURCE-EQUATIONS-v58.md | 2fa737365bfc99228cc11e51bdf609a237202c192ee41c9a239ab5afb625d35c | 3523 |

## V65

Choice record, not authority established by this index; original user evidence separately required.

| Artifact | SHA256 | Bytes |
|---|---|---|
| LEGACY-COUNT-FALLBACK-DECISION-v65.md | d23cf32c507b1858018f77609027fa70fbe24c7de25a918656e439da605b7f0a | 1699 |

## V76

Documentary source/author capture attestation; raw capture execution independently unattested.

| Artifact | SHA256 | Bytes |
|---|---|---|
| LEGACY-CAPTURE-PROVENANCE-v76.md | 50de5e983600cc61f4ca43f93b406eba3ca33328471d2942281198a5741fcecb | 2514 |

## V69

Source/assertion method, not execution.

| Artifact | SHA256 | Bytes |
|---|---|---|
| QA-ASSERTION-CLAUSE-METHOD-v69.md | b240dbd839e2fa5d538ef768b8442d32e997bcd8e42844fdf7abcb557e56f422 | 4662 |

## V70

Source/assertion method plus exact tagged-source inventory; not execution.

| Artifact | SHA256 | Bytes |
|---|---|---|
| qa-semantic-v70/RELATION.md | 8b6e863da0e10f36edee5c274205097bf1faf0d52c5094967d92e53b7e0140c4 | 2986 |

## V75

Source/literal method using already bound V56 trace, not a separate run.

| Artifact | SHA256 | Bytes |
|---|---|---|
| A11-PUBLIC-ANSWER-ROUTE-v75.md | 88f8c41f3c91366375a3f935df0d243ab0f3b83cf8ac10ae17f91179acc414ad | 3111 |
