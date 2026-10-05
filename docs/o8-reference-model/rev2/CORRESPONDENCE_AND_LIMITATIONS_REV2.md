# Revision 2 note (supersedes only ambiguity G1 of revision 1; revision 1 files are unchanged)

## G1 re-evaluated: O piece box (B2, image, table only)
Facts from the supplied files:
- B2 states the box for each kind explicitly: 4x4 I, 2x2 O, 3x3 others, with each state a set of four cells inside that box.
- The image file's SHA-256 (5a5c49e3...1236) and the table's SHA-256 (c7330639...c524c) match the checksums B2 names, so these are the frozen reference bytes.
- Image O tile: 64x48 px black canvas, 16 px cells. The yellow square covers canvas columns 1-2, rows 0-1. The white pivot marker is centered on that square (its x extent is centered on the square's horizontal midpoint). Other kinds' tiles are exactly 4x4 (I) or 3x3 (others) canvases that equal the B2 box; only the O tile canvas differs in shape from the B2 box.

Conclusion: B2's explicit 2x2 definition controls what a box is for O. The O image's canvas is rendering padding, not box geometry: the four cells of the O in the image fill a 2x2 box completely, and a 2x2 box has exactly one possible cell set, (0,0),(0,1),(1,0),(1,1), which equals the table. The image therefore does not disagree with the table about any O state, and the B2 inconsistency clause is not triggered for O. The model's O geometry (table values) is confirmed. The image gives no independent information about where the 2x2 box sits on the board; that comes only from B2's position rule (top-left of the box).

Remaining contradiction: none for geometry. The earlier "G1" finding is withdrawn. What remains is unchanged from revision 1: the I tile still matches only after ignoring the white pivot marker (marker is not a cell), which is also a reading of the image, not an explicit statement in B2. If the owner prefers, B2 could state that the pivot marker and canvas padding are not geometry.

Everything else in revision 1 (K1, A2, A5, A9, S7, A4 and the model readings) stands. The model code is logically unchanged; rev2 files differ only by a header comment and this note.
