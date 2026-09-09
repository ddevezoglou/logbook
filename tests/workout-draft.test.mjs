import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, click, setValue } from './helpers.mjs';

function start(t, options) {
  const app = loadApp({}, options);
  t.after(() => app.window.close());
  click(app.document, '.nav-button[data-view="log"]');
  click(app.document, '[data-mode="free"]');
  return app;
}
const draft = app => JSON.parse(app.localStorage.getItem('logbookWorkoutDraft'));

test('three exercises persist synchronously without a timer or any closing event', t => {
  const app = start(t);
  for (let index = 0; index < 3; index += 1) {
    if (index) click(app.document, '#add-free-exercise');
    const prefix = `#free-exercises [data-exercise]:nth-child(${index + 1})`;
    setValue(app.document, `${prefix} .exercise-name`, `Exercise ${index + 1}`, 'input');
    setValue(app.document, `${prefix} .exercise-comments`, `Note ${index}`, 'input');
    for (let set = 0; set < 3; set += 1) {
      setValue(app.document, `${prefix} [data-set]:nth-child(${set + 1}) .set-reps`, String(10 + set), 'input');
      setValue(app.document, `${prefix} [data-set]:nth-child(${set + 1}) .set-weight`, String(20 + index + set / 2), 'input');
    }
  }
  setValue(app.document, '#session-comments', 'Last keystroke', 'input');
  const saved = draft(app);
  assert.equal(saved.cards.length, 3);
  assert.equal(saved.cards[2].sets[2].weight, '23');
  assert.equal(saved.comments, 'Last keystroke');
  const reopened = loadApp({ logbookWorkoutDraft:saved });
  t.after(() => reopened.window.close());
  assert.deepEqual(draft(reopened).cards, saved.cards);
  assert.equal(reopened.document.querySelector('#free-exercises').dataset.currentIndex, '2');
  assert.equal(reopened.document.querySelector('#session-comments').value, 'Last keystroke');
});

test('confirmed set removals and set copies are persisted in the same click', t => {
  const app = start(t);
  setValue(app.document, '#free-exercises .exercise-name', 'Press', 'input');
  setValue(app.document, '#free-exercises .set-reps', '8', 'input');
  setValue(app.document, '#free-exercises .set-weight', '30', 'input');
  click(app.document, '#free-exercises .copy-first-set');
  assert.ok(draft(app).cards[0].sets.every(set => set.reps === '8' && set.weight === '30'));
  click(app.document, '#free-exercises .remove-set');
  click(app.document, '#confirm-delete-accept');
  assert.equal(draft(app).cards[0].sets.length, 2);
});

test('a scheduled workout restores all three exercises, weight modes, date and notes', t => {
  const routine = { id:'routine', name:'Strength', isActive:true, cycleLength:1, usesWeekdays:false, cycleAnchorDate:'2026-07-29', plan:
    ['Press', 'Pull', 'Squat'].map((exercise, index) => ({ id:`plan-${index}`, cycleDay:1, exercise, workSets:3, workoutName:'Full body' })) };
  const app = loadApp({ trainingRoutines:[routine] });
  t.after(() => app.window.close());
  click(app.document, '.nav-button[data-view="log"]');
  setValue(app.document, '#log-date', '2026-07-29');
  for (let index = 0; index < 3; index += 1) {
    const card = `#scheduled-session [data-exercise]:nth-child(${index + 1})`;
    setValue(app.document, `${card} .exercise-comments`, `Scheduled note ${index}`, 'input');
    setValue(app.document, `${card} .set-reps`, String(8 + index), 'input');
    setValue(app.document, `${card} .weight-mode`, ['kg', 'bodyweight', 'plates'][index]);
    if (!index) setValue(app.document, `${card} .set-weight`, '32.5', 'input');
    if (index === 2) setValue(app.document, `${card} .set-plates`, '4', 'input');
  }
  const saved = draft(app);
  const reopened = loadApp({ trainingRoutines:[routine], logbookWorkoutDraft:saved });
  t.after(() => reopened.window.close());
  assert.equal(draft(reopened).mode, 'scheduled');
  assert.equal(reopened.document.querySelector('#log-date').value, '2026-07-29');
  assert.deepEqual(draft(reopened).cards, saved.cards);
});

test('a draft keeps the physical weight when the account changes units before reopening', t => {
  const app = start(t);
  setValue(app.document, '#free-exercises .exercise-name', 'Press', 'input');
  setValue(app.document, '#free-exercises .set-reps', '8', 'input');
  setValue(app.document, '#free-exercises .set-weight', '50', 'input');
  const reopened = loadApp({ logbookWorkoutDraft:draft(app), userProfile:{ weightUnit:'lbs' } });
  t.after(() => reopened.window.close());
  const pounds = Number(reopened.document.querySelector('#free-exercises .set-weight').value);
  assert.ok(Math.abs(pounds / 2.2046226218 - 50) < 0.01);
  assert.equal(draft(reopened).weightUnit, 'lbs');
});

test('notes survive reopening even before any exercise is added', t => {
  const app = loadApp();
  t.after(() => app.window.close());
  setValue(app.document, '#session-comments', 'Warm-up notes', 'input');
  const reopened = loadApp({ logbookWorkoutDraft:draft(app) });
  t.after(() => reopened.window.close());
  assert.equal(reopened.document.querySelector('#session-comments').value, 'Warm-up notes');
  assert.ok(reopened.document.querySelector('#log-view').classList.contains('active'));
});

test('storage failure is visible and a successful retry removes the warning', t => {
  const app = start(t);
  setValue(app.document, '#free-exercises .exercise-name', 'Press', 'input');
  const prototype = app.window.Storage.prototype;
  const original = prototype.setItem;
  prototype.setItem = function(key, value) {
    if (key === 'logbookWorkoutDraft') throw new app.window.DOMException('Full', 'QuotaExceededError');
    return original.call(this, key, value);
  };
  setValue(app.document, '#free-exercises .set-reps', '9', 'input');
  const status = app.document.querySelector('#workout-draft-status');
  assert.equal(status.hidden, false);
  assert.ok(status.classList.contains('draft-save-error'));
  assert.match(status.textContent, /Κρατήστε την εφαρμογή ανοιχτή/);
  prototype.setItem = original;
  setValue(app.document, '#free-exercises .set-reps', '10', 'input');
  assert.equal(draft(app).cards[0].sets[0].reps, '10');
  assert.equal(status.classList.contains('draft-save-error'), false);
});

test('session loss retains the draft for reauthentication without rewriting it as another owner', t => {
  const app = start(t, { beforeApp(window) { window.localStorage.setItem('logbookCloudOwner', 'user-a'); } });
  setValue(app.document, '#free-exercises .exercise-name', 'Private workout', 'input');
  const saved = draft(app);
  app.window.dispatchEvent(new app.window.CustomEvent('logbook:session-state', { detail:{ state:'unknown', userId:null } }));
  app.window.dispatchEvent(new app.window.Event('pagehide'));
  assert.deepEqual(draft(app), saved);
  const reopened = loadApp({ logbookWorkoutDraft:saved }, { beforeApp(window) { window.localStorage.setItem('logbookCloudOwner', 'user-a'); } });
  t.after(() => reopened.window.close());
  assert.equal(reopened.document.querySelector('#free-exercises .exercise-name').value, 'Private workout');
  app.localStorage.removeItem('logbookWorkoutDraft'); // Explicit sign-out cleanup.
  app.localStorage.setItem('logbookGuest', '1');
  app.window.dispatchEvent(new app.window.Event('pagehide'));
  assert.equal(draft(app), null, 'the old renderer cannot resurrect signed-out data');
});
