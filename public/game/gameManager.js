// Port of GameManager.swift. Swift Tasks become setTimeout handles; the
// scheduler, storage and piece factory are injectable so the engine can run
// in Node tests without a browser.
//
// Fault containment: every way into the engine (player actions, soft drop
// and timers) runs through guard(). If an operation throws, or leaves the
// game breaking one of its invariants, the engine stops in a safe state
// (game over, no timers), reports the fault and keeps the last good save.

import { below, position } from './position.js';
import { GameState, PlayerAction, cellAt, createBoard } from './gameState.js';
import { parseSession, serializeSession } from './session.js';
import { TetrominoFactory } from './tetrominoFactory.js';

const HIGH_SCORE_KEY = 'highScore';
const IS_SESSION_SAVED_KEY = 'isSessionSaved';
const SAVED_SESSION_KEY = 'savedGameSession';
const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const UPCOMING_COUNT = 3;
const MAX_FAULTS_KEPT = 20;

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

function reportToConsole(fault) {
  console.error('Tetris stopped safely:', fault.reason, fault.error ?? '');
}

export class GameManager {
  constructor({
    storage = defaultStorage(),
    scheduler = defaultScheduler,
    factory = new TetrominoFactory(),
    onFault = reportToConsole
  } = {}) {
    this.storage = storage;
    this.scheduler = scheduler;
    this.factory = factory;
    this.onFault = onFault;
    this.faults = [];
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
    this.currentTetromino = this.factory.generate().spawned(this.columns);
    this.nextTetrominos = this.generateUpcoming();
    this.gameBoard = createBoard(this.rows, this.columns);
  }

  get level() {
    return Math.floor(this.score / 1000) + 1;
  }

  generateUpcoming() {
    return Array.from({ length: UPCOMING_COUNT }, () => this.factory.generate());
  }

  // Storage (@AppStorage equivalents). Reads and writes can throw when
  // storage is blocked or full; the game keeps working either way.

  readItem(key) {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  get highScore() {
    const value = Number(this.readItem(HIGH_SCORE_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  }

  set highScore(value) {
    try {
      this.storage.setItem(HIGH_SCORE_KEY, String(value));
    } catch {
      // Not saved.
    }
  }

  get isSessionSaved() {
    return this.readItem(IS_SESSION_SAVED_KEY) === 'true';
  }

  set isSessionSaved(value) {
    try {
      this.storage.setItem(IS_SESSION_SAVED_KEY, value ? 'true' : 'false');
    } catch {
      // Not saved.
    }
  }

  get standardDropInterval() {
    return Math.max(0.25, 0.7 - 0.02 * (this.level - 1));
  }

  resetGameSession() {
    this.state = GameState.paused;
    this.gameBoard = createBoard(this.rows, this.columns);
    this.score = 0;
    this.currentTetromino = this.factory.generate().spawned(this.columns);
    this.nextTetrominos = this.generateUpcoming();
    this.heldTetromino = null;
    this.canHoldTetromino = true;
    this.resetLockDelayForNewPiece();
    this.isSessionSaved = false;
  }

  // Loads the saved game only if every part of it is valid; otherwise the
  // save is forgotten and the game stays at game over.
  loadGameSession() {
    const session = this.isSessionSaved
      ? parseSession(this.readItem(SAVED_SESSION_KEY), { rows: this.rows, columns: this.columns })
      : null;
    if (!session) {
      this.isSessionSaved = false;
      return;
    }
    this.state = GameState.paused;
    this.gameBoard = session.gameBoard;
    this.score = session.score;
    this.currentTetromino = session.currentTetromino;
    this.nextTetrominos = session.nextTetrominos;
    this.heldTetromino = session.heldTetromino;
    this.canHoldTetromino = session.canHoldTetromino;
    this.resetLockDelayForNewPiece();
  }

  saveGameSession() {
    try {
      this.storage.setItem(SAVED_SESSION_KEY, serializeSession(this));
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
    // Only runs while playing: leaving play cancels it (checked by SAF-4).
    this.lockDelayTask = this.schedule(() => {
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
    // Only runs while playing: leaving play stops it (checked by SAF-4).
    this.gameLoopTask = this.schedule(() => {
      this.gameLoopTask = null;
      this.dropTetromino();
    }, interval * 1000);
  }

  stopGameLoop() {
    if (this.gameLoopTask !== null) this.scheduler.clearTimeout(this.gameLoopTask);
    this.gameLoopTask = null;
  }

  // Fault containment

  // Timers run their callback through the guard, like player actions.
  schedule(callback, ms) {
    return this.scheduler.setTimeout(() => this.guard(callback), ms);
  }

  // Runs one operation, catching errors and checking the invariants after it.
  guard(operation) {
    try {
      operation();
    } catch (error) {
      this.failSafe('unexpected error', error);
      return;
    }
    const violation = this.findInvariantViolation();
    if (violation) this.failSafe(violation);
  }

  // Returns a description of the first broken invariant, or null.
  findInvariantViolation() {
    const board = this.gameBoard;
    if (!Array.isArray(board) || board.length !== this.rows || !board.every(row => Array.isArray(row) && row.length === this.columns)) {
      return 'board is not 20 by 10';
    }
    if (this.nextTetrominos.length !== UPCOMING_COUNT) return 'upcoming pieces missing';
    if (!Number.isSafeInteger(this.score) || this.score < 0 || this.score % 100 !== 0) return 'score is invalid';
    if (this.state === GameState.playing) {
      if (!this.currentTetromino.fits(board)) return 'piece overlaps the board';
      if (this.gameLoopTask === null) return 'gravity stopped while playing';
    } else if (this.gameLoopTask !== null || this.lockDelayTask !== null) {
      return 'timers running while not playing';
    }
    return null;
  }

  // Safe state: game over with every timer stopped. Storage is left alone,
  // so the last good save can still be continued.
  failSafe(reason, error) {
    this.state = GameState.gameOver;
    this.stopGameLoop();
    this.cancelLockDelay();
    const fault = { reason, error };
    this.faults.push(fault);
    if (this.faults.length > MAX_FAULTS_KEPT) this.faults.shift();
    try {
      this.onFault(fault);
    } catch {
      // Reporting must never make things worse.
    }
  }

  // Player input

  handleAction(action) {
    this.guard(() => this.performAction(action));
  }

  performAction(action) {
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
        if (this.state !== GameState.playing) return;
        this.state = GameState.paused;
        this.stopGameLoop();
        if (this.lockDelayTask !== null) {
          this.lockDelayResetCount += 1;
        }
        this.cancelLockDelay();
        this.saveGameSession();
        break;
      case PlayerAction.resume:
        if (this.state !== GameState.paused) return;
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
    this.handleAction(this.state === GameState.playing ? PlayerAction.pause : PlayerAction.resume);
  }

  softDrop() {
    this.guard(() => this.dropTetromino());
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
