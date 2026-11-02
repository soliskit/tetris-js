// Rule-derived save oracle. It reads the retained geometry table, not the
// production parser, piece cells, validity checker or serializer round-trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GameManager,
  createMemoryStorage
} from '../public/game/gameManager.js';
import { PlayerAction, GameState } from '../public/game/gameState.js';
import {
  createFakeScheduler,
  newGame,
  seededRandom,
  repeatUntil,
  pieceByColor
} from './helpers.js';
import { TetrominoFactory } from '../public/game/tetrominoFactory.js';

const colors = {
  '#00C0E8': 'I',
  '#FFCC00': 'O',
  '#AF52DE': 'T',
  '#34C759': 'S',
  '#FF3B30': 'Z',
  '#007AFF': 'J',
  '#FF9500': 'L'
};
const geometry = new Map();
let kind;
for (const line of fs
  .readFileSync(
    new URL('../docs/sources/2-srs_table.txt', import.meta.url),
    'utf8'
  )
  .split('\n')) {
  if (/^[IOTSZJL] /.test(line)) kind = line[0];
  const state = line.match(/state (\d): (.*)/);
  if (state)
    geometry.set(
      kind + state[1],
      [...state[2].matchAll(/\((\d),(\d)\)/g)].map((m) => [+m[1], +m[2]])
    );
}
function oracle(raw) {
  const envelope = JSON.parse(raw);
  assert.equal(envelope.format, 'tetris-session-envelope');
  assert.equal(envelope.available, true);
  const data = JSON.parse(envelope.position);
  assert.equal(data.gameBoard.length, 20);
  for (const row of data.gameBoard) {
    assert.equal(row.length, 10);
    for (const cell of row) {
      assert.equal(typeof cell.isFilled, 'boolean');
      assert.ok(cell.isFilled ? colors[cell.color] : cell.color === null);
    }
  }
  const piece = data.currentTetromino;
  const name = colors[piece.color];
  assert.ok(name);
  assert.ok(Number.isInteger(piece.rotationState));
  // B2/PCE-4 permits only O's first state even though the table repeats it.
  assert.ok(
    piece.rotationState >= 0 && piece.rotationState < (name === 'O' ? 1 : 4)
  );
  assert.ok(Number.isInteger(piece.position.row));
  assert.ok(Number.isInteger(piece.position.column));
  const cells = geometry
    .get(name + piece.rotationState)
    .map(([r, c]) => [r + piece.position.row, c + piece.position.column]);
  for (const [r, c] of cells) {
    assert.ok(r >= 0 && r < 20 && c >= 0 && c < 10);
    assert.equal(data.gameBoard[r][c].isFilled, false);
  }
  assert.ok(Number.isSafeInteger(data.score) && data.score >= 0);
  assert.equal(data.nextTetrominos.length, 3);
  for (const q of data.nextTetrominos) assert.ok(colors[q.color]);
  assert.ok(data.heldTetromino === null || colors[data.heldTetromino.color]);
  assert.equal(typeof data.canHoldTetromino, 'boolean');
  assert.ok(Array.isArray(data.bag));
  assert.equal(new Set(data.bag).size, data.bag.length);
  for (const color of data.bag) assert.ok(colors[color]);
  assert.ok(
    Number.isInteger(data.lockDelayResetCount) &&
      data.lockDelayResetCount >= 0 &&
      data.lockDelayResetCount <= 16
  );
  const resting = cells.some(
    ([r, c]) => r === 19 || data.gameBoard[r + 1][c].isFilled
  );
  if (data.lockDelayResetCount === 16) assert.ok(resting);
  assert.ok(
    Number.isInteger(data.lowestRowReached) &&
      data.lowestRowReached >= Math.max(...cells.map(([r]) => r)) &&
      data.lowestRowReached <= 19
  );
  return data;
}

test('normal-action saves satisfy a rule-derived geometry and validity oracle [STA-4] [SAF-1] [PLY-6]', () => {
  let checked = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const { game, storage, scheduler } = newGame({
      factory: new TetrominoFactory(seededRandom(seed))
    });
    const random = seededRandom(seed + 900);
    for (let step = 0; step < 70 && game.state === GameState.playing; step++) {
      const actions = [
        PlayerAction.moveLeft,
        PlayerAction.moveRight,
        PlayerAction.rotate,
        PlayerAction.rotateCounterclockwise,
        PlayerAction.hold
      ];
      if (random() < 0.6)
        game.handleAction(actions[Math.floor(random() * actions.length)]);
      else game.softDrop();
      if (step % 5 === 0) {
        game.handleAction(PlayerAction.pause);
        const raw = storage.getItem('tetris.savedGameSession');
        const data = oracle(raw);
        checked++;
        const other = new GameManager({
          storage,
          scheduler: createFakeScheduler()
        });
        other.handleAction(PlayerAction.continueGame);
        assert.equal(other.state, GameState.paused);
        assert.equal(other.lowestRowReached, data.lowestRowReached);
        assert.equal(other.lockDelayResetCount, data.lockDelayResetCount);
        game.handleAction(PlayerAction.resume);
      }
      scheduler.advance(20);
    }
    assert.equal(game.faults.length, 0);
  }
  assert.ok(checked >= 300);
});

test('independent oracle covers paused resting16 and completed-save fault retention [STA-4] [SAF-3] [PLY-6]', () => {
  const storage = createMemoryStorage();
  const game = new GameManager({
    storage,
    scheduler: createFakeScheduler(),
    onFault: () => {}
  });
  game.handleAction(PlayerAction.newGame);
  repeatUntil(
    () => game.isOnSurface,
    () => game.softDrop(),
    'resting piece'
  );
  for (let i = 0; i < 15; i++)
    game.handleAction(i % 2 ? PlayerAction.moveRight : PlayerAction.moveLeft);
  assert.equal(game.lockDelayResetCount, 15);
  game.handleAction(PlayerAction.pause);
  const raw = storage.getItem('tetris.savedGameSession');
  assert.equal(oracle(raw).lockDelayResetCount, 16);
  game.guard(() => {
    throw new Error('after complete');
  });
  assert.equal(storage.getItem('tetris.savedGameSession'), raw);
  oracle(raw);
});

test('rotation advances occupied-block history without moving the anchor [STA-4] [PLY-6]', () => {
  const { game, storage } = newGame();
  // Pin the I kind from the published table. Its horizontal state occupies row1;
  // clockwise rotation occupies rows0..3 without changing the anchor.
  game.currentTetromino = pieceByColor('#00C0E8').spawned(10);
  game.lowestRowReached = 1;
  game.lockDelayResetCount = 7;
  const anchor = { ...game.currentTetromino.position };
  game.handleAction(PlayerAction.rotate);
  assert.deepEqual(game.currentTetromino.position, anchor);
  assert.equal(game.lowestRowReached, 3);
  assert.equal(game.lockDelayResetCount, 0);
  game.handleAction(PlayerAction.pause);
  assert.equal(
    oracle(storage.getItem('tetris.savedGameSession')).lowestRowReached,
    3
  );
});

test('independent oracle checks saves after each line-clear size and Hold [STA-4] [SAF-1] [PLY-7]', () => {
  for (let lines = 1; lines <= 4; lines++) {
    const { game, storage } = newGame({
      factory: new TetrominoFactory(seededRandom(lines))
    });
    game.handleAction(PlayerAction.hold);
    game.currentTetromino = pieceByColor('#00C0E8').spawned(10);
    for (let row = 20 - lines; row < 20; row++)
      for (let column = 0; column < 9; column++)
        game.gameBoard[row][column] = { isFilled: true, color: '#007AFF' };
    game.handleAction(PlayerAction.rotate);
    for (let i = 0; i < 4; i++) game.handleAction(PlayerAction.moveRight);
    game.handleAction(PlayerAction.drop);
    const expectedScore = [0, 100, 300, 500, 800][lines];
    assert.equal(game.score, expectedScore);
    const data = oracle(storage.getItem('tetris.savedGameSession'));
    assert.equal(data.score, expectedScore);
    assert.ok(data.heldTetromino);
    assert.equal(data.canHoldTetromino, true);
    assert.equal(
      data.gameBoard.flat().filter((cell) => cell.isFilled).length,
      4 - lines
    );
  }
});

test('independent oracle permits full rows, nonmultiple score and earlier deeper history [STA-4] [SAF-1]', () => {
  const { game, storage } = newGame();
  game.gameBoard[19] = Array.from({ length: 10 }, () => ({
    isFilled: true,
    color: '#007AFF'
  }));
  game.lowestRowReached = 19;
  game.score = 151;
  game.handleAction(PlayerAction.pause);
  const data = oracle(storage.getItem('tetris.savedGameSession'));
  assert.equal(data.score, 151);
  assert.equal(data.lowestRowReached, 19);
  assert.ok(data.gameBoard[19].every((cell) => cell.isFilled));
});
