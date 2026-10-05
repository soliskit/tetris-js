# Phase 1 decision: trust boundary for service worker registration and network requests

Status: decision text recorded by ledger row D28 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: `docs/phase-1-browser-trust-decision.md` (D27), which listed service worker registration and `fetch` as not adopted and unresolved, and D24 V1 (hosting and the offline cache). This file changes no bytes of either.

## Decision text

**X1. Registration and network requests, when the call reports success.** The browser's implementation of service worker registration (`navigator.serviceWorker.register`) and of network requests (`fetch`) is trusted, when the call reports success, to follow its documented semantics. This adds no guarantee that a registration or a download will succeed.

**X2. Project logic stays inside the audit.** The game's own requests, its handling of what a request returns, its handling of a registration that is refused or fails, and the worker's behavior around them are not trusted. They are audited under the requirements that apply, including APP-2 and APP-6.

**X3. What is not decided.** The clock (`Date.now`) is not covered by this file and stays unresolved. No requirement is established by X1. The served content stays under D24 V1.

## Not decided here

- The clock.
- Any change to REQUIREMENTS.md and any code change.
- Closure of the Phase 1 exit item on trust assumptions, or of any other Phase 1 exit item.
