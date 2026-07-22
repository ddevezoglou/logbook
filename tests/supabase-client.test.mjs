import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const configSource = readFileSync(new URL('../supabase-config.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../supabase-client.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Supabase browser client uses the public project configuration', () => {
  const dom = new JSDOM('', { runScripts: 'outside-only', url: 'http://localhost:3000/' });
  const calls = [];
  const client = { auth: {} };
  let readyClient = null;

  dom.window.supabase = {
    createClient(...args) {
      calls.push(args);
      return client;
    },
  };
  dom.window.addEventListener('logbook:supabase-ready', event => {
    readyClient = event.detail.client;
  });

  dom.window.eval(configSource);
  dom.window.eval(clientSource);

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://hixnqtjsjcndeatxhpgd.supabase.co');
  assert.match(calls[0][1], /^sb_publishable_/);
  assert.equal(calls[0][2].auth.persistSession, true);
  assert.equal(calls[0][2].auth.autoRefreshToken, true);
  assert.equal(calls[0][2].auth.detectSessionInUrl, true);
  assert.equal(dom.window.LogbookSupabaseConfig.siteUrl, 'http://localhost:3000/');
  assert.equal(dom.window.LogbookSupabase, client);
  assert.equal(readyClient, client);
});

test('opening index.html directly never advertises localhost as its auth callback', () => {
  const dom = new JSDOM('', { runScripts:'outside-only', url:'file:///C:/Users/Dimitris/logbook/index.html' });

  dom.window.eval(configSource);

  assert.equal(dom.window.LogbookSupabaseConfig.siteUrl, null);
});

test('a cached Supabase session is exposed when the local client bundle is unavailable offline', () => {
  const dom = new JSDOM('', { runScripts:'outside-only', url:'http://localhost:3000/' });
  const session = {
    access_token:'cached-token',
    refresh_token:'cached-refresh',
    user:{ id:'user-offline', email:'offline@example.com' },
  };
  let offlineSession = null;
  dom.window.addEventListener('logbook:offline-session', event => { offlineSession = event.detail.session; });
  dom.window.eval(configSource);
  dom.window.localStorage.setItem('sb-hixnqtjsjcndeatxhpgd-auth-token', JSON.stringify(session));
  dom.window.eval(clientSource);

  const script = dom.window.document.querySelector('script[data-logbook-supabase-library]');
  assert.ok(script);
  script.dispatchEvent(new dom.window.Event('error'));

  assert.deepEqual(JSON.parse(JSON.stringify(offlineSession)), session);
  assert.deepEqual(JSON.parse(JSON.stringify(dom.window.LogbookOfflineSession)), session);
});

test('the Supabase client retries initialization when the network returns', () => {
  const dom = new JSDOM('', { runScripts:'outside-only', url:'http://localhost:3000/' });
  const client = { auth:{} };
  let readyClient = null;
  dom.window.addEventListener('logbook:supabase-ready', event => { readyClient = event.detail.client; });
  dom.window.eval(configSource);
  dom.window.eval(clientSource);
  dom.window.document.querySelector('script[data-logbook-supabase-library]').dispatchEvent(new dom.window.Event('error'));
  dom.window.supabase = { createClient:() => client };

  dom.window.dispatchEvent(new dom.window.Event('online'));

  assert.equal(dom.window.LogbookSupabase, client);
  assert.equal(readyClient, client);
});

test('Supabase scripts load before the application is dynamically bootstrapped', () => {
  const config = htmlSource.indexOf('src="supabase-config.js"');
  const client = htmlSource.indexOf('src="supabase-client.js"');
  const errorTracking = htmlSource.indexOf('src="error-tracking.js"');
  const auth = htmlSource.indexOf('src="auth.js"');
  const sync = htmlSource.indexOf('src="cloud-sync.js"');

  assert.match(clientSource, /assets\/vendor\/supabase-2\.110\.7\.min\.js/);
  assert.doesNotMatch(clientSource, /https?:\/\//);
  assert.ok(config < client);
  assert.ok(client < errorTracking);
  assert.ok(errorTracking < auth);
  assert.ok(auth < sync);
  assert.equal(htmlSource.includes('<script src="app.js"></script>'), false);
  assert.match(readFileSync(new URL('../auth.js', import.meta.url), 'utf8'), /script\.src = 'app\.js'/);
});
