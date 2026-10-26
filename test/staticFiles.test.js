// Checks the files the browser loads directly: page, manifest, service worker
// and icons. These are served from GitHub Pages under /tetris-js/, so every
// reference must be relative and every file must exist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const read = file => fs.readFileSync(path.join(publicDir, file), 'utf8');
const exists = file => fs.existsSync(path.join(publicDir, file));

const html = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const serviceWorker = read('sw.js');
const appShell = JSON.parse(serviceWorker.match(/const APP_SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

function pngSize(file) {
  const data = fs.readFileSync(path.join(publicDir, file));
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${file} is a PNG`);
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
}

test('every file the page references exists and uses a relative path [APP-3]', () => {
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  assert.ok(references.length >= 5);
  for (const reference of references) {
    assert.ok(!reference.startsWith('/') && !/^https?:/.test(reference), `${reference} must be relative`);
    assert.ok(exists(reference), `${reference} exists`);
  }
});

test('the page preloads exactly the modules script.js imports, directly or not [APP-5]', () => {
  const imported = new Set();
  const visit = file => {
    for (const [, specifier] of read(file).matchAll(/^import .* from '(\.[^']+)';$/gm)) {
      const target = path.posix.join(path.posix.dirname(file), specifier);
      if (!imported.has(target)) {
        imported.add(target);
        visit(target);
      }
    }
  };
  visit('script.js');
  assert.ok(imported.size >= 7, `${imported.size} modules`);
  const preloaded = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(match => match[1]);
  assert.deepEqual([...preloaded].sort(), [...imported].sort());
});

test('the page ids used by script.js all exist, canvases are canvases, and the dialog is a dialog [APP-3]', () => {
  const script = read('script.js');
  const ids = [...script.matchAll(/\belement\('([^']+)'\)/g)].map(match => match[1]);
  const canvasIds = [...script.matchAll(/\bcanvasElement\('([^']+)'\)/g)].map(match => match[1]);
  canvasIds.push(...JSON.parse(script.match(/(\[[^\]]*\])\.map\(canvasElement\)/)[1].replace(/'/g, '"')));
  assert.ok(ids.length >= 7 && canvasIds.length === 5, `${ids.length} elements, ${canvasIds.length} canvases`);
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), id);
  for (const id of canvasIds) assert.match(html, new RegExp(`<canvas id="${id}"`), `${id} is a canvas`);
  assert.match(html, /<dialog id="newGameDialog"/, 'newGameDialog is a dialog');
  assert.doesNotMatch(script, /getElementById\('/, 'elements are looked up through element() or canvasElement()');
});

test('the viewport fits notches and blocks zooming [DSP-4] [APP-4]', () => {
  const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)[1];
  for (const part of ['width=device-width', 'initial-scale=1.0', 'maximum-scale=1.0', 'user-scalable=no', 'viewport-fit=cover']) {
    assert.ok(viewport.includes(part), part);
  }
});

test('the page has the tags iPhone needs to install the game [APP-1] [APP-4]', () => {
  for (const tag of [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  ]) {
    assert.ok(html.includes(tag), tag);
  }
});

test('the manifest describes a portrait, full screen app that starts in its own folder [APP-1]', () => {
  assert.equal(manifest.name, 'Tetris');
  assert.equal(manifest.short_name, 'Tetris');
  assert.equal(manifest.display, 'fullscreen');
  assert.equal(manifest.orientation, 'portrait');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});

test('manifest icons exist, match their declared sizes and include a maskable one [APP-1]', () => {
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), `${icon.src} must be relative`);
    assert.equal(pngSize(icon.src), icon.sizes, icon.src);
    assert.equal(icon.type, 'image/png');
  }
  const sizes = manifest.icons.map(icon => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  assert.equal(pngSize('icons/apple-touch-icon.png'), '180x180');
});

test('the offline cache lists only files that exist, with relative paths [APP-2] [APP-3]', () => {
  for (const file of appShell) {
    assert.ok(!file.startsWith('/'), `${file} must be relative`);
    if (file !== './') assert.ok(exists(file), `${file} exists`);
  }
});

test('the offline cache includes every file the game needs to start [APP-2]', () => {
  const gameModules = fs.readdirSync(path.join(publicDir, 'game')).map(file => `game/${file}`);
  const required = ['./', 'index.html', 'style.css', 'script.js', 'manifest.webmanifest', ...gameModules];
  for (const file of required) assert.ok(appShell.includes(file), `${file} is cached for offline play`);
  for (const icon of manifest.icons) assert.ok(appShell.includes(icon.src), `${icon.src} is cached`);
});

test('the service worker is registered with a relative path [APP-2] [APP-3]', () => {
  assert.match(read('script.js'), /serviceWorker\.register\('sw\.js'\)/);
});

// Service worker storage behavior. The worker runs in a small fake of the
// Cache and Clients APIs, so the storage scenarios below play out against
// the real sw.js source.

import vm from 'node:vm';

const SCOPE = 'https://example.github.io/tetris-js/';
const PINS_CACHE = 'tetris-pins';

// A minimal Cache API: every cache is a URL -> Response map, and reads hand
// out clones the way the real Cache API does.
function makeCaches() {
  const stores = new Map();
  const hooks = { onKeys: null };
  const urlOf = key => (typeof key === 'string' ? new URL(key, SCOPE).href : key.url);
  const makeCache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      put: async (key, response) => { store.set(urlOf(key), response); },
      addAll: async requests => { for (const request of requests) store.set(urlOf(request), new Response('cached')); },
      keys: async () => {
        // The snapshot is taken before the hook runs, so a record written
        // during this call (a concurrent page save) is invisible to this
        // read, as in the real API.
        const snapshot = [...store.keys()];
        if (hooks.onKeys) await hooks.onKeys(name, store);
        return snapshot.map(url => new Request(url));
      },
      match: async key => store.get(urlOf(key))?.clone(),
      delete: async key => store.delete(urlOf(key)),
    };
  };
  const caches = {
    open: async name => makeCache(name),
    has: async name => stores.has(name),
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    match: async (key, { cacheName } = {}) => (cacheName ? stores.get(cacheName)?.get(urlOf(key))?.clone() : undefined),
  };
  return { caches, stores, hooks };
}

// Runs the real sw.js with fakes for the worker globals; returns its handlers.
function loadWorker(world) {
  const handlers = {};
  const worker = {
    registration: { scope: SCOPE },
    clients: {
      matchAll: async options => { world.matchAllOptions = options; return world.liveClients; },
      claim: async () => {},
    },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => {},
  };
  // Relative addresses in the worker (APP_SHELL, pin keys) resolve against
  // the worker's scope, as they do in a real service worker.
  const ScopedRequest = class extends Request {
    constructor(input, init) { super(typeof input === 'string' ? new URL(input, SCOPE) : input, init); }
  };
  const sandbox = {
    self: worker,
    caches: world.caches,
    fetch: async () => { throw new Error('offline'); },
    Request: ScopedRequest, Response, URL, console,
  };
  vm.createContext(sandbox);
  vm.runInContext(read('sw.js'), sandbox);
  return handlers;
}

const runEvent = async (handler, event = {}) => {
  let done;
  handler({ waitUntil: promise => { done = promise; }, respondWith: () => {}, ...event });
  await done;
};

const seedVersion = async (world, name) => {
  await (await world.caches.open(name)).put('index.html', new Response('cached'));
};

const seedPin = async (world, clientId, version, at) => {
  await (await world.caches.open(PINS_CACHE)).put(`pins/${encodeURIComponent(clientId)}`, Response.json({ version, at }));
};

const PIN_MS_TEST = 10 * 60 * 1000;

test('activation deletes only the old caches this app made [APP-6]', async () => {
  const world = { liveClients: [], ...makeCaches() };
  // Another project's cache: same fixed name, its own addresses.
  await (await world.caches.open('tetris')).put('https://example.github.io/other-app/index.html', new Response('theirs'));
  // This app's old cache: only addresses under this app's scope.
  const ours = await world.caches.open('tetris-2');
  await ours.put('index.html', new Response('ours'));
  await ours.put('style.css', new Response('ours'));
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.ok(world.stores.has('tetris'), "another project's cache named 'tetris' is left alone");
  assert.ok(!world.stores.has('tetris-2'), "this app's old cache 'tetris-2' is deleted");
});

test('a clock jump forward cannot cost a loading page its version [APP-2]', async () => {
  const world = { liveClients: [{ id: 'page-1' }], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  // The clock jumped forward: the record looks twenty minutes old, but the
  // page that made it is still open.
  await seedPin(world, 'page-1', 'tetris-version-1-aaa', Date.now() - 2 * PIN_MS_TEST);
  const handlers = loadWorker(world);
  await runEvent(handlers.install); // downloads version 3, then cleans up
  assert.equal(world.matchAllOptions?.includeUncontrolled, true, 'a page still loading is not yet a controlled client');
  assert.ok(world.stores.has('tetris-version-1-aaa'), "the open page's version survives");
  const pin = await (await world.caches.open(PINS_CACHE)).match(`pins/${encodeURIComponent('page-1')}`);
  assert.ok(pin, "the open page's record survives");
});

test('a record whose page is gone expires by age, and its version is deleted [APP-2]', async () => {
  const world = { liveClients: [], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  await seedPin(world, 'page-gone', 'tetris-version-1-aaa', Date.now() - 2 * PIN_MS_TEST);
  const handlers = loadWorker(world);
  await runEvent(handlers.install);
  assert.ok(!world.stores.has('tetris-version-1-aaa'), 'the old version is deleted once its page is gone');
  const pin = await (await world.caches.open(PINS_CACHE)).match(`pins/${encodeURIComponent('page-gone')}`);
  assert.ok(!pin, 'the expired record is removed');
});

test('a page record saved while cleanup runs keeps its version [APP-2]', async () => {
  const world = { liveClients: [], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  // A page saves its record just after cleanup reads the records: the first
  // keys() call still answers the old list, but the record is already stored.
  let hooked = true;
  world.hooks.onKeys = async (name, store) => {
    if (hooked && name === PINS_CACHE) {
      hooked = false;
      const written = Response.json({ version: 'tetris-version-1-aaa', at: Date.now() });
      store.set(new URL(`pins/${encodeURIComponent('page-late')}`, SCOPE).href, written);
    }
  };
  const handlers = loadWorker(world);
  await runEvent(handlers.install);
  assert.ok(world.stores.has('tetris-version-1-aaa'), "the late record's version is not deleted under it");
});

test("an old cache mixing this app's and another project's addresses stays [APP-6]", async () => {
  const world = { liveClients: [], ...makeCaches() };
  const mixed = await world.caches.open('tetris');
  await mixed.put('index.html', new Response('ours'));
  await mixed.put('https://example.github.io/other-app/index.html', new Response('theirs'));
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.ok(world.stores.has('tetris'), 'a cache holding any foreign address is left alone');
});

test('an empty old cache stays, its maker unknown [APP-6]', async () => {
  const world = { liveClients: [], ...makeCaches() };
  await world.caches.open('tetris-2'); // created but never filled
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.ok(world.stores.has('tetris-2'), 'an empty cache is left alone');
});
