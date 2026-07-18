(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  window.addEventListener('load', () => {
    const serviceWorkerUrl = new URL('./service-worker.js', document.baseURI);
    navigator.serviceWorker.register(serviceWorkerUrl, { scope:'./' }).catch(error => {
      console.warn('Logbook service worker registration failed.', error);
    });
  }, { once:true });
})();
