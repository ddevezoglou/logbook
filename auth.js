(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const t = value => window.LogbookI18n?.t?.(value) || value;
  const dialog = $('#account-dialog');
  const deleteDialog = $('#account-delete-dialog');
  const gate = $('#auth-gate');
  const guest = $('#account-guest');
  const member = $('#account-member');
  const status = $('#account-form-status');
  let client = null;
  let session = null;
  let mode = 'signin';
  let passwordRecoveryActive = false;
  let pendingSyncUserId = null;
  let appLoaded = false;
  // The initial-sync event can fire before renderSession() arms pendingSyncUserId
  // (e.g. offline boot, where cloud-sync completes instantly). Keep the last
  // result so a late listener can still consume it instead of hanging on "syncing".
  let lastSyncResult = null;
  let syncWatchdog = null;
  let offlineSessionActive = false;
  const SYNC_WATCHDOG_MS = 25000;

  function setStatus(message = '', kind = 'neutral') {
    status.textContent = message ? t(message) : '';
    status.dataset.kind = kind;
    status.classList.toggle('hidden', !message);
  }

  function setDeleteStatus(message = '', kind = 'neutral') {
    const deleteStatus = $('#account-delete-status');
    deleteStatus.textContent = message ? t(message) : '';
    deleteStatus.dataset.kind = kind;
    deleteStatus.classList.toggle('hidden', !message);
  }

  function setBusy(form, busy) {
    [...form.elements].forEach(control => { control.disabled = busy; });
    form.setAttribute('aria-busy', String(busy));
  }

  function getAuthRedirectUrl() {
    const redirectUrl = window.LogbookSupabaseConfig?.siteUrl;
    if (redirectUrl) return redirectUrl;
    setStatus('Ξεκινήστε πρώτα τον τοπικό server και ανοίξτε το Logbook από http://localhost:3000/.', 'error');
    return null;
  }

  function setMode(next) {
    const modes = ['signin', 'signup', 'forgot', 'recovery'];
    mode = modes.includes(next) ? next : 'signin';
    $$('[data-account-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.accountMode === mode));
    });
    $('#account-signin-form').classList.toggle('hidden', mode !== 'signin');
    $('#account-signup-form').classList.toggle('hidden', mode !== 'signup');
    $('#account-forgot-form').classList.toggle('hidden', mode !== 'forgot');
    $('#account-recovery-form').classList.toggle('hidden', mode !== 'recovery');
    $('#account-login-options').classList.toggle('hidden', !['signin', 'signup'].includes(mode));
    $('#account-tabs').classList.toggle('hidden', !['signin', 'signup'].includes(mode));
    setStatus('');
  }

  let gateMessageSource = '';
  function setGateState(state, message = '') {
    gate.dataset.state = state;
    if (message) gateMessageSource = message;
    const checking = ['checking', 'syncing', 'loading', 'error'].includes(state);
    $('#auth-gate-progress').classList.toggle('hidden', !checking);
    guest.classList.toggle('hidden', state !== 'login');
    $('#account-tabs').classList.toggle('hidden', state !== 'login' || !['signin', 'signup'].includes(mode));
    $('#auth-gate-retry').classList.toggle('hidden', state !== 'error');
    if (message) $('#auth-gate-message').textContent = t(message);

    const titles = {
      checking:'ΕΛΕΓΧΟΣ ΣΥΝΔΕΣΗΣ',
      syncing:'ΣΥΓΧΡΟΝΙΣΜΟΣ ΔΕΔΟΜΕΝΩΝ',
      loading:'ΦΟΡΤΩΣΗ ΕΦΑΡΜΟΓΗΣ',
      error:'Η ΣΥΝΔΕΣΗ ΔΙΑΚΟΠΗΚΕ',
    };
    if (titles[state]) $('#auth-gate-title').textContent = t(titles[state]);

    document.body.classList.toggle('app-ready', state === 'ready');
    document.body.classList.toggle('auth-required', state === 'login' || state === 'error');
    document.body.classList.toggle('app-booting', state !== 'ready' && state !== 'login' && state !== 'error');
    gate.setAttribute('aria-hidden', String(state === 'ready'));
    if (state === 'error') requestAnimationFrame(() => $('#auth-gate-retry')?.focus());
  }

  function showLogin() {
    passwordRecoveryActive = false;
    pendingSyncUserId = null;
    if (mode === 'recovery') setMode('signin');
    setGateState('login');
    setStatus('');
    requestAnimationFrame(() => {
      const target = mode === 'signup' ? $('#account-signup-email') : $('#account-signin-email');
      target?.focus();
    });
  }

  function showPasswordRecovery(nextSession) {
    passwordRecoveryActive = true;
    session = nextSession || session;
    pendingSyncUserId = null;
    setGateState('login');
    setMode('recovery');
    requestAnimationFrame(() => $('#account-recovery-password')?.focus());
  }

  function waitForInitialSync(nextSession) {
    const userId = nextSession?.user?.id;
    if (!userId || document.body.classList.contains('app-ready')) return;
    pendingSyncUserId = userId;
    if (lastSyncResult && lastSyncResult.userId === userId) {
      const { success } = lastSyncResult;
      lastSyncResult = null;
      if (success) return loadApplication();
      setGateState('error', 'Ο αρχικός συγχρονισμός δεν ολοκληρώθηκε. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.');
      return;
    }
    setGateState('syncing', 'Φέρνουμε τις τελευταίες προπονήσεις και τα προγράμματά σας.');
    clearTimeout(syncWatchdog);
    syncWatchdog = setTimeout(() => {
      if (pendingSyncUserId === userId && gate.dataset.state === 'syncing') {
        setGateState('error', 'Ο αρχικός συγχρονισμός δεν ολοκληρώθηκε. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.');
      }
    }, SYNC_WATCHDOG_MS);
  }

  function loadApplication() {
    setGateState('loading', 'Όλα είναι έτοιμα. Ανοίγουμε το Logbook.');
    if (appLoaded) {
      window.location.reload();
      return;
    }
    if (document.querySelector('script[data-logbook-app]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'app.js';
    script.dataset.logbookApp = '';
    script.addEventListener('load', () => {
      appLoaded = true;
      pendingSyncUserId = null;
      setGateState('ready');
      window.dispatchEvent(new CustomEvent('logbook:app-ready'));
    }, { once:true });
    script.addEventListener('error', () => {
      setGateState('error', 'Δεν φορτώθηκε η εφαρμογή. Δοκιμάστε ξανά.');
    }, { once:true });
    document.body.append(script);
  }

  function updateSyncStatus(message, kind = 'neutral') {
    const state = $('#account-sync-state');
    if (!state) return;
    state.dataset.kind = kind;
    $('#account-sync-message').textContent = t(message);
  }

  function renderOfflineSession(nextSession) {
    if (!nextSession?.user?.id) return;
    const alreadyReady = document.body.classList.contains('app-ready');
    offlineSessionActive = true;
    session = nextSession;
    const email = session.user.email || '';
    guest.classList.add('hidden');
    member.classList.remove('hidden');
    $('#account-member-email').textContent = email;
    $('#account-menu-email').textContent = email;
    $('#account-menu-email').classList.toggle('hidden', !email);
    $('#account-menu-status').classList.add('hidden');
    $('#account-open').classList.add('is-connected');
    $('#account-open').setAttribute('aria-label', `${t('ΛΟΓΑΡΙΑΣΜΟΣ')}: ${email || t('Εκτός σύνδεσης')}`);
    $('#account-signout').disabled = true;
    $('#account-delete').disabled = true;
    updateSyncStatus('Εκτός σύνδεσης · οι αλλαγές μένουν σε αυτή τη συσκευή.', 'offline');
    if (alreadyReady) return;
    setGateState('loading', 'Εκκίνηση εκτός σύνδεσης με τα δεδομένα αυτής της συσκευής.');
    loadApplication();
  }

  function renderSession(nextSession) {
    session = nextSession || null;
    const email = session?.user?.email || '';
    const signedIn = Boolean(email);
    guest.classList.toggle('hidden', signedIn);
    member.classList.toggle('hidden', !signedIn);
    $('#account-member-email').textContent = email;
    $('#account-menu-email').textContent = email;
    $('#account-menu-email').classList.toggle('hidden', !signedIn);
    $('#account-menu-status').textContent = 'ΧΩΡΙΣ ΣΥΝΔΕΣΗ';
    $('#account-menu-status').classList.toggle('hidden', signedIn);
    $('#account-open').classList.toggle('is-connected', signedIn);
    $('#account-open').setAttribute('aria-label', signedIn ? `${t('ΛΟΓΑΡΙΑΣΜΟΣ')}: ${email}` : t('ΛΟΓΑΡΙΑΣΜΟΣ'));
    if (!signedIn && deleteDialog.open) deleteDialog.close();
    if (signedIn) waitForInitialSync(session);
    else showLogin();
    window.LogbookI18n?.translate(document);
  }

  async function checkSession() {
    if (!client) return;
    setGateState('checking', 'Ελέγχουμε αν υπάρχει ενεργή συνεδρία σε αυτή τη συσκευή.');
    const { data, error } = await client.auth.getSession();
    if (error) {
      setGateState('error', 'Δεν μπορέσαμε να ελέγξουμε τη σύνδεσή σας. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.');
      return;
    }
    if (!passwordRecoveryActive) renderSession(data?.session);
  }

  async function bindClient(nextClient) {
    if (!nextClient || client === nextClient) return;
    client = nextClient;
    offlineSessionActive = false;
    $('#account-signout').disabled = false;
    $('#account-delete').disabled = false;
    client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') return showPasswordRecovery(nextSession);
      if (passwordRecoveryActive && event === 'USER_UPDATED') return;
      renderSession(nextSession);
    });
    await checkSession();
  }

  $('#account-open').addEventListener('click', () => {
    $('#close-menu').click();
    dialog.showModal();
    requestAnimationFrame(() => $(offlineSessionActive ? '#account-close' : '#account-signout')?.focus());
  });
  $('#account-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  $('#account-delete').addEventListener('click', () => {
    setDeleteStatus('');
    deleteDialog.showModal();
    requestAnimationFrame(() => $('#account-delete-cancel')?.focus());
  });
  $('#account-delete-cancel').addEventListener('click', () => deleteDialog.close());
  deleteDialog.addEventListener('click', event => {
    if (event.target === deleteDialog && !$('#account-delete-accept').disabled) deleteDialog.close();
  });
  $$('[data-account-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.accountMode)));
  $('#account-forgot-password').addEventListener('click', () => {
    $('#account-forgot-email').value = $('#account-signin-email').value.trim();
    setMode('forgot');
    requestAnimationFrame(() => $('#account-forgot-email')?.focus());
  });
  $('[data-account-back]').addEventListener('click', () => {
    $('#account-signin-email').value = $('#account-forgot-email').value.trim();
    setMode('signin');
    requestAnimationFrame(() => $('#account-signin-email')?.focus());
  });

  $('#auth-gate-retry').addEventListener('click', () => {
    if (session?.user?.id) {
      waitForInitialSync(session);
      window.dispatchEvent(new CustomEvent('logbook:initial-sync-requested'));
    } else {
      checkSession();
    }
  });

  $$('.account-form input[type="password"]').forEach(input => {
    const wrap = document.createElement('span');
    wrap.className = 'password-field';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'password-eye';
    eye.setAttribute('aria-label', t('Εμφάνιση κωδικού'));
    eye.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/><line class="eye-slash" x1="4.5" y1="19.5" x2="19.5" y2="4.5"/></svg>';
    wrap.appendChild(eye);
    const sync = () => wrap.classList.toggle('has-value', input.value.length > 0);
    const hide = () => {
      input.type = 'password';
      eye.classList.remove('is-on');
      eye.setAttribute('aria-label', t('Εμφάνιση κωδικού'));
    };
    input.addEventListener('input', sync);
    input.form?.addEventListener('reset', () => setTimeout(() => { sync(); hide(); }, 0));
    eye.addEventListener('click', () => {
      const show = input.type === 'password';
      if (show) {
        input.type = 'text';
        eye.classList.add('is-on');
        eye.setAttribute('aria-label', t('Απόκρυψη κωδικού'));
      } else {
        hide();
      }
      input.focus();
    });
  });

  $('#account-google').addEventListener('click', async () => {
    if (!client) return;
    const redirectTo = getAuthRedirectUrl();
    if (!redirectTo) return;
    const button = $('#account-google');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setStatus('Μεταφορά στη Google…');
    const { error } = await client.auth.signInWithOAuth({
      provider:'google',
      options:{ redirectTo },
    });
    if (!error) return;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    setStatus('Δεν ήταν δυνατή η σύνδεση με Google.', 'error');
  });

  $('#account-signin-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!client || !form.reportValidity()) return;
    setBusy(form, true);
    setStatus('Γίνεται σύνδεση…');
    const { data, error } = await client.auth.signInWithPassword({
      email:$('#account-signin-email').value.trim(),
      password:$('#account-signin-password').value,
    });
    setBusy(form, false);
    if (error) return setStatus('Δεν ήταν δυνατή η σύνδεση. Ελέγξτε email και κωδικό.', 'error');
    form.reset();
    renderSession(data?.session);
  });

  $('#account-signup-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!client || !form.reportValidity()) return;
    const password = $('#account-signup-password').value;
    if (password !== $('#account-signup-confirm').value) return setStatus('Οι κωδικοί δεν ταιριάζουν.', 'error');
    const emailRedirectTo = getAuthRedirectUrl();
    if (!emailRedirectTo) return;
    setBusy(form, true);
    setStatus('Δημιουργία λογαριασμού…');
    const { data, error } = await client.auth.signUp({
      email:$('#account-signup-email').value.trim(),
      password,
      options:{ emailRedirectTo },
    });
    setBusy(form, false);
    if (error) return setStatus('Δεν ήταν δυνατή η δημιουργία λογαριασμού.', 'error');
    form.reset();
    if (data?.session) {
      renderSession(data.session);
    } else {
      setMode('signin');
      $('#account-signin-email').value = data?.user?.email || '';
      setStatus('Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό.', 'success');
    }
  });

  $('#account-forgot-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!client || !form.reportValidity()) return;
    const email = $('#account-forgot-email').value.trim();
    const redirectTo = getAuthRedirectUrl();
    if (!redirectTo) return;
    setBusy(form, true);
    setStatus('Αποστολή συνδέσμου αλλαγής κωδικού…');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setBusy(form, false);
    if (error) return setStatus('Δεν ήταν δυνατή η αποστολή του συνδέσμου. Δοκιμάστε ξανά.', 'error');
    setStatus('Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο αλλαγής κωδικού.', 'success');
  });

  $('#account-recovery-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!client || !form.reportValidity()) return;
    const password = $('#account-recovery-password').value;
    if (password !== $('#account-recovery-confirm').value) return setStatus('Οι κωδικοί δεν ταιριάζουν.', 'error');
    setBusy(form, true);
    setStatus('Αλλαγή κωδικού…');
    const { error } = await client.auth.updateUser({ password });
    setBusy(form, false);
    if (error) return setStatus('Δεν ήταν δυνατή η αλλαγή του κωδικού. Ζητήστε νέο σύνδεσμο.', 'error');
    form.reset();
    passwordRecoveryActive = false;
    renderSession(session);
  });

  $('#account-signout').addEventListener('click', async () => {
    if (!client) return;
    const button = $('#account-signout');
    button.disabled = true;
    const { error } = await client.auth.signOut({ scope:'local' });
    button.disabled = false;
    if (error) return;
    dialog.close();
    renderSession(null);
  });

  $('#account-delete-accept').addEventListener('click', async () => {
    if (!client) return;
    const acceptButton = $('#account-delete-accept');
    const cancelButton = $('#account-delete-cancel');
    acceptButton.disabled = true;
    cancelButton.disabled = true;
    setDeleteStatus('Γίνεται οριστική διαγραφή του λογαριασμού σας…');

    let error = null;
    try {
      ({ error } = await client.rpc('delete_own_account'));
    } catch (requestError) {
      error = requestError;
    }

    if (error) {
      acceptButton.disabled = false;
      cancelButton.disabled = false;
      setDeleteStatus('Δεν ήταν δυνατή η διαγραφή του λογαριασμού. Δοκιμάστε ξανά.', 'error');
      return;
    }

    try { await client.auth.signOut({ scope:'local' }); } catch { /* The account is already deleted. */ }
    acceptButton.disabled = false;
    cancelButton.disabled = false;
    if (deleteDialog.open) deleteDialog.close();
    if (dialog.open) dialog.close();
    renderSession(null);
  });

  window.addEventListener('logbook:initial-sync-complete', event => {
    const { userId, success } = event.detail || {};
    if (!userId) return;
    lastSyncResult = { userId, success:Boolean(success) };
    if (!pendingSyncUserId || userId !== pendingSyncUserId) return;
    clearTimeout(syncWatchdog);
    lastSyncResult = null;
    if (success) loadApplication();
    else setGateState('error', 'Ο αρχικός συγχρονισμός δεν ολοκληρώθηκε. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.');
  });
  window.addEventListener('logbook:supabase-ready', event => bindClient(event.detail.client));
  window.addEventListener('logbook:offline-session', event => renderOfflineSession(event.detail?.session));
  window.addEventListener('logbook:sync-status', event => {
    const { message, kind } = event.detail || {};
    if (message) updateSyncStatus(message, kind);
  });
  window.addEventListener('logbook:supabase-unavailable', () => {
    setGateState('error', 'Η υπηρεσία σύνδεσης δεν είναι διαθέσιμη. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.');
  });
  document.addEventListener('logbook:languagechange', () => {
    // While the gate is mid-flow (checking/syncing/loading/error) re-rendering the
    // session would yank it to the login form; only re-translate in place there.
    if (!['checking', 'syncing', 'loading', 'error'].includes(gate.dataset.state)) renderSession(session);
    setGateState(gate.dataset.state);
    if (gateMessageSource) $('#auth-gate-message').textContent = t(gateMessageSource);
  });

  setMode('signin');
  setGateState('checking', 'Ελέγχουμε αν υπάρχει ενεργή συνεδρία σε αυτή τη συσκευή.');
  if (window.LogbookSupabase) bindClient(window.LogbookSupabase);
  else if (window.LogbookOfflineSession) renderOfflineSession(window.LogbookOfflineSession);

  // Typewriter on the auth gate's left page: types each word, holds, erases, moves on.
  (() => {
    const WORDS = ['TRAIN.', 'LOG.', 'REPEAT.'];
    const typed = $('#auth-gate-typed');
    if (!typed) return;
    // Static text when the user prefers reduced motion, and under jsdom (tests):
    // the endless setTimeout chain would keep the test process alive forever.
    const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || /jsdom/i.test(window.navigator.userAgent)) {
      typed.textContent = WORDS.join(' ');
      return;
    }
    let word = 0;
    let length = 0;
    let deleting = false;
    (function tick() {
      typed.textContent = WORDS[word].slice(0, length);
      let delay;
      if (!deleting && length < WORDS[word].length) { length += 1; delay = 90 + Math.random() * 70; }
      else if (!deleting) { deleting = true; delay = 1300; }
      else if (length > 0) { length -= 1; delay = 45; }
      else { deleting = false; word = (word + 1) % WORDS.length; delay = 420; }
      setTimeout(tick, delay);
    })();
  })();
})();
