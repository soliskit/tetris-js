// Checks the files the browser loads directly: page, manifest, service worker
// and icons. These are served from GitHub Pages under /tetris-js/, so every
// reference must be relative and every file must exist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  jsonArray,
  jsonObject,
  jsonString,
  parseJsonObject,
  present
} from './json.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
/** @param {string} file */
const read = (file) => fs.readFileSync(path.join(publicDir, file), 'utf8');
/** @param {string} file */
const exists = (file) => fs.existsSync(path.join(publicDir, file));

const html = read('index.html');
// Tag assertions ignore layout: line breaks and a self-closing slash inside a
// tag are the formatter's choice, not part of the page's contract.
const flatHtml = html.replace(/\s+/g, ' ').replace(/ \/>/g, '>');
const manifest = parseJsonObject(read('manifest.webmanifest'));
const manifestIcons = jsonArray(manifest.icons).map((icon) => jsonObject(icon));
const serviceWorker = read('sw.js');
const appShell = jsonArray(
  JSON.parse(
    present(
      serviceWorker.match(/const APP_SHELL = (\[[\s\S]*?\]);/)
    )[1].replace(/'/g, '"')
  )
).map((file) => jsonString(file));

/** @param {string} file */
function pngSize(file) {
  const data = fs.readFileSync(path.join(publicDir, file));
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${file} is a PNG`);
  return `${String(data.readUInt32BE(16))}x${String(data.readUInt32BE(20))}`;
}

void test('every file the page references exists and uses a relative path [APP-3]', () => {
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
    (match) => match[1]
  );
  assert.ok(references.length >= 5);
  for (const reference of references) {
    assert.ok(
      !reference.startsWith('/') && !/^https?:/.test(reference),
      `${reference} must be relative`
    );
    assert.ok(exists(reference), `${reference} exists`);
  }
});

void test('the page preloads exactly the modules script.js imports, directly or not [APP-5]', () => {
  /** @type {Set<string>} */
  const imported = new Set();
  /** @param {string} file */
  const visit = (file) => {
    for (const [, specifier] of read(file).matchAll(
      /^import\s[\s\S]*?from\s+'(\.[^']+)';$/gm
    )) {
      const target = path.posix.join(path.posix.dirname(file), specifier);
      if (!imported.has(target)) {
        imported.add(target);
        visit(target);
      }
    }
  };
  visit('script.js');
  assert.ok(imported.size >= 7, `${String(imported.size)} modules`);
  const preloaded = [
    ...flatHtml.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)
  ].map((match) => match[1]);
  assert.deepEqual([...preloaded].sort(), [...imported].sort());
});

void test('the page ids used by script.js all exist, canvases are canvases, and the dialog is a dialog [APP-3]', () => {
  const script = read('script.js');
  const ids = [...script.matchAll(/\belement\('([^']+)'\)/g)].map(
    (match) => match[1]
  );
  const canvasIds = [...script.matchAll(/\bcanvasElement\('([^']+)'\)/g)].map(
    (match) => match[1]
  );
  canvasIds.push(
    ...jsonArray(
      JSON.parse(
        present(script.match(/(\[[^\]]*\])\.map\(canvasElement\)/))[1].replace(
          /'/g,
          '"'
        )
      )
    ).map((id) => jsonString(id))
  );
  assert.ok(
    ids.length >= 7 && canvasIds.length === 5,
    `${String(ids.length)} elements, ${String(canvasIds.length)} canvases`
  );
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), id);
  for (const id of canvasIds)
    assert.match(
      flatHtml,
      new RegExp(`<canvas id="${id}"`),
      `${id} is a canvas`
    );
  assert.match(
    flatHtml,
    /<dialog id="newGameDialog"/,
    'newGameDialog is a dialog'
  );
  assert.doesNotMatch(
    script,
    /getElementById\('/,
    'elements are looked up through element() or canvasElement()'
  );
});

void test('the viewport fits notches and blocks zooming [DSP-4] [APP-4]', () => {
  const viewport = present(
    flatHtml.match(/<meta name="viewport" content="([^"]+)"/)
  )[1];
  for (const part of [
    'width=device-width',
    'initial-scale=1.0',
    'maximum-scale=1.0',
    'user-scalable=no',
    'viewport-fit=cover'
  ]) {
    assert.ok(viewport.includes(part), part);
  }
});

void test('the page has the tags iPhone needs to install the game [APP-1] [APP-4]', () => {
  for (const tag of [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  ]) {
    assert.ok(flatHtml.includes(tag), tag);
  }
});

void test('the manifest describes a portrait, full screen app that starts in its own folder [APP-1]', () => {
  assert.equal(manifest.name, 'Tetris');
  assert.equal(manifest.short_name, 'Tetris');
  assert.equal(manifest.display, 'fullscreen');
  assert.equal(manifest.orientation, 'portrait');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.match(jsonString(manifest.theme_color), /^#[0-9a-f]{6}$/i);
  assert.match(jsonString(manifest.background_color), /^#[0-9a-f]{6}$/i);
});

void test('manifest icons exist, match their declared sizes and include a maskable one [APP-1]', () => {
  for (const icon of manifestIcons) {
    const src = jsonString(icon.src);
    assert.ok(!src.startsWith('/'), `${src} must be relative`);
    assert.equal(pngSize(src), icon.sizes, src);
    assert.equal(icon.type, 'image/png');
  }
  const sizes = manifestIcons.map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifestIcons.some((icon) => icon.purpose === 'maskable'));
  assert.equal(pngSize('icons/apple-touch-icon.png'), '180x180');
});

void test('the offline cache lists only files that exist, with relative paths [APP-2] [APP-3]', () => {
  for (const file of appShell) {
    assert.ok(!file.startsWith('/'), `${file} must be relative`);
    if (file !== './') assert.ok(exists(file), `${file} exists`);
  }
});

void test('the offline cache includes every file the game needs to start [APP-2]', () => {
  const gameModules = fs
    .readdirSync(path.join(publicDir, 'game'))
    .map((file) => `game/${file}`);
  const required = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'manifest.webmanifest',
    ...gameModules
  ];
  for (const file of required)
    assert.ok(appShell.includes(file), `${file} is cached for offline play`);
  for (const icon of manifestIcons) {
    const src = jsonString(icon.src);
    assert.ok(appShell.includes(src), `${src} is cached`);
  }
});

void test('the service worker is registered with a relative path [APP-2] [APP-3]', () => {
  assert.match(read('script.js'), /serviceWorker\.register\('sw\.js'\)/);
});

// Service worker storage behavior. The worker runs in a small fake of the
// Cache and Clients APIs, so the storage scenarios below play out against
// the real sw.js source.

import vm from 'node:vm';

const SCOPE = 'https://example.github.io/tetris-js/';
const PINS_CACHE = 'tetris-pins';

/**
 * @typedef {object} FakeCache
 * @property {(key: string | Request, response: Response) => Promise<void>} put
 * @property {(requests: Array<string | Request>) => Promise<void>} addAll
 * @property {() => Promise<Request[]>} keys
 * @property {(key: string | Request) => Promise<Response | undefined>} match
 * @property {(key: string | Request) => Promise<boolean>} delete
 */

/**
 * @typedef {object} FakeCaches
 * @property {(name: string) => Promise<FakeCache>} open
 * @property {(name: string) => Promise<boolean>} has
 * @property {() => Promise<string[]>} keys
 * @property {(name: string) => Promise<boolean>} delete
 * @property {(key: string | Request, options?: { cacheName?: string }) => Promise<Response | undefined>} match
 */

/**
 * @typedef {object} World
 * @property {FakeCaches} caches
 * @property {Map<string, Map<string, Response>>} stores
 * @property {{ onKeys: ((name: string, store: Map<string, Response>) => Promise<void>) | null }} hooks
 * @property {unknown[]} liveClients
 * @property {{ includeUncontrolled?: boolean }} [matchAllOptions]
 * @property {number} [claimCalls]
 * @property {Error} [claimError]
 */

/**
 * @typedef {(event: object) => unknown} WorkerHandler
 * @typedef {Record<string, WorkerHandler>} WorkerHandlers
 */

// A minimal Cache API: every cache is a URL -> Response map, and reads hand
// out clones the way the real Cache API does.
function makeCaches() {
  /** @type {Map<string, Map<string, Response>>} */
  const stores = new Map();
  /** @type {World['hooks']} */
  const hooks = { onKeys: null };
  /** @param {string | Request} key */
  const urlOf = (key) =>
    typeof key === 'string' ? new URL(key, SCOPE).href : key.url;
  /**
   * @param {string} name
   * @returns {FakeCache}
   */
  const makeCache = (name) => {
    /** @type {Map<string, Response>} */
    const store = stores.get(name) ?? new Map();
    stores.set(name, store);
    return {
      put: (key, response) => {
        store.set(urlOf(key), response);
        return Promise.resolve();
      },
      addAll: (requests) => {
        for (const request of requests)
          store.set(urlOf(request), new Response('cached'));
        return Promise.resolve();
      },
      keys: async () => {
        // The snapshot is taken before the hook runs, so a record written
        // during this call (a concurrent page save) is invisible to this
        // read, as in the real API.
        const snapshot = [...store.keys()];
        if (hooks.onKeys) await hooks.onKeys(name, store);
        return snapshot.map((url) => new Request(url));
      },
      match: (key) => Promise.resolve(store.get(urlOf(key))?.clone()),
      delete: (key) => Promise.resolve(store.delete(urlOf(key)))
    };
  };
  /** @type {FakeCaches} */
  const caches = {
    open: (name) => Promise.resolve(makeCache(name)),
    has: (name) => Promise.resolve(stores.has(name)),
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name) => Promise.resolve(stores.delete(name)),
    match: (key, { cacheName } = {}) =>
      Promise.resolve(
        cacheName ? stores.get(cacheName)?.get(urlOf(key))?.clone() : undefined
      )
  };
  return { caches, stores, hooks };
}

// Runs the real sw.js with fakes for the worker globals; returns its handlers.
/** @param {World} world */
function loadWorker(world) {
  /** @type {WorkerHandlers} */
  const handlers = {};
  const worker = {
    registration: { scope: SCOPE },
    clients: {
      /** @param {{ includeUncontrolled?: boolean }} options */
      matchAll: (options) => {
        world.matchAllOptions = options;
        return Promise.resolve(world.liveClients);
      },
      claim: () => {
        world.claimCalls = (world.claimCalls ?? 0) + 1;
        if (world.claimError) return Promise.reject(world.claimError);
        return Promise.resolve();
      }
    },
    /**
     * @param {string} type
     * @param {WorkerHandler} fn
     */
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    skipWaiting: () => {}
  };
  // Relative addresses in the worker (APP_SHELL, pin keys) resolve against
  // the worker's scope, as they do in a real service worker.
  const ScopedRequest = class extends Request {
    /**
     * @param {string | Request} input
     * @param {RequestInit} [init]
     */
    constructor(input, init) {
      super(typeof input === 'string' ? new URL(input, SCOPE) : input, init);
    }
  };
  const sandbox = {
    self: worker,
    caches: world.caches,
    fetch: () => Promise.reject(new Error('offline')),
    Request: ScopedRequest,
    Response,
    URL,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(read('sw.js'), sandbox);
  return handlers;
}

/**
 * @param {WorkerHandler} handler
 * @param {object} [event]
 */
const runEvent = async (handler, event = {}) => {
  /** @type {Promise<unknown> | undefined} */
  let done;
  handler({
    waitUntil: (/** @type {Promise<unknown>} */ promise) => {
      done = promise;
    },
    respondWith: () => {},
    ...event
  });
  await done;
};

/**
 * @param {World} world
 * @param {string} name
 */
const seedVersion = async (world, name, body = 'cached') => {
  await (await world.caches.open(name)).put('index.html', new Response(body));
};

/**
 * @param {World} world
 * @param {string} clientId
 * @param {string} version
 * @param {number} at
 */
const seedPin = async (world, clientId, version, at) => {
  await (
    await world.caches.open(PINS_CACHE)
  ).put(`pins/${encodeURIComponent(clientId)}`, Response.json({ version, at }));
};

const PIN_MS_TEST = 10 * 60 * 1000;

// Seeds a record whose body is not a valid pin note: unreadable JSON, or
// JSON that is missing fields a note needs.
/**
 * @param {World} world
 * @param {string} clientId
 * @param {string} body
 */
const seedRawPin = async (world, clientId, body) => {
  await (
    await world.caches.open(PINS_CACHE)
  ).put(`pins/${encodeURIComponent(clientId)}`, new Response(body));
};

// Runs the fetch handler for a subresource request and captures the answer.
/**
 * @param {WorkerHandlers} handlers
 * @param {Request} request
 * @param {string} [clientId]
 */
const runFetch = (handlers, request, clientId) => {
  /** @type {Promise<Response> | undefined} */
  let answered;
  handlers.fetch({
    request,
    clientId,
    respondWith: (/** @type {Promise<Response>} */ promise) => {
      answered = promise;
    },
    waitUntil: () => {}
  });
  return answered;
};

void test('activation preserves obsolete fixed-name caches and claims clients [APP-6]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  // Another project's cache: same fixed name, its own addresses.
  await (
    await world.caches.open('tetris')
  ).put(
    'https://example.github.io/other-app/index.html',
    new Response('theirs')
  );
  // This app's old cache: only addresses under this app's scope.
  const ours = await world.caches.open('tetris-2');
  await ours.put('index.html', new Response('ours'));
  await ours.put('style.css', new Response('ours'));
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.ok(
    world.stores.has('tetris'),
    "another project's cache named 'tetris' is left alone"
  );
  assert.ok(
    world.stores.has('tetris-2'),
    "this app's obsolete cache 'tetris-2' stays"
  );
  assert.equal(world.claimCalls, 1);
  assert.equal(await present(await ours.match('index.html')).text(), 'ours');
  assert.equal(await present(await ours.match('style.css')).text(), 'ours');
});

void test('activation neither inspects nor deletes caches before claiming clients [APP-6]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  world.caches.keys = () =>
    Promise.reject(new Error('unexpected cache inspection'));
  world.caches.has = () =>
    Promise.reject(new Error('unexpected cache inspection'));
  world.caches.open = () =>
    Promise.reject(new Error('unexpected cache inspection'));
  world.caches.delete = () =>
    Promise.reject(new Error('unexpected cache deletion'));
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.equal(world.claimCalls, 1);
});

void test('activation preserves a rejected clients.claim result [APP-6]', async () => {
  const error = new Error('claim refused');
  /** @type {World} */
  const world = { liveClients: [], claimError: error, ...makeCaches() };
  const handlers = loadWorker(world);
  await assert.rejects(
    runEvent(handlers.activate),
    (received) => received === error
  );
  assert.equal(world.claimCalls, 1);
});

void test('a clock jump forward cannot cost a loading page its version [APP-2]', async () => {
  /** @type {World} */
  const world = { liveClients: [{ id: 'page-1' }], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  // The clock jumped forward: the record looks twenty minutes old, but the
  // page that made it is still open.
  await seedPin(
    world,
    'page-1',
    'tetris-version-1-aaa',
    Date.now() - 2 * PIN_MS_TEST
  );
  const handlers = loadWorker(world);
  await runEvent(handlers.install); // downloads version 3, then cleans up
  assert.equal(
    world.matchAllOptions?.includeUncontrolled,
    true,
    'a page still loading is not yet a controlled client'
  );
  assert.ok(
    world.stores.has('tetris-version-1-aaa'),
    "the open page's version survives"
  );
  const pin = await (
    await world.caches.open(PINS_CACHE)
  ).match(`pins/${encodeURIComponent('page-1')}`);
  assert.ok(pin, "the open page's record survives");
});

void test('a record whose page is gone expires by age, and its version is deleted [APP-2]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  await seedPin(
    world,
    'page-gone',
    'tetris-version-1-aaa',
    Date.now() - 2 * PIN_MS_TEST
  );
  const handlers = loadWorker(world);
  await runEvent(handlers.install);
  assert.ok(
    !world.stores.has('tetris-version-1-aaa'),
    'the old version is deleted once its page is gone'
  );
  const pin = await (
    await world.caches.open(PINS_CACHE)
  ).match(`pins/${encodeURIComponent('page-gone')}`);
  assert.ok(!pin, 'the expired record is removed');
});

void test('a page record saved while cleanup runs keeps its version [APP-2]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  // A page saves its record just after cleanup reads the records: the first
  // keys() call still answers the old list, but the record is already stored.
  let hooked = true;
  world.hooks.onKeys = (name, store) => {
    if (hooked && name === PINS_CACHE) {
      hooked = false;
      const written = Response.json({
        version: 'tetris-version-1-aaa',
        at: Date.now()
      });
      store.set(
        new URL(`pins/${encodeURIComponent('page-late')}`, SCOPE).href,
        written
      );
    }
    return Promise.resolve();
  };
  const handlers = loadWorker(world);
  await runEvent(handlers.install);
  assert.ok(
    world.stores.has('tetris-version-1-aaa'),
    "the late record's version is not deleted under it"
  );
});

void test("an old cache mixing this app's and another project's addresses stays [APP-6]", async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  const mixed = await world.caches.open('tetris');
  await mixed.put('index.html', new Response('ours'));
  await mixed.put(
    'https://example.github.io/other-app/index.html',
    new Response('theirs')
  );
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.ok(
    world.stores.has('tetris'),
    'a cache holding any foreign address is left alone'
  );
});

void test('an empty old cache stays, its maker unknown [APP-6]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  await world.caches.open('tetris-2'); // created but never filled
  const handlers = loadWorker(world);
  await runEvent(handlers.activate);
  assert.ok(world.stores.has('tetris-2'), 'an empty cache is left alone');
});

void test('a pin note missing its timestamp still names its version and does not expire [SAF-2] [APP-2]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa', 'one');
  await seedVersion(world, 'tetris-version-2-bbb', 'two');
  await seedRawPin(
    world,
    'page-gone',
    JSON.stringify({ version: 'tetris-version-1-aaa' })
  );
  const handlers = loadWorker(world);
  const response = await runFetch(
    handlers,
    new Request(new URL('index.html', SCOPE)),
    'page-gone'
  );
  assert.equal(
    await present(response).text(),
    'one',
    'the named version answers, as with a complete note'
  );
  await runEvent(handlers.install); // downloads version 3, then cleans up
  assert.ok(
    world.stores.has('tetris-version-1-aaa'),
    'an ageless note keeps its version, as before'
  );
  const pin = await (
    await world.caches.open(PINS_CACHE)
  ).match(`pins/${encodeURIComponent('page-gone')}`);
  assert.ok(pin, 'an ageless note does not expire by time');
});

void test('an unreadable record whose page is gone is removed, and cleanup continues [SAF-2] [APP-2]', async () => {
  /** @type {World} */
  const world = { liveClients: [], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  await seedRawPin(world, 'page-gone', 'not json');
  await seedPin(
    world,
    'page-old',
    'tetris-version-1-aaa',
    Date.now() - 2 * PIN_MS_TEST
  );
  const handlers = loadWorker(world);
  await runEvent(handlers.install);
  const pins = await world.caches.open(PINS_CACHE);
  assert.ok(
    !(await pins.match(`pins/${encodeURIComponent('page-gone')}`)),
    'the unreadable record is removed'
  );
  assert.ok(
    !(await pins.match(`pins/${encodeURIComponent('page-old')}`)),
    'the expired record is still removed'
  );
  assert.ok(
    !world.stores.has('tetris-version-1-aaa'),
    'the old version is deleted'
  );
  assert.ok(
    world.stores.has('tetris-version-2-bbb'),
    'the previous version is kept'
  );
});

void test('an unreadable record whose page is still open keeps every old version [SAF-2] [APP-2]', async () => {
  /** @type {World} */
  const world = { liveClients: [{ id: 'page-1' }], ...makeCaches() };
  await seedVersion(world, 'tetris-version-1-aaa');
  await seedVersion(world, 'tetris-version-2-bbb');
  await seedRawPin(world, 'page-1', 'not json');
  const handlers = loadWorker(world);
  await runEvent(handlers.install);
  const pin = await (
    await world.caches.open(PINS_CACHE)
  ).match(`pins/${encodeURIComponent('page-1')}`);
  assert.ok(
    pin,
    "an open page's record is left for it to rewrite on its next save"
  );
  assert.ok(
    world.stores.has('tetris-version-1-aaa'),
    "no old version is deleted while its page's record cannot be read"
  );
});
