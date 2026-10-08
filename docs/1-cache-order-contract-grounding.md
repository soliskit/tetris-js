# Cache order: snapshot contract is grounded; the first event schedule is not

The Cache.keys result is a frozen array built from a finite request list. A later pin put does not add a request to that already returned array. The original proposed history's empty-resultingClientId navigation, however, is not grounded as an ordinary navigation in this audit. Keep that first history unresolved, not Confirmed.

Independent-review supplement. No new execution, source change, owner question, native claim or status promotion.

## Verified contract sources

https://w3c.github.io/ServiceWorker/ section Cache.keys: when request is omitted, collect requests from the relevant request-response list, queue a task, build new Request objects and resolve with a frozen array. The method runs substeps in parallel and returns a promise. This supports the selected temporal cut: once pins.keys has returned an array lacking A, a later successful put does not mutate that array. It does not prove all native interleavings or general CacheStorage linearizability.

Same specification FetchEvent.resultingClientId says the value is the request's reserved-client id and is empty for subresources, report destinations or null reserved client. MDN https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/resultingClientId states the normal page-navigation association and empty subresource/report cases. MDN https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/FetchEvent documents constructor defaults, but a constructed event is not proof of browser-issued navigate-mode/null-reserved-client admission. The first proposed normal-navigation schedule therefore remains unresolved.

CacheStorage.delete in the same specification removes the name-to-cache map binding; retained Cache/Request/Response objects remain functional. This agrees with the narrow binding-deletion wording, not backing-byte erasure.

## A different proposed admission route

Use the declared service-worker install route to create V2 without a page pin, rather than an ungrounded navigation. Existing active worker with sourcec8bfb095 serves A and stalls A's pin put before effect. A later installing worker with the same source invokes registered install/download and successfully completes V2. Its cleanup retains V2/V1. Successful activation/claim does not remove version caches. A normal B navigation on the new active worker selects V2, pins B toV2, and its background download completesV3. Cleanup enumerates pins before A's old worker put is visible, then awaits. A's old worker pin succeeds and answer returns HTMLV1 before V3 cleanup deletesV1; A's next script on the controlled worker sees pinV1/nameabsent and fallsbackV3.

This is a proposed two-worker successful-event schedule, not an accepted replacement or runtime result. Its weak point is whether the old pending navigation/pin can continue across installation, activation and claim, and whether B navigation is admitted during that lifetime. Research the worker-lifetime/update contract before adopting it. Do not use helper calls as event admission or treat an install process as complete while its lifetime promise is pending. If worker lifecycle excludes this order, retain the counterexample as unestablished rather than forcing another scope expansion.

Forward-clock history remains independent and needs no new worker, pin snapshot race or empty-client navigation. No need to stall its reviewed classification on this separate unresolved ordering candidate.
