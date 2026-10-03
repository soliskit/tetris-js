// Offline support and instant launches. Cache first: every request is
// answered from the cache straight away, even on a weak connection. Each
// launch downloads the whole game again in the background, so a new deploy
// shows up on the launch after the one that fetched it.

// Renamed whenever what the cache holds changes, so activating clears out
// the old one. Earlier versions stored every address visited, query strings
// included, and a lookup that ignores the query could find a stale page.
const CACHE = 'tetris-2';
const APP_SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'game/gameManager.js',
  'game/gameState.js',
  'game/inputController.js',
  'game/position.js',
  'game/session.js',
  'game/tetromino.js',
  'game/tetrominoFactory.js'
];

// `self` is this service worker; the cast tells the type checker so.
const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// Downloads every file of the game and stores them in one step. If any file
// fails, nothing is stored, so the cache always holds one whole version and
// never old and new files mixed. 'no-cache' checks each file with the server
// instead of reusing the browser's own copy, which may be minutes old.
function refreshAppShell() {
  return caches.open(CACHE).then(cache => cache.addAll(APP_SHELL.map(file => new Request(file, { cache: 'no-cache' }))));
}

worker.addEventListener('install', event => {
  event.waitUntil(refreshAppShell());
  worker.skipWaiting();
});

worker.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name))))
    .then(() => worker.clients.claim()));
});

worker.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Opening the game refreshes the cache for the next launch. A failed
  // refresh (offline) leaves the cached version as it was.
  if (event.request.mode === 'navigate') event.waitUntil(refreshAppShell().catch(() => {}));
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      // Not cached: ask the network, or a plain network error if offline.
      .then(cached => cached ?? fetch(event.request).catch(() => Response.error()))
  );
});
