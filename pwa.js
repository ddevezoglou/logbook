(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  const localDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const localWorkerEnabled = sessionStorage.getItem('logbookLocalWorkerEnabled') === 'true';

  async function clearLocalDevelopmentWorker() {
    const scope = new URL('./', document.baseURI).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const scopedRegistrations = registrations.filter(registration => registration.scope === scope);
    const unregisterResults = await Promise.all(scopedRegistrations.map(registration => registration.unregister()));
    const cacheNames = 'caches' in window ? await caches.keys() : [];
    const logbookCaches = cacheNames.filter(name => name.startsWith('logbook-'));
    await Promise.all(logbookCaches.map(name => caches.delete(name)));

    const removedCachedShell = unregisterResults.some(Boolean) || logbookCaches.length > 0;
    if (removedCachedShell && navigator.serviceWorker.controller && !sessionStorage.getItem('logbookLocalWorkerCleared')) {
      sessionStorage.setItem('logbookLocalWorkerCleared', 'true');
      window.location.reload();
    }
  }

  window.addEventListener('load', () => {
    // Development must always load one coherent set of HTML/CSS/JS files from
    // the no-store server. A previously installed worker can otherwise combine
    // the old profile markup with the new app.js and break desktop navigation.
    if (localDevelopment && !localWorkerEnabled) {
      clearLocalDevelopmentWorker().catch(error => {
        console.warn('Logbook local service worker cleanup failed.', error);
      });
      return;
    }

    const serviceWorkerUrl = new URL('./service-worker.js', document.baseURI);
    navigator.serviceWorker.register(serviceWorkerUrl, { scope:'./' })
      .then(registration => {
        window.addEventListener('online', () => registration.update(), { passive:true });
      })
      .catch(error => {
        console.warn('Logbook service worker registration failed.', error);
      });
  }, { once:true });
})();
