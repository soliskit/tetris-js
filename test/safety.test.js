import { parseSavedRecord } from '../public/game/session.js';
// Fault injection: errors, broken invariants and failing storage must leave
// the engine in a safe state (game over, no timers), reported, with the last
// good save kept.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GameManager,
  createMemoryStorage
} from '../public/game/gameManager.js';
import { GameState, PlayerAction } from '../public/game/gameState.js';
/** @typedef {import('../public/game/gameManager.js').Fault} Fault */
/** @typedef {ReturnType<typeof createFakeScheduler>} FakeScheduler */
import { present, remove } from './json.js';
import { PieceColors } from '../public/game/tetrominoFactory.js';
import {
  createFakeScheduler,
  dropVerticalIIntoColumn9,
  fillRows,
  filled,
  fixedFactory,
  newGame,
  pieceByColor,
  repeatUntil
} from './helpers.js';

// A factory that works until told to fail.
function breakableFactory(color = PieceColors.yellow) {
  const factory = {
    broken: false,
    generate: () => {
      if (factory.broken) throw new Error('factory failure');
      return pieceByColor(color);
    }
  };
  return factory;
}

/** @param {Parameters<typeof newGame>[0]} [options] */
function recordingGame(options = {}) {
  /** @type {Fault[]} */
  const reported = [];
  const result = newGame({
    onFault: (fault) => reported.push(fault),
    ...options
  });
  return { ...result, reported };
}

/**
 * The message of a reported fault's error object; a fault without one fails.
 * @param {Fault | undefined} fault
 */
function faultMessage(fault) {
  const error = present(fault).error;
  assert.ok(typeof error === 'object' && error !== null);
  /** @type {unknown} */
  const message = Reflect.get(error, 'message');
  return message;
}

/**
 * @param {GameManager} game
 * @param {FakeScheduler} scheduler
 * @param {Fault[]} reported
 * @param {string} reason
 */
function assertSafeStop(game, scheduler, reported, reason) {
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0, 'every timer stopped');
  assert.equal(game.gameLoopTask, null);
  assert.equal(game.lockDelayTask, null);
  assert.equal(reported.length, 1);
  assert.equal(reported[0].reason, reason);
  assert.deepEqual(game.faults, reported);
}

void test('an error during a player action stops the game safely and is reported [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  factory.broken = true;
  assert.doesNotThrow(() => {
    game.handleAction(PlayerAction.drop);
  });
  assertSafeStop(game, scheduler, reported, 'unexpected error');
  assert.equal(faultMessage(reported[0]), 'factory failure');
});

void test('the page is told about a fault too, so it shows the stopped game [SAF-3] [DSP-5]', () => {
  const factory = breakableFactory();
  let changes = 0;
  const { game } = recordingGame({
    factory,
    onChange: () => {
      changes += 1;
    }
  });
  changes = 0;
  factory.broken = true;
  game.handleAction(PlayerAction.drop);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(changes, 1);
});

void test('an error inside the gravity timer stops the game safely and is reported [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  repeatUntil(
    () => game.currentTetromino.dropDistance(game.gameBoard) === 1,
    () => {
      game.softDrop();
    },
    'the piece one row above landing'
  );
  game.lockDelayResetCount = 15; // the landing locks at once
  game.lowestRowReached =
    Math.max(...game.currentTetromino.cells.map((cell) => cell.row)) + 1;
  assert.equal(game.lockDelayTask, null);
  assert.equal(scheduler.pending, 1, 'only gravity is waiting');
  factory.broken = true;
  assert.doesNotThrow(() => {
    scheduler.advance(700);
  });
  assertSafeStop(game, scheduler, reported, 'unexpected error');
  assert.equal(faultMessage(reported[0]), 'factory failure');
});

void test('after a fault the last good save is kept exactly and can still be continued [SAF-3]', () => {
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
  assert.equal(
    storage.getItem('tetris.savedGameSession'),
    saved,
    'not rewritten'
  );
  assert.equal(
    present(
      parseSavedRecord(present(storage.getItem('tetris.savedGameSession')))
    ).available,
    true,
    'not forgotten'
  );
  assert.equal(game.isSessionSaved, true);
  factory.broken = false;
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.paused);
  assert.equal(game.currentTetromino.position.column, 3);
});

void test('after a fault New Game starts a clean game [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler } = recordingGame({ factory });
  present(game.gameBoard[19])[0] = filled();
  factory.broken = true;
  game.handleAction(PlayerAction.drop);
  factory.broken = false;
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.state, GameState.playing);
  assert.ok(game.gameBoard.flat().every((cell) => !cell.isFilled));
  scheduler.advance(700);
  assert.equal(game.currentTetromino.position.row, 1);
});

void test('after a fault no action or timer restarts play or changes the game [SAF-3]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.guard(() => {
    throw new Error('engine failure');
  });
  assertSafeStop(game, scheduler, reported, 'unexpected error');
  const snapshot = () =>
    JSON.stringify([
      game.gameBoard,
      game.currentTetromino,
      game.nextTetrominos,
      game.heldTetromino,
      game.canHoldTetromino,
      game.score
    ]);
  const before = snapshot();
  // Checked after each one, since some would undo another (left, then right).
  // New Game and Continue are the ways out, tested above.
  /** @type {Array<[string, () => void]>} */
  const attempts = [
    ...[
      PlayerAction.resume,
      PlayerAction.pause,
      PlayerAction.moveLeft,
      PlayerAction.moveRight,
      PlayerAction.rotate,
      PlayerAction.rotateCounterclockwise,
      PlayerAction.hold,
      PlayerAction.drop
    ].map((action) => {
      /** @type {[string, () => void]} */
      const row = [
        action,
        () => {
          game.handleAction(action);
        }
      ];
      return row;
    }),
    [
      'soft drop',
      () => {
        game.softDrop();
      }
    ],
    [
      'toggle pause',
      () => {
        game.togglePause();
      }
    ],
    [
      'time passing',
      () => {
        scheduler.advance(5000);
      }
    ]
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
/**
 * Breaks an invariant on purpose, with a value of the wrong shape.
 * @param {object} target
 * @param {string | number} key
 * @param {unknown} value
 */
function poke(target, key, value) {
  assert.ok(Reflect.set(target, key, value));
}

/** @type {Array<[string, (game: GameManager) => unknown, string]>} */
const violations = [
  [
    'the board losing a row',
    (game) => game.gameBoard.pop(),
    'board is not 20 by 10'
  ],
  [
    'a board row losing a cell',
    (game) => game.gameBoard[5].pop(),
    'board is not 20 by 10'
  ],
  [
    'a board row going missing',
    (game) => {
      remove(game.gameBoard, 5);
    },
    'board contains an invalid cell'
  ],
  [
    'a board row losing a cell to a hole',
    (game) => {
      remove(present(game.gameBoard[5]), 4);
    },
    'board contains an invalid cell'
  ],
  [
    'a board row replaced by a sparse ten-slot list',
    (game) => {
      poke(game.gameBoard, 3, new Array(10));
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell of the wrong type',
    (game) => {
      poke(present(game.gameBoard[5]), 4, 0);
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell being null',
    (game) => {
      poke(present(game.gameBoard[5]), 4, null);
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell missing its isFilled field',
    (game) => {
      poke(present(game.gameBoard[5]), 4, { color: null });
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell missing its color field',
    (game) => {
      poke(present(game.gameBoard[5]), 4, { isFilled: true });
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell carrying an extra field',
    (game) => {
      poke(present(game.gameBoard[5]), 4, {
        isFilled: false,
        color: null,
        note: 'x'
      });
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell that is a list',
    (game) => {
      poke(
        present(game.gameBoard[5]),
        4,
        Object.assign([], {
          isFilled: false,
          color: null
        })
      );
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell inheriting isFilled',
    (game) => {
      poke(
        present(game.gameBoard[5]),
        4,
        Object.assign(Object.create({ isFilled: false }), {
          color: null,
          note: 'x'
        })
      );
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell with a hidden extra field',
    (game) => {
      poke(present(game.gameBoard[5]), 4, {
        isFilled: false,
        color: null,
        [Symbol('note')]: 'x'
      });
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell with a stray field in place of its color',
    (game) => {
      poke(present(game.gameBoard[5]), 4, { isFilled: true, note: '#00C0E8' });
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell whose isFilled is not true or false',
    (game) => {
      poke(present(game.gameBoard[5]), 4, { isFilled: 0, color: null });
    },
    'board contains an invalid cell'
  ],
  [
    'a board block with a color that is not text',
    (game) => {
      poke(present(game.gameBoard[5]), 4, { isFilled: true, color: 7 });
    },
    'board contains an invalid cell'
  ],
  [
    'a board cell holding an unknown block kind',
    (game) => {
      poke(present(game.gameBoard[5]), 4, { isFilled: true, color: '#123456' });
    },
    'board contains an invalid cell'
  ],
  [
    'an empty board cell holding a color',
    (game) => {
      poke(present(game.gameBoard[5]), 4, {
        isFilled: false,
        color: '#34C759'
      });
    },
    'board contains an invalid cell'
  ],
  [
    'an upcoming piece going missing',
    (game) => game.nextTetrominos.pop(),
    'upcoming pieces missing'
  ],
  [
    'the score turning negative',
    (game) => {
      poke(game, 'score', -100);
    },
    'score is invalid'
  ],
  [
    'the score becoming a fraction',
    (game) => {
      poke(game, 'score', 12.5);
    },
    'score is invalid'
  ],
  [
    'the piece overlapping locked blocks',
    (game) => {
      poke(present(game.gameBoard[1]), 4, filled());
    },
    'piece is invalid or overlaps the board'
  ],
  [
    'gravity stopping while playing',
    (game) => {
      game.stopGameLoop();
    },
    'gravity stopped while playing'
  ],
  [
    'a lock delay running while the piece is in the air',
    (game) => {
      game.startLockDelay();
    },
    'lock delay running off the surface'
  ],
  [
    'the piece resting with no lock delay',
    (game) => {
      poke(present(game.gameBoard[2]), 4, filled());
    },
    'piece resting with no lock delay'
  ],
  // An undefined handle is not a handle: no state lets it pass.
  [
    'gravity missing behind an undefined handle',
    (game) => {
      game.stopGameLoop();
      poke(game, 'gameLoopTask', undefined);
    },
    'gravity stopped while playing'
  ],
  [
    'the piece resting with an undefined lock delay handle',
    (game) => {
      poke(present(game.gameBoard[2]), 4, filled());
      poke(game, 'lockDelayTask', undefined);
    },
    'piece resting with no lock delay'
  ],
  [
    'an undefined lock delay handle while the piece is in the air',
    (game) => {
      poke(game, 'lockDelayTask', undefined);
    },
    'lock delay running off the surface'
  ]
];

for (const [name, corrupt, reason] of violations) {
  void test(`the invariant monitor catches ${name} [SAF-4]`, () => {
    const { game, scheduler, reported } = recordingGame({
      factory: fixedFactory(PieceColors.yellow)
    });
    corrupt(game);
    game.guard(() => {});
    assertSafeStop(game, scheduler, reported, reason);
  });
}

void test('the invariant monitor catches a lock delay running while paused [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.togglePause();
  game.startLockDelay();
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, 'timers running while not playing');
});

void test('the invariant monitor catches timers running while paused [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.togglePause();
  game.startGameLoop();
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, 'timers running while not playing');
});

void test('the invariant monitor catches an undefined timer handle while paused [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame();
  game.togglePause();
  poke(game, 'gameLoopTask', undefined);
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, 'timers running while not playing');
});

void test('normal play never trips the invariant monitor [SAF-4] [SAF-6]', () => {
  const { game, scheduler, reported } = recordingGame({
    factory: fixedFactory(PieceColors.cyan)
  });
  fillRows(game, [19], [9]);
  dropVerticalIIntoColumn9(game);
  game.handleAction(PlayerAction.hold);
  game.togglePause();
  game.togglePause();
  scheduler.advance(20000);
  repeatUntil(
    () => game.state !== GameState.playing,
    () => {
      game.handleAction(PlayerAction.drop);
    },
    'the game ending'
  );
  game.handleAction(PlayerAction.newGame);
  game.handleAction(PlayerAction.pause);
  game.handleAction(PlayerAction.continueGame);
  assert.deepEqual(reported, []);
});

void test('a fault reporter that throws does not make things worse [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler } = newGame({
    factory,
    onFault: () => {
      throw new Error('reporter broke');
    }
  });
  factory.broken = true;
  assert.doesNotThrow(() => {
    game.handleAction(PlayerAction.drop);
  });
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
});

void test('a timer cancellation that throws during a fault stop still records and reports the fault [SAF-3]', () => {
  const scheduler = createFakeScheduler();
  const clear = Reflect.get(scheduler, 'clearTimeout');
  if (typeof clear !== 'function') throw new Error('no clearTimeout');
  let armed = false;
  scheduler.clearTimeout = (handle) => {
    if (armed) throw new Error('cancel fault');
    Reflect.apply(clear, undefined, [handle]);
  };
  const { game, storage, reported } = recordingGame({
    scheduler,
    factory: fixedFactory(PieceColors.yellow)
  });
  // Rest the piece so the lock-delay timer pends alongside gravity: both
  // cancellations fail below, leaving both timers behind.
  repeatUntil(
    () => game.isOnSurface,
    () => {
      game.softDrop();
    },
    'the piece landing'
  );
  game.handleAction(PlayerAction.moveLeft);
  assert.equal(scheduler.pending, 2, 'gravity and lock delay both pending');
  const keys = [
    'tetris.savedGameSession',
    'tetris.isSessionSaved',
    'tetris.highScore'
  ];
  const boardBefore = JSON.stringify(game.gameBoard);
  const scoreBefore = game.score;
  const storedBefore = keys.map((key) => storage.getItem(key));
  armed = true;
  assert.doesNotThrow(() => {
    game.guard(() => {
      throw new Error('engine failure');
    });
  });
  assert.equal(game.state, GameState.gameOver);
  assert.deepEqual(
    game.faults.map((fault) => fault.reason),
    ['unexpected error']
  );
  assert.deepEqual(
    reported.map((fault) => fault.reason),
    ['unexpected error']
  );
  // The timers whose cancellation failed may still fire; neither may
  // change the stopped game.
  armed = false;
  // U3 allows the leftover firings; U7 sets their mere presence aside at
  // the later checks. An ignored action before they run records and
  // reports nothing further.
  game.handleAction(PlayerAction.moveLeft);
  assert.equal(game.state, GameState.gameOver);
  assert.deepEqual(
    game.faults.map((fault) => fault.reason),
    ['unexpected error']
  );
  assert.deepEqual(
    reported.map((fault) => fault.reason),
    ['unexpected error']
  );
  assert.doesNotThrow(() => {
    scheduler.advance(100000);
  });
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.equal(game.faults.length, 1);
  assert.equal(reported.length, 1);
  assert.equal(JSON.stringify(game.gameBoard), boardBefore);
  assert.equal(game.score, scoreBefore);
  assert.deepEqual(
    keys.map((key) => storage.getItem(key)),
    storedBefore
  );
});

void test('an error while checking the invariants stops the game safely, even if reporting it fails [SAF-3] [SAF-4]', () => {
  const { game, scheduler } = newGame({
    onFault: () => {
      throw new Error('reporter broke');
    }
  });
  poke(game, 'nextTetrominos', null); // breaks the check itself, not one of its invariants
  assert.doesNotThrow(() => {
    scheduler.advance(700);
  });
  assert.equal(game.state, GameState.gameOver);
  assert.equal(scheduler.pending, 0);
  assert.equal(game.faults.length, 1);
  assert.equal(game.faults[0].reason, 'unexpected error');
  assert.ok(game.faults[0].error instanceof TypeError);
});

void test('a fault record that fails does not stop the report, the redraw or the safe stop [SAF-3]', () => {
  for (const reporterWorks of [true, false]) {
    /** @type {Fault[]} */
    const reported = [];
    let changes = 0;
    const onFault = reporterWorks
      ? (/** @type {Fault} */ fault) => reported.push(fault)
      : () => {
          throw new Error('reporter broke');
        };
    const { game, scheduler } = newGame({
      onFault,
      onChange: () => {
        changes += 1;
      }
    });
    poke(game, 'faults', null); // the record itself breaks
    game.gameBoard.pop(); // and an invariant breaks, so the game must stop
    changes = 0;
    assert.doesNotThrow(() => {
      game.handleAction(PlayerAction.moveLeft);
    });
    assert.equal(game.state, GameState.gameOver);
    assert.equal(scheduler.pending, 0);
    assert.equal(changes, 1, 'the page is told');
    assert.deepEqual(
      reported.map((fault) => fault.reason),
      reporterWorks ? ['board is not 20 by 10'] : []
    );
  }
});

void test('only the 20 most recent faults are kept [SAF-3]', () => {
  const { game } = recordingGame();
  for (let i = 0; i < 25; i++) game.failSafe(`fault ${String(i)}`);
  assert.equal(game.faults.length, 20);
  assert.equal(game.faults[0].reason, 'fault 5');
  assert.equal(present(game.faults.at(-1)).reason, 'fault 24');
});

void test('by default faults are reported to the console [SAF-3]', (t) => {
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

void test('pause is ignored unless playing, and resume unless paused [STA-2]', () => {
  const game = new GameManager({
    scheduler: createFakeScheduler(),
    storage: createMemoryStorage()
  });
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

void test('an unknown action does nothing [STA-2]', () => {
  const { game, reported } = recordingGame();
  const before = JSON.stringify(game.currentTetromino);
  const handle = Reflect.get(game, 'handleAction');
  if (typeof handle !== 'function') throw new Error('no handleAction');
  Reflect.apply(handle, game, ['fly']);
  assert.equal(JSON.stringify(game.currentTetromino), before);
  assert.deepEqual(reported, []);
});

// Storage failures

function throwingReads() {
  const storage = createMemoryStorage();
  storage.getItem = () => {
    throw new Error('SecurityError');
  };
  return storage;
}

void test('storage whose reads throw still gives a playable game [SAF-2]', () => {
  const { game, reported } = recordingGame({
    storage: throwingReads(),
    factory: fixedFactory(PieceColors.cyan)
  });
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

void test('a stored high score that is negative, fractional or above the safe limit reads as 0 [SAF-2]', () => {
  for (const value of [
    '-50',
    '12.5',
    'Infinity',
    '1e400',
    '9007199254741000'
  ]) {
    const storage = createMemoryStorage();
    storage.setItem('tetris.highScore', value);
    assert.equal(
      new GameManager({ scheduler: createFakeScheduler(), storage }).highScore,
      0,
      value
    );
  }
});

void test('localStorage is used when the browser provides it [SAF-2]', (t) => {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true
  });
  t.after(() => {
    remove(globalThis, 'localStorage');
  });
  const game = new GameManager({ scheduler: createFakeScheduler() });
  game.highScore = 700;
  assert.equal(storage.getItem('tetris.highScore'), '700');
});

void test('if touching localStorage throws, memory storage is used instead [SAF-2]', (t) => {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => {
      throw new Error('SecurityError');
    },
    configurable: true
  });
  t.after(() => {
    remove(globalThis, 'localStorage');
  });
  const game = new GameManager({ scheduler: createFakeScheduler() });
  game.highScore = 400;
  assert.equal(game.highScore, 400);
});

void test('by default a broken invariant is reported to the console without an error object [SAF-4]', (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const { game } = newGame();
  game.nextTetrominos.pop();
  game.guard(() => {});
  assert.deepEqual(logged.mock.calls[0].arguments, [
    'Tetris stopped safely:',
    'upcoming pieces missing',
    ''
  ]);
});

// Piece checks: the falling piece (playing or paused) and every upcoming piece
// must be real pieces, by one shared rule.

const BAD_PIECE_REASON = 'upcoming piece is not a valid piece';
const BAD_CURRENT_REASON = 'piece is invalid or overlaps the board';

/** @type {Array<[string, (game: GameManager) => void]>} */
const malformedUpcoming = [
  [
    'a missing piece',
    (game) => {
      poke(game.nextTetrominos, 1, undefined);
    }
  ],
  [
    'a null piece',
    (game) => {
      poke(game.nextTetrominos, 0, null);
    }
  ],
  [
    'a piece with no color',
    (game) => {
      poke(game.nextTetrominos, 2, { rotations: [] });
    }
  ],
  [
    'a piece of an unknown color',
    (game) => {
      poke(present(game.nextTetrominos[1]), 'color', '#123456');
    }
  ],
  [
    'a non-text color',
    (game) => {
      poke(present(game.nextTetrominos[1]), 'color', 7);
    }
  ],
  [
    'a piece with no rotations',
    (game) => {
      poke(present(game.nextTetrominos[0]), 'rotations', undefined);
    }
  ],
  [
    'a piece with a missing rotation',
    (game) => {
      game.nextTetrominos[0].rotations.pop();
    }
  ],
  [
    'a piece with a hole in its rotations',
    (game) => {
      remove(present(game.nextTetrominos[2]).rotations, 1);
    }
  ],
  [
    'a piece with an empty shape',
    (game) => {
      game.nextTetrominos[0].rotations[0] = [];
    }
  ],
  [
    'a piece with an empty row',
    (game) => {
      poke(present(present(game.nextTetrominos[0]).rotations[0]), 1, []);
    }
  ],
  [
    'a piece with a hole in a row',
    (game) => {
      remove(present(game.nextTetrominos[0]).rotations[0][1], 2);
    }
  ],
  [
    'a piece with a non-list row',
    (game) => {
      poke(present(present(game.nextTetrominos[0]).rotations[0]), 1, 'XXXX');
    }
  ],
  [
    'a piece with a block counted as 1',
    (game) => {
      poke(
        present(present(present(game.nextTetrominos[0]).rotations[0])[1]),
        0,
        1
      );
    }
  ],
  [
    'a piece with zero blocks',
    (game) => {
      game.nextTetrominos[1].rotations[0] = [
        [false, false],
        [false, false]
      ];
    }
  ],
  [
    'a yellow piece with the wrong four blocks',
    (game) => {
      game.nextTetrominos[1].rotations[0] = [[true, true, true, true]];
    }
  ],
  [
    'a wrong block in a later rotation',
    (game) => {
      game.nextTetrominos[0].rotations[3][0][0] = true;
    }
  ],
  [
    'a hole in the list made up for by an extra property',
    (game) => {
      remove(game.nextTetrominos, 1);
      poke(game.nextTetrominos, 'extra', game.nextTetrominos[0]);
    }
  ],
  [
    'a hole in a rotation list made up for by an extra property',
    (game) => {
      remove(present(game.nextTetrominos[2]).rotations, 1);
      poke(present(game.nextTetrominos[2]).rotations, 'extra', []);
    }
  ],
  [
    'an extra rotation',
    (game) => {
      game.nextTetrominos[0].rotations.push(
        game.nextTetrominos[0].rotations[0]
      );
    }
  ],
  [
    'an extra rotation on a one-rotation piece',
    (game) => {
      game.nextTetrominos[1].rotations.push(
        game.nextTetrominos[1].rotations[0]
      );
    }
  ],
  [
    'an extra row in a shape',
    (game) => {
      game.nextTetrominos[0].rotations[2].push([false, false, false, false]);
    }
  ],
  [
    'an extra column in a row',
    (game) => {
      game.nextTetrominos[0].rotations[1][0].push(false);
    }
  ],
  [
    'a list of the right length that is not a list',
    (game) => {
      poke(game, 'nextTetrominos', { length: 3 });
    }
  ]
];

for (const [name, corrupt] of malformedUpcoming) {
  void test(`the invariant monitor catches upcoming pieces with ${name} [SAF-4]`, () => {
    const { game, scheduler, reported } = recordingGame({
      factory: fixedFactory(PieceColors.cyan)
    });
    corrupt(game);
    game.guard(() => {});
    assertSafeStop(game, scheduler, reported, BAD_PIECE_REASON);
  });
}

/** @type {Array<[string, (game: GameManager) => void]>} */
const malformedCurrent = [
  [
    'no blocks',
    (game) => {
      poke(game.currentTetromino.rotations, 0, [
        [false, false],
        [false, false]
      ]);
    }
  ],
  [
    'one block',
    (game) => {
      poke(game.currentTetromino.rotations, 0, [
        [true, false],
        [false, false]
      ]);
    }
  ],
  [
    'five blocks',
    (game) => {
      poke(game.currentTetromino.rotations, 0, [
        [true, true, true],
        [true, true, false]
      ]);
    }
  ],
  [
    'the wrong four blocks for its color',
    (game) => {
      poke(game.currentTetromino.rotations, 0, [[true, true, true, true]]);
    }
  ],
  [
    'a null piece',
    (game) => {
      poke(game, 'currentTetromino', null);
    }
  ],
  [
    'no color',
    (game) => {
      poke(game.currentTetromino, 'color', undefined);
    }
  ],
  [
    'an unknown color',
    (game) => {
      poke(game.currentTetromino, 'color', 'red');
    }
  ],
  [
    'no rotations',
    (game) => {
      poke(game.currentTetromino, 'rotations', null);
    }
  ],
  [
    'a rotation index past its last rotation',
    (game) => {
      poke(game.currentTetromino, 'rotationState', 4);
    }
  ],
  [
    'a negative rotation index',
    (game) => {
      poke(game.currentTetromino, 'rotationState', -1);
    }
  ],
  [
    'a fractional rotation index',
    (game) => {
      poke(game.currentTetromino, 'rotationState', 0.5);
    }
  ],
  [
    'a text rotation index',
    (game) => {
      poke(game.currentTetromino, 'rotationState', '0');
    }
  ],
  [
    'no position',
    (game) => {
      poke(game.currentTetromino, 'position', undefined);
    }
  ],
  [
    'a null position',
    (game) => {
      poke(game.currentTetromino, 'position', null);
    }
  ],
  [
    'a fractional row',
    (game) => {
      poke(game.currentTetromino, 'position', { row: 0.5, column: 4 });
    }
  ],
  [
    'a fractional column',
    (game) => {
      poke(game.currentTetromino, 'position', { row: 0, column: 4.5 });
    }
  ],
  [
    'a text column',
    (game) => {
      poke(game.currentTetromino, 'position', { row: 0, column: '4' });
    }
  ],
  [
    'an empty-text row that would read as row 0',
    (game) => {
      poke(game.currentTetromino, 'position', { row: '', column: 4 });
    }
  ],
  [
    'an empty-text column that would read as column 0',
    (game) => {
      poke(game.currentTetromino, 'position', { row: 0, column: '' });
    }
  ],
  [
    'a row below the board',
    (game) => {
      poke(game.currentTetromino, 'position', { row: 30, column: 4 });
    }
  ],
  [
    'a row above the board',
    (game) => {
      poke(game.currentTetromino, 'position', { row: -5, column: 4 });
    }
  ],
  [
    'a position off the board',
    (game) => {
      poke(game.currentTetromino, 'position', { row: 0, column: 40 });
    }
  ]
];

for (const paused of [false, true]) {
  for (const [name, corrupt] of malformedCurrent) {
    void test(`the invariant monitor catches a ${paused ? 'paused' : 'falling'} piece with ${name} [SAF-4]`, () => {
      const { game, scheduler, reported } = recordingGame({
        factory: fixedFactory(PieceColors.yellow)
      });
      if (paused) game.togglePause();
      corrupt(game);
      game.guard(() => {});
      assertSafeStop(game, scheduler, reported, BAD_CURRENT_REASON);
    });
  }
}

// A forged prototype entry must never stand in for a rotation the piece
// lacks: the bounds checks reject the index before any prototype lookup.

void test('a negative rotation index backed by a polluted prototype entry is caught [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame({
    factory: fixedFactory(PieceColors.cyan)
  });
  const rotations = present(game.currentTetromino).rotations;
  Array.prototype['-1'] = rotations[0];
  try {
    poke(game.currentTetromino, 'rotationState', -1);
    game.guard(() => {});
    assertSafeStop(game, scheduler, reported, BAD_CURRENT_REASON);
  } finally {
    Reflect.deleteProperty(Array.prototype, '-1');
  }
});

void test('a rotation index past its last rotation backed by a polluted prototype entry is caught [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame({
    factory: fixedFactory(PieceColors.cyan)
  });
  const rotations = present(game.currentTetromino).rotations;
  Array.prototype[rotations.length] = rotations[0];
  try {
    poke(game.currentTetromino, 'rotationState', rotations.length);
    game.guard(() => {});
    assertSafeStop(game, scheduler, reported, BAD_CURRENT_REASON);
  } finally {
    Reflect.deleteProperty(Array.prototype, String(rotations.length));
  }
});

void test('a piece with no blocks is caught even when it only waits to be dealt [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame({
    factory: fixedFactory(PieceColors.yellow)
  });
  game.nextTetrominos[2].rotations[0] = [
    [false, false],
    [false, false]
  ];
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, BAD_PIECE_REASON);
});

void test('the falling piece is not checked once the game is over [SAF-4]', () => {
  const { game, reported } = recordingGame({
    factory: fixedFactory(PieceColors.yellow)
  });
  game.failSafe('test stop');
  reported.length = 0;
  poke(game.currentTetromino, 'rotations', null);
  game.guard(() => {});
  assert.equal(reported.length, 0);
});

void test('every piece in every rotation passes the check, playing and paused [SAF-4]', () => {
  for (const color of Object.values(PieceColors)) {
    for (const paused of [false, true]) {
      const { game, reported } = recordingGame({
        factory: fixedFactory(color)
      });
      if (paused) game.togglePause();
      for (
        let rotation = 0;
        rotation < game.currentTetromino.rotations.length;
        rotation++
      ) {
        game.currentTetromino.rotationState = rotation;
        game.currentTetromino.position = { row: 3, column: 3 };
        game.guard(() => {});
      }
      assert.deepEqual(reported, []);
      assert.notEqual(game.state, GameState.gameOver);
    }
  }
});

void test('the I piece lying on the top row of its box can sit on the first board row [SAF-4]', () => {
  const { game, reported } = recordingGame({
    factory: fixedFactory(PieceColors.cyan)
  });
  game.currentTetromino.rotationState = 0;
  game.currentTetromino.position = { row: -1, column: 3 };
  game.guard(() => {});
  assert.deepEqual(reported, []);
});

void test('waiting pieces are valid wherever their stored position and rotation say [SAF-4]', () => {
  const { game, reported } = recordingGame({
    factory: fixedFactory(PieceColors.purple)
  });
  poke(present(game.nextTetrominos[0]), 'position', { row: 99, column: -7 });
  poke(present(game.nextTetrominos[0]), 'rotationState', 3);
  game.guard(() => {});
  assert.deepEqual(reported, []);
});

void test('a valid check leaves the pieces, queue order and board untouched [SAF-4]', () => {
  const { game } = recordingGame();
  const current = game.currentTetromino;
  const queue = [...game.nextTetrominos];
  const rotations = JSON.stringify(current.rotations);
  game.guard(() => {});
  assert.equal(game.currentTetromino, current);
  assert.deepEqual(game.nextTetrominos, queue);
  game.nextTetrominos.forEach((piece, index) => {
    assert.equal(piece, queue[index]);
  });
  assert.equal(JSON.stringify(current.rotations), rotations);
});

void test('damaging a piece after it is made cannot change what the check expects [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame({
    factory: fixedFactory(PieceColors.cyan)
  });
  // Cutting the piece's own kick list and rotation list short must not make a
  // shorter piece look right.
  game.currentTetromino.rotationState = 2;
  game.currentTetromino.wallKickData = [];
  game.currentTetromino.rotations.length = 1;
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, BAD_CURRENT_REASON);
});

void test('a hole in a rotation the piece is not using is still caught, playing and paused [SAF-4]', () => {
  for (const paused of [false, true]) {
    const { game, scheduler, reported } = recordingGame({
      factory: fixedFactory(PieceColors.cyan)
    });
    if (paused) game.togglePause();
    game.currentTetromino.rotations = [...game.currentTetromino.rotations];
    remove(game.currentTetromino.rotations, 2);
    game.guard(() => {});
    assertSafeStop(game, scheduler, reported, BAD_CURRENT_REASON);
  }
});

void test('a rotation index one past the last rotation is caught [SAF-4]', () => {
  const { game, scheduler, reported } = recordingGame({
    factory: fixedFactory(PieceColors.yellow)
  });
  game.currentTetromino.rotationState = 1; // the square has one rotation
  game.guard(() => {});
  assertSafeStop(game, scheduler, reported, BAD_CURRENT_REASON);
});

void test('an error during a soft drop is contained [SAF-3]', () => {
  const factory = breakableFactory();
  const { game, scheduler, reported } = recordingGame({ factory });
  repeatUntil(
    () => game.currentTetromino.dropDistance(game.gameBoard) === 1,
    () => {
      game.softDrop();
    },
    'the piece one row above landing'
  );
  game.lockDelayResetCount = 15; // the landing locks at once
  // Saved-position history uses the lowest occupied block, not the shape anchor.
  game.lowestRowReached =
    Math.max(...game.currentTetromino.cells.map((cell) => cell.row)) + 1;
  factory.broken = true;
  assert.doesNotThrow(() => {
    game.softDrop();
  });
  assertSafeStop(game, scheduler, reported, 'unexpected error');
});
