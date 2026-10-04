// Fault injection: errors, broken invariants and failing storage must leave
// the engine in a safe state (game over, no timers), reported, with the last
// good save kept.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GameManager, createMemoryStorage } from '../public/game/gameManager.js';
import { GameState, PlayerAction } from '../public/game/gameState.js';
import { PieceColors } from '../public/game/tetrominoFactory.js';
import { createFakeScheduler, dropVerticalIIntoColumn9, fillRows, filled, fixedFactory, newGame, pieceByColor, repeatUntil } from './helpers.js';

// A factory that works until told to fail.
function breakableFactory(color = PieceColors.yellow) {
  const factory = { broken: false, generate: () => {
    if (factory.broken) throw new Error('factory failure');
    return pieceByColor(color);
  } };
  return factory;
}

function recordingGame(options = {}) {
  const reported = [];
  const result = newGame({ onFault: fault => reported.push(fault), ...options });
  return { ...result, reported };
}

function assertSafeStop(game, scheduler, reported, reason) {
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0, 'every timer stopped');
  assert.equal(game.gameLoopTask, null);
  assert.equal(game.lockDelayTask, null);
  assert.equal(reported.length, 1);
  assert.equal(reported[0].reason, reason);
  assert.deepEqual(game.faults, reported);
}

test('an error during a player action stops the game safely and is reported [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  factory.broken = true;
  assert.doesNotThrow(() => game.handleAction(PlayerAction.drop));
  assertSafeStop(game, scheduler, reported, 'unexpected error');
  assert.equal(reported[0].error.message, 'factory failure');
});

test('the page is told about a fault too, so it shows the stopped game [SAF-3] [DSP-5]', () => {
  const factory = breakableFactory();
  let changes = 0;
  const { game } = recordingGame({ factory, onChange: () => { changes += 1; } });
  changes = 0;
  factory.broken = true;
  game.handleAction(PlayerAction.drop);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(changes, 1);
});

test('an error inside a timer stops the game safely and is reported [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  repeatUntil(() => game.isOnSurface, () => game.softDrop(), 'the piece landing'); // lock delay running
  factory.broken = true;
  assert.doesNotThrow(() => scheduler.advance(500));
  assertSafeStop(game, scheduler, reported, 'unexpected error');
});

test('an error inside the gravity timer stops the game safely and is reported [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  repeatUntil(() => game.currentTetromino.dropDistance(game.gameBoard) === 1, () => game.softDrop(), 'the piece one row above landing');
  game.lockDelayResetCount = 15; // the landing locks at once
  game.lowestRowReached = game.currentTetromino.position.row + 1;
  assert.equal(game.lockDelayTask, null);
  assert.equal(scheduler.pending, 1, 'only gravity is waiting');
  factory.broken = true;
  assert.doesNotThrow(() => scheduler.advance(700));
  assertSafeStop(game, scheduler, reported, 'unexpected error');
  assert.equal(reported[0].error.message, 'factory failure');
});

test('an error during a soft drop is contained [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  repeatUntil(() => game.currentTetromino.dropDistance(game.gameBoard) === 1, () => game.softDrop(), 'the piece one row above landing');
  game.lockDelayResetCount = 15; // the landing locks at once
  game.lowestRowReached = game.currentTetromino.position.row + 1;
  factory.broken = true;
  assert.doesNotThrow(() => game.softDrop());
  assertSafeStop(game, scheduler, reported, 'unexpected error');
});

test('after a fault the last good save is kept exactly and can still be continued [SAF-3]', () => {
  const storage = createMemoryStorage();
  const factory = breakableFactory();
  const { game, reported } = recordingGame({ factory, storage });
  game.handleAction(PlayerAction.moveLeft);
  game.togglePause(); // good save
  game.togglePause();
  const saved = storage.getItem('tetris.savedGameSession');
  factory.broken = true;
  game.handleAction(PlayerAction.drop);
  assert.equal(reported.length, 1);
  assert.equal(storage.getItem('tetris.savedGameSession'), saved, 'not rewritten');
  assert.equal(storage.getItem('tetris.isSessionSaved'), 'true', 'not forgotten');
  assert.equal(game.isSessionSaved, true);
  factory.broken = false;
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.paused);
  assert.equal(game.currentTetromino.position.column, 3);
});

test('after a fault New Game starts a clean game [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler } = recordingGame({ factory });
  game.gameBoard[19][0] = filled();
  factory.broken = true;
  game.handleAction(PlayerAction.drop);
  factory.broken = false;
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.playing);
  assert.ok(game.gameBoard.flat().every(cell => !cell.isFilled));
  scheduler.advance(700);
  assert.equal(game.currentTetromino.position.row, 1);
});

test('after a fault no action or timer restarts play or changes the game [SAF-3]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.guard(() => { throw new Error('engine failure'); });
  assertSafeStop(game, scheduler, reported, 'unexpected error');
  const snapshot = () => JSON.stringify([game.gameBoard, game.currentTetromino, game.nextTetrominos, game.heldTetromino, game.canHoldTetromino, game.score]);
  const before = snapshot();
  // Checked after each one, since some would undo another (left, then right).
  // New Game and Continue are the ways out, tested above.
  const attempts = [
    ...[PlayerAction.resume, PlayerAction.pause, PlayerAction.moveLeft, PlayerAction.moveRight, PlayerAction.rotate,
      PlayerAction.rotateCounterclockwise, PlayerAction.hold, PlayerAction.drop].map(action => [action, () => game.handleAction(action)]),
    ['soft drop', () => game.softDrop()],
    ['toggle pause', () => game.togglePause()],
    ['time passing', () => scheduler.advance(5000)]
  ];
  for (const [name, attempt] of attempts) {
    attempt();
    assert.equal(game.state, GameState.gameOver, name);
    assert.equal(scheduler.pending, 0, name);
    assert.equal(snapshot(), before, name);
  }
  assert.equal(reported.length, 1, 'nothing else went wrong');
});

// Each invariant, broken on purpose, is caught by the monitor after the next operation.
const violations = [
  ['the board losing a row', game => game.gameBoard.pop(), 'board is not 20 by 10'],
  ['a board row losing a cell', game => game.gameBoard[5].pop(), 'board is not 20 by 10'],
  ['an upcoming piece going missing', game => game.nextTetrominos.pop(), 'upcoming pieces missing'],
  ['the score turning negative', game => { game.score = -100; }, 'score is invalid'],
  ['the score becoming a fraction', game => { game.score = 12.5; }, 'score is invalid'],
  ['the piece overlapping locked blocks', game => { game.gameBoard[1][4] = filled(); }, 'piece overlaps the board'],
  ['gravity stopping while playing', game => game.stopGameLoop(), 'gravity stopped while playing'],
  ['the score not being a multiple of 100', game => { game.score = 150; }, 'score is invalid'],
  ['a lock delay running while the piece is in the air', game => game.startLockDelay(), 'lock delay running off the surface'],
  ['the piece resting with no lock delay', game => { game.gameBoard[2][4] = filled(); }, 'piece resting with no lock delay']
];

for (const [name, corrupt, reason] of violations) {
  test(`the invariant monitor catches ${name} [SAF-4]`, () => {
    const { game, scheduler, reported } = recordingGame({ factory: fixedFactory(PieceColors.yellow) });
    corrupt(game);
    game.guard(() => {});
    assertSafeStop(game, scheduler, reported, reason);
  });
}

test('the invariant monitor catches a lock delay running while paused [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.togglePause();
  game.startLockDelay();
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, 'timers running while not playing');
});

test('the invariant monitor catches timers running while paused [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.togglePause();
  game.startGameLoop();
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, 'timers running while not playing');
});

test('normal play never trips the invariant monitor [SAF-4] [SAF-6]', () => {
  const { game, scheduler, reported } = recordingGame({ factory: fixedFactory(PieceColors.cyan) });
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  game.handleAction(PlayerAction.hold);
  game.togglePause();
  game.togglePause();
  scheduler.advance(20000);
  repeatUntil(() => game.state !== GameState.playing, () => game.handleAction(PlayerAction.drop), 'the game ending');
  game.handleAction(PlayerAction.newGame);
  game.handleAction(PlayerAction.pause);
  game.handleAction(PlayerAction.continueGame);
  assert.deepEqual(reported, []);
});

test('a fault reporter that throws does not make things worse [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler } = newGame({ factory, onFault: () => { throw new Error('reporter broke'); } });
  factory.broken = true;
  assert.doesNotThrow(() => game.handleAction(PlayerAction.drop));
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
});

test('only the 20 most recent faults are kept [SAF-3]', () => {
  const { game } = recordingGame();
  for (let i = 0; i < 25; i++) game.failSafe(`fault ${i}`);
  assert.equal(game.faults.length, 20);
  assert.equal(game.faults[0].reason, 'fault 5');
  assert.equal(game.faults.at(-1).reason, 'fault 24');
});

test('by default faults are reported to the console [SAF-3]', t => {
  const logged = t.mock.method(console, 'error', () => {});
  const factory = breakableFactory();
  const { game } = newGame({ factory });
  factory.broken = true;
  game.handleAction(PlayerAction.drop);
  assert.equal(logged.mock.callCount(), 1);
  assert.equal(logged.mock.calls[0].arguments[0], 'Tetris stopped safely:');
  assert.equal(logged.mock.calls[0].arguments[1], 'unexpected error');
});

// State machine guards

test('pause is ignored unless playing, and resume unless paused [STA-2]', () => {
  const game = new GameManager({ scheduler: createFakeScheduler(), storage: createMemoryStorage() });
  game.handleAction(PlayerAction.pause);
  assert.equal(game.state, GameState.gameOver);
  game.handleAction(PlayerAction.resume);
  assert.equal(game.state, GameState.gameOver);
  game.handleAction(PlayerAction.newGame);
  game.handleAction(PlayerAction.resume);
  assert.equal(game.state, GameState.playing);
  game.handleAction(PlayerAction.pause);
  game.handleAction(PlayerAction.pause);
  assert.equal(game.state, GameState.paused);
});

test('an unknown action does nothing [STA-2]', () => {
  const { game, reported } = recordingGame();
  const before = JSON.stringify(game.currentTetromino);
  game.handleAction('fly');
  assert.equal(JSON.stringify(game.currentTetromino), before);
  assert.deepEqual(reported, []);
});

// Storage failures

function throwingReads() {
  const storage = createMemoryStorage();
  storage.getItem = () => { throw new Error('SecurityError'); };
  return storage;
}

test('storage whose reads throw still gives a playable game [SAF-2]', () => {
  const { game, reported } = recordingGame({ storage: throwingReads(), factory: fixedFactory(PieceColors.cyan) });
  assert.equal(game.highScore, 0);
  assert.equal(game.isSessionSaved, false);
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  assert.equal(game.score, 100);
  game.togglePause();
  game.handleAction(PlayerAction.newGame); // asks to give up the paused game
  game.handleAction(PlayerAction.newGame); // and confirms
  assert.equal(game.state, GameState.playing);
  assert.equal(game.score, 0);
  assert.deepEqual(reported, []);
});

test('continue with unreadable storage stays at game over [SAF-2]', () => {
  const game = new GameManager({ scheduler: createFakeScheduler(), storage: throwingReads() });
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.gameOver);
});

test('a stored high score that is negative or fractional reads as 0 [SAF-2]', () => {
  for (const value of ['-50', '12.5', 'Infinity', '1e400']) {
    const storage = createMemoryStorage();
    storage.setItem('tetris.highScore', value);
    assert.equal(new GameManager({ scheduler: createFakeScheduler(), storage }).highScore, 0, value);
  }
});

test('localStorage is used when the browser provides it [SAF-2]', t => {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  t.after(() => delete globalThis.localStorage);
  const game = new GameManager({ scheduler: createFakeScheduler() });
  game.highScore = 700;
  assert.equal(storage.getItem('tetris.highScore'), '700');
});

test('if touching localStorage throws, memory storage is used instead [SAF-2]', t => {
  Object.defineProperty(globalThis, 'localStorage', { get: () => { throw new Error('SecurityError'); }, configurable: true });
  t.after(() => delete globalThis.localStorage);
  const game = new GameManager({ scheduler: createFakeScheduler() });
  game.highScore = 400;
  assert.equal(game.highScore, 400);
});

test('by default gravity runs on the browser timers [PLY-2]', () => {
  const game = new GameManager({ storage: createMemoryStorage() });
  game.handleAction(PlayerAction.newGame);
  assert.notEqual(game.gameLoopTask, null);
  game.togglePause();
  assert.equal(game.gameLoopTask, null);
});

test('by default a broken invariant is reported to the console without an error object [SAF-4]', t => {
  const logged = t.mock.method(console, 'error', () => {});
  const { game } = newGame();
  game.nextTetrominos.pop();
  game.guard(() => {});
  assert.deepEqual(logged.mock.calls[0].arguments, ['Tetris stopped safely:', 'upcoming pieces missing', '']);
});
