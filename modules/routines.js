export const DAYS = Object.freeze(['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο']);
export const PLAN_ORDER = Object.freeze(['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή']);
export const MIN_CYCLE_LENGTH = 3;
export const MAX_CYCLE_LENGTH = 10;

export const clampCycleLength = value =>
  Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, Number(value) || 7));

export const dateParts = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? match.slice(1).map(Number) : null;
};

export const dateFromParts = parts => parts ? new Date(parts[0], parts[1] - 1, parts[2]) : null;

export const inputDateValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export const mondayFor = (value = inputDateValue()) => {
  const date = dateFromParts(dateParts(value)) || new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return inputDateValue(date);
};

export const legacyCycleDay = day => {
  const index = PLAN_ORDER.indexOf(day);
  return index >= 0 ? index + 1 : null;
};

export const validCycleDay = (value, length) =>
  Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= length ? Number(value) : null;

export function normalizeRoutine(routine = {}, index = 0, randomUUID = () => globalThis.crypto.randomUUID()) {
  const cycleLength = clampCycleLength(routine.cycleLength);
  const cycleAnchorDate = dateParts(routine.cycleAnchorDate) ? routine.cycleAnchorDate : mondayFor();
  const usesWeekdays = routine.usesWeekdays !== false;
  const plan = Array.isArray(routine.plan) ? routine.plan.map(item => {
    const cycleDay = validCycleDay(item.cycleDay, cycleLength)
      || validCycleDay(legacyCycleDay(item.day), cycleLength);
    return cycleDay ? { ...item, cycleDay } : null;
  }).filter(Boolean) : [];
  return {
    id:routine.id || randomUUID(),
    name:routine.name || `Πρόγραμμα ${index + 1}`,
    isActive:Boolean(routine.isActive),
    cycleLength,
    cycleAnchorDate,
    usesWeekdays,
    plan,
  };
}

export const cycleDayForDate = (routine, value) => {
  const anchor = dateParts(routine?.cycleAnchorDate);
  const current = dateParts(value);
  if (!anchor || !current) return 1;
  const difference = Math.round((
    Date.UTC(current[0], current[1] - 1, current[2])
    - Date.UTC(anchor[0], anchor[1] - 1, anchor[2])
  ) / 86400000);
  const length = clampCycleLength(routine?.cycleLength);
  return ((difference % length) + length) % length + 1;
};

export const weekdayForCycleDay = (routine, cycleDay) => {
  const anchor = dateFromParts(dateParts(routine?.cycleAnchorDate)) || new Date();
  anchor.setDate(anchor.getDate() + Number(cycleDay) - 1);
  return DAYS[anchor.getDay()];
};

export const itemCycleDay = (item, routine) =>
  validCycleDay(item?.cycleDay, clampCycleLength(routine?.cycleLength)) || legacyCycleDay(item?.day);

export const planItemsForCycleDay = (routine, cycleDay) =>
  (routine?.plan || []).filter(item => itemCycleDay(item, routine) === Number(cycleDay));

export const declaredWeekdayForCycleDay = (routine, cycleDay) =>
  planItemsForCycleDay(routine, cycleDay)[0]?.day || weekdayForCycleDay(routine, cycleDay);

export const weekdayDeclarationCount = (routine, weekday, excludedCycleDay = null) => [
  ...new Set((routine?.plan || []).map(item => itemCycleDay(item, routine)).filter(Boolean)),
].filter(cycleDay =>
  cycleDay !== Number(excludedCycleDay)
  && declaredWeekdayForCycleDay(routine, cycleDay) === weekday
).length;

export const cycleDayLabel = (routine, cycleDay) => routine?.usesWeekdays === false
  ? planItemsForCycleDay(routine, cycleDay)[0]?.workoutName || 'Προπόνηση'
  : declaredWeekdayForCycleDay(routine, cycleDay);
