import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PlayerAction } from '../public/game/gameState.js';
import { parseSession, serializeSession } from '../public/game/session.js';
import { PieceColors, TetrominoFactory } from '../public/game/tetrominoFactory.js';
import { newGame, pieceByColor, seededRandom, sequenceFactory } from './helpers.js';

const SIZE = { rows: 20, columns: 10 };

// A realistic save: a few locked blocks, a held piece and a moved piece.
function validSave() {
  const { game } = newGame({ factory: sequenceFactory([PieceColors.purple, PieceColors.yellow, PieceColors.green, PieceColors.red, PieceColors.orange]) });
  game.handleAction(PlayerAction.hold);
  game.handleAction(PlayerAction.moveLeft);
  game.gameBoard[19][0] = { isFilled: true, color: PieceColors.cyan };
  game.gameBoard[19][1] = { isFilled: true, color: PieceColors.red };
  game.score = 1300;
  return { game, data: JSON.parse(serializeSession(game)) };
}

test('a saved game reads back exactly [SAF-1] [STA-4]', () => {
  const { game, data } = validSave();
  const session = parseSession(JSON.stringify(data), SIZE);
  assert.deepEqual(session.gameBoard, game.gameBoard);
  assert.equal(session.score, 1300);
  assert.equal(session.level, 2);
  assert.deepEqual(session.currentTetromino, game.currentTetromino);
  assert.deepEqual(session.nextTetrominos.map(piece => piece.color), game.nextTetrominos.map(piece => piece.color));
  assert.deepEqual(session.heldTetromino, game.heldTetromino);
  assert.equal(session.canHoldTetromino, false);
});

test('the pieces left in the bag are saved by color and read back [SAF-1] [STA-4] [PCE-5]', () => {
  const { game } = newGame({ factory: new TetrominoFactory(seededRandom(3)) });
  const data = JSON.parse(serializeSession(game));
  // A new game deals the current piece and three upcoming ones from a full bag.
  assert.equal(data.bag.length, 3);
  assert.deepEqual(data.bag, game.factory.bag.map(piece => piece.color));
  assert.deepEqual(parseSession(JSON.stringify(data), SIZE).bag, game.factory.bag);
});

test('a piece source without a bag saves an empty one [SAF-1] [STA-4]', () => {
  const { data } = validSave();
  assert.deepEqual(data.bag, []);
  assert.deepEqual(parseSession(JSON.stringify(data), SIZE).bag, []);
});

test('a save from before the bag was saved is valid and carries on with a fresh bag [SAF-1] [STA-4]', () => {
  const { data } = validSave();
  delete data.bag;
  assert.deepEqual(parseSession(JSON.stringify(data), SIZE).bag, []);
});

test('a save without a held piece is valid [SAF-1]', () => {
  const { data } = validSave();
  data.heldTetromino = null;
  assert.equal(parseSession(JSON.stringify(data), SIZE).heldTetromino, null);
});

test('the level is worked out from the score, never read from the save [SAF-1] [SCO-2]', () => {
  const { data } = validSave();
  data.level = 99;
  assert.equal(parseSession(JSON.stringify(data), SIZE).level, 2);
  delete data.level;
  assert.equal(parseSession(JSON.stringify(data), SIZE).level, 2);
});

test('pieces are rebuilt from the built in shapes, not the stored ones [SAF-1] [PCE-2]', () => {
  const { data } = validSave();
  data.currentTetromino.rotations = [[[true, true, true, true], [true, true, true, true]]];
  data.currentTetromino.wallKickData = [];
  const session = parseSession(JSON.stringify(data), SIZE);
  assert.equal(session.currentTetromino.cells.length, 4);
  assert.deepEqual(session.currentTetromino.rotations, pieceByColor(data.currentTetromino.color).rotations);
  assert.deepEqual(session.currentTetromino.wallKickData, pieceByColor(data.currentTetromino.color).wallKickData);
});

test('waiting pieces come back ready to spawn [SAF-1]', () => {
  const { data } = validSave();
  data.nextTetrominos[0].position = { row: 15, column: 8 };
  data.nextTetrominos[0].rotationState = 2;
  const next = parseSession(JSON.stringify(data), SIZE).nextTetrominos[0];
  assert.equal(next.rotationState, 0);
  assert.equal(next.position.row, 0);
});

// Every way a save can be broken. Each must be rejected as a whole.
const corruptions = {
  'text that is not JSON': () => '{"gameBoard": [',
  'nothing saved': () => null,
  'JSON null': () => 'null',
  'a list instead of an object': () => '[]',
  'a number': () => '42',
  'no board': data => { delete data.gameBoard; },
  'a board with 19 rows': data => { data.gameBoard.pop(); },
  'a board row with 11 cells': data => { data.gameBoard[3].push({ isFilled: false, color: null }); },
  'a board row that is not a list': data => { data.gameBoard[3] = 'row'; },
  'a cell that is not an object': data => { data.gameBoard[3][3] = 1; },
  'a cell without isFilled': data => { data.gameBoard[3][3] = { color: null }; },
  'a filled cell with an unknown color': data => { data.gameBoard[19][0].color = '#123456'; },
  'a filled cell without a color': data => { data.gameBoard[19][0].color = null; },
  'an empty cell with a color': data => { data.gameBoard[5][5] = { isFilled: false, color: PieceColors.red }; },
  'a full row that should have been cleared': data => {
    data.gameBoard[18] = data.gameBoard[18].map(() => ({ isFilled: true, color: PieceColors.blue }));
  },
  'a negative score': data => { data.score = -100; },
  'a fractional score': data => { data.score = 150.5; },
  'a score that is not a multiple of 100': data => { data.score = 150; },
  'a score stored as text': data => { data.score = '1300'; },
  'a score too large to be exact': data => { data.score = 2 ** 60; },
  'no current piece': data => { delete data.currentTetromino; },
  'a current piece of an unknown type': data => { data.currentTetromino.color = '#000000'; },
  'a current piece without a position': data => { delete data.currentTetromino.position; },
  'a current piece at a fractional column': data => { data.currentTetromino.position.column = 2.5; },
  'a current piece with rotation 4': data => { data.currentTetromino.rotationState = 4; },
  'a current piece with rotation -1': data => { data.currentTetromino.rotationState = -1; },
  'a current piece with rotation 1.5': data => { data.currentTetromino.rotationState = 1.5; },
  'a current piece with a rotation one past its last': data => {
    data.currentTetromino.rotationState = pieceByColor(data.currentTetromino.color).rotations.length;
  },
  'a current piece outside the board': data => { data.currentTetromino.position = { row: 0, column: -3 }; },
  'a current piece inside locked blocks': data => {
    const { row, column } = data.currentTetromino.position;
    for (let r = row; r < row + 3; r++) for (let c = column; c < column + 3; c++) {
      if (r !== 19 || c > 3) data.gameBoard[r][c] = { isFilled: true, color: PieceColors.blue };
    }
  },
  'no upcoming pieces': data => { delete data.nextTetrominos; },
  'two upcoming pieces': data => { data.nextTetrominos.pop(); },
  'an upcoming piece of an unknown type': data => { data.nextTetrominos[1].color = 'red'; },
  'an upcoming piece that is not an object': data => { data.nextTetrominos[1] = 7; },
  'a held piece of an unknown type': data => { data.heldTetromino.color = '#ffffff'; },
  'a held piece that is a string': data => { data.heldTetromino = 'T'; },
  'a missing held piece field': data => { delete data.heldTetromino; },
  'can hold stored as text': data => { data.canHoldTetromino = 'false'; },
  'a bag that is text': data => { data.bag = 'IOT'; },
  'a bag that is null': data => { data.bag = null; },
  'a bag with an unknown piece': data => { data.bag = [PieceColors.cyan, '#123456']; },
  'a bag with a piece stored as an object': data => { data.bag = [{ color: PieceColors.cyan }]; },
  'a bag with the same piece twice': data => { data.bag = [PieceColors.red, PieceColors.cyan, PieceColors.red]; }
};

for (const [name, corrupt] of Object.entries(corruptions)) {
  test(`a save with ${name} is rejected [SAF-1]`, () => {
    const { data } = validSave();
    const replacement = corrupt(data);
    const text = replacement === undefined ? JSON.stringify(data) : replacement;
    assert.equal(parseSession(text, SIZE), null);
  });
}
