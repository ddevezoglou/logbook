(() => {
  const CODES_BY_SOURCE = Object.freeze({
    sync:new Set(['sync_failure', 'sync_conflict', 'sync_network_failure']),
    pwa:new Set(['service_worker_cleanup_failed', 'service_worker_registration_failed']),
    window:new Set(['unhandled_error']),
    promise:new Set(['unhandled_rejection']),
  });
  const ERROR_NAMES = new Set([
    'Error',
    'TypeError',
    'ReferenceError',
    'RangeError',
    'SyntaxError',
    'DOMException',
    'AggregateError',
  ]);
  const MAX_PENDING = 10;
  const MAX_REPORTS_PER_PAGE = 5;
  const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
  const pending = [];
  const recent = new Map();
  let client = null;
  let userId = null;
  let authState = 'unknown';
  let reportsThisPage = 0;

  function appVersion() {
    const value = document.querySelector('.app-version b')?.textContent?.trim() || '';
    return /^\d+\.\d+\.\d+$/.test(value) ? value : '0.0.0';
  }

  function browserFamily() {
    const agent = navigator.userAgent || '';
    if (/firefox|fxios/i.test(agent)) return 'firefox';
    if (/edg|chrome|chromium|crios/i.test(agent)) return 'chromium';
    if (/safari/i.test(agent)) return 'webkit';
    return 'unknown';
  }

  function errorName(error) {
    const value = typeof error?.name === 'string' ? error.name : 'Error';
    return ERROR_NAMES.has(value) ? value : 'Error';
  }

  function safeEvent(source, code, error) {
    if (!CODES_BY_SOURCE[source]?.has(code)) return null;
    return {
      event_source:source,
      event_code:code,
      event_error_name:errorName(error),
      event_app_version:appVersion(),
      event_browser_family:browserFamily(),
      event_online:Boolean(navigator.onLine),
    };
  }

  function queue(event) {
    if (authState === 'anonymous') return;
    if (pending.length >= MAX_PENDING) pending.shift();
    pending.push(event);
  }

  async function send(event) {
    if (!client || authState === 'unknown') {
      queue(event);
      return false;
    }
    if (!userId || !navigator.onLine) {
      if (userId) queue(event);
      return false;
    }
    try {
      const { error } = await client.rpc('report_client_error', event);
      return !error;
    } catch {
      return false;
    }
  }

  async function flush() {
    if (!client || !userId || !navigator.onLine || !pending.length) return;
    const events = pending.splice(0, pending.length);
    for (const event of events) await send(event);
  }

  function report(source, code, error = null) {
    const event = safeEvent(source, code, error);
    if (!event || reportsThisPage >= MAX_REPORTS_PER_PAGE) return Promise.resolve(false);
    const key = `${event.event_source}:${event.event_code}:${event.event_error_name}`;
    const now = Date.now();
    if (now - (recent.get(key) || 0) < DEDUPE_WINDOW_MS) return Promise.resolve(false);
    recent.set(key, now);
    reportsThisPage += 1;
    return send(event);
  }

  function setSession(session) {
    const nextUserId = session?.user?.id || null;
    const changedUser = Boolean(userId && nextUserId && userId !== nextUserId);
    userId = nextUserId;
    authState = userId ? 'authenticated' : 'anonymous';
    if (!userId || changedUser) pending.length = 0;
    if (userId) flush();
  }

  async function bindClient(nextClient) {
    if (!nextClient || client === nextClient) return;
    client = nextClient;
    try {
      const { data, error } = await client.auth.getSession();
      setSession(error ? null : data?.session);
    } catch {
      setSession(null);
    }
    client.auth.onAuthStateChange((_event, session) => setSession(session));
  }

  window.addEventListener('error', event => {
    if (event.error) report('window', 'unhandled_error', event.error);
  });
  window.addEventListener('unhandledrejection', event => {
    report('promise', 'unhandled_rejection', event.reason);
  });
  window.addEventListener('online', flush);
  window.addEventListener('logbook:supabase-ready', event => bindClient(event.detail?.client));

  window.LogbookErrorTracking = Object.freeze({ report, flush });
  if (window.LogbookSupabase) bindClient(window.LogbookSupabase);
})();
