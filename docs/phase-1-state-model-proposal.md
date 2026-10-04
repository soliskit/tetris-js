# Phase 1 proposal: state categories and authoritative transition boundary

Status: **PROPOSAL FOR REVIEW. This is not an approved decision.** No owner decision is recorded by this document, and no row in `AUDIT.md` refers to it. The owner approves or changes it separately. This is a revision of the first draft after adversarial and advisory review; it is not ready for owner adoption until that review is complete.

Base: main d40cbd898cf90a33d87df30f0064d1a752db2eae (D15 merged). Nothing in `docs/audit-blueprint.txt`, `docs/audit-blueprint.pdf`, `REQUIREMENTS.md`, `AUDIT.md`, the production code, the tests, the CI configuration or any proof tool is changed by this document.

Independence (blueprint O8): the assistant that drafted this has read the production code. This proposal is built from `REQUIREMENTS.md` and the blueprint, and no placement or rule below rests on where the current code keeps an item or how it behaves. It is still not independent of the implementation.

The document has two parts. Part A is review material (reasoning, alternatives, recommendations, open questions). Part B is a separate draft of clean candidate decision text. Part B is DRAFT and NOT APPROVED.

## Part A. Review material

### A0. The gate

- Decides (owner decisions this proposal prepares): the placement of concrete state among the five categories; which routes may commit each category; the authoritative transition boundary; the generic O1 policy for validity of intermediate authoritative states; the generic O1 rule for a transition that throws.
- Leaves open: exact R1 predicates, persistence-specific R2/R4 semantics, R3, R5, what "fault reported" means, the SAF-4 timer meaning, scheduler/browser/storage/render trust decisions, oracle and specification choices, proof-obligation mappings, the O8 input pack, implementation correctness.
- Depends on earlier approved decisions: D14 (blueprint amendment, merged) and D15 (scope: all 55 requirements in scope, evidence gaps allowed, SAF-4 timer meaning undecided). Both are preserved verbatim and unchanged.
- Exit criteria: the owner records the adopted placements, boundary and generic rules (Part B filled in) in a separate decision change, with CI on its exact head and the owner's separate merge authorization. This proposal alone does not meet them.
- Labels: statements marked "Recommendation" are the drafter's recommendation, not an adopted rule and not a reading of the requirements. No evidence work is claimed, so no evidence label (Tested, Proven, and so on) applies.

### A1. What this proposal does not decide

- R1: exact valid-state predicates (board, queue elements, current piece, sparse versus dense forms, score domain, timer-state validity, other malformed-state predicates).
- Persistence-specific questions: the exact meaning and ordering of "last good save", save discoverability, STA-3 forgetting, storage-write consequences, persistence rollback ordering (R2/R4).
- What "fault reported" means (a separate Phase 1 owner decision).
- The meaning of "timer" in SAF-4 (see A7).
- Later decisions listed in A0.

The SAF-3 skeleton fixed by the blueprint (game over, no timers running, fault reported, last good save kept) is relied on and not redefined. This proposal adds no board, queue, current-piece, score or hold condition to it.

### A2. The five categories

From blueprint section 1.3, not reconsidered:

1. authoritative game state;
2. derived state (computable from other state);
3. runtime resources (for example timer handles);
4. persisted representation (external state);
5. presentation state (not authoritative engine state).

Modeled state is partitioned into exactly these five categories. This proposal adds no sixth category. A true transition input, such as a nondeterministic random value, may be modeled as an input to a transition rather than as state.

Derived state has no independent semantic authority, because its value is determined by other modeled state according to the applicable rule (the blueprint says computable from other state). An implementation may compute such a value on demand or store or cache it; storing or caching it does not make the semantic value authoritative. Later correspondence evidence must establish that the implementation's representation agrees with the approved derived-state rule wherever the applicable claim requires agreement. Where a requirement defines the relation explicitly, as SCO-2 does for the level, the relation is the rule.

The blueprint also requires Phase 1 to decide which data is authoritative, including persisted values and the New Game confirmation flag. A3 addresses the flag explicitly.

### A3. Proposed category placement

Each row is derived from the requirement text, not from where the current code stores the item. The "Proposed" column is the drafter's recommendation, not an adopted rule. "Alternative" lists genuine other placements for the owner to consider. Where a row says "owner choice", the requirements support more than one placement.

| Item | Proposed | Reasoning from requirements | Alternative |
| --- | --- | --- | --- |
| Locked blocks on the board | Authoritative | PCE-1, PCE-6, SCO-1: they record where blocks are, and locking and clearing change them | none proposed |
| Current falling piece (kind, rotation, position) | Authoritative | PCE-3, PCE-4, PCE-6, PLY-1 to PLY-4 | none proposed |
| Held piece, and whether hold was already used for this piece | Authoritative | PLY-7: both change play and neither is computable from other state | none proposed |
| Upcoming queue (next three pieces) | Authoritative | PLY-8, SAF-4 | none proposed |
| Remaining bag contents | Authoritative | PCE-5 and STA-4: the bag is saved and restored exactly | none proposed |
| Random source | Input to bag-refill and shuffle transitions, not game state | PCE-5: it can be replaced, so it supplies values to transitions. This remains a viable model choice unless the requirements require its internal state to be modelled; they do not appear to | authoritative, if the owner wants its internal state in the model |
| Score | Authoritative | SCO-1, SCO-2, STA-4 | none proposed |
| Level | Derived | SCO-2 defines it from the score | authoritative, if the owner wants a stored value checked |
| Game mode (playing, paused, game over) | Authoritative | STA-1 to STA-3, STA-5: legal operations depend on it | none proposed |
| Lock-delay reset count (up to 15) | Authoritative | PLY-6: the count changes outcomes and resets on a lower row | none proposed |
| Logical New Game confirmation pending state | Authoritative (control state) | STA-1: while confirmation is pending, ordinary actions are treated differently, keys go to the confirmation choices, and Cancel, Escape, outside clicks and other actions keep the game paused. The blueprint requires Phase 1 to decide its authority | runtime resource, if the owner treats the confirmation as outer-layer bookkeeping that the gameplay operation receives as an input (see the placement criterion below) |
| Logical selected confirmation choice (Cancel or New Game) | Authoritative (control state) | STA-1: Cancel is selected on open, left and right move the selection, and Enter acts on the selected choice, so it determines the result of a later key action | runtime resource, as above |
| Held move direction and "newest direction wins" ordering, keyboard, stick and directional pad | Authoritative control state | INP-2: which direction repeats, and which one resumes on release, depends on the order of presses | runtime resource, if the owner treats input history as environment |
| Repeat schedule position (waiting for the first 167 ms repeat or in 33 ms repeats; soft-drop 50 ms cadence) | Authoritative control state, separate from the timer handle | INP-2 gives a repeat rule that depends on where the sequence is | runtime resource |
| Touch drag: which falling piece the drag controls, and the gesture origin and position needed for one-column-per-cell and one-row-per-cell steps | Authoritative control state | INP-5: "a drag only controls the piece that was falling when it began", and steps depend on the gesture's position | runtime resource |
| Whether the current piece is resting | Derived | PLY-6: computable from the piece and the locked blocks | none proposed |
| Where the piece would land (ghost position) | Derived | PLY-5 | presentation, if it exists only for drawing |
| Gravity interval | Derived | PLY-2: a function of the level | none proposed |
| Gravity timer, lock-delay timer, key-repeat timer, any other scheduled-callback handle | Runtime resources | SAF-3, SAF-4, STA-2, INP-2 speak of timers running or stopped | none proposed |
| Screen wake lock | Runtime resource | DSP-7: held, and requested again if the system takes it back | none proposed |
| Saved game | Persisted representation | STA-4, STA-6, SAF-1: stored outside the engine and untrusted when read | none proposed |
| High score value | Persisted representation | SCO-3 | authoritative, with the stored copy a separate persisted item |
| Cached app files and versions | Persisted representation | APP-2, APP-6 describe versions and caches held on the device. Placement is not assumed from any other source | runtime resource, if the owner treats browser caches as environment; or outside the game model |
| Locked-block change counter or dirty marker | Owner choice between runtime resource and presentation state; drafter's lean: presentation state | DSP-3: the engine "counts changes to the locked blocks, so the page knows when they need drawing". It exists so the page knows when to redraw. A historical count of changes cannot be computed from the current modeled state alone, so it is not derived | runtime resource, if the owner treats it as outer-layer bookkeeping; derived is viable only if the modeled value is actually computable from other modeled state, and a historical change counter is not derived merely because it tracks authoritative changes |
| What is drawn: canvases, score and level text, buttons, hints, Game Over message, and the visual rendering of the confirmation dialog (text, highlight, controls) | Presentation | DSP-5, DSP-8, STA-1: they must match the state and are not themselves state | none proposed |

Placement criterion for control state (INP-2, INP-5, STA-1). A value favors authoritative state when the normative state machine itself must remember it across events to determine which future behavior is legally required, so that changing the value changes the model's legal future behavior. A value favors runtime resource when it is outer-layer or environment bookkeeping that can be treated as an input source to authoritative operations without itself being part of the normative game-state history. This is a decision criterion for the owner, not an adopted placement, and it does not depend on where production code stores the value.

Note on completeness: A3 lists state needed to explain requirement-defined behavior. It does not decide the exact values or domains of any item; that is R1.

### A4. Routes that may change each category

The model distinguishes four kinds of route. Not every change to a category is an authoritative game transition.

1. **Authoritative game transitions.** Specified legal operations (new game, move, rotate, soft drop, hard drop, hold, gravity step, lock, line clear, pause, resume, continue, game over, confirmation open, confirmation selection change, confirmation answer, and the control operations needed to explain INP-2 and INP-5: direction or control press, direction or control release, repeat-control progression, touch or drag begin, touch or drag update, touch or drag end or cancel; and entry to the safe terminal/fault state). The control operations are conceptual model operations that the requirements imply, not claims about the current code's handlers. They are the only routes that commit authoritative game state, each at its commit point (A5). If a control value is placed in authoritative state, no outer-layer route may change it outside the boundary. If the owner instead places a control value in the runtime resources, environmental and input routes may update it, and the authoritative gameplay operation receives the resulting control input, without the outer-layer update itself committing authoritative game state.
2. **Authorized application persistence effects caused by such transitions.** Included in the boundary of the transition that causes them (blueprint O1). Which effects exist, their order and failure behavior are for R2/R4.
3. **External or environmental changes.** Untrusted or hand-edited saved storage (SAF-1), changes made by another tab (DSP-5), storage events, platform revocation of the wake lock (DSP-7), service-worker, cache and version activity (APP-2, APP-6). An external actor can change persisted representation, and the platform can change runtime resources, without that change being an authorized authoritative transition. The boundary question is what happens when external data is accepted into authoritative state, not whether the external representation can physically change.
4. **Outer-layer routes audited for containment.** Drawing and polling routes (SAF-5) and similar routes do not commit authoritative game state themselves. They are audited for containment of what they do and for what they trigger.

| Category | Committed by |
| --- | --- |
| Authoritative | Kind 1 routes only, at their commit point |
| Derived | Not an independent authority: its value follows from other modeled state by the applicable rule. A stored or cached copy does not make the semantic value authoritative |
| Runtime resources | Created, replaced or cancelled as part of kind 1 transitions where a requirement says so; also changed by environmental routes (kind 3). Lifecycle is stated per resource in A4a |
| Persisted representation | Kind 2 effects when part of a transition; also changed by kind 3 external routes. External change does not make an authoritative transition |
| Presentation | No authority to commit authoritative state. Presentation mechanisms update presentation state only as the applicable presentation requirements allow (DSP-3, DSP-5, DSP-8) |

#### A4a. Runtime-resource lifecycle, per resource class

The proposal does not impose one rule on all runtime resources. The lifecycle comes from the applicable requirement for each class:

| Resource class | Lifecycle stated by the requirements |
| --- | --- |
| Timers running the game (gravity, lock delay) | SAF-3: no timers running in the safe terminal state. STA-2: nothing moves while paused. STA-3: all timers stop at game over |
| Key and stick repeat | INP-2: repeating stops when the game stops playing or the window loses focus |
| Screen wake lock | DSP-7: held while playing; pause or game over lets the screen sleep; requested again if the system takes it back |
| Drawing and polling loops | SAF-5: an error while drawing or polling is reported, and the loops keep running |
| Other scheduled callbacks | This proposal assigns no additional lifecycle rule unless an applicable requirement already supplies one. It does not decide that such callbacks are SAF-3 timers |

### A5. Proposed authoritative transition boundary

The proposal uses the blueprint's O1 definition: a transition is a specified legal operation that attempts to move authoritative state from one certified state to another certified state, or to the certified safe terminal/fault state.

The boundary is the conceptual commit point at which a legal operation commits all changes Phase 1 permits it to make to authoritative state, including the authorized persistence effects that belong to the same transition, or enters the safe terminal/fault state. It is defined from the requirements and the five categories, independent of the current implementation and its function structure.

Fixed by O1 and not up for choice: existing functions do not become authoritative because they perform validation; the current function boundaries are not the model boundary; any privileged exception must be explicit and separately justified. This proposal identifies no privileged exception.

The rule about persistence effects belonging to a transition applies to authorized effects caused by that transition only (route kind 2). It is not generalized to every change of persisted representation.

### A6. Generic O1 questions: two separate dimensions

O1 requires Phase 1 to decide whether a transition's validity is evaluated only at its commit point or whether intermediate mutations must themselves preserve validity, and, if intermediate mutations are permitted, to define failure or rollback semantics that make a thrown transition safe. These are two separate questions. The audit assumes neither atomicity nor a rollback mandate unless a requirement provides one.

A transition can make several individually valid authoritative changes and then throw. The resulting state may satisfy every valid-state predicate and still represent only part of the intended legal operation. So a rule for a thrown transition is needed whichever validity policy is chosen.

#### Dimension A: validity policy (owner choice)

- **Policy V1, validity at the commit point.** Authoritative state must satisfy the valid-state predicates when a transition commits. Intermediate authoritative states are not required to.
- **Policy V2, validity throughout.** Every intermediate authoritative state must also satisfy the applicable valid-state predicates.

Textual support and consequences, both stated fairly:

- PCE-6 says a piece can "never" be outside the board or overlap a locked block. This is a genuine interpretation question: it may be a statement about the state at the boundaries of specified operations (supports V1), or about every authoritative state that ever exists, including during an operation (supports V2). The requirement text does not settle which. This proposal does not resolve it by reference to the current implementation.
- SAF-4 says the engine checks invariants "after every action and every timer". That wording is fixed (A7). It names check points after actions and timers and is not in itself a statement about states inside an action. A check at those points is consistent with either policy, and neither policy changes how often SAF-4 requires a check.
- Consequences: V1 allows temporarily invalid states inside a transition, which makes the thrown-transition rule matter for validity as well as for completeness. V2 restricts how a transition may be specified, because every step must leave a valid state, and adds a constraint on the model of every operation that the requirement text may or may not intend; whether it does is the PCE-6 question.
- Recommendation (the drafter's, not a requirement reading): none. The requirement text supports both readings, and a recommendation here would be an interpretation of PCE-6 that belongs to the owner.

#### Dimension B: thrown-transition semantics (owner choice, independent of Dimension A)

The generic O1 rule for a transition that throws after authoritative mutation has begun but before successful completion. At minimum:

- **Rule F1.** Restore the pre-transition values of the authoritative contents affected by the failed transition, except for fields and effects that must change to enter the safe terminal/fault state, then apply the safe-terminal transition.
- **Rule F2.** Retain the authoritative contents reached at the fault, except for fields and effects that must change to enter the safe terminal/fault state, then apply the safe-terminal transition.

F1 and F2 govern the ordinary authoritative contents affected by the failed transition. The safe-terminal transition then applies whatever authoritative or lifecycle changes SAF-3 itself requires (for example the game mode becoming game over). This proposal enumerates no additional safe-terminal predicates.

This proposal does not assume transaction atomicity.

Textual support and consequences:

- SAF-3 requires the game to stop in a safe state (game over, no timers running), the fault to be reported, and the last good save to be kept. It does not say what the board, queue, piece, score or hold hold afterwards. The blueprint states that the safe stop keeps malformed contents as they are, and that the definition adds no condition on them.
- F1 needs the pre-transition authoritative state to be available to the model and gives a defined "state before the fault". It adds a requirement-level guarantee (that a fault leaves no trace of the failed transition on authoritative state) that no requirement text states.
- F2 asks nothing of the transition beyond entering the safe terminal state. It leaves the contents reached at the fault as they are, which is consistent with the blueprint's statement that the safe stop keeps malformed contents. It does not show that this is sufficient for safety beyond what SAF-3 states; the claim that it is safe rests only on SAF-3 defining the stop state this way.
- Recommendation (the drafter's, not an adopted rule and not shown sufficient): none that claims sufficiency. If the owner wants the least that SAF-3 already says, F2 is that reading, and that would be an owner choice. Absence of a stated rollback requirement shows only that F1 is not required, not that F2 is safe.

Persistence-specific rollback, last-good-save ordering and storage consequences are not decided here (R2/R4). The question of which malformed residues can exist after a fault is not an R1 condition: R1 defines valid-state semantics and does not have to enumerate every malformed representation. If later evidence work needs to characterize fault residues, that belongs to fault analysis under the applicable failure semantics.

### A7. SAF-4 timer question (open)

A7 concerns only the SAF-4 check-point question (when the invariant check is required). It is the question D15 left open, and it is not the same decision as which host scheduling mechanisms satisfy "no timers running" in the SAF-3 skeleton, which this proposal does not expand.

SAF-4 reads, literally: "after every action and every timer". This proposal keeps that wording and does not choose a meaning of "timer". The category and boundary decision can be completed while the question stays open. Nothing here recommends excluding any event class because it is not authoritative.

Any interpretation that reduces the literal required check points would be a requirement clarification or change needing the owner's explicit approval, not a modelling convenience.

For each plausible class, the matrix separates three things: the entry route (the callback or event that starts processing); the authoritative operation, if any, that may cross the transition boundary and commit state; and the SAF-4 timer status (independent and open). A callback that triggers a legal operation does not thereby gain independent permission to write arbitrary authoritative state: only the specified operation crosses the boundary.

| Entry route | Authoritative operation it may trigger | SAF-4 timer status |
| --- | --- | --- |
| Gravity callback | the specified gravity step (PLY-2) | Open, owner decides |
| Lock-delay callback | the specified lock (PLY-6) | Open, owner decides |
| Key-repeat and soft-drop repeat callbacks | the specified move or soft drop (INP-2) | Open, owner decides |
| Other scheduled callbacks | an operation only if one is specified for it | Open, owner decides |
| Animation-frame or drawing-loop callbacks | none (drawing is presentation, DSP-3) | Open, owner decides |
| Input throttle or debounce callbacks | the specified operation they release, if any | Open, owner decides |
| Pointer or gamepad polling | the specified operation an input raises, if any (SAF-5 covers polling errors) | Open, owner decides |
| Wake-lock re-request callbacks | none (DSP-7 concerns the screen only) | Open, owner decides |
| Presentation callbacks (text, layout, canvas size) | none | Open, owner decides |
| Other classes the owner names | owner decides | Open, owner decides |

### A8. Dependencies and open questions for later decisions

- R1 needs the categories and boundary first, then decides exact valid-state predicates for each authoritative item, including the control state in A3.
- R2/R4 decides persistence-specific ordering, rollback, discoverability, STA-3 behavior and the meaning of "last good save".
- A later Phase 1 decision defines what "fault reported" means.
- Trust decisions, oracle and specification choices, security-property mappings, proof-obligation mappings and the O8 input pack remain for later steps.
- The SAF-4 timer interpretation remains an owner decision.

### A9. Review and decision record

This proposal is for advisory review and then for the owner's decisions. When the owner has decided, the owner's choices are recorded as decision text (Part B, edited to the adopted choices) and a decision row in `AUDIT.md`, in a separate change. This document records no approval and adds no `AUDIT.md` row.

## Part B. Clean candidate decision text (DRAFT, NOT APPROVED)

Nothing in Part B is approved. Unbracketed placements in B2 are the drafter's proposed defaults and remain subject to the owner's selections in Part A; unresolved placements are bracketed. It shows what the decision text could later contain once the owner has chosen. It holds only rules: no rejected alternatives, no implementation observations, no code locations, no test names, no history. Bracketed text is for the owner's choice.

**B1. State categories.** Game state is partitioned into five categories: authoritative game state; derived state; runtime resources; persisted representation; presentation state.

**B2. Placement.** Authoritative game state: the locked blocks, the current falling piece, the held piece with its once-per-piece flag, the upcoming queue, the remaining bag contents, the score, the game mode, the lock-delay reset count, [owner's placement, authoritative state or runtime resource, under the control-state criterion: the logical New Game confirmation pending state, the logical selected confirmation choice, the held move directions with their order, the key-repeat sequence position, and the touch drag state (the piece the drag controls and the gesture origin and position)]. Derived state: the level, whether the piece is resting, the landing position of the piece, the gravity interval, each determined by other modeled state according to its rule. Runtime resources: the gravity, lock-delay and key-repeat timers and other scheduled-callback handles, and the screen wake lock. Persisted representation: the saved game, the stored high score, and the cached app files and versions. [Owner's placement, runtime resource or presentation state: the locked-block change counter.] Presentation state: what is drawn, including the visual rendering of the confirmation dialog. The random source is an input to bag-refill and shuffle transitions and is not game state.

**B3. Routes.** Authoritative game state is committed only by authoritative game transitions at their commit point. Those transitions include the control operations the requirements imply (direction or control press and release, repeat-control progression, touch or drag begin, update, and end or cancel) for whichever control values are placed in authoritative state. Authorized application persistence effects belonging to a transition are part of that transition. Persisted representation and runtime resources may also be changed by external or environmental routes (untrusted or edited storage, other tabs, storage events, platform revocation of the wake lock, service-worker and cache activity); such a change is not an authoritative transition, and external data becomes authoritative state only by being accepted through a transition. Drawing and polling routes do not commit authoritative game state. Derived state has no independent authority; its value follows from other modeled state by the applicable rule, and storing or caching it does not make it authoritative. Presentation state has no authority to commit authoritative game state, and is updated only as the applicable presentation requirements allow.

**B4. Runtime-resource lifecycle.** The lifecycle of each runtime resource class is the one its applicable requirement states: the game's timers are not running in the safe terminal state; key and stick repeat stop when the game stops playing or the window loses focus; the screen wake lock follows its requirement; drawing and polling loops continue after the errors their requirement covers. No additional lifecycle rule is adopted for other scheduled callbacks. The SAF-3 skeleton (no timers running) is not expanded here.

**B5. Authoritative transition boundary.** A transition is a specified legal operation that attempts to move authoritative state from one certified state to another certified state, or to the certified safe terminal/fault state. The authoritative transition boundary is the conceptual commit point at which a legal operation commits the changes this decision permits it to make to authoritative state, together with the authorized persistence effects that belong to that transition. The boundary is defined independently of any implementation. A function does not become authoritative because it validates. No privileged exception is adopted.

**B6. Validity policy.** [Owner's choice: authoritative state must satisfy the valid-state predicates when a transition commits; or every intermediate authoritative state must also satisfy them.]

**B7. Thrown transitions.** For a transition that throws after authoritative mutation has begun and before successful completion: [Owner's choice: the pre-transition values of the authoritative contents affected by the failed transition are restored, except for fields and effects that must change to enter the safe terminal/fault state, and the safe-terminal transition is then applied; or the authoritative contents reached at the fault are retained, except for those same fields and effects, and the safe-terminal transition is then applied.] This rule applies whichever validity policy is adopted. Transaction atomicity is not assumed.

**B8. Safe terminal/fault state.** This decision relies on the existing safe terminal/fault skeleton (game over, no timers running, the fault reported, the last good save kept) and adds no condition to it. The meaning of "reported" and of "last good save" is decided separately.

**B9. SAF-4.** SAF-4 is "after every action and every timer". This decision adopts no interpretation of "timer".
