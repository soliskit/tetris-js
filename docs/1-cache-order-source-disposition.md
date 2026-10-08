# A pin enumeration race can discard an opening page's version

A cleanup can enumerate pins before a page finishes writing its pin, then delete that page's version after the page has received its HTML. Its next file request falls back to a newer version. This is a proposed finite source history with a constant clock, not an original recovered experiment or a fresh run.

Candidate for independent review. Do not promote until the exact asynchronous API contract and schedule below pass. No whole APP2 proof, native frequency claim, correction or phase exit.

## Independent criterion and source

APP2 requires all files of a page to use its opening version. D29 permits clock anomalies, but this history needs none. Source main230cd4b4693e8857a1072da1cfbc63b789ede56d, public/sw.js c8bfb09536e73cf206270f3645bcee9e26ec3c3469b9893ae773b2339f861a96. Successful CacheStorage/Cache operation semantics are explicit trust premises, not native validation. Every completed V1/V2/V3 contains all16 independently generation-labelled shell resources. Distinct valid suffixes, no foreign bindings, provider failures, malformed pins or collision.

## Proposed finite order

1. Only complete V1 exists. PageA navigation's openPage obtains newestVersion=V1. Its pin operation is suspended before the put effect. It has not returned HTML, so its background download has not begun.
2. Other normal page openings complete two serial downloads V2 then V3. Those pages pin V1/V2 as appropriate. Their pins are allowed to remain: to make V1 unkept, the page that triggered V2 must already have a pin naming V2 or V3, or have no resultingClientId. Use a declared navigation with empty resultingClientId for that V2 trigger; this event-admission premise requires review and is not assumed a native observation. V3 trigger opens V2 and pins V2 normally.
3. V3 cleanup obtains complete=[V3,V2,V1] and kept={V3,V2}. It obtains pins.keys returning a finite snapshot that lacks A. The V2 pin, if present, adds only V2. No expiry is used.
4. Suspend cleanup before its final versionNames/delete loop. A's pending put succeeds with pinV1 at the constant time. openPage then answers its opening request from existing V1, returning independently labelled HTMLV1. Its own background download may remain pending before publication and cannot affect the selected consequence.
5. Resume cleanup's final loop. Its earlier kept set is not reread. V1 numeric generation is below V3 and V1 is absent from kept, so caches.delete(V1) succeeds. A's now-existing pin remains V1, but V1's name binding is absent.
6. A requests script.js. versionFor reads pinV1, caches.has(V1) is false and newestVersion is V3. answer returns independently labelled V3/script.js. HTMLV1/scriptV3 mix for A.

## Review stop and residual domains

The decisive source fact is that pin enumeration and subsequent version deletion have no reread or mutual exclusion. The required contract is that keys returns a finite snapshot and awaits permit interleaving. The empty-resultingClientId navigation premise is the weak point: if the declared domain cannot admit it, this exact history does not establish a counterexample. Do not hide that gap by deleting a normal page's live pin or silently inventing direct-helper admission. A different lawful initial history could supply V2/V3 without an old live pin, but must be stated and reviewed separately.

This is separate from the reviewed forward-clock history, which needs no empty-client event or concurrency. Original clock/order153/154 raw archives remain unrecovered. No replacement run was launched. Review can reject or refine this argument without weakening the already reviewed forward-clock relation or NEW362's distinct foreign replacement finding.
