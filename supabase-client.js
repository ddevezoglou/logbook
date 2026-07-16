(() => {
  const config = window.LogbookSupabaseConfig;
  const libraryUrl = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  if (!config?.url || !config?.publishableKey) {
    console.warn('Logbook cloud connection is not configured.');
    return;
  }

  function initializeClient() {
    const createClient = window.supabase?.createClient;
    if (typeof createClient !== 'function') {
      console.warn('Supabase JavaScript client did not load.');
      return;
    }

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

  if (window.supabase?.createClient) {
    initializeClient();
    return;
  }

  const library = document.createElement('script');
  library.src = libraryUrl;
  library.async = true;
  library.dataset.logbookSupabaseLibrary = '';
  library.addEventListener('load', initializeClient, { once: true });
  library.addEventListener('error', () => {
    console.warn('Logbook cloud connection is unavailable; local mode remains active.');
  }, { once: true });
  document.head.append(library);
})();
