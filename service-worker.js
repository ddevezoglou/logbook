const CACHE_VERSION = 'logbook-0.2.7';
const OFFLINE_PAGE = new URL('./index.html', self.registration.scope).href;
const APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
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
  './auth.js?v=0.2.7',
  './cloud-sync.js',
  './app.js',
  './modules/storage-migrations.js',
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
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('logbook-') && key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network-first ανά διαδρομή. Cache-first εδώ σήμαινε ότι κάθε πλοήγηση έπαιρνε
    // το `index.html` — η `privacy.html` γινόταν απρόσιτη σε κάθε χρήστη με ενεργό
    // worker. Η απόκριση δικτύου δεν μπαίνει στην cache: το shell ανανεώνεται μόνο
    // ολόκληρο στο install, ώστε το HTML να μη διαφωνεί ποτέ με το cached JS.
    event.respondWith(
      fetch(request).catch(() => caches.match(request, { ignoreSearch:true })
        .then(cached => cached || caches.match(OFFLINE_PAGE))
        .then(cached => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch:true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
    })
  );
});
