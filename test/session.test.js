import { serializeSavedRecord } from '../public/game/session.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  GameManager,
  createMemoryStorage
} from '../public/game/gameManager.js';
import { GameState, PlayerAction } from '../public/game/gameState.js';
import { parseSession, serializeSession } from '../public/game/session.js';
import {
  PieceColors,
  TetrominoFactory
} from '../public/game/tetrominoFactory.js';
import {
  jsonArray,
  jsonObject,
  jsonNumber,
  jsonString,
  parseJsonObject,
  present,
  remove
} from './json.js';
import {
  createFakeScheduler,
  newGame,
  pieceByColor,
  seededRandom,
  sequenceFactory
} from './helpers.js';

const SIZE = { rows: 20, columns: 10 };

/** @typedef {import('./json.js').JsonObject} JsonObject */

// Navigation into a parsed save; each fails the test when the part is absent.
/** @param {JsonObject} data */
const boardOf = (data) => jsonArray(data.gameBoard);
/**
 * @param {JsonObject} data
 * @param {number} row
 */
const rowOf = (data, row) => jsonArray(boardOf(data)[row]);
/**
 * @param {JsonObject} data
 * @param {number} row
 * @param {number} column
 */
const cellOf = (data, row, column) => jsonObject(rowOf(data, row)[column]);
/** @param {JsonObject} data */
const currentOf = (data) => jsonObject(data.currentTetromino);
/**
 * @param {JsonObject} data
 * @param {number} index
 */
const nextOf = (data, index) =>
  jsonObject(jsonArray(data.nextTetrominos)[index]);

// A realistic save: a few locked blocks, a held piece and a moved piece.
function validSave() {
  const { game } = newGame({
    factory: sequenceFactory([
      PieceColors.purple,
      PieceColors.yellow,
      PieceColors.green,
      PieceColors.red,
      PieceColors.orange
    ])
  });
  game.handleAction(PlayerAction.hold);
  game.handleAction(PlayerAction.moveLeft);
  game.gameBoard[19][0] = { isFilled: true, color: PieceColors.cyan };
  game.gameBoard[19][1] = { isFilled: true, color: PieceColors.red };
  game.score = 1300;
  return { game, data: parseJsonObject(serializeSession(game)) };
}

void test('a saved game reads back exactly [SAF-1] [STA-4]', () => {
  const { game, data } = validSave();
  const session = present(parseSession(JSON.stringify(data), SIZE));
  assert.deepEqual(session.gameBoard, game.gameBoard);
  assert.equal(session.score, 1300);
  assert.deepEqual(session.currentTetromino, game.currentTetromino);
  assert.deepEqual(
    session.nextTetrominos.map((piece) => piece.color),
    game.nextTetrominos.map((piece) => piece.color)
  );
  assert.deepEqual(session.heldTetromino, game.heldTetromino);
  assert.equal(session.canHoldTetromino, false);
});

void test('the pieces left in the bag are saved by color and read back [SAF-1] [STA-4] [PCE-5]', () => {
  const { game } = newGame({ factory: new TetrominoFactory(seededRandom(3)) });
  const data = parseJsonObject(serializeSession(game));
  // A new game deals the current piece and three upcoming ones from a full bag.
  assert.equal(jsonArray(data.bag).length, 3);
  assert.deepEqual(
    data.bag,
    present(game.factory.bag).map((piece) => piece.color)
  );
  assert.deepEqual(
    present(parseSession(JSON.stringify(data), SIZE)).bag,
    game.factory.bag
  );
});

void test('a piece source without a bag saves an empty one [SAF-1] [STA-4]', () => {
  const { data } = validSave();
  assert.deepEqual(data.bag, []);
  assert.deepEqual(present(parseSession(JSON.stringify(data), SIZE)).bag, []);
});

void test('a save without the remaining bag is refused [SAF-1] [STA-6]', () => {
  const { data } = validSave();
  remove(data, 'bag');
  assert.equal(parseSession(JSON.stringify(data), SIZE), null);
});

void test('a save without a held piece is valid [SAF-1]', () => {
  const { data } = validSave();
  data.heldTetromino = null;
  assert.equal(
    present(parseSession(JSON.stringify(data), SIZE)).heldTetromino,
    null
  );
});

void test('saves leave out the derived level and refuse a stored level [SAF-1] [SCO-2] [STA-6]', () => {
  const { data } = validSave();
  assert.equal('level' in data, false);
  for (const level of [1, 99, null, false]) {
    data.level = level;
    assert.equal(parseSession(JSON.stringify(data), SIZE), null);
  }
});

void test('pieces are rebuilt from the built in shapes, not the stored ones [SAF-1] [PCE-2]', () => {
  const { data } = validSave();
  currentOf(data).rotations = [
    [
      [true, true, true, true],
      [true, true, true, true]
    ]
  ];
  currentOf(data).wallKickData = [];
  const session = present(parseSession(JSON.stringify(data), SIZE));
  assert.equal(session.currentTetromino.cells.length, 4);
  assert.deepEqual(
    session.currentTetromino.rotations,
    pieceByColor(jsonString(currentOf(data).color)).rotations
  );
  assert.deepEqual(
    session.currentTetromino.wallKickData,
    pieceByColor(jsonString(currentOf(data).color)).wallKickData
  );
});

void test('waiting pieces come back ready to spawn [SAF-1]', () => {
  const { data } = validSave();
  nextOf(data, 0).position = { row: 15, column: 8 };
  nextOf(data, 0).rotationState = 2;
  const next = present(parseSession(JSON.stringify(data), SIZE))
    .nextTetrominos[0];
  assert.equal(next.rotationState, 0);
  assert.equal(next.position.row, 0);
});

// Every way a save can be broken. Each must be rejected as a whole.
/** @type {Record<string, (data: JsonObject) => string | null | void>} */
const corruptions = {
  'text that is not JSON': () => '{"gameBoard": [',
  'nothing saved': () => null,
  'JSON null': () => 'null',
  'a list instead of an object': () => '[]',
  'a number': () => '42',
  'no board': (data) => {
    remove(data, 'gameBoard');
  },
  'a board with 19 rows': (data) => {
    boardOf(data).pop();
  },
  'a board row with 11 cells': (data) => {
    rowOf(data, 3).push({ isFilled: false, color: null });
  },
  'a board row that is not a list': (data) => {
    boardOf(data)[3] = 'row';
  },
  'a cell that is not an object': (data) => {
    rowOf(data, 3)[3] = 1;
  },
  'a cell without isFilled': (data) => {
    rowOf(data, 3)[3] = { color: null };
  },
  'a filled cell with an unknown color': (data) => {
    cellOf(data, 19, 0).color = '#123456';
  },
  'a filled cell without a color': (data) => {
    cellOf(data, 19, 0).color = null;
  },
  'an empty cell with a color': (data) => {
    rowOf(data, 5)[5] = { isFilled: false, color: PieceColors.red };
  },
  'a negative score': (data) => {
    data.score = -100;
  },
  'a fractional score': (data) => {
    data.score = 150.5;
  },
  'a score stored as text': (data) => {
    data.score = '1300';
  },
  'a score too large to be exact': (data) => {
    data.score = 2 ** 60;
  },
  'no current piece': (data) => {
    remove(data, 'currentTetromino');
  },
  'a current piece of an unknown type': (data) => {
    currentOf(data).color = '#000000';
  },
  'a current piece without a position': (data) => {
    remove(currentOf(data), 'position');
  },
  'a current piece at a fractional column': (data) => {
    jsonObject(currentOf(data).position).column = 2.5;
  },
  'a current piece with rotation 4': (data) => {
    currentOf(data).rotationState = 4;
  },
  'a current piece with rotation -1': (data) => {
    currentOf(data).rotationState = -1;
  },
  'a current piece with rotation 1.5': (data) => {
    currentOf(data).rotationState = 1.5;
  },
  'a current piece with a rotation one past its last': (data) => {
    currentOf(data).rotationState = pieceByColor(
      jsonString(currentOf(data).color)
    ).rotations.length;
  },
  'a current piece outside the board': (data) => {
    currentOf(data).position = { row: 0, column: -3 };
  },
  'a current piece inside locked blocks': (data) => {
    const position = jsonObject(currentOf(data).position);
    const row = jsonNumber(position.row);
    const column = jsonNumber(position.column);
    for (let r = row; r < row + 3; r++)
      for (let c = column; c < column + 3; c++) {
        if (r !== 19 || c > 3)
          rowOf(data, r)[c] = { isFilled: true, color: PieceColors.blue };
      }
  },
  'no upcoming pieces': (data) => {
    remove(data, 'nextTetrominos');
  },
  'two upcoming pieces': (data) => {
    jsonArray(data.nextTetrominos).pop();
  },
  'an upcoming piece of an unknown type': (data) => {
    nextOf(data, 1).color = 'red';
  },
  'an upcoming piece that is not an object': (data) => {
    jsonArray(data.nextTetrominos)[1] = 7;
  },
  'a held piece of an unknown type': (data) => {
    jsonObject(data.heldTetromino).color = '#ffffff';
  },
  'a held piece that is a string': (data) => {
    data.heldTetromino = 'T';
  },
  'a missing held piece field': (data) => {
    remove(data, 'heldTetromino');
  },
  'can hold stored as text': (data) => {
    data.canHoldTetromino = 'false';
  },
  'a bag that is text': (data) => {
    data.bag = 'IOT';
  },
  'a bag that is null': (data) => {
    data.bag = null;
  },
  'a bag with an unknown piece': (data) => {
    data.bag = [PieceColors.cyan, '#123456'];
  },
  'a bag with a piece stored as an object': (data) => {
    data.bag = [{ color: PieceColors.cyan }];
  },
  'a bag with the same piece twice': (data) => {
    data.bag = [PieceColors.red, PieceColors.cyan, PieceColors.red];
  }
};

for (const [name, corrupt] of Object.entries(corruptions)) {
  void test(`a save with ${name} is rejected [SAF-1]`, () => {
    const { data } = validSave();
    const replacement = corrupt(data);
    const text = replacement === undefined ? JSON.stringify(data) : replacement;
    assert.equal(parseSession(text, SIZE), null);
  });
}

// The former raw-position fixture is refused through the player's storage route.
// The older fixture remains unchanged as evidence that its layout is refused.
/** @type {Array<[string, string, (saved: JsonObject) => boolean]>} */
const savedGameFormats = [
  [
    'raw-position format',
    'saved-game-current.json',
    (saved) => !('level' in saved)
  ]
];

for (const [format, file, isThatFormat] of savedGameFormats) {
  void test(`the former ${format} is refused whole without migration [STA-6] [STA-4]`, () => {
    const text = fs.readFileSync(
      new URL(`./fixtures/${file}`, import.meta.url),
      'utf8'
    );
    assert.ok(isThatFormat(parseJsonObject(text)));
    const storage = createMemoryStorage();
    storage.setItem('tetris.savedGameSession', text);
    const game = new GameManager({ storage, scheduler: createFakeScheduler() });
    assert.equal(game.isSessionSaved, false);
    assert.equal(storage.getItem('tetris.savedGameSession'), text);
    assert.equal(storage.getItem('tetris.isSessionSaved'), 'false');
  });
}

for (const format of [
  'a stored level',
  'a missing bag',
  'a malformed current save'
]) {
  void test(`Continue refuses ${format} without deleting the save or changing the high score [STA-6] [SAF-1] [SCO-3]`, () => {
    const file =
      format === 'a stored level'
        ? 'saved-game-with-level.json'
        : 'saved-game-current.json';
    let text = fs.readFileSync(
      new URL(`./fixtures/${file}`, import.meta.url),
      'utf8'
    );
    if (format === 'a missing bag') {
      const saved = parseJsonObject(text);
      delete saved.bag;
      text = JSON.stringify(saved);
    } else if (format === 'a malformed current save') {
      text = '{not json';
    }
    const storage = createMemoryStorage();
    storage.setItem('tetris.savedGameSession', text);
    storage.setItem('tetris.isSessionSaved', 'true');
    storage.setItem('tetris.highScore', '5000');
    const game = new GameManager({ storage, scheduler: createFakeScheduler() });
    const before = {
      board: game.gameBoard,
      piece: game.currentTetromino,
      bag: [...present(game.factory.bag)]
    };
    game.handleAction(PlayerAction.continueGame);
    assert.equal(game.state, GameState.gameOver);
    assert.equal(game.isSessionSaved, false);
    assert.equal(storage.getItem('tetris.isSessionSaved'), 'false');
    assert.equal(storage.getItem('tetris.savedGameSession'), text);
    assert.equal(storage.getItem('tetris.highScore'), '5000');
    assert.equal(game.gameBoard, before.board);
    assert.equal(game.currentTetromino, before.piece);
    assert.deepEqual(game.factory.bag, before.bag);
    assert.equal(game.score, 0);
  });
}

for (const source of ['unreadable save', 'missing save', 'unavailable save']) {
  void test(`Continue with an ${source} does not write to storage [SAF-2] [STA-4]`, () => {
    const storage = createMemoryStorage();
    if (source === 'unavailable save') {
      const { data } = validSave();
      storage.setItem(
        'tetris.savedGameSession',
        serializeSavedRecord(JSON.stringify(data), false)
      );
    } else storage.setItem('tetris.isSessionSaved', 'true');
    const read = storage.getItem;
    storage.getItem = (key) => {
      if (source === 'unreadable save' && key === 'tetris.savedGameSession')
        throw new Error('SecurityError');
      return read(key);
    };
    /** @type {Array<[string, unknown]>} */
    const writes = [];
    storage.setItem = (key, value) => {
      writes.push([key, value]);
    };
    const game = new GameManager({ storage, scheduler: createFakeScheduler() });
    game.handleAction(PlayerAction.continueGame);
    assert.equal(game.state, GameState.gameOver);
    assert.deepEqual(writes, []);
  });
}

void test('Continue ignores an unreadable former flag and loads a valid envelope without writes [SAF-2] [STA-4]', () => {
  const storage = createMemoryStorage();
  storage.setItem('tetris.isSessionSaved', 'true');
  const { data } = validSave();
  storage.setItem(
    'tetris.savedGameSession',
    serializeSavedRecord(JSON.stringify(data), true)
  );
  const read = storage.getItem;
  storage.getItem = (key) => {
    if (key === 'tetris.isSessionSaved') throw new Error('SecurityError');
    return read(key);
  };
  /** @type {Array<[string, unknown]>} */
  const writes = [];
  storage.setItem = (key, value) => {
    writes.push([key, value]);
  };
  const game = new GameManager({ storage, scheduler: createFakeScheduler() });
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.paused);
  assert.deepEqual(writes, []);
});

void test('Continue leaves a valid save alone when its availability flag is false [STA-4] [SAF-2]', () => {
  const storage = createMemoryStorage();
  const { data } = validSave();
  const text = serializeSavedRecord(JSON.stringify(data), false);
  storage.setItem('tetris.savedGameSession', text);
  const read = storage.getItem;
  /** @type {string[]} */
  const reads = [];
  /** @type {Array<[string, unknown]>} */
  const writes = [];
  storage.getItem = (key) => {
    reads.push(key);
    return read(key);
  };
  storage.setItem = (key, value) => {
    writes.push([key, value]);
  };
  const game = new GameManager({ storage, scheduler: createFakeScheduler() });
  const before = {
    board: game.gameBoard,
    piece: game.currentTetromino,
    bag: [...present(game.factory.bag)]
  };
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.gameOver);
  assert.equal(game.gameBoard, before.board);
  assert.equal(game.currentTetromino, before.piece);
  assert.deepEqual(game.factory.bag, before.bag);
  assert.deepEqual(reads, ['tetris.savedGameSession']);
  assert.deepEqual(writes, []);
  assert.equal(read('tetris.savedGameSession'), text);
});

void test('refusing an old save attempts withdrawal even when the write fails [STA-6] [SAF-2]', () => {
  const storage = createMemoryStorage();
  const text = fs.readFileSync(
    new URL('./fixtures/saved-game-with-level.json', import.meta.url),
    'utf8'
  );
  storage.setItem('tetris.savedGameSession', text);
  storage.setItem('tetris.isSessionSaved', 'true');
  /** @type {Array<[string, unknown]>} */
  const writes = [];
  storage.setItem = (key, value) => {
    writes.push([key, value]);
    throw new Error('QuotaExceededError');
  };
  const game = new GameManager({ storage, scheduler: createFakeScheduler() });
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.gameOver);
  assert.deepEqual(writes, [['tetris.isSessionSaved', 'false']]);
  assert.equal(storage.getItem('tetris.savedGameSession'), text);
  assert.equal(storage.getItem('tetris.isSessionSaved'), 'true');
});

void test('a saved game stored under the names used before the game had names of its own is not read [STA-6] [APP-6]', () => {
  const storage = createMemoryStorage();
  storage.setItem(
    'savedGameSession',
    fs.readFileSync(
      new URL('./fixtures/saved-game-current.json', import.meta.url),
      'utf8'
    )
  );
  storage.setItem('isSessionSaved', 'true');
  const game = new GameManager({ storage, scheduler: createFakeScheduler() });
  assert.equal(game.isSessionSaved, false, 'Continue is not offered');
  game.handleAction(PlayerAction.continueGame);
  assert.equal(game.state, GameState.gameOver);
});

void test('the lock-delay state is saved and read back [PLY-6] [STA-4]', () => {
  const { game } = validSave();
  game.softDrop();
  game.softDrop();
  game.softDrop();
  game.lockDelayResetCount = 4; // stands in for resets burned while resting
  const data = parseJsonObject(serializeSession(game));
  assert.equal(data.lockDelayResetCount, 4);
  assert.equal(data.lowestRowReached, 4);
  const session = present(parseSession(JSON.stringify(data), SIZE));
  assert.equal(session.lockDelayResetCount, 4);
  assert.equal(session.lowestRowReached, 4);
});

void test('a save with invalid lock-delay state is refused [SAF-1] [STA-6]', () => {
  const { data } = validSave();
  /** @param {unknown} count */
  const withCount = (count) => {
    const d = parseJsonObject(JSON.stringify(data));
    d.lockDelayResetCount = count;
    return parseSession(JSON.stringify(d), SIZE);
  };
  assert.equal(withCount(16), null, '16 requires a resting piece');
  assert.equal(withCount(-1), null);
  assert.equal(withCount(1.5), null);
  assert.equal(withCount('3'), null);
  assert.notEqual(withCount(15), null);
  assert.notEqual(withCount(0), null);
  /** @param {unknown} row */
  const withRow = (row) => {
    const d = parseJsonObject(JSON.stringify(data));
    jsonObject(currentOf(d).position).row = 5;
    d.lowestRowReached = row;
    return parseSession(JSON.stringify(d), SIZE);
  };
  assert.equal(
    withRow(4),
    null,
    'a remembered low shallower than the piece is impossible'
  );
  assert.equal(withRow(5), null);
  assert.notEqual(withRow(6), null);
  assert.notEqual(
    withRow(19),
    null,
    'earlier deeper occupied-block history remains valid'
  );
  assert.equal(withRow(20), null);
  assert.equal(withRow(-1), null);
  assert.equal(withRow(2.5), null);
});

void test('a pre-fix save without the lock-delay keys is refused [STA-6]', () => {
  const { data } = validSave();
  remove(data, 'lockDelayResetCount');
  remove(data, 'lowestRowReached');
  const session = parseSession(JSON.stringify(data), SIZE);
  assert.equal(session, null);
});

void test('a save without a caller reset cap still refuses count999 [STA-6]', () => {
  const { data } = validSave();
  data.lockDelayResetCount = 999; // caller configuration cannot widen B9's fixed domain
  const session = parseSession(JSON.stringify(data), { rows: 20, columns: 10 });
  assert.equal(session, null);
});
