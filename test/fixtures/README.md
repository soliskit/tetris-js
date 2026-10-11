# Saved game fixtures

A fixture is a saved game file the tests load.
These two fixtures preserve saved positions written by released game code.
The session tests load each file and check that the game can continue it.
They stand for saves already on players' devices.

- `saved-game-current.json` stores the remaining bag pieces without a saved level.
- `saved-game-with-level.json` stores the remaining bag pieces and a level.

Both formats are still covered by the current session tests.
The selected current-only save layout is a future target, not an implemented compatibility change.
Keep that distinction clear until the behavior, requirements, and tests change together.

Never edit or regenerate these fixtures.
Dropping a format removes its fixture in the same commit, together with the compatibility requirement and its tests.

Each fixture was recorded after a seeded game cleared a line, held a piece, moved and rotated the falling piece, and paused.
The line breaks make the data easier to inspect without changing its saved position.
The game no longer reads the storage names used by earlier releases.
The capture record attributes the current fixture to releases from PR 27 onward.
It attributes the fixture with a saved level to releases from PR 26 through PR 27.
These are documented capture accounts, not independently replayed original captures.
The current loading tests check selected restored fields; they do not establish that historical capture.
