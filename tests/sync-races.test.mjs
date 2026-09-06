import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = ['data-reconciliation.js', 'cloud-sync.js'].map(file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).join('\n');
const clone = value => structuredClone(value);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const workout = id => ({ id, date:'2026-08-01', type:'free', comments:'original', exercises:[] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function harness({ guest = false } = {}) {
  const { window } = new JSDOM('', { url:'http://localhost/', runScripts:'outside-only' });
  let listener;
  let held;
  const rows = new Map();
  const calls = [];
  const statuses = [], initial = [], applied = [];
  window.addEventListener('logbook:sync-status', event => statuses.push(event.detail));
  window.addEventListener('logbook:initial-sync-complete', event => initial.push(event.detail));
  window.addEventListener('logbook:cloud-data-applied', () => applied.push(true));
  const client = {
    auth:{
      async getSession() { return { data:{ session:guest ? null : { user:{ id:'a' } } }, error:null }; },
      onAuthStateChange(callback) { listener = callback; },
    },
    from() {
      let operation = 'read', values;
      const filters = {};
      const execute = async () => {
        const id = values?.user_id || filters.user_id;
        calls.push({ operation, id });
        const row = rows.get(id);
        let response;
        if (operation === 'read') response = { data:clone(row || null), error:null };
        else if (operation === 'insert' && row) response = { data:null, error:{ code:'23505' } };
        else if (operation === 'update' && row?.revision !== filters.revision) response = { data:null, error:null };
        else {
          const next = { user_id:id, revision:(row?.revision || 0) + 1, payload:clone(values.payload) };
          rows.set(id, next);
          response = { data:clone(next), error:null };
        }
        // Deliberately ignore AbortSignal: even a late successful response
        // from an uncancellable client must not regain access to local state.
        if (held?.operation === operation) {
          const waiting = held; held = null;
          waiting.arrived.resolve();
          await waiting.release.promise;
        }
        return response;
      };
      const chain = {
        select() { return chain; }, eq(key, value) { filters[key] = value; return chain; },
        abortSignal() { return chain; },
        insert(next) { operation = 'insert'; values = next; return chain; },
        update(next) { operation = 'update'; values = next; return chain; },
        maybeSingle:execute, single:execute,
      };
      return chain;
    },
  };
  window.localStorage.setItem('trainingSessions', JSON.stringify([workout('original')]));
  window.LogbookSupabase = client;
  window.eval(source);
  await tick();
  if (!guest) await window.LogbookCloudSync.sync();
  await tick();
  return {
    window, rows, calls, statuses, initial, applied,
    auth(id) { listener(id ? 'SIGNED_IN' : 'SIGNED_OUT', id ? { user:{ id } } : null); },
    hold(operation) {
      const pending = { operation, arrived:deferred(), release:deferred() }; held = pending;
      return { arrived:pending.arrived.promise, release:() => pending.release.resolve() };
    },
    local() { return JSON.parse(window.localStorage.getItem('trainingSessions') || '[]'); },
    save(sessions) {
      window.localStorage.setItem('trainingSessions', JSON.stringify(sessions));
      window.dispatchEvent(new window.CustomEvent('logbook:local-data-changed', { detail:{ key:'trainingSessions' } }));
    },
    sync() { return window.LogbookCloudSync.sync(); },
  };
}

for (const operation of ['read', 'update']) {
  test(`sign-out discards a delayed ${operation} response even after guest data is saved`, async () => {
    const h = await harness();
    try {
      h.rows.get('a').payload.trainingSessions.push(workout('remote'));
      h.rows.get('a').revision++;
      if (operation === 'update') h.save([...h.local(), workout('local')]);
      const wait = h.hold(operation);
      const pending = h.sync(); await wait.arrived;
      h.auth(null);
      for (const key of ['trainingSessions', 'trainingRoutines', 'trainingExercises', 'userProfile']) h.window.localStorage.removeItem(key);
      h.window.localStorage.setItem('logbookGuest', '1');
      h.save([workout('guest')]);
      const metadata = h.window.localStorage.getItem('logbookCloudMeta:a');
      const eventCount = h.applied.length;
      wait.release();
      assert.equal(await pending, false);
      await tick();
      assert.deepEqual(h.local().map(item => item.id), ['guest']);
      assert.equal(h.window.localStorage.getItem('logbookCloudMeta:a'), metadata);
      assert.equal(h.applied.length, eventCount);
      assert.equal(h.statuses.at(-1).kind, 'neutral');
    } finally { h.window.close(); }
  });
}

for (const nextUser of ['b', 'a']) {
  test(`a delayed old session cannot block or finish the next login to ${nextUser}`, async () => {
    const h = await harness();
    try {
      h.rows.set('b', { user_id:'b', revision:1, payload:{ trainingSessions:[workout('private-b')] } });
      const wait = h.hold('read');
      const previous = h.sync(); await wait.arrived;
      h.auth(null);
      h.window.localStorage.removeItem('trainingSessions');
      const count = h.initial.length;
      h.auth(nextUser);
      assert.equal(await h.sync(), true, 'new identity does not await the old response');
      await tick();
      const expected = nextUser === 'b' ? 'private-b' : 'original';
      assert.deepEqual(h.local().map(item => item.id), [expected]);
      wait.release(); assert.equal(await previous, false); await tick();
      assert.deepEqual(h.local().map(item => item.id), [expected]);
      assert.equal(h.window.localStorage.getItem('logbookCloudOwner'), nextUser);
      assert.deepEqual(h.initial.slice(count).map(event => [event.userId, event.success]), [[nextUser, true]]);
    } finally { h.window.close(); }
  });
}

for (const operation of ['read', 'update']) {
  test(`a workout saved during a delayed ${operation} survives alongside remote edits and deletions`, async () => {
    const h = await harness();
    try {
      h.save([...h.local(), workout('deleted-remotely')]); await h.sync();
      const remote = h.rows.get('a');
      remote.payload.trainingSessions[0].comments = 'remote edit';
      remote.payload.trainingSessions[1] = { id:'deleted-remotely', deletedAt:'2026-09-06T12:00:00.000Z' };
      remote.payload.trainingSessions.push(workout('remote-added')); remote.revision++;
      if (operation === 'update') h.save([...h.local(), workout('before-request')]);
      const wait = h.hold(operation);
      const pending = h.sync(); await wait.arrived;
      h.save([...h.local(), workout('during-request')]);
      wait.release(); assert.equal(await pending, true); await tick();
      const result = h.local();
      assert.ok(result.some(item => item.id === 'during-request'));
      assert.ok(result.some(item => item.id === 'remote-added'));
      assert.equal(result.find(item => item.id === 'original').comments, 'remote edit');
      assert.ok(result.find(item => item.id === 'deleted-remotely').deletedAt);
      assert.deepEqual(h.rows.get('a').payload.trainingSessions, result, 'sync promise includes upload of edits made during the request');
      assert.equal(h.statuses.at(-1).kind, 'success');
    } finally { h.window.close(); }
  });
}

test('guest import includes a save made during the initial insert', async () => {
  const h = await harness({ guest:true });
  try {
    h.window.localStorage.setItem('logbookGuestImportPending', '1');
    const wait = h.hold('insert'); h.auth('a'); await wait.arrived;
    h.save([...h.local(), workout('guest-during-import')]);
    const pending = h.sync(); wait.release();
    assert.equal(await pending, true); await tick();
    assert.ok(h.rows.get('a').payload.trainingSessions.some(item => item.id === 'guest-during-import'));
    assert.equal(h.window.localStorage.getItem('logbookGuestImportPending'), null);
    assert.equal(h.initial.at(-1).success, true);
  } finally { h.window.close(); }
});

test('token refresh for the same user does not cancel an in-flight sync', async () => {
  const h = await harness();
  try {
    const wait = h.hold('read'); const pending = h.sync(); await wait.arrived;
    h.auth('a'); wait.release();
    assert.equal(await pending, true);
  } finally { h.window.close(); }
});
