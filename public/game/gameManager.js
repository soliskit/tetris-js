// Port of GameManager.swift. Swift Tasks become setTimeout handles; the
// scheduler, storage and piece factory are injectable so the engine can run
// in Node tests without a browser.

import { below, position } from './position.js';
import { GameState, PlayerAction, cellAt, createBoard } from './gameState.js';
import { Tetromino } from './tetromino.js';
import { TetrominoFactory } from './tetrominoFactory.js';

const HIGH_SCORE_KEY = 'highScore';
const IS_SESSION_SAVED_KEY = 'isSessionSaved';
const SAVED_SESSION_KEY = 'savedGameSession';
const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };

export function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function defaultStorage() {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch {
    // Access can throw in private mode or sandboxed frames.
  }
  return createMemoryStorage();
}

const defaultScheduler = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: handle => globalThis.clearTimeout(handle)
};

export class GameManager {
  constructor({ storage = defaultStorage(), scheduler = defaultScheduler, factory = new TetrominoFactory() } = {}) {
    this.storage = storage;
    this.scheduler = scheduler;
    this.factory = factory;
    this.rows = 20;
    this.columns = 10;
    this.gameLoopTask = null;
    this.lockDelayTask = null;
    this.lockDelayResetCount = 0;
    this.lowestRowReached = 0;
    this.maxLockDelayResets = 15;
    this.lockDelayInterval = 0.5;
    this.canHoldTetromino = true;
    this.heldTetromino = null;
    this.state = GameState.gameOver;
    this.score = 0;
    this.level = 1;
    this.currentTetromino = this.factory.generate().spawned(this.columns);
    this.nextTetrominos = [0, 1, 2].map(() => this.factory.generate());
    this.gameBoard = createBoard(this.rows, this.columns);
  }

  // @AppStorage equivalents

  get highScore() {
    return Number(this.storage.getItem(HIGH_SCORE_KEY)) || 0;
  }

  set highScore(value) {
    this.storage.setItem(HIGH_SCORE_KEY, String(value));
  }

  get isSessionSaved() {
    return this.storage.getItem(IS_SESSION_SAVED_KEY) === 'true';
  }

  set isSessionSaved(value) {
    this.storage.setItem(IS_SESSION_SAVED_KEY, value ? 'true' : 'false');
  }

  get standardDropInterval() {
    return Math.max(0.25, 0.7 - 0.02 * (this.level - 1));
  }

  resetGameSession() {
    this.state = GameState.paused;
    this.gameBoard = createBoard(this.rows, this.columns);
    this.score = 0;
    this.level = 1;
    this.currentTetromino = this.factory.generate().spawned(this.columns);
    this.nextTetrominos = [0, 1, 2].map(() => this.factory.generate());
    this.heldTetromino = null;
    this.canHoldTetromino = true;
    this.resetLockDelayForNewPiece();
    this.isSessionSaved = false;
  }

  loadGameSession() {
    let session = null;
    if (this.isSessionSaved) {
      try {
        session = JSON.parse(this.storage.getItem(SAVED_SESSION_KEY));
      } catch {
        session = null;
      }
    }
    if (!session) {
      this.isSessionSaved = false;
      return;
    }
    this.state = GameState.paused;
    this.gameBoard = session.gameBoard;
    this.score = session.score;
    this.level = session.level;
    this.currentTetromino = Tetromino.fromJSON(session.currentTetromino);
    this.nextTetrominos = session.nextTetrominos.map(Tetromino.fromJSON);
    this.heldTetromino = session.heldTetromino ? Tetromino.fromJSON(session.heldTetromino) : null;
    this.canHoldTetromino = session.canHoldTetromino;
    this.resetLockDelayForNewPiece();
  }

  saveGameSession() {
    const gameSession = {
      gameBoard: this.gameBoard,
      score: this.score,
      level: this.level,
      currentTetromino: this.currentTetromino,
      nextTetrominos: this.nextTetrominos,
      heldTetromino: this.heldTetromino,
      canHoldTetromino: this.canHoldTetromino
    };
    try {
      this.storage.setItem(SAVED_SESSION_KEY, JSON.stringify(gameSession));
      this.isSessionSaved = true;
    } catch {
      this.isSessionSaved = false;
    }
  }

  generateNextTetromino() {
    this.currentTetromino = this.nextTetrominos.shift().spawned(this.columns);
    this.nextTetrominos.push(this.factory.generate());
    this.canHoldTetromino = true;
    this.resetLockDelayForNewPiece();

    if (!this.currentTetromino.fits(this.gameBoard)) {
      this.state = GameState.gameOver;
      this.isSessionSaved = false;
      this.stopGameLoop();
    }
  }

  dropTetromino() {
    if (this.state !== GameState.playing) return;
    if (this.currentTetromino.fits(this.gameBoard, below(this.currentTetromino.position))) {
      this.currentTetromino.position = below(this.currentTetromino.position);
      this.cancelLockDelay();
      this.noteLowestRow();
    } else {
      this.pieceLanded();
    }
    if (this.state === GameState.playing) {
      this.startGameLoop();
    }
  }

  get isOnSurface() {
    return !this.currentTetromino.fits(this.gameBoard, below(this.currentTetromino.position));
  }

  startLockDelay() {
    if (this.lockDelayTask !== null) this.scheduler.clearTimeout(this.lockDelayTask);
    this.lockDelayTask = this.scheduler.setTimeout(() => {
      if (this.state !== GameState.playing) return;
      this.lockAndSpawnNext();
      if (this.state === GameState.playing) this.startGameLoop();
    }, this.lockDelayInterval * 1000);
  }

  pieceLanded() {
    if (this.lockDelayTask !== null) return;
    if (this.lockDelayResetCount >= this.maxLockDelayResets) {
      this.lockAndSpawnNext();
    } else {
      this.startLockDelay();
    }
  }

  resetLockDelay() {
    this.noteLowestRow();
    if (this.lockDelayTask === null) return;
    if (!this.isOnSurface) {
      this.cancelLockDelay();
      this.lockDelayResetCount += 1;
    } else if (this.lockDelayResetCount < this.maxLockDelayResets) {
      this.lockDelayResetCount += 1;
      this.startLockDelay();
    }
  }

  noteLowestRow() {
    if (this.currentTetromino.position.row <= this.lowestRowReached) return;
    this.lowestRowReached = this.currentTetromino.position.row;
    this.lockDelayResetCount = 0;
  }

  resetLockDelayForNewPiece() {
    this.cancelLockDelay();
    this.lockDelayResetCount = 0;
    this.lowestRowReached = this.currentTetromino.position.row;
  }

  cancelLockDelay() {
    if (this.lockDelayTask !== null) this.scheduler.clearTimeout(this.lockDelayTask);
    this.lockDelayTask = null;
  }

  lockAndSpawnNext() {
    this.lockTetrominoInPlace();
    const clearedLines = this.clearFullRows();
    this.generateNextTetromino();
    if (clearedLines && this.state === GameState.playing) {
      this.saveGameSession();
    }
  }

  lockTetrominoInPlace() {
    for (const cell of this.currentTetromino.cells) {
      if (cellAt(this.gameBoard, cell.row, cell.column) !== undefined) {
        this.gameBoard[cell.row][cell.column] = { isFilled: true, color: this.currentTetromino.color };
      }
    }
  }

  clearFullRows() {
    const completedLineIndices = [];
    this.gameBoard.forEach((row, index) => {
      if (row.every(cell => cell.isFilled)) completedLineIndices.push(index);
    });
    if (completedLineIndices.length === 0) return false;
    for (const index of completedLineIndices.slice().reverse()) {
      this.gameBoard.splice(index, 1);
    }
    const newLines = createBoard(completedLineIndices.length, this.columns);
    this.gameBoard.unshift(...newLines);
    this.score += LINE_SCORES[completedLineIndices.length];
    this.level = Math.floor(this.score / 1000) + 1;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    return true;
  }

  get ghostTetromino() {
    const ghost = this.currentTetromino.copy();
    while (ghost.fits(this.gameBoard, below(ghost.position))) {
      ghost.position = below(ghost.position);
    }
    return ghost;
  }

  startGameLoop() {
    this.stopGameLoop();
    const interval = this.standardDropInterval;
    this.gameLoopTask = this.scheduler.setTimeout(() => {
      this.gameLoopTask = null;
      if (this.state !== GameState.playing) return;
      this.dropTetromino();
    }, interval * 1000);
  }

  stopGameLoop() {
    if (this.gameLoopTask !== null) this.scheduler.clearTimeout(this.gameLoopTask);
    this.gameLoopTask = null;
  }

  handleAction(action) {
    switch (action) {
      case PlayerAction.newGame:
        if (this.state !== GameState.gameOver) return;
        this.resetGameSession();
        this.state = GameState.playing;
        this.startGameLoop();
        break;
      case PlayerAction.continueGame:
        if (this.state !== GameState.gameOver) return;
        this.loadGameSession();
        break;
      case PlayerAction.pause:
        this.state = GameState.paused;
        this.stopGameLoop();
        if (this.lockDelayTask !== null) {
          this.lockDelayResetCount += 1;
        }
        this.cancelLockDelay();
        this.saveGameSession();
        break;
      case PlayerAction.resume:
        this.state = GameState.playing;
        this.startGameLoop();
        break;
      case PlayerAction.moveLeft:
        this.moveTetromino(-1);
        break;
      case PlayerAction.moveRight:
        this.moveTetromino(1);
        break;
      case PlayerAction.hold:
        this.holdTetromino();
        break;
      case PlayerAction.rotate:
        this.rotateTetromino();
        break;
      case PlayerAction.drop:
        this.hardDrop();
        break;
    }
  }

  togglePause() {
    switch (this.state) {
      case GameState.playing:
        this.handleAction(PlayerAction.pause);
        break;
      case GameState.paused:
        this.handleAction(PlayerAction.resume);
        break;
      case GameState.gameOver:
        break;
    }
  }

  softDrop() {
    this.dropTetromino();
  }

  hardDrop() {
    if (this.state !== GameState.playing) return;
    this.cancelLockDelay();
    this.currentTetromino.position = this.ghostTetromino.position;
    this.lockAndSpawnNext();
    if (this.state === GameState.playing) {
      this.startGameLoop();
    }
  }

  moveTetromino(deltaX) {
    if (this.state !== GameState.playing) return;
    const newPosition = position(this.currentTetromino.position.row, this.currentTetromino.position.column + deltaX);
    if (this.currentTetromino.fits(this.gameBoard, newPosition)) {
      this.currentTetromino.position = newPosition;
      this.resetLockDelay();
    }
  }

  holdTetromino() {
    if (this.state !== GameState.playing || !this.canHoldTetromino) return;
    this.stopGameLoop();
    this.cancelLockDelay();
    const pieceToHold = this.currentTetromino.spawned(this.columns);
    if (this.heldTetromino) {
      const incoming = this.heldTetromino.spawned(this.columns);
      if (!incoming.fits(this.gameBoard)) {
        this.state = GameState.gameOver;
        this.isSessionSaved = false;
        return;
      }
      this.currentTetromino = incoming;
      this.resetLockDelayForNewPiece();
    } else {
      this.generateNextTetromino();
    }
    this.heldTetromino = pieceToHold;
    this.canHoldTetromino = false;
    if (this.state === GameState.playing) this.startGameLoop();
  }

  rotateTetromino() {
    if (this.state !== GameState.playing) return;
    const previousState = this.currentTetromino.rotationState;
    this.currentTetromino.rotate(this.gameBoard);
    if (this.currentTetromino.rotationState !== previousState) {
      this.resetLockDelay();
    }
  }
}
