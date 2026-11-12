import { test } from 'node:test';
import assert from 'node:assert/strict';
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
import { oracle } from './saveOracle.js';

void test('normal-action saves satisfy a rule-derived geometry and validity oracle [STA-4] [SAF-1] [PLY-6]', () => {
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

void test('independent oracle covers paused resting16 and completed-save fault retention [STA-4] [SAF-3] [PLY-6]', () => {
  const storage = createMemoryStorage();
  const game = new GameManager({
    storage,
    scheduler: createFakeScheduler(),
    onFault: () => {}
  });
  game.handleAction(PlayerAction.newGame);
  repeatUntil(
    () => game.isOnSurface,
    () => {
      game.softDrop();
    },
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

void test('rotation advances occupied-block history without moving the anchor [STA-4] [PLY-6]', () => {
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

void test('independent oracle checks saves after each line-clear size and Hold [STA-4] [SAF-1] [PLY-7]', () => {
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

void test('independent oracle permits full rows, nonmultiple score and earlier deeper history [STA-4] [SAF-1]', () => {
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
