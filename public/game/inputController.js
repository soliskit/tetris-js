// Port of Support/GameControllerManager.swift using browser keyboard events
// and the Gamepad API. Keeps the same bindings and DAS/ARR timings.
//
// Keyboard: A/D move, W rotate, S hard drop, H hold, P or Esc pause,
// Enter new game, C continue. Arrow keys are aliases for WASD.
// Gamepad (standard mapping): stick moves and soft drops, A drop, B rotate,
// X hold, Y continue, Menu/Start pause or new game.

import { GameState, PlayerAction } from './gameState.js';

const DAS_DELAY_MS = 167;
const ARR_INTERVAL_MS = 33;
const SOFT_DROP_INTERVAL_MS = 50;

const KEY_ALIASES = {
  ArrowLeft: 'KeyA',
  ArrowRight: 'KeyD',
  ArrowUp: 'KeyW',
  ArrowDown: 'KeyS',
  NumpadEnter: 'Enter'
};

const KEY_ACTIONS = {
  KeyW: PlayerAction.rotate,
  KeyS: PlayerAction.drop,
  KeyH: PlayerAction.hold,
  Enter: PlayerAction.newGame,
  KeyC: PlayerAction.continueGame
};

// Standard gamepad mapping button indices.
const PAD_BUTTONS = { a: 0, b: 1, x: 2, y: 3, menu: 9 };
const PAD_ACTIONS = [
  ['y', PlayerAction.continueGame],
  ['b', PlayerAction.rotate],
  ['x', PlayerAction.hold],
  ['a', PlayerAction.drop]
];

export class InputController {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.movement = null;
    this.movementTimer = null;
    this.softDropTimer = null;
    this.heldKeys = new Set();
    this.heldButtons = new Set();
    this.stickDirection = null;

    window.addEventListener('keydown', event => this.handleKey(event, true));
    window.addEventListener('keyup', event => this.handleKey(event, false));
    window.addEventListener('blur', () => this.releaseAllInput());
    window.addEventListener('gamepaddisconnected', () => this.releaseAllInput());
    // The next poll is requested first, so an error can never stop polling.
    const poll = () => {
      requestAnimationFrame(poll);
      try {
        this.pollGamepads();
      } catch (error) {
        globalThis.console?.error('Tetris gamepad error:', error);
      }
    };
    requestAnimationFrame(poll);
  }

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

  pollGamepads() {
    const pads = navigator.getGamepads?.() ?? [];
    const gamepad = Array.from(pads).find(pad => pad && pad.connected);
    if (!gamepad) return;
    const pressed = new Set(
      Object.entries(PAD_BUTTONS)
        .filter(([, index]) => gamepad.buttons[index]?.pressed)
        .map(([name]) => name)
    );
    // Browser axes are +1 down, GameController's are +1 up, so flip y.
    this.processInput(pressed, gamepad.axes[0] ?? 0, -(gamepad.axes[1] ?? 0));
  }

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
    this.movementTimer = null;
    this.movement = null;
  }

  startSoftDrop() {
    if (this.softDropTimer !== null) return;
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
    this.softDropTimer = null;
  }

  releaseAllInput() {
    this.stopMoving();
    this.stopSoftDrop();
    this.heldButtons = new Set();
    this.stickDirection = null;
    this.heldKeys.clear();
  }
}
