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
  const calls = { signin:[], signup:[], oauth:[], signout:[] };
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
        return { data:{ session:{ user:{ email:credentials.email } } }, error:null };
      },
      async signUp(credentials) {
        calls.signup.push(credentials);
        return { data:{ session:signupSession, user:{ email:credentials.email } }, error:null };
      },
      async signInWithOAuth(credentials) {
        calls.oauth.push(credentials);
        return { data:{ url:'https://accounts.google.com/' }, error:oauthError };
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
  return { window, document:window.document, localStorage:window.localStorage, calls };
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
