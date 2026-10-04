# Saved game fixtures

Each file is a saved game exactly as a released version of the game stored it, one for every save format the game supports (STA-6 in [REQUIREMENTS.md](../../REQUIREMENTS.md)). `test/session.test.js` puts each one where the game keeps its save and continues it, so a change that stops a supported format loading fails the tests.

These are compatibility guarantees: they stand for saves already on players' devices. Never edit or regenerate them. Dropping a format is an Intentional change (see "Rules for changes" in REQUIREMENTS.md) that updates STA-6 and removes its fixture in the same commit. The files are laid out one field and one board row per line to be readable; JSON ignores that whitespace, and the data is exactly what was stored.

| File | Format | Stored by |
| --- | --- | --- |
| `saved-game-current.json` | The pieces left in the bag, no level | Releases from PR #27 (October 3, 2026) on |
| `saved-game-with-level.json` | The pieces left in the bag, and the level | Releases from PR #26 to PR #27 (October 2 to 3, 2026) |

Earlier releases stored their saves under other names, which the game no longer reads.

Each was made by playing a seeded game with that release's own code until a line was cleared, then holding a piece, turning and moving the current one, and pausing, which is when the game saves.
