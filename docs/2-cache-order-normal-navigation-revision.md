# Pin-order source history using normal navigation clients only

A long-running background download permits the original old page pin to expire before cleanup, while a newly opening page's pin has not yet appeared in the enumerated list. The new page can get old HTML before that old version is deleted, then receive a newer script. This proposed revision removes the ungrounded empty-client navigation and two-worker lifetime premises.

Proposed source argument for independent review, not new runtime evidence or promotion. This replaces only the proposed event schedule, not the already reviewed forward-clock finding, earlier historical outputs or the published unresolved candidate record.

## Fixed premises

Source main230cd4b, workerc8bfb095. Complete ownV1 initially. All navigation events have nonempty distinct resultingClientId. Successful documented CacheStorage APIs, distinct allowed download suffixes, all16 independently tagged complete versions, no foreign caches/provider throws/collision. Ordinary wall time advances from0 to600001 once before A starts, then may be treated as unchanged throughout the selected short interleaving. No clock jump or accuracy exclusion is needed; the preceding download simply takes longer than10minutes, which no adopted rule forbids.

APP2 per-page no-mix is independent expected criterion. Cache.keys returns a finite frozen array under https://w3c.github.io/ServiceWorker/ Cache.keys algorithm. Later pin puts do not add a new entry to its returned list. Await suspension is an explicit successful-event schedule premise, not measured native scheduling frequency.

## Normal event sequence

1. At time0, pageB navigates on completeV1, writes its pinB=V1/at0 and receives HTMLV1. Its ordinary background download begins V2. Successful addAll is pending and V2 remains empty until the declared successful completion; V1 is still newest complete.
2. At ordinary time600001, while V2 is still pending, pageA navigation selects newestcompleteV1. Its pinA put is pending before effect. A's openPage has not yet returned its HTML or triggered its own download. PinA is absent.
3. B's pending addAll completes all16 independently taggedV2. Its cleanup keeps newesttwoV2/V1. It may remove expired pinB because600001>600000, but V1 remains by newesttwo retention. The completion is successful. No other old pin exists.
4. PageC navigates normally after V2 publication, writes pinC=V2/at600001, receives HTMLV2 and triggers a second serial background download. All16 taggedV3 publish successfully. A's put is still pending.
5. V3 cleanup gets complete[V3,V2,V1], initialkeptV3/V2, then pins.keys returns its finite list withoutA. It sees C's freshV2 pin. B's expiredV1 pin is already gone, or if still listed it is deleted by age and does not addV1. Suspend cleanup before its final version deletion loop.
6. A's pending put now succeeds with pinA=V1/at600001. Its openPage then returns HTMLV1 while the V1 binding still exists. A's own background download is allowed to remain pending before publication for this selected consequence. It may create emptyV4 before deletion; this does not enter completeVersions, and cleanup's deletion comparison is still against newestcompleteV3, so emptyV4 is not an older-than3 deletion candidate.
7. V3 cleanup resumes with the earlier kept set. It does not enumerate pins again. V1 is numerically older and not kept, so its binding is deleted despite A's fresh pin.
8. A's script request reads pinA=V1, caches.hasV1=false, then falls backnewestV3 and returns scriptV3. Its HTML is V1. No pin expiry of A is involved.

## Disposition and limits

The proposed history has normal nonempty client ids, one worker, two serial successful complete publications and ordinary prolonged download delay. Its failure cause is enumeration-before-pin-write combined with later binding deletion; long B download supplies the lawful expired prior pin. Source algorithm directly predicts mixedA generations under these premises. This is not all interleavings or native CacheStorage proof. Native worker lifetime and request timeout admission remain unmeasured; successful completion after the declared long delay is a conditional premise, not a universal platform guarantee. Original clock/order raw153/154 remains unrecovered; no replacement run launched. A reviewer should check temporal feasibility, all16 success/publication and API snapshot premises before deciding conditional source status.
