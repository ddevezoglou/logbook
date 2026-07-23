import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../error-tracking.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/202607220001_client_error_events.sql', import.meta.url), 'utf8');
const cloudSync = readFileSync(new URL('../cloud-sync.js', import.meta.url), 'utf8');
const pwa = readFileSync(new URL('../pwa.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function createClient(session = { user:{ id:'user-a', email:'private@example.com' } }) {
  let authListener = null;
  const calls = [];
  return {
    calls,
    auth:{
      async getSession() { return { data:{ session }, error:null }; },
      onAuthStateChange(callback) { authListener = callback; return { data:{ subscription:{ unsubscribe() {} } } }; },
    },
    async rpc(name, values) {
      calls.push({ name, values:structuredClone(values) });
      return { data:true, error:null };
    },
    emitAuth(nextSession) { authListener?.('SIGNED_IN', nextSession); },
  };
}

async function loadTracker(session) {
  const dom = new JSDOM(html, { url:'http://localhost:3000/', runScripts:'outside-only' });
  const client = createClient(session);
  dom.window.LogbookSupabase = client;
  dom.window.eval(source);
  await flush();
  return { window:dom.window, client };
}

test('client error reports contain only allowlisted operational metadata', async () => {
  const { window, client } = await loadTracker();
  const secret = 'Workout Bench Press private@example.com bearer-token';

  await window.LogbookErrorTracking.report('sync', 'sync_failure', new window.TypeError(secret));

  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].name, 'report_client_error');
  assert.deepEqual(Object.keys(client.calls[0].values).sort(), [
    'event_app_version',
    'event_browser_family',
    'event_code',
    'event_error_name',
    'event_online',
    'event_source',
  ]);
  assert.equal(client.calls[0].values.event_app_version, '0.9.6');
  assert.equal(client.calls[0].values.event_error_name, 'TypeError');
  assert.doesNotMatch(JSON.stringify(client.calls[0]), /Bench Press|private@example\.com|bearer-token/);
  window.close();
});

test('global errors are sanitized and duplicate events are suppressed', async () => {
  const { window, client } = await loadTracker();
  const first = new window.ErrorEvent('error', { error:new window.ReferenceError('sensitive message') });

  window.dispatchEvent(first);
  window.dispatchEvent(new window.ErrorEvent('error', { error:new window.ReferenceError('different private value') }));
  await flush();

  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].values.event_source, 'window');
  assert.equal(client.calls[0].values.event_code, 'unhandled_error');
  assert.equal(client.calls[0].values.event_error_name, 'ReferenceError');
  assert.doesNotMatch(JSON.stringify(client.calls[0]), /sensitive|different private/);
  window.close();
});

test('invalid and source-mismatched event codes are rejected before the network', async () => {
  const { window, client } = await loadTracker();

  assert.equal(await window.LogbookErrorTracking.report('sync', 'unhandled_error', new window.Error()), false);
  assert.equal(await window.LogbookErrorTracking.report('unknown', 'sync_failure', new window.Error()), false);

  assert.equal(client.calls.length, 0);
  window.close();
});

test('anonymous errors are not attached to a user who signs in later', async () => {
  const { window, client } = await loadTracker(null);

  await window.LogbookErrorTracking.report('sync', 'sync_failure', new window.Error('anonymous failure'));
  client.emitAuth({ user:{ id:'user-b', email:'later@example.com' } });
  await window.LogbookErrorTracking.flush();

  assert.equal(client.calls.length, 0);
  window.close();
});

test('database RPC owns identity, retention and rate limiting without exposing event rows', () => {
  const table = migration.match(/create table public\.client_error_events[\s\S]*?\n\);/)?.[0] || '';

  assert.match(migration, /security definer/);
  assert.match(migration, /current_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(migration, /occurred_at < now\(\) - interval '30 days'/);
  assert.match(migration, /occurred_at >= now\(\) - interval '1 hour'/);
  assert.match(migration, /\) >= 10 then/);
  assert.match(migration, /char_length\(app_version\) between 5 and 24/);
  assert.match(migration, /source = 'sync' and code in/);
  assert.match(migration, /revoke all on public\.client_error_events from authenticated/);
  assert.match(migration, /grant execute on function public\.report_client_error[\s\S]*to authenticated/);
  assert.doesNotMatch(table, /\b(message|stack|url|email|token|payload)\b/i);
});

test('sync and PWA operational failures are wired to allowlisted reporter codes', () => {
  assert.match(cloudSync, /LogbookErrorTracking\?\.report\('sync', 'sync_failure', error\)/);
  assert.match(cloudSync, /LogbookErrorTracking\?\.report\('sync', errorCode, error\)/);
  assert.match(pwa, /LogbookErrorTracking\?\.report\('pwa', 'service_worker_cleanup_failed', error\)/);
  assert.match(pwa, /LogbookErrorTracking\?\.report\('pwa', 'service_worker_registration_failed', error\)/);
});
