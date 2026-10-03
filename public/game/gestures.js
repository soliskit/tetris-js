// Touch gesture geometry, kept apart from the page so its thresholds can be
// tested exactly.

/** @typedef {{ time: number, x: number, y: number }} PointerSample */

// A quick flick down hard drops the piece: in the last FLICK_WINDOW_MS before
// the finger lifts, it covers at least one cell, more down than sideways, at
// FLICK_SPEED_PX_PER_MS or faster. Slower drags only soft drop. Tune these
// two for feel.
export const FLICK_WINDOW_MS = 100;
export const FLICK_SPEED_PX_PER_MS = 1;

/**
 * @param {PointerSample[]} samples Where the finger has been, oldest first.
 * @param {PointerSample} end Where and when it lifted.
 * @param {number} cellSize A board cell, in the same units as x and y.
 * @returns {boolean} Whether the finger was flicking down as it lifted.
 */
export function isFlickDown(samples, end, cellSize) {
  const start = samples.find(sample => sample.time >= end.time - FLICK_WINDOW_MS);
  if (!start) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // At least a millisecond, so a lift in the same instant cannot divide by zero.
  const elapsed = Math.max(end.time - start.time, 1);
  return dy >= cellSize && dy > Math.abs(dx) && dy / elapsed >= FLICK_SPEED_PX_PER_MS;
}
