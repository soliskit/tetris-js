import { parseSavedRecord, serializeSavedRecord } from '../public/game/session.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GameManager, createMemoryStorage } from '../public/game/gameManager.js';
import { GameState, PlayerAction } from '../public/game/gameState.js';
import { position } from '../public/game/position.js';
import { TetrominoFactory, PieceColors } from '../public/game/tetrominoFactory.js';
import {
  createFakeScheduler,
  dropVerticalIIntoColumn9,
  fillRows,
  filled,
  filledCells,
  fixedFactory,
  newGame,
  seededRandom,
  sequenceFactory,
  repeatUntil
} from './helpers.js';

const { cyan, yellow, purple, green, red, orange } = PieceColors;

function snapshot(game) {
  return JSON.stringify({
    state: game.state,
    score: game.score,
    current: game.currentTetromino,
    held: game.heldTetromino,
    next: game.nextTetrominos,
    board: game.gameBoard
  });
}

function landOnSurface(game) {
  repeatUntil(() => game.isOnSurface, () => game.softDrop(), 'the piece landing');
}

// Storage whose writes throw for the listed keys (all keys when omitted).
function failingStorage(failingKeys) {
  const storage = createMemoryStorage();
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (!failingKeys || failingKeys.includes(key)) throw new Error('QuotaExceededError');
    setItem(key, value);
  };
  return storage;
}

// Starting state

test('a new game manager waits at game over with an empty board and three upcoming pieces [STA-1] [PCE-1] [PLY-8]', () => {
  const scheduler = createFakeScheduler();
  const game = new GameManager({ scheduler, storage: createMemoryStorage() });
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.rows, 20);
  assert.equal(game.columns, 10);
  assert.equal(filledCells(game), 0);
  assert.equal(game.nextTetrominos.length, 3);
  assert.equal(game.heldTetromino, null);
  assert.equal(game.canHoldTetromino, true);
  assert.equal(game.score, 0);
  assert.equal(game.level, 1);
  assert.equal(scheduler.pending, 0, 'no gravity before a game starts');
});

test('without injected storage it falls back to memory when localStorage is missing [SAF-2]', () => {
  assert.equal(typeof globalThis.localStorage, 'undefined');
  const game = new GameManager({ scheduler: createFakeScheduler() });
  game.highScore = 300;
  assert.equal(game.highScore, 300);
});

// State guards

// Each action on its own, so opposite moves cannot cancel out.
const PLAY_ACTIONS = [PlayerAction.moveLeft, PlayerAction.moveRight, PlayerAction.rotate, PlayerAction.hold, PlayerAction.drop, 'softDrop'];
const perform = (game, action) => (action === 'softDrop' ? game.softDrop() : game.handleAction(action));

test('moves, rotations, holds and drops do nothing at game over [STA-1]', () => {
  for (const action of PLAY_ACTIONS) {
    const game = new GameManager({ scheduler: createFakeScheduler(), storage: createMemoryStorage(), factory: fixedFactory(purple) });
    game.currentTetromino.position = position(5, 3); // room to move every way
    const before = snapshot(game);
    perform(game, action);
    assert.equal(snapshot(game), before, action);
  }
});

test('moves, rotations, holds, drops and gravity do nothing while paused [STA-2]', () => {
  for (const action of PLAY_ACTIONS) {
    const { game, scheduler } = newGame({ factory: fixedFactory(purple) });
    game.softDrop();
    game.handleAction(PlayerAction.pause);
    const before = snapshot(game);
    perform(game, action);
    scheduler.advance(10000);
    assert.equal(snapshot(game), before, action);
  }
});

test('new game is ignored while playing [STA-1]', () => {
  const { game } = newGame();
  game.score = 500;
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.score, 500);
});

test('new game after game over resets the board, score, level and held piece [STA-1]', () => {
  const { game } = newGame();
  game.handleAction(PlayerAction.hold);
  game.gameBoard[19][0] = filled();
  game.score = 2500;
  game.state = GameState.gameOver;
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.playing);
  assert.equal(filledCells(game), 0);
  assert.equal(game.score, 0);
  assert.equal(game.level, 1);
  assert.equal(game.heldTetromino, null);
  assert.equal(game.canHoldTetromino, true);
  assert.equal(game.isSessionSaved, false);
});

test('new game while paused asks first, and once confirmed gives up that game and starts afresh, forgetting its save [STA-1]', () => {
  const { game } = newGame({ factory: fixedFactory(cyan) });
  game.handleAction(PlayerAction.hold);
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  game.togglePause();
  assert.equal(game.isSessionSaved, true);
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.paused, 'it only asks');
  assert.equal(game.isConfirmingNewGame, true);
  assert.equal(game.score, 100);
  assert.equal(game.isSessionSaved, true);
  game.handleAction(PlayerAction.newGame); // confirms
  assert.equal(game.state, GameState.playing);
  assert.equal(game.isConfirmingNewGame, false);
  assert.equal(filledCells(game), 0);
  assert.equal(game.score, 0);
  assert.equal(game.heldTetromino, null);
  assert.equal(game.isSessionSaved, false);
  assert.notEqual(game.gameLoopTask, null, 'gravity runs');
});

test('cancelling the New Game question keeps the paused game, and so does anything else before it is answered [STA-1]', () => {
  let changes = 0;
  const { game } = newGame({ factory: fixedFactory(cyan), onChange: () => { changes += 1; } });
  game.handleAction(PlayerAction.hold);
  game.togglePause();
  game.handleAction(PlayerAction.newGame);
  const before = changes;
  game.cancelNewGame();
  assert.equal(game.isConfirmingNewGame, false);
  assert.equal(changes, before + 1, 'the page hears of it, to close the question');
  assert.equal(game.state, GameState.paused);
  assert.notEqual(game.heldTetromino, null, 'the game is kept');
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.paused, 'the next New Game asks again');
  assert.equal(game.isConfirmingNewGame, true);

  for (const [what, between] of [
    ['an ignored move', game => game.handleAction(PlayerAction.moveLeft)],
    ['a soft drop', game => game.softDrop()],
    ['a continue', game => game.handleAction(PlayerAction.continueGame)]
  ]) {
    const { game } = newGame({ factory: fixedFactory(cyan) });
    game.togglePause();
    game.handleAction(PlayerAction.newGame);
    between(game);
    assert.equal(game.isConfirmingNewGame, false, what);
    game.handleAction(PlayerAction.newGame);
    assert.equal(game.state, GameState.paused, `${what}: the next New Game asks again`);
    assert.equal(game.isConfirmingNewGame, true, what);
  }
  const { game: resumed } = newGame({ factory: fixedFactory(cyan) });
  resumed.togglePause();
  resumed.handleAction(PlayerAction.newGame);
  resumed.togglePause();
  assert.equal(resumed.state, GameState.playing, 'resuming plays on');
  assert.equal(resumed.isConfirmingNewGame, false);
});

test('new game at game over starts at once, without asking [STA-1]', () => {
  const game = new GameManager({ scheduler: createFakeScheduler(), factory: fixedFactory(cyan) });
  assert.equal(game.isConfirmingNewGame, false, 'nothing is asked as the game opens');
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.playing);
  assert.equal(game.isConfirmingNewGame, false);
});

test('the board version counts every change to the locked blocks, and nothing else [DSP-3]', () => {
  const { game, storage } = newGame({ factory: fixedFactory(cyan) });
  const version = () => game.boardVersion;
  const start = version();
  game.handleAction(PlayerAction.moveLeft);
  game.handleAction(PlayerAction.rotate);
  game.softDrop();
  game.handleAction(PlayerAction.hold);
  assert.equal(version(), start, 'moving, turning, dropping and holding change no locked blocks');
  game.handleAction(PlayerAction.drop);
  assert.equal(version(), start + 1, 'a lock');
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(version(), start + 3, 'a lock, then a line clear');
  game.togglePause();
  game.handleAction(PlayerAction.newGame);
  game.handleAction(PlayerAction.newGame);
  assert.equal(version(), start + 4, 'a new game');
  game.togglePause();
  const restored = new GameManager({ scheduler: createFakeScheduler(), storage });
  const before = restored.boardVersion;
  restored.handleAction(PlayerAction.continueGame);
  assert.equal(restored.boardVersion, before + 1, 'continuing a saved game');
});

// Movement

test('moving left and right stops at the walls [PLY-1] [PCE-6]', () => {
  const { game } = newGame({ factory: fixedFactory(yellow) });
  for (let i = 0; i < 10; i++) game.handleAction(PlayerAction.moveLeft);
  assert.equal(game.currentTetromino.position.column, 0);
  for (let i = 0; i < 10; i++) game.handleAction(PlayerAction.moveRight);
  assert.equal(game.currentTetromino.position.column, 8);
});

test('moving is blocked by locked blocks [PLY-1] [PCE-6]', () => {
  const { game } = newGame({ factory: fixedFactory(yellow) });
  game.gameBoard[1][6] = filled();
  game.handleAction(PlayerAction.moveRight);
  assert.equal(game.currentTetromino.position.column, 4);
  game.handleAction(PlayerAction.moveLeft);
  assert.equal(game.currentTetromino.position.column, 3);
});

test('soft drop moves down one row and restarts the gravity timer [PLY-3]', () => {
  const { game, scheduler } = newGame();
  scheduler.advance(600);
  game.softDrop();
  assert.equal(game.currentTetromino.position.row, 1);
  scheduler.advance(600);
  assert.equal(game.currentTetromino.position.row, 1, 'gravity waits a full interval after a soft drop');
  scheduler.advance(100);
  assert.equal(game.currentTetromino.position.row, 2);
});

test('gravity uses the current level speed [PLY-2]', () => {
  const { game, scheduler } = newGame();
  game.score = 10000; // level 11: 0.5s per row
  game.softDrop(); // restarts gravity with the new speed
  scheduler.advance(500);
  assert.equal(game.currentTetromino.position.row, 2);
});

test('the ghost piece shows where the piece would land without moving it [PLY-5]', () => {
  const { game } = newGame({ factory: fixedFactory(yellow) });
  assert.equal(game.ghostTetromino.position.row, 18);
  game.gameBoard[15][4] = filled();
  assert.deepEqual(game.ghostTetromino.position, position(13, 4));
  assert.equal(game.currentTetromino.position.row, 0);
  assert.notEqual(game.ghostTetromino, game.currentTetromino);
});

test('hard drop lands on the stack and brings in the next piece [PLY-4] [PLY-8]', () => {
  const { game } = newGame({ factory: sequenceFactory([yellow, purple]) });
  game.gameBoard[15][4] = filled();
  const next = game.nextTetrominos[0];
  game.handleAction(PlayerAction.drop);
  for (const [row, column] of [[13, 4], [13, 5], [14, 4], [14, 5]]) {
    assert.ok(game.gameBoard[row][column].isFilled, `${row},${column}`);
    assert.equal(game.gameBoard[row][column].color, yellow);
  }
  assert.equal(game.currentTetromino.color, next.color);
  assert.deepEqual(game.currentTetromino.position, position(0, 3));
  assert.equal(game.nextTetrominos.length, 3);
  assert.equal(game.score, 0);
});

// Line clears and scoring

for (const [lines, points] of [[1, 100], [2, 300], [3, 500], [4, 800]]) {
  test(`clearing ${lines} line${lines > 1 ? 's' : ''} at once scores ${points} [SCO-1]`, () => {
    const { game } = newGame({ factory: fixedFactory(cyan) });
    fillRows(game, Array.from({ length: lines }, (_, i) => 19 - i), [9]);
    dropVerticalIIntoColumn9(game);
    assert.equal(game.score, points);
    assert.equal(filledCells(game), 4 - lines, 'only the unused part of the I piece is left');
  });
}

test('rows above a cleared line move down unchanged [SCO-1]', () => {
  const { game } = newGame({ factory: fixedFactory(cyan) });
  game.gameBoard[10][0] = filled(red);
  game.gameBoard[12][3] = filled(green);
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.gameBoard[11][0].color, red);
  assert.equal(game.gameBoard[13][3].color, green);
  assert.ok(!game.gameBoard[10][0].isFilled);
  assert.ok(!game.gameBoard[12][3].isFilled);
  assert.ok(game.gameBoard[0].every(cell => !cell.isFilled), 'a new empty row appears at the top');
  assert.equal(game.gameBoard.length, 20);
});

test('lines that are not next to each other clear together [SCO-1]', () => {
  const { game } = newGame({ factory: fixedFactory(cyan) });
  fillRows(game, [17, 19], [9]);
  fillRows(game, [18], [0, 9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.score, 300);
  const bottom = game.gameBoard[19];
  assert.ok(!bottom[0].isFilled, 'the row with a gap dropped to the bottom');
  assert.ok(bottom.slice(1).every(cell => cell.isFilled));
  assert.ok(game.gameBoard[18][9].isFilled, 'top of the I piece dropped two rows');
  assert.equal(filledCells(game), 10);
});

test('the level goes up every 1000 points and speeds up gravity [SCO-2] [PLY-2]', () => {
  const { game } = newGame({ factory: fixedFactory(cyan) });
  game.score = 900;
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.score, 1000);
  assert.equal(game.level, 2);
  assert.ok(Math.abs(game.standardDropInterval - 0.68) < 1e-9);
});

test('the high score is saved when beaten and kept when not [SCO-3]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ storage, factory: fixedFactory(cyan) });
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(storage.getItem('tetris.highScore'), '100');
  assert.equal(new GameManager({ scheduler: createFakeScheduler(), storage }).highScore, 100);

  const best = createMemoryStorage();
  best.setItem('tetris.highScore', '5000');
  const { game: second } = newGame({ storage: best, factory: fixedFactory(cyan) });
  fillRows(second, [19], [9]);
  dropVerticalIIntoColumn9(second);
  assert.equal(second.score, 100);
  assert.equal(second.highScore, 5000);
});

test('a withdrawal write that storage refuses counts for the rest of the session [STA-4] [SAF-2]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ storage, factory: fixedFactory(yellow) });
  game.togglePause(); // pausing saves the game
  assert.equal(game.isSessionSaved, true);
  game.togglePause();
  const setItem = storage.setItem;
  storage.setItem = () => { throw new Error('storage refuses writes'); };
  game.togglePause(); // the save fails, and so does the withdrawal write
  assert.equal(parseSavedRecord(storage.getItem('tetris.savedGameSession')).available, true, 'the old record remains available');
  assert.equal(game.isSessionSaved, false, 'the failed withdrawal still holds');
  assert.equal(game.isSessionSaved, false, 'and holds on every later check');
  const reloaded = new GameManager({ scheduler: createFakeScheduler(), storage, factory: fixedFactory(yellow) });
  assert.equal(reloaded.isSessionSaved, true, 'after a reload the stored flag governs again');
  storage.setItem = setItem; // storage recovers
  game.togglePause();
  game.togglePause(); // pausing saves again
  assert.equal(game.isSessionSaved, true, 'a save that lands governs again');
});

test('a refused availability write withdraws locally without replacing the prior bytes [STA-4] [SAF-2]', () => {
  const storage = createMemoryStorage();
  const reports = [];
  const { game, scheduler } = newGame({ storage, factory: fixedFactory(yellow), onFault: fault => reports.push(fault) });
  game.togglePause();
  assert.equal(game.isSessionSaved, true);
  const before = storage.getItem('tetris.savedGameSession');
  game.togglePause();
  storage.setItem('tetris.isSessionSaved', 'true');
  const setItem = storage.setItem;
  const writes = [];
  storage.setItem = (key, value) => {
    writes.push([key, value]);
    if (key === 'tetris.savedGameSession') throw new Error('storage refuses record writes');
    setItem(key, value);
  };
  game.togglePause();
  assert.equal(parseSavedRecord(storage.getItem('tetris.savedGameSession')).available, true);
  assert.equal(game.isSessionSaved, false);
  assert.equal(storage.getItem('tetris.savedGameSession'), before);
  assert.equal(writes.length, 2);
  assert.ok(writes.every(([key]) => key === 'tetris.savedGameSession'));
  assert.equal(game.state, GameState.paused);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(reports, []);
  storage.setItem = setItem;
});

test('the game stores everything under names of its own [APP-6]', () => {
  const storage = createMemoryStorage();
  const written = new Set();
  const setItem = storage.setItem;
  storage.setItem = (key, value) => { written.add(key); setItem(key, value); };
  const { game } = newGame({ storage, factory: fixedFactory(cyan) });
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  game.togglePause();
  assert.deepEqual([...written].sort(), ['tetris.highScore', 'tetris.savedGameSession']);
});

test('the engine reports every action and timer, so the page draws only then [DSP-3]', () => {
  let changes = 0;
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow), onChange: () => { changes += 1; } });
  assert.equal(changes, 1, 'new game');
  game.handleAction(PlayerAction.moveLeft);
  game.softDrop();
  game.togglePause();
  game.togglePause();
  assert.equal(changes, 5);
  scheduler.advance(700);
  assert.equal(changes, 6, 'gravity');
});

test('checking for a saved game reads storage once, not on every frame [DSP-3]', () => {
  const storage = createMemoryStorage();
  const getItem = storage.getItem;
  let reads = 0;
  storage.getItem = key => {
    if (key === 'tetris.savedGameSession') reads += 1;
    return getItem(key);
  };
  const game = new GameManager({ scheduler: createFakeScheduler(), storage, factory: fixedFactory(yellow) });
  for (let frame = 0; frame < 60; frame++) assert.equal(game.isSessionSaved, false);
  assert.equal(reads, 1);
  game.handleAction(PlayerAction.newGame);
  game.togglePause();
  for (let frame = 0; frame < 60; frame++) assert.equal(game.isSessionSaved, true);
  assert.equal(reads, 3, 'new-game absence check then read once after saving');
});

test('a game saved in another tab can be continued once storage reports the change [STA-4]', () => {
  const storage = createMemoryStorage();
  const game = new GameManager({ scheduler: createFakeScheduler(), storage });
  assert.equal(game.isSessionSaved, false);
  const otherTab = new GameManager({ scheduler: createFakeScheduler(), storage, factory: fixedFactory(yellow) });
  otherTab.handleAction(PlayerAction.newGame);
  otherTab.togglePause();
  game.storageChanged();
  assert.equal(game.isSessionSaved, true);
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.paused);
  assert.equal(game.currentTetromino.color, yellow);
});

test('the session is saved after a line clear but not after a plain lock [STA-4]', () => {
  const { game, storage } = newGame({ factory: fixedFactory(cyan) });
  game.handleAction(PlayerAction.drop);
  assert.equal(game.isSessionSaved, false);
  assert.equal(storage.getItem('tetris.savedGameSession'), null);
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.score, 100);
  assert.equal(game.isSessionSaved, true);
  assert.ok(JSON.parse(parseSavedRecord(storage.getItem('tetris.savedGameSession')).position).gameBoard);
});

// Lock delay

test('a piece brought to rest by gravity locks 0.5s after touching down [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  repeatUntil(() => game.isOnSurface, () => scheduler.advance(700), 'the piece landing by gravity');
  assert.notEqual(game.lockDelayTask, null, 'the lock delay starts on touchdown');
  scheduler.advance(499);
  assert.equal(filledCells(game), 0);
  scheduler.advance(1);
  assert.equal(filledCells(game), 4);
});

test('moving off a ledge cancels the lock delay and the piece keeps falling [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  game.gameBoard[10][5] = filled();
  landOnSurface(game);
  game.softDrop(); // lands on the ledge
  assert.notEqual(game.lockDelayTask, null);
  game.handleAction(PlayerAction.moveLeft);
  assert.equal(game.lockDelayTask, null);
  assert.equal(game.isOnSurface, false);
  scheduler.advance(700);
  assert.equal(game.currentTetromino.position.row, 9);
});

test('reaching a new lowest row resets the lock delay move count [PLY-6]', () => {
  const { game } = newGame({ factory: fixedFactory(yellow) });
  game.gameBoard[10][5] = filled();
  landOnSurface(game);
  game.softDrop();
  game.handleAction(PlayerAction.moveLeft); // leaving the ledge is not a reset
  assert.equal(game.lockDelayResetCount, 0);
  game.softDrop();
  assert.equal(game.lockDelayResetCount, 0);
});

test('a continued game keeps the lock-delay count and lowest row [PLY-6] [STA-4]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ factory: fixedFactory(yellow), storage });
  landOnSurface(game);
  game.handleAction(PlayerAction.moveLeft);
  game.handleAction(PlayerAction.moveRight);
  assert.equal(game.lockDelayResetCount, 2, 'two moves while resting');
  const restRow = Math.max(...game.currentTetromino.cells.map(cell => cell.row));
  game.togglePause();
  assert.equal(game.lockDelayResetCount, 3, 'the pause itself counts as one reset');
  const continued = new GameManager({ scheduler: createFakeScheduler(), storage });
  assert.equal(continued.isSessionSaved, true);
  continued.handleAction(PlayerAction.continueGame);
  assert.equal(continued.state, GameState.paused);
  assert.equal(continued.lockDelayResetCount, 3);
  assert.equal(continued.lowestRowReached, restRow);
});

test('a save missing required history is refused whole [PLY-6] [STA-6]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ factory: fixedFactory(yellow), storage });
  landOnSurface(game);
  game.handleAction(PlayerAction.moveLeft);
  game.handleAction(PlayerAction.moveRight);
  assert.ok(game.lockDelayResetCount > 0, 'moves while resting burn resets');
  game.togglePause();
  // Simulate a save from before the lock-delay state was recorded.
  const saved = JSON.parse(parseSavedRecord(storage.getItem('tetris.savedGameSession')).position);
  delete saved.lockDelayResetCount;
  delete saved.lowestRowReached;
  storage.setItem('tetris.savedGameSession', serializeSavedRecord(JSON.stringify(saved), true));
  const continued = new GameManager({ scheduler: createFakeScheduler(), storage });
  continued.handleAction(PlayerAction.continueGame);
  assert.equal(continued.state, GameState.gameOver, 'missing history is refused whole');
  assert.equal(continued.isSessionSaved, false);
});

test('a continued save restores a remembered low below the piece [PLY-6] [STA-4]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ factory: fixedFactory(yellow), storage });
  game.softDrop();
  game.softDrop();
  game.togglePause();
  // A wall-kick can leave the remembered low below the anchor (F20).
  const saved = JSON.parse(parseSavedRecord(storage.getItem('tetris.savedGameSession')).position);
  saved.lowestRowReached = saved.currentTetromino.position.row + 2;
  storage.setItem('tetris.savedGameSession', serializeSavedRecord(JSON.stringify(saved), true));
  const continued = new GameManager({ scheduler: createFakeScheduler(), storage });
  continued.handleAction(PlayerAction.continueGame);
  assert.equal(continued.lowestRowReached, saved.currentTetromino.position.row + 2);
});


test('the counterclockwise action turns the piece the other way [PCE-4] [INP-1]', () => {
  const { game } = newGame({ factory: fixedFactory(purple) });
  game.handleAction(PlayerAction.rotateCounterclockwise);
  assert.equal(game.currentTetromino.rotationState, 3);
  game.handleAction(PlayerAction.rotate);
  assert.equal(game.currentTetromino.rotationState, 0);
});

test('rotating on the surface restarts the lock delay [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(purple) });
  landOnSurface(game);
  game.softDrop();
  scheduler.advance(400);
  game.handleAction(PlayerAction.rotate); // kicks up one row to fit
  assert.equal(game.currentTetromino.rotationState, 1);
  assert.equal(game.lockDelayResetCount, 1);
  scheduler.advance(400);
  assert.equal(filledCells(game), 0, 'still unlocked 0.8s after landing');
  scheduler.advance(100);
  assert.equal(filledCells(game), 4);
});

test('once the 15 resets are used up, landing locks immediately [PLY-6]', () => {
  const { game } = newGame({ factory: fixedFactory(yellow) });
  repeatUntil(() => game.currentTetromino.position.row === 17, () => game.softDrop(), 'the piece one row above the floor');
  game.lockDelayResetCount = 15;
  game.lowestRowReached = 19; // the occupied bottom row was already reached
  game.softDrop();
  assert.equal(filledCells(game), 4);
  assert.equal(game.lockDelayTask, null);
  assert.equal(game.currentTetromino.position.row, 0);
});

// Hold

test('the first hold stores the piece at its spawn state and brings in the next one [PLY-7]', () => {
  const { game } = newGame({ factory: sequenceFactory([purple, yellow, green, red, orange]) });
  game.handleAction(PlayerAction.rotate);
  game.handleAction(PlayerAction.moveLeft);
  game.softDrop();
  game.handleAction(PlayerAction.hold);
  assert.equal(game.heldTetromino.color, purple);
  assert.equal(game.heldTetromino.rotationState, 0);
  assert.deepEqual(game.heldTetromino.position, position(0, 3));
  assert.equal(game.currentTetromino.color, yellow);
  assert.deepEqual(game.nextTetrominos.map(piece => piece.color), [green, red, orange]);
});

test('hold is available again after the next piece locks, and swaps back [PLY-7]', () => {
  const { game } = newGame({ factory: sequenceFactory([purple, yellow, green, red]) });
  game.handleAction(PlayerAction.hold); // holds T, plays O
  assert.equal(game.canHoldTetromino, false);
  game.handleAction(PlayerAction.drop); // O locks, plays S
  assert.equal(game.canHoldTetromino, true);
  game.handleAction(PlayerAction.hold);
  assert.equal(game.heldTetromino.color, green);
  assert.equal(game.currentTetromino.color, purple);
  assert.deepEqual(game.currentTetromino.position, position(0, 3));
});

test('holding when the held piece has no room to spawn ends the game [PLY-7] [STA-3]', () => {
  const { game, scheduler } = newGame({ factory: sequenceFactory([purple, yellow, green]) });
  game.handleAction(PlayerAction.hold);
  game.handleAction(PlayerAction.drop);
  fillRows(game, [1], [0, 1, 2, 6, 7, 8, 9]); // blocks where the held T would appear
  game.handleAction(PlayerAction.hold);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.isSessionSaved, false);
  assert.equal(scheduler.pending, 0, 'gravity and lock delay stopped');
});

// Pause and continue

test('pause freezes gravity until resumed [STA-2]', () => {
  const { game, scheduler } = newGame();
  game.togglePause();
  assert.equal(game.state, GameState.paused);
  scheduler.advance(5000);
  assert.equal(game.currentTetromino.position.row, 0);
  game.togglePause();
  assert.equal(game.state, GameState.playing);
  scheduler.advance(700);
  assert.equal(game.currentTetromino.position.row, 1);
});

test('pausing during the lock delay cancels it and counts as a reset, and resuming starts it again [STA-2] [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  landOnSurface(game);
  game.togglePause();
  assert.equal(game.lockDelayTask, null);
  assert.equal(game.lockDelayResetCount, 1);
  scheduler.advance(5000);
  assert.equal(filledCells(game), 0);
  game.togglePause();
  assert.notEqual(game.lockDelayTask, null);
  scheduler.advance(499);
  assert.equal(filledCells(game), 0);
  scheduler.advance(1);
  assert.equal(filledCells(game), 4);
});

test('pause records 15 or 16 and resume distinguishes a delay from immediate lock [STA-2] [PLY-6]', () => {
  for (const before of [14, 15]) {
    const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
    landOnSurface(game);
    game.lockDelayResetCount = before;
    game.togglePause();
    assert.equal(game.lockDelayResetCount, before+1);
    assert.equal(game.lockDelayTask, null, 'the pause still cancels the delay');
    game.togglePause();
    if (before === 15) { assert.equal(filledCells(game),4,'paused16 locks immediately'); continue; }
    assert.equal(filledCells(game), 0);
    assert.notEqual(game.lockDelayTask, null, 'resume starts the lock delay again');
    assert.equal(game.state, GameState.playing);
    scheduler.advance(499);
    assert.equal(filledCells(game), 0);
    scheduler.advance(1);
    assert.equal(filledCells(game), 4, 'the piece locks when the delay runs out');
    assert.notEqual(game.gameLoopTask, null, 'the next piece falls');
  }
});

test('resuming into a lock that ends the game leaves no timers running [STA-2] [STA-3] [SAF-4]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow), onFault: fault => faults.push(fault) });
  game.togglePause();
  fillRows(game, [...Array(18).keys()].map(row => row + 2), [0]); // the piece rests at the top
  game.lockDelayResetCount = 16;
  game.togglePause();
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(faults, []);
});

test('toggling pause does nothing at game over [STA-2]', () => {
  const game = new GameManager({ scheduler: createFakeScheduler(), storage: createMemoryStorage() });
  game.togglePause();
  assert.equal(game.state, GameState.gameOver);
});

test('continue restores the board, score, level and every piece [STA-4]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ storage, factory: sequenceFactory([purple, yellow, green, red, orange, cyan]) });
  game.handleAction(PlayerAction.hold);
  game.handleAction(PlayerAction.moveLeft);
  game.gameBoard[19][2] = filled(red);
  game.score = 1200; // level 2
  game.handleAction(PlayerAction.pause);

  const restored = new GameManager({ scheduler: createFakeScheduler(), storage });
  restored.handleAction(PlayerAction.continueGame);
  assert.equal(restored.state, GameState.paused);
  assert.equal(restored.score, 1200);
  assert.equal(restored.level, 2);
  assert.equal(restored.gameBoard[19][2].color, red);
  assert.deepEqual(restored.currentTetromino, game.currentTetromino);
  assert.deepEqual(restored.heldTetromino, game.heldTetromino);
  assert.deepEqual(restored.nextTetrominos.map(piece => piece.color), game.nextTetrominos.map(piece => piece.color));
  assert.equal(restored.canHoldTetromino, false);
});

test('every game starts with a full bag, so its first seven pieces are all different [PCE-5] [STA-1]', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { game } = newGame({ factory: new TetrominoFactory(seededRandom(seed)) });
    for (let round = 1; round <= 2; round++) {
      const colors = [game.currentTetromino.color];
      for (let i = 0; i < 6; i++) {
        game.handleAction(PlayerAction.drop);
        colors.push(game.currentTetromino.color);
      }
      assert.equal(new Set(colors).size, 7, `seed ${seed}, game ${round}`);
      repeatUntil(() => game.state === GameState.gameOver, () => game.handleAction(PlayerAction.drop), 'the game ending');
      game.handleAction(PlayerAction.newGame);
    }
  }
});

test('continue carries on with the saved bag, so each piece still comes once per seven [PCE-5] [STA-4]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ storage, factory: new TetrominoFactory(seededRandom(5)) });
  game.handleAction(PlayerAction.drop);
  game.handleAction(PlayerAction.pause);
  const saved = game.factory.bag.map(piece => piece.color);
  assert.equal(saved.length, 2);

  const restored = new GameManager({ scheduler: createFakeScheduler(), storage, factory: new TetrominoFactory(seededRandom(99)) });
  restored.handleAction(PlayerAction.continueGame);
  restored.togglePause();
  for (const color of saved) {
    restored.handleAction(PlayerAction.drop);
    assert.equal(restored.nextTetrominos.at(-1).color, color);
  }
});

test('Continue refuses a save without a bag and leaves the current bag alone [PCE-5] [STA-6]', () => {
  const storage = createMemoryStorage();
  const { game } = newGame({ storage, factory: new TetrominoFactory(seededRandom(5)) });
  game.handleAction(PlayerAction.pause);
  const data = JSON.parse(parseSavedRecord(storage.getItem('tetris.savedGameSession')).position);
  delete data.bag;
  storage.setItem('tetris.savedGameSession', JSON.stringify(data));

  // Its constructor has already dealt from this bag.
  const restored = new GameManager({ scheduler: createFakeScheduler(), storage, factory: new TetrominoFactory(seededRandom(6)) });
  const bag = [...restored.factory.bag];
  restored.handleAction(PlayerAction.continueGame);
  assert.equal(restored.state, GameState.gameOver);
  assert.equal(restored.isSessionSaved, false);
  assert.deepEqual(restored.factory.bag, bag);
});

test('continue without a saved game stays at game over [STA-4]', () => {
  const game = new GameManager({ scheduler: createFakeScheduler(), storage: createMemoryStorage() });
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.isSessionSaved, false);
});

test('continue with a corrupted save stays at game over and forgets it [STA-4] [SAF-1]', () => {
  const storage = createMemoryStorage();
  storage.setItem('tetris.isSessionSaved', 'true');
  storage.setItem('tetris.savedGameSession', '{not json');
  const game = new GameManager({ scheduler: createFakeScheduler(), storage });
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.isSessionSaved, false);
});

// Game over

// Storage failures

test('a failing session save does not break pausing [SAF-2]', () => {
  const { game } = newGame({ storage: failingStorage(['tetris.savedGameSession']) });
  game.handleAction(PlayerAction.pause);
  assert.equal(game.state, GameState.paused);
  assert.equal(game.isSessionSaved, false);
});

test('the game keeps working when storage rejects every write [SAF-2]', () => {
  const scheduler = createFakeScheduler();
  const game = new GameManager({ scheduler, storage: failingStorage(), factory: fixedFactory(cyan) });
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.playing);
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.score, 100);
  game.togglePause();
  game.togglePause();
  scheduler.advance(700);
  assert.equal(game.state, GameState.playing);
});

test('memory storage keeps values as strings [SAF-2]', () => {
  const storage = createMemoryStorage();
  assert.equal(storage.getItem('missing'), null);
  storage.setItem('n', 42);
  assert.equal(storage.getItem('n'), '42');
  storage.removeItem('n');
  assert.equal(storage.getItem('n'), null);
});

// Random play

test('in 200 random games the rules always hold [SAF-6] [PCE-6] [SAF-4]', () => {
  const random = seededRandom(2024);
  const actions = [PlayerAction.moveLeft, PlayerAction.moveRight, PlayerAction.rotate, PlayerAction.hold];
  const validGains = new Set([0, 100, 300, 500, 800]);
  let gamesOver = 0;
  for (let round = 0; round < 200; round++) {
    const { game, scheduler } = newGame({ factory: new TetrominoFactory(random) });
    for (let step = 0; step < 2000 && game.state !== GameState.gameOver; step++) {
      const before = game.score;
      const roll = random();
      if (roll < 0.5) game.handleAction(actions[Math.floor(random() * actions.length)]);
      else if (roll < 0.53) game.handleAction(PlayerAction.drop);
      else if (roll < 0.6) game.softDrop();
      else if (roll < 0.61) { game.togglePause(); game.togglePause(); }
      else scheduler.advance(Math.floor(random() * 400));

      assert.ok(validGains.has(game.score - before), `score went from ${before} to ${game.score}`);
      assert.equal(game.level, Math.floor(game.score / 1000) + 1);
      assert.equal(game.gameBoard.length, 20);
      assert.ok(game.gameBoard.every(row => row.length === 10));
      assert.equal(game.nextTetrominos.length, 3);
      if (game.state === GameState.playing) {
        assert.ok(game.currentTetromino.fits(game.gameBoard), `round ${round} step ${step}: piece overlaps`);
        assert.ok(game.ghostTetromino.fits(game.gameBoard));
        assert.ok(game.ghostTetromino.position.row >= game.currentTetromino.position.row);
      }
    }
    if (game.state === GameState.gameOver) gamesOver++;
    assert.deepEqual(game.faults, [], `round ${round}: the invariant monitor never fires in legal play`);
  }
  assert.ok(gamesOver > 100, `most games played to the end (${gamesOver} of 200)`);
});

// Found by mutation testing: each test below catches a wrong change that
// the tests above let through.

test('saves keep the prefixed storage key with the new labeled format [STA-4] [SCO-3]', () => {
  const { game, storage } = newGame({ factory: fixedFactory(cyan) });
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(storage.getItem('tetris.highScore'), '100');
  assert.equal(parseSavedRecord(storage.getItem('tetris.savedGameSession')).available, true);
  assert.ok(storage.getItem('tetris.savedGameSession'));
});

test('by default gravity runs on the browser timers, and a soft drop replaces the pending tick [PLY-2] [PLY-3]', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const game = new GameManager({ storage: createMemoryStorage() });
  game.handleAction(PlayerAction.newGame);
  t.mock.timers.tick(600);
  game.softDrop();
  t.mock.timers.tick(100); // the old tick would have been due now
  assert.equal(game.currentTetromino.position.row, 1);
  t.mock.timers.tick(600);
  assert.equal(game.currentTetromino.position.row, 2);
});

test('a new game starts with a fresh lock delay, whatever the last game left behind [PLY-6] [STA-1]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  game.lockDelayResetCount = 15;
  game.lowestRowReached = 19;
  game.state = GameState.gameOver;
  game.stopGameLoop();
  game.handleAction(PlayerAction.newGame);
  landOnSurface(game);
  game.softDrop();
  assert.equal(filledCells(game), 0, 'waits instead of locking at once');
  scheduler.advance(500);
  assert.equal(filledCells(game), 4);
});

test('if a save fails after an earlier one worked, the old save is no longer offered [STA-4] [SAF-2]', () => {
  const storage = createMemoryStorage();
  const setItem = storage.setItem;
  let savesFail = false;
  storage.setItem = (key, value) => {
    if (savesFail && key === 'tetris.savedGameSession') throw new Error('QuotaExceededError');
    setItem(key, value);
  };
  const { game } = newGame({ storage });
  game.togglePause();
  assert.equal(game.isSessionSaved, true);
  game.togglePause();
  savesFail = true;
  game.togglePause();
  assert.equal(game.isSessionSaved, false);
});

test('a soft drop that ends the game leaves no timers running [STA-3] [SAF-4]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow), onFault: fault => faults.push(fault) });
  fillRows(game, [...Array(18).keys()].map(row => row + 2), [0]);
  game.lockDelayResetCount = 15; // the landing locks at once
  game.softDrop();
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(faults, []);
});

test('after a piece locks, the next piece waits a full gravity interval before falling [PLY-2] [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  repeatUntil(() => game.isOnSurface, () => scheduler.advance(700), 'the piece landing by gravity');
  scheduler.advance(500); // locks; the next piece appears
  assert.equal(filledCells(game), 4);
  assert.equal(game.currentTetromino.position.row, 0);
  scheduler.advance(699);
  assert.equal(game.currentTetromino.position.row, 0);
  scheduler.advance(1);
  assert.equal(game.currentTetromino.position.row, 1);
});

test('a hard drop gives the next piece a full gravity interval [PLY-2] [PLY-4]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  scheduler.advance(600);
  game.handleAction(PlayerAction.drop);
  scheduler.advance(699);
  assert.equal(game.currentTetromino.position.row, 0);
  scheduler.advance(1);
  assert.equal(game.currentTetromino.position.row, 1);
});

test('moves, rotations and pauses in the air do not use up lock delay resets [PLY-6] [STA-2]', () => {
  const { game } = newGame({ factory: fixedFactory(purple) });
  game.softDrop();
  game.softDrop();
  for (let i = 0; i < 20; i++) game.handleAction([PlayerAction.moveLeft, PlayerAction.moveRight, PlayerAction.rotate][i % 3]);
  game.togglePause();
  game.togglePause();
  assert.equal(game.lockDelayResetCount, 0);
});

test('the 16th move on the surface does not extend the lock delay [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  landOnSurface(game);
  game.softDrop();
  for (let i = 0; i < 15; i++) {
    scheduler.advance(400);
    game.handleAction(i % 2 === 0 ? PlayerAction.moveLeft : PlayerAction.moveRight);
  }
  assert.equal(game.lockDelayResetCount, 15);
  scheduler.advance(400);
  game.handleAction(PlayerAction.moveLeft); // 16th
  scheduler.advance(100);
  assert.equal(filledCells(game), 4, 'locked 0.5s after the 15th reset');
});

test('pressing rotate when the piece cannot turn does not extend the lock delay [PLY-6]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  landOnSurface(game);
  game.softDrop();
  scheduler.advance(400);
  game.handleAction(PlayerAction.rotate); // the O piece never turns
  assert.equal(game.lockDelayResetCount, 0);
  scheduler.advance(100);
  assert.equal(filledCells(game), 4);
});

test('a rotation that kicks the piece down to a new lowest row resets the lock delay count [PLY-6]', () => {
  const { game } = newGame({ factory: fixedFactory(purple) });
  for (const [row, column] of [[15, 8], [18, 8], [15, 2], [15, 4], [17, 5]]) game.gameBoard[row][column] = filled();
  game.currentTetromino.position = position(15, 4);
  game.lowestRowReached = 15;
  game.softDrop(); // resting: the lock delay starts
  assert.notEqual(game.lockDelayTask, null);
  game.lockDelayResetCount = 5;
  game.handleAction(PlayerAction.rotate);
  assert.equal(game.currentTetromino.position.row, 17, 'kicked two rows down');
  assert.equal(game.lockDelayResetCount, 0);
});

test('a line clear that ends the game does not leave a save to continue [STA-3] [STA-4]', () => {
  const { game } = newGame({ factory: fixedFactory(cyan) });
  fillRows(game, [19], [9]);
  for (const row of [0, 1]) for (const column of [3, 4, 5, 6]) game.gameBoard[row][column] = filled();
  game.currentTetromino.rotationState = 1;
  game.currentTetromino.position = position(2, 7); // vertical in column 9
  game.handleAction(PlayerAction.drop);
  assert.equal(game.score, 100);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.isSessionSaved, false);
});

test('continue is ignored during a game even when a save exists [STA-4]', () => {
  const { game } = newGame();
  game.togglePause();
  game.togglePause();
  game.handleAction(PlayerAction.moveLeft);
  const before = snapshot(game);
  game.handleAction(PlayerAction.continueGame);
  assert.equal(snapshot(game), before);
});

test('a piece swapped in from hold starts with a fresh lock delay [PLY-6] [PLY-7]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  game.handleAction(PlayerAction.hold);
  game.handleAction(PlayerAction.drop); // hold is available again
  landOnSurface(game);
  game.lockDelayResetCount = 15;
  game.lowestRowReached = 19;
  game.handleAction(PlayerAction.hold); // the held piece comes in at the top
  landOnSurface(game);
  game.softDrop();
  assert.equal(filledCells(game), 4, 'only the first piece is locked');
  scheduler.advance(500);
  assert.equal(filledCells(game), 8);
});

test('a first hold that brings in a piece with no room ends the game with no timers [STA-3] [PLY-7]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: sequenceFactory([purple, yellow]), onFault: fault => faults.push(fault) });
  for (let i = 0; i < 5; i++) game.softDrop();
  game.gameBoard[0][4] = filled(); // where the next piece appears
  game.handleAction(PlayerAction.hold);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(faults, []);
});

test('holding during the lock delay when the held piece has no room ends the game with no timers [PLY-6] [PLY-7] [STA-3]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: sequenceFactory([purple, yellow, green]), onFault: fault => faults.push(fault) });
  game.handleAction(PlayerAction.hold);
  game.handleAction(PlayerAction.drop);
  landOnSurface(game);
  game.softDrop(); // starts the lock delay
  assert.notEqual(game.lockDelayTask, null);
  fillRows(game, [1], [0, 1, 2, 6, 7, 8, 9]); // blocks where the held T would appear
  game.handleAction(PlayerAction.hold);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(faults, []);
});

// Serializer fault regressions use injected failures, not organic errors.
const serializerSavedKey = 'tetris.savedGameSession';

function rememberWrittenBytes(game, storage) {
  game.handleAction(PlayerAction.pause);
  const bytes = storage.getItem(serializerSavedKey);
  const payload = JSON.parse(parseSavedRecord(bytes).position);
  // This is an engine-written byte-retention witness, not an independent
  // proof of B9/B16 semantic validity or the F29 last-good-save target.
  assert.equal(parseSavedRecord(storage.getItem(serializerSavedKey)).available, true);
  assert.equal(payload.score, 0);
  assert.equal(payload.gameBoard.length, 20);
  for (const row of payload.gameBoard) {
    assert.equal(row.length, 10);
    for (const cell of row) assert.deepEqual(cell, { isFilled: false, color: null });
  }
  assert.equal(payload.currentTetromino.color, PieceColors.cyan);
  assert.deepEqual(payload.currentTetromino.position, { row: 0, column: 3 });
  assert.equal(payload.currentTetromino.rotationState, 0);
  assert.equal(payload.lockDelayResetCount, 0);
  assert.equal(payload.lowestRowReached, 1);
  assert.equal(payload.nextTetrominos.length, 3);
  assert.equal(payload.heldTetromino, null);
  assert.equal(payload.canHoldTetromino, true);
  assert.deepEqual(payload.bag, []);
  game.handleAction(PlayerAction.resume);
  return bytes;
}

for (const route of ['Pause', 'line clear']) {
  for (const refusedWithdrawal of [false, true]) {
    test(`a serializer failure on ${route} stops safely even with withdrawal refused=${refusedWithdrawal} [SAF-3] [STA-4] [SAF-2]`, () => {
      const reports = [];
      const { game, storage, scheduler } = newGame({
        factory: fixedFactory(cyan),
        onFault: fault => reports.push(fault)
      });
      const before = rememberWrittenBytes(game, storage);
      if (route === 'line clear') {
        // Disclosed board setup: real locked-block colors, one open column,
        // no overlap with the spawned I and no already-full row.
        for (let column = 0; column < 9; column++) {
          game.gameBoard[19][column] = { isFilled: true, color: PieceColors.blue };
        }
      }
      const writes = [];
      const setItem = storage.setItem;
      storage.setItem = (key, value) => {
        writes.push([key, value]);
        if (refusedWithdrawal && key === serializerSavedKey && parseSavedRecord(value)?.available === false) throw new Error('withdrawal refused');
        setItem(key, value);
      };
      const original = JSON.stringify;
      const error = new Error('injected session serialization failure');
      let injections = 0;
      JSON.stringify = function(value, ...args) {
        if (value && Object.hasOwn(value, 'gameBoard') && Object.hasOwn(value, 'nextTetrominos')) {
          injections += 1;
          throw error;
        }
        return original(value, ...args);
      };
      try {
        if (route === 'Pause') game.handleAction(PlayerAction.pause);
        else dropVerticalIIntoColumn9(game);
      } finally {
        JSON.stringify = original;
        storage.setItem = setItem;
      }
      assert.equal(injections, 1, 'the guarded route reached the session serializer');
      if (route === 'line clear') assert.equal(game.score, 100, 'an actual line cleared before saving');
      assert.equal(game.state, GameState.gameOver);
      assert.equal(game.gameLoopTask, null);
      assert.equal(game.lockDelayTask, null);
      assert.equal(scheduler.pending, 0, 'no outstanding engine timer firing');
      assert.equal(reports.length, 1);
      assert.equal(reports[0].reason, 'unexpected error');
      assert.equal(reports[0].error, error, 'withdrawal failure cannot replace the original error');
      assert.equal(parseSavedRecord(storage.getItem(serializerSavedKey)).position, parseSavedRecord(before).position, 'exact earlier position bytes remain');
      if (refusedWithdrawal) assert.equal(storage.getItem(serializerSavedKey), before);
      assert.ok(writes.filter(([key])=>key !== 'tetris.highScore').every(([key,value]) => key === serializerSavedKey && parseSavedRecord(value)?.available === false), 'saved-record writes only attempt metadata withdrawal');
      assert.ok(writes.some(([key, value]) => key === serializerSavedKey && parseSavedRecord(value)?.available === false), 'withdrawal was attempted');
      assert.equal(game.isSessionSaved, false, 'withdrawal holds for this session');
      assert.equal(parseSavedRecord(storage.getItem(serializerSavedKey)).available, refusedWithdrawal);
      // No reload promise for refused withdrawal. A new local save after
      // recovery is a normal successful-save control, not restoration of it.
      game.handleAction(PlayerAction.newGame);
      game.handleAction(PlayerAction.pause);
      assert.equal(game.state, GameState.paused);
      assert.equal(game.isSessionSaved, true);
      assert.equal(parseSavedRecord(storage.getItem(serializerSavedKey)).available, true);
      assert.equal(reports.length, 1);
    });
  }
}

test('a session storage-write failure stays nonfatal and attempts withdrawal [SAF-2] [STA-4]', () => {
  const reports = [];
  const { game, storage, scheduler } = newGame({ factory: fixedFactory(cyan), onFault: fault => reports.push(fault) });
  const before = rememberWrittenBytes(game, storage);
  const setItem = storage.setItem;
  const writes = [];
  storage.setItem = (key, value) => {
    writes.push([key, value]);
    if (key === serializerSavedKey) throw new Error('session write refused');
    setItem(key, value);
  };
  try {
    game.handleAction(PlayerAction.pause);
  } finally {
    storage.setItem = setItem;
  }
  assert.equal(game.state, GameState.paused);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(reports, []);
  assert.equal(storage.getItem(serializerSavedKey), before);
  assert.ok(writes.some(([key,value]) => key === serializerSavedKey && parseSavedRecord(value)?.available === false));
  assert.equal(game.isSessionSaved, false);
});

// Saving-publication regressions.
const FLAG = 'tetris.isSessionSaved';
const DATA = 'tetris.savedGameSession';
const manager = storage => new GameManager({ storage, scheduler: createFakeScheduler(), factory: fixedFactory(PieceColors.cyan) });

// Actual normal-action A/B trace; these literal byte checks are not a full
// independent semantic-good-save proof or certification of the audit gap.
function priorSave() {
  const reports = [];
  const { game, storage, scheduler } = newGame({ factory: fixedFactory(PieceColors.cyan), onFault: fault => reports.push(fault) });
  game.handleAction(PlayerAction.pause);
  const a = storage.getItem(DATA);
  assert.equal(JSON.parse(parseSavedRecord(a).position).currentTetromino.position.column, 3);
  game.handleAction(PlayerAction.resume);
  game.handleAction(PlayerAction.moveLeft);
  return { game, storage, scheduler, reports, a };
}

for (const failedWrite of ['atomic record']) {
  for (const refuseWithdrawal of [false, true]) {
    test(`${failedWrite} failure preserves A bytes and withdraws, withdrawal refused=${refuseWithdrawal} [STA-4] [SAF-2]`, () => {
      const { game, storage, scheduler, reports, a } = priorSave();
      storage.setItem(FLAG, 'true');
      const writes = [];
      const setItem = storage.setItem;
      storage.setItem = (key, value) => {
        writes.push([key, value]);
        if (key === DATA && (parseSavedRecord(value)?.available || refuseWithdrawal)) throw new Error('refused');
        setItem(key, value);
      };
      game.handleAction(PlayerAction.pause);
      assert.equal(game.state, GameState.paused);
      assert.equal(scheduler.pending, 0);
      assert.deepEqual(reports, []);
      assert.equal(parseSavedRecord(storage.getItem(DATA)).position, parseSavedRecord(a).position);
      assert.equal(parseSavedRecord(storage.getItem(DATA)).available, refuseWithdrawal);
      if (refuseWithdrawal) assert.equal(storage.getItem(DATA),a);
      assert.equal(game.isSessionSaved, false);
      assert.equal(game.sessionSaveWithdrawn, true);
      assert.deepEqual(writes.map(([key,value]) => [key,parseSavedRecord(value).available]), [[DATA,true],[DATA,false]]);
      // Recovery of storage alone or an external publication is not a save
      // by this session, even when the earlier withdrawal landed.
      storage.setItem = setItem;
      const other = manager(storage);
      other.handleAction(PlayerAction.newGame);
      other.handleAction(PlayerAction.pause);
      game.storageChanged();
      assert.equal(game.isSessionSaved, false);
      game.isSessionSaved = true; // raw flag publication must not clear latch
      assert.equal(game.isSessionSaved, false);
      game.handleAction(PlayerAction.resume);
      game.handleAction(PlayerAction.pause);
      assert.equal(game.isSessionSaved, true);
      assert.equal(game.sessionSaveWithdrawn, false);
      assert.equal(JSON.parse(parseSavedRecord(storage.getItem(DATA)).position).currentTetromino.position.column, 2);
    });
  }
}

for (const initiallyWithdrawn of [false, true]) {
  test(`interleaved readers see only completed A then B, writer latch starts ${initiallyWithdrawn} [STA-4]`, () => {
    const { game, storage, a } = priorSave();
    storage.setItem(FLAG, 'true');
    game.sessionSaveWithdrawn = initiallyWithdrawn;
    const observer = manager(storage);
    const setItem = storage.setItem;
    const points = [];
    storage.setItem = (key, value) => {
      setItem(key, value);
      if (key !== FLAG && key !== DATA) return;
      observer.storageChanged();
      assert.equal(observer.isSessionSaved, true);
      observer.loadGameSession();
      const column = observer.currentTetromino.position.column;
      points.push([key, column]);
      if (key === FLAG) {
        assert.equal(storage.getItem(DATA), a);
        assert.equal(game.sessionSaveWithdrawn, initiallyWithdrawn);
      } else {
        assert.notEqual(storage.getItem(DATA), a);
        assert.equal(game.sessionSaveWithdrawn, initiallyWithdrawn, 'clears only after payload operation returns');
      }
    };
    game.handleAction(PlayerAction.pause);
    storage.setItem = setItem;
    assert.deepEqual(points, [[DATA, 2]]);
    assert.equal(game.sessionSaveWithdrawn, false);
    assert.equal(game.isSessionSaved, true);
  });
}

test('a later engine fault retains fully completed B without rollback or withdrawal [STA-4] [SAF-3]', () => {
  const { game, storage, scheduler, reports, a } = priorSave();
  game.handleAction(PlayerAction.pause);
  const b = storage.getItem(DATA);
  assert.notEqual(b, a);
  assert.equal(JSON.parse(parseSavedRecord(b).position).currentTetromino.position.column, 2);
  const fault = new Error('after completed save');
  game.guard(() => { throw fault; });
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.equal(storage.getItem(DATA), b);
  assert.equal(parseSavedRecord(storage.getItem(DATA)).available,true);
  assert.equal(game.isSessionSaved, true);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].error, fault);
  const restored = manager(storage);
  restored.handleAction(PlayerAction.continueGame);
  assert.equal(restored.state, GameState.paused);
  assert.equal(restored.currentTetromino.position.column, 2);
});

for (const bad of ['{invalid json', '{}', JSON.stringify({ score: 0 })]) {
  for (const refuseWithdrawal of [false, true]) {
    test(`availability rejects invalid content ${bad}, withdrawal refused=${refuseWithdrawal} [STA-4] [SAF-1]`, () => {
      const storage = createMemoryStorage();
      storage.setItem(FLAG, 'true');
      storage.setItem(DATA, bad);
      const setItem = storage.setItem;
      const writes = [];
      storage.setItem = (key, value) => {
        writes.push([key, value]);
        if (refuseWithdrawal) throw new Error('refused');
        setItem(key, value);
      };
      const game = manager(storage);
      assert.equal(game.isSessionSaved, false);
      assert.deepEqual(writes, [[FLAG, 'false']]);
      assert.equal(storage.getItem(DATA), bad);
      assert.equal(game.sessionSaveWithdrawn, true);
      for (let i = 0; i < 60; i++) assert.equal(game.isSessionSaved, false);
      game.handleAction(PlayerAction.continueGame);
      assert.equal(game.state, GameState.gameOver);
      assert.deepEqual(writes, [[FLAG, 'false']], 'latch avoids repeated writes');
    });
  }
}

for (const key of [DATA]) {
  for (const kind of ['absent', 'unreadable']) {
    test(`${key} ${kind} makes availability false without withdrawal or mutation [STA-4] [SAF-2]`, () => {
      const { storage } = priorSave();
      storage.setItem(FLAG, 'true');
      const getItem = storage.getItem;
      const writes = [];
      storage.getItem = k => {
        if (k === key) {
          if (kind === 'unreadable') throw new Error('refused read');
          return null;
        }
        return getItem(k);
      };
      storage.setItem = (k, v) => writes.push([k, v]);
      const game = manager(storage);
      assert.equal(game.readSaveItem(key).kind, kind);
      assert.equal(game.isSessionSaved, false);
      game.handleAction(PlayerAction.continueGame);
      assert.equal(game.state, GameState.gameOver);
      assert.equal(game.sessionSaveWithdrawn, false);
      assert.deepEqual(writes, []);
    });
  }
}

for (const flag of ['', 'TRUE', 'false', '1']) {
  test(`the former flag does not govern new-format availability, including ${JSON.stringify(flag)} [STA-4]`, () => {
    const { storage } = priorSave();
    storage.setItem(FLAG, flag);
    const game = manager(storage);
    assert.equal(game.isSessionSaved, true);
    assert.equal(game.sessionSaveWithdrawn, false);
  });
}

test('one complete record read is cached until actual invalidation [DSP-3] [STA-4]', () => {
  const { storage } = priorSave();
  storage.setItem(FLAG, 'true');
  const reads = { [FLAG]: 0, [DATA]: 0 };
  const getItem = storage.getItem;
  storage.getItem = key => { reads[key] += 1; return getItem(key); };
  const game = manager(storage);
  for (let i = 0; i < 60; i++) assert.equal(game.isSessionSaved, true);
  assert.deepEqual(reads, { [FLAG]: 0, [DATA]: 1 });
  game.storageChanged();
  for (let i = 0; i < 60; i++) assert.equal(game.isSessionSaved, true);
  assert.deepEqual(reads, { [FLAG]: 0, [DATA]: 2 });
  // A real completed local save invalidates the cached record result.
  game.handleAction(PlayerAction.continueGame);
  game.saveGameSession();
  const before = reads[DATA];
  assert.equal(game.isSessionSaved, true);
  assert.equal(reads[DATA], before + 1);
  assert.equal(game.isSessionSaved, true);
  assert.equal(reads[DATA], before + 1, 'one read after actual publication');
});

for (const changed of ['valid B', 'invalid', 'absent', 'unreadable', 'unavailable record']) {
  test(`Continue freshly reads after cached A, changed to ${changed} [STA-4] [SAF-1] [SAF-2]`, () => {
    const { game: writer, storage, a } = priorSave();
    storage.setItem(FLAG, 'true');
    const game = manager(storage);
    assert.equal(game.isSessionSaved, true);
    writer.handleAction(PlayerAction.pause);
    const b = storage.getItem(DATA);
    assert.notEqual(a, b);
    if (changed === 'invalid') storage.setItem(DATA, '{}');
    if (changed === 'absent') storage.removeItem(DATA);
    if (changed === 'unreadable') {
      const getItem = storage.getItem;
      storage.getItem = key => { if (key === DATA) throw new Error('refused'); return getItem(key); };
    }
    if (changed === 'unavailable record') storage.setItem(DATA,serializeSavedRecord(parseSavedRecord(b).position,false));
    const beforeBoard = game.gameBoard;
    game.handleAction(PlayerAction.continueGame);
    if (changed === 'valid B') {
      assert.equal(game.state, GameState.paused);
      assert.equal(game.currentTetromino.position.column, 2);
      assert.notEqual(game.gameBoard, beforeBoard);
    } else {
      assert.equal(game.state, GameState.gameOver);
      assert.equal(game.gameBoard, beforeBoard);
      assert.equal(game.sessionSaveWithdrawn, changed === 'invalid');
      assert.equal(storage.getItem(FLAG), changed === 'invalid' ? 'false' : 'true');
    }
  });
}


test('assigning true cannot publish or clear local withdrawal [STA-4] [SAF-2]', () => {
  const {storage}=priorSave(); const game=manager(storage);
  game.isSessionSaved=false;
  const before=storage.getItem(DATA);
  game.isSessionSaved=true;
  assert.equal(storage.getItem(DATA),before);
  assert.equal(game.sessionSaveWithdrawn,true);
});

test('fresh Continue with unavailable content is a nonthrowing no-op, not an engine fault [STA-4] [SAF-2]', () => {
  for (const value of [null, '{}']) {
    const storage = createMemoryStorage();
    storage.setItem(FLAG, 'true');
    if (value !== null) storage.setItem(DATA, value);
    const reports = [];
    const game = new GameManager({ storage, scheduler: createFakeScheduler(), onFault: fault => reports.push(fault) });
    const before = snapshot(game);
    assert.doesNotThrow(() => game.loadGameSession());
    assert.equal(snapshot(game), before);
    assert.deepEqual(reports, []);
  }
});

test('fresh Continue invalidates earlier cached ineligibility after restoring valid content [STA-4] [DSP-3]', () => {
  const { storage } = priorSave();
  const record = storage.getItem(DATA);
  storage.setItem(DATA, serializeSavedRecord(parseSavedRecord(record).position, false));
  const game = manager(storage);
  assert.equal(game.isSessionSaved, false);
  storage.setItem(DATA, record);
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.paused);
  assert.equal(game.isSessionSaved, true);
});

test('payload write invalidates a reentrant eligibility check during publication [STA-4] [DSP-3]', () => {
  const { game, storage } = priorSave();
  storage.removeItem(DATA);
  game.sessionSaveWithdrawn = false;
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === DATA) assert.equal(game.isSessionSaved, false, 'payload still absent');
    setItem(key, value);
  };
  game.handleAction(PlayerAction.pause);
  assert.equal(game.isSessionSaved, true, 'completed payload invalidated the earlier false cache');
});

test('assigning true on an available record is a no-op, and withdrawn records are not rewritten [STA-4] [SAF-2]', () => {
  const { game, storage } = priorSave();
  const before = storage.getItem(DATA);
  game.isSessionSaved = true;
  assert.equal(game.sessionSaveWithdrawn, false);
  assert.equal(storage.getItem(DATA), before);
  assert.equal(game.isSessionSaved, true);
  game.isSessionSaved = false;
  const withdrawn = storage.getItem(DATA);
  const writes = [];
  storage.setItem = (key, value) => writes.push([key, value]);
  game.isSessionSaved = false;
  assert.deepEqual(writes, []);
  assert.equal(storage.getItem(DATA), withdrawn);
});

test('restoring a saved position cancels a pre-existing lock timer [STA-4] [PLY-6]', () => {
  const { storage } = priorSave();
  const scheduler = createFakeScheduler();
  const game = new GameManager({ storage, scheduler });
  game.lockDelayTask = scheduler.setTimeout(
    () => assert.fail('obsolete lock timer fired'),
    10
  );
  game.loadGameSession();
  assert.equal(game.lockDelayTask, null);
  assert.equal(scheduler.pending, 0);
  scheduler.advance(20);
});

test('invalid constructed save content withdraws and reports through the guarded safe stop [STA-4] [SAF-1] [SAF-3]', () => {
  const { game, storage, scheduler, reports, a } = priorSave();
  // The engine state remains valid; the serializer emits invalid content.
  const original = JSON.stringify;
  let constructions = 0;
  JSON.stringify = function (value, ...args) {
    if (
      value &&
      Object.hasOwn(value, 'gameBoard') &&
      Object.hasOwn(value, 'nextTetrominos')
    ) {
      constructions++;
      return original({ ...value, score: -1 }, ...args);
    }
    return original(value, ...args);
  };
  try {
    game.handleAction(PlayerAction.pause);
  } finally {
    JSON.stringify = original;
  }
  assert.equal(constructions, 1);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.gameLoopTask, null);
  assert.equal(game.lockDelayTask, null);
  assert.equal(scheduler.pending, 0);
  assert.equal(reports.length, 1);
  assert.equal(game.faults.length, 1);
  assert.equal(reports[0], game.faults[0]);
  assert.equal(reports[0].reason, 'unexpected error');
  assert.ok(reports[0].error instanceof Error);
  const record = parseSavedRecord(storage.getItem(DATA));
  assert.equal(record.available, false);
  assert.equal(record.position, parseSavedRecord(a).position);
  assert.equal(game.sessionSaveWithdrawn, true);
});

test('ordinary spawn and held-piece game over withdraw an existing available record [STA-3] [STA-4] [PLY-7]', () => {
  for (const route of ['next', 'held']) {
    const { game, storage } = newGame({
      factory: sequenceFactory([purple, yellow, green])
    });
    if (route === 'held') {
      game.handleAction(PlayerAction.hold);
      game.handleAction(PlayerAction.drop);
    }
    game.handleAction(PlayerAction.pause);
    const before = parseSavedRecord(storage.getItem(DATA)).position;
    game.handleAction(PlayerAction.resume);
    game.currentTetromino.position = position(12, 3);
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 10; column++)
        game.gameBoard[row][column] = { isFilled: true, color: cyan };
    if (route === 'next') game.generateNextTetromino();
    else game.holdTetromino();
    assert.equal(game.state, GameState.gameOver);
    const record = parseSavedRecord(storage.getItem(DATA));
    assert.equal(record.available, false);
    assert.equal(record.position, before);
    assert.equal(game.sessionSaveWithdrawn, true);
  }
});

test('a resting move with no running delay starts one, and terminal line clears never save [PLY-6] [STA-3] [STA-4]', () => {
  const { game } = newGame({ factory: fixedFactory(yellow) });
  landOnSurface(game);
  game.cancelLockDelay();
  game.handleAction(PlayerAction.moveLeft);
  assert.notEqual(game.lockDelayTask, null);
  game.lockDelayResetCount = 15;
  game.cancelLockDelay();
  game.handleAction(PlayerAction.moveRight);
  assert.equal(
    filledCells(game),
    4,
    'resting count15 with no deadline locks at once'
  );
  let saves = 0;
  const terminal = newGame({ factory: fixedFactory(cyan) }).game;
  terminal.saveGameSession = () => {
    saves++;
  };
  terminal.clearFullRows = () => 1;
  terminal.generateNextTetromino = () => {
    terminal.state = GameState.gameOver;
  };
  terminal.lockAndSpawnNext();
  assert.equal(saves, 0);
});


test('moving onto a ledge starts the lock delay at once, without using a reset [PLY-6]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow), onFault: fault => faults.push(fault) });
  game.gameBoard[7][3] = filled();
  for (let i = 0; i < 5; i++) game.softDrop(); // rows 5 and 6, just above the ledge's row
  assert.equal(game.lockDelayTask, null);
  game.handleAction(PlayerAction.moveLeft);
  assert.notEqual(game.lockDelayTask, null);
  assert.equal(game.lockDelayResetCount, 0);
  scheduler.advance(499);
  assert.equal(filledCells(game), 1);
  scheduler.advance(1);
  assert.equal(filledCells(game), 5);
  assert.deepEqual(faults, []);
});

test('turning onto a ledge starts the lock delay at once [PLY-6]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: fixedFactory(purple), onFault: fault => faults.push(fault) });
  game.gameBoard[8][4] = filled();
  for (let i = 0; i < 5; i++) game.softDrop();
  assert.equal(game.lockDelayTask, null);
  game.handleAction(PlayerAction.rotate); // the stem now points down at the ledge
  assert.equal(game.currentTetromino.rotationState, 1);
  assert.equal(game.isOnSurface, true);
  assert.notEqual(game.lockDelayTask, null);
  scheduler.advance(500);
  assert.equal(filledCells(game), 5);
  assert.deepEqual(faults, []);
});

test('a new piece that appears resting on the stack starts its lock delay at once [PLY-6]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow), onFault: fault => faults.push(fault) });
  for (let i = 0; i < 4; i++) game.handleAction(PlayerAction.moveLeft);
  game.gameBoard[2][4] = filled(); // under where the next piece appears
  game.handleAction(PlayerAction.drop);
  assert.equal(game.currentTetromino.position.row, 0);
  assert.notEqual(game.lockDelayTask, null);
  scheduler.advance(499);
  assert.equal(filledCells(game), 5);
  scheduler.advance(1);
  assert.equal(filledCells(game), 9);
  assert.deepEqual(faults, []);
});

test('a held piece swapped in resting on the stack starts its lock delay at once [PLY-6] [PLY-7]', () => {
  const faults = [];
  const { game, scheduler } = newGame({ factory: sequenceFactory([purple, yellow, green]), onFault: fault => faults.push(fault) });
  game.handleAction(PlayerAction.hold); // holds T, plays O
  for (let i = 0; i < 4; i++) game.handleAction(PlayerAction.moveLeft);
  game.handleAction(PlayerAction.drop); // O locks, plays S
  game.gameBoard[2][4] = filled(); // under where the T appears
  game.handleAction(PlayerAction.hold);
  assert.equal(game.currentTetromino.color, purple);
  assert.notEqual(game.lockDelayTask, null);
  scheduler.advance(500);
  assert.equal(filledCells(game), 9);
  assert.deepEqual(faults, []);
});

for (const [name, start, final] of [
  ['exact hit', Number.MAX_SAFE_INTEGER - 100, Number.MAX_SAFE_INTEGER],
  ['crossing award', Number.MAX_SAFE_INTEGER - 50, Number.MAX_SAFE_INTEGER - 50]
]) {
  test(`score limit ends on ${name} without another piece, save or timer [SCO-1] [SCO-2] [STA-3] [STA-4] [SAF-4]`, () => {
    const faults = [];
    const { game, scheduler, storage } = newGame({ factory: fixedFactory(PieceColors.cyan), onFault: fault => faults.push(fault) });
    game.score = start;
    game.togglePause();
    const saved = parseSavedRecord(storage.getItem('tetris.savedGameSession'));
    game.togglePause();
    let generated = 0;
    const generate = game.factory.generate;
    game.factory.generate = () => { generated += 1; return generate(); };
    fillRows(game, [19], [9]);
    dropVerticalIIntoColumn9(game);
    assert.equal(game.state, GameState.gameOver);
    assert.equal(filledCells(game), 3, 'the completed row disappears and the three blocks above move down');
    assert.ok(game.gameBoard[19][9].isFilled);
    assert.equal(game.gameBoard[16][9].isFilled, false);
    assert.equal(game.score, final);
    assert.equal(game.highScore, final);
    assert.equal(game.level, Math.floor(final / 1000) + 1);
    assert.equal(generated, 0);
    assert.equal(scheduler.pending, 0);
    assert.equal(game.isSessionSaved, false);
    const withdrawn = parseSavedRecord(storage.getItem('tetris.savedGameSession'));
    assert.equal(withdrawn.available, false);
    assert.equal(withdrawn.position, saved.position);
    assert.deepEqual(faults, []);
    assert.equal(game.findInvariantViolation(), null);
    scheduler.advance(10000);
    assert.equal(game.score, final);
    assert.equal(scheduler.pending, 0);
    const fresh = new GameManager({ storage, scheduler });
    assert.equal(fresh.isSessionSaved, false);
  });
}

test('a crossing award ends normally with a real lock delay pending [SCO-1] [STA-3] [STA-4] [SAF-4]', () => {
  const faults = [];
  const { game, scheduler, storage } = newGame({ factory: fixedFactory(PieceColors.cyan), onFault: fault => faults.push(fault) });
  const final = Number.MAX_SAFE_INTEGER - 50;
  game.score = final;
  game.togglePause();
  const saved = parseSavedRecord(storage.getItem('tetris.savedGameSession'));
  game.togglePause();
  let generated = 0;
  const generate = game.factory.generate;
  game.factory.generate = () => { generated += 1; return generate(); };
  fillRows(game, [19], [9]);
  game.handleAction(PlayerAction.rotate);
  for (let i = 0; i < 4; i++) game.handleAction(PlayerAction.moveRight);
  landOnSurface(game);
  assert.equal(game.state, GameState.playing);
  assert.notEqual(game.lockDelayTask, null, 'touchdown starts a real lock delay');
  assert.ok(scheduler.pending > 0);
  game.handleAction(PlayerAction.drop);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(filledCells(game), 3);
  assert.ok(game.gameBoard[19][9].isFilled);
  assert.equal(game.gameBoard[16][9].isFilled, false);
  assert.equal(game.score, final);
  assert.equal(game.highScore, final);
  assert.equal(generated, 0);
  assert.equal(game.gameLoopTask, null);
  assert.equal(game.lockDelayTask, null);
  assert.equal(scheduler.pending, 0);
  assert.equal(game.isSessionSaved, false);
  const withdrawn = parseSavedRecord(storage.getItem('tetris.savedGameSession'));
  assert.equal(withdrawn.available, false);
  assert.equal(withdrawn.position, saved.position);
  assert.deepEqual(faults, [], 'ordinary score-limit ending does not enter fault containment');
  assert.equal(game.findInvariantViolation(), null);
  const terminal = snapshot(game);
  scheduler.advance(10000);
  assert.equal(snapshot(game), terminal);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(faults, []);
});

test('a saved score at the ceiling restores paused and ends on resume [STA-4] [SCO-2] [SAF-4]', () => {
  const faults = [];
  const { game, scheduler, storage } = newGame({ onFault: fault => faults.push(fault) });
  game.score = Number.MAX_SAFE_INTEGER;
  game.togglePause();
  const restored = new GameManager({ storage, scheduler, onFault: fault => faults.push(fault) });
  restored.handleAction(PlayerAction.continueGame);
  assert.equal(restored.state, GameState.paused);
  assert.equal(restored.score, Number.MAX_SAFE_INTEGER);
  restored.handleAction(PlayerAction.resume);
  assert.equal(restored.state, GameState.gameOver);
  assert.equal(restored.score, Number.MAX_SAFE_INTEGER);
  assert.equal(restored.isSessionSaved, false);
  assert.equal(scheduler.pending, 0);
  assert.deepEqual(faults, []);
});

test('a safe nonmultiple score can still earn a full award below the limit [SCO-1] [STA-4]', () => {
  const { game } = newGame({ factory: fixedFactory(PieceColors.cyan) });
  game.score = 151;
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.score, 251);
  assert.equal(game.state, GameState.playing);
});

test('a missing or invalid stored high score reads as 0 [SCO-3] [SAF-2]', () => {
  const storage = createMemoryStorage();
  assert.equal(new GameManager({ scheduler: createFakeScheduler(), storage }).highScore, 0);
  storage.setItem('tetris.highScore', 'not a number');
  assert.equal(new GameManager({ scheduler: createFakeScheduler(), storage }).highScore, 0);
});

test('topping out stops all timers [STA-3]', () => {
  const { game, scheduler } = newGame({ factory: fixedFactory(yellow) });
  repeatUntil(() => game.state !== GameState.playing, () => game.handleAction(PlayerAction.drop), 'the game ending');
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  const before = snapshot(game);
  scheduler.advance(10000);
  assert.equal(snapshot(game), before);
});
