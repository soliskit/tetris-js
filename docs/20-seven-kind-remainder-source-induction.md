# Seven-kind dealing: source induction and remaining-bag relation

A built-in factory refill starts with one of each canonical kind. Every shuffle step swaps two entries in that same seven-item list. Drawing removes its first entry, so a complete refill segment deals each kind once and the remaining bag is its ordered suffix. This holds for every valid received random value, not only a seed or midpoint sample. It does not claim unbiasedness, unpredictability, every sliding seven-piece window or every manager history.

Source argument for independent review. No game/test/model execution, new finding, property certificate, phase exit or production/test/model/CI change. Phase4 remains OPEN.

## Sources, independent inventory and domain

Read main. Factory SHA256 `25e1da6c0b1992b0317aef7025fb7030803a8fd20e649a45eb2ddeaa166ae8b4`; GameManager `31bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea`; GameState `4d4d88f18f8d2335fac4104e746b972214991df8b1c6e72e0cc5d8d12cb30878`. PCE5 governs full seven-kind bags. B10 permits an ordered distinct-kind remainder, including empty; B15 separates snapshot validity from whole-bag history. V3 assumes valid received random values and excludes claims about fairness or security.

The independent inventory is `K={I,O,T,S,Z,J,L}`, not a Set of production colors. [CF-1](19-canonical-factory-coordinate-admission.md) binds the source's seven fresh definitions to those seven kinds and their geometry. Here the random provider returns an ordinary ECMAScript Number `r` with `0<=r<1` on each successful call. That is the factory's documented provider range and the standard Math.random range; V3 is not used to admit NaN, infinity, BigInt, proxies or out-of-range injected values.

Normal built-ins, owned dense ordinary arrays, writable data, no outside mutation/interception, successful access/allocation and successful random calls are premises. A random callback that changes the bag or piece data is outside this argument. This is a completed normal-call relation, not an atomicity or failure-prefix claim.

## Numeric index bridge for all valid received values

At shuffle iteration `i=6,5,...,1`, let `k=i+1`. The code uses `j=floor(r*k)`. It is not enough to replace binary64 multiplication with real arithmetic without checking the upper boundary.

ECMAScript Number multiplication rounds the exact product to a binary64 value. The largest Number below1 is `1-2^-53`. Thus the greatest exact input product is `k-k*2^-53`. For k2..7, the spacing immediately below the exactly representable integer k and the maximum-product gap are:

| k | Lower spacing | Gap to k | Gap compared with half-spacing |
| --- | --- | --- | --- |
| 2 | 2^-52 | 2*2^-53 | greater |
| 3 | 2^-51 | 3*2^-53 | greater |
| 4 | 2^-51 | 4*2^-53 | greater |
| 5 | 2^-50 | 5*2^-53 | greater |
| 6 | 2^-50 | 6*2^-53 | greater |
| 7 | 2^-50 | 7*2^-53 | greater |

Each maximum product lies strictly below the rounding midpoint to k, so it cannot round up to k. Monotone nearest rounding gives `0<=rounded(r*k)<k` for every admitted r. Zero, including negative-zero input, gives a zero index. Math.floor therefore gives an integer `0<=j<=i`. A separate local Number arithmetic check of the six maximum-input products agreed; it imported no factory/game/test code and is corroboration, not the universal argument.

Language sources: [Number values and rounding](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type), [Number multiplication](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-multiply), [Math.floor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor), [Math.random range](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random). These explain language operations, not a new game model or random-quality grant.

## Permutation and draw induction

BR-1 starts with the independently bound seven distinct kinds. At each of the six iterations, both indexed entries exist. A swap, including a self-swap, preserves length, density and the kind multiset. Induction gives a permutation of K after the loop. Six calls to the supplied random provider occur; no particular permutation or probability is required by PCE5.

`generate` refills only when length0. It then shifts the first entry. After n successful calls from a fresh refill, for0<=n<=7, the dealt prefix has length n, the remaining suffix length7-n, and their concatenation is that refill's permutation. The prefix and suffix are disjoint in kinds and their union is K. At n7 the bag is empty; the next call begins a separate full refill. Repeating this induction covers arbitrarily many completed aligned refill segments under the premises. It does not assert that an arbitrary sliding window crossing a refill boundary is distinct.

If `resetBag(R)` receives an independently admitted ordered distinct-kind list R, the first |R| calls shift that exact prefix in order without random draws; the next call refills and uses six draws. R may be empty. Source assignment aliases the supplied array, and shifts mutate it. Therefore BR-1 needs ownership/no external mutation; it does not prove copying, alias isolation, acceptance of arbitrary lists or the historical provenance of R. An arbitrary B10-valid remainder is not automatically a remainder of the current legal seven-bag history.

## Ordinary New Game and queue accounting boundary

For a built-in factory, successful `resetGameSession` calls resetBag with no argument, discarding any constructor remainder. It draws one current piece, then `generateUpcoming` draws three in list order (`UPCOMING_COUNT=3`). BR-1 gives current+queue3+remaining3 as that fresh bag's permutation, with six random draws after reset and seven distinct semantic kinds. CF-1 supplies canonical definitions and local empty-board spawn geometry. Constructor draws before reset are a different refill segment, not the game's first seven after confirmed New Game.

For a successful generate-next step, an independently admitted queue of three becomes its old tail plus one factory output; the old head becomes current through spawn. The factory draw stream still obeys BR-1. This accounting does not prove every lock/clear/spawn/fault frame or that seven successive displayed current pieces follow the same order. Hold with an existing held piece consumes no new factory entry; Hold with none calls generate-next. Appearance order and factory dealing order are different observables.

Continue's resetBag(session.bag) carries the supplied remainder by reference. BR-1 supplies its ordered-prefix behavior only after independent session/bag admission. It does not supply raw-format decoding, missing-bag compatibility applicability, full paused restored state or saved dealing history.

## Exact child joins and stopping boundary

FB02's50 aligned groups can compare against K after the CF-1 token relation, rather than only seven arbitrary colors. FB04's constant0 swaps the initial source order into O,T,S,Z,J,L,I; that finite algorithm order is descriptive, not PCE5's prescribed order. FB08's constant0.999 selects self-swaps at each step and retains I,O,T,S,Z,J,L. FB07's supplied source indices0/4 denote I/Z and retain that order before refill. No new execution receipt for these children is claimed.

BR-1 closes conditional seven-kind permutation, ordered suffix and successful draw accounting. It does not close hostile RNG/provider effects, alias mutation, exceptional prefixes, arbitrary custom factories, fairness, all manager histories, raw-save acceptance or the full factory child-domain. Existing private midpoint/seed runs retain their historical scope; no packet recovery or result promotion is implied. Phase4 remains OPEN.
