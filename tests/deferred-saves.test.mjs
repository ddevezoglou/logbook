import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, click, setValue } from './helpers.mjs';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const workout = (id, date) => ({ id, date, type:'free', comments:'original', exercises:[{ exercise:'Squat', sets:[{ reps:5, weight:50, weightMode:'kg' }] }] });
const remote = (app, key, value) => {
  app.localStorage.setItem(key, JSON.stringify(value));
  app.window.dispatchEvent(new app.window.CustomEvent('logbook:cloud-data-applied'));
};
const submit = (app, selector) => app.document.querySelector(selector).dispatchEvent(new app.window.Event('submit', { bubbles:true, cancelable:true }));
function draftWorkout(app) {
  click(app.document, '[data-mode="free"]');
  app.document.querySelector('#free-exercises .exercise-name').value = 'Squat';
  for (const row of app.document.querySelectorAll('#free-exercises [data-set]')) {
    row.querySelector('.set-reps').value = '8'; row.querySelector('.set-weight').value = '55';
  }
  app.document.querySelector('#log-date').value = '2026-08-03';
}

for (const change of ['add', 'edit', 'delete']) {
  test(`saving a workout with a deferred cloud ${change} preserves the latest history`, async () => {
    const app = loadApp({ trainingSessions:[workout('original', '2026-08-01')] });
    try {
      draftWorkout(app);
      const latest = JSON.parse(app.localStorage.getItem('trainingSessions'));
      if (change === 'add') latest.push(workout('remote-added', '2026-08-02'));
      if (change === 'edit') latest[0].comments = 'remote edit';
      if (change === 'delete') latest[0] = { id:'original', deletedAt:'2026-09-06T12:00:00.000Z' };
      remote(app, 'trainingSessions', latest);
      click(app.document, '#save-session');
      const saved = JSON.parse(app.localStorage.getItem('trainingSessions'));
      assert.ok(saved.some(item => item.date === '2026-08-03'));
      for (const entry of latest) assert.deepEqual(saved.find(item => item.id === entry.id), entry);
      click(app.document, '.nav-button[data-view="overview"]');
      assert.equal(app.document.querySelector('#history-session-count').textContent, change === 'add' ? '3' : change === 'delete' ? '1' : '2');
    } finally { await tick(); app.window.close(); }
  });
}

test('editing a remotely deleted workout preserves its tombstone and keeps the draft', async () => {
  const app = loadApp({ trainingSessions:[workout('original', '2026-08-01')] });
  try {
    click(app.document, '[data-edit-session="original"]');
    app.document.querySelector('#session-comments').value = 'local edit';
    const deleted = { id:'original', deletedAt:'2026-09-06T12:00:00.000Z' };
    remote(app, 'trainingSessions', [deleted]);
    click(app.document, '#save-session');
    assert.deepEqual(JSON.parse(app.localStorage.getItem('trainingSessions')), [deleted]);
    assert.equal(app.document.querySelector('#session-comments').value, 'local edit');
    assert.match(app.document.querySelector('#toast').textContent, /διαγραφεί σε άλλη συσκευή/);
  } finally { await tick(); app.window.close(); }
});

test('a remote workout on the draft date prevents a duplicate local save', async () => {
  const app = loadApp();
  try {
    draftWorkout(app);
    const latest = [workout('remote-same-date', '2026-08-03')];
    remote(app, 'trainingSessions', latest);
    click(app.document, '#save-session');
    assert.deepEqual(JSON.parse(app.localStorage.getItem('trainingSessions')), latest);
    assert.match(app.document.querySelector('#toast').textContent, /ήδη καταγεγραμμένη/);
    assert.equal(app.document.querySelector('#free-exercises .set-reps').value, '8');
  } finally { await tick(); app.window.close(); }
});

const routine = (id, name) => ({ id, name, isActive:id === 'r1', isPlaceholder:false, cycleLength:7, cycleAnchorDate:'2026-08-03', usesWeekdays:false,
  plan:[{ id:`${id}-p1`, cycleDay:1, workoutName:'Day one', exercise:'Squat', workSets:3 }, { id:`${id}-p2`, cycleDay:2, workoutName:'Day two', exercise:'Row', workSets:3 }] });

test('creating a routine with a deferred update preserves remote routine additions and edits', async () => {
  const app = loadApp({ trainingRoutines:[routine('r1', 'Original')] });
  try {
    setValue(app.document, '#routine-name', 'Local new', 'input');
    const latest = JSON.parse(app.localStorage.getItem('trainingRoutines'));
    latest[0].name = 'Remote rename'; latest.push(routine('remote', 'Remote new'));
    remote(app, 'trainingRoutines', latest);
    submit(app, '#routine-form');
    const saved = JSON.parse(app.localStorage.getItem('trainingRoutines'));
    assert.equal(saved.find(item => item.id === 'r1').name, 'Remote rename');
    assert.ok(saved.some(item => item.id === 'remote'));
    assert.ok(saved.some(item => item.name === 'Local new'));
  } finally { await tick(); app.window.close(); }
});

test('activating a routine during deferred remote activation keeps exactly one active routine', async () => {
  const app = loadApp({ trainingRoutines:[routine('r1', 'First'), routine('r2', 'Second')] });
  try {
    app.document.querySelector('#session-comments').value = 'Draft';
    const latest = JSON.parse(app.localStorage.getItem('trainingRoutines'));
    latest[0].isActive = false;
    latest.push({ ...routine('r3', 'Remote new'), isActive:true });
    remote(app, 'trainingRoutines', latest);
    click(app.document, '[data-activate-routine="r2"]');
    const saved = JSON.parse(app.localStorage.getItem('trainingRoutines'));
    assert.deepEqual(saved.filter(item => item.isActive).map(item => item.id), ['r2']);
    assert.ok(saved.some(item => item.id === 'r3'));
  } finally { await tick(); app.window.close(); }
});

test('saving one plan day preserves a remote edit to another day of the same routine', async () => {
  const app = loadApp({ trainingRoutines:[routine('r1', 'Original')] });
  try {
    click(app.document, '[data-view-routine="r1"]');
    click(app.document, '[data-edit-day="1"]');
    setValue(app.document, '#workout-name', 'Local day one', 'input');
    const latest = JSON.parse(app.localStorage.getItem('trainingRoutines'));
    latest[0].plan.find(item => item.cycleDay === 2).workoutName = 'Remote day two';
    remote(app, 'trainingRoutines', latest);
    submit(app, '#plan-form');
    const saved = JSON.parse(app.localStorage.getItem('trainingRoutines'))[0];
    assert.equal(saved.plan.find(item => item.cycleDay === 1).workoutName, 'Local day one');
    assert.equal(saved.plan.find(item => item.cycleDay === 2).workoutName, 'Remote day two');
  } finally { await tick(); app.window.close(); }
});

test('a deleted routine cannot be resurrected by saving an open plan day', async () => {
  const app = loadApp({ trainingRoutines:[routine('r1', 'Original'), routine('r2', 'Other')] });
  try {
    click(app.document, '[data-view-routine="r1"]');
    click(app.document, '[data-edit-day="1"]');
    setValue(app.document, '#workout-name', 'Local day one', 'input');
    const latest = JSON.parse(app.localStorage.getItem('trainingRoutines'));
    latest[0] = { id:'r1', deletedAt:'2026-09-06T12:00:00.000Z' }; latest[1].isActive = true;
    remote(app, 'trainingRoutines', latest);
    submit(app, '#plan-form');
    assert.deepEqual(JSON.parse(app.localStorage.getItem('trainingRoutines')), latest);
    assert.equal(app.document.querySelector('#workout-name').value, 'Local day one');
    assert.match(app.document.querySelector('#toast').textContent, /διαγραφεί σε άλλη συσκευή/);
  } finally { await tick(); app.window.close(); }
});

test('saving a profile name preserves a remote change to a different profile field', async () => {
  const app = loadApp({ userProfile:{ name:'Original', birthdate:'1990-01-01', weightUnit:'kg', avatar:'male', customImage:'' } });
  try {
    setValue(app.document, '#profile-name', 'Local name', 'input');
    const latest = JSON.parse(app.localStorage.getItem('userProfile')); latest.birthdate = '1991-02-02';
    remote(app, 'userProfile', latest);
    submit(app, '#profile-form');
    const saved = JSON.parse(app.localStorage.getItem('userProfile'));
    assert.equal(saved.name, 'Local name'); assert.equal(saved.birthdate, '1991-02-02');
    assert.equal(app.document.querySelector('#profile-birthdate').value, '1991-02-02');
    assert.equal(app.document.querySelector('#profile-form').dataset.dirty, 'false');
    submit(app, '#profile-form');
    assert.equal(JSON.parse(app.localStorage.getItem('userProfile')).birthdate, '1991-02-02');
  } finally { await tick(); app.window.close(); }
});
