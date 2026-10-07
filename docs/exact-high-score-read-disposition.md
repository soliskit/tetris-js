# Exact stored high score: scoped read disposition

Status: Confirmed defect by independently reviewed conditional source argument for the exact stored number below. Operative only after documentation review, exact-head checks, authorized merge and postmerge publication verification. Not newly Reproduced, all-format certification, a native storage claim or Phase4 closure.

## Independent criterion and admission

D21 S8 defines a good stored high score as a whole number of zero or more, otherwise zero. R1 B3 imposes no numeric format limit; B11 and B16 impose no divisibility condition or upper limit on this domain. The original owner exchanges defining those numeric domains were independently inspected for this criterion comparison. Production acceptance is not the definition of goodness.

Choose the plain canonical decimal text9007199254740992. It uniquely denotes2^53, a nonnegative whole number. Binary64 represents this exact power of two without rounding, although it is outside the safe-integer range ending at2^53-1. This is not the lossy2^53+1 case, ambiguous exponent/hex/whitespace text, a missing-field default or a claim about all unbounded integers.

This value is admitted as valid external stored-high content under S8. The game need not previously have earned or written that score to make the specified stored-content rule apply. No narrower adopted format or upper limit was identified in this exact comparison; the reader's safe-integer gate cannot itself supply one. Saved-game count/lowest/history meaning and independently good prior game payload are separate and unnecessary for this stored-high numeric facet.

## Exact source response

Source main0b52b8bde371f11026cfa8f4bf18aeeeb9fb2ff7 has public tree1e09ad61c19e0b235a231ad8810dae176be4ea77. public/game/gameManager.js SHA25631bb2160852bd24485ba258c458b74acdec110c1e11b0d94f4f852f3cf27b9ea contains the reader:

1. readItem receives the exact text from a successful storage read, with no read exception or side effect.
2. Number converts that text to exact finite integral2^53.
3. Number.isSafeInteger rejects2^53, so the highScore getter returns0 instead of the good stored value.

Ordinary unmodified numeric built-ins, successful storage reading, exact text and no intervening actor/getter/proxy mutation are explicit premises. This is a conditional source argument, not execution of the getter now. It establishes incorrect reading of this one valid stored high score under S8, not whole storage validation or arithmetic correctness.

## Consequential writes remain separate

clearFullRows adds the applicable line score and writes Math.max(highScore,current score). If a separately admitted line-clear route reaches score q below2^53 under successful reading/writing and noninterference, the rejected high0 makes that write lower the stored high to q. That conditional consequence conflicts with SCO3's only-higher replacement rule.

The ordinary legal-clear route/prestate has not been bound for this disposition. Therefore it does not promote an ordinary-gameplay lower-overwrite counterexample. The already admitted count15 route clears no row and cannot be borrowed for that missing premise. Equal-value rewrites, read-failure downgrade, arbitrary integer arithmetic and other text formats likewise remain separate.

## Historical corroboration and limits

The earlier42-case high-score driver included14 stored forms across nominal/read-failure/write-failure branches. Its exact2^53 branch corroborates reader0 and a later write100 on an injected line-clear fixture. The fixture used patched board/piece/mode, controlled scheduler and undelivered callbacks, not a fully admitted ordinary legal history. Original raw archive and process restoration limits remain; this is qualified historical corroboration, not a fresh42-case run or native persistence witness.

The plain300 read-failure branch attempted and stored100, while the plain300 write-failure branch attempted300 and retained300. Those different cuts are not merged into the successful exact2^53 read claim. A corrected earlier attribution of the write-failure attempted value remains corrected. Successful high-content semantics and saved-game B16/S6 history are distinct antecedents.

## Disposition and remaining work

Confirmed defect by conditional source argument: exact valid stored high9007199254740992 is read as0. Ordinary writer creation is not an admission gate for this external stored-content rule. Broader integer/format domains, legal-clear lower overwrite, native/cross-tab persistence, full SCO3/S8 and Phase4 remain open.

No correction, permanent test, reference-model feedback, requirement, CI or public-site change is authorized. No new upper limit or text grammar is adopted. Pending Q2 detector extent and separate Q1 interpretation are unchanged. A later correction needs its own approval and regression review without silently choosing a numeric-format boundary.
