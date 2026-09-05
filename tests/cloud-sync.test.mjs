import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const syncSource = readFileSync(new URL('../cloud-sync.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const clone = value => value === null || value === undefined ? value : structuredClone(value);

test('a library-only device uploads definitions even beside an empty placeholder', async () => {
  const { client } = await loadSync({ session:{ user:{ id:'user-a' } }, seed:{
    trainingExercises:[{ id:'exercise-a', name:'Row', aliases:[] }],
    trainingRoutines:[{ id:'placeholder', name:'Το πρόγραμμά μου', isPlaceholder:true, plan:[] }],
  }, row:{ user_id:'user-a', revision:1, payload:{}, updated_at:'2026-09-05T00:00:00Z' } });
  assert.equal(client.row.payload.trainingExercises[0].name, 'Row');
});

test('an old cloud snapshot cannot erase a clean device library or overwrite its renamed definitions', async () => {
  const library = [{ id:'a', name:'Cable Row', aliases:['Row'], updatedAt:'2026-09-05T12:00:00.000Z' }];
  const local = { trainingExercises:library, trainingSessions:[{ id:'s1', date:'2026-07-06', exercises:[] }] };
  const hashDom = new JSDOM('', { url:'http://localhost/', runScripts:'outside-only' });
  hashDom.window.eval(syncSource);
  const hash = hashDom.window.LogbookCloudSync.payloadHash(local);
  hashDom.window.close();
  const remoteSessions = [...local.trainingSessions, { id:'s2', date:'2026-07-07', exercises:[] }];
  const { client, localStorage } = await loadSync({ session:{ user:{ id:'user-a' } }, seed:{
    ...local, logbookCloudOwner:'user-a', 'logbookCloudMeta:user-a':{ revision:1, hash },
  }, row:{ user_id:'user-a', revision:2, payload:{ trainingSessions:remoteSessions }, updated_at:'2026-09-05T13:00:00Z' } });
  assert.deepEqual(client.row.payload.trainingExercises, library);
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), remoteSessions);
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingExercises')), library);
});

function createClient({ session = null, row = null, writeError = null, hangReads = false } = {}) {
  let storedRow = clone(row);
  let authListener = null;
  const calls = { select:0, insert:0, update:0 };

  function builder() {
    const filters = [];
    let operation = 'select';
    let values = null;
    let requestSignal = null;
    const api = {
      select() { return api; },
      insert(nextValues) { operation = 'insert'; values = nextValues; return api; },
      update(nextValues) { operation = 'update'; values = nextValues; return api; },
      eq(column, value) { filters.push([column, value]); return api; },
      abortSignal(signal) { requestSignal = signal; return api; },
      async maybeSingle() {
        if (operation === 'select') {
          calls.select += 1;
          if (hangReads) {
            await new Promise(resolve => {
              if (requestSignal?.aborted) resolve();
              else requestSignal?.addEventListener('abort', resolve, { once:true });
            });
          }
          return { data:clone(storedRow), error:null };
        }
        calls.update += 1;
        if (writeError) return { data:null, error:writeError };
        const revision = filters.find(([column]) => column === 'revision')?.[1];
        const user = filters.find(([column]) => column === 'user_id')?.[1];
        if (!storedRow || storedRow.user_id !== user || Number(storedRow.revision) !== Number(revision)) {
          return { data:null, error:null };
        }
        storedRow = { ...storedRow, payload:clone(values.payload), revision:storedRow.revision + 1, updated_at:'2026-07-17T12:00:00Z' };
        return { data:clone(storedRow), error:null };
      },
      async single() {
        calls.insert += 1;
        if (writeError) return { data:null, error:writeError };
        if (storedRow) return { data:null, error:{ code:'23505' } };
        storedRow = { user_id:values.user_id, payload:clone(values.payload), revision:1, updated_at:'2026-07-17T12:00:00Z' };
        return { data:clone(storedRow), error:null };
      },
    };
    return api;
  }

  return {
    calls,
    get row() { return clone(storedRow); },
    auth: {
      async getSession() { return { data:{ session }, error:null }; },
      onAuthStateChange(callback) { authListener = callback; return { data:{ subscription:{ unsubscribe() {} } } }; },
    },
    from(table) {
      assert.equal(table, 'user_sync_state');
      return builder();
    },
    emitAuth(event, nextSession) { authListener?.(event, nextSession); },
  };
}

async function loadSync({ seed = {}, session = null, row = null, online = true, writeError = null, hangReads = false, onWindow = null, runManualSync = true } = {}) {
  const dom = new JSDOM(html, { url:'http://localhost:3000/', runScripts:'outside-only', pretendToBeVisual:true });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'onLine', { configurable:true, value:online });
  for (const [key, value] of Object.entries(seed)) {
    window.localStorage.setItem(
      key,
      ['logbookLanguage', 'logbookCloudOwner', 'logbookGuest', 'logbookGuestImportPending'].includes(key)
        ? value
        : JSON.stringify(value),
    );
  }
  const client = createClient({ session, row, writeError, hangReads });
  const initialSyncEvents = [];
  const syncStatusEvents = [];
  window.addEventListener('logbook:initial-sync-complete', event => initialSyncEvents.push(event.detail));
  window.addEventListener('logbook:sync-status', event => syncStatusEvents.push(event.detail));
  onWindow?.(window);
  window.LogbookSupabase = client;
  window.eval(syncSource);
  await flush();
  if (runManualSync) await window.LogbookCloudSync.sync();
  await flush();
  return { window, localStorage:window.localStorage, client, initialSyncEvents, syncStatusEvents };
}

test('first connected device uploads existing local data and records its cloud revision', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const routines = [{ id:'r1', name:'Strength', isActive:true, cycleLength:7, plan:[{ id:'p1' }] }];
  const sessions = [{ id:'s1', date:'2026-07-17', exercises:[] }];
  const { localStorage, client, window, initialSyncEvents } = await loadSync({
    session,
    seed:{ trainingRoutines:routines, trainingSessions:sessions, logbookLanguage:'el' },
  });

  assert.equal(client.calls.insert, 1);
  assert.deepEqual(client.row.payload.trainingRoutines, routines.map(routine => ({ ...routine, isPlaceholder:false })));
  assert.deepEqual(client.row.payload.trainingSessions, sessions);
  assert.equal(localStorage.getItem('logbookCloudOwner'), 'user-a');
  assert.equal(JSON.parse(localStorage.getItem('logbookCloudMeta:user-a')).revision, 1);
  assert.equal(initialSyncEvents.at(-1)?.userId, 'user-a');
  assert.equal(initialSyncEvents.at(-1)?.success, true);
});

test('initial sync allows local boot while offline and waits to contact the cloud', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const { client, initialSyncEvents } = await loadSync({ session, online:false });

  assert.equal(client.calls.select, 0);
  assert.equal(client.calls.insert, 0);
  assert.equal(initialSyncEvents.at(-1)?.userId, 'user-a');
  assert.equal(initialSyncEvents.at(-1)?.success, true);
  assert.equal(initialSyncEvents.at(-1)?.offline, true);
});

test('the first authenticated session event can start sync without duplicating later member renders', async () => {
  const { window, client, initialSyncEvents } = await loadSync({ runManualSync:false });

  window.dispatchEvent(new window.CustomEvent('logbook:session-state', {
    detail:{ state:'member', userId:'user-a' },
  }));
  await flush();
  await flush();
  window.dispatchEvent(new window.CustomEvent('logbook:session-state', {
    detail:{ state:'member', userId:'user-a' },
  }));
  await flush();

  assert.equal(client.calls.select, 1);
  assert.equal(client.calls.insert, 1);
  assert.equal(initialSyncEvents.at(-1)?.userId, 'user-a');
  assert.equal(initialSyncEvents.at(-1)?.success, true);
});

test('a timed-out cloud request settles and a retry starts a fresh request', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const { window, client, initialSyncEvents } = await loadSync({
    session,
    hangReads:true,
    runManualSync:false,
    onWindow(window) {
      const originalSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay === 15000 ? 0 : delay, ...args);
    },
  });

  assert.equal(initialSyncEvents.at(-1)?.success, false);
  assert.equal(client.calls.select, 1);

  window.dispatchEvent(new window.CustomEvent('logbook:initial-sync-requested'));
  await flush();
  await flush();

  assert.equal(client.calls.select, 2, 'retry must not reuse the timed-out promise');
  assert.equal(initialSyncEvents.at(-1)?.success, false);
});

test('fresh device downloads an existing cloud snapshot without overwriting it with empty local state', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const payload = {
    trainingRoutines:[{ id:'r1', name:'Remote plan', isActive:true, cycleLength:7, plan:[] }],
    trainingSessions:[{ id:'s1', date:'2026-07-16', exercises:[] }],
    userProfile:{ name:'Remote athlete', weight:80, weightUnit:'kg' },
    routineRewardTracking:null,
    homeProfileCardPosition:null,
    homeRoutineCardPosition:null,
    logbookLanguage:'en',
  };
  const row = { user_id:'user-a', revision:4, payload, updated_at:'2026-07-17T12:00:00Z' };
  const { localStorage, client } = await loadSync({ session, row });

  assert.equal(client.calls.update, 0);
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), payload.trainingSessions);
  assert.deepEqual(JSON.parse(localStorage.getItem('userProfile')), payload.userProfile);
  assert.equal(localStorage.getItem('logbookLanguage'), 'en');
  assert.equal(JSON.parse(localStorage.getItem('logbookCloudMeta:user-a')).revision, 4);
});

test('an empty newer cloud snapshot cannot erase meaningful device data', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const routines = [{ id:'r1', name:'Strength', isActive:true, cycleLength:7, plan:[{ id:'p1' }] }];
  const sessions = [{ id:'s1', date:'2026-07-17', exercises:[] }];
  const profile = { name:'Local athlete', birthdate:'1990-01-01' };
  const localPayload = {
    trainingRoutines:routines,
    trainingSessions:sessions,
    userProfile:profile,
    routineRewardTracking:null,
    homeProfileCardPosition:null,
    homeRoutineCardPosition:null,
    logbookLanguage:'el',
  };
  const probe = await loadSync();
  const localHash = probe.window.LogbookCloudSync.payloadHash(localPayload);
  probe.window.close();
  const emptyPayload = {
    trainingRoutines:[],
    trainingSessions:[],
    userProfile:null,
    routineRewardTracking:null,
    homeProfileCardPosition:null,
    homeRoutineCardPosition:null,
    logbookLanguage:'el',
  };
  const row = { user_id:'user-a', revision:5, payload:emptyPayload, updated_at:'2026-07-18T12:00:00Z' };
  const { localStorage, client } = await loadSync({
    session,
    row,
    seed:{
      trainingRoutines:routines,
      trainingSessions:sessions,
      userProfile:profile,
      logbookLanguage:'el',
      'logbookCloudMeta:user-a':{ revision:4, hash:localHash, syncedAt:'2026-07-17T12:00:00Z' },
    },
  });

  assert.deepEqual(JSON.parse(localStorage.getItem('trainingRoutines')), routines.map(routine => ({ ...routine, isPlaceholder:false })));
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), sessions);
  assert.deepEqual(JSON.parse(localStorage.getItem('userProfile')), profile);
  assert.deepEqual(client.row.payload.trainingSessions, sessions);
  assert.deepEqual(client.row.payload.userProfile, profile);
  assert.ok(client.calls.update >= 1);
});

test('merge keeps unique routines and sessions from both devices', async () => {
  const { window } = await loadSync();
  const remote = {
    trainingRoutines:[{ id:'remote-routine', name:'Remote' }],
    trainingSessions:[{ id:'remote-session', date:'2026-07-15' }],
    userProfile:{ name:'Remote athlete' },
  };
  const local = {
    trainingRoutines:[{ id:'local-routine', name:'Local', isActive:true }],
    trainingSessions:[{ id:'local-session', date:'2026-07-16' }],
    userProfile:{ name:'Local athlete' },
  };

  const merged = window.LogbookCloudSync.mergePayloads(remote, local);
  assert.deepEqual(Array.from(merged.trainingRoutines, item => item.id), ['remote-routine', 'local-routine']);
  assert.deepEqual(Array.from(merged.trainingSessions, item => item.id), ['remote-session', 'local-session']);
  assert.equal(merged.userProfile.name, 'Local athlete');
});

test('merge tombstones prevent stale sessions and routines from being resurrected', async () => {
  const { window } = await loadSync();
  const deletedAt = '2026-07-28T12:00:00.000Z';
  const remote = {
    trainingRoutines:[{ id:'r1', name:'Current', isActive:true, plan:[] }, { id:'r2', deletedAt }],
    trainingSessions:[{ id:'s1', date:'2026-07-25' }, { id:'s2', deletedAt }],
  };
  const staleLocal = {
    trainingRoutines:[
      { id:'r1', name:'Current', isActive:false, plan:[] },
      { id:'r2', name:'Deleted elsewhere', isActive:true, plan:[{ id:'p2' }] },
      { id:'r3', name:'Unsynced local', isActive:false, plan:[] },
    ],
    trainingSessions:[
      { id:'s1', date:'2026-07-25' },
      { id:'s2', date:'2026-07-26' },
      { id:'s3', date:'2026-07-27' },
    ],
  };

  const merged = window.LogbookCloudSync.mergePayloads(remote, staleLocal);
  assert.deepEqual(JSON.parse(JSON.stringify(merged.trainingSessions)), [
    { id:'s1', date:'2026-07-25', exercises:[] },
    { id:'s2', deletedAt },
    { id:'s3', date:'2026-07-27', exercises:[] },
  ]);
  assert.deepEqual(Array.from(merged.trainingRoutines, item => ({ id:item.id, deletedAt:item.deletedAt })), [
    { id:'r1', deletedAt:undefined },
    { id:'r2', deletedAt },
    { id:'r3', deletedAt:undefined },
  ]);
  assert.equal(merged.trainingRoutines.find(item => item.id === 'r1').isActive, true);
  window.close();
});

test('first sync uploads local tombstones as part of the snapshot', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const deletedAt = '2026-07-28T12:00:00.000Z';
  const { client, window } = await loadSync({
    session,
    seed:{
      trainingRoutines:[{ id:'r1', name:'Current', isActive:true, plan:[] }, { id:'r2', deletedAt }],
      trainingSessions:[{ id:'s1', date:'2026-07-27' }, { id:'s2', deletedAt }],
    },
  });

  assert.deepEqual(client.row.payload.trainingRoutines.find(item => item.id === 'r2'), { id:'r2', deletedAt });
  assert.deepEqual(client.row.payload.trainingSessions.find(item => item.id === 's2'), { id:'s2', deletedAt });
  window.close();
});

test('cloud payload normalization validates nested exercises and set fields', async () => {
  const { window } = await loadSync();
  const injected = '5" autofocus onfocus="alert(1)';
  const normalized = window.LogbookCloudSync.mergePayloads({}, {
    trainingSessions:[{
      id:'unsafe-session', date:'2026-07-20', type:'free', exercises:[{
        exercise:'Squat', comments:'', sets:[
          { reps:'5', weight:'100.25', plates:null, weightMode:'kg' },
          { reps:injected, weight:injected, plates:'4', weightMode:injected },
          injected,
        ],
      }],
    }],
  });
  const sets = JSON.parse(JSON.stringify(normalized.trainingSessions[0].exercises[0].sets));

  assert.deepEqual(sets, [
    { reps:5, weight:100.25, plates:null, weightMode:'kg' },
    { reps:null, weight:null, plates:4, weightMode:'kg' },
  ]);
});

test('cloud profile uses an allowlist, omits the local gallery and stays below 100KB with an active avatar', async () => {
  const { window } = await loadSync();
  const activeAvatar = `data:image/jpeg;base64,${'A'.repeat(70 * 1024)}`;
  const normalized = window.LogbookCloudSync.mergePayloads({}, {
    userProfile:{
      name:'  Athlete  ',
      birthdate:'1990-01-01',
      hideAge:false,
      weight:80,
      weightUnit:'kg',
      avatar:'custom',
      customImage:activeAvatar,
      imageGallery:[activeAvatar, `data:image/jpeg;base64,${'B'.repeat(70 * 1024)}`],
      injected:{ arbitrary:'payload' },
    },
  });

  assert.deepEqual(Object.keys(normalized.userProfile).sort(), [
    'avatar', 'birthdate', 'customImage', 'hideAge', 'name', 'weight', 'weightUnit',
  ]);
  assert.equal(normalized.userProfile.name, 'Athlete');
  assert.equal(normalized.userProfile.customImage, activeAvatar);
  assert.equal('imageGallery' in normalized.userProfile, false);
  assert.ok(JSON.stringify(normalized).length < 100 * 1024);

  const oversized = window.LogbookCloudSync.mergePayloads({}, {
    userProfile:{ name:'Athlete', customImage:`data:image/jpeg;base64,${'C'.repeat(513 * 1024)}` },
  });
  assert.equal('customImage' in oversized.userProfile, false);
  window.close();
});

test('a profile without a single valid field is not data', async () => {
  const { window } = await loadSync();
  const profileOf = value => window.LogbookCloudSync.mergePayloads({}, { userProfile:value }).userProfile;

  assert.equal(profileOf({ imageGallery:['data:image/jpeg;base64,AAAA'], nickname:'ghost' }), null);
  assert.equal(profileOf({ name:'   ', customImage:'', hideAge:false }), null);
  assert.equal(profileOf({ customImage:`data:image/jpeg;base64,${'C'.repeat(513 * 1024)}` }), null);
  assert.deepEqual({ ...profileOf({ name:'Athlete', customImage:'' }) }, { name:'Athlete', customImage:'' });
  window.close();
});

test('the payload fingerprint is 64 bit, stable across runs and moves in both lanes', async () => {
  const { window } = await loadSync();
  const { payloadHash } = window.LogbookCloudSync;
  const payload = {
    trainingRoutines:[{ id:'r1', name:'Strength', isActive:true, plan:[{ id:'p1', exercise:'Squat', workSets:3 }] }],
    trainingSessions:[{ id:'s1', date:'2026-07-17', exercises:[{ exercise:'Squat', sets:[{ reps:5, weight:100, weightMode:'kg' }] }] }],
    userProfile:{ name:'Athlete', birthdate:'1990-01-01', weight:80, weightUnit:'kg' },
    logbookLanguage:'el',
  };

  // A silent collision is a lost change, so the fingerprint is pinned: any
  // change to the hash or to what it hashes has to be a deliberate one.
  const hash = payloadHash(payload);
  assert.equal(hash.length, 16);
  assert.equal(hash, '8e26da3968116309');
  assert.equal(payloadHash(structuredClone(payload)), hash);

  const changed = payloadHash({ ...payload, logbookLanguage:'en' });
  assert.notEqual(changed.slice(0, 8), hash.slice(0, 8));
  assert.notEqual(changed.slice(8), hash.slice(8));
  assert.notEqual(payloadHash({ ...payload, userProfile:{ ...payload.userProfile, name:'Athlets' } }), hash);
  window.close();
});

test('payload size constraint failures surface a friendly sync status', async () => {
  const session = { user:{ id:'user-a', email:'athlete@example.com' } };
  const writeError = {
    code:'23514',
    constraint:'user_sync_state_payload_size_check',
    message:'new row violates check constraint',
  };
  const { syncStatusEvents, window } = await loadSync({ session, writeError });

  assert.equal(syncStatusEvents.at(-1).kind, 'error');
  assert.match(syncStatusEvents.at(-1).message, /πολύ μεγάλα για συγχρονισμό/);
  window.close();
});

test('merge does not let an empty local placeholder replace the remote active program', async () => {
  const { window } = await loadSync();
  const remote = {
    trainingRoutines:[{ id:'remote-routine', name:'Test program', isActive:true, plan:[{ id:'p1' }] }],
    trainingSessions:[{ id:'remote-session', routineId:'remote-routine', type:'scheduled', date:'2026-07-15' }],
  };
  const local = {
    trainingRoutines:[{ id:'placeholder', name:'Το πρόγραμμά μου', isActive:true, plan:[] }],
    trainingSessions:[],
  };
  const merged = window.LogbookCloudSync.mergePayloads(remote, local);
  assert.equal(merged.trainingRoutines.find(routine => routine.id === 'remote-routine').isActive, true);
  assert.equal(merged.trainingRoutines.find(routine => routine.id === 'placeholder').isActive, false);
});

test('merge never lets a plan-less copy of a routine overwrite the copy that still has its plan', async () => {
  const { window } = await loadSync();
  const planned = { id:'r1', name:'Push Pull', isActive:true, cycleLength:7, plan:[{ id:'p1', cycleDay:1 }, { id:'p2', cycleDay:3 }] };
  const stale = { id:'r1', name:'Push Pull', isActive:true, cycleLength:7, plan:[] };

  const remoteHasPlan = window.LogbookCloudSync.mergePayloads({ trainingRoutines:[planned] }, { trainingRoutines:[stale] });
  assert.equal(remoteHasPlan.trainingRoutines.find(routine => routine.id === 'r1').plan.length, 2);

  const localHasPlan = window.LogbookCloudSync.mergePayloads({ trainingRoutines:[stale] }, { trainingRoutines:[planned] });
  assert.equal(localHasPlan.trainingRoutines.find(routine => routine.id === 'r1').plan.length, 2);
});

test('switching accounts replaces the previous users visible local data', async () => {
  const session = { user:{ id:'user-b', email:'second@example.com' } };
  const payload = {
    trainingRoutines:[{ id:'b-routine', name:'Second account', isActive:true }],
    trainingSessions:[{ id:'b-session', date:'2026-07-17' }],
    userProfile:{ name:'Second athlete' },
    logbookLanguage:'el',
  };
  const row = { user_id:'user-b', revision:2, payload, updated_at:'2026-07-17T12:00:00Z' };
  const { localStorage, client } = await loadSync({
    session,
    row,
    seed:{
      logbookCloudOwner:'user-a',
      trainingRoutines:[{ id:'a-routine', name:'First account', isActive:true }],
      trainingSessions:[{ id:'a-session', date:'2026-07-16' }],
    },
  });

  assert.equal(localStorage.getItem('logbookCloudOwner'), 'user-b');
  assert.equal(JSON.parse(localStorage.getItem('trainingRoutines'))[0].id, 'b-routine');
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions'))[0].id, 'b-session');
  assert.equal(JSON.parse(localStorage.getItem('logbookCloudCache:user-a')).trainingSessions[0].id, 'a-session');
  assert.deepEqual(client.row.payload.trainingSessions.map(session => session.id), ['b-session']);
});

test('the same user restores an isolated sign-out cache without exposing common keys', async () => {
  const session = { user:{ id:'user-a', email:'first@example.com' } };
  const archived = {
    trainingRoutines:[],
    trainingSessions:[{ id:'unsynced-a', date:'2026-07-17' }],
    userProfile:{ name:'First athlete' },
    logbookLanguage:'el',
  };
  const row = {
    user_id:'user-a',
    revision:1,
    payload:{ trainingRoutines:[], trainingSessions:[], userProfile:null, logbookLanguage:'el' },
  };
  const { client, localStorage } = await loadSync({
    session,
    row,
    seed:{
      logbookCloudOwner:'user-a',
      'logbookCloudCache:user-a':archived,
      'logbookCloudMeta:user-a':{ revision:1, hash:'pre-signout' },
    },
  });

  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id), ['unsynced-a']);
  assert.deepEqual(client.row.payload.trainingSessions.map(item => item.id), ['unsynced-a']);
});

test('guest data merges automatically when the account already has history', async () => {
  const session = { user:{ id:'user-b', email:'second@example.com' } };
  const row = {
    user_id:'user-b',
    revision:2,
    payload:{
      trainingRoutines:[],
      trainingSessions:[{ id:'cloud-session', date:'2026-07-16' }],
      logbookLanguage:'el',
    },
  };
  const { client, localStorage } = await loadSync({
    session,
    row,
    seed:{
      logbookCloudOwner:'user-a',
      'logbookCloudCache:user-a':{ trainingSessions:[{ id:'private-a', date:'2026-07-15' }] },
      logbookGuestImportPending:'1',
      trainingSessions:[{ id:'guest-session', date:'2026-07-17' }],
    },
  });

  assert.deepEqual(client.row.payload.trainingSessions.map(item => item.id).sort(), ['cloud-session', 'guest-session']);
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id).sort(), ['cloud-session', 'guest-session']);
  assert.deepEqual(JSON.parse(localStorage.getItem('logbookCloudCache:user-a')).trainingSessions.map(item => item.id), ['private-a']);
  assert.equal(localStorage.getItem('logbookGuestImportPending'), null);
});

test('a dirty same-revision device with a missing library preserves and receives remote definitions', async () => {
  const library = [{ id:'row', name:'Row', notes:'', aliases:[], updatedAt:'2026-09-05T10:00:00Z' }];
  const { client, localStorage, window } = await loadSync({
    session:{ user:{ id:'user-a', email:'athlete@example.com' } },
    row:{ user_id:'user-a', revision:7, payload:{ trainingExercises:library, trainingSessions:[] } },
    seed:{
      logbookCloudOwner:'user-a',
      'logbookCloudMeta:user-a':{ revision:7, hash:'before-local-edit' },
      trainingSessions:[{ id:'local-session', date:'2026-09-05' }],
    },
  });
  assert.deepEqual(client.row.payload.trainingExercises.map(item => item.id), ['row']);
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingExercises')).map(item => item.id), ['row']);
  assert.deepEqual(client.row.payload.trainingSessions.map(item => item.id), ['local-session']);
  window.close();
});

test('an empty guest profile does not count as data during automatic import', async () => {
  const session = { user:{ id:'user-b', email:'second@example.com' } };
  const row = {
    user_id:'user-b',
    revision:2,
    payload:{ trainingRoutines:[], trainingSessions:[{ id:'cloud-session', date:'2026-07-16' }], logbookLanguage:'el' },
  };
  const { localStorage } = await loadSync({
    session,
    row,
    seed:{ logbookGuestImportPending:'1', userProfile:{ imageGallery:[], nickname:'ghost' } },
  });

  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id), ['cloud-session']);
  assert.equal(localStorage.getItem('userProfile'), null);
  assert.equal(localStorage.getItem('logbookGuestImportPending'), null);
});
