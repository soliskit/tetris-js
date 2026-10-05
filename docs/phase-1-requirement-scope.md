# Phase 1 requirement-scope table

Status: **owner scope decision recorded, subject to green CI on the exact head of the pull request that carries it** (see D15 in `AUDIT.md`). The owner approved this scope on October 4, 2026, after the assistant proposed it and the owner asked for one wording cleanup, made here. The assistant has read the production code, so it is not independent of the implementation (blueprint O8); this table is built from the requirement entries alone and makes no claim about what the code does.

Source: `REQUIREMENTS.md` at main fd10f07ba63dc4f935b9e79745c59ec83a549fbf (the D14-merged baseline; the file is unchanged from 615dfee2b78067a504d3263d46bfc03e4a23ec84), SHA-256 fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc. It holds 55 requirement IDs, each in one row below, none missing or duplicated.

Blueprint 1.1 and the Phase 1 exit criteria require every ID to be marked in scope or out of scope, with an owner decision. A requirement outside scope is listed as not certified, and none is excluded merely because it is inconvenient to prove.

## Owner decision

- All 55 REQUIREMENTS.md requirements are in scope. None is out of scope. None is "not yet scoped".
- Eight requirements depend on something outside the repository (APP-1, APP-4, DSP-1, DSP-2, DSP-4, DSP-6, DSP-7, QA-4). They remain in scope and may carry evidence gaps until the required device or browser evidence is obtained. Unavailable evidence is an evidence gap, not a reason to exclude the requirement.
- "In scope" means the audit undertakes to address and certify the requirement if sufficient evidence can be obtained. It does not mean the requirement is already established or certified.
- No state-model, boundary, R1 to R5 or certification decision is made or implied by this scope decision.

Clarifications recorded with D15 (the owner's wording, October 4, 2026):

- An in-scope requirement may carry an evidence gap at Phase 1 exit. Phase 1 exit approves scope and Phase 1 normative decisions; it does not certify the requirement.
- Scope is determined by requirement applicability, not anticipated proofability or the later choice of trusted-state boundary. A later inability to establish an in-scope requirement is recorded as an evidence gap or certification result, not as a retroactive scope exclusion.

What counts as a "timer" in SAF-4 is not decided here. It remains an owner decision for the later state-model and transition-boundary proposal.

The Applicable claim and Evidence method columns now cross-reference the Phase 3 requirement records and method supplement. They name claims and methods, not certification or Phase 3 closure. The Certification status column belongs to Phase 5 and stays empty. The owner scope decision and evidence-gap notes are unchanged.

Phase 3 claim/method links are draft changes against documentation main `902d5044b64ac12b7ffd53c417e971f1588ba874`, pending the exact-head documentation review/checks. This update does not reopen the owner scope decision or certify any row.

## Table

| Requirement | Group | Scope | Note | Owner decision | Applicable claim | Evidence method | Certification status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PCE-1 | Pieces and board | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PCE-1 | Method/evidence in `phase-3-model-method-mapping.md`, row PCE-1; underlying P3-C record | |
| PCE-2 | Pieces and board | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PCE-2 | Method/evidence in `phase-3-model-method-mapping.md`, row PCE-2; underlying P3-C record | |
| PCE-3 | Pieces and board | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PCE-3 | Method/evidence in `phase-3-model-method-mapping.md`, row PCE-3; underlying P3-C record | |
| PCE-4 | Pieces and board | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PCE-4 | Method/evidence in `phase-3-model-method-mapping.md`, row PCE-4; underlying P3-C record | |
| PCE-5 | Pieces and board | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PCE-5 | Method/evidence in `phase-3-model-method-mapping.md`, row PCE-5; underlying P3-C record | |
| PCE-6 | Pieces and board | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PCE-6 | Method/evidence in `phase-3-model-method-mapping.md`, row PCE-6; underlying P3-C record | |
| PLY-1 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-1 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-1; underlying P3-C record | |
| PLY-2 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-2 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-2; underlying P3-C record | |
| PLY-3 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-3 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-3; underlying P3-C record | |
| PLY-4 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-4 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-4; underlying P3-C record | |
| PLY-5 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-5 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-5; underlying P3-C record | |
| PLY-6 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-6 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-6; underlying P3-C record | |
| PLY-7 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-7 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-7; underlying P3-C record | |
| PLY-8 | Play | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record PLY-8 | Method/evidence in `phase-3-model-method-mapping.md`, row PLY-8; underlying P3-C record | |
| SCO-1 | Scoring | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record SCO-1 | Method/evidence in `phase-3-model-method-mapping.md`, row SCO-1; underlying P3-C record | |
| SCO-2 | Scoring | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record SCO-2 | Method/evidence in `phase-3-model-method-mapping.md`, row SCO-2; underlying P3-C record | |
| SCO-3 | Scoring | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-C.txt`, record SCO-3 | Method/evidence in `phase-3-model-method-mapping.md`, row SCO-3; underlying P3-C record | |
| STA-1 | Game states | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record STA-1 | Method/evidence in `phase-3-model-method-mapping.md`, row STA-1; underlying P3-D record | |
| STA-2 | Game states | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record STA-2 | Method/evidence in `phase-3-model-method-mapping.md`, row STA-2; underlying P3-D record | |
| STA-3 | Game states | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record STA-3 | Method/evidence in `phase-3-model-method-mapping.md`, row STA-3; underlying P3-D record | |
| STA-4 | Game states | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record STA-4 | Method/evidence in `phase-3-model-method-mapping.md`, row STA-4; underlying P3-D record | |
| STA-5 | Game states | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record STA-5 | Method/evidence in `phase-3-model-method-mapping.md`, row STA-5; underlying P3-D record | |
| STA-6 | Game states | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record STA-6 | Method/evidence in `phase-3-model-method-mapping.md`, row STA-6; underlying P3-D record | |
| SAF-1 | Safety | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record SAF-1 | Method/evidence in `phase-3-model-method-mapping.md`, row SAF-1; underlying P3-D record | |
| SAF-2 | Safety | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record SAF-2 | Method/evidence in `phase-3-model-method-mapping.md`, row SAF-2; underlying P3-D record | |
| SAF-3 | Safety | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record SAF-3 | Method/evidence in `phase-3-model-method-mapping.md`, row SAF-3; underlying P3-D record | |
| SAF-4 | Safety | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record SAF-4 | Method/evidence in `phase-3-model-method-mapping.md`, row SAF-4; underlying P3-D record | |
| SAF-5 | Safety | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record SAF-5 | Method/evidence in `phase-3-model-method-mapping.md`, row SAF-5; underlying P3-D record | |
| SAF-6 | Safety | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record SAF-6 | Method/evidence in `phase-3-model-method-mapping.md`, row SAF-6; underlying P3-D record | |
| INP-1 | Input | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record INP-1 | Method/evidence in `phase-3-model-method-mapping.md`, row INP-1; underlying P3-D record | |
| INP-2 | Input | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record INP-2 | Method/evidence in `phase-3-model-method-mapping.md`, row INP-2; underlying P3-D record | |
| INP-3 | Input | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record INP-3 | Method/evidence in `phase-3-model-method-mapping.md`, row INP-3; underlying P3-D record | |
| INP-4 | Input | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record INP-4 | Method/evidence in `phase-3-model-method-mapping.md`, row INP-4; underlying P3-D record | |
| INP-5 | Input | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record INP-5 | Method/evidence in `phase-3-model-method-mapping.md`, row INP-5; underlying P3-D record | |
| INP-6 | Input | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-D.txt`, record INP-6 | Method/evidence in `phase-3-model-method-mapping.md`, row INP-6; underlying P3-D record | |
| DSP-1 | Display | In scope | Evidence may be a gap: depends on phone-screen layout | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-1 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-1; underlying P3-E record | |
| DSP-2 | Display | In scope | Evidence may be a gap: depends on device pixel density | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-2 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-2; underlying P3-E record | |
| DSP-3 | Display | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-3 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-3; underlying P3-E record | |
| DSP-4 | Display | In scope | Evidence may be a gap: depends on Safari touch and zoom behavior | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-4 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-4; underlying P3-E record | |
| DSP-5 | Display | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-5 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-5; underlying P3-E record | |
| DSP-6 | Display | In scope | Evidence may be a gap: depends on Display P3 screens | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-6 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-6; underlying P3-E record | |
| DSP-7 | Display | In scope | Evidence may be a gap: depends on the Screen Wake Lock behavior of a device | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-7 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-7; underlying P3-E record | |
| DSP-8 | Display | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record DSP-8 | Method/evidence in `phase-3-model-method-mapping.md`, row DSP-8; underlying P3-E record | |
| APP-1 | App | In scope | Evidence may be a gap: depends on installation on a device | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record APP-1 | Method/evidence in `phase-3-model-method-mapping.md`, row APP-1; underlying P3-E record | |
| APP-2 | App | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record APP-2 | Method/evidence in `phase-3-model-method-mapping.md`, row APP-2; underlying P3-E record | |
| APP-3 | App | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record APP-3 | Method/evidence in `phase-3-model-method-mapping.md`, row APP-3; underlying P3-E record | |
| APP-4 | App | In scope | Evidence may be a gap: depends on a specific OS, browser and phone model | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record APP-4 | Method/evidence in `phase-3-model-method-mapping.md`, row APP-4; underlying P3-E record | |
| APP-5 | App | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record APP-5 | Method/evidence in `phase-3-model-method-mapping.md`, row APP-5; underlying P3-E record | |
| APP-6 | App | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record APP-6 | Method/evidence in `phase-3-model-method-mapping.md`, row APP-6; underlying P3-E record | |
| QA-1 | Process | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record QA-1 | Method/evidence in `phase-3-model-method-mapping.md`, row QA-1; underlying P3-E record | |
| QA-2 | Process | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record QA-2 | Method/evidence in `phase-3-model-method-mapping.md`, row QA-2; underlying P3-E record | |
| QA-3 | Process | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record QA-3 | Method/evidence in `phase-3-model-method-mapping.md`, row QA-3; underlying P3-E record | |
| QA-4 | Process | In scope | Evidence may be a gap: depends on a WebKit run | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record QA-4 | Method/evidence in `phase-3-model-method-mapping.md`, row QA-4; underlying P3-E record | |
| QA-5 | Process | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record QA-5 | Method/evidence in `phase-3-model-method-mapping.md`, row QA-5; underlying P3-E record | |
| QA-6 | Process | In scope |  | Approved: in scope | Claim in `phase-3-obligations-P3-E.txt`, record QA-6 | Method/evidence in `phase-3-model-method-mapping.md`, row QA-6; underlying P3-E record | |
