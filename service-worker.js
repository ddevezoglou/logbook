const CACHE_VERSION = 'logbook-0.3.3';
// The production builder fingerprints every shipped file, including quotes.
// A content change must install a new shell even if the version was not bumped.
const BUILD_ID = 'development';
const CACHE_NAME = `${CACHE_VERSION}-${BUILD_ID}`;
const OFFLINE_PAGE = new URL('./index.html', self.registration.scope).href;
const APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
  './privacy.en.html',
  './privacy.fr.html',
  './privacy.de.html',
  './manifest.webmanifest',
  './favicon.svg',
  './fonts.css',
  './tokens.css',
  './base.css',
  './components.css',
  './dialogs.css',
  './views.css',
  './legal.css',
  './quotes.js',
  './theme.js',
  './i18n.js',
  './supabase-config.js',
  './supabase-client.js',
  './error-tracking.js',
  './session-state.js',
  './auth.js?v=0.3.1',
  './cloud-sync.js',
  './data-reconciliation.js',
  './app.js',
  './modules/storage-migrations.js',
  './modules/exercises.js',
  './modules/routines.js',
  './modules/sessions.js',
  './modules/progress-chart.js',
  './modules/history.js',
  './modules/session-templates.js',
  './modules/progress-rewards.js',
  './modules/ui.js',
  './pwa.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/vendor/supabase-2.110.7.min.js',
  './assets/fonts/source-sans-3-greek-wght-normal.woff2',
  './assets/fonts/source-sans-3-latin-wght-normal.woff2',
  './assets/fonts/alegreya-sans-greek-400-normal.woff2',
  './assets/fonts/alegreya-sans-greek-500-normal.woff2',
  './assets/fonts/alegreya-sans-greek-700-normal.woff2',
  './assets/fonts/alegreya-sans-greek-800-normal.woff2',
  './assets/fonts/alegreya-sans-latin-400-normal.woff2',
  './assets/fonts/alegreya-sans-latin-500-normal.woff2',
  './assets/fonts/alegreya-sans-latin-700-normal.woff2',
  './assets/fonts/alegreya-sans-latin-800-normal.woff2',
  './assets/fonts/roboto-slab-greek-500-normal.woff2',
  './assets/fonts/roboto-slab-greek-700-normal.woff2',
  './assets/fonts/roboto-slab-latin-500-normal.woff2',
  './assets/fonts/roboto-slab-latin-700-normal.woff2',
  './assets/fonts/playpen-sans-greek-400-normal.woff2',
  './assets/fonts/playpen-sans-greek-600-normal.woff2',
  './assets/fonts/playpen-sans-latin-400-normal.woff2',
  './assets/fonts/playpen-sans-latin-600-normal.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
    APP_SHELL.map(path => new Request(new URL(path, self.registration.scope), { cache:'reload' }))
  )));
  // Let open pages finish on their own release. Activation happens after they
  // close; forcing takeover can mix old modules with the new shell mid-workout.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('logbook-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Serve each cached document from the SAME release as its scripts/styles.
    // A network-first document plus cache-first scripts produces a mixed app.
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request, { ignoreSearch:true });
        if (cached) return cached;
        return fetch(request).catch(async () => (await cache.match(OFFLINE_PAGE)) || Response.error());
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          event.waitUntil(cache.put(request, response.clone()));
        }
        return response;
      });
    })
  );
});
