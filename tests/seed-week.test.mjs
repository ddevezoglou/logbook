import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadApp, click } from './helpers.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedSource = readFileSync(join(root, 'tests', 'fixtures', 'seed-week.js'), 'utf8');

// Runs the shared fixture in a browser-like storage context and returns
// the data it produced. The fixture skips only its final browser reload in jsdom.
function runSeed() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
  dom.window.__LOGBOOK_SEED_SKIP_RELOAD__ = true;
  dom.window.eval(seedSource);
  return {
    routines: JSON.parse(dom.window.localStorage.getItem('trainingRoutines')),
    sessions: JSON.parse(dom.window.localStorage.getItem('trainingSessions')),
  };
}

const planOffsets = [0, 1, 3, 4]; // Δευτέρα, Τρίτη, Πέμπτη, Παρασκευή
const pastWeeks = 13;
const todayOffset = (new Date().getDay() + 6) % 7;
const expectedThisWeek = planOffsets.filter(offset => offset <= todayOffset).length;

test('seed fixture produces one active routine plus 8/9/10-day examples and thirteen full previous weeks of logs', () => {
  const { routines, sessions } = runSeed();
  assert.equal(routines.length, 4);
  assert.ok(routines[0].isActive);
  assert.deepEqual(routines.map(routine => routine.cycleLength), [7, 8, 9, 10]);
  assert.deepEqual(routines.map(routine => routine.usesWeekdays), [true, false, true, false]);
  assert.deepEqual(routines.map(routine => routine.isActive), [true, false, false, false]);
  routines.forEach(routine => {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(routine.cycleAnchorDate));
    assert.ok(routine.plan.every(item => item.cycleDay >= 1 && item.cycleDay <= routine.cycleLength));
  });
  for (const routine of routines.slice(1)) {
    assert.ok(routine.plan.some(item => item.cycleDay > 7), `${routine.cycleLength}-day routine must exercise a slot after day 7`);
  }
  assert.equal(new Set(routines[0].plan.map(item => item.day)).size, 4);
  routines[0].plan.forEach(item => assert.ok(item.id && item.exercise && item.workoutName));
  assert.equal(sessions.length, planOffsets.length * pastWeeks + expectedThisWeek);
  sessions.forEach(session => {
    assert.equal(session.type, 'scheduled');
    assert.equal(session.routineId, routines[0].id);
    assert.ok(session.cycleDay >= 1 && session.cycleDay <= 7);
    assert.ok(session.exercises.length >= 3);
    session.exercises.forEach(exercise => {
      assert.ok(routines[0].plan.some(item => item.id === exercise.planExerciseId), `${exercise.exercise} must link to a plan exercise`);
      exercise.sets.forEach(set => assert.ok(Number(set.reps) > 0));
    });
  });
  const modes = new Set(sessions.flatMap(session => session.exercises.flatMap(exercise => exercise.sets.map(set => set.weightMode))));
  for (const mode of ['kg', 'plates', 'bodyweight', 'bodyweight_extra']) assert.ok(modes.has(mode), `seed must exercise weight mode ${mode}`);
});

test('seeded history rewards only a workout recorded today', () => {
  const { routines, sessions } = runSeed();
  const { document } = loadApp({
    trainingRoutines: routines,
    trainingSessions: sessions,
    userProfile: { name: 'Δημήτρης', birthdate: '1990-01-01', weight: 80, weightUnit: 'kg', avatar: 'male', customImage: '' },
  });
  assert.equal(document.querySelector('#profile-reward-ring'), null);
  assert.equal(document.querySelector('#home-reward-stamp'), null);
  assert.equal(document.querySelector('#home-profile-card'), null);
  assert.equal(document.querySelector('#home-rest-stamp').classList.contains('hidden'), !planOffsets.includes(todayOffset));
});

test('seeded data feeds the overview, progress personal bests and plan board', () => {
  const { routines, sessions } = runSeed();
  const { document } = loadApp({ trainingRoutines: routines, trainingSessions: sessions });
  assert.equal(document.querySelector('#plan-count').textContent, '4/7 ημέρες');
  assert.equal(document.querySelectorAll('#session-cards .session-card').length, 30);
  assert.ok(document.querySelector('[data-load-more-history]'), 'the remaining seeded history is windowed behind the load-more control');
  click(document, '.nav-button[data-view="progress"]');
  const bests = document.querySelector('#personal-bests').textContent;
  assert.ok(document.querySelector('#progress-view #personal-bests'), 'personal bests live in progress');
  for (const exercise of ['Bench Press', 'Deadlift', 'Pull-ups', 'Leg Press']) assert.ok(bests.includes(exercise), `personal bests must include ${exercise}`);
});
