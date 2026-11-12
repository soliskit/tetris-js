// Test-only page globals. Each one is created by the e2e spec or helper named
// beside it, inside the page it drives (addInitScript, evaluate, or a
// route-fulfilled script). None exists in the shipped app, so every property
// is optional: a page where its writer did not run has no value, and a spec
// that reads one must narrow it first.

interface TestPadButton {
  pressed: boolean;
}
interface TestPad {
  connected: boolean;
  buttons: TestPadButton[];
  axes: number[];
  id?: string;
  index?: number;
}
interface ReadProbeRead {
  key: string;
  phase: string;
  elapsedMs: number;
  callers: string[];
}
interface LockWitness {
  documentStart: number;
  clientId: string | null;
  granted: boolean;
  settled: boolean;
  touches: number;
  violations: number;
  shows: boolean[];
}
interface WakeLockWitness extends EventTarget {
  type: string;
  released: boolean;
  release(): Promise<void>;
}

interface Window {
  pauseEvents?: PauseEvent[];
  pauseEventOverflow?: number;
  pauseStates?: PauseState[];
  // app.spec.js
  drawCalls?: number;
  frameRequests?: number;
  resolutionQueries?: MediaQueryList[];
  loadScripts?: () => Promise<Event>;
  // drawing-controls.spec.js and safety.spec.js
  drawingFails?: boolean;
  failedDraws?: number;
  successfulFills?: number;
  failNextDraw?: boolean;
  drawFrameRequests?: number;
  refuseFrames?: number;
  retryRequests?: number;
  refuseRetryTimer?: boolean;
  refuseDrawReport?: boolean;
  // engine-fault-notice.spec.js
  announcementChanges?: number;
  // startup-storage.spec.js
  releaseStartupDrawing?: () => void;
  // f28-touch-lift.spec.js
  __downId?: number;
  // touch.spec.js and drag-resize.spec.js
  boundaryEvents?: {
    type: string;
    x: number;
    y: number;
    pointerId: number;
  }[];
  listenedFor?: string[];
  zoomTo?: (value: number) => void;
  testDensityChange?: () => void;
  // game.spec.js
  holdKeys?: [string, boolean][];
  gameKeyReads?: number;
  seenStorageKeys?: (string | null)[];
  readProbe?: {
    phase: string;
    started: number;
    reads: ReadProbeRead[];
    overflow: number;
    ownReads: number;
  };
  probeTallies?: {
    events: number;
    tetrisPrefixKey: number;
    otherKey: number;
    nullKey: number;
  };
  testPad?: TestPad;
  testPads?: TestPad[];
  // tab-lock.spec.js
  lockWitness?: LockWitness;
  lockRequests?: number;
  gameStorageTouches?: number;
  deliverLock?: () => void;
  requestCalls?: number;
  returnedHold?: unknown;
  rejectOldRequest?: (reason?: unknown) => void;
  startupFaultReached?: boolean;
  preflightReached?: boolean;
  preflightLockRequests?: number;
  preflightReportAttempts?: number;
  preflightStorageTouches?: number;
  // helpers.js (wake lock stub)
  wakeLocks?: WakeLockWitness[];
  wakeLockRequests?: number;
  grantWakeLocks?: () => void;
  revokeWakeLocks?: () => void;
  // serialization-failure.spec.js
  withdrawalAttempts?: number;
  serializerAttempts?: number;
  serializerError?: Error;
  restoreSerializationProviders?: () => void;
  // engine-fault-notice, save-publication and serialization-failure specs add
  // this to the served script text.
  testGame?: import('../public/game/gameManager.js').GameManager;
}

// pause-touch.spec.js: recordNative() creates these on globalThis in the page
// before the native touch sequence; nativeTwoTouch and nativeControls read
// them back. They do not exist before recordNative runs.
interface PauseEvent {
  type: string;
  constructor: 'PointerEvent' | 'MouseEvent' | 'other';
  pointerType: string;
  pointerId: number | null;
  isPrimary: boolean | null;
  target: string;
  stateAtCapture: string | null;
}
interface PauseState {
  dispatch: string;
  label: string | null;
}
