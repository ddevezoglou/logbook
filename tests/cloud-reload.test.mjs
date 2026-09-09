import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualConsole } from 'jsdom';
import { loadApp, click } from './helpers.mjs';

// Cloud changes refresh the current page without replaying authentication;
// unfinished forms defer the refresh until safe navigation.
// jsdom's location.reload is unpatchable (non-writable own property), but every
// call surfaces as a "Not implemented: navigation" jsdomError — count those.

function loadAppWithReloadSpy(seed = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  const reloads = { count: 0 };
  virtualConsole.on('jsdomError', error => {
    if (String(error.message).includes('navigation')) reloads.count += 1;
  });
  return { ...loadApp(seed, { virtualConsole }), reloads };
}

test('cloud data refreshes the current screen without reloading or losing the active view', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();
  click(document, '.nav-button[data-view="progress"]');
  window.localStorage.setItem('trainingSessions', JSON.stringify([
    { id:'remote-1', date:'2026-09-01', type:'free', exercises:[{ exercise:'Squat', sets:[{ reps:8, weight:50, weightMode:'kg' }] }] },
    { id:'remote-2', date:'2026-09-02', type:'free', exercises:[{ exercise:'Squat', sets:[{ reps:8, weight:55, weightMode:'kg' }] }] },
  ]));
  window.localStorage.setItem('userProfile', JSON.stringify({ name:'Remote athlete', weightUnit:'lbs' }));
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(reloads.count, 0);
  assert.equal(window.location.hash, '#progress');
  assert.ok(document.querySelector('#progress-view').classList.contains('active'));
  assert.equal(document.querySelectorAll('#progress-panel .chart-point').length, 2);
  assert.equal(document.querySelector('#profile-name').value, 'Remote athlete');
  assert.ok(document.querySelector('#progress-panel').textContent.includes('lb'));
  assert.equal(document.querySelector('#history-session-count').textContent, '2');
});

test('opening an exercise is pristine and accepts a background refresh without a false conflict', () => {
  const exercise = { id:'row', name:'Row', cues:'Cable', aliases:[], updatedAt:'2026-09-01T08:00:00.000Z' };
  const { window, document, localStorage } = loadAppWithReloadSpy({ trainingExercises:[exercise] });
  try {
    click(document, '[data-edit-exercise="row"]');
    assert.equal(document.querySelector('#exercise-library-form').dataset.dirty, 'false');

    localStorage.setItem('trainingExercises', JSON.stringify([{
      ...exercise,
      name:'Seated Row',
      cues:'Chest supported',
      updatedAt:'2026-09-02T08:00:00.000Z',
    }]));
    window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));

    assert.equal(document.querySelector('#library-exercise-name').value, 'Seated Row');
    assert.equal(document.querySelector('#library-exercise-notes').value, 'Chest supported');
    assert.equal(document.querySelector('#exercise-library-form').dataset.dirty, 'false');
    assert.notEqual(document.querySelector('#toast').textContent, 'Ήρθαν αλλαγές από άλλη συσκευή. Θα εφαρμοστούν μόλις αποθηκεύσετε.');
  } finally {
    window.close();
  }
});

test('history selection survives a background cloud refresh', () => {
  const workout = { id:'session-1', date:'2026-09-01', type:'free', exercises:[{ exercise:'Row', sets:[{ reps:8, weight:50 }] }] };
  const { window, document } = loadAppWithReloadSpy({ trainingSessions:[workout] });
  try {
    const checkbox = document.querySelector('[data-select-session="session-1"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new window.Event('change', { bubbles:true }));
    assert.ok(checkbox.closest('.session-card').classList.contains('session-selected'));

    window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));

    const refreshed = document.querySelector('[data-select-session="session-1"]');
    assert.equal(refreshed.checked, true);
    assert.ok(refreshed.closest('.session-card').classList.contains('session-selected'));
  } finally {
    window.close();
  }
});

test('progress keeps its horizontal position through a background cloud refresh', () => {
  const sessions = Array.from({ length:13 }, (_, index) => ({
    id:`session-${index}`,
    date:`2026-08-${String(index + 1).padStart(2, '0')}`,
    type:'free',
    exercises:[{ exercise:'Squat', sets:[{ reps:8, weight:50 + index, weightMode:'kg' }] }],
  }));
  const { window, document } = loadAppWithReloadSpy({ trainingSessions:sessions });
  try {
    click(document, '.nav-button[data-view="progress"]');
    Object.defineProperties(window.HTMLElement.prototype, {
      scrollWidth:{ configurable:true, get() { return this.matches?.('.chart-wrap.is-scrollable') ? 1000 : 0; } },
      clientWidth:{ configurable:true, get() { return this.matches?.('.chart-wrap.is-scrollable') ? 300 : 0; } },
    });
    const wrap = document.querySelector('#progress-panel .chart-wrap.is-scrollable');
    wrap.scrollLeft = 700;

    window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));

    assert.equal(document.querySelector('#progress-panel .chart-wrap.is-scrollable').scrollLeft, 700);
  } finally {
    window.close();
  }
});

test('cloud data applied while choosing exercises in a new plan day defers refresh', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();
  document.querySelector('#plan-workout-dialog').showModal();
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(reloads.count, 0);
});

test('cloud data applied with unsaved work defers refresh and applies it on safe navigation', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();

  document.querySelector('#session-comments').value = 'Μισογραμμένη προπόνηση';
  window.localStorage.setItem('userProfile', JSON.stringify({ name:'Remote athlete' }));
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));

  assert.equal(reloads.count, 0);
  assert.equal(document.querySelector('#session-comments').value, 'Μισογραμμένη προπόνηση');
  assert.equal(document.querySelector('#profile-name').value, '');
  const toast = document.querySelector('#toast');
  assert.ok(toast.classList.contains('show'));
  assert.equal(toast.textContent, 'Ήρθαν αλλαγές από άλλη συσκευή. Θα εφαρμοστούν μόλις αποθηκεύσετε.');

  // Discarding the draft allows a refresh and the requested navigation together.
  document.querySelector('#session-comments').value = '';
  click(document, '.nav-button[data-view="plan"]');
  assert.equal(reloads.count, 0);
  assert.equal(document.querySelector('#profile-name').value, 'Remote athlete');
  assert.ok(document.querySelector('#plan-view').classList.contains('active'));
});

test('a routine draft in the plan form also blocks the cloud refresh', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();

  document.querySelector('#workout-name').value = 'Push A';
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(reloads.count, 0);
});

test('cloud deletion removes history without reviving legacy logs or causing repeated sync writes', () => {
  const { window, document, localStorage, reloads } = loadAppWithReloadSpy({
    trainingLogs:[{ id:'legacy', date:'2026-09-01', exercise:'Squat', sets:[{ reps:5, weight:50 }] }],
    trainingSessions:[{ id:'session', date:'2026-09-02', type:'free', exercises:[{ exercise:'Squat', sets:[{ reps:5, weight:55 }] }] }],
  });
  const tombstone = { id:'session', deletedAt:'2026-09-03T08:00:00Z' };
  localStorage.setItem('trainingSessions', JSON.stringify([tombstone]));
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(document.querySelector('#history-session-count').textContent, '0');
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), [tombstone]);
  const writes = [];
  window.addEventListener('logbook:local-data-changed', event => writes.push(event.detail.key));
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.deepEqual(writes, []);
  assert.equal(reloads.count, 0);
});

test('cloud refresh keeps the selected scheduled exercise, including after plan reordering', () => {
  const { window, document, localStorage } = loadAppWithReloadSpy({
    trainingRoutines:[{
      id:'r1', name:'Push', isActive:true, usesWeekdays:false, cycleLength:7,
      plan:[1, 2, 3].map(number => ({ id:`p${number}`, cycleDay:1, workoutName:'Push', exercise:`Exercise ${number}`, workSets:3 })),
    }],
  });
  try {
    click(document, '.nav-button[data-view="log"]');
    click(document, '#scheduled-session .deck-arrow-next');
    const activeCard = () => document.querySelector('#scheduled-session [data-exercise]:not([inert])');
    assert.equal(activeCard().dataset.planExerciseId, 'p2');
    const originalCard = activeCard();
    const weightInput = originalCard.querySelector('.set-weight');
    weightInput.focus();

    window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
    assert.equal(activeCard(), originalCard, 'unchanged workout cards must not be recreated and replay their animations');
    assert.equal(document.activeElement, weightInput, 'background sync must keep focus in an empty workout field');
    assert.equal(activeCard().dataset.planExerciseId, 'p2');
    assert.equal(document.querySelector('#scheduled-session .deck-stamp').textContent, 'ΑΣΚΗΣΗ 02 / 03');

    const routines = JSON.parse(localStorage.getItem('trainingRoutines'));
    routines[0].plan.unshift(routines[0].plan.pop());
    localStorage.setItem('trainingRoutines', JSON.stringify(routines));
    window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
    assert.equal(activeCard().dataset.planExerciseId, 'p2');
    assert.equal(document.querySelector('#scheduled-session .deck-stamp').textContent, 'ΑΣΚΗΣΗ 03 / 03');

    routines[0].plan = routines[0].plan.filter(item => item.id !== 'p2');
    localStorage.setItem('trainingRoutines', JSON.stringify(routines));
    window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
    assert.equal(activeCard().dataset.planExerciseId, 'p3');
  } finally {
    window.close();
  }
});

test('a dirty profile form blocks the cloud refresh until it is saved', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();

  const nameInput = document.querySelector('#profile-name');
  nameInput.value = 'Δημήτρης';
  nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#profile-form').dataset.dirty, 'true');

  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(reloads.count, 0);
});
