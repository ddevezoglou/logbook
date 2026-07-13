import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, click, setValue } from './helpers.mjs';

const routineWith = plan => [{ id: 'r1', name: 'Test Routine', isActive: true, plan }];
const planDay = (day, exercise, extra = {}) => ({ id: `p-${day}-${exercise}`, day, workoutName: `${day} Workout`, exercise, workSets: 3, cues: '', ...extra });

test('boots with empty storage without throwing', () => {
  const { document } = loadApp();
  assert.ok(document.querySelector('#plan-list').innerHTML.includes('Δευτέρα'));
});

test('migrates legacy trainingLogs into sessions', () => {
  const { localStorage } = loadApp({
    trainingLogs: [{ id: 'l1', date: '2026-07-01', exercise: 'Squat', sets: [{ reps: 5, weight: 100 }] }],
  });
  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].exercises[0].exercise, 'Squat');
});

test('creating a routine adds it and selects it', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#routine-name', 'Push Pull Legs', 'input');
  document.querySelector('#routine-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  const routines = JSON.parse(localStorage.getItem('trainingRoutines'));
  assert.equal(routines.length, 2);
  assert.equal(routines[1].name, 'Push Pull Legs');
});

test('saving a scheduled session stores it with the plan workout name', () => {
  const { document, localStorage } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press')]),
  });
  setValue(document, '#log-date', '2026-07-06'); // Monday
  const rows = [...document.querySelectorAll('#scheduled-session [data-set]')];
  assert.ok(rows.length >= 3, 'expected planned set rows');
  rows.forEach(row => {
    row.querySelector('.set-reps').value = '8';
    row.querySelector('.set-weight').value = '60';
  });
  click(document, '#save-session');
  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].workoutName, 'Δευτέρα Workout');
  assert.equal(sessions[0].exercises[0].sets.length, 3);
});

test('deleting a session removes it from storage', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg' }] }] };
  const { document, localStorage } = loadApp({ trainingSessions: [session] });
  click(document, '[data-delete-session="s1"]');
  click(document, '#confirm-delete-accept');
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions')).length, 0);
});

test('personal bests pick the heavier set', () => {
  const sets = w => [{ reps: 5, weight: w, weightMode: 'kg', plates: null }];
  const sessions = [
    { id: 's1', date: '2026-07-01', type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: sets(100) }] },
    { id: 's2', date: '2026-07-03', type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: sets(110) }] },
  ];
  const { document } = loadApp({ trainingSessions: sessions });
  click(document, '.nav-button[data-view="overview"]');
  assert.ok(document.querySelector('#personal-bests').innerHTML.includes('110'), 'best should be 110kg');
});

test('progress chart renders two comparable points', () => {
  const mkSession = (id, date, weight) => ({ id, date, type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight, weightMode: 'kg', plates: null }] }] });
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [mkSession('s1', '2026-07-01', 60), mkSession('s2', '2026-07-08', 65)],
  });
  click(document, '.nav-button[data-view="progress"]');
  const panel = document.querySelector('#progress-panel').innerHTML;
  assert.ok(panel.includes('polyline'), 'chart should render');
  assert.ok(panel.includes('+5.0'), 'weight delta should be +5.0');
});

test('progress chart with a single-point mode still guards against division issues', () => {
  const mkSession = (id, date, weight) => ({ id, date, type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight, weightMode: 'kg', plates: null }] }] });
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [mkSession('s1', '2026-07-01', 60)],
  });
  click(document, '.nav-button[data-view="progress"]');
  assert.ok(document.querySelector('#progress-panel').innerHTML.includes('recording-warning') || document.querySelector('#progress-panel').innerHTML.includes('Δεν υπάρχει ασφαλής σύγκριση'));
});

test('deleting the active routine promotes another to active', () => {
  const routines = [
    { id: 'r1', name: 'A', isActive: true, plan: [] },
    { id: 'r2', name: 'B', isActive: false, plan: [] },
  ];
  const { document, localStorage } = loadApp({ trainingRoutines: routines });
  click(document, '[data-delete-routine="r1"]');
  click(document, '#confirm-delete-accept');
  const saved = JSON.parse(localStorage.getItem('trainingRoutines'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].isActive, true);
});

test('plan form with all 7 days occupied does not save an empty-day workout', () => {
  const fullPlan = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'].map(d => planDay(d, 'Ex'));
  const { document, localStorage } = loadApp({ trainingRoutines: routineWith(fullPlan) });
  setValue(document, '#workout-name', 'Ghost', 'input');
  document.querySelector('.builder-name').value = 'Phantom Press';
  const form = document.querySelector('#plan-form');
  // simulate a submit reaching the handler (jsdom does not run native validation on dispatch)
  if (form.checkValidity()) {
    form.dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  }
  const saved = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  const emptyDay = saved.filter(item => !item.day);
  assert.equal(emptyDay.length, 0, `plan should not contain entries with empty day, found: ${JSON.stringify(emptyDay)}`);
});

test('editing a scheduled session then switching workout day must not silently discard logged sets', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight: 60, weightMode: 'kg', plates: null }] }] };
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' }), planDay('Τρίτη', 'Row', { id: 'p2' })]),
    trainingSessions: [session],
  });
  click(document, '.nav-button[data-view="overview"]');
  click(document, '[data-edit-session="s1"]');
  const repsBefore = document.querySelector('#scheduled-session .set-reps').value;
  assert.equal(repsBefore, '8', 'edit view should show logged reps');
  // the workout-day selector must be locked during edit, and even a forced
  // change event must not wipe the logged sets
  assert.equal(document.querySelector('#workout-day-select').disabled, true, 'day select should be disabled in edit mode');
  setValue(document, '#workout-day-select', 'Τρίτη');
  assert.equal(document.querySelector('#scheduled-session .set-reps')?.value, '8', 'logged sets must not be wiped while still in edit mode');
  // cancelling the edit re-enables the selector
  click(document, '#cancel-session-edit');
  assert.equal(document.querySelector('#workout-day-select').disabled, false, 'day select should be re-enabled after edit ends');
});
