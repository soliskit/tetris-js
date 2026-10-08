# Gravity request arithmetic: conditional represented-level partition

For ordinary finite represented integer levels of at least one, the requested-value calculation has a small finite partition: levels 1 through 23, then the 250 ms floor from level 24 upward. The independent rational calculation attached here matches the historical maximum error but is new numerical analysis, not a recovered original execution or a timer experiment.

This is a method candidate for independent review. It does not close F22 or PLY-2, adopt a platform source, change the game's code, or assert a complete score-to-level correspondence.

## Scope and premises

Pinned production source: gameManager.js SHA256 31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea. Its level getter floors score/1000 then adds one; standardDropInterval evaluates max(0.25, 0.7 - 0.02*(level-1)); startGameLoop passes interval*1000 to schedule.

The calculation below assumes ordinary binary64 round-to-nearest/ties-to-even arithmetic, unmodified Math functions, ordinary stable getter evaluation, no nonfinite level, and the represented level itself as the independent mathematical integer. The attached calculator uses exact rational operands and an explicit host binary64 conversion at each rounded arithmetic step; it does not import production JS. Its host rounding assumption is part of the method and needs independent verification before adopting a proof based on it. The hand error bound below is separate from the selected computed rows.

S10's criterion is the requested delay within 1/1,000,000,000 ms of the mathematical value. Browser conversion, actual elapsed time, late delivery and throttling are outside that selected predicate. Callback behavior, successful registration, failures, cancellation and resource states remain separate.

## Finite partition argument

Let L be the finite represented integer level and n=round64(L-1).

For L=1..23, n is the exact integer 0..22. Every mathematical unclamped second value 0.7-0.02*n is at least0.26. Its numerical error is far below0.01, so max does not choose the floor. Each selected row can be checked against the exact rational value 700-20*n milliseconds.

For L>=24, rounded n>=23 by monotonicity of rounded subtraction. The represented positive constant0.02 multiplied by n is monotone. At n=23 the rounded product exceeds0.45 and the rounded subtraction is less than0.25. Larger n cannot raise the subtraction above that value. Hence max returns the exactly represented0.25 and the final multiply gives exactly250. A finite n times0.02 cannot overflow; negative subtraction here is harmless to max. This proves saturation for the conditional represented-level domain, not from23 as an off-by-one shortcut.

## Independent error bound for levels1..23

Use absolute rounding bounds for each binary64 operation in the stated magnitude range:

- |round64(0.7)-7/10| <=2^-54.
- |round64(0.02)-1/50| <=2^-59.
- Rounded product error <=2^-55 since the product is below0.5.
- Rounded subtraction error <=2^-54 since its positive result is below1.
- Final millisecond multiply error <=2^-44 since its result is below1024.

Thus request error <=1000*(2^-54 +22*2^-59 +2^-55 +2^-54)+2^-44 =8423/36028797018963968 ms, approximately2.3378521341044234e-13 ms. That bound is less than1e-9. It also keeps the levels1..23 result above0.25.

The calculator's24 rows show all selected requests within tolerance. Its maximum absolute selected error is1/8796093022208 ms, at level2. Level2 requested bits40853fffffffffff denote5981343255101439/8796093022208 ms versus exact680, error-1/8796093022208. Level24 produces exact250. Exact rational values and bits, not truncated decimals, carry the precision claim.

## What this does not settle

The comparison above uses represented L, not the mathematical level derived from an unbounded semantic score. Source Math.floor(score/1000)+1 may itself need correspondence near rounding boundaries and for non-safe integers. This packet does not substitute the shipped safe-integer monitor for R1's unbounded nonnegative integer semantics, prove admission/reachability of every number, or certify a score writer.

For requests where represented L differs from the semantic level, independent analysis must show either equal saturation or the correct unsaturated value. This is a separate score-to-level lemma, not assumed by this partition. Every request route, request timing, retained pending interval and all failure checkpoints also remain separate from the arithmetic predicate. A pure calculator creates no scheduler argument receipt.

The older17subinteger result, unreduced-denominator integrality diagnostic, conversion stage and fixed-cycle native sample remain historical. No original harness/results are recovered here. No repetition of the old native timing stage is needed for S10's request-only criterion.

## Requested review

Review the partition coverage and binary64 assumptions, the error bound and exact calculator rows. Proposed disposition: supports the conditional represented-level arithmetic lemma only. No whole F22/PLY-2/Phase4 status promotion. Next work, if accepted, is score-to-level saturation/correspondence and request-route reconciliation, with their own evidence.
