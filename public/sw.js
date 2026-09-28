// Offline support. Network first, so players always get the latest deploy
// when online, falling back to the cached copy when offline.

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
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      // Offline: the cached copy, or a plain network error if there is none.
      .catch(async () => (await caches.match(event.request, { ignoreSearch: true })) ?? Response.error())
  );
});
