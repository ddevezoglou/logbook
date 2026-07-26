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
  const BROWSER_FAMILIES = new Set(['chromium', 'webkit', 'firefox', 'unknown']);
  const GUEST_QUEUE_KEY = 'logbookGuestErrorQueue';
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

  function safeStoredEvent(value) {
    if (!value || typeof value !== 'object' || !CODES_BY_SOURCE[value.event_source]?.has(value.event_code)) return null;
    return {
      event_source:value.event_source,
      event_code:value.event_code,
      event_error_name:ERROR_NAMES.has(value.event_error_name) ? value.event_error_name : 'Error',
      event_app_version:/^\d+\.\d+\.\d+$/.test(value.event_app_version) ? value.event_app_version : '0.0.0',
      event_browser_family:BROWSER_FAMILIES.has(value.event_browser_family) ? value.event_browser_family : 'unknown',
      event_online:Boolean(value.event_online),
    };
  }

  function readGuestQueue() {
    try {
      const values = JSON.parse(localStorage.getItem(GUEST_QUEUE_KEY) || '[]');
      return Array.isArray(values) ? values.map(safeStoredEvent).filter(Boolean).slice(-MAX_PENDING) : [];
    } catch {
      return [];
    }
  }

  function writeGuestQueue(values) {
    try {
      if (values.length) localStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(values.slice(-MAX_PENDING)));
      else localStorage.removeItem(GUEST_QUEUE_KEY);
    } catch { /* Error reporting must never interrupt the application. */ }
  }

  function queueGuest(event) {
    writeGuestQueue([...readGuestQueue(), event]);
  }

  function queue(event) {
    if (authState === 'anonymous') return queueGuest(event);
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
      else queueGuest(event);
      return false;
    }
    try {
      const { error } = await client.rpc('report_client_error', event);
      if (error) queue(event);
      return !error;
    } catch {
      queue(event);
      return false;
    }
  }

  async function flush() {
    if (!client || !userId || !navigator.onLine) return;
    const events = [...readGuestQueue(), ...pending.splice(0, pending.length)];
    if (!events.length) return;
    writeGuestQueue([]);
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
    const previousUserId = userId;
    const wasUnknown = authState === 'unknown';
    const changedUser = Boolean(userId && nextUserId && userId !== nextUserId);
    userId = nextUserId;
    authState = userId ? 'authenticated' : 'anonymous';
    if (changedUser || (previousUserId && !userId)) pending.length = 0;
    else if (!userId && wasUnknown && pending.length) {
      pending.splice(0, pending.length).forEach(queueGuest);
    }
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
