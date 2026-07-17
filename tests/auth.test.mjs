import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const i18nSource = readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const configSource = readFileSync(new URL('../supabase-config.js', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

async function loadAuth({ initialSession = null, signupSession = null, oauthError = null } = {}) {
  const dom = new JSDOM(html, { url:'http://localhost:3000/', runScripts:'outside-only', pretendToBeVisual:true });
  const { window } = dom;
  const calls = { signin:[], signup:[], oauth:[], reset:[], update:[], signout:[] };
  let authListener = null;

  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.requestAnimationFrame = callback => callback();
  window.eval(i18nSource);
  window.eval(configSource);
  window.LogbookSupabase = {
    auth: {
      async getSession() { return { data:{ session:initialSession }, error:null }; },
      onAuthStateChange(callback) {
        authListener = callback;
        return { data:{ subscription:{ unsubscribe() {} } } };
      },
      async signInWithPassword(credentials) {
        calls.signin.push(credentials);
        return { data:{ session:{ user:{ id:'user-a', email:credentials.email } } }, error:null };
      },
      async signUp(credentials) {
        calls.signup.push(credentials);
        return { data:{ session:signupSession, user:{ email:credentials.email } }, error:null };
      },
      async signInWithOAuth(credentials) {
        calls.oauth.push(credentials);
        return { data:{ url:'https://accounts.google.com/' }, error:oauthError };
      },
      async resetPasswordForEmail(email, options) {
        calls.reset.push({ email, options });
        return { data:{}, error:null };
      },
      async updateUser(attributes) {
        calls.update.push(attributes);
        authListener?.('USER_UPDATED', { user:{ id:'user-a', email:'sync-test@example.com' } });
        return { data:{ user:{ id:'user-a', email:'sync-test@example.com' } }, error:null };
      },
      async signOut(options) {
        calls.signout.push(options);
        authListener?.('SIGNED_OUT', null);
        return { error:null };
      },
    },
  };
  window.eval(authSource);
  await flush();
  return {
    window,
    document:window.document,
    localStorage:window.localStorage,
    calls,
    emitAuth:(event, session) => authListener?.(event, session),
  };
}

function setValue(document, selector, value) {
  const input = document.querySelector(selector);
  input.value = value;
  input.dispatchEvent(new document.defaultView.Event('input', { bubbles:true }));
}

function click(document, selector) {
  document.querySelector(selector).dispatchEvent(new document.defaultView.Event('click', { bubbles:true }));
}

function submit(document, selector) {
  document.querySelector(selector).dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
}

test('startup exposes only the login gate when there is no saved session', async () => {
  const { document } = await loadAuth();

  assert.ok(document.body.classList.contains('auth-required'));
  assert.ok(!document.querySelector('#account-guest').classList.contains('hidden'));
  assert.equal(document.querySelector('script[data-logbook-app]'), null);
  assert.equal(document.querySelector('#auth-gate').dataset.state, 'login');
});

test('an existing session waits for initial sync before loading the application', async () => {
  const initialSession = { user:{ id:'user-a', email:'athlete@example.com' } };
  const { window, document } = await loadAuth({ initialSession });

  assert.equal(document.querySelector('#auth-gate').dataset.state, 'syncing');
  assert.ok(document.body.classList.contains('app-booting'));
  assert.equal(document.querySelector('script[data-logbook-app]'), null);

  window.dispatchEvent(new window.CustomEvent('logbook:initial-sync-complete', {
    detail:{ userId:'user-a', success:true },
  }));
  const appScript = document.querySelector('script[data-logbook-app]');
  assert.ok(appScript);
  assert.equal(appScript.getAttribute('src'), 'app.js');
  assert.equal(document.querySelector('#auth-gate').dataset.state, 'loading');

  appScript.dispatchEvent(new window.Event('load'));
  assert.ok(document.body.classList.contains('app-ready'));
  assert.equal(document.querySelector('#auth-gate').getAttribute('aria-hidden'), 'true');
});

test('account dialog signs in and displays the active email', async () => {
  const { document, calls } = await loadAuth();

  assert.equal(document.querySelector('#account-menu-status').textContent, 'ΧΩΡΙΣ ΣΥΝΔΕΣΗ');
  click(document, '#account-open');
  assert.equal(document.querySelector('#account-dialog').open, true);
  setValue(document, '#account-signin-email', 'athlete@example.com');
  setValue(document, '#account-signin-password', 'strong-pass');
  submit(document, '#account-signin-form');
  await flush();

  assert.equal(calls.signin.length, 1);
  assert.equal(calls.signin[0].email, 'athlete@example.com');
  assert.equal(calls.signin[0].password, 'strong-pass');
  assert.ok(document.querySelector('#account-guest').classList.contains('hidden'));
  assert.ok(!document.querySelector('#account-member').classList.contains('hidden'));
  assert.equal(document.querySelector('#account-member-email').textContent, 'athlete@example.com');
  assert.ok(document.querySelector('#account-open').classList.contains('is-connected'));
});

test('account signup rejects mismatched passwords before calling Supabase', async () => {
  const { document, calls } = await loadAuth();

  click(document, '[data-account-mode="signup"]');
  setValue(document, '#account-signup-email', 'athlete@example.com');
  setValue(document, '#account-signup-password', 'strong-pass');
  setValue(document, '#account-signup-confirm', 'different-pass');
  submit(document, '#account-signup-form');
  await flush();

  assert.equal(calls.signup.length, 0);
  assert.equal(document.querySelector('#account-form-status').textContent, 'Οι κωδικοί δεν ταιριάζουν.');
  assert.equal(document.querySelector('#account-form-status').dataset.kind, 'error');
});

test('account signup requests email confirmation with the configured redirect', async () => {
  const { document, calls } = await loadAuth();

  click(document, '[data-account-mode="signup"]');
  setValue(document, '#account-signup-email', 'new@example.com');
  setValue(document, '#account-signup-password', 'strong-pass');
  setValue(document, '#account-signup-confirm', 'strong-pass');
  submit(document, '#account-signup-form');
  await flush();

  assert.equal(calls.signup[0].email, 'new@example.com');
  assert.equal(calls.signup[0].options.emailRedirectTo, 'http://localhost:3000/');
  assert.equal(document.querySelector('#account-form-status').textContent, 'Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό.');
  assert.ok(!document.querySelector('#account-signin-form').classList.contains('hidden'));
});

test('Google sign in uses Supabase OAuth and keeps local workout data untouched', async () => {
  const { document, localStorage, calls } = await loadAuth();
  const sessions = [{ id:'s1', date:'2026-07-17' }];
  localStorage.setItem('trainingSessions', JSON.stringify(sessions));

  click(document, '#account-google');
  await flush();

  assert.equal(calls.oauth.length, 1);
  assert.equal(calls.oauth[0].provider, 'google');
  assert.equal(calls.oauth[0].options.redirectTo, 'http://localhost:3000/');
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), sessions);
  assert.equal(document.querySelector('#account-form-status').textContent, 'Μεταφορά στη Google…');
  assert.equal(document.querySelector('#account-google').disabled, true);
});

test('Google sign in reports an OAuth startup error and re-enables its button', async () => {
  const { document } = await loadAuth({ oauthError:new Error('provider error') });

  click(document, '#account-google');
  await flush();

  assert.equal(document.querySelector('#account-form-status').textContent, 'Δεν ήταν δυνατή η σύνδεση με Google.');
  assert.equal(document.querySelector('#account-form-status').dataset.kind, 'error');
  assert.equal(document.querySelector('#account-google').disabled, false);
  assert.equal(document.querySelector('#account-google').getAttribute('aria-busy'), 'false');
});

test('forgot password sends a recovery link to the entered email', async () => {
  const { document, calls } = await loadAuth();

  setValue(document, '#account-signin-email', 'sync-test@example.com');
  click(document, '#account-forgot-password');

  assert.ok(!document.querySelector('#account-forgot-form').classList.contains('hidden'));
  assert.ok(document.querySelector('#account-tabs').classList.contains('hidden'));
  assert.equal(document.querySelector('#account-forgot-email').value, 'sync-test@example.com');

  submit(document, '#account-forgot-form');
  await flush();

  assert.equal(calls.reset.length, 1);
  assert.equal(calls.reset[0].email, 'sync-test@example.com');
  assert.equal(calls.reset[0].options.redirectTo, 'http://localhost:3000/');
  assert.equal(document.querySelector('#account-form-status').dataset.kind, 'success');
  assert.equal(document.querySelector('#account-form-status').textContent, 'Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο αλλαγής κωδικού.');
});

test('password recovery link opens the new-password form and updates the user', async () => {
  const { document, calls, emitAuth } = await loadAuth();
  const recoverySession = { user:{ id:'user-a', email:'sync-test@example.com' } };

  emitAuth('PASSWORD_RECOVERY', recoverySession);

  assert.equal(document.querySelector('#auth-gate').dataset.state, 'login');
  assert.ok(!document.querySelector('#account-recovery-form').classList.contains('hidden'));
  assert.ok(document.querySelector('#account-tabs').classList.contains('hidden'));

  setValue(document, '#account-recovery-password', 'new-strong-pass');
  setValue(document, '#account-recovery-confirm', 'different-pass');
  submit(document, '#account-recovery-form');
  await flush();
  assert.equal(calls.update.length, 0);
  assert.equal(document.querySelector('#account-form-status').textContent, 'Οι κωδικοί δεν ταιριάζουν.');

  setValue(document, '#account-recovery-confirm', 'new-strong-pass');
  submit(document, '#account-recovery-form');
  await flush();

  assert.equal(calls.update.length, 1);
  assert.equal(calls.update[0].password, 'new-strong-pass');
  assert.equal(document.querySelector('#auth-gate').dataset.state, 'syncing');
});

test('local sign out preserves workout data stored in the browser', async () => {
  const initialSession = { user:{ email:'athlete@example.com' } };
  const { document, localStorage, calls } = await loadAuth({ initialSession });
  const sessions = [{ id:'s1', date:'2026-07-17' }];
  localStorage.setItem('trainingSessions', JSON.stringify(sessions));

  click(document, '#account-signout');
  await flush();

  assert.equal(calls.signout.length, 1);
  assert.equal(calls.signout[0].scope, 'local');
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), sessions);
  assert.equal(document.querySelector('#account-menu-status').textContent, 'ΧΩΡΙΣ ΣΥΝΔΕΣΗ');
});
