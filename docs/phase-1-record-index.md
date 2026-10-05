# Phase 1 record index

This index tells a reader which Phase 1 documents govern and which are review material. It is navigation only. The ledger in `AUDIT.md` governs status and provenance.

## Governing

| Document | Ledger row | SHA-256 |
| --- | --- | --- |
| `docs/phase-1-state-decision.md` (D16, state categories and transition boundary) | D16 | 66aa067da57a525dcdc23d2d3f93f5204c511cb9bdb1750f102a6a2feb6a9182 |
| `docs/phase-1-d16-amendment-1.md` (D16 Amendment 1, lowest row reached) | D17 | 0e0775998098c827a5fb3dddb89c432d3d88b99c5cfcab07c7d836cef8af5bba |
| `docs/phase-1-r1-decision.md` (R1, exact valid-state semantics) | D18 | aacf5189a6aa3b21660e8bfe1a5bf8ab2d62f8e853df3febaa54d81412707dec |
| `docs/sources/1-SRS-pieces.png` (geometry reference, image) | D18 | 5a5c49e378cf00a2632a4cd3b5af36d3831dbbdcc64f8d7b09b93c2353821236 |
| `docs/sources/2-srs_table.txt` (geometry reference, extracted table) | D18 | c733639052686c488d7ed156720469a40f17963e893790ab727e9442ac7c524c |
| `docs/phase-1-d16-amendment-2.md` (D16 Amendment 2, Continue state placements) | D20 | 957ba3926778c5c18fa3ff7796d29196f9cd954d1f58fc7fbc399d8a1eff3355 |
| `docs/phase-1-r2-r5-decision.md` (R2, R3, R4 and R5) | D21 | 2d2de112e371b8b23094652bcb8c991d8d2c6097575a4c61c059a21292b93ed8 |
| `docs/phase-1-fault-timer-decision.md` (SAF-3 fault reporting and timer trust) | D22 | c3de7faf0da3146ec981c35fe6ebd70bede4cdaf1cd757919cad5b1bfab2ae1f |
| `docs/phase-1-trust-and-timer-scope-decision.md` (storage trust, SAF-5 reporting, failed cancellation, SAF-4 timer scope) | D23 | 0d7f14fd13d1eeb4064fd4064eabf18f6f2066b76e74be999d71b5c71522e75b |
| `docs/phase-1-trust-ledger-decision.md` (trust assumptions: hosting, service worker, GitHub Actions, random source) | D24 | 32f25db8bdc2f9ae62389dfd7dda90206132098f7f26f4540a03e048d3b7dab9 |
| `docs/phase-1-property-mapping.md` (adopted properties mapped to requirements, conflict register) | D25 | dc9f04dfa53a3e2bff21cb3401595b4ffa03a4bdbc46035166f2b91f0f606674 |
| `docs/phase-1-browser-trust-decision.md` (trust boundary for browser features) | D27 | cc51ba2ddb152bf2d0758a5220fb3666f633a9d7c3c5c950f544dc774af10a3b |
| `docs/phase-1-sw-fetch-decision.md` (trust boundary for service worker registration and network requests) | D28 | 02097c3b991ce4c1ba8859ef352ea010aed0af9adc5d466a212f3b2ebf350e54 |
| `docs/phase-1-clock-decision.md` (clock not trusted; clock jumps audited) | D29 | aff63f710484df3a272e0ebcf8d0db8a332974cbacf30ca9e372feebca3f347d |

## Historical review material, not governing

These were merged as records of how the decisions were reached. They contain alternatives and open choices that were later settled. Where one differs from a governing document, the governing document wins.

| Document | Pull request | SHA-256 |
| --- | --- | --- |
| `docs/phase-1-state-model-proposal.md` (state model proposal, historical per D16) | before #51 |  |
| `docs/phase-1-r1-valid-state-proposal.md` | #51 |  |
| `docs/phase-1-r1-proposal-rev1.md` | #52 |  |
| `docs/phase-1-d16-lowest-row-amendment-proposal.md` | #53 |  |
| `docs/phase-1-d16-amendment-candidate.md` | #54 |  |
| `docs/phase-1-r1-normative-candidate.md` | #54 |  |
