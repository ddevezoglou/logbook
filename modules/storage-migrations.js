import {
  legacyCycleDay,
  mondayFor,
  normalizeRoutine,
  validCycleDay,
} from './routines.js';

export function createStore(storage, { onWrite } = {}) {
  return {
    read(key, fallback = null) {
      try {
        const raw = storage.getItem(key);
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      storage.setItem(key, JSON.stringify(value));
      onWrite?.(key);
    },
  };
}

export function writeSafely(store, key, value, onError) {
  try {
    store.write(key, value);
    return true;
  } catch (error) {
    onError?.(error);
    return false;
  }
}

export function migrateLocalData({
  oldLogs = [],
  savedSessions = [],
  savedProfile = null,
  legacyPlan = [],
  savedRoutines = [],
  randomUUID = () => globalThis.crypto.randomUUID(),
} = {}) {
  const sessions = Array.isArray(savedSessions) ? savedSessions : [];
  const migratedRoutine = normalizeRoutine({
    id:randomUUID(),
    name:'Το πρόγραμμά μου',
    isActive:true,
    cycleLength:7,
    cycleAnchorDate:mondayFor(),
    plan:Array.isArray(legacyPlan) ? legacyPlan : [],
  }, 0, randomUUID);
  const routines = Array.isArray(savedRoutines) && savedRoutines.length
    ? savedRoutines.map((routine, index) => normalizeRoutine(routine, index, randomUUID))
    : [migratedRoutine];

  if (!routines.some(routine => routine.isActive)) routines[0].isActive = true;
  let foundActiveRoutine = false;
  routines.forEach(routine => {
    if (routine.isActive && !foundActiveRoutine) foundActiveRoutine = true;
    else if (routine.isActive) routine.isActive = false;
  });

  let rebuiltPlans = false;
  routines.forEach(routine => {
    if (routine.plan.length) return;
    const history = sessions.filter(session =>
      session?.routineId != null
      && String(session.routineId) === String(routine.id)
      && session.type !== 'free'
      && session.date);
    if (history.length < 3) return;
    const latestByCycleDay = new Map();
    [...history].sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(session => {
      const cycleDay = validCycleDay(session.cycleDay, routine.cycleLength)
        || validCycleDay(legacyCycleDay(session.workoutDay), routine.cycleLength);
      if (cycleDay) latestByCycleDay.set(cycleDay, session);
    });
    if (!latestByCycleDay.size) return;
    routine.plan = [...latestByCycleDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .flatMap(([cycleDay, session]) =>
        (session.exercises?.length ? session.exercises : [{ exercise:'Προπόνηση' }]).map(entry => ({
          id:randomUUID(),
          day:routine.usesWeekdays === false ? null : session.workoutDay || null,
          cycleDay,
          workoutName:session.workoutName || session.workoutDay || 'Προπόνηση',
          exercise:entry.exercise || 'Άσκηση',
          workSets:entry.sets?.length || 3,
          cues:'',
        })));
    rebuiltPlans = true;
  });

  const placeholderRoutineNames = new Set(['Το πρόγραμμά μου', 'Πρόγραμμα 1']);
  const matchingSessionCount = routine => sessions.filter(session =>
    session?.routineId != null
    && String(session.routineId) === String(routine.id)
    && session.type !== 'free'
  ).length;
  const staleActiveRoutine = routines.find(routine =>
    routine.isActive
    && placeholderRoutineNames.has(routine.name)
    && !routine.plan.length
    && matchingSessionCount(routine) === 0);
  if (staleActiveRoutine) {
    const historicalRoutine = routines
      .filter(routine => routine.id !== staleActiveRoutine.id && routine.plan.length && matchingSessionCount(routine) > 0)
      .sort((a, b) => matchingSessionCount(b) - matchingSessionCount(a))[0];
    if (historicalRoutine) {
      staleActiveRoutine.isActive = false;
      historicalRoutine.isActive = true;
    }
  }

  const migratedSessions = sessions.length
    ? sessions
    : (Array.isArray(oldLogs) ? oldLogs : []).map(log => ({
      id:log.id,
      date:log.date,
      type:'free',
      comments:'',
      exercises:[{
        exercise:log.exercise,
        comments:log.comments || '',
        sets:log.sets || [],
      }],
    }));
  const profile = !Array.isArray(savedProfile) && savedProfile ? savedProfile : null;

  return {
    state:{
      routines,
      selectedRoutineId:routines.find(routine => routine.isActive)?.id ?? routines[0]?.id ?? null,
      editingRoutineId:null,
      sessions:migratedSessions,
      profile,
      mode:'scheduled',
      editingDay:null,
      editingSessionId:null,
      copyingSessionId:null,
      selectedPlanDay:null,
      openSessionId:null,
      selectedHistoryDate:null,
      historyWeekOffset:0,
    },
    repairs:{
      sessionsChanged:!sessions.length && Array.isArray(oldLogs) && oldLogs.length > 0,
      routinesChanged:rebuiltPlans
        || !(Array.isArray(savedRoutines) && savedRoutines.length)
        || JSON.stringify(savedRoutines) !== JSON.stringify(routines),
    },
  };
}
