import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GameState, PlayerAction } from '../public/game/gameState.js';
import { InputController } from '../public/game/inputController.js';
import { fixedFactory, newGame } from './helpers.js';
import { PieceColors } from '../public/game/tetrominoFactory.js';

// Minimal stand ins for the browser globals InputController uses.
function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const listeners = {};
  const frames = [];
  const pads = [];
  globalThis.window = {
    addEventListener: (type, listener) =>
      (listeners[type] ??= []).push(listener)
  };
  const documentListeners = {};
  globalThis.document = {
    hidden: false,
    addEventListener: (type, listener) =>
      (documentListeners[type] ??= []).push(listener)
  };
  globalThis.requestAnimationFrame = (callback) => frames.push(callback);
  Object.defineProperty(globalThis, 'navigator', {
    value: { getGamepads: () => pads },
    configurable: true,
    writable: true
  });
  t.after(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
  });

  const manager = {
    state: GameState.playing,
    isConfirmingNewGame: false,
    actions: [],
    handleAction(action) {
      this.actions.push(action);
    },
    togglePause() {
      this.actions.push('togglePause');
    },
    softDrop() {
      this.actions.push('softDrop');
    },
    cancelNewGame() {
      this.actions.push('cancelNewGame');
    }
  };
  // The New Game question's buttons, recording what the controller asks of them.
  const questionButtons = {
    move(step) {
      manager.actions.push(`move ${step}`);
    },
    press() {
      manager.actions.push('press');
    }
  };
  const controller = new InputController(manager, questionButtons);
  const fire = (type, event = {}) =>
    (listeners[type] ?? []).forEach((listener) => listener(event));
  const key = (code, pressed = true, extra = {}) => {
    const event = {
      code,
      repeat: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      prevented: false,
      ...extra
    };
    event.preventDefault = () => {
      event.prevented = true;
    };
    fire(pressed ? 'keydown' : 'keyup', event);
    return event;
  };
  const tap = (code) => {
    key(code);
    key(code, false);
  };
  // Node's mock clock only runs timers that were scheduled before a tick, so
  // advance in small steps to let repeating timers chain like they do live.
  const tick = (ms) => {
    for (let left = ms; left > 0; left -= 10)
      t.mock.timers.tick(Math.min(10, left));
  };
  const hidePage = () => {
    globalThis.document.hidden = true;
    (documentListeners.visibilitychange ?? []).forEach((listener) =>
      listener()
    );
  };
  const showPage = () => {
    globalThis.document.hidden = false;
    (documentListeners.visibilitychange ?? []).forEach((listener) =>
      listener()
    );
  };
  return {
    manager,
    controller,
    fire,
    key,
    tap,
    tick,
    pads,
    frames,
    hidePage,
    showPage
  };
}

function gamepad({ pressed = [], x = 0, y = 0 } = {}) {
  const index = {
    a: 0,
    b: 1,
    x: 2,
    y: 3,
    lb: 4,
    rb: 5,
    view: 8,
    menu: 9,
    up: 12,
    down: 13,
    left: 14,
    right: 15
  };
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  for (const name of pressed) buttons[index[name]].pressed = true;
  return { connected: true, buttons, axes: [x, y] };
}

const count = (manager, action) =>
  manager.actions.filter((a) => a === action).length;

// Keyboard

test('each action key triggers its action once per press [INP-1]', (t) => {
  const expected = {
    KeyW: PlayerAction.rotate,
    ArrowUp: PlayerAction.rotate,
    KeyZ: PlayerAction.rotateCounterclockwise,
    Space: PlayerAction.drop,
    KeyH: PlayerAction.hold,
    Enter: PlayerAction.newGame,
    NumpadEnter: PlayerAction.newGame,
    KeyC: PlayerAction.continueGame
  };
  const { manager, tap } = setup(t);
  for (const [code, action] of Object.entries(expected)) {
    manager.actions = [];
    tap(code);
    assert.deepEqual(manager.actions, [action], code);
  }
});

test('P and Escape toggle pause [INP-1]', (t) => {
  const { manager, tap } = setup(t);
  tap('KeyP');
  tap('Escape');
  assert.deepEqual(manager.actions, ['togglePause', 'togglePause']);
});

test('game keys stop the browser default, other keys do not [INP-3]', (t) => {
  const { manager, key } = setup(t);
  assert.equal(key('KeyW').prevented, true);
  assert.equal(
    key('ArrowDown').prevented,
    true,
    'arrow keys must not scroll the page'
  );
  assert.equal(key('Space').prevented, true, 'space must not scroll the page');
  assert.equal(
    key('Space', false).prevented,
    true,
    'or press an on screen button that has focus'
  );
  assert.equal(key('KeyA').prevented, true);
  assert.equal(key('KeyQ').prevented, false);
  assert.equal(key('Tab').prevented, false);
  assert.equal(count(manager, PlayerAction.rotate), 1);
});

test('keys held with Cmd, Ctrl or Alt are left to the browser [INP-3]', (t) => {
  const { manager, key } = setup(t);
  for (const modifier of ['metaKey', 'ctrlKey', 'altKey']) {
    const event = key('KeyW', true, { [modifier]: true });
    assert.equal(event.prevented, false, modifier);
    key('KeyW', false);
  }
  assert.deepEqual(manager.actions, []);
});

test('a key pressed with Cmd, Ctrl or Alt never counts as held, so a lost key release cannot leave it stuck [INP-3]', (t) => {
  const { manager, key, tick } = setup(t);
  // macOS sends no keyup for a key let go while Cmd is down.
  for (const modifier of ['metaKey', 'ctrlKey', 'altKey'])
    key('KeyA', true, { [modifier]: true });
  key('KeyD');
  key('KeyD', false);
  tick(1000);
  assert.deepEqual(manager.actions, [PlayerAction.moveRight]);
});

test('key repeat events from holding a key are ignored [INP-3]', (t) => {
  const { manager, key } = setup(t);
  key('Space');
  const repeat = key('Space', true, { repeat: true });
  assert.equal(repeat.prevented, true);
  assert.deepEqual(manager.actions, [PlayerAction.drop]);
});

test('while the pause screen asks to confirm New Game, keys are left to its dialog, except a held key repeating, Escape, which answers no, and the left and right arrows, which move between its buttons [STA-1] [INP-3]', (t) => {
  const { manager, key, tap } = setup(t);
  manager.state = GameState.paused;
  manager.isConfirmingNewGame = true;
  for (const code of [
    'Enter',
    'Space',
    'KeyP',
    'KeyC',
    'Tab',
    'KeyA',
    'KeyD'
  ]) {
    assert.equal(
      key(code).prevented,
      false,
      `${code} reaches the dialog's button`
    );
    key(code, false);
  }
  assert.equal(
    key('Enter', true, { repeat: true }).prevented,
    true,
    'the Enter that asked, still held, must not answer'
  );
  assert.deepEqual(manager.actions, []);
  assert.equal(
    key('Escape').prevented,
    true,
    'Escape answers no itself, rather than leaving the dialog to the browser'
  );
  key('Escape', true, { repeat: true });
  key('Escape', false);
  assert.deepEqual(manager.actions, ['cancelNewGame'], 'once per press');
  // The arrows, not A and D, move between the buttons, once per press.
  assert.equal(key('ArrowRight').prevented, true);
  key('ArrowRight', true, { repeat: true });
  key('ArrowRight', false);
  assert.equal(key('ArrowLeft').prevented, true);
  key('ArrowLeft', false);
  assert.deepEqual(manager.actions, ['cancelNewGame', 'move 1', 'move -1']);
  manager.actions = [];
  // A key pressed while the dialog is open does not count as held once play
  // resumes: pausing releases held keys, so resume needs a fresh press.
  key('KeyD');
  manager.isConfirmingNewGame = false;
  manager.state = GameState.playing;
  tap('KeyA');
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveLeft],
    'the key pressed during the dialog stays released'
  );
  key('KeyD', false);
  key('KeyD');
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveLeft, PlayerAction.moveRight],
    'a fresh press moves again'
  );
});

test('holding S or Down soft drops a row at once, then every 50ms until released [INP-1] [INP-2]', (t) => {
  const { manager, key, tick } = setup(t);
  key('ArrowDown');
  assert.equal(count(manager, 'softDrop'), 1);
  key('ArrowDown', true, { repeat: true });
  tick(49);
  assert.equal(count(manager, 'softDrop'), 1, 'key repeats add nothing');
  tick(1);
  assert.equal(count(manager, 'softDrop'), 2);
  tick(100);
  assert.equal(count(manager, 'softDrop'), 4);
  key('ArrowDown', false);
  tick(500);
  assert.equal(count(manager, 'softDrop'), 4);
  key('KeyS');
  key('KeyS', false);
  tick(500);
  assert.equal(count(manager, 'softDrop'), 5);
  assert.deepEqual(
    manager.actions.filter((action) => action !== 'softDrop'),
    [],
    'a soft drop is never a hard drop'
  );
});

test('holding a move key moves once, then repeats after 167ms every 33ms [INP-2]', (t) => {
  const { manager, key, tick } = setup(t);
  key('KeyA');
  assert.equal(count(manager, PlayerAction.moveLeft), 1);
  tick(166);
  assert.equal(count(manager, PlayerAction.moveLeft), 1);
  tick(1);
  assert.equal(count(manager, PlayerAction.moveLeft), 2);
  tick(33);
  assert.equal(count(manager, PlayerAction.moveLeft), 3);
  for (let i = 0; i < 3; i++) tick(33);
  assert.equal(count(manager, PlayerAction.moveLeft), 6);
  key('KeyA', false);
  tick(1000);
  assert.equal(count(manager, PlayerAction.moveLeft), 6);
});

test('arrow keys move like A and D [INP-1]', (t) => {
  const { manager, tap } = setup(t);
  tap('ArrowLeft');
  tap('ArrowRight');
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight
  ]);
});

test('the newest direction wins, and releasing it returns to the one still held [INP-2]', (t) => {
  const { manager, key, tick } = setup(t);
  key('KeyA');
  key('KeyD');
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight
  ]);
  tick(167);
  assert.equal(manager.actions.at(-1), PlayerAction.moveRight);
  key('KeyD', false);
  assert.equal(manager.actions.at(-1), PlayerAction.moveLeft);
  key('KeyA', false);
  const total = manager.actions.length;
  tick(1000);
  assert.equal(manager.actions.length, total);
});

test('losing window focus releases every held key [INP-2]', (t) => {
  const { manager, key, fire, tick } = setup(t);
  key('KeyA');
  fire('blur');
  tick(1000);
  assert.equal(count(manager, PlayerAction.moveLeft), 1);
  key('KeyD');
  key('KeyD', false);
  assert.equal(
    count(manager, PlayerAction.moveLeft),
    1,
    'A is no longer treated as held'
  );
});

// Gamepad

test('gamepad buttons trigger their action on press, not while held [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  const buttons = [
    ['a', PlayerAction.drop],
    ['up', PlayerAction.drop],
    ['b', PlayerAction.rotate],
    ['rb', PlayerAction.rotate],
    ['lb', PlayerAction.rotateCounterclockwise],
    ['x', PlayerAction.hold],
    ['y', PlayerAction.continueGame],
    ['view', PlayerAction.newGame]
  ];
  for (const [button, action] of buttons) {
    manager.actions = [];
    pads[0] = gamepad({ pressed: [button] });
    controller.pollGamepads();
    controller.pollGamepads();
    assert.deepEqual(manager.actions, [action], `${button} held`);
    pads[0] = gamepad();
    controller.pollGamepads();
    pads[0] = gamepad({ pressed: [button] });
    controller.pollGamepads();
    assert.deepEqual(
      manager.actions,
      [action, action],
      `${button} pressed again`
    );
    pads[0] = gamepad();
    controller.pollGamepads();
  }
});

test('two buttons for the same action pressed together act once [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  pads[0] = gamepad({ pressed: ['a', 'up', 'b', 'rb', 'lb'] });
  controller.pollGamepads();
  assert.deepEqual(manager.actions, [
    PlayerAction.rotate,
    PlayerAction.rotateCounterclockwise,
    PlayerAction.drop
  ]);
});

test('Menu and View act alone: other buttons pressed at the same moment do nothing, and Menu wins over View [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  const press = (state, buttons) => {
    manager.state = state;
    manager.actions = [];
    pads[0] = gamepad({ pressed: buttons });
    controller.pollGamepads();
    pads[0] = gamepad();
    controller.pollGamepads();
    controller.stopMoving();
    return manager.actions;
  };
  const others = ['a', 'b', 'x', 'y', 'lb', 'rb', 'up'];
  assert.deepEqual(
    press(GameState.gameOver, ['menu', ...others]),
    [PlayerAction.newGame],
    "A cannot hard drop the new game's first piece"
  );
  assert.deepEqual(press(GameState.playing, ['menu', ...others]), [
    'togglePause'
  ]);
  assert.deepEqual(
    press(GameState.paused, ['view', ...others]),
    [PlayerAction.newGame],
    'nothing cancels the question just asked'
  );
  assert.deepEqual(press(GameState.paused, ['menu', 'view']), ['togglePause']);
  assert.deepEqual(
    press(GameState.gameOver, ['menu', 'view']),
    [PlayerAction.newGame],
    'one new game, not two'
  );
  // A direction held at Game Over is spent until a fresh push.
  assert.deepEqual(press(GameState.gameOver, ['menu', 'left']), [
    PlayerAction.newGame
  ]);
});

test('View and A pressed together on the pause screen leave the New Game question open [INP-4] [STA-1]', (t) => {
  const { pads } = setup(t);
  const { game } = newGame({ factory: fixedFactory(PieceColors.cyan) });
  const controller = new InputController(game, { move() {}, press() {} });
  game.togglePause();
  pads[0] = gamepad({ pressed: ['view', 'a'] });
  controller.pollGamepads();
  assert.equal(game.state, GameState.paused);
  assert.equal(game.isConfirmingNewGame, true);
});

test('the menu button pauses during play and starts a new game at game over [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  pads[0] = gamepad({ pressed: ['menu'] });
  controller.pollGamepads();
  assert.deepEqual(manager.actions, ['togglePause']);
  pads[0] = gamepad();
  controller.pollGamepads();
  manager.state = GameState.gameOver;
  pads[0] = gamepad({ pressed: ['menu'] });
  controller.pollGamepads();
  assert.deepEqual(manager.actions, ['togglePause', PlayerAction.newGame]);
});

test('while the pause screen asks to confirm New Game, left and right move between its buttons, A presses the selected one, B cancels, and nothing else on the gamepad acts [STA-1] [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  manager.state = GameState.paused;
  manager.isConfirmingNewGame = true;
  const poll = (state) => {
    pads[0] = gamepad(state);
    controller.pollGamepads();
  };
  for (const button of ['x', 'y', 'view', 'menu', 'lb', 'rb', 'up', 'down']) {
    poll({ pressed: [button] });
    poll();
  }
  poll({ y: -1 });
  tick(500);
  poll();
  assert.deepEqual(manager.actions, [], 'nothing else acts');
  // Once per push, on the directional pad or the stick, however long it is held.
  poll({ pressed: ['right'] });
  poll({ pressed: ['right'] });
  tick(500);
  poll({ pressed: ['right'] });
  poll();
  poll({ x: -1 });
  poll({ x: -0.9 });
  poll();
  assert.deepEqual(manager.actions, ['move 1', 'move -1']);
  manager.actions = [];
  poll({ pressed: ['a'] });
  assert.deepEqual(manager.actions, ['press'], 'A presses the selected button');
  poll({ pressed: ['a', 'b'] });
  assert.deepEqual(
    manager.actions,
    ['press', 'cancelNewGame'],
    'B cancels, and A held from before does not press again'
  );
  poll();
  // A push still held as the question closes does not then move a piece.
  poll({ pressed: ['right'] });
  manager.isConfirmingNewGame = false;
  manager.state = GameState.playing;
  manager.actions = [];
  poll({ pressed: ['right'] });
  assert.deepEqual(manager.actions, []);
  poll();
  poll({ pressed: ['right'] });
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveRight],
    'a new push moves it'
  );
});

test('the stick moves left and right with the same auto repeat as the keyboard [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads();
  assert.equal(count(manager, PlayerAction.moveLeft), 1);
  controller.pollGamepads(); // still held: no extra move
  tick(167);
  assert.equal(count(manager, PlayerAction.moveLeft), 2);
  pads[0] = gamepad({ x: 0.2 }); // inside the dead zone
  controller.pollGamepads();
  tick(1000);
  assert.equal(count(manager, PlayerAction.moveLeft), 2);
  pads[0] = gamepad({ x: 0.9 });
  controller.pollGamepads();
  assert.equal(count(manager, PlayerAction.moveRight), 1);
});

test('letting go of the directional pad goes back to a move key still held [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads } = setup(t);
  key('KeyA');
  pads[0] = gamepad({ pressed: ['right'] });
  controller.pollGamepads();
  pads[0] = gamepad();
  controller.pollGamepads();
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight,
    PlayerAction.moveLeft
  ]);
});

test('pushing the stick down soft drops every 50ms, up does nothing [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ y: -1 }); // browser axes: up is negative
  controller.pollGamepads();
  tick(500);
  assert.equal(count(manager, 'softDrop'), 0);
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  tick(50);
  assert.equal(count(manager, 'softDrop'), 1);
  tick(100);
  assert.equal(count(manager, 'softDrop'), 3);
  pads[0] = gamepad();
  controller.pollGamepads();
  tick(500);
  assert.equal(count(manager, 'softDrop'), 3);
});

test('soft drop stops once the game is no longer playing [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  tick(50);
  manager.state = GameState.paused;
  tick(500);
  assert.equal(count(manager, 'softDrop'), 1);
  assert.equal(
    controller.softDropTimer,
    undefined,
    'the timer itself is stopped, not left ticking'
  );
});

test('a resting stick does not cancel keyboard movement [INP-4]', (t) => {
  const { manager, controller, key, pads, tick } = setup(t);
  pads[0] = gamepad();
  key('KeyA');
  for (let i = 0; i < 10; i++) controller.pollGamepads();
  tick(200);
  assert.equal(count(manager, PlayerAction.moveLeft), 2);
});

test('a resting stick does not cancel the soft drop key, and the stick keeps it going after the key is let go [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads, tick } = setup(t);
  pads[0] = gamepad();
  key('KeyS');
  for (let i = 0; i < 5; i++) controller.pollGamepads();
  tick(100);
  assert.equal(count(manager, 'softDrop'), 3);
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  key('KeyS', false);
  tick(100);
  assert.equal(count(manager, 'softDrop'), 5);
  pads[0] = gamepad();
  controller.pollGamepads();
  tick(500);
  assert.equal(count(manager, 'softDrop'), 5);
});

test('after disconnecting with the stick down, the soft drop key works on its own [INP-4]', (t) => {
  const { manager, controller, fire, key, pads, tick } = setup(t);
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  fire('gamepaddisconnected');
  controller.pollGamepads();
  controller.pollGamepads();
  key('KeyS');
  key('KeyS', false);
  tick(500);
  assert.equal(count(manager, 'softDrop'), 1);
});

test('disconnecting the gamepad releases the stick [INP-4]', (t) => {
  const { manager, controller, fire, pads, tick } = setup(t);
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  fire('gamepaddisconnected');
  controller.pollGamepads();
  controller.pollGamepads();
  tick(500);
  assert.equal(count(manager, 'softDrop'), 0);
});

test('polling with no gamepad, or an empty slot, does nothing [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  controller.pollGamepads();
  pads[0] = null;
  pads[1] = { ...gamepad({ pressed: ['a'] }), connected: false };
  controller.pollGamepads();
  assert.deepEqual(manager.actions, []);
});

test('gamepads are polled on every animation frame [INP-4]', (t) => {
  const { manager, frames, pads } = setup(t);
  assert.equal(frames.length, 1, 'polling starts right away');
  pads[0] = gamepad({ pressed: ['b'] });
  frames.shift()();
  assert.deepEqual(manager.actions, [PlayerAction.rotate]);
  assert.equal(frames.length, 1, 'and schedules the next poll');
});

test('polling stops while no gamepad is connected and starts again when one connects [INP-4] [DSP-3]', (t) => {
  const { manager, fire, frames, pads } = setup(t);
  frames.shift()();
  assert.equal(frames.length, 0, 'no gamepad: no more polls');
  fire('gamepadconnected');
  fire('gamepadconnected');
  assert.equal(frames.length, 1, 'one polling loop however many connect');
  pads[0] = gamepad({ pressed: ['b'] });
  frames.shift()();
  assert.deepEqual(manager.actions, [PlayerAction.rotate]);
  assert.equal(frames.length, 1, 'keeps polling while connected');
  pads[0] = { ...gamepad(), connected: false };
  frames.shift()();
  assert.equal(frames.length, 0, 'stops after the last one disconnects');
  fire('gamepadconnected');
  assert.equal(frames.length, 1, 'and can start again');
});

test('an error while reading the gamepad never stops polling [SAF-5]', (t) => {
  const { manager, frames, pads } = setup(t);
  const logged = t.mock.method(console, 'error', () => {});
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      getGamepads: () => {
        throw new Error('gamepad failure');
      }
    },
    configurable: true,
    writable: true
  });
  frames.shift()();
  assert.equal(logged.mock.callCount(), 1);
  assert.equal(logged.mock.calls[0].arguments[0], 'Tetris gamepad error:');
  assert.equal(logged.mock.calls[0].arguments[1].message, 'gamepad failure');
  assert.equal(frames.length, 1, 'the next poll is still scheduled');
  Object.defineProperty(globalThis, 'navigator', {
    value: { getGamepads: () => pads },
    configurable: true,
    writable: true
  });
  pads[0] = gamepad({ pressed: ['a'] });
  frames.shift()();
  assert.deepEqual(manager.actions, [PlayerAction.drop]);
});

test('releasing left while right is still held moves right again [INP-2]', (t) => {
  const { manager, key } = setup(t);
  key('KeyD');
  key('KeyA');
  key('KeyA', false);
  assert.deepEqual(manager.actions, [
    PlayerAction.moveRight,
    PlayerAction.moveLeft,
    PlayerAction.moveRight
  ]);
});

test('pressing a direction that is already moving does not add an extra move [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads } = setup(t);
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads();
  key('KeyA');
  assert.deepEqual(manager.actions, [PlayerAction.moveLeft]);
});

test('holding the stick down keeps one steady soft drop [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ y: 1 });
  for (let i = 0; i < 5; i++) controller.pollGamepads();
  tick(100);
  assert.equal(count(manager, 'softDrop'), 2);
});

test('a browser without gamepad support, or a gamepad without a stick, does nothing [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  pads[0] = { ...gamepad(), axes: [] };
  assert.equal(controller.pollGamepads(), true);
  Object.defineProperty(globalThis, 'navigator', {
    value: {},
    configurable: true,
    writable: true
  });
  assert.equal(controller.pollGamepads(), false);
  assert.deepEqual(manager.actions, []);
});

test('the first connected gamepad is used, skipping empty and disconnected slots [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  pads[0] = null;
  pads[1] = { ...gamepad({ pressed: ['a'] }), connected: false };
  pads[2] = gamepad({ pressed: ['b'] });
  controller.pollGamepads();
  assert.deepEqual(manager.actions, [PlayerAction.rotate]);
});

test('a gamepad with fewer buttons than the standard layout still works [INP-4]', (t) => {
  const { manager, controller, pads } = setup(t);
  pads[0] = {
    connected: true,
    buttons: [{ pressed: true }, { pressed: false }],
    axes: [0, 0]
  };
  controller.pollGamepads();
  assert.deepEqual(manager.actions, [PlayerAction.drop]);
});

test('the stick does nothing until pushed past halfway [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  for (const [x, y] of [
    [-0.5, 0],
    [0.5, 0],
    [0, 0.5]
  ]) {
    pads[0] = gamepad({ x, y });
    controller.pollGamepads();
  }
  tick(500);
  assert.deepEqual(manager.actions, []);
});

test('letting the stick return to the middle goes back to a move key still held [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads, tick } = setup(t);
  key('KeyA');
  pads[0] = gamepad({ x: 1 });
  controller.pollGamepads();
  pads[0] = gamepad();
  controller.pollGamepads();
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight,
    PlayerAction.moveLeft
  ]);
  tick(167);
  assert.equal(
    count(manager, PlayerAction.moveLeft),
    3,
    'still repeating left'
  );
});

test('polling a resting stick never starts a move on its own, even with a key still held [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads, tick } = setup(t);
  pads[0] = gamepad();
  key('KeyA');
  manager.state = GameState.paused;
  tick(200); // the repeat notices the pause and stops
  manager.state = GameState.playing;
  for (let i = 0; i < 10; i++) controller.pollGamepads();
  tick(200);
  assert.equal(count(manager, PlayerAction.moveLeft), 1);
});

test('releasing a move key goes back to the stick while it is still pushed [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads, tick } = setup(t);
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads();
  key('KeyD');
  key('KeyD', false);
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight,
    PlayerAction.moveLeft
  ]);
  tick(167);
  assert.equal(
    count(manager, PlayerAction.moveLeft),
    3,
    'still repeating left'
  );
});

test('after a pause stops a held key repeating, the stick can move the piece again [INP-2] [INP-4]', (t) => {
  const { manager, controller, key, pads, tick } = setup(t);
  key('KeyD');
  manager.state = GameState.paused;
  tick(200); // the repeat notices the pause and stops
  manager.state = GameState.playing;
  pads[0] = gamepad({ x: 1 });
  controller.pollGamepads();
  assert.deepEqual(manager.actions, [
    PlayerAction.moveRight,
    PlayerAction.moveRight
  ]);
});

// Pausing releases held input [STA-2]

test('a pad down held across pause does not soft drop after resume until it is pushed again [STA-2]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  manager.togglePause = () => {
    manager.actions.push('togglePause');
    manager.state =
      manager.state === GameState.playing
        ? GameState.paused
        : GameState.playing;
  };
  pads[0] = gamepad({ pressed: ['down'] });
  controller.pollGamepads();
  tick(150);
  assert.ok(
    count(manager, 'softDrop') > 1,
    'the held pad down soft drops while playing'
  );
  pads[0] = gamepad({ pressed: ['down', 'menu'] });
  controller.pollGamepads(); // pauses with down still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'no soft drop timer is left running while paused'
  );
  pads[0] = gamepad({ pressed: ['down'] });
  controller.pollGamepads(); // Menu let go, down still held
  pads[0] = gamepad({ pressed: ['down', 'menu'] });
  controller.pollGamepads(); // resumes with down still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the held pad down does nothing until a fresh push'
  );
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ pressed: ['down'] });
  controller.pollGamepads();
  tick(150);
  assert.ok(count(manager, 'softDrop') > 0, 'a fresh push soft drops again');
});

test('a stick push or move key pressed while paused starts no movement, then a fresh press after resume works [STA-2]', (t) => {
  const { manager, controller, pads, key, tick } = setup(t);
  manager.togglePause = () => {
    manager.actions.push('togglePause');
    manager.state =
      manager.state === GameState.playing
        ? GameState.paused
        : GameState.playing;
  };
  key('KeyP'); // pause
  manager.actions = [];
  key('KeyA'); // a move key pressed on the pause screen
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads(); // and a stick pushed there
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'nothing moves, and no repeat timer is armed, while paused'
  );
  key('KeyA', false);
  key('KeyP'); // resume with the stick still pushed
  controller.pollGamepads();
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the stick held across resume does nothing until a fresh push'
  );
  key('KeyA'); // but a key freshly pressed after resume moves at once
  assert.deepEqual(manager.actions, [PlayerAction.moveLeft]);
  key('KeyA', false);
  manager.actions = [];
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ x: 1 });
  controller.pollGamepads();
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveRight],
    'and a freshly pushed stick moves at once'
  );
});
test('hiding the page releases held input even when the window does not blur [STA-2] [STA-5]', (t) => {
  const { manager, controller, pads, key, tick, hidePage } = setup(t);
  key('KeyS');
  tick(150);
  assert.ok(
    count(manager, 'softDrop') > 1,
    'the held key soft drops while playing'
  );
  manager.state = GameState.paused; // the page's visibility handler pauses
  hidePage(); // without a window blur, as on some platforms
  manager.state = GameState.playing; // back visible, game resumed
  manager.actions = [];
  pads[0] = gamepad();
  controller.pollGamepads(); // the ordinary poll runs after resume
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the key held across the hide does not soft drop again'
  );
  key('KeyS', false);
  key('KeyS');
  assert.deepEqual(
    manager.actions,
    ['softDrop'],
    'a fresh press soft drops again'
  );
});

test('the P key that pauses releases held input [STA-2]', (t) => {
  const { manager, key, tick } = setup(t);
  key('KeyA');
  key('KeyS');
  tick(200);
  assert.ok(count(manager, 'moveLeft') > 1, 'the held key moves while playing');
  assert.ok(
    count(manager, 'softDrop') > 1,
    'the held key soft drops while playing'
  );
  manager.state = GameState.paused; // the manager's own togglePause pauses
  key('KeyP');
  manager.state = GameState.playing; // resumed later
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the keys held across the pause do nothing'
  );
  key('KeyA', false);
  key('KeyS', false);
  key('KeyS');
  assert.deepEqual(
    manager.actions,
    ['softDrop'],
    'a fresh press soft drops again'
  );
});

test('a P press that leaves the game playing releases nothing [STA-2]', (t) => {
  // The real manager resumes here; the stand-in stays playing either way.
  const { manager, key, tick } = setup(t);
  key('KeyS');
  tick(150);
  const before = count(manager, 'softDrop');
  key('KeyP');
  tick(300);
  assert.ok(
    count(manager, 'softDrop') > before,
    'the held key keeps soft dropping'
  );
});

test('the gamepad Menu that pauses releases held input [STA-2] [INP-4]', (t) => {
  const { manager, controller, pads, key, tick } = setup(t);
  key('KeyA');
  key('KeyS');
  tick(200);
  manager.state = GameState.paused; // Menu's togglePause pauses
  pads[0] = gamepad({ pressed: ['menu'] });
  controller.pollGamepads();
  manager.state = GameState.playing; // resumed later
  manager.actions = [];
  pads[0] = gamepad();
  controller.pollGamepads();
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the keys held across the pause do nothing'
  );
  key('KeyA', false);
  key('KeyS', false);
  key('KeyS');
  assert.deepEqual(
    manager.actions,
    ['softDrop'],
    'a fresh press soft drops again'
  );
});

test('a Menu press that leaves the game playing releases nothing [STA-2] [INP-4]', (t) => {
  const { manager, controller, pads, key, tick } = setup(t);
  key('KeyS');
  tick(150);
  const before = count(manager, 'softDrop');
  pads[0] = gamepad({ pressed: ['menu'] });
  controller.pollGamepads(); // the stand-in manager stays playing, as after a resume
  tick(300);
  assert.ok(
    count(manager, 'softDrop') > before,
    'the held key keeps soft dropping'
  );
});

test('a visibility change that does not hide the page keeps held input [STA-2] [STA-5]', (t) => {
  const { manager, key, tick, showPage } = setup(t);
  key('KeyS');
  tick(150);
  const before = count(manager, 'softDrop');
  showPage(); // visible again, or never hidden
  tick(300);
  assert.ok(
    count(manager, 'softDrop') > before,
    'the held key keeps soft dropping'
  );
});

test('losing window focus keeps a spent pad down inactive after resume [STA-2] [INP-2] [INP-4]', (t) => {
  const { manager, controller, pads, fire, tick } = setup(t);
  manager.state = GameState.paused;
  pads[0] = gamepad({ pressed: ['down'] }); // pad down held while paused, so it is spent
  controller.pollGamepads();
  fire('blur'); // focus is lost: the next poll must not revive the hold
  manager.state = GameState.playing;
  manager.actions = [];
  controller.pollGamepads(); // the pad is still physically down
  tick(500);
  assert.equal(
    count(manager, 'softDrop'),
    0,
    'held pad down stays inactive after blur and resume'
  );
});

test('a key held across game over and Continue still counts as held [STA-2]', (t) => {
  const { manager, key, tick } = setup(t);
  key('KeyD');
  tick(200);
  assert.ok(
    count(manager, 'moveRight') > 1,
    'the held key moves while playing'
  );
  manager.state = GameState.gameOver; // the game ends with the key held
  manager.state = GameState.paused; // Continue loads the saved game paused
  key('KeyD'); // the held key is pressed again while paused
  manager.state = GameState.playing; // resumed, the key never released
  manager.actions = [];
  key('KeyA');
  key('KeyA', false); // releasing another key falls back to keys still held
  tick(400);
  assert.ok(count(manager, 'moveRight') > 0, 'the still-held key moves again');
  key('KeyD', false);
});

test('the directional pad moves left and right with the same auto repeat as the stick [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ pressed: ['left'] });
  controller.pollGamepads();
  assert.equal(count(manager, PlayerAction.moveLeft), 1);
  controller.pollGamepads(); // still held: no extra move
  tick(167);
  assert.equal(count(manager, PlayerAction.moveLeft), 2);
  pads[0] = gamepad({ pressed: ['right'] });
  controller.pollGamepads();
  assert.equal(count(manager, PlayerAction.moveRight), 1);
  pads[0] = gamepad();
  controller.pollGamepads();
  tick(500);
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveLeft,
    PlayerAction.moveRight
  ]);
});

test('holding down on the directional pad soft drops every 50ms [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ pressed: ['down'] });
  controller.pollGamepads();
  tick(50);
  assert.equal(count(manager, 'softDrop'), 1);
  tick(100);
  assert.equal(count(manager, 'softDrop'), 3);
  pads[0] = gamepad();
  controller.pollGamepads();
  tick(500);
  assert.equal(count(manager, 'softDrop'), 3);
  assert.deepEqual(
    manager.actions.filter((action) => action !== 'softDrop'),
    [],
    'down on the pad does nothing else'
  );
});

test('letting the stick return to the middle stops moving without any other action [INP-4]', (t) => {
  const { manager, controller, pads, tick } = setup(t);
  pads[0] = gamepad({ x: 1 });
  controller.pollGamepads();
  pads[0] = gamepad();
  controller.pollGamepads();
  tick(500);
  assert.deepEqual(manager.actions, [PlayerAction.moveRight]);
});

test('pausing while a move key is held stops the auto repeat, and resume needs a fresh press [STA-2]', (t) => {
  const { manager, key, tick } = setup(t);
  manager.togglePause = () => {
    manager.actions.push('togglePause');
    manager.state =
      manager.state === GameState.playing
        ? GameState.paused
        : GameState.playing;
  };
  key('KeyA');
  tick(250);
  assert.ok(
    count(manager, PlayerAction.moveLeft) > 1,
    'the held key repeats while playing'
  );
  key('KeyP'); // pause with the key still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'no repeat timer is left running while paused'
  );
  key('KeyP', false);
  key('KeyP'); // resume with the key still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the held key does nothing until a fresh press'
  );
  key('KeyA', false);
  key('KeyA');
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveLeft],
    'a fresh press moves again'
  );
});

test('pausing while soft drop is held cancels its timer, and resume needs a fresh press [STA-2]', (t) => {
  const { manager, key, tick } = setup(t);
  manager.togglePause = () => {
    manager.actions.push('togglePause');
    manager.state =
      manager.state === GameState.playing
        ? GameState.paused
        : GameState.playing;
  };
  key('KeyS');
  tick(150);
  assert.ok(
    count(manager, 'softDrop') > 1,
    'the held key soft drops while playing'
  );
  key('KeyP'); // pause with soft drop still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'no soft drop timer is left running while paused'
  );
  key('KeyP', false);
  key('KeyP'); // resume with soft drop still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the held key does nothing until a fresh press'
  );
  key('KeyS', false);
  key('KeyS');
  assert.deepEqual(
    manager.actions,
    ['softDrop'],
    'a fresh press soft drops again'
  );
});

test('a stick direction held across a keyboard pause does not move after resume until it is pushed again [STA-2]', (t) => {
  const { manager, controller, pads, key, tick } = setup(t);
  manager.togglePause = () => {
    manager.actions.push('togglePause');
    manager.state =
      manager.state === GameState.playing
        ? GameState.paused
        : GameState.playing;
  };
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads();
  tick(250);
  assert.ok(
    count(manager, PlayerAction.moveLeft) > 1,
    'the held stick moves while playing'
  );
  key('KeyP'); // pause with the stick still held
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'no repeat timer is left running while paused'
  );
  key('KeyP', false);
  key('KeyP'); // resume with the stick still held
  controller.pollGamepads();
  manager.actions = [];
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the held stick does nothing until a fresh push'
  );
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads();
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveLeft],
    'a fresh push moves again'
  );
});

test('the Menu press that pauses does not resume the game while still held [STA-2]', (t) => {
  const { manager, controller, pads } = setup(t);
  manager.togglePause = () => {
    manager.actions.push('togglePause');
    manager.state =
      manager.state === GameState.playing
        ? GameState.paused
        : GameState.playing;
  };
  pads[0] = gamepad({ pressed: ['menu'] });
  controller.pollGamepads();
  controller.pollGamepads();
  controller.pollGamepads();
  assert.deepEqual(
    manager.actions,
    ['togglePause'],
    'the game stays paused until Menu is let go and pressed again'
  );
  assert.equal(manager.state, GameState.paused);
});

test('New Game ignores old keyboard direction and soft-drop holds until release and press [INP-2]', (t) => {
  const { manager, controller, key, tick } = setup(t);
  for (const [code, action] of [
    ['KeyA', PlayerAction.moveLeft],
    ['KeyD', PlayerAction.moveRight],
    ['KeyS', 'softDrop']
  ]) {
    controller.releaseAllInput();
    manager.actions = [];
    manager.state = GameState.gameOver;
    key(code);
    manager.state = GameState.playing; // New Game may come from the page button.
    key(code, true, { repeat: true });
    tick(400);
    assert.equal(count(manager, action), 0, code);
    key(code, false);
    key(code);
    assert.equal(count(manager, action), 1, `${code}: fresh press works`);
    key(code, false);
    controller.releaseAllInput();
  }
});

test('New Game spends held pad directions and soft drop until release and push [INP-4]', (t) => {
  const { manager, controller, tick } = setup(t);
  for (const [x, y, buttons, action] of [
    [-1, 0, [], PlayerAction.moveLeft],
    [1, 0, [], PlayerAction.moveRight],
    [0, -1, [], 'softDrop'],
    [0, 0, ['down'], 'softDrop']
  ]) {
    for (const startWithPad of [false, true]) {
      controller.releaseAllInput();
      manager.actions = [];
      manager.state = GameState.gameOver;
      controller.processInput(new Set(buttons), x, y);
      tick(20);
      if (startWithPad) {
        const handle = manager.handleAction;
        manager.handleAction = function (action) {
          handle.call(this, action);
          if (action === PlayerAction.newGame) this.state = GameState.playing;
        };
        controller.processInput(new Set([...buttons, 'menu']), x, y);
        manager.handleAction = handle;
      } else manager.state = GameState.playing;
      controller.processInput(new Set(buttons), x, y);
      tick(400);
      assert.equal(count(manager, action), 0, 'old hold is inactive');
      controller.processInput(new Set(), 0, 0);
      controller.processInput(new Set(buttons), x, y);
      tick(50);
      assert.ok(count(manager, action) > 0, 'fresh push works');
    }
  }
  controller.releaseAllInput();
});

test('a soft-drop hold cannot arm its timer once the engine stops playing [INP-2]', (t) => {
  const { manager, controller, key, tick } = setup(t);
  key('KeyS');
  manager.state = GameState.gameOver;
  controller.stopSoftDrop();
  manager.actions = [];
  controller.processInput(new Set(), 0, 0);
  tick(400);
  assert.deepEqual(manager.actions, []);
  assert.equal(controller.softDropTimer, undefined);
});

test('a key release before the first restarted pad poll cannot revive spent soft drop [INP-4]', (t) => {
  const { manager, controller, key, tick } = setup(t);
  controller.processInput(new Set(['down']), 0, 0);
  manager.state = GameState.gameOver;
  controller.releaseForPause(); // The page's Game Over callback.
  manager.state = GameState.playing; // Immediate New Game button, before pad poll.
  manager.actions = [];
  key('KeyS', false);
  tick(100);
  assert.deepEqual(
    manager.actions,
    [],
    'spent pad down cannot restart through keyboard release'
  );
  controller.processInput(new Set(['down']), 0, 0);
  tick(100);
  assert.deepEqual(
    manager.actions,
    [],
    'the next held-pad poll stays inactive'
  );
  controller.processInput(new Set(), 0, 0);
  controller.processInput(new Set(['down']), 0, 0);
  tick(50);
  assert.deepEqual(
    manager.actions,
    ['softDrop'],
    'release and fresh push works'
  );
});

test('a keyboard release cannot revive a pad direction spent before New Game [INP-4]', (t) => {
  const { manager, controller, key, tick } = setup(t);
  manager.state = GameState.gameOver;
  controller.processInput(new Set(), -1, 0);
  manager.state = GameState.playing;
  key('KeyD', false); // Before the first pad poll after a page-button restart.
  tick(200);
  assert.deepEqual(
    manager.actions,
    [],
    'the old stick cannot move through a keyboard release'
  );
  controller.processInput(new Set(), -1, 0);
  key('KeyD', false); // Also after an unchanged poll of the old stick hold.
  tick(200);
  assert.deepEqual(
    manager.actions,
    [],
    'an unchanged poll must not make the old hold fresh'
  );
  controller.processInput(new Set(), 0, 0);
  controller.processInput(new Set(), -1, 0);
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveLeft],
    'release and fresh push moves'
  );
});

test('a keyboard release cannot revive a direction held through the Game Over callback [INP-4]', (t) => {
  const { manager, controller, key, tick } = setup(t);
  controller.processInput(new Set(), -1, 0);
  manager.state = GameState.gameOver;
  controller.releaseForPause();
  manager.actions = [];
  manager.state = GameState.playing;
  key('KeyD', false);
  tick(200);
  assert.deepEqual(
    manager.actions,
    [],
    'the old direction stays spent before any new pad poll'
  );
  controller.processInput(new Set(), 0, 0);
  controller.processInput(new Set(), 1, 0);
  assert.deepEqual(
    manager.actions,
    [PlayerAction.moveRight],
    'a fresh direction works'
  );
});

test('a nonplaying soft-drop request leaves no scheduled firing [INP-2]', (t) => {
  const { manager, controller, tick } = setup(t);
  manager.state = GameState.gameOver;
  controller.startSoftDrop();
  assert.equal(
    controller.softDropTimer,
    undefined,
    'Game Over cannot schedule a soft-drop timer'
  );
  tick(200);
  assert.deepEqual(manager.actions, []);
});

test('a fresh pad down after a neutral pause works before any neutral poll [STA-2] [INP-4]', (t) => {
  const { manager, controller, tick } = setup(t);
  manager.state = GameState.paused;
  controller.releaseForPause();
  manager.state = GameState.playing;
  controller.processInput(new Set(['down']), 0, 0);
  tick(50);
  assert.deepEqual(
    manager.actions,
    ['softDrop'],
    'a new down push is not spent by a neutral pause'
  );
});

test('a direction used in the New Game question cannot move the new piece through keyboard release [INP-4]', (t) => {
  const { key, tick } = setup(t);
  const { game } = newGame({ factory: fixedFactory(PieceColors.cyan) });
  const controller = new InputController(game, { move() {}, press() {} });
  game.togglePause();
  controller.releaseForPause(); // The page releases input on Pause.
  game.handleAction(PlayerAction.newGame);
  assert.equal(game.isConfirmingNewGame, true);
  controller.processInput(new Set(), -1, 0); // Select a question button.
  game.handleAction(PlayerAction.newGame); // Confirm on the page.
  assert.equal(game.state, GameState.playing);
  const column = game.currentTetromino.position.column;
  key('KeyD', false); // Before any post-start gamepad poll.
  tick(200);
  assert.equal(
    game.currentTetromino.position.column,
    column,
    'the question direction was not a new gameplay push'
  );
});

test('any controller disconnect spends surviving held buttons until release and press [INP-4]', (t) => {
  const { manager, controller, fire, pads } = setup(t);
  for (const switchSelected of [false, true]) {
    for (const button of [
      'a',
      'b',
      'x',
      'y',
      'lb',
      'rb',
      'up',
      'menu',
      'view'
    ]) {
      controller.releaseAllInput();
      pads[0] = gamepad({ pressed: switchSelected ? [] : [button] });
      pads[1] = gamepad({ pressed: switchSelected ? [button] : [] });
      controller.pollGamepads();
      const removed = switchSelected ? 0 : 1;
      pads[removed].connected = false;
      const survivor = switchSelected ? 1 : 0;
      fire('gamepaddisconnected', { gamepad: pads[removed] });
      manager.actions = [];
      controller.pollGamepads();
      controller.pollGamepads();
      assert.deepEqual(
        manager.actions,
        [],
        `${button}: old hold is inactive, selected pad changed: ${switchSelected}`
      );
      pads[survivor] = gamepad();
      controller.pollGamepads();
      pads[survivor] = gamepad({ pressed: [button] });
      controller.pollGamepads();
      assert.equal(manager.actions.length, 1, `${button}: fresh press works`);
    }
  }
});

test('any controller disconnect stops keyboard and surviving pad repeats until fresh input [INP-4]', (t) => {
  const { manager, controller, fire, pads, key, tick } = setup(t);
  for (const switchSelected of [false, true]) {
    for (const input of [
      { x: -1 },
      { x: 1 },
      { y: 1 },
      { pressed: ['left'] },
      { pressed: ['right'] },
      { pressed: ['down'] }
    ]) {
      controller.releaseAllInput();
      pads[0] = gamepad(switchSelected ? {} : input);
      pads[1] = gamepad(switchSelected ? input : {});
      key('KeyA');
      key('KeyS');
      controller.pollGamepads();
      const removed = switchSelected ? 0 : 1;
      const survivor = switchSelected ? 1 : 0;
      pads[removed].connected = false;
      fire('gamepaddisconnected', { gamepad: pads[removed] });
      manager.actions = [];
      controller.pollGamepads();
      tick(500);
      controller.pollGamepads();
      assert.deepEqual(
        manager.actions,
        [],
        `old holds inactive: ${JSON.stringify(input)}, selected pad changed: ${switchSelected}`
      );
      key('KeyA', false);
      key('KeyS', false);
      pads[survivor] = gamepad();
      controller.pollGamepads();
      pads[survivor] = gamepad(input);
      controller.pollGamepads();
      tick(100);
      assert.ok(manager.actions.length > 0, 'fresh pad push works');
      pads[survivor] = gamepad();
      controller.pollGamepads();
      manager.actions = [];
      key('KeyS');
      assert.deepEqual(
        manager.actions,
        ['softDrop'],
        'fresh keyboard press works'
      );
      key('KeyS', false);
    }
  }
  controller.releaseAllInput();
});

test('disconnect with no remaining controller forgets old pad holds and allows fresh input [INP-4]', (t) => {
  const { manager, controller, fire, pads, key, tick } = setup(t);
  const report = t.mock.method(console, 'error', () => {});
  for (const supported of [true, false]) {
    pads[0] = gamepad({ pressed: ['a', 'down'], x: -1 });
    controller.pollGamepads();
    key('KeyS');
    pads[0].connected = false;
    const read = navigator.getGamepads;
    if (!supported) navigator.getGamepads = undefined;
    fire('gamepaddisconnected', { gamepad: pads[0] });
    assert.equal(
      report.mock.callCount(),
      0,
      'no remaining pad or missing API is not a read refusal'
    );
    assert.deepEqual(
      [...controller.heldButtons],
      [],
      'no remaining pad means no remembered buttons'
    );
    assert.equal(
      controller.padDirection,
      null,
      'no remaining pad means no remembered direction'
    );
    assert.equal(
      controller.padDrops.size,
      0,
      'no remaining pad means no spent down hold'
    );
    manager.actions = [];
    tick(500);
    assert.deepEqual(
      manager.actions,
      [],
      'no held timer survives the disconnect'
    );
    navigator.getGamepads = read;
    key('KeyS', false);
    key('KeyS');
    assert.equal(count(manager, 'softDrop'), 1, 'fresh keyboard input works');
    key('KeyS', false);
    controller.releaseAllInput();
  }
});

test('a failed disconnect read reports the refusal and keeps known holds inactive [SAF-5] [INP-4]', (t) => {
  const { manager, controller, fire, pads, tick } = setup(t);
  pads[0] = gamepad({ pressed: ['a', 'down'], x: -1 });
  controller.pollGamepads();
  const read = navigator.getGamepads;
  const refused = new Error('gamepad read refused');
  const report = t.mock.method(console, 'error', () => {});
  navigator.getGamepads = () => {
    throw refused;
  };
  assert.doesNotThrow(() => fire('gamepaddisconnected'));
  assert.deepEqual(report.mock.calls[0].arguments, [
    'Tetris gamepad error:',
    refused
  ]);
  manager.actions = [];
  tick(500);
  navigator.getGamepads = read;
  controller.pollGamepads();
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'the already known pad cannot repeat after the refused read'
  );
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ pressed: ['a'] });
  controller.pollGamepads();
  assert.deepEqual(
    manager.actions,
    [PlayerAction.drop],
    'fresh input works after read recovery'
  );
});

test('disconnect stops simultaneous holds in either pad order [INP-4]', (t) => {
  const { manager, controller, fire, pads, tick } = setup(t);
  for (const removed of [0, 1]) {
    controller.releaseAllInput();
    pads[0] = gamepad({ pressed: ['a', 'down'], x: -1 });
    pads[1] = gamepad({ pressed: ['b', 'down'], x: 1 });
    controller.pollGamepads();
    pads[removed].connected = false;
    fire('gamepaddisconnected', { gamepad: pads[removed] });
    manager.actions = [];
    for (let poll = 0; poll < 5; poll++) {
      controller.pollGamepads();
      tick(100);
    }
    assert.deepEqual(
      manager.actions,
      [],
      'button, movement and down stay stopped together'
    );
  }
  controller.releaseAllInput();
});

test('a neutral disconnect snapshot leaves the first new pad push fresh [INP-4]', (t) => {
  const { manager, controller, fire, pads, tick } = setup(t);
  const report = t.mock.method(console, 'error', () => {});
  for (const [axes, fresh, action] of [
    [[], { x: 1 }, PlayerAction.moveRight],
    [[0, 0], { x: 1 }, PlayerAction.moveRight],
    [[-0.5, 0], { x: -1 }, PlayerAction.moveLeft],
    [[0.5, 0], { x: 1 }, PlayerAction.moveRight],
    [[0, 0.5], { y: 1 }, 'softDrop']
  ]) {
    controller.releaseAllInput();
    pads[0] = null; // Sparse slots are ordinary, not read errors.
    pads[1] = { ...gamepad(), axes, buttons: [{ pressed: false }] };
    fire('gamepaddisconnected');
    assert.equal(
      report.mock.callCount(),
      0,
      'sparse pad slots and short button arrays are valid'
    );
    manager.actions = [];
    pads[1] = gamepad(fresh);
    controller.pollGamepads(); // No intervening neutral poll may be needed.
    tick(100);
    assert.ok(
      count(manager, action) > 0,
      'first fresh push works after a neutral snapshot'
    );
  }
  controller.releaseAllInput();
});

test('blur still clears a held pad down and stops its repeat timer [INP-2] [INP-4]', (t) => {
  const { manager, controller, fire, pads, key, tick } = setup(t);
  pads[0] = gamepad({ pressed: ['down'] });
  controller.pollGamepads();
  tick(100);
  assert.equal(
    count(manager, 'softDrop'),
    2,
    'pad down was repeating before blur'
  );
  fire('blur');
  manager.actions = [];
  tick(500);
  assert.deepEqual(manager.actions, [], 'blur stops the active pad-down timer');
  key('KeyS', false); // Updating keyboard input must not revive forgotten pad down.
  tick(500);
  assert.deepEqual(
    manager.actions,
    [],
    'blur stops and forgets the held pad down'
  );
});

for (const [name, held, opposite] of [
  ['stick left', { x: -1 }, { x: 1 }],
  ['stick right', { x: 1 }, { x: -1 }],
  ['pad left', { pressed: ['left'] }, { pressed: ['right'] }],
  ['pad right', { pressed: ['right'] }, { pressed: ['left'] }]
]) {
  test(`blur keeps ${name} inactive until rest and a fresh push [INP-2]`, (t) => {
    const { manager, controller, pads, fire, tick, key } = setup(t);
    pads[0] = gamepad(held);
    controller.pollGamepads();
    tick(200);
    assert.ok(manager.actions.length > 1, 'movement repeats before blur');
    fire('blur');
    manager.actions = [];
    controller.pollGamepads();
    tick(400);
    assert.deepEqual(
      manager.actions,
      [],
      'a held direction cannot restart after blur'
    );
    fire('focus');
    pads[0] = gamepad(opposite);
    controller.pollGamepads();
    tick(400);
    assert.deepEqual(
      manager.actions,
      [],
      'focus and an opposite push do not replace rest'
    );
    key('KeyD');
    key('KeyD', false);
    manager.actions = [];
    tick(200);
    assert.deepEqual(
      manager.actions,
      [],
      'releasing a fresh key cannot resume the spent pad'
    );
    pads[0] = gamepad();
    controller.pollGamepads();
    pads[0] = gamepad(held);
    controller.pollGamepads();
    tick(200);
    assert.ok(
      manager.actions.length > 1,
      'a fresh push after rest moves and repeats'
    );
  });
}

test('blur cannot move the real falling piece again before stick rest [INP-2]', (t) => {
  const { fire, pads, tick } = setup(t);
  const { game } = newGame({ factory: fixedFactory(PieceColors.cyan) });
  const controller = new InputController(game, { move() {}, press() {} });
  pads[0] = gamepad({ x: 1 });
  controller.pollGamepads();
  fire('blur');
  const column = game.currentTetromino.position.column;
  controller.pollGamepads();
  tick(200);
  assert.equal(game.currentTetromino.position.column, column);
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ x: -1 });
  controller.pollGamepads();
  assert.equal(game.currentTetromino.position.column, column - 1);
});

test('blur leaves confirmation-button selection available [INP-4]', (t) => {
  const { manager, controller, fire } = setup(t);
  fire('blur');
  manager.isConfirmingNewGame = true;
  controller.processInput(new Set(['left']), 0, 0);
  assert.deepEqual(manager.actions, ['move -1']);
});

for (const [name, held] of [
  ['stick down', { y: 1 }],
  ['pad down', { pressed: ['down'] }]
]) {
  test(`blur keeps ${name} inactive until rest and a fresh push [INP-2]`, (t) => {
    const { manager, controller, pads, fire, tick, key } = setup(t);
    pads[0] = gamepad(held);
    controller.pollGamepads();
    tick(100);
    assert.equal(count(manager, 'softDrop'), 2);
    fire('blur');
    manager.actions = [];
    controller.pollGamepads();
    fire('focus');
    controller.pollGamepads();
    tick(500);
    assert.deepEqual(manager.actions, [], 'held down cannot restart');
    key('KeyS');
    assert.equal(count(manager, 'softDrop'), 1, 'a fresh keyboard press works');
    key('KeyS', false);
    manager.actions = [];
    tick(100);
    assert.deepEqual(manager.actions, [], 'key release cannot revive pad down');
    pads[0] = gamepad();
    controller.pollGamepads();
    pads[0] = gamepad(held);
    controller.pollGamepads();
    tick(100);
    assert.equal(
      count(manager, 'softDrop'),
      2,
      'rest and fresh push re-arm down'
    );
  });
}

test('blur requires both horizontal and down controls at rest before gameplay resumes [INP-2]', (t) => {
  const { manager, controller, pads, fire, tick } = setup(t);
  pads[0] = gamepad({ x: -1, pressed: ['down'] });
  controller.pollGamepads();
  fire('blur');
  manager.actions = [];
  for (const held of [
    { pressed: ['down'] },
    { x: 1 },
    { pressed: ['left', 'down'] }
  ]) {
    pads[0] = gamepad(held);
    controller.pollGamepads();
    tick(100);
    assert.deepEqual(
      manager.actions,
      [],
      'partial rest does not re-arm either input'
    );
  }
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ x: 1, pressed: ['down'] });
  controller.pollGamepads();
  tick(100);
  assert.equal(count(manager, 'moveRight'), 1);
  assert.equal(count(manager, 'softDrop'), 2);
});

test('blur cannot soft drop the real falling piece before down returns to rest [INP-2]', (t) => {
  const { fire, pads, tick } = setup(t);
  const { game } = newGame({ factory: fixedFactory(PieceColors.cyan) });
  const controller = new InputController(game, { move() {}, press() {} });
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  tick(50);
  fire('blur');
  const row = game.currentTetromino.position.row;
  controller.pollGamepads();
  tick(200);
  assert.equal(game.currentTetromino.position.row, row);
  pads[0] = gamepad();
  controller.pollGamepads();
  pads[0] = gamepad({ y: 1 });
  controller.pollGamepads();
  tick(50);
  assert.equal(game.currentTetromino.position.row, row + 1);
});

// Physical held controls: aliases and input sources keep their own identity.
test('keyboard aliases stay held independently in either release order [B12] [INP-2]', (t) => {
  const { controller, key, manager, tick } = setup(t);
  for (const [first, second, action] of [
    ['KeyA', 'ArrowLeft', PlayerAction.moveLeft],
    ['ArrowLeft', 'KeyA', PlayerAction.moveLeft],
    ['KeyD', 'ArrowRight', PlayerAction.moveRight],
    ['ArrowRight', 'KeyD', PlayerAction.moveRight]
  ]) {
    for (const release of [first, second]) {
      controller.releaseAllInput();
      manager.actions = [];
      key(first);
      key(second);
      const timer = controller.movementTimer;
      key(release, false);
      assert.equal(
        controller.movementTimer,
        timer,
        'same direction keeps its repeat position'
      );
      tick(200);
      assert.equal(
        count(manager, action),
        2,
        `${first}/${second}: surviving alias repeats`
      );
      key(release === first ? second : first, false);
      const stopped = manager.actions.length;
      tick(200);
      assert.equal(manager.actions.length, stopped, 'last release stops');
    }
  }
});

test('S and Down keep independent soft-drop holds in both release orders [B12] [INP-2]', (t) => {
  const { controller, key, manager, tick } = setup(t);
  for (const first of ['KeyS', 'ArrowDown']) {
    for (const release of ['KeyS', 'ArrowDown']) {
      controller.releaseAllInput();
      manager.actions = [];
      const second = first === 'KeyS' ? 'ArrowDown' : 'KeyS';
      key(first);
      key(second);
      assert.equal(count(manager, 'softDrop'), 2, 'each fresh key drops once');
      const timer = controller.softDropTimer;
      key(release, false);
      assert.equal(controller.softDropTimer, timer);
      tick(100);
      assert.equal(
        count(manager, 'softDrop'),
        4,
        'surviving key keeps steady drop'
      );
      key(release === first ? second : first, false);
      tick(100);
      assert.equal(count(manager, 'softDrop'), 4, 'final release stops');
    }
  }
});

test('B12 three-key example falls back to newest remaining key, not fixed alias order [B12] [INP-2]', (t) => {
  const { controller, key, manager } = setup(t);
  key('KeyA');
  key('KeyD');
  key('ArrowLeft');
  key('ArrowLeft', false);
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight,
    PlayerAction.moveLeft,
    PlayerAction.moveRight
  ]);
  key('KeyD', false);
  assert.equal(controller.movement, PlayerAction.moveLeft);
  key('KeyA', false);
  assert.equal(controller.movement, null);
});

test('releasing pad input restores the newest of two held keys in either order [B12] [INP-2]', (t) => {
  const { controller, key, manager } = setup(t);
  for (const [first, second, expected, x, buttons] of [
    ['KeyA', 'KeyD', PlayerAction.moveRight, -1, []],
    ['KeyD', 'KeyA', PlayerAction.moveLeft, 1, []],
    ['KeyA', 'KeyD', PlayerAction.moveRight, 0, ['left']],
    ['KeyD', 'KeyA', PlayerAction.moveLeft, 0, ['right']]
  ]) {
    controller.releaseAllInput();
    key(first);
    key(second);
    controller.processInput(new Set(buttons), x, 0);
    manager.actions = [];
    controller.processInput(new Set(), 0, 0);
    assert.deepEqual(manager.actions, [expected]);
  }
});

test('pad buttons obey newest press and restore surviving direction in either order [B12] [INP-4]', (t) => {
  const { controller, manager } = setup(t);
  for (const [first, second, firstAction, secondAction] of [
    ['left', 'right', PlayerAction.moveLeft, PlayerAction.moveRight],
    ['right', 'left', PlayerAction.moveRight, PlayerAction.moveLeft]
  ]) {
    controller.releaseAllInput();
    manager.actions = [];
    controller.processInput(new Set([first]), 0, 0);
    controller.processInput(new Set([first, second]), 0, 0);
    controller.processInput(new Set([first]), 0, 0);
    assert.deepEqual(manager.actions, [firstAction, secondAction, firstAction]);
    controller.processInput(new Set(), 0, 0);
    assert.equal(controller.movement, null);
  }
});

test('stick and pad same-direction holds survive either release and do not restart DAS [B12] [INP-4]', (t) => {
  const { controller, manager, tick } = setup(t);
  for (const [x, button, action] of [
    [-1, 'left', PlayerAction.moveLeft],
    [1, 'right', PlayerAction.moveRight]
  ]) {
    for (const releaseStick of [false, true]) {
      controller.releaseAllInput();
      manager.actions = [];
      controller.processInput(new Set(), x, 0);
      controller.processInput(new Set([button]), x, 0);
      const timer = controller.movementTimer;
      controller.processInput(
        new Set(releaseStick ? [button] : []),
        releaseStick ? 0 : x,
        0
      );
      assert.equal(controller.movementTimer, timer);
      tick(200);
      assert.equal(count(manager, action), 2);
      controller.processInput(new Set(), 0, 0);
      tick(200);
      assert.equal(count(manager, action), 2);
    }
  }
});

test('new stick direction wins against a held pad and releasing it restores the pad [B12] [INP-4]', (t) => {
  const { controller, manager } = setup(t);
  controller.processInput(new Set(['left']), 0, 0);
  controller.processInput(new Set(['left']), 1, 0);
  controller.processInput(new Set(['left']), -1, 0);
  controller.processInput(new Set(['left']), 1, 0);
  controller.processInput(new Set(['left']), 0, 0);
  assert.deepEqual(manager.actions, [
    PlayerAction.moveLeft,
    PlayerAction.moveRight,
    PlayerAction.moveLeft,
    PlayerAction.moveRight,
    PlayerAction.moveLeft
  ]);
});

test('all four soft-drop controls survive unrelated releases without timer restart [B12] [INP-2]', (t) => {
  const { controller, key, manager, tick } = setup(t);
  key('KeyS');
  key('ArrowDown');
  controller.processInput(new Set(['down']), 0, -1);
  const timer = controller.softDropTimer;
  key('KeyS', false);
  key('ArrowDown', false);
  controller.processInput(new Set(), 0, -1);
  assert.equal(controller.softDropTimer, timer);
  tick(100);
  assert.equal(count(manager, 'softDrop'), 4);
  controller.processInput(new Set(), 0, 0);
  tick(100);
  assert.equal(count(manager, 'softDrop'), 4);
});

test('confirmation preserves left-first navigation for mixed pad controls and spends their holds [STA-1] [INP-4]', (t) => {
  const { controller, manager, key, tick } = setup(t);
  manager.state = GameState.paused;
  manager.isConfirmingNewGame = true;
  controller.processInput(new Set(['left', 'right', 'down']), 1, -1);
  assert.deepEqual(manager.actions, ['move -1']);
  manager.state = GameState.playing;
  manager.isConfirmingNewGame = false;
  manager.actions = [];
  key('KeyD', false);
  controller.processInput(new Set(['left', 'right', 'down']), 1, -1);
  tick(400);
  assert.deepEqual(manager.actions, [], 'dialog holds cannot revive gameplay');
});

test('disconnect preserves confirmation selection for unchanged mixed pad holds [STA-1] [INP-4]', (t) => {
  const { controller, manager, fire, pads } = setup(t);
  manager.state = GameState.paused;
  manager.isConfirmingNewGame = true;
  for (const input of [
    { pressed: ['left', 'right'] },
    { x: -1, pressed: ['right'] },
    { x: 1, pressed: ['left'] }
  ]) {
    controller.releaseAllInput();
    pads[0] = gamepad(input);
    controller.pollGamepads();
    manager.actions = [];
    fire('gamepaddisconnected');
    controller.pollGamepads();
    controller.pollGamepads();
    assert.deepEqual(
      manager.actions,
      [],
      'unchanged surviving holds do not select'
    );
    pads[0] = gamepad();
    controller.pollGamepads();
    pads[0] = gamepad({ pressed: ['right'] });
    controller.pollGamepads();
    controller.pollGamepads();
    assert.deepEqual(manager.actions, ['move 1'], 'fresh push selects once');
  }
});
