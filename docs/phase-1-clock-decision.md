# Phase 1 decision: the clock is not trusted; clock jumps are audited

Status: decision text recorded by ledger row D29 in `AUDIT.md`. The ledger row governs the status and the provenance of this text. This file is not independent of the implementation (blueprint O8): the assistant that drafted it has read the production code, although no rule below is taken from production code or tests.

Baseline: `docs/phase-1-browser-trust-decision.md` (D27) and `docs/phase-1-sw-fetch-decision.md` (D28), which left the clock (`Date.now`) unresolved. This file changes no bytes of either.

## Decision text

**K1. The clock is not trusted.** The audit assumes nothing about the clock: not that it is accurate, and not that it is steady. The clock can jump forward or backward.

**K2. Clock jumps are audited.** The audit tests forward and backward clock jumps wherever time decides whether something is cleaned up or loaded. That includes, as known to the drafter, the 10-minute pinning of the previous offline cache version (`public/sw.js`, `PIN_MS`) and the requirement that a page never mixes two versions (APP-2). A clock jump is never treated as proof that an old version is safe to delete.

**K3. A failed check is a finding.** A check that fails is recorded as a finding and addressed under the audit's normal process. It is not assumed away. A test existing is not by itself a guarantee of safety.

**K4. What is not decided.** No requirement is established by K1 to K3. The test design, any change to `REQUIREMENTS.md`, and any code change are not decided here.

## Not decided here

- Test design for clock jumps.
- Any change to REQUIREMENTS.md and any code change.
- Closure of the Phase 1 exit item on trust assumptions, or of any other Phase 1 exit item.
