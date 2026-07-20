(() => {
  const config = window.LogbookSupabaseConfig;
  const libraryUrl = new URL('assets/vendor/supabase-2.110.7.min.js', document.baseURI).href;
  let library = null;
  let initialized = false;

  if (!config?.url || !config?.publishableKey) {
    console.warn('Logbook cloud connection is not configured.');
    window.dispatchEvent(new CustomEvent('logbook:supabase-unavailable'));
    return;
  }

  function cachedSession() {
    try {
      const projectRef = new URL(config.url).hostname.split('.')[0];
      const value = JSON.parse(localStorage.getItem(`sb-${projectRef}-auth-token`) || 'null');
      const session = value?.currentSession || value;
      return session?.user?.id && session?.access_token ? session : null;
    } catch {
      return null;
    }
  }

  function reportUnavailable() {
    const session = cachedSession();
    if (session) {
      window.LogbookOfflineSession = session;
      window.dispatchEvent(new CustomEvent('logbook:offline-session', { detail:{ session } }));
      return;
    }
    window.dispatchEvent(new CustomEvent('logbook:supabase-unavailable'));
  }

  function initializeClient() {
    if (initialized) return;
    const createClient = window.supabase?.createClient;
    if (typeof createClient !== 'function') {
      console.warn('Supabase JavaScript client did not load.');
      reportUnavailable();
      return;
    }

    initialized = true;
    window.LogbookSupabase = createClient(config.url, config.publishableKey, {
      db: { schema: 'public' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    window.dispatchEvent(new CustomEvent('logbook:supabase-ready', {
      detail: { client: window.LogbookSupabase },
    }));
  }

  function loadLibrary() {
    if (window.supabase?.createClient) return initializeClient();
    if (library?.isConnected) return;

    library = document.createElement('script');
    library.src = libraryUrl;
    library.async = true;
    library.dataset.logbookSupabaseLibrary = '';
    library.addEventListener('load', initializeClient, { once: true });
    library.addEventListener('error', () => {
      library = null;
      console.warn('Logbook cloud connection is unavailable.');
      reportUnavailable();
    }, { once: true });
    document.head.append(library);
  }

  window.addEventListener('online', loadLibrary);
  loadLibrary();
})();
