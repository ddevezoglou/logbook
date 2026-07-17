(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const t = value => window.LogbookI18n?.t?.(value) || value;
  const dialog = $('#account-dialog');
  const guest = $('#account-guest');
  const member = $('#account-member');
  const status = $('#account-form-status');
  let client = null;
  let session = null;
  let mode = 'signin';

  function setStatus(message = '', kind = 'neutral') {
    status.textContent = message ? t(message) : '';
    status.dataset.kind = kind;
    status.classList.toggle('hidden', !message);
  }

  function setBusy(form, busy) {
    [...form.elements].forEach(control => { control.disabled = busy; });
    form.setAttribute('aria-busy', String(busy));
  }

  function setMode(next) {
    mode = next === 'signup' ? 'signup' : 'signin';
    $$('[data-account-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.accountMode === mode));
    });
    $('#account-signin-form').classList.toggle('hidden', mode !== 'signin');
    $('#account-signup-form').classList.toggle('hidden', mode !== 'signup');
    setStatus(client ? '' : 'Η σύνδεση στο cloud φορτώνει…');
  }

  function renderSession(nextSession) {
    session = nextSession || null;
    const email = session?.user?.email || '';
    const signedIn = Boolean(email);
    guest.classList.toggle('hidden', signedIn);
    member.classList.toggle('hidden', !signedIn);
    $('#account-tabs')?.classList.toggle('hidden', signedIn);
    $('#account-member-email').textContent = email;
    $('#account-menu-email').textContent = email;
    $('#account-menu-email').classList.toggle('hidden', !signedIn);
    $('#account-menu-status').textContent = signedIn ? 'ΣΥΝΔΕΔΕΜΕΝΟΣ' : client ? 'ΧΩΡΙΣ ΣΥΝΔΕΣΗ' : 'ΤΟΠΙΚΗ ΛΕΙΤΟΥΡΓΙΑ';
    $('#account-open').classList.toggle('is-connected', signedIn);
    $('#account-open').setAttribute('aria-label', signedIn ? `${t('ΛΟΓΑΡΙΑΣΜΟΣ')}: ${email}` : t('ΛΟΓΑΡΙΑΣΜΟΣ'));
    window.LogbookI18n?.translate(document);
  }

  async function bindClient(nextClient) {
    if (!nextClient || client === nextClient) return;
    client = nextClient;
    setStatus('');
    const { data, error } = await client.auth.getSession();
    if (error) setStatus('Δεν ήταν δυνατή η ανάκτηση της σύνδεσης.', 'error');
    renderSession(data?.session);
    client.auth.onAuthStateChange((_event, nextSession) => renderSession(nextSession));
  }

  $('#account-open').addEventListener('click', () => {
    $('#close-menu').click();
    dialog.showModal();
    const target = session ? $('#account-signout') : mode === 'signup' ? $('#account-signup-email') : $('#account-signin-email');
    requestAnimationFrame(() => target?.focus());
  });
  $('#account-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  $$('[data-account-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.accountMode)));

  $('#account-google').addEventListener('click', async () => {
    if (!client) return;
    const button = $('#account-google');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setStatus('Μεταφορά στη Google…');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.LogbookSupabaseConfig?.siteUrl },
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
    setStatus('');
    const { data, error } = await client.auth.signInWithPassword({
      email: $('#account-signin-email').value.trim(),
      password: $('#account-signin-password').value,
    });
    setBusy(form, false);
    if (error) return setStatus('Δεν ήταν δυνατή η σύνδεση. Ελέγξτε email και κωδικό.', 'error');
    renderSession(data?.session);
    form.reset();
    setStatus('Συνδεθήκατε επιτυχώς.', 'success');
  });

  $('#account-signup-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!client || !form.reportValidity()) return;
    const password = $('#account-signup-password').value;
    if (password !== $('#account-signup-confirm').value) return setStatus('Οι κωδικοί δεν ταιριάζουν.', 'error');
    setBusy(form, true);
    setStatus('');
    const { data, error } = await client.auth.signUp({
      email: $('#account-signup-email').value.trim(),
      password,
      options: { emailRedirectTo: window.LogbookSupabaseConfig?.siteUrl },
    });
    setBusy(form, false);
    if (error) return setStatus('Δεν ήταν δυνατή η δημιουργία λογαριασμού.', 'error');
    form.reset();
    if (data?.session) {
      renderSession(data.session);
      setStatus('Συνδεθήκατε επιτυχώς.', 'success');
    } else {
      setMode('signin');
      $('#account-signin-email').value = data?.user?.email || '';
      setStatus('Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό.', 'success');
    }
  });

  $('#account-signout').addEventListener('click', async () => {
    if (!client) return;
    const button = $('#account-signout');
    button.disabled = true;
    const { error } = await client.auth.signOut({ scope:'local' });
    button.disabled = false;
    if (error) return setStatus('Δεν ήταν δυνατή η αποσύνδεση.', 'error');
    renderSession(null);
    setStatus('Αποσυνδεθήκατε. Τα τοπικά δεδομένα παραμένουν στη συσκευή.', 'success');
  });

  window.addEventListener('logbook:supabase-ready', event => bindClient(event.detail.client));
  window.addEventListener('logbook:supabase-unavailable', () => {
    setStatus('Το cloud δεν είναι διαθέσιμο. Η τοπική λειτουργία συνεχίζεται.', 'error');
    renderSession(null);
  });
  document.addEventListener('logbook:languagechange', () => renderSession(session));

  setMode('signin');
  renderSession(null);
  if (window.LogbookSupabase) bindClient(window.LogbookSupabase);
})();
