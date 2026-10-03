// Port of Support/GameControllerManager.swift using browser keyboard events
// and the Gamepad API. Keeps the same bindings and DAS/ARR timings.
//
// Keyboard: A/D move, W rotate, S hard drop, H hold, P or Esc pause,
// Enter new game, C continue. Arrow keys are aliases for WASD.
// Gamepad (standard mapping): stick moves and soft drops, A drop, B rotate,
// X hold, Y continue, Menu/Start pause or new game.

import { GameState, PlayerAction } from './gameState.js';

/** @typedef {import('./gameState.js').PlayerActionValue} PlayerActionValue */
/** @typedef {import('./gameManager.js').GameManager} GameManager */
/** @typedef {Pick<GameManager, 'state' | 'handleAction' | 'togglePause' | 'softDrop'>} Controllable */

const DAS_DELAY_MS = 167;
const ARR_INTERVAL_MS = 33;
const SOFT_DROP_INTERVAL_MS = 50;

/** @type {Record<string, string>} */
const KEY_ALIASES = {
  ArrowLeft: 'KeyA',
  ArrowRight: 'KeyD',
  ArrowUp: 'KeyW',
  ArrowDown: 'KeyS',
  NumpadEnter: 'Enter'
};

/** @type {Record<string, PlayerActionValue>} */
const KEY_ACTIONS = {
  KeyW: PlayerAction.rotate,
  KeyS: PlayerAction.drop,
  KeyH: PlayerAction.hold,
  Enter: PlayerAction.newGame,
  KeyC: PlayerAction.continueGame
};

// Standard gamepad mapping button indices.
const PAD_BUTTONS = { a: 0, b: 1, x: 2, y: 3, menu: 9 };
/** @type {Array<[string, PlayerActionValue]>} */
const PAD_ACTIONS = [
  ['y', PlayerAction.continueGame],
  ['b', PlayerAction.rotate],
  ['x', PlayerAction.hold],
  ['a', PlayerAction.drop]
];

export class InputController {
  /** @param {Controllable} gameManager */
  constructor(gameManager) {
    this.gameManager = gameManager;
    /** @type {PlayerActionValue | null} The move being auto repeated. */
    this.movement = null;
    /** @type {number | undefined} */
    this.movementTimer = undefined;
    /** @type {number | undefined} */
    this.softDropTimer = undefined;
    /** @type {Set<string>} */
    this.heldKeys = new Set();
    /** @type {Set<string>} */
    this.heldButtons = new Set();
    /** @type {PlayerActionValue | null} */
    this.stickDirection = null;

    window.addEventListener('keydown', event => this.handleKey(event, true));
    window.addEventListener('keyup', event => this.handleKey(event, false));
    window.addEventListener('blur', () => this.releaseAllInput());
    window.addEventListener('gamepaddisconnected', () => this.releaseAllInput());
    window.addEventListener('gamepadconnected', () => this.startPolling());
    /** Whether a poll is scheduled for the next animation frame. */
    this.polling = false;
    // Browsers usually report a gamepad only once a button is pressed, but
    // check once in case one is already available.
    this.startPolling();
  }

  // Polls every frame while a gamepad is connected, then stops, so the page
  // does not wake up every frame for nothing. An error keeps polling.
  startPolling() {
    if (this.polling) return;
    this.polling = true;
    const poll = () => {
      let connected = true;
      try {
        connected = this.pollGamepads();
      } catch (error) {
        console.error('Tetris gamepad error:', error);
      }
      if (connected) requestAnimationFrame(poll);
      else this.polling = false;
    };
    requestAnimationFrame(poll);
  }

  /**
   * @param {KeyboardEvent} event
   * @param {boolean} pressed
   */
  handleKey(event, pressed) {
    const key = KEY_ALIASES[event.code] ?? event.code;
    const modifierHeld = event.metaKey || event.ctrlKey || event.altKey;
    if (pressed) this.heldKeys.add(key);
    else this.heldKeys.delete(key);

    if (pressed && modifierHeld) return;
    const handled = key === 'KeyA' || key === 'KeyD' || key === 'KeyP' || key === 'Escape' || key in KEY_ACTIONS;
    if (!handled) return;
    event.preventDefault();
    if (pressed && event.repeat) return;

    if (key === 'KeyA' || key === 'KeyD') {
      if (pressed) {
        this.startMoving(key === 'KeyA' ? PlayerAction.moveLeft : PlayerAction.moveRight);
      } else if (this.heldKeys.has('KeyA')) {
        this.startMoving(PlayerAction.moveLeft);
      } else if (this.heldKeys.has('KeyD')) {
        this.startMoving(PlayerAction.moveRight);
      } else {
        this.stopMoving();
      }
    } else if (pressed && (key === 'KeyP' || key === 'Escape')) {
      this.gameManager.togglePause();
    } else if (pressed) {
      this.gameManager.handleAction(KEY_ACTIONS[key]);
    }
  }

  /** @returns {boolean} Whether a gamepad is connected. */
  pollGamepads() {
    if (!navigator.getGamepads) return false; // no gamepad support in this browser
    const gamepad = navigator.getGamepads().find(pad => pad?.connected);
    if (!gamepad) return false;
    const pressed = new Set(
      Object.entries(PAD_BUTTONS)
        .filter(([, index]) => gamepad.buttons[index]?.pressed)
        .map(([name]) => name)
    );
    // Browser axes are +1 down, GameController's are +1 up, so flip y.
    this.processInput(pressed, gamepad.axes[0] ?? 0, -(gamepad.axes[1] ?? 0));
    return true;
  }

  /**
   * @param {Set<string>} pressed Names of the buttons held down.
   * @param {number} xAxis Stick, -1 left to 1 right.
   * @param {number} yAxis Stick, -1 down to 1 up.
   */
  processInput(pressed, xAxis, yAxis) {
    const newPresses = new Set([...pressed].filter(button => !this.heldButtons.has(button)));
    this.heldButtons = pressed;

    if (newPresses.has('menu')) {
      if (this.gameManager.state === GameState.gameOver) {
        this.gameManager.handleAction(PlayerAction.newGame);
      } else {
        this.gameManager.togglePause();
      }
    }
    for (const [button, action] of PAD_ACTIONS) {
      if (newPresses.has(button)) this.gameManager.handleAction(action);
    }

    if (yAxis < -0.5) {
      this.startSoftDrop();
    } else {
      this.stopSoftDrop();
    }

    // Polling runs every frame, so only react to stick changes; otherwise a
    // centered stick would cancel keyboard movement.
    const direction = xAxis < -0.5 ? PlayerAction.moveLeft : xAxis > 0.5 ? PlayerAction.moveRight : null;
    if (direction === this.stickDirection) return;
    this.stickDirection = direction;
    if (direction) {
      this.startMoving(direction);
    } else {
      this.stopMoving();
    }
  }

  /** @param {PlayerActionValue} action */
  startMoving(action) {
    if (this.movement === action) return;
    this.movement = action;
    clearTimeout(this.movementTimer);
    this.gameManager.handleAction(action);
    const repeat = () => {
      if (this.gameManager.state !== GameState.playing) {
        this.stopMoving();
        return;
      }
      this.gameManager.handleAction(action);
      this.movementTimer = setTimeout(repeat, ARR_INTERVAL_MS);
    };
    this.movementTimer = setTimeout(repeat, DAS_DELAY_MS);
  }

  stopMoving() {
    clearTimeout(this.movementTimer);
    this.movementTimer = undefined;
    this.movement = null;
  }

  startSoftDrop() {
    if (this.softDropTimer !== undefined) return;
    this.softDropTimer = setInterval(() => {
      if (this.gameManager.state !== GameState.playing) {
        this.stopSoftDrop();
        return;
      }
      this.gameManager.softDrop();
    }, SOFT_DROP_INTERVAL_MS);
  }

  stopSoftDrop() {
    clearInterval(this.softDropTimer);
    this.softDropTimer = undefined;
  }

  releaseAllInput() {
    this.stopMoving();
    this.stopSoftDrop();
    this.heldButtons = new Set();
    this.stickDirection = null;
    this.heldKeys.clear();
  }
}
