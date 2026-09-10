import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { migrateExercises, saveExercise, backupBeforeExerciseMigration } from '../modules/exercises.js';
import { buildProgressChartMarkup } from '../modules/progress-chart.js';
import { loadApp, click, setValue } from './helpers.mjs';

const fixture = () => ({
  routines:[{ id:'r', name:'Strength', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', plan:[
    { id:'p1', exercise:'Row', cycleDay:1, workoutName:'A', workSets:1, cues:'Cable' },
    { id:'p2', exercise:'Row', cycleDay:3, workoutName:'B', workSets:2, cues:'Slow' },
    { id:'p3', exercise:'row', cycleDay:3, workSets:3 },
    { id:'p4', exercise:'Rów', cycleDay:3, workSets:3 },
  ] }],
  sessions:[{ id:'s', routineId:'r', date:'2026-07-06', type:'scheduled', workoutName:'A', comments:'Keep', extra:'untouched', exercises:[
    { exercise:'Row', planExerciseId:'p1', comments:'Technique', sets:[{ reps:8, weight:45.5, weightMode:'kg', custom:'keep' }] },
  ] }, { id:'deleted', deletedAt:'2026-07-07T00:00:00.000Z' }],
});
const withoutRefs = sessions => sessions.map(session => session.exercises ? { ...session, exercises:session.exercises.map(({ exerciseId, ...rest }) => rest) } : session);
const submit = (document, selector) => document.querySelector(selector).dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));

test('library deletion cancels safely, removes all plan uses and progress, and preserves history across reload', async () => {
  const source = fixture();
  source.routines.push({ ...source.routines[0], id:'other', name:'Other', isActive:false });
  const app = loadApp({ trainingRoutines:source.routines, trainingSessions:source.sessions });
  const { document, localStorage } = app;
  const snapshot = () => Object.fromEntries(['trainingExercises', 'trainingRoutines', 'trainingSessions'].map(key => [key, JSON.parse(localStorage.getItem(key))]));
  try {
    const row = [...document.querySelectorAll('[data-edit-exercise]')].find(button => button.closest('.exercise-card').querySelector('strong').textContent === 'Row');
    const exerciseId = row.dataset.editExercise;
    if (row.closest('.exercise-card').dataset.carouselPosition !== '0') click(document, row);
    click(document, row);
    const before = snapshot();
    const remove = () => click(document, `[data-delete-library-exercise="${exerciseId}"]`);
    remove();
    assert.match(document.querySelector('#exercise-delete-message').textContent, /Row.*όλα τα προγράμματα.*επίβλεψη.*ιστορικό/);
    click(document, '#confirm-delete-cancel');
    assert.deepEqual(snapshot(), before);
    remove();
    click(document, '#confirm-delete-accept');
    assert.equal(document.querySelector(`[data-edit-exercise="${exerciseId}"]`), null);
    assert.equal(document.querySelector('#exercise-library-form').dataset.editingId, undefined);
    const after = snapshot();
    assert.ok(after.trainingExercises.find(item => item.id === exerciseId).deletedAt);
    assert.ok(after.trainingRoutines.every(routine => !routine.plan?.some(item => item.exerciseId === exerciseId)));
    assert.deepEqual(after.trainingSessions, before.trainingSessions);
    assert.ok(![...document.querySelectorAll('#progress-exercise option')].some(option => option.value === exerciseId));
    assert.doesNotMatch(document.querySelector('#personal-bests').textContent, /Row/);
    const reopened = loadApp(after);
    try {
      assert.equal(reopened.document.querySelector(`[data-edit-exercise="${exerciseId}"]`), null);
      assert.deepEqual(JSON.parse(reopened.localStorage.getItem('trainingSessions')), before.trainingSessions);
      assert.ok(![...reopened.document.querySelectorAll('#progress-exercise option')].some(option => option.value === exerciseId));
      assert.equal(reopened.document.querySelectorAll('[data-edit-exercise]').length, before.trainingExercises.length - 1);
    } finally { await new Promise(resolve => setTimeout(resolve, 0)); reopened.window.close(); }
  } finally { await new Promise(resolve => setTimeout(resolve, 0)); app.window.close(); }
});

test('deleted identity survives stale plans and history without hiding a live homonym', () => {
  const deleted = { id:'gone', deletedAt:'2026-09-10T12:00:00.000Z' };
  const sessions = [{ id:'s', exercises:[{ exerciseId:'gone', exercise:'Row', sets:[{ reps:8, weight:40 }] }] }];
  const migrated = migrateExercises({ exercises:[deleted, { id:'live', name:'Row', cues:'' }], sessions,
    routines:[{ id:'r', plan:[{ id:'a', exerciseId:'gone', exercise:'Row' }, { id:'b', exerciseId:'live', exercise:'Row' }] }] });
  assert.deepEqual(migrated.exercises[0], deleted);
  assert.deepEqual(migrated.sessions, sessions);
  assert.deepEqual(migrated.routines[0].plan.map(item => item.id), ['b']);
  assert.deepEqual(migrateExercises(migrated), migrated);
  assert.throws(() => saveExercise(migrated.exercises, { id:'gone', name:'Row' }), /Deleted exercise/);
});

test('a failed library deletion write preserves the card, plans and history', async () => {
  const app = loadApp({ trainingRoutines:fixture().routines, trainingSessions:fixture().sessions });
  try {
    const { document, localStorage, window } = app;
    const before = ['trainingExercises', 'trainingRoutines', 'trainingSessions'].map(key => localStorage.getItem(key));
    const button = document.querySelector('[data-carousel-position="0"] [data-delete-library-exercise]');
    const original = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function (key, value) {
      if (key === 'trainingExercises') throw new Error('Quota exceeded');
      return original.call(this, key, value);
    };
    click(document, button);
    click(document, '#confirm-delete-accept');
    assert.deepEqual(['trainingExercises', 'trainingRoutines', 'trainingSessions'].map(key => localStorage.getItem(key)), before);
    assert.ok(document.contains(button));
  } finally { await new Promise(resolve => setTimeout(resolve, 0)); app.window.close(); }
});

test('legacy notes and distinct plan cues migrate once without losing text or reviving cleared cues', () => {
  const source = fixture();
  source.exercises = [{ id:'row', name:'Row', notes:'Machine 1' }];
  const migrated = migrateExercises(source);
  assert.equal(migrated.exercises.find(entry => entry.id === 'row').cues, 'Machine 1\nCable\nSlow');
  assert.deepEqual(migrateExercises(migrated), migrated);
  const cleared = saveExercise(migrated.exercises, { id:'row', name:'Row', cues:'' });
  assert.equal(migrateExercises({ ...migrated, exercises:cleared }).exercises.find(entry => entry.id === 'row').cues, '');
  assert.deepEqual(withoutRefs(migrated.sessions), source.sessions);
});

test('exercise cues drive plan selection, editing, scheduled cards and reload', async () => {
  const app = loadApp({ trainingRoutines:fixture().routines });
  const { document, localStorage } = app;
  try {
    const row = [...document.querySelectorAll('[data-edit-exercise]')].find(button => button.closest('.exercise-card').querySelector('strong').textContent === 'Row');
    if (row.closest('.exercise-card').dataset.carouselPosition !== '0') click(document, row);
    click(document, row);
    const exerciseId = document.querySelector('#exercise-library-form').dataset.editingId;
    setValue(document, '#library-exercise-notes', 'Brace\nSlow lowering', 'input');
    submit(document, '#exercise-library-form');
    setValue(document, '#exercise-count', '1', 'input');
    setValue(document, '.builder-name', exerciseId);
    assert.equal(document.querySelector('.builder-cues').value, 'Brace\nSlow lowering');
    assert.equal(document.querySelector('.builder-cues').readOnly, true);
    assert.match(document.querySelector('#plan-list').textContent, /Brace\nSlow lowering/);
    setValue(document, '#log-date', '2026-07-06', 'input');
    setValue(document, '#workout-day-select', '1');
    assert.equal(document.querySelector('.cue-banner b').textContent, 'Brace\nSlow lowering');
    click(document, '[data-edit-day="1"]');
    assert.equal(document.querySelector('.builder-cues').value, 'Brace\nSlow lowering');
    const seed = Object.fromEntries(['trainingRoutines', 'trainingExercises'].map(key => [key, JSON.parse(localStorage.getItem(key))]));
    const reopened = loadApp(seed);
    assert.match(reopened.document.querySelector('#plan-list').textContent, /Brace\nSlow lowering/);
    await new Promise(resolve => setTimeout(resolve, 0));
    reopened.window.close();
  } finally {
    await new Promise(resolve => setTimeout(resolve, 0));
    app.window.close();
  }
});

test('plan sections start closed and toggle independently', async () => {
  const { window, document } = loadApp();
  for (const section of ['exercise-library-body', 'routine-manager-body']) {
    const button = document.querySelector(`[aria-controls="${section}"]`);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(document.getElementById(section).hidden, true);
    click(document, button);
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(document.getElementById(section).hidden, false);
    click(document, button);
    assert.equal(document.getElementById(section).hidden, true);
  }
  await new Promise(resolve => setTimeout(resolve, 0));
  window.close();
});

test('exercise carousel wraps, retains its selection on reopen and only focuses the centered card', async () => {
  const { window, document } = loadApp({ trainingRoutines:fixture().routines });
  const centered = () => document.querySelector('#exercise-library-list [data-carousel-position="0"]');
  click(document, '[aria-controls="exercise-library-body"]');
  const first = centered();
  click(document, '[data-exercise-scroll="1"]');
  const second = centered();
  assert.notEqual(second, first);
  assert.equal(first.querySelector('button').tabIndex, -1);
  assert.equal(second.querySelector('button').tabIndex, 0);
  click(document, '[aria-controls="exercise-library-body"]');
  click(document, '[aria-controls="exercise-library-body"]');
  assert.equal(centered(), second);
  click(document, '[data-exercise-scroll="-1"]');
  assert.equal(centered(), first);
  click(document, '[data-exercise-scroll="-1"]');
  assert.equal(centered(), document.querySelector('#exercise-library-list').lastElementChild);
  await new Promise(resolve => setTimeout(resolve, 0));
  window.close();
});

test('migration is deterministic, repeatable, additive and preserves tombstones and historical fields', () => {
  const source = fixture(), before = structuredClone(source);
  const result = migrateExercises(source);
  assert.deepEqual(source, before);
  assert.deepEqual(withoutRefs(result.sessions), source.sessions);
  assert.equal(result.exercises.length, 3, 'only exact legacy names are shared');
  assert.equal(result.routines[0].plan[0].exerciseId, result.routines[0].plan[1].exerciseId);
  assert.equal(result.sessions[0].exercises[0].exerciseId, result.routines[0].plan[0].exerciseId);
  assert.deepEqual(migrateExercises(result), result);
  assert.deepEqual(migrateExercises(source), result, 'two offline devices assign identical IDs');
});

test('explicit homonyms remain distinct; ambiguous history is not guessed', () => {
  const result = migrateExercises({ exercises:[{ id:'a', name:'Row' }, { id:'b', name:'Row' }], routines:[{ id:'r', plan:[
    { id:'p1', exercise:'Row', exerciseId:'a' }, { id:'p2', exercise:'Row', exerciseId:'b' },
  ] }], sessions:[{ routineId:'r', exercises:[{ exercise:'Row', planExerciseId:'p2' }, { exercise:'Row' }] }] });
  assert.equal(result.sessions[0].exercises[0].exerciseId, 'b');
  assert.notEqual(result.sessions[0].exercises[1].exerciseId, 'a');
  assert.notEqual(result.sessions[0].exercises[1].exerciseId, 'b');
  assert.deepEqual(migrateExercises(result), result);
  const legacy = migrateExercises({ sessions:[{ exercises:[{ exercise:'Row' }] }] });
  const withHomonym = migrateExercises({ exercises:[...legacy.exercises, { id:'custom-row', name:'Row' }], sessions:[{ exercises:[{ exercise:'Row' }] }] });
  assert.notEqual(withHomonym.sessions[0].exercises[0].exerciseId, legacy.exercises[0].id, 'an ambiguous fallback cannot collide with a known legacy identity');
  assert.equal(withHomonym.exercises.length, 3);
  assert.deepEqual(migrateExercises(withHomonym), withHomonym);
});

test('rename retains identity and aliases for stale snapshots without rewriting history', () => {
  const migrated = migrateExercises(fixture());
  const exerciseId = migrated.exercises[0].id;
  const renamed = saveExercise(migrated.exercises, { id:exerciseId, name:'Cable Row', notes:'Machine 1' });
  const result = migrateExercises({ ...fixture(), exercises:renamed });
  assert.equal(result.exercises.length, migrated.exercises.length);
  assert.equal(result.sessions[0].exercises[0].exerciseId, exerciseId);
  assert.equal(result.sessions[0].exercises[0].exercise, 'Row');
  assert.equal(result.exercises[0].name, 'Cable Row');
  assert.throws(() => saveExercise(renamed, { name:'  ' }));
  assert.throws(() => saveExercise(renamed, { id:'missing', name:'Row' }));
});

test('backup preserves exact raw data and migration stops writes when backup quota fails', async () => {
  const raw = ' [ { "id": "r", "name": "Original", "plan": [] } ] ';
  const values = new Map([['trainingRoutines', raw]]);
  const storage = { getItem:key => values.get(key) ?? null, setItem:(key, value) => values.set(key, value) };
  backupBeforeExerciseMigration(storage);
  assert.equal(JSON.parse(values.get('logbookExerciseMigrationBackup')).data.trainingRoutines, raw);
  values.set('trainingRoutines', '[]');
  backupBeforeExerciseMigration(storage);
  assert.equal(JSON.parse(values.get('logbookExerciseMigrationBackup')).data.trainingRoutines, raw);
  const seed = fixture();
  const app = loadApp({ trainingRoutines:seed.routines, trainingSessions:seed.sessions }, { beforeApp(window) {
    const original = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function(key, value) {
      if (key === 'logbookExerciseMigrationBackup') throw new Error('QuotaExceededError');
      return original.call(this, key, value);
    };
  } });
  assert.deepEqual(JSON.parse(app.localStorage.getItem('trainingRoutines')), seed.routines);
  assert.deepEqual(JSON.parse(app.localStorage.getItem('trainingSessions')), seed.sessions);
  assert.equal(app.localStorage.getItem('trainingExercises'), null);
  setValue(app.document, '#library-exercise-name', 'New', 'input');
  submit(app.document, '#exercise-library-form');
  assert.equal(app.localStorage.getItem('trainingExercises'), null);
  await new Promise(resolve => setTimeout(resolve, 0));
  app.window.close();
});

test('library create, rename, repeated plan selection and reload retain independent slot IDs', async () => {
  const { window, document, localStorage } = loadApp();
  setValue(document, '#library-exercise-name', 'Press', 'input');
  submit(document, '#exercise-library-form');
  const definition = JSON.parse(localStorage.getItem('trainingExercises'))[0];
  setValue(document, '#exercise-count', '2', 'input');
  setValue(document, '#workout-name', 'Push', 'input');
  document.querySelectorAll('.builder-name').forEach(select => { select.value = definition.id; });
  submit(document, '#plan-form');
  const plan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.equal(plan.length, 2);
  assert.notEqual(plan[0].id, plan[1].id);
  assert.equal(plan[0].exerciseId, plan[1].exerciseId);
  click(document, '[data-edit-exercise]');
  setValue(document, '#library-exercise-name', 'Bench Press', 'input');
  submit(document, '#exercise-library-form');
  assert.equal(JSON.parse(localStorage.getItem('trainingExercises'))[0].id, definition.id);
  assert.match(document.querySelector('#plan-list').textContent, /Bench Press/);
  const seed = Object.fromEntries(['trainingRoutines', 'trainingExercises'].map(key => [key, JSON.parse(localStorage.getItem(key))]));
  await new Promise(resolve => setTimeout(resolve, 0));
  window.close();
  const reopened = loadApp(seed);
  assert.equal(JSON.parse(reopened.localStorage.getItem('trainingExercises')).length, 1);
  assert.match(reopened.document.querySelector('#plan-list').textContent, /Bench Press/);
  await new Promise(resolve => setTimeout(resolve, 0));
  reopened.window.close();
});

test('progress separates homonyms and includes repeated occurrences on the same date', () => {
  const markup = buildProgressChartMarkup({ workout:{ sessions:[{ id:'s', date:'2026-07-06', exercises:[
    { exercise:'Row', exerciseId:'a', sets:[{ reps:8, weight:45 }] },
    { exercise:'Row', exerciseId:'a', sets:[{ reps:10, weight:50 }] },
    { exercise:'Row', exerciseId:'b', sets:[{ reps:2, weight:999 }] },
  ] }] }, exerciseKey:'a', setIndex:0 });
  assert.match(markup, /45 kg/);
  assert.match(markup, /50 kg/);
  assert.doesNotMatch(markup, /999/);
});

test('library-only payloads sync and merge renames from two snapshots by revision time', () => {
  const dom = new JSDOM('', { url:'http://localhost/', runScripts:'outside-only' });
  dom.window.eval(readFileSync(new URL('../data-reconciliation.js', import.meta.url), 'utf8'));
  dom.window.eval(readFileSync(new URL('../cloud-sync.js', import.meta.url), 'utf8'));
  const sync = dom.window.LogbookCloudSync;
  const remote = { trainingExercises:[{ id:'a', name:'Renamed', aliases:['Row'], updatedAt:'2026-09-05T12:00:00.000Z' }] };
  const local = { trainingExercises:[{ id:'a', name:'Row', updatedAt:'2026-09-01T12:00:00.000Z' }, { id:'b', name:'Row' }] };
  dom.window.localStorage.setItem('trainingExercises', JSON.stringify(remote.trainingExercises));
  assert.equal(sync.collectLocalPayload().trainingExercises[0].name, 'Renamed');
  const merged = sync.mergePayloads(remote, local);
  assert.equal(merged.trainingExercises.length, 2);
  assert.equal(merged.trainingExercises[0].name, 'Renamed');
  assert.equal(sync.mergePayloads(merged, {}).trainingExercises.length, 2);
  dom.window.close();
});

test('committing the count or date on blur preserves the newly focused fields', async () => {
  const source = fixture();
  const { window, document } = loadApp({ trainingRoutines:source.routines });
  setValue(document, '#exercise-count', '1', 'input');
  const nameField = document.querySelector('.builder-name');
  setValue(document, '#exercise-count', '1', 'change');
  assert.equal(document.querySelector('.builder-name'), nameField);
  setValue(document, '#log-date', '2026-07-06', 'input');
  setValue(document, '#workout-day-select', '1');
  const reps = document.querySelector('#scheduled-session .set-reps');
  reps.value = '8';
  setValue(document, '#log-date', '2026-07-06', 'change');
  assert.equal(document.querySelector('#scheduled-session .set-reps'), reps);
  assert.equal(reps.value, '8');
  await new Promise(resolve => setTimeout(resolve, 0));
  window.close();
});
