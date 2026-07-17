import { readFileSync } from 'node:fs';

const email = process.env.LOGBOOK_TEST_EMAIL;
const password = process.env.LOGBOOK_TEST_PASSWORD;
if (!email || !password) throw new Error('Set LOGBOOK_TEST_EMAIL and LOGBOOK_TEST_PASSWORD.');

const root = new URL('../', import.meta.url);
const configSource = readFileSync(new URL('supabase-config.js', root), 'utf8');
const url = configSource.match(/url:\s*'([^']+)'/)?.[1];
const publishableKey = configSource.match(/publishableKey:\s*'([^']+)'/)?.[1];
if (!url || !publishableKey) throw new Error('Supabase project configuration was not found.');

const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method:'POST',
  headers:{ apikey:publishableKey, 'Content-Type':'application/json' },
  body:JSON.stringify({ email, password }),
});
const auth = await authResponse.json().catch(() => null);
if (!authResponse.ok || !auth?.access_token) {
  throw new Error(auth?.msg || auth?.message || `Login failed with HTTP ${authResponse.status}`);
}

const rowResponse = await fetch(`${url}/rest/v1/user_sync_state?select=revision,payload,updated_at&user_id=eq.${auth.user.id}`, {
  headers:{
    apikey:publishableKey,
    Authorization:`Bearer ${auth.access_token}`,
    Accept:'application/vnd.pgrst.object+json',
  },
});
const row = await rowResponse.json().catch(() => null);
if (!rowResponse.ok || !row?.payload) {
  throw new Error(row?.message || `Sync snapshot read failed with HTTP ${rowResponse.status}`);
}

const sessions = Array.isArray(row.payload.trainingSessions) ? row.payload.trainingSessions : [];
const routines = Array.isArray(row.payload.trainingRoutines) ? row.payload.trainingRoutines : [];
console.log(JSON.stringify({
  login:true,
  userId:auth.user.id,
  revision:row.revision,
  updatedAt:row.updated_at,
  routines:routines.length,
  sessions:sessions.length,
  exercises:sessions.reduce((sum, session) => sum + (session.exercises?.length || 0), 0),
  sets:sessions.reduce((sum, session) => sum + (session.exercises || []).reduce((inner, exercise) => inner + (exercise.sets?.length || 0), 0), 0),
}, null, 2));
