import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSession,
  serializeSession,
  parseUniqueJSON,
  parseSavedRecord,
  serializeSavedRecord,
  hasFields
} from '../public/game/session.js';
import {
  GameManager,
  createMemoryStorage
} from '../public/game/gameManager.js';
import { PlayerAction } from '../public/game/gameState.js';
import { createFakeScheduler, repeatUntil } from './helpers.js';

const KEY = 'tetris.savedGameSession';
function setup() {
  const storage = createMemoryStorage();
  const game = new GameManager({
    storage,
    scheduler: createFakeScheduler(),
    onFault: () => {}
  });
  game.handleAction(PlayerAction.newGame);
  game.handleAction(PlayerAction.pause);
  return { storage, game };
}

test('record grammar rejects duplicate escaped members and malformed metadata [STA-6] [SAF-1]', () => {
  const position = '{ "retained" : [1,true,null] }';
  assert.equal(
    parseSavedRecord(serializeSavedRecord(position, true)).position,
    position
  );
  for (const text of [
    'null',
    '[]',
    '{}',
    '{',
    '{"format":"wrong","available":true,"position":"x"}',
    '{"format":"tetris-session-envelope","available":"true","position":"x"}',
    '{"format":"tetris-session-envelope","available":true,"position":1}',
    '{"format":"tetris-session-envelope","available":true,"position":"x","extra":0}',
    '{"format":"tetris-session-envelope","available":true,"avail\\u0061ble":false,"position":"x"}'
  ])
    assert.equal(parseSavedRecord(text), null, text);
  assert.deepEqual(parseUniqueJSON('{"a":[{},[],{"b":3}]}'), {
    a: [{}, [], { b: 3 }]
  });
  assert.throws(() => parseUniqueJSON(''));
  assert.throws(() => parseUniqueJSON('{"a":{"x":1,"x":2}}'));
  assert.equal(hasFields(null, []), false);
});

test('withdrawn record stays unavailable after refused new save and withdrawal [STA-4] [SAF-2]', () => {
  const { storage, game } = setup();
  game.isSessionSaved = false;
  const withdrawn = storage.getItem(KEY);
  const position = parseSavedRecord(withdrawn).position;
  assert.equal(parseSavedRecord(withdrawn).available, false);
  game.score = 151;
  storage.setItem = () => {
    throw new Error('full');
  };
  game.saveGameSession();
  assert.equal(storage.getItem(KEY), withdrawn);
  const other = new GameManager({ storage, scheduler: createFakeScheduler() });
  assert.equal(other.isSessionSaved, false);
  assert.equal(parseSavedRecord(withdrawn).position, position);
});

test('complete save publishes valid position atomically and later fault retains it [STA-4] [SAF-3]', () => {
  const { storage, game } = setup();
  game.score = 151;
  game.saveGameSession();
  const completed = storage.getItem(KEY);
  const other = new GameManager({ storage, scheduler: createFakeScheduler() });
  assert.equal(other.isSessionSaved, true);
  other.handleAction(PlayerAction.continueGame);
  assert.equal(other.score, 151);
  game.failSafe('later engine fault');
  assert.equal(storage.getItem(KEY), completed);
  assert.equal(parseSavedRecord(completed).available, true);
});

test('raw old or invalid records are retained whole and unreadable records are not written [STA-6] [SAF-2]', () => {
  for (const text of [
    '{bad',
    '{"old":"layout"}',
    serializeSavedRecord('{}', true)
  ]) {
    const storage = createMemoryStorage();
    storage.setItem(KEY, text);
    const game = new GameManager({ storage, scheduler: createFakeScheduler() });
    assert.equal(game.isSessionSaved, false);
    assert.equal(storage.getItem(KEY), text);
    assert.equal(storage.getItem('tetris.isSessionSaved'), 'false');
  }
  let writes = 0;
  const game = new GameManager({
    storage: {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        writes++;
      }
    },
    scheduler: createFakeScheduler()
  });
  assert.equal(game.isSessionSaved, false);
  assert.equal(writes, 0);
});

test('persisted full rows and nonmultiple scores obey the written snapshot rules [SAF-1] [STA-4]', () => {
  const { game } = setup();
  const data = JSON.parse(serializeSession(game));
  data.gameBoard[19] = data.gameBoard[19].map(() => ({
    isFilled: true,
    color: '#007AFF'
  }));
  for (const score of [1, 151, Number.MAX_SAFE_INTEGER]) {
    data.score = score;
    assert.equal(
      parseSession(JSON.stringify(data), { rows: 20, columns: 10 }).score,
      score
    );
  }
  data.score = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(
    parseSession(JSON.stringify(data), { rows: 20, columns: 10 }),
    null
  );
});

test('count16 is only accepted resting and required history never defaults [STA-4] [PLY-6]', () => {
  const { game } = setup();
  game.handleAction(PlayerAction.resume);
  repeatUntil(
    () => game.isOnSurface,
    () => game.softDrop(),
    'resting piece'
  );
  game.lockDelayResetCount = 15;
  game.handleAction(PlayerAction.pause);
  assert.equal(game.lockDelayResetCount, 16);
  let data = JSON.parse(serializeSession(game));
  const size = { rows: 20, columns: 10 };
  assert.equal(
    parseSession(JSON.stringify(data), size).lockDelayResetCount,
    16
  );
  game.handleAction(PlayerAction.resume);
  assert.ok(
    game.gameBoard.flat().some((cell) => cell.isFilled),
    'resume16 locks at once'
  );
  data.currentTetromino.position.row = 0;
  assert.equal(parseSession(JSON.stringify(data), size), null, '16 offsurface');
  for (const field of ['lowestRowReached', 'lockDelayResetCount']) {
    data = JSON.parse(serializeSession(game));
    delete data[field];
    assert.equal(parseSession(JSON.stringify(data), size), null);
  }
});

test('lowest-row history tracks occupied current-piece blocks and allows older deeper history [STA-4] [PLY-6]', () => {
  const { game } = setup();
  const data = JSON.parse(serializeSession(game));
  const maximum = Math.max(
    ...game.currentTetromino.cells.map((cell) => cell.row)
  );
  assert.equal(game.lowestRowReached, maximum);
  for (const history of [maximum, 19]) {
    data.lowestRowReached = history;
    assert.equal(
      parseSession(JSON.stringify(data), { rows: 20, columns: 10 })
        .lowestRowReached,
      history
    );
  }
  data.lowestRowReached = maximum - 1;
  assert.equal(
    parseSession(JSON.stringify(data), { rows: 20, columns: 10 }),
    null
  );
});

test('in-session scores use the safe ceiling without divisibility [SAF-4] [SCO-2]', () => {
  const { game } = setup();
  for (const score of [151, Number.MAX_SAFE_INTEGER]) {
    game.score = score;
    assert.equal(game.findInvariantViolation(), null);
  }
  game.score = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(game.findInvariantViolation(), 'score is invalid');
});

test('record name checking visits every array element and escaped object name [STA-6] [SAF-1]', () => {
  for (const text of [
    '[{"x":1,"x":2}]',
    '[{}, {"x":1,"x":2}]',
    '{"empty":{},"later":{"x":1,"x":2}}',
    '{"empty":[],"later":{"x":1,"x":2}}',
    '[[],{},[{"x":1,"x":2}]]',
    '{"a,b:c[{}]":0,"a,b:c[{}]":1}',
    '{"a\\"b":0,"a\\"b":1}',
    '{"a\\\\b":0,"a\\\\b":1}'
  ])
    assert.throws(() => parseUniqueJSON(text), SyntaxError, text);
  for (const text of [
    '[{}, {}, []]',
    '{"empty":[],"later":{"x":1}}',
    '[{"a,b:c[{}]":"q\\"\\\\"},{}]'
  ]) {
    assert.deepEqual(parseUniqueJSON(text), JSON.parse(text));
  }
});

test('field whitelist requires all own names and non-array records [STA-6] [SAF-1]', () => {
  for (const value of [false, true, 0, '', 'x', null, [], undefined])
    assert.equal(hasFields(value, []), false);
  assert.equal(hasFields({ a: 1 }, ['a', 'b']), false);
  for (const key of ['extra', '', 'a\u0301', '__proto__', 'constructor']) {
    const record = JSON.parse(JSON.stringify({ a: 1, [key]: 2 }));
    assert.equal(hasFields(record, ['a']), false, key);
    assert.equal(hasFields(record, ['a'], [key]), true, key);
    assert.equal(hasFields(record, ['a'], ['other']), false, key);
  }
  assert.equal(hasFields({ a: 1 }, ['a']), true);
});

test('cell and piece metadata cannot bypass the exact field and type boundary [STA-6] [SAF-1]', () => {
  const { game } = setup();
  for (const change of [
    (data) => {
      data.gameBoard[19][0].isFilled = 0;
    },
    (data) => {
      data.gameBoard[19][0].extra = true;
    },
    (data) => {
      data.currentTetromino.extra = true;
    },
    (data) => {
      data.currentTetromino.position.extra = true;
    },
    (data) => {
      data.nextTetrominos[0].extra = true;
    },
    (data) => {
      data.heldTetromino = { color: '#00C0E8', extra: true };
    }
  ]) {
    const data = JSON.parse(serializeSession(game));
    change(data);
    assert.equal(
      parseSession(JSON.stringify(data), { rows: 20, columns: 10 }),
      null
    );
  }
});
