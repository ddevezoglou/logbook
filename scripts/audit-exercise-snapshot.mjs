import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { migrateExercises } from '../modules/exercises.js';
import { migrateLocalData } from '../modules/storage-migrations.js';

const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/audit-exercise-snapshot.mjs <private-snapshot-export.json>');
const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const input = JSON.parse(raw);
const rows = input.rows || (Array.isArray(input) ? input : [{ payload:input }]);
const stripRefs = value => JSON.parse(JSON.stringify(value, (key, entry) => key === 'exerciseId' ? undefined : entry));
const result = rows.map(({ payload, revision }, index) => {
  const source = { exercises:payload.trainingExercises || [], routines:payload.trainingRoutines || [], sessions:payload.trainingSessions || [] };
  const migrated = migrateExercises(source);
  assert.deepEqual(stripRefs(migrated.sessions), stripRefs(source.sessions), 'Historical values changed');
  assert.deepEqual(stripRefs(migrated.routines), stripRefs(source.routines), 'Plan values changed');
  assert.deepEqual(migrateExercises(migrated), migrated, 'Migration is not idempotent');
  const legacy = { exercises:[], routines:stripRefs(source.routines), sessions:stripRefs(source.sessions) };
  const fromLegacy = migrateExercises(legacy);
  assert.deepEqual(stripRefs(fromLegacy.sessions), legacy.sessions, 'Legacy historical values changed');
  assert.deepEqual(migrateExercises(fromLegacy), fromLegacy, 'Legacy migration is not idempotent');
  const liveRoutines = source.routines.filter(item => !item.deletedAt);
  const liveSessions = source.sessions.filter(item => !item.deletedAt);
  const appMigration = migrateLocalData({ savedExercises:source.exercises, savedRoutines:liveRoutines, savedSessions:liveSessions, savedProfile:payload.userProfile });
  assert.deepEqual(stripRefs(appMigration.state.sessions), stripRefs(liveSessions), 'App migration changed history');
  assert.deepEqual(appMigration.state.routines.map(item => item.id), liveRoutines.map(item => item.id), 'Routine IDs changed');
  assert.deepEqual(appMigration.state.routines.map(item => stripRefs(item.plan)), liveRoutines.map(item => stripRefs(item.plan)), 'App migration changed plan slots');
  const definitions = new Set(migrated.exercises.map(item => item.id));
  assert.equal(definitions.size, migrated.exercises.length, 'Duplicate definition IDs');
  const entries = [...migrated.routines.flatMap(item => item.plan || []), ...migrated.sessions.flatMap(item => item.exercises || [])];
  assert.ok(entries.every(item => !item.exercise || definitions.has(item.exerciseId)), 'Unresolved exercise reference');
  return {
    account:index + 1, revision, routines:liveRoutines.length, sessions:liveSessions.length,
    planSlots:liveRoutines.reduce((count, item) => count + item.plan.length, 0),
    historicalExerciseEntries:liveSessions.reduce((count, item) => count + item.exercises.length, 0),
    sets:liveSessions.reduce((count, item) => count + item.exercises.reduce((total, entry) => total + entry.sets.length, 0), 0),
    definitionsBefore:source.exercises.length, definitionsAfter:migrated.exercises.length,
    legacyDefinitions:fromLegacy.exercises.length, verified:true,
  };
});
console.log(JSON.stringify({ sha256:createHash('sha256').update(raw).digest('hex'), accounts:result }, null, 2));
