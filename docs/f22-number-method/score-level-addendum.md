# Score-to-level relation for the gravity request predicate

This adds a separate source lemma to the represented-level packet. It handles every ordinary finite binary64 score that denotes a nonnegative integer. It does not claim that every semantic R1 integer is representable, certify score admission/writers, or use the monitor's safe-integer restriction as a semantic rule.

The intended comparison is between the produced request and the mathematical gravity value for the exact integer denoted by the score. Pinned source and S10 criterion are unchanged. Ordinary stable getters, unmodified Math and round-to-nearest binary64 arithmetic remain premises. This is a source/arithmetic argument, not production execution.

## Low score partition: 0 <= score < 23000

Every such integer is exactly represented. The exact quotient by1000 lies in[0,23). For nonmultiples of1000 its distance from either adjacent integer is at least1/1000. Division rounding error is at most2^-49 in this range, far smaller than1/1000. For exact multiples of1000 the quotient is the exact small integer and needs no rounding. Therefore Math.floor of the rounded quotient equals the mathematical floor. Adding one gives the exact integer L1..23. The preceding per-level request bound applies to the semantic level, not merely a floating cache.

## Saturated score partition: score >= 23000

Rounded division is monotone and score23000 divided by1000 is exactly23. Thus every finite represented score>=23000 gives a rounded quotient>=23, floor>=23 and produced L>=24. The quotient cannot overflow because division reduces its magnitude; adding one to a quotient bounded by the largest finite score/1000 also cannot overflow. Rounded subtraction L-1 is>=23. The earlier saturation argument applies, yielding request250 exactly.

Independently, mathematical floor(score/1000)+1>=24 for the exact integer denoted by score. The required mathematical gravity delay also saturates to250. The source's derived numeric level can differ at huge magnitudes without affecting this saturated request predicate. That does not excuse a wrong displayed/model level or certify SCO-2.

## Proposed combined scope

The two partitions extend the earlier conditional request-arithmetic lemma from represented L to every ordinary finite represented nonnegative integer score. They do not claim a complete unbounded semantic state representation, nonfinite input behavior, string coercion/getter mutation, alias histories, native timer accuracy, registration/cancellation success, full request-route/checkpoint coverage, every retained interval, or F22/PLY-2/Phase4 closure.

No exhaustive score enumeration or native execution is asserted. This adds a deductive partition premise for independent review. A source proof certification still needs accepted arithmetic/platform assumptions and the audit's claim-specific proof gate.
