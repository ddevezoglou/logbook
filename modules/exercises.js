// Exercise identity is independent of a plan slot (id / planExerciseId).
// Keep historical display names and all other fields as recorded.
const text = value => typeof value === 'string' ? value.trim() : '';
export const exerciseKey = entry => entry?.exerciseId || text(entry?.exercise).toLowerCase();
export const exerciseName = (entry, library) => library.find(item => item.id === entry.exerciseId)?.name || entry.exercise;
const legacyId = name => `legacy:${Array.from(name).map(char => char.codePointAt(0).toString(16)).join('-')}`;

export function migrateExercises({ exercises = [], routines = [], sessions = [] } = {}) {
  const library = exercises.map(entry => ({ ...entry }));
  const byId = new Map(library.map(entry => [entry.id, entry]));
  const candidates = name => library.filter(entry => entry.name === name || entry.aliases?.includes(name));
  function resolve(entry, preferredId = null) {
    const name = text(entry.exercise);
    if (!name && !entry.exerciseId) return entry;
    const matches = candidates(name);
    // No fuzzy/case/accent matching. Explicit homonyms retain separate IDs.
    const unresolvedId = matches.length > 1 ? legacyId(name).replace('legacy:', 'ambiguous:') : legacyId(name);
    const identity = entry.exerciseId || preferredId || (matches.length === 1 ? matches[0].id : unresolvedId);
    if (!byId.has(identity)) {
      const definition = { id:identity, name, notes:'', aliases:[], updatedAt:'1970-01-01T00:00:00.000Z' };
      library.push(definition);
      byId.set(identity, definition);
    }
    return entry.exerciseId === identity ? entry : { ...entry, exerciseId:identity };
  }
  const nextRoutines = routines.map(routine => routine.deletedAt ? routine : ({
    ...routine, plan:(routine.plan || []).map(entry => resolve(entry)),
  }));
  const nextSessions = sessions.map(session => {
    if (session.deletedAt) return session;
    const plan = nextRoutines.find(routine => routine.id === session.routineId)?.plan || [];
    return { ...session, exercises:(session.exercises || []).map(entry => {
      const slot = entry.planExerciseId && plan.find(item => item.id === entry.planExerciseId);
      const matches = plan.filter(item => text(item.exercise) === text(entry.exercise));
      const ids = new Set(matches.map(item => item.exerciseId));
      // A renamed/replaced slot is insufficient evidence to relabel old history.
      const preferred = slot && text(slot.exercise) === text(entry.exercise) ? slot.exerciseId
        : ids.size === 1 ? matches[0].exerciseId : null;
      return resolve(entry, preferred);
    }) };
  });
  return { exercises:library, routines:nextRoutines, sessions:nextSessions };
}

export function saveExercise(library, { id, name, notes = '' }, { randomUUID = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  name = text(name);
  if (!name || name.length > 200 || typeof notes !== 'string' || notes.length > 2000) throw new Error('Invalid exercise');
  const previous = id ? library.find(entry => entry.id === id) : null;
  if (id && !previous) throw new Error('Unknown exercise');
  const record = {
    ...previous, id:previous?.id || randomUUID(), name, notes:notes.trim(),
    aliases:[...new Set([...(previous?.aliases || []), ...(previous && previous.name !== name ? [previous.name] : [])])],
    updatedAt:now(),
  };
  return previous ? library.map(entry => entry.id === id ? record : entry) : [...library, record];
}

// A one-write raw recovery copy precedes any migration writes. If quota is full,
// stop the upgrade and keep the source keys untouched. Auth clears it on sign-out.
export function backupBeforeExerciseMigration(storage) {
  const key = 'logbookExerciseMigrationBackup';
  const owner = storage.getItem('logbookGuest') === '1' ? 'guest' : storage.getItem('logbookCloudOwner') || 'local';
  const previous = storage.getItem(key);
  if (previous !== null && JSON.parse(previous).owner === owner) return;
  const keys = ['trainingExercises', 'trainingRoutines', 'trainingSessions', 'trainingPlan', 'trainingLogs'];
  const data = Object.fromEntries(keys.map(name => [name, storage.getItem(name)]));
  if (keys.some(name => data[name] !== null)) storage.setItem(key, JSON.stringify({ version:1, owner, data }));
}
