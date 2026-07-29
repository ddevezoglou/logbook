import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const i18nSource = readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const configSource = readFileSync(new URL('../supabase-config.js', import.meta.url), 'utf8');
const sessionStateSource = readFileSync(new URL('../session-state.js', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

// Το gate του επισκέπτη δεν αγγίζει ποτέ τον client, οπότε ο stub χρειάζεται μόνο
// να απαντήσει «καμία συνεδρία» — ό,τι ακολουθεί είναι τοπική απόφαση.
async function loadAuth({ seed = {}, withClient = true } = {}) {
  const dom = new JSDOM(html, { url:'http://localhost:3000/', runScripts:'outside-only', pretendToBeVisual:true });
  const { window } = dom;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.requestAnimationFrame = callback => callback();
  for (const [key, value] of Object.entries(seed)) window.localStorage.setItem(key, value);
  window.eval(i18nSource);
  window.eval(configSource);
  window.eval(sessionStateSource);
  if (withClient) {
    window.LogbookSupabase = {
      auth:{
        async getSession() { return { data:{ session:null }, error:null }; },
        onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
        async signInWithPassword() { return { data:{ session:{ user:{ id:'user-a', email:'athlete@example.com' } } }, error:null }; },
        async signOut() { return { error:null }; },
      },
    };
  }
  window.eval(authSource);
  await flush();
  return { window, document:window.document, localStorage:window.localStorage };
}

const click = (document, selector) =>
  document.querySelector(selector).dispatchEvent(new document.defaultView.Event('click', { bubbles:true }));

// Η φόρτωση του app.js δεν τρέχει κάτω από jsdom, οπότε αναπαράγουμε το σήμα που
// στέλνει το loadApplication() όταν το script φορτώσει κανονικά στον browser.
function completeAppLoad(window) {
  window.document.body.classList.remove('app-booting');
  window.document.body.classList.add('app-ready');
  window.dispatchEvent(new window.CustomEvent('logbook:app-ready'));
}

test('the gate offers a guest door under the sign-in form', async () => {
  const { document } = await loadAuth();

  const door = document.querySelector('#account-guest-door');
  assert.ok(door, 'the guest door exists in the gate');
  assert.ok(!door.classList.contains('hidden'));
  assert.equal(document.querySelector('#account-guest-start').textContent, 'ΛΕΙΤΟΥΡΓΙΑ ΕΠΙΣΚΕΠΤΗ');
  // Στο "ξεχάσατε τον κωδικό" δεν υπάρχει λόγος να προσφέρεται έξοδος.
  click(document, '#account-forgot-password');
  assert.ok(door.classList.contains('hidden'));
});

test('starting as a guest boots the application without a session', async () => {
  const { window, document, localStorage } = await loadAuth();

  click(document, '#account-guest-start');

  assert.equal(localStorage.getItem('logbookGuest'), '1');
  assert.equal(document.querySelector('#auth-gate').dataset.state, 'loading');
  assert.ok(document.querySelector('script[data-logbook-app]'), 'the application is loaded');
  assert.equal(window.localStorage.getItem('logbookCloudOwner'), null);
});

test('the account card stays empty for a guest', async () => {
  const { document } = await loadAuth();

  click(document, '#account-guest-start');

  assert.equal(document.querySelector('#account-menu-status').textContent, 'ΧΩΡΙΣ ΣΥΝΔΕΣΗ');
  assert.ok(!document.querySelector('#account-menu-status').classList.contains('hidden'));
  assert.equal(document.querySelector('#account-menu-email').textContent, '');
  assert.ok(document.querySelector('#account-menu-email').classList.contains('hidden'));
  assert.ok(!document.querySelector('#account-open').classList.contains('is-connected'));
  assert.ok(document.querySelector('#account-member').classList.contains('hidden'));
});

test('the guest reminder appears once the application is ready and never blocks it', async () => {
  const { window, document, localStorage } = await loadAuth();

  click(document, '#account-guest-start');
  const reminder = document.querySelector('#guest-reminder');
  assert.ok(reminder.classList.contains('hidden'), 'it waits for the app');

  completeAppLoad(window);

  assert.ok(!reminder.classList.contains('hidden'));
  assert.ok(reminder.classList.contains('is-open'));
  // Καμία πύλη μπροστά στην εφαρμογή: η λωρίδα δεν είναι διάλογος.
  assert.equal(document.querySelector('#account-dialog').open, false);
  assert.ok(Number(localStorage.getItem('logbookGuestReminderAt')) > 0);

  click(document, '#guest-reminder-dismiss');
  assert.ok(reminder.classList.contains('hidden'));
});

test('the reminder stays away until the interval has passed, then returns', async () => {
  const recent = await loadAuth({ seed:{ logbookGuest:'1', logbookGuestReminderAt:String(Date.now() - 86400000) } });
  completeAppLoad(recent.window);
  assert.ok(recent.document.querySelector('#guest-reminder').classList.contains('hidden'));

  const stale = await loadAuth({ seed:{ logbookGuest:'1', logbookGuestReminderAt:String(Date.now() - 8 * 86400000) } });
  completeAppLoad(stale.window);
  assert.ok(!stale.document.querySelector('#guest-reminder').classList.contains('hidden'));
});

test('a returning guest skips the gate entirely', async () => {
  const { document } = await loadAuth({ seed:{ logbookGuest:'1' } });

  assert.equal(document.querySelector('#auth-gate').dataset.state, 'loading');
  assert.ok(document.querySelector('script[data-logbook-app]'));
  assert.ok(!document.body.classList.contains('auth-required'));
});

test('a guest boots even when the sign-in service is unavailable', async () => {
  const { window, document } = await loadAuth({ seed:{ logbookGuest:'1' }, withClient:false });

  window.dispatchEvent(new window.CustomEvent('logbook:supabase-unavailable'));

  assert.equal(document.querySelector('#auth-gate').dataset.state, 'loading');
  assert.ok(document.querySelector('script[data-logbook-app]'));
});

test('the reminder sends the guest back to the gate on the signup tab', async () => {
  const { window, document, localStorage } = await loadAuth();

  click(document, '#account-guest-start');
  completeAppLoad(window);
  click(document, '#guest-reminder-signup');

  assert.equal(localStorage.getItem('logbookGuest'), null, 'the guest session ends');
  assert.equal(document.querySelector('#account-dialog').open, false);
  assert.equal(document.querySelector('#auth-gate').dataset.state, 'login');
  assert.equal(document.querySelector('[data-account-mode="signup"]').getAttribute('aria-pressed'), 'true');
  assert.ok(document.querySelector('#guest-reminder').classList.contains('hidden'));
});

test('the account card sends the guest back to the gate instead of opening a sheet', async () => {
  const { window, document, localStorage } = await loadAuth();

  click(document, '#account-guest-start');
  completeAppLoad(window);
  click(document, '#account-open');

  assert.equal(document.querySelector('#account-dialog').open, false, 'no account sheet for a guest');
  assert.equal(document.querySelector('#auth-gate').dataset.state, 'login');
  assert.equal(document.querySelector('[data-account-mode="signin"]').getAttribute('aria-pressed'), 'true');
  assert.equal(localStorage.getItem('logbookGuest'), null);
  assert.ok(document.querySelector('#guest-reminder').classList.contains('hidden'));
});

test('signing in ends the guest session and leaves no guest flag behind', async () => {
  const { window, document, localStorage } = await loadAuth({ seed:{ logbookGuest:'1' } });

  completeAppLoad(window);
  document.querySelector('#account-signin-email').value = 'athlete@example.com';
  document.querySelector('#account-signin-password').value = 'password123';
  document.querySelector('#account-signin-form')
    .dispatchEvent(new window.Event('submit', { bubbles:true, cancelable:true }));
  await flush();

  assert.equal(localStorage.getItem('logbookGuest'), null);
  assert.ok(document.querySelector('#guest-reminder').classList.contains('hidden'));
  assert.ok(!document.querySelector('#account-member').classList.contains('hidden'));
  assert.equal(document.querySelector('#account-menu-email').textContent, 'athlete@example.com');
});

test('guest login has no merge-choice dialog', async () => {
  const { document } = await loadAuth();
  assert.equal(document.querySelector('#guest-merge-dialog'), null);
});

test('the guest reminder is translated like the rest of the interface', async () => {
  const { window, document } = await loadAuth({ seed:{ logbookLanguage:'en' } });

  click(document, '#account-guest-start');
  window.LogbookI18n.translate(document);

  assert.equal(document.querySelector('#account-guest-start').textContent, 'GUEST MODE');
  assert.equal(document.querySelector('#guest-reminder-title').textContent, 'Your data is stored on this device only');
  assert.equal(document.querySelector('#guest-reminder-dismiss').textContent, 'NOT NOW');
  assert.equal(document.querySelector('#guest-reminder-signup').textContent, 'CREATE ACCOUNT');
});
