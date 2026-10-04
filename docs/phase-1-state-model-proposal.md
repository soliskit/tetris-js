# Phase 1 proposal: state categories and authoritative transition boundary

Status: **PROPOSAL FOR REVIEW. This is not an approved decision.** No owner decision is recorded by this document, and no row in `AUDIT.md` refers to it. The owner approves or changes it separately.

Base: main d40cbd898cf90a33d87df30f0064d1a752db2eae (D15 merged). Nothing in `docs/audit-blueprint.txt`, `docs/audit-blueprint.pdf`, `REQUIREMENTS.md`, `AUDIT.md`, the production code, the tests, the CI configuration or any proof tool is changed by this document.

Independence (blueprint O8): the assistant that drafted this has read the production code. This proposal is built from `REQUIREMENTS.md` and the blueprint, and no placement below rests on where the current code keeps an item. It is still not independent of the implementation.

The document has two parts. Part A is review material (reasoning, alternatives, open questions). Part B is a separate draft of clean decision text that could later hold only the adopted rules. Part B is not approved until the owner approves it.

## Part A. Review material

### A0. The gate

- Decides (owner decisions this proposal prepares): the placement of concrete state among the five categories; which transitions may commit each category; the authoritative transition boundary; the generic O1 rule for intermediate mutations and failure.
- Leaves open for later gates: R1 predicates, R2/R4 persistence semantics, what "fault reported" means, the SAF-4 timer meaning, R3, R5, trust decisions, oracle and specification choices, the O8 pack.
- Depends on earlier approved decisions: D14 (blueprint amendment, merged) and D15 (scope: all 55 requirements in scope, evidence gaps allowed, SAF-4 timer meaning undecided). Both are preserved verbatim and unchanged.
- Exit criteria: the owner records the adopted placements, boundary and generic rule (Part B filled in) in a separate decision change, with CI on its exact head and the owner's separate merge authorization. This proposal alone does not meet them.
- Labels: statements marked "Recommendation" are the drafter's recommendation, not an adopted rule. No evidence work is claimed here, so no evidence label (Tested, Proven, and so on) applies.

### A1. What this proposal decides and what it leaves open

It asks the owner to choose: where each concrete piece of game state belongs among the five categories, which kinds of transition may commit each category, the authoritative transition boundary, and the generic rule for intermediate mutations and failure that O1 requires.

It does not decide, and only identifies as dependencies:

- R1: exact valid-state predicates (board, queue elements, current piece, sparse versus dense forms, score domain, timer-state validity, other malformed-state predicates);
- R2 to R5;
- persistence-specific questions: the exact meaning and ordering of "last good save", save discoverability, STA-3 forgetting, storage-write consequences, persistence rollback ordering (R2/R4);
- what "fault reported" means (a separate Phase 1 owner decision);
- scheduler, browser, storage and render trust decisions; oracle and specification choices; security-property mappings; proof-obligation requirement mappings; the model input pack (O8);
- the meaning of "timer" in SAF-4 (see A6). It stays open.

The SAF-3 skeleton fixed by the blueprint (game over, no timers running, fault reported, last good save kept) is relied on and not redefined. This proposal adds no board, queue, current-piece, score or hold condition to it.

### A2. The five categories

The five categories come from blueprint section 1.3 and are not reconsidered:

1. authoritative game state;
2. derived state (computable from other state);
3. runtime resources (for example timer handles);
4. persisted representation (external state);
5. presentation state (not authoritative engine state).

### A3. Proposed category placement

Each row is derived from the requirement text, not from where the current code stores the item. The Proposed column is the drafter's recommendation, not an adopted rule. "Alternative" is a reasonable different placement the owner may choose. Placement of every row is an owner decision.

| Item | Proposed category | Reasoning from requirements | Alternative |
| --- | --- | --- | --- |
| Locked blocks on the board | Authoritative | PCE-1, PCE-6, SCO-1: they are the game's own record of where blocks are, and clearing and locking change them | none proposed |
| Current falling piece (kind, rotation, position) | Authoritative | PCE-3, PCE-4, PCE-6, PLY-1 to PLY-4: legal moves change it and rules constrain it | none proposed |
| Held piece, and whether hold was already used for this piece | Authoritative | PLY-7: both change play and neither is computable from other state | none proposed |
| Upcoming queue (next three pieces) | Authoritative | PLY-8, SAF-4: three pieces are always known and their order matters | none proposed |
| Remaining bag contents | Authoritative | PCE-5, STA-4: the bag is saved and restored exactly | derived from the random source plus the history of deals, if the owner treats the random source as the state |
| Random source | Not game state: an input to transitions | PCE-5: it can be replaced for tests, so it supplies values and holds none of the game's rules | authoritative, if the owner wants its internal state in the model |
| Score | Authoritative | SCO-1, SCO-2, STA-4: changed by clearing, saved and restored | none proposed |
| Level | Derived | SCO-2 defines it from the score: score divided by 1000, rounded down, plus 1 | authoritative, if the owner wants it checked as a stored value |
| Game mode (playing, paused, game over) | Authoritative | STA-1 to STA-3, STA-5: which operations are legal depends on it | none proposed |
| Lock-delay reset count (up to 15) | Authoritative | PLY-6: the count changes outcomes and resets on a lower row | none proposed |
| Whether the current piece is resting | Derived | PLY-6: computable from the piece and the locked blocks | none proposed |
| Where the piece would land (ghost position) | Derived | PLY-5: computable from the piece and the locked blocks | presentation, if it only exists for drawing |
| Gravity interval | Derived | PLY-2: a function of the level | none proposed |
| Gravity timer, lock-delay timer, key-repeat timers, any other scheduled callback handle | Runtime resources | SAF-3, SAF-4, STA-2, INP-2: requirements speak of timers running or stopped | none proposed |
| Screen wake lock | Runtime resource | DSP-7: held and re-requested during play | none proposed |
| Held-key and pointer state used for repeating moves | Runtime resource | INP-2, INP-5: it exists to drive repeats and ends when play stops | authoritative, if the owner wants the input history in the model |
| Saved game | Persisted representation | STA-4, STA-6, SAF-1: stored outside the engine and untrusted when read | none proposed |
| High score value | Persisted representation | SCO-3: stored on the device and replaced only by a higher score | authoritative, with the stored copy as a separate persisted item |
| Cached app files and versions | Persisted representation | APP-2, APP-6 | outside the game model, if the owner scopes the model to engine state |
| What is drawn: canvases, score and level text, buttons, hints, Game Over message | Presentation | DSP-5, DSP-8: they must match the state and are not themselves state | none proposed |
| The new-game confirmation dialog being open | Presentation | STA-1: it is a prompt over a paused game | authoritative, if the owner wants the open dialog to be part of game mode |
| Marker that tells the page the locked blocks changed | Derived, kept only for redraw | DSP-3: it says whether a redraw is needed | presentation |

### A4. Which kinds of transition may commit each category

This section proposes who may change each category. A "legal operation" means an operation the requirements specify: new game, move, rotate, soft drop, hard drop, hold, gravity step, lock, line clear, pause, resume, continue, game over, and entry to the safe terminal state.

| Category | May be committed by |
| --- | --- |
| Authoritative | Legal operations only, each at its commit point (A5), and entry to the safe terminal/fault state. No other path. |
| Derived | No transition commits it as a value of its own. It is recomputed from other state. A stored copy is a cache and must never be the only source. |
| Runtime resources | Created, replaced or cancelled by legal operations as part of the same transition, and all stopped on entry to the safe terminal/fault state (SAF-3). |
| Persisted representation | Only by authorized persistence effects that belong to a transition (for example the save in STA-4, forgetting in STA-1 and STA-3, high score in SCO-3). Which effects exist, their order and failure behavior are for R2/R4. |
| Presentation | Anything may update it. It must never be the route by which authoritative state changes, and a presentation callback has no authority over authoritative state. |

### A5. Proposed authoritative transition boundary

The proposal uses the blueprint's O1 definition: a transition is a specified legal operation that attempts to move authoritative state from one certified state to another certified state, or to the certified safe terminal/fault state.

The boundary is the conceptual commit point at which a legal operation commits all the changes Phase 1 permits it to make to authoritative state, including the authorized persistence effects that belong to the same transition, or enters the safe terminal/fault state. It is defined from the requirements and the five categories, independent of the current implementation.

Fixed by O1 and not up for choice: existing functions do not become authoritative because they perform validation; the current function boundaries are not the model boundary; any privileged exception must be explicit and separately justified. This proposal identifies no privileged exception. If the owner or a later phase finds one, it is listed and justified separately.

The commit point is a conceptual point in a specified operation. Where in the current code it falls is for Phase 2, and is not decided here.

### A6. The generic O1 question: intermediate mutations

O1 requires Phase 1 to decide whether a transition's validity is evaluated only at its commit point, or whether intermediate mutations must also keep the state valid, and, if intermediate mutations are permitted, to define the failure or rollback semantics that make a thrown transition safe. The audit assumes neither atomicity nor a rollback mandate unless a requirement provides one.

The owner chooses one generic rule:

- **Rule 1, validity at the commit point only.** Authoritative state needs to be valid only when a transition commits. Intermediate states may be invalid. This rule then needs a generic failure rule from the list below.
- **Rule 2, validity throughout.** Every intermediate change to authoritative state must itself leave a valid state. No generic failure rule is needed for partial changes, because none can exist.

What the requirements say that bears on the choice, without deciding it: PCE-6 says a piece can "never" be outside the board or overlap a locked block. SAF-3 says that if anything throws, the game stops in a safe state. SAF-4 says the engine checks invariants "after every action and every timer", and that wording is not narrowed by either rule (see A7).

If Rule 1 is chosen, the owner also chooses the generic failure rule for a transition that throws before it commits:

- **Failure rule F1.** The authoritative state is restored to its value before the transition began, and the engine then enters the safe terminal/fault state.
- **Failure rule F2.** The engine enters the safe terminal/fault state with the authoritative state as it then is, which may be partly changed.

Constraint from the committed blueprint: the safe terminal/fault state adds no condition on the board, queue, current piece, score or hold that SAF-3 does not state, because a fault normally leaves those contents malformed and the safe stop keeps them as they are. F1 and F2 differ in what the contents are at that point, and the choice does not add a validity condition to the fault state.

Consequences and dependencies:

- Rule 1 permits temporarily invalid intermediate states, so the failure rule matters and R1 must say which malformed contents are possible after a fault. Rule 2 needs no failure rule for partial changes, but it adds a requirement on every intermediate step that no requirement text states.
- F1 needs the pre-transition state to be recoverable and gives R2/R4 a clear "state before the fault" to relate the last good save to. F2 asks nothing of the transition beyond entering the safe terminal state, and leaves contents as they are, as the SAF-3 skeleton already says.
- The choice does not change how often SAF-4 requires a check (A7).

Recommendation (the drafter's, not an adopted rule): Rule 1 with failure rule F2. Reason: the audit assumes neither atomicity nor a rollback mandate unless a requirement provides one, and no requirement text provides one. SAF-3 asks only that the game stops in a safe state and the last good save is kept, and the blueprint already says the safe stop keeps malformed contents as they are. Rule 2 and F1 would each add a stronger guarantee than the requirements state. This leaves the owner decision open.

Persistence-specific consequences are not decided here: last-good-save ordering, storage rollback and discoverability, STA-3 forgetting and write failures stay with R2/R4.

### A7. SAF-4 timer question (open)

SAF-4 reads, literally: "after every action and every timer". This proposal keeps that wording and does not choose a meaning of "timer". The category and boundary decision can be completed while this question stays open. The boundary answer does not answer it, and nothing here recommends that any event class is excluded because it is not authoritative.

Any interpretation that reduces the literal required check points would be a requirement clarification or change that needs the owner's explicit approval. It would not be a modelling convenience.

For each plausible class of timer or scheduled event, two separate questions:

1. Authority question: can this event commit authoritative state?
2. SAF-4 question: does this class count as a "timer" that requires the SAF-4 invariant check?

| Event class | Authority question (what the requirements indicate) | SAF-4 question |
| --- | --- | --- |
| Gravity expiry | Yes: PLY-2 moves the piece down | Open, owner decides |
| Lock-delay expiry | Yes: PLY-6 locks the piece | Open, owner decides |
| Key-repeat and soft-drop repeat callbacks | Yes: INP-2 repeats a move or soft drop | Open, owner decides |
| Other scheduled callbacks that call a legal operation | Yes, if they call one | Open, owner decides |
| Animation-frame or drawing-loop callbacks | Not by themselves: DSP-3 limits redraw to changes | Open, owner decides |
| Input throttle or debounce callbacks | Only if they release a legal operation | Open, owner decides |
| Pointer or gamepad polling callbacks | Only if they raise a legal operation; SAF-5 covers polling errors | Open, owner decides |
| Wake-lock re-request callbacks | No: DSP-7 concerns the screen only | Open, owner decides |
| Presentation callbacks (text, layout, canvas size changes) | No | Open, owner decides |
| Other classes the owner names | Owner decides | Open, owner decides |

### A8. Dependencies and open questions for later decisions

- R1 needs the categories and boundary first, then decides exact valid-state predicates for each authoritative item.
- R2/R4 decides persistence-specific ordering, rollback, discoverability, STA-3 behavior and the meaning of "last good save".
- A later Phase 1 decision defines what "fault reported" means.
- Trust decisions (scheduler, browser, storage, render), oracle and specification choices, security-property mappings, proof-obligation mappings and the O8 model input pack remain for the later Phase 1 steps.
- The SAF-4 timer interpretation remains an owner decision.

### A9. Review and decision record

This proposal is for advisory review and then for the owner's decisions. When the owner has decided, the owner's choices are recorded as decision text (Part B, edited to the adopted choices) and a decision row in `AUDIT.md`, in a separate change. This document records no approval and adds no `AUDIT.md` row.

## Part B. Clean decision text (DRAFT, NOT APPROVED)

Nothing in Part B is approved. It shows what the decision text could later contain once the owner has chosen. It holds only rules: no rejected alternatives, no implementation observations, no code locations, no test names, no history. Bracketed choices are filled in by the owner's decision.

**B1. State categories.** Game state is partitioned into five categories: authoritative game state; derived state; runtime resources; persisted representation; presentation state.

**B2. Placement.** Locked blocks, the current falling piece, the held piece with its once-per-piece flag, the upcoming queue, the remaining bag contents, the score, the game mode and the lock-delay reset count are authoritative. The level, whether the piece is resting, the landing position of the piece, the gravity interval and the redraw marker are derived. Gravity, lock-delay and key-repeat timers, scheduled-callback handles, the screen wake lock and held-input state are runtime resources. The saved game, the stored high score and the cached app files are persisted representation. What is drawn, and the new-game confirmation dialog, are presentation state. The random source is an input to transitions and is not game state.

**B3. Who may commit each category.** Authoritative state is changed only by legal operations at their commit point and by entry to the safe terminal/fault state. Derived state is recomputed and is not committed as a value of its own. Runtime resources are created, replaced or cancelled by legal operations as part of the same transition, and are all stopped on entry to the safe terminal/fault state. Persisted representation is changed only by authorized persistence effects that belong to a transition. Presentation state may be updated by anything and never changes authoritative state.

**B4. Authoritative transition boundary.** A transition is a specified legal operation that attempts to move authoritative state from one certified state to another certified state, or to the certified safe terminal/fault state. The authoritative transition boundary is the conceptual commit point at which a legal operation commits the changes this decision permits it to make to authoritative state, together with the authorized persistence effects that belong to the same transition. The boundary is defined independently of any implementation. A function does not become authoritative because it validates. No privileged exception is adopted.

**B5. Intermediate mutations.** [Owner's choice: Rule 1, validity is required only when a transition commits, with failure rule [F1 or F2]; or Rule 2, every intermediate change to authoritative state must itself leave a valid state.]

**B6. Safe terminal/fault state.** This decision relies on the existing safe terminal/fault skeleton (game over, no timers running, the fault reported, the last good save kept), and adds no condition to it. The meaning of "reported" and of "last good save" is decided separately.

**B7. SAF-4.** SAF-4 is "after every action and every timer". This decision adopts no interpretation of "timer".
