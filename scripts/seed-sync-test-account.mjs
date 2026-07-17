import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const email = process.env.LOGBOOK_TEST_EMAIL;
const password = process.env.LOGBOOK_TEST_PASSWORD;

if (!email || !password) {
  throw new Error('Set LOGBOOK_TEST_EMAIL and LOGBOOK_TEST_PASSWORD before running this script.');
}

const root = new URL('../', import.meta.url);
const configSource = readFileSync(new URL('supabase-config.js', root), 'utf8');
const seedSource = readFileSync(new URL('seed-week.js', root), 'utf8');
const url = configSource.match(/url:\s*'([^']+)'/)?.[1];
const publishableKey = configSource.match(/publishableKey:\s*'([^']+)'/)?.[1];

if (!url || !publishableKey) throw new Error('Supabase project configuration was not found.');

function buildSeedPayload() {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM('<!doctype html>', {
    url:'http://localhost:3000/',
    runScripts:'outside-only',
    virtualConsole,
  });
  try { dom.window.eval(seedSource); } catch { /* jsdom does not implement location.reload */ }
  const read = (key, fallback = null) => {
    const raw = dom.window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  };
  const seededRoutines = read('trainingRoutines', []);
  const activeRoutine = seededRoutines.find(routine => routine.isActive) || seededRoutines[0];
  const trainingSessions = read('trainingSessions', []).filter(session =>
    activeRoutine && String(session.routineId) === String(activeRoutine.id));
  if (!activeRoutine || !trainingSessions.length) throw new Error('The single-routine seed payload could not be built.');
  return {
    trainingRoutines:[activeRoutine],
    trainingSessions,
    userProfile:{
      name:'Sync Test Athlete',
      birthDate:'1992-04-18',
      weight:82.5,
      weightUnit:'kg',
      avatar:'male',
    },
    routineRewardTracking:null,
    homeProfileCardPosition:null,
    homeRoutineCardPosition:null,
    logbookLanguage:'el',
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers:{
      apikey:publishableKey,
      'Content-Type':'application/json',
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

let auth = await request('/auth/v1/signup', {
  method:'POST',
  body:JSON.stringify({ email, password }),
});

if (!auth.response.ok || !auth.body?.access_token) {
  auth = await request('/auth/v1/token?grant_type=password', {
    method:'POST',
    body:JSON.stringify({ email, password }),
  });
}

if (!auth.response.ok || !auth.body?.access_token || !auth.body?.user?.id) {
  const reason = auth.body?.msg || auth.body?.message || auth.body?.error_description || `HTTP ${auth.response.status}`;
  throw new Error(`The test account could not sign in: ${reason}`);
}

const payload = buildSeedPayload();
const userId = auth.body.user.id;
const seeded = await request('/rest/v1/user_sync_state?on_conflict=user_id', {
  method:'POST',
  headers:{
    Authorization:`Bearer ${auth.body.access_token}`,
    Prefer:'resolution=merge-duplicates,return=representation',
  },
  body:JSON.stringify({ user_id:userId, payload }),
});

if (!seeded.response.ok) {
  const reason = seeded.body?.message || seeded.body?.hint || `HTTP ${seeded.response.status}`;
  throw new Error(`Remote seed failed: ${reason}`);
}

const row = Array.isArray(seeded.body) ? seeded.body[0] : seeded.body;
console.log(JSON.stringify({
  email,
  userId,
  revision:row?.revision,
  routines:payload.trainingRoutines.length,
  sessions:payload.trainingSessions.length,
  exercises:payload.trainingSessions.reduce((sum, session) => sum + session.exercises.length, 0),
  sets:payload.trainingSessions.reduce((sum, session) => sum + session.exercises.reduce((inner, exercise) => inner + exercise.sets.length, 0), 0),
}, null, 2));
