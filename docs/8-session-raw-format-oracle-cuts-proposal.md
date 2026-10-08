# Saved-input oracle: raw format versus semantic validity

The session tests reject some semantic values that the adopted rules allow, and other rows test a raw encoding policy whose applicability still needs evidence. A JSON grammar reference can explain syntax and exact decimal tokens. It cannot turn the game's decoder into the independent definition of a valid save.

Preparation only. This register adds no requirement, format, new rejection rule, finding promotion, test change or Phase 4 exit. It refines the raw-format gap retained in the published session child register.

## Sources and separation

Fetched main8e73a4b7f66ceffd36ba0314dffb6db0ceadfb1f has unchanged public tree1e09ad61c19e0b235a231ad8810dae176be4ea77. `test/session.test.js` SHA2565cb5e8bed805b3eb34fc340e7e2b5231e92991e74e421d36f4da668521175152 and `public/game/session.js` SHA25654acbea460218f0e0a827619eae51e265461fe9ac6575dc8bf48727f6483049b bind source observations. Normative meaning comes from R1 B3/B5/B6/B8/B11/B16 and R5 S11, not parseSession predicates.

The released fixture README supplies implementation-created historical format provenance, not an independently authored semantic classifier. It identifies JSON files and two released format examples. That can establish what those recorded releases wrote after checking exact release identities; it cannot exhaust all accepted hand-edited representations or license a new semantic limit.

RFC8259, sections2-6, is a public syntax/explanatory source: https://www.rfc-editor.org/rfc/rfc8259.txt . It allows objects, arrays, numbers, strings, booleans and null as JSON values. Section6 specifies decimal number grammar and discusses range/precision interoperability. It does not require all application saves to be root objects, require a particular score field type, adopt a safe-integer score domain or define Tetris compatibility defaults. It has not been newly adopted as an owner model-input oracle.

## Exact applicability cuts

| Published child / raw case | What can be concluded without using the parser as its own oracle | Retained gap |
|---|---|---|
| SC01 malformed partial JSON | The literal prefix has no complete JSON parse under RFC8259 grammar. | Why only JSON texts are in the supported save representation, and no alternative decoding/default is applicable, must be bound from the supported-format contract. |
| SC02 missing storage value, SC03-05 JSONnull/list/number | Missing input versus parsed null/list/scalar are different observations. JSONnull/list/number are grammatically valid JSON; they are not malformed syntax. | Root-object save schema and absence of another semantic denotation/default. R1 B3 alone does not choose a JSON root type. |
| SC06-14 board/row/cell/type/color | Once the exact board encoding map is fixed, a missing row/cell or incompatible semantic cell violates B3/B5. | Raw required fields, isFilled boolean/color-null encoding and fixed color-to-kind map need binding; parser/color-membership agreement is not that binding. |
| SC15 filled row | B15 expressly imposes no snapshot ban on a fully filled row. | Independently admit all other core fields and applicable defaults before concluding this whole payload must load; no rejection justified by full-row history alone. |
| SC16-17 negative/fractional score | Exact -100 and150.5 numeric denotations are outside B11 whole nonnegative domain under the fixed numeric map. | Whole-payload map and unique-denotation premise. |
| SC18 score150 | Semantic150 is a whole nonnegative score. B11 has no divisibility condition. | Other complete-save validity, exact numeric encoding and restoration defaults; null cannot be justified by score divisibility. |
| SC19 textual score1300 | JSON string syntax alone does not say whether this save encoding can denote whole1300. | Strict numeric-token-only field schema versus permitted alternate string encoding. No typeof check can settle that policy. |
| SC20 test's2**60 score | A local Node language calculation, not a new game/test execution, shows JSON.stringify(2**60) emits1152921504606847000; exact binary64 value2**60 is1152921504606846976. These are distinct mathematical integers. Both are whole/nonnegative, so neither supports a universal B11 safe-bound rejection. | Decide which exact raw denotation is claimed and bind semantic correspondence without rounding it by the production reader. The source test title "too large to be exact" is not proof of semantic invalidity. |
| SC21-34 current/queue fields | B6/B7 govern semantic current piece and three upcoming kinds. | Required object/position/rotation/none map and absence of defaults. Waiting-piece positions/orientations are not active-piece semantic state. |
| SC35-37 unknown/string/missing held | Missing held field is not automatically the same as explicit held-none. | Exact supported schema/default relation; identify whether any applicable compatibility default supplies none. |
| SC38 hold flagtext | B8 requires a semantic availability boolean. | Whether textfalse is invalid raw encoding or alternate denotation needs the independent map. |
| SC39-43 bagtext/null/unknown/object/duplicate | B10 gives ordered unique semantic kinds, empty allowed. Missing pre-bag field has explicit B16/STA4 compatibility. | Color-string-only encoding, raw object/text invalidity, presentnull distinction, fixed kind map and supported legacy applicability; parser’s missing-to[] rule alone cannot certify a fresh full bag on Continue. |
| Successful heldnull / levelignored / waitingnormalization tests | B8 none and B16 ignoredlegacy level/restoration semantics can supply meanings, not raw schema. | Verify actual format applicability, core admission and restored semantic values. Custom sequenceFactory may violate ordinary seven-bag history without invalidating R5 snapshot acceptance. |

## Defaults remain bounded

B16 supplies the pre-bag fresh-bag rule and supported released-format L1/L2 defaults, not arbitrary repair of missing fields. The exact newly written versus legacy representation discriminator remains separate. Do not silently add a default because a test omits a field; do not reject a supported legacy save solely for a newly required history field.

This work can narrow which null expectations have independent semantic support. It cannot discharge the strict raw-format/type/default map by naming production's JSON.parse, isObject, isSafeInteger, pieceWithColor or parseBag. Full current and legacy format relation, per-payload admission, execution receipts and original declared child-domain reconciliation remain open. Phase4OPEN.
