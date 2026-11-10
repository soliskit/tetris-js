// PRIVATE SOURCE-ONLY proposed Playwright addInitScript body. Not executed.
// Registers before app modules. No extra observer, frame, timer or app call.
export function installResizeWitness() {
  const records = [];
  let dropped = 0;
  let captureFailed = false;
  let nextObserver = 0;
  let nextDelivery = 0;
  const record = (kind, observerId, deliveryId, canvas) => {
    try {
      // Only the board bitmap and scalar clocks. No layout-forcing rect/style
      // read is inserted into the app's observer callback.
      if (records.length >= 64) {
        dropped++;
        return;
      }
      records.push({
        kind,
        observerId,
        deliveryId,
        dateNow: Date.now(),
        performanceNow: performance.now(),
        visibility: document.visibilityState,
        bitmap: canvas ? [canvas.width, canvas.height] : null
      });
    } catch {
      captureFailed = true;
    }
  };
  Object.defineProperty(window, '__resizeSetupWitness', {
    value: () => ({ records: records.slice(), dropped, captureFailed }),
    configurable: true
  });
  const Native = window.ResizeObserver;
  window.ResizeObserver = new Proxy(Native, {
    construct(target, args, newTarget) {
      const callback = args[0];
      // Invalid constructor inputs retain the native validation path.
      if (typeof callback !== 'function')
        return Reflect.construct(target, args, newTarget);
      const observerId = ++nextObserver;
      const observer = Reflect.construct(
        target,
        [
          function (entries, instance) {
            const boardEntry = entries.find(
              (entry) => entry.target.id === 'tetris'
            );
            const deliveryId = ++nextDelivery;
            if (boardEntry)
              record(
                'board-delivery-before-app-callback',
                observerId,
                deliveryId,
                boardEntry.target
              );
            try {
              return Reflect.apply(callback, this, [entries, instance]);
            } finally {
              if (boardEntry)
                record(
                  'board-delivery-after-app-callback',
                  observerId,
                  deliveryId,
                  boardEntry.target
                );
            }
          }
        ],
        newTarget
      );
      record('observer-constructed', observerId, null, null);
      // An own observe wrapper is visible to inspection; record that observer
      // registration was attempted and returned. Native receiver stays original.
      const observe = observer.observe;
      Object.defineProperty(observer, 'observe', {
        configurable: true,
        writable: true,
        value: function (...observeArgs) {
          const board = observeArgs[0];
          if (board && board.id === 'tetris')
            record('board-observe-call', observerId, null, board);
          const result = Reflect.apply(observe, this, observeArgs);
          if (board && board.id === 'tetris')
            record('board-observe-return', observerId, null, board);
          return result;
        }
      });
      return observer;
    }
  });
}
