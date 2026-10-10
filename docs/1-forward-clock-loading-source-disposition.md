# A clock jump can break a loading page's version pin

The worker deletes a loading page's pin by wall-clock age. After two newer complete versions exist, cleanup can also delete that page's version. Its next file request then falls back to the newest version, although the page opened from an older one. This is an exact conditional source comparison, not a recovered clock experiment or a native browser measurement.

Candidate disposition for independent source/criterion review. It does not promote a finding, certify APP2, approve a fix or close Phase4. Historical forward-clock experiments remain distinct and their original raw/process bytes are not recovered here.

## Independent criterion

APP2 requires every file of a page to come from the version it opened with, even if a newer download finishes during loading. D29K1/K2 permits forward/backward clock jumps; a jump is not evidence that the loading page no longer needs its old version. No adopted10minute loading limit or “two updates make a page finished” rule was identified.

The successful CacheStorage/Cache APIs and fetch contracts are stated trust premises, not guarantees of availability or native browser correctness. This comparison requires no foreign cache, malformed pin, collision, failed API, orphan callback or simultaneous download. Exact browser event admission and loaded physical bytes are separate from the source-level successful feature contract.

## Finite source history

Source main, public/sw.js SHA256c8bfb09536e73cf206270f3645bcee9e26ec3c3469b9893ae773b2339f861a96. Each version below independently contains all16 actual shell paths, with each response labelled by its generation. V1/V2/V3 mean versions, not arbitrary foreign bodies or only a selector's nonempty test. No other cache binding, pin or client changes interfere.

1. At Date.now1000, only complete own version tetris-version-1-a exists. A navigation opens pageA. openPage selectsV1, successfully pinsclientA to V1 with at1000, and returns its opening HTMLV1. PageA has not yet requested script.js.
2. Its ordinary background download completes ownV2 (tetris-version-2-b) while clockstill1000. atomic successful addAll produces all16 V2 responses. Cleanup keeps V2/V1, and the fresh pin also retainsV1.
3. Another declared normal page opening triggers one further serial background download of complete ownV3 (tetris-version-3-c). The suffix lettersa/b/c are illustrative placeholders for distinct allowed random suffixes, not asserted literal random outputs. Distinct allowed suffixes and completed successful publications are explicit premises; no simultaneous collision or incomplete version is admitted.
4. Before V3 cleanup evaluates pageA's pin, Date.now jumps to601001. Its subtraction601001-1000=600001 is greater than PIN_MS600000. The page is still loading; it has not requested script.js. The clockjump changes no loaded HTML, clientidentity, pincontent or requirement meaning.
5. removeOldVersions chooses complete versions in numeric newest-first orderV3,V2,V1, initially keepsV3/V2. It reads pageA pinV1/at1000, finds age600001>600000 and deletes that pin, instead of addingV1 to kept. If another page has a fresh pin, it namesV2 orV3 only. version1<version3 and V1 is notkept, so caches.delete removesV1's name binding.
6. PageA then requests script.js with clientA. versionFor finds no pin, falls backnewestV3. answer matchesV3/script.js and returns bodygenerationV3. The page already received openingHTMLV1.

The source choice/cleanup/read paths are exactly newestVersion/completeVersions, pin, removeOldVersions, versionFor and answer. No direct helper call by the player, fixture parser, production version classifier as an oracle or assumed native elapsed deadline is used as the requirement criterion. The exact subtraction601001-1000=600001 was independently calculated; labels independently define the expected all-file generation relationship.

## Consequence and limits

The declared history yields HTMLV1 and scriptV3 for the sameclientA before that page finished loading. This violates the per-page no-mix facet if these successful cache/event/time premises are admitted. APP6 creator deletion is not violated by this selected deletion of an own V1 binding. No foreign binding or erased foreign backing bytes is claimed.

A backwardjump branch need not fail for this finite forwardjump counterexample. Actual clock values, pinexpiry and three complete publications are a source-argument domain, not restored original measured values. The history deliberately uses two serial new versions because cleanup keeps the newesttwo: one later V2 alone would leaveV1 retained and does not establish this consequence. The ordinary-success relation requires all16 labelled contents, not an HTML-only partial cache.

Independent review must inspect source, arithmetic, all16 completeness premise, allowed event/time schedule and APP2/D29 applicability. If it passes, a narrowly Confirmed source finding can be recorded independently of historical raw recovery; it still leaves all cache/order/native domains and correction gates separate. No new test or original reproduction is inferred.
