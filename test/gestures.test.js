import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FLICK_SPEED_PX_PER_MS, FLICK_WINDOW_MS, isFlickDown } from '../public/game/gestures.js';

const CELL = 40;
const at = (time, x, y) => ({ time, x, y });

test('a flick is judged over the last 100 ms at 1 px per ms [INP-6]', () => {
  assert.equal(FLICK_WINDOW_MS, 100);
  assert.equal(FLICK_SPEED_PX_PER_MS, 1);
});

test('a fast move down of at least a cell is a flick [INP-6]', () => {
  assert.equal(isFlickDown([at(0, 0, 0)], at(50, 0, 100), CELL), true);
  assert.equal(isFlickDown([at(0, 0, 0)], at(40, 0, 40), CELL), true, 'exactly one cell at exactly the speed');
});

test('less than a cell, or slower than the flick speed, is not a flick [INP-6]', () => {
  assert.equal(isFlickDown([at(0, 0, 0)], at(20, 0, 39), CELL), false, 'just under a cell');
  assert.equal(isFlickDown([at(0, 0, 0)], at(51, 0, 50), CELL), false, 'just under 1 px per ms');
});

test('a flick must go more down than sideways, either way [INP-6]', () => {
  assert.equal(isFlickDown([at(0, 0, 0)], at(50, 30, 60), CELL), true, 'a little to the right');
  assert.equal(isFlickDown([at(0, 0, 0)], at(50, -30, 60), CELL), true, 'a little to the left');
  assert.equal(isFlickDown([at(0, 0, 0)], at(50, 60, 60), CELL), false, 'as far sideways as down');
  assert.equal(isFlickDown([at(0, 0, 0)], at(50, -60, 50), CELL), false, 'more to the left than down');
  assert.equal(isFlickDown([at(0, 0, 0)], at(50, 0, -100), CELL), false, 'upward');
  assert.equal(isFlickDown([at(0, 200, 300)], at(50, 210, 360), CELL), true, 'measured from where the finger was, not the screen edge');
});

test('only the last 100 ms before lifting count, so a finger at rest does not flick [INP-6]', () => {
  assert.equal(isFlickDown([at(0, 0, 0), at(100, 0, 100)], at(200, 0, 200), CELL), true, 'a sample exactly 100 ms back counts');
  assert.equal(isFlickDown([at(0, 0, 0), at(150, 0, 190)], at(200, 0, 200), CELL), false, 'fast long ago, slow at the end');
  assert.equal(isFlickDown([at(0, 0, 0), at(50, 0, 150)], at(200, 0, 150), CELL), false, 'came to rest before lifting');
  assert.equal(isFlickDown([], at(200, 0, 150), CELL), false, 'no samples at all');
});

test('lifting in the same instant as the last sample still counts as fast [INP-6]', () => {
  assert.equal(isFlickDown([at(10, 0, 0)], at(10, 0, 50), CELL), true);
});
