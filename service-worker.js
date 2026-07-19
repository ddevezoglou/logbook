const CACHE_VERSION = 'logbook-0.7.0';
const OFFLINE_PAGE = new URL('./index.html', self.registration.scope).href;
const SUPABASE_LIBRARY = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './fonts.css',
  './styles.css',
  './quotes.js',
  './i18n.js',
  './supabase-config.js',
  './supabase-client.js',
  './auth.js',
  './cloud-sync.js',
  './app.js',
  './pwa.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
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
  if (request.url === SUPABASE_LIBRARY) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
        return response;
      }))
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(OFFLINE_PAGE).then(cached => cached || fetch(request)).catch(() => Response.error())
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
