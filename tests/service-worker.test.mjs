import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

// Ο service worker ήταν το μοναδικό runtime αρχείο χωρίς εκτελεστική κάλυψη: τα
// υπόλοιπα tests τον διάβαζαν ως κείμενο. Εδώ φορτώνεται σε ελεγχόμενο worker
// scope, ώστε οι `install`, `activate` και `fetch` handlers να τρέχουν πραγματικά.
const source = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const SCOPE = 'https://ddevezoglou.github.io/logbook/';

function createWorkerScope({ online = true } = {}) {
  const listeners = new Map();
  const caches = new Map();
  const networkLog = [];

  const key = resource => (typeof resource === 'string' ? resource : resource.url);
  const withoutSearch = url => url.split('?')[0];

  function openCache(name) {
    if (!caches.has(name)) caches.set(name, new Map());
    const entries = caches.get(name);
    return {
      async addAll(paths) {
        for (const path of paths) {
          const url = new URL(path, SCOPE).href;
          entries.set(url, { url, from:'cache', ok:true, type:'basic', clone() { return this; } });
        }
      },
      async put(request, response) {
        entries.set(key(request), { ...response, from:'cache' });
      },
    };
  }

  const scope = {
    URL,
    Promise,
    console,
    Response:{ error:() => ({ type:'error', from:'network-error' }) },
    async fetch(request) {
      networkLog.push(key(request));
      if (!online) throw new TypeError('Failed to fetch');
      const url = key(request);
      return { url, from:'network', ok:true, type:'basic', clone() { return this; } };
    },
    caches:{
      open:async name => openCache(name),
      keys:async () => [...caches.keys()],
      delete:async name => caches.delete(name),
      async match(resource, { ignoreSearch = false } = {}) {
        const wanted = ignoreSearch ? withoutSearch(key(resource)) : key(resource);
        for (const entries of caches.values()) {
          for (const [url, response] of entries) {
            if ((ignoreSearch ? withoutSearch(url) : url) === wanted) return response;
          }
        }
        return undefined;
      },
    },
    self:{
      location:new URL(SCOPE),
      registration:{ scope:SCOPE },
      clients:{ claim:async () => {} },
      skipWaiting() {},
      addEventListener(type, listener) { listeners.set(type, listener); },
    },
  };
  scope.self.caches = scope.caches;
  scope.self.fetch = scope.fetch;

  runInContext(source, createContext(scope));

  async function dispatch(type, event) {
    const pending = [];
    const responses = [];
    await listeners.get(type)({
      ...event,
      waitUntil:promise => pending.push(promise),
      respondWith:promise => responses.push(promise),
    });
    await Promise.all(pending);
    return responses.length ? responses[0] : undefined;
  }

  return {
    caches,
    networkLog,
    install:() => dispatch('install', {}),
    activate:() => dispatch('activate', {}),
    request(path, { mode = 'no-cors', method = 'GET' } = {}) {
      return { url:new URL(path, SCOPE).href, mode, method, headers:{ has:() => false } };
    },
    navigate(path) {
      return dispatch('fetch', { request:this.request(path, { mode:'navigate' }) });
    },
    fetchAsset(path) {
      return dispatch('fetch', { request:this.request(path) });
    },
  };
}

async function installedWorker(options) {
  const worker = createWorkerScope(options);
  await worker.install();
  await worker.activate();
  worker.networkLog.length = 0;
  return worker;
}

test('the install handler precaches the privacy policy next to the app shell', async () => {
  const worker = await installedWorker();
  const cached = [...worker.caches.values()].flatMap(entries => [...entries.keys()]);

  assert.ok(cached.includes(`${SCOPE}privacy.html`), 'privacy.html is precached');
  assert.ok(cached.includes(`${SCOPE}index.html`), 'index.html is precached');
});

test('online navigation is served from the network so each path renders its own document', async () => {
  const worker = await installedWorker();

  const response = await worker.navigate('privacy.html');

  assert.equal(response.from, 'network');
  assert.equal(response.url, `${SCOPE}privacy.html`);
  assert.deepEqual(worker.networkLog, [`${SCOPE}privacy.html`]);
});

test('offline navigation falls back to the cached document of the requested path', async () => {
  const worker = await installedWorker({ online:false });

  const response = await worker.navigate('privacy.html');

  assert.equal(response.from, 'cache');
  assert.equal(response.url, `${SCOPE}privacy.html`, 'the privacy policy is not replaced by the app shell');
});

test('offline navigation to the root still boots the cached app shell', async () => {
  const worker = await installedWorker({ online:false });

  const response = await worker.navigate('./');

  assert.equal(response.from, 'cache');
  assert.equal(response.url, SCOPE);
});

test('offline navigation to an uncached path falls back to the offline app shell', async () => {
  const worker = await installedWorker({ online:false });

  const response = await worker.navigate('deep/unknown-route');

  assert.equal(response.from, 'cache');
  assert.equal(response.url, `${SCOPE}index.html`);
});

test('assets stay cache-first so the shell keeps one coherent set of files', async () => {
  const worker = await installedWorker();

  const response = await worker.fetchAsset('app.js');

  assert.equal(response.from, 'cache');
  assert.deepEqual(worker.networkLog, [], 'a precached asset never reaches the network');
});

test('the activate handler drops shell caches of previous versions', async () => {
  const worker = createWorkerScope();
  worker.caches.set('logbook-0.0.1', new Map());
  await worker.install();
  await worker.activate();

  assert.deepEqual([...worker.caches.keys()].filter(name => name === 'logbook-0.0.1'), []);
});
