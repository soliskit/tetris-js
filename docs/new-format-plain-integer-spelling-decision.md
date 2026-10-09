# Plain whole-number spelling for numbers in the new save format

## Decision and scope

For the scoped new save layout, numeric fields use plain whole-number spelling only. Fraction and exponent spellings such as 100.0 and 1e2 are rejected even when their mathematical value is a whole number. This selects numeric spelling only: the exact numeric domains, the stored-score ceiling, rotation and geometry counts, and count and history relations are not selected by it, and spelling acceptance alone does not make content valid. The exact definition of plain whole-number spelling remains to bind against the eventual syntax schema. Signed zero, sign handling, receiver size limits, and string and syntax rules are not selected here.

## Measured evidence

The game's save code turns numbers into text with the platform's native number-to-string conversion, and five retained historical boundary writers do the same. Inspecting that conversion for 100,005 integers from -4 through 100,000 produced no fraction or exponent spellings; the largest allowed score and negative zero were checked separately as boundary observations. This shows the current serializer writes plain whole-number spellings across the checked range. It does not certify the current serializer as the future candidate writer, and how often hand-edited or foreign saves carry other spellings is unmeasured.

Complexity was explored with throwaway sketches, never added to the game and discarded after an independent count review. The three option classifiers measured 21, 6 and 6 nonblank lines, with 6, 2 and 2 if-sites. A shared token-reading stage measured 60 function lines, 61 including the export line, with 20 if-sites, 2 while-sites and 3 for-sites. These are scratch counts, not measured production cost or effort. Rejecting repeated required names tracks name occurrences and does not by itself require the numeric token stage; sharing one stage is an unselected design possibility.

## Provenance

The owner approved plain whole-number spelling only, after the measured results and corrections were reported. The tested values were -4 through 100,000, with the high score and zero checked separately. The number-to-text conversion was inspected; the game writer was not run 100,005 times. The duplicate-name rule does not necessarily need the numeric token stage. The line-count difference compares sketches, not a real patch. This records the decision and its scope, not approval of final document bytes or a code change. Publication follows the separate docs-only review, checks and merge grant.

## Historical note

Earlier candidate comparisons of numeric handling remain historical research, superseded only for numeric spelling acceptance.
