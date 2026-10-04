# Phase 1 requirement-scope table

Status: **owner scope decision recorded, subject to green CI on the exact head of the pull request that carries it** (see D14 in `AUDIT.md`). The owner approved this scope on October 4, 2026, after the assistant proposed it and the owner asked for one wording cleanup, made here. The assistant has read the production code, so it is not independent of the implementation (blueprint O8); this table is built from the requirement entries alone and makes no claim about what the code does.

Source: `REQUIREMENTS.md` at main, SHA-256 fa2580d6bf0a67dd80d5e569da363776a029a79caef457604c7efe74ea72f7bc. It holds 55 requirement IDs, each in one row below, none missing or duplicated.

Blueprint 1.1 and the Phase 1 exit criteria require every ID to be marked in scope or out of scope, with an owner decision. A requirement outside scope is listed as not certified, and none is excluded merely because it is inconvenient to prove.

## Owner decision

- All 55 REQUIREMENTS.md requirements are in scope. None is out of scope. None is "not yet scoped".
- Eight requirements depend on something outside the repository (APP-1, APP-4, DSP-1, DSP-2, DSP-4, DSP-6, DSP-7, QA-4). They remain in scope and may carry evidence gaps until the required device or browser evidence is obtained. Unavailable evidence is an evidence gap, not a reason to exclude the requirement.
- "In scope" means the audit undertakes to address and certify the requirement if sufficient evidence can be obtained. It does not mean the requirement is already established or certified.
- No state-model, boundary, R1 to R5 or certification decision is made or implied by this scope decision.

The Applicable claim, Evidence method and Certification status columns belong to Phases 3 and 5 and stay empty.

## Table

| Requirement | Group | Scope | Note | Owner decision | Applicable claim | Evidence method | Certification status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PCE-1 | Pieces and board | In scope |  | Approved: in scope | | | |
| PCE-2 | Pieces and board | In scope |  | Approved: in scope | | | |
| PCE-3 | Pieces and board | In scope |  | Approved: in scope | | | |
| PCE-4 | Pieces and board | In scope |  | Approved: in scope | | | |
| PCE-5 | Pieces and board | In scope |  | Approved: in scope | | | |
| PCE-6 | Pieces and board | In scope |  | Approved: in scope | | | |
| PLY-1 | Play | In scope |  | Approved: in scope | | | |
| PLY-2 | Play | In scope |  | Approved: in scope | | | |
| PLY-3 | Play | In scope |  | Approved: in scope | | | |
| PLY-4 | Play | In scope |  | Approved: in scope | | | |
| PLY-5 | Play | In scope |  | Approved: in scope | | | |
| PLY-6 | Play | In scope |  | Approved: in scope | | | |
| PLY-7 | Play | In scope |  | Approved: in scope | | | |
| PLY-8 | Play | In scope |  | Approved: in scope | | | |
| SCO-1 | Scoring | In scope |  | Approved: in scope | | | |
| SCO-2 | Scoring | In scope |  | Approved: in scope | | | |
| SCO-3 | Scoring | In scope |  | Approved: in scope | | | |
| STA-1 | Game states | In scope |  | Approved: in scope | | | |
| STA-2 | Game states | In scope |  | Approved: in scope | | | |
| STA-3 | Game states | In scope |  | Approved: in scope | | | |
| STA-4 | Game states | In scope |  | Approved: in scope | | | |
| STA-5 | Game states | In scope |  | Approved: in scope | | | |
| STA-6 | Game states | In scope |  | Approved: in scope | | | |
| SAF-1 | Safety | In scope |  | Approved: in scope | | | |
| SAF-2 | Safety | In scope |  | Approved: in scope | | | |
| SAF-3 | Safety | In scope |  | Approved: in scope | | | |
| SAF-4 | Safety | In scope |  | Approved: in scope | | | |
| SAF-5 | Safety | In scope |  | Approved: in scope | | | |
| SAF-6 | Safety | In scope |  | Approved: in scope | | | |
| INP-1 | Input | In scope |  | Approved: in scope | | | |
| INP-2 | Input | In scope |  | Approved: in scope | | | |
| INP-3 | Input | In scope |  | Approved: in scope | | | |
| INP-4 | Input | In scope |  | Approved: in scope | | | |
| INP-5 | Input | In scope |  | Approved: in scope | | | |
| INP-6 | Input | In scope |  | Approved: in scope | | | |
| DSP-1 | Display | In scope | Evidence may be a gap: depends on phone-screen layout | Approved: in scope | | | |
| DSP-2 | Display | In scope | Evidence may be a gap: depends on device pixel density | Approved: in scope | | | |
| DSP-3 | Display | In scope |  | Approved: in scope | | | |
| DSP-4 | Display | In scope | Evidence may be a gap: depends on Safari touch and zoom behavior | Approved: in scope | | | |
| DSP-5 | Display | In scope |  | Approved: in scope | | | |
| DSP-6 | Display | In scope | Evidence may be a gap: depends on Display P3 screens | Approved: in scope | | | |
| DSP-7 | Display | In scope | Evidence may be a gap: depends on the Screen Wake Lock behavior of a device | Approved: in scope | | | |
| DSP-8 | Display | In scope |  | Approved: in scope | | | |
| APP-1 | App | In scope | Evidence may be a gap: depends on installation on a device | Approved: in scope | | | |
| APP-2 | App | In scope |  | Approved: in scope | | | |
| APP-3 | App | In scope |  | Approved: in scope | | | |
| APP-4 | App | In scope | Evidence may be a gap: depends on a specific OS, browser and phone model | Approved: in scope | | | |
| APP-5 | App | In scope |  | Approved: in scope | | | |
| APP-6 | App | In scope |  | Approved: in scope | | | |
| QA-1 | Process | In scope |  | Approved: in scope | | | |
| QA-2 | Process | In scope |  | Approved: in scope | | | |
| QA-3 | Process | In scope |  | Approved: in scope | | | |
| QA-4 | Process | In scope | Evidence may be a gap: depends on a WebKit run | Approved: in scope | | | |
| QA-5 | Process | In scope |  | Approved: in scope | | | |
| QA-6 | Process | In scope |  | Approved: in scope | | | |
