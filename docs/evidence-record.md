# Tetris Evidence Record

The evidence this project relies on: checks of the project's own behavior, and outside facts from providers and standards. Each entry has its source, the date checked, a status, and its limits. A local result never closes a real-platform check, and only Verified facts support a requirement.

Requirements live in [REQUIREMENTS.md](requirements.md). This record is its evidence base for facts that come from outside the project.

Statuses:

- Verified - established against its source on the recorded date. For a fact, the source was read. For a check, a result was recorded at a named commit on the stated platform.
- Unproven - evidence exists but does not establish the claim (conflicting, stale, or unreadable sources). An Unproven entry cannot support a requirement.
- Pending - no closing result yet. Where a local or partial result exists, the entry states the local result and the real-platform result separately.

Entries keep their original check dates; nothing was rechecked or rerun for this reformat.

## Checks

No project checks recorded.

## Facts

### Geometry

- **T1 SRS rotation reference.** Verified October 21, 2026 (first checked October 4, 2026). The retained geometry reference, the image and table under `docs/sources/` kept by SHA-256 ([decision log, D18](https://github.com/soliskit/tetris-js/blob/5687f3ec8d0df23b93b20197edcb1abf1428010a/docs/decisions.md#L145)), matches a second machine-readable source on all 24 rotation states of I, J, L, S, T and Z, up to the y-axis direction convention, and the O shape matches (the same four blocks at a different grid placement). That source names tetris.wiki as its origin, so it is not independent of the community wiki; the table remains a community-wiki reading. tetris.wiki/SRS was reachable on October 21, 2026. Sources: [machine-readable table](https://gist.github.com/Shuflduf/e5186328dce8ab7d38a16d73971abcee), [SRS](https://tetris.wiki/SRS).

### Memory-safety research

- **T2 Secure by Design report.** Verified October 21, 2026 (first checked October 4, 2026). The official PDF, "Secure by Design: Google's Perspective on Memory Safety" (March 4, 2024), is 13 pages at the recorded URL. The [comparison of this report against the repository's summaries](https://github.com/soliskit/tetris-js/blob/5687f3ec8d0df23b93b20197edcb1abf1428010a/docs/decisions.md#L110) stands as recorded, with its one attribution discrepancy. Source: [report PDF](https://storage.googleapis.com/gweb-research2023-media/pubtools/7665.pdf).

### Browser storage

- **T3 ITP storage removal.** Verified October 21, 2026 (first checked October 12, 2026). WebKit's Tracking Prevention page says ITP deletes all cookies created in JavaScript and all other script-writeable storage, including LocalStorage and Service Worker registrations and cache, after 7 days of no user interaction with the website. The first-party domain of Home Screen web applications is exempt from the 7-day cap, and its website data is isolated from Safari. These are WebKit policy statements, not a test on current iOS or a guarantee against other causes of storage loss. Source: [Tracking Prevention in WebKit](https://webkit.org/tracking-prevention/).
- **T4 Home Screen use counter, 2020 post.** Verified October 21, 2026 (first checked October 12, 2026). The 2020 WebKit post described a separate day-of-use counter for Home Screen web applications and expected no first-party website-data deletion for them. Older than T3 and consistent with it. Source: [Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/).

### Cloud security research

- **T5 iCloud encryption category counts.** Unproven. Two Apple sources disagree, both checked October 21, 2026: the iCloud data security overview says 15 data categories are end-to-end encrypted under standard data protection, rising to 25 with Advanced Data Protection; the Advanced Data Protection security guide says the count rises from 14 to 23. The conflict is unresolved, so no single count is verified. Sources: [iCloud data security overview](https://support.apple.com/en-us/102651), [Advanced Data Protection for iCloud](https://support.apple.com/guide/security/advanced-data-protection-for-icloud-sec973254c5f/1/web/1).

### Web security grounding

- **T6 Shared-origin storage.** Verified October 21, 2026 (first checked October 12, 2026). The OWASP HTML5 Security Cheat Sheet says web storage objects are shared within an origin and cannot be limited to a path, and advises against hosting multiple applications on the same origin. This grounds APP-6 on GitHub Pages. Source: [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).
- **T7 CSP as a second layer.** Verified October 21, 2026 (first checked October 12, 2026). MDN's CSP guide says a CSP can provide defense in depth against XSS and is not an alternative to sanitizing input. Its frame-ancestors reference describes choosing valid embedding parents, and its Subresource Integrity reference describes requiring a fetched resource to match a cryptographic hash; SRI matters only if a CDN resource is ever added. Sources: [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [MDN Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity).
- **T8 Documented decisions and validation advice.** Verified October 21, 2026 (first checked October 12, 2026). The OWASP ASVS 5.0 preface says the standard introduces requirements for documenting key security decisions. NIST SP 800-218 SSDF 1.1 and the OWASP Input Validation Cheat Sheet are published at the recorded URLs; both are advice, not adopted requirements. Sources: [OWASP ASVS 5.0 preface](https://asvs.dev/v5.0.0/Preface/), [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final), [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).
- **T9 Custom headers on Pages discussion.** Unproven. The GitHub Community discussion "HTTP Headers (e.g. Content-Security-Policy) on Pages" exists, but its content could not be read on October 12, 2026 or October 21, 2026; the page returns the generic community landing view. It is a discussion, not official GitHub documentation, and its custom-header claim stays unverified. Source: [discussion 54257](https://github.com/orgs/community/discussions/54257).

### Gesture threshold

- **T10 SwiftUI gesture defaults.** Verified October 21, 2026 (first recorded October 12, 2026, in [D62](https://github.com/soliskit/tetris-js/blob/5687f3ec8d0df23b93b20197edcb1abf1428010a/docs/decisions.md#L314)). SwiftUI's long-press default maximum movement is 10 points, and its default minimum drag distance is 10 points. Apple's number is a starting point, not a points-to-pixels conversion. Sources: [onLongPressGesture](https://developer.apple.com/documentation/SwiftUI/View/onLongPressGesture(minimumDuration:maximumDistance:pressing:perform:)), [DragGesture init](https://developer.apple.com/documentation/swiftui/draggesture/init(minimumdistance:coordinatespace:)-8ffe5).
