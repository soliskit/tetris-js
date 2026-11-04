import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSession,serializeSession} from '../public/game/session.js';
import {GameManager,createMemoryStorage} from '../public/game/gameManager.js';
import {PlayerAction} from '../public/game/gameState.js';
import {createFakeScheduler,repeatUntil} from './helpers.js';
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

test('in-session score validity is not the saved-score ceiling or divisibility rule [SAF-4] [SCO-2]', () => {
  const { game } = setup();
  for (const score of [151, Number.MAX_SAFE_INTEGER + 1]) {
    game.score = score;
    assert.equal(game.findInvariantViolation(), null);
  }
});

