# Current falling piece: safety-check extent

Status: owner choice recorded for documentation review. Operative only after exact-head review, required checks, authorized documentation merge and publication verification. This decision changes no game code and classifies no finding by itself.

## Decision

**Q2. Current-piece runtime checking.** Each required safety check must verify that the current falling piece is a valid four-block piece, rather than rely only on the constructor and test whether the supplied blocks overlap the board. An empty or malformed piece must not pass unnoticed at that boundary. The existing adopted current-piece semantics remain the meaning of validity; this choice selects the runtime-check extent, not a new piece geometry or representation.

The owner adopted this recommendation after clarification explicitly contrasted verifying the falling piece with trusting its constructor. The initial ambiguous reply was clarified before this decision was recorded.

## Scope and unchanged decisions

This resolves the current falling-piece detector-extent question. B6's current-piece validity and the already adopted SAF-4 check points remain the relevant context. This decision does not require any particular checker implementation or silently extend every runtime predicate to a complete R1 checker.

B7's separate upcoming-queue element-versus-count checking question remains unresolved. Q1 is not settled by this current-piece choice. This decision adopts no new save parser, factory, timer, held-piece or historical-state checking rule.

An injected empty-piece boundary result and a naturally arising production gameplay fault remain different claims. Historical evidence, source reachability, raw provenance, method, exact comparison, limitations and finding/property dispositions still need independent review. This decision alone supplies no new execution or proof of an ordinary writer creating malformed pieces.

## Action boundary

The owner's choice settles the requirement only. It does not approve a game-code correction, permanent test, reference-model change, CI change, public-site change, finding status or phase advancement. Corrections and related tests still need their own review and approval. Existing documentation publication and postmerge gates remain separate.
