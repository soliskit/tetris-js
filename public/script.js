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

// Canvas sizes come from a ResizeObserver instead of measuring every frame.
// Maps each canvas to { context, width, height } in CSS pixels once sized.
const canvasSizes = new Map();

function sizeCanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  // Resizing resets the context, so the scale is set again here.
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvasSizes.set(canvas, { context, width, height });
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
  const { context, width, height } = canvasSizes.get(boardCanvas);
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
  const { context, width, height } = canvasSizes.get(canvas);
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

// What each canvas showed when it was last drawn, so frames where nothing
// moved skip drawing. The engine replaces the current piece whenever the
// board changes (lock, line clear, hold, new game, continue) and replaces its
// position object on every move, so comparing references is enough.
let drawnBoard = {};
const drawnPreviews = new Map();

function boardChanged() {
  const piece = gameManager.currentTetromino;
  return piece !== drawnBoard.piece
    || piece.position !== drawnBoard.position
    || piece.rotationState !== drawnBoard.rotationState
    || gameManager.gameBoard !== drawnBoard.gameBoard
    || drag.horizontalOffset !== drawnBoard.horizontalOffset;
}

function drawIfChanged() {
  if (canvasSizes.has(boardCanvas) && boardChanged()) {
    drawBoard();
    const piece = gameManager.currentTetromino;
    drawnBoard = {
      piece,
      position: piece.position,
      rotationState: piece.rotationState,
      gameBoard: gameManager.gameBoard,
      horizontalOffset: drag.horizontalOffset
    };
  }
  const previews = [[heldCanvas, gameManager.heldTetromino]];
  nextCanvases.forEach((canvas, index) => previews.push([canvas, gameManager.nextTetrominos[index]]));
  for (const [canvas, tetromino] of previews) {
    if (!canvasSizes.has(canvas)) continue;
    if (drawnPreviews.has(canvas) && drawnPreviews.get(canvas) === tetromino) continue;
    drawPreview(canvas, tetromino);
    drawnPreviews.set(canvas, tetromino);
  }
  const snapshot = `${gameManager.state}|${gameManager.score}|${gameManager.isSessionSaved}`;
  if (snapshot !== lastSnapshot) {
    lastSnapshot = snapshot;
    syncControls();
  }
}

function redrawAll() {
  drawnBoard = {};
  drawnPreviews.clear();
  drawIfChanged();
}

function render() {
  drawIfChanged();
  requestAnimationFrame(render);
}

// Resizing a canvas clears it, so redraw in the same frame to avoid a flash.
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const { inlineSize, blockSize } = entry.contentBoxSize[0];
    sizeCanvas(entry.target, inlineSize, blockSize);
  }
  redrawAll();
});
[boardCanvas, heldCanvas, ...nextCanvases].forEach(canvas => resizeObserver.observe(canvas));

// Moving the window to a screen with a different pixel density does not
// resize anything in CSS pixels, so rebuild the canvases for the new density.
function watchPixelRatio() {
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
    for (const [canvas, { width, height }] of canvasSizes) sizeCanvas(canvas, width, height);
    redrawAll();
    watchPixelRatio();
  }, { once: true });
}
watchPixelRatio();

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

// Installable app: cache the game so it also works offline.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
