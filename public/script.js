// Browser UI: port of ContentView.swift, GameBoardView.swift,
// TetrominoPreview.swift and ButtonView.swift. All game rules live in ./game.

import { GameManager } from './game/gameManager.js';
import { GameState, PlayerAction, cellAt } from './game/gameState.js';
import { InputController } from './game/inputController.js';

const gameManager = new GameManager();
new InputController(gameManager);

const boardCanvas = document.getElementById('tetris');
const heldCanvas = document.getElementById('heldPreview');
const nextCanvases = ['next0', 'next1', 'next2'].map(id => document.getElementById(id));
const scoreLabel = document.getElementById('score');
const highScoreLabel = document.getElementById('highScore');
const gameOverControls = document.getElementById('gameOverControls');
const continueButton = document.getElementById('continueGameButton');
const keyHint = document.getElementById('keyHint');
const playPauseButton = document.getElementById('playPauseButton');

function fitCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function roundedRect(context, x, y, size, radius) {
  context.beginPath();
  context.roundRect(x, y, size, size, radius);
}

function drawBlock(context, column, row, size, color, xOffset = 0) {
  context.fillStyle = color;
  roundedRect(context, size * column + 0.5 + xOffset, size * row + 0.5, size - 1, 3);
  context.fill();
}

function drawGhostBlock(context, column, row, size, color) {
  context.save();
  context.globalAlpha = 0.5;
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  roundedRect(context, size * column + 1, size * row + 1, size - 2, 3);
  context.stroke();
  context.restore();
}

function drawBoard() {
  const { context, width, height } = fitCanvas(boardCanvas);
  const { rows, columns } = gameManager;
  const blockSize = Math.min(width / columns, height / rows);
  context.clearRect(0, 0, width, height);

  context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  context.lineWidth = 0.5;
  context.beginPath();
  for (let column = 1; column < columns; column++) {
    context.moveTo(blockSize * column, 0);
    context.lineTo(blockSize * column, blockSize * rows);
  }
  for (let row = 1; row < rows; row++) {
    context.moveTo(0, blockSize * row);
    context.lineTo(blockSize * columns, blockSize * row);
  }
  context.stroke();

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const cell = cellAt(gameManager.gameBoard, row, column);
      if (cell?.isFilled) drawBlock(context, column, row, blockSize, cell.color ?? 'transparent');
    }
  }

  const tetromino = gameManager.currentTetromino;
  for (const cell of gameManager.ghostTetromino.cells) {
    drawGhostBlock(context, cell.column, cell.row, blockSize, tetromino.color);
  }
  for (const cell of tetromino.cells) {
    drawBlock(context, cell.column, cell.row, blockSize, tetromino.color, drag.horizontalOffset);
  }
}

function drawPreview(canvas, tetromino) {
  const { context, width, height } = fitCanvas(canvas);
  context.clearRect(0, 0, width, height);
  if (!tetromino) return;
  const gridSize = 6;
  const blockSize = Math.min(width / gridSize, height / gridSize);
  const shape = tetromino.shape;
  const xOffset = (width - shape[0].length * blockSize) / 2;
  const yOffset = (height - shape.length * blockSize) / 2;
  context.save();
  context.translate(xOffset, yOffset);
  shape.forEach((blocks, row) => {
    blocks.forEach((filled, column) => {
      if (filled) drawBlock(context, column, row, blockSize, tetromino.color);
    });
  });
  context.restore();
}

function syncControls() {
  const highScore = gameManager.highScore;
  const isSessionSaved = gameManager.isSessionSaved;
  const isGameOver = gameManager.state === GameState.gameOver;
  scoreLabel.textContent = `Score: ${gameManager.score}`;
  highScoreLabel.textContent = `High Score: ${highScore}`;
  gameOverControls.hidden = !isGameOver;
  continueButton.hidden = !isSessionSaved;
  keyHint.textContent = isSessionSaved ? 'Return: New Game    C: Continue' : 'Return: New Game';
  playPauseButton.hidden = isGameOver;
  const paused = gameManager.state === GameState.paused;
  playPauseButton.innerHTML = paused ? '&#9654;' : '&#10074;&#10074;';
  playPauseButton.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
}

let lastSnapshot = '';

function render() {
  drawBoard();
  drawPreview(heldCanvas, gameManager.heldTetromino);
  nextCanvases.forEach((canvas, index) => drawPreview(canvas, gameManager.nextTetrominos[index]));
  const snapshot = `${gameManager.state}|${gameManager.score}|${gameManager.isSessionSaved}`;
  if (snapshot !== lastSnapshot) {
    lastSnapshot = snapshot;
    syncControls();
  }
  requestAnimationFrame(render);
}

// Touch and mouse gestures, ported from the DragGesture in ContentView.swift:
// drag sideways to move by whole cells, drag down to soft drop, tap to rotate.

const drag = {
  pointerId: null,
  startX: 0,
  startY: 0,
  moved: false,
  cellOffset: 0,
  rowOffset: 0,
  horizontalOffset: 0
};

function resetDragState() {
  drag.pointerId = null;
  drag.moved = false;
  drag.cellOffset = 0;
  drag.rowOffset = 0;
  drag.horizontalOffset = 0;
}

function cellWidth() {
  return boardCanvas.getBoundingClientRect().width / gameManager.columns;
}

boardCanvas.addEventListener('pointerdown', event => {
  resetDragState();
  drag.pointerId = event.pointerId;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  boardCanvas.setPointerCapture(event.pointerId);
});

boardCanvas.addEventListener('pointermove', event => {
  if (event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) < 3) return;
  drag.moved = true;
  const width = cellWidth();

  const newColumnOffset = Math.trunc(dx / width);
  const columnDelta = newColumnOffset - drag.cellOffset;
  if (columnDelta !== 0) {
    const action = columnDelta > 0 ? PlayerAction.moveRight : PlayerAction.moveLeft;
    for (let i = 0; i < Math.abs(columnDelta); i++) gameManager.handleAction(action);
    drag.cellOffset = newColumnOffset;
  }

  const fractional = dx - drag.cellOffset * width;
  const clamped = Math.max(-width * 0.5, Math.min(width * 0.5, fractional));
  const pieceColumns = gameManager.currentTetromino.cells.map(cell => cell.column);
  const leftMargin = Math.min(...pieceColumns) * width;
  const rightMargin = (gameManager.columns - 1 - Math.max(...pieceColumns)) * width;
  drag.horizontalOffset = Math.max(-leftMargin, Math.min(rightMargin, clamped));

  const newRowOffset = Math.max(0, Math.trunc(dy / width));
  const rowDelta = newRowOffset - drag.rowOffset;
  if (rowDelta > 0) {
    for (let i = 0; i < rowDelta; i++) gameManager.softDrop();
    drag.rowOffset = newRowOffset;
  }
});

function endDrag(event) {
  if (event.pointerId !== drag.pointerId) return;
  if (!drag.moved && event.type === 'pointerup') gameManager.handleAction(PlayerAction.rotate);
  resetDragState();
}

boardCanvas.addEventListener('pointerup', endDrag);
boardCanvas.addEventListener('pointercancel', endDrag);

heldCanvas.addEventListener('click', () => gameManager.handleAction(PlayerAction.hold));
document.getElementById('newGameButton').addEventListener('click', () => gameManager.handleAction(PlayerAction.newGame));
continueButton.addEventListener('click', () => gameManager.handleAction(PlayerAction.continueGame));
playPauseButton.addEventListener('click', () => gameManager.togglePause());

// Matches the scenePhase handler: pause when the page is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') return;
  resetDragState();
  if (gameManager.state === GameState.playing) gameManager.handleAction(PlayerAction.pause);
});

render();
