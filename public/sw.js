// Offline support and instant launches. Cache first: every request is
// answered from the cache straight away, even on a weak connection, while
// the network copy refreshes the cache in the background. A new deploy
// therefore shows up on the launch after the one that fetched it.

const CACHE = 'tetris';
const APP_SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'game/gameManager.js',
  'game/gameState.js',
  'game/gestures.js',
  'game/inputController.js',
  'game/position.js',
  'game/session.js',
  'game/tetromino.js',
  'game/tetrominoFactory.js'
];

// `self` is this service worker; the cast tells the type checker so.
const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

worker.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  worker.skipWaiting();
});

worker.addEventListener('activate', event => {
  event.waitUntil(worker.clients.claim());
});

worker.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const refresh = fetch(event.request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  });
  // Keep the worker alive until the refresh is stored, and ignore a failed
  // one (offline): the cached copy is already on its way.
  event.waitUntil(refresh.catch(() => {}));
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      // Not cached yet: wait for the network, or a plain network error if offline.
      .then(cached => cached ?? refresh.catch(() => Response.error()))
  );
});
