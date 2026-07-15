import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadApp, click, setValue } from './helpers.mjs';

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

const routineWith = plan => [{ id: 'r1', name: 'Test Routine', isActive: true, plan }];
const planDay = (day, exercise, extra = {}) => ({ id: `p-${day}-${exercise}`, day, workoutName: `${day} Workout`, exercise, workSets: 3, cues: '', ...extra });
const rewardDays = ['Δευτέρα', 'Τετάρτη', 'Παρασκευή'];
const rewardPlan = () => rewardDays.map(day => planDay(day, `${day} Exercise`));
const rewardDate = (weekOffset, dayOffset = 0) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + weekOffset * 7 + dayOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const rewardSessions = (weekOffsets, routineId = 'r1') => weekOffsets.flatMap(weekOffset => rewardDays.map((day, index) => ({
  id:`${routineId}-${weekOffset}-${index}`,
  date:rewardDate(weekOffset, index * 2),
  type:'scheduled', routineId, workoutDay:day, workoutName:`${day} Workout`, comments:'',
  exercises:[{ exercise:`${day} Exercise`, comments:'', sets:[{ reps:8, weight:50, weightMode:'kg' }] }],
})));

test('boots with empty storage without throwing', () => {
  const { document } = loadApp();
  assert.ok(document.querySelector('#home-view').classList.contains('active'));
  assert.equal(document.querySelector('.nav-button.active').dataset.view, 'home');
  assert.ok(document.querySelector('#daily-quote-text').textContent.length > 20);
  assert.ok(document.querySelector('#plan-list').innerHTML.includes('Δευτέρα'));
  assert.equal(document.querySelector('.app-version b').textContent, '0.1.0');
  assert.ok(document.querySelector('#home-profile-card').classList.contains('hidden'));
  assert.equal(document.querySelector('.home-pageno').textContent, 'PAGE 001');
});

test('home shows the saved profile card and opens the workout log', () => {
  const { document } = loadApp({ userProfile: { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' } });
  assert.equal(document.querySelector('#home-profile-name').textContent, 'Δημήτρης');
  assert.ok(!document.querySelector('#home-profile-card').classList.contains('hidden'));
  click(document, '[data-home-action="log"]');
  assert.ok(document.querySelector('#log-view').classList.contains('active'));
});

test('home shows the active routine as a movable program ticket', () => {
  const routines = [{
    id:'r-ticket', name:'Golden Push Pull', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:true,
    plan:[planDay('Δευτέρα', 'Bench Press', { cycleDay:1, workoutName:'Push Day' }), planDay('Τετάρτη', 'Row', { cycleDay:3, workoutName:'Pull Day' })],
  }];
  const { document } = loadApp({ trainingRoutines:routines });
  const card = document.querySelector('#home-routine-card');
  assert.ok(!card.classList.contains('hidden'));
  assert.equal(document.querySelector('#home-routine-name').textContent, 'Golden Push Pull');
  assert.equal(document.querySelector('.home-routine-head').textContent.trim(), 'ΠΡΟΓΡΑΜΜΑ');
  assert.equal(document.querySelector('#home-routine-cycle'), null);
  assert.deepEqual([...document.querySelectorAll('#home-routine-days strong')].map(node => node.textContent), ['Push Day', 'Pull Day']);
  assert.deepEqual([...document.querySelectorAll('#home-routine-days small')].map(node => node.textContent), ['Δευτέρα', 'Τετάρτη']);
  assert.doesNotMatch(card.textContent, /ACTIVE PROGRAM|DAYS|Ημέρα 1|ασκήσεις/);
  click(document, '.home-routine-open');
  assert.ok(document.querySelector('#plan-view').classList.contains('active'));
});

test('home program ticket omits weekday metadata when weekdays are not declared', () => {
  const routines = [{
    id:'r-floating', name:'Floating Rotation', isActive:true, cycleLength:8, cycleAnchorDate:'2026-07-06', usesWeekdays:false,
    plan:[planDay(null, 'Squat', { cycleDay:1, workoutName:'Lower A' })],
  }];
  const { document } = loadApp({ trainingRoutines:routines });
  assert.equal(document.querySelector('#home-routine-days strong').textContent, 'Lower A');
  assert.equal(document.querySelector('#home-routine-days small'), null);
});

test('program manager cards keep the routine name readable in the ticket layout', () => {
  const { window, document } = loadApp({ trainingRoutines:[{
    id:'r-readable', name:'Readable Routine Name', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:false, plan:[],
  }] });
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.append(style);
  const card = document.querySelector('#routine-list .routine-card');
  const name = card.querySelector('.routine-select strong');
  assert.equal(name.textContent, 'Readable Routine Name');
  assert.equal(window.getComputedStyle(card).display, 'flex', 'the ticket card must not use the legacy two-column grid');
  assert.equal(window.getComputedStyle(name).whiteSpace, 'normal', 'the full name can use the card width instead of a 30px grid column');
  assert.equal(window.getComputedStyle(card.querySelector('.routine-foot')).display, 'flex', 'metadata and actions stay in the ticket footer');
});

test('home routine ticket drag stays bounded and persists independently', () => {
  const { document, localStorage } = loadApp();
  const shell = document.querySelector('.home-shell');
  const card = document.querySelector('#home-routine-card');
  Object.defineProperties(shell, { clientWidth:{ value:1000 }, scrollHeight:{ value:1400 } });
  Object.defineProperties(card, { offsetWidth:{ value:300 }, offsetHeight:{ value:320 } });
  const pointer = (type, x, y) => {
    const event = new document.defaultView.Event(type, { bubbles:true, cancelable:true });
    Object.defineProperties(event, { pointerId:{ value:2 }, button:{ value:0 }, clientX:{ value:x }, clientY:{ value:y } });
    card.dispatchEvent(event);
  };
  pointer('pointerdown', 40, 40);
  pointer('pointermove', 5000, 5000);
  pointer('pointerup', 5000, 5000);
  assert.deepEqual(JSON.parse(localStorage.getItem('homeRoutineCardPosition')), { x:1, y:1 });
  assert.equal(localStorage.getItem('homeProfileCardPosition'), null);
});

test('home athlete card drag stays bounded and persists its relative position', () => {
  const { document, localStorage } = loadApp({ userProfile: { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' } });
  const shell = document.querySelector('.home-shell');
  const card = document.querySelector('#home-profile-card');
  Object.defineProperties(shell, { clientWidth:{ value:1000 }, scrollHeight:{ value:1400 } });
  Object.defineProperties(card, { offsetWidth:{ value:250 }, offsetHeight:{ value:160 } });
  const pointer = (type, x, y) => {
    const event = new document.defaultView.Event(type, { bubbles:true, cancelable:true });
    Object.defineProperties(event, { pointerId:{ value:1 }, button:{ value:0 }, clientX:{ value:x }, clientY:{ value:y } });
    card.dispatchEvent(event);
  };
  pointer('pointerdown', 50, 50);
  pointer('pointermove', 5000, 5000);
  pointer('pointerup', 5000, 5000);
  const position = JSON.parse(localStorage.getItem('homeProfileCardPosition'));
  assert.deepEqual(position, { x:1, y:1 });
});

test('home page number counts unique logged days plus one', () => {
  const mk = (id, date) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg', plates: null }] }] });
  const { document } = loadApp({ trainingSessions: [mk('s1', '2026-07-01'), mk('s2', '2026-07-01'), mk('s3', '2026-07-08')] });
  assert.equal(document.querySelector('.home-pageno').textContent, 'PAGE 003');
});

test('home quick navigation buttons open the plan and history views', () => {
  const { document } = loadApp();
  click(document, '[data-home-action="plan"]');
  assert.ok(document.querySelector('#plan-view').classList.contains('active'));
  click(document, '[data-home-action="overview"]');
  assert.ok(document.querySelector('#overview-view').classList.contains('active'));
});

test('arrow keys move the home athlete card within bounds and persist the position', () => {
  const { document, window, localStorage } = loadApp({ userProfile: { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' } });
  const shell = document.querySelector('.home-shell');
  const card = document.querySelector('#home-profile-card');
  Object.defineProperties(shell, { clientWidth:{ value:1000 }, scrollHeight:{ value:1400 } });
  Object.defineProperties(card, { offsetWidth:{ value:250 }, offsetHeight:{ value:160 } });
  const key = (name, shiftKey = false) => card.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true }));
  key('ArrowRight');
  key('ArrowDown', true);
  let position = JSON.parse(localStorage.getItem('homeProfileCardPosition'));
  assert.ok(Math.abs(position.x - 8 / 750) < 1e-9, 'plain arrow should move 8px on a 750px range');
  assert.ok(Math.abs(position.y - 30 / 1240) < 1e-9, 'shift+arrow should move 30px on a 1240px range');
  key('ArrowLeft');
  key('ArrowLeft');
  key('ArrowUp', true);
  position = JSON.parse(localStorage.getItem('homeProfileCardPosition'));
  assert.deepEqual(position, { x: 0, y: 0 }, 'movement past the top-left corner must clamp to 0');
});

test('corrupted saved card position is ignored and replaced by a valid one', () => {
  const { document, window, localStorage } = loadApp({
    userProfile: { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' },
    homeProfileCardPosition: [0.5, 0.5],
  });
  const card = document.querySelector('#home-profile-card');
  assert.ok(!card.classList.contains('hidden'), 'boot with a corrupted position must not hide or break the card');
  Object.defineProperties(document.querySelector('.home-shell'), { clientWidth:{ value:1000 }, scrollHeight:{ value:1400 } });
  Object.defineProperties(card, { offsetWidth:{ value:250 }, offsetHeight:{ value:160 } });
  card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  const position = JSON.parse(localStorage.getItem('homeProfileCardPosition'));
  assert.ok(!Array.isArray(position) && Number.isFinite(position.x) && Number.isFinite(position.y));
});

test('daily quote remains English when the interface language changes', () => {
  const { document } = loadApp();
  const quote = document.querySelector('#daily-quote-text').textContent;
  click(document, '[data-language="fr"]');
  assert.equal(document.querySelector('#daily-quote-text').textContent, quote);
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

test('creating a routine persists a microcycle length and assigns its anchor internally', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#routine-name', 'Eight Day Rotation', 'input');
  setValue(document, '#routine-cycle-length', '8', 'input');
  document.querySelector('#routine-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const routine = JSON.parse(localStorage.getItem('trainingRoutines')).at(-1);
  assert.equal(routine.cycleLength, 8);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(routine.cycleAnchorDate));
  assert.equal(document.querySelector('#routine-cycle-anchor'), null);
  assert.equal(document.querySelectorAll('#plan-list .day-card').length, 8);
});

test('a new circular routine can omit weekday names', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#routine-name', 'Floating Pull Push', 'input');
  setValue(document, '#routine-cycle-length', '8', 'input');
  document.querySelector('#routine-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const routine = JSON.parse(localStorage.getItem('trainingRoutines')).at(-1);
  assert.equal(routine.usesWeekdays, false);
  assert.equal(document.querySelector('#plan-day-label').textContent, 'Σειρά στον μικρόκυκλο');
  assert.equal(document.querySelector('#plan-day option').textContent, 'Ημέρα 1');
  assert.equal(document.querySelector('#plan-list .day-card h3').textContent, 'Ημέρα 1');
});

test('weekday display can be explicitly enabled when creating a routine', () => {
  const { document, localStorage } = loadApp();
  const enabled = document.querySelector('#routine-form input[name="routine-weekdays"][value="true"]');
  enabled.checked = true;
  setValue(document, '#routine-name', 'Calendar Rotation', 'input');
  document.querySelector('#routine-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const routine = JSON.parse(localStorage.getItem('trainingRoutines')).at(-1);
  assert.equal(routine.usesWeekdays, true);
  assert.equal(document.querySelector('#plan-day-label').textContent, 'Ημέρα μικρόκυκλου');
  assert.ok(document.querySelector('#plan-day option').textContent.includes('Δευτέρα'));
});

test('legacy weekly routines migrate to seven stable cycle slots', () => {
  const legacy = routineWith([planDay('Δευτέρα', 'Bench Press'), planDay('Κυριακή', 'Deadlift')]);
  const { localStorage } = loadApp({ trainingRoutines:legacy });
  const routine = JSON.parse(localStorage.getItem('trainingRoutines'))[0];
  assert.equal(routine.cycleLength, 7);
  assert.equal(routine.usesWeekdays, true);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(routine.cycleAnchorDate));
  assert.deepEqual(routine.plan.map(item => item.cycleDay), [1, 7]);
});

test('a ten-day microcycle keeps repeated weekdays as distinct plan slots', () => {
  const routine = [{
    id:'r1', name:'Ten Day', isActive:true, cycleLength:10, cycleAnchorDate:'2026-07-06',
    plan:[
      { ...planDay('Δευτέρα', 'Bench Press'), cycleDay:1, workoutName:'Alpha' },
      { ...planDay('Δευτέρα', 'Row'), cycleDay:8, workoutName:'Beta' },
    ],
  }];
  const { document } = loadApp({ trainingRoutines:routine });
  const cards = [...document.querySelectorAll('#plan-list .day-card')];
  assert.equal(cards.length, 10);
  assert.equal(cards[0].querySelector('h3').textContent, 'Δευτέρα');
  assert.equal(cards[7].querySelector('h3').textContent, 'Δευτέρα');
  assert.equal(cards[0].querySelector('[data-edit-day]').dataset.editDay, '1');
  assert.equal(cards[7].querySelector('[data-edit-day]').dataset.editDay, '8');
});

test('logging resolves an eight-day rotation by date instead of alphabetically', () => {
  const routine = [{
    id:'r1', name:'Eight Day', isActive:true, cycleLength:8, cycleAnchorDate:'2026-07-06',
    plan:[
      { ...planDay('Δευτέρα', 'Bench Press'), cycleDay:1, workoutName:'Zulu Day' },
      { ...planDay('Δευτέρα', 'Row'), cycleDay:8, workoutName:'Alpha Day' },
    ],
  }];
  const { document } = loadApp({ trainingRoutines:routine });
  setValue(document, '#log-date', '2026-07-13'); // seven days after the anchor => cycle day 8
  assert.equal(document.querySelector('#workout-day-select').value, '8');
  assert.equal(document.querySelector('#scheduled-session h2').textContent, 'Alpha Day');
  setValue(document, '#log-date', '2026-07-14'); // next cycle starts => cycle day 1
  assert.equal(document.querySelector('#workout-day-select').value, '1');
  assert.equal(document.querySelector('#scheduled-session h2').textContent, 'Zulu Day');
});

test('a scheduled log persists the distinct microcycle slot', () => {
  const routine = [{
    id:'r1', name:'Eight Day', isActive:true, cycleLength:8, cycleAnchorDate:'2026-07-06',
    plan:[{ ...planDay('Δευτέρα', 'Row'), cycleDay:8, workoutName:'Day Eight' }],
  }];
  const { document, localStorage } = loadApp({ trainingRoutines:routine });
  setValue(document, '#log-date', '2026-07-13');
  document.querySelectorAll('#scheduled-session [data-set]').forEach(row => {
    row.querySelector('.set-reps').value = '8';
    row.querySelector('.set-weight').value = '50';
  });
  click(document, '#save-session');
  const session = JSON.parse(localStorage.getItem('trainingSessions'))[0];
  assert.equal(session.cycleDay, 8);
  assert.equal(session.workoutName, 'Day Eight');
  assert.equal(session.workoutDay, 'Δευτέρα');
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
  assert.ok(panel.includes('class="chart-line"'), 'chart should render');
  assert.ok(panel.includes('class="chart-point"'), 'chart points expose details without crowding the plot');
  assert.ok(panel.includes('<title>'), 'point details remain available on hover/focus');
  assert.ok(panel.includes('class="chart-tooltip-card"'), 'hover details include the recording date');
  assert.ok(panel.includes('+5.0'), 'weight delta should be +5.0');
});

test('progress chart date labels near the last point are skipped to avoid overlap', () => {
  const mkSession = (id, date, weight) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 8, weight, weightMode: 'kg', plates: null }] }] });
  const sessions = Array.from({ length: 11 }, (_, i) => mkSession(`s${i}`, `2026-05-${String(i + 1).padStart(2, '0')}`, 50 + i * 2.5));
  const { document } = loadApp({ trainingSessions: sessions });
  click(document, '.nav-button[data-view="progress"]');
  const dates = [...document.querySelectorAll('#progress-panel .chart-date')].map(t => Number(t.getAttribute('x'))).sort((a, b) => a - b);
  assert.ok(dates.length >= 3, 'intermediate dates are still sampled');
  const lastGap = dates[dates.length - 1] - dates[dates.length - 2];
  assert.ok(lastGap >= 120, `the label before the last must keep its distance (gap ${lastGap})`);
});

test('progress chart tooltip card grows with long mixed-mode labels', () => {
  const mkSession = (id, date, plates, weight, reps) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Dip', comments: '', sets: [{ reps, plates, weight, weightMode: 'mixed' }] }] });
  const { document } = loadApp({ trainingSessions: [mkSession('m1', '2026-06-01', 3.5, 12.5, 9), mkSession('m2', '2026-06-08', 4.5, 12.5, 10)] });
  click(document, '.nav-button[data-view="progress"]');
  document.querySelectorAll('#progress-panel .chart-tooltip-card').forEach(card => {
    const label = card.querySelector('tspan').textContent;
    const rectWidth = Number(card.querySelector('rect').getAttribute('width'));
    assert.ok(rectWidth >= label.length * 6 + 16, `tooltip rect (${rectWidth}) must fit "${label}"`);
  });
});

test('progress chart raises the hovered point above later points', () => {
  const mkSession = (id, date, weight) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 8, weight, weightMode: 'kg', plates: null }] }] });
  const { document } = loadApp({ trainingSessions: [mkSession('s1', '2026-06-01', 60), mkSession('s2', '2026-06-08', 65), mkSession('s3', '2026-06-15', 70)] });
  click(document, '.nav-button[data-view="progress"]');
  const firstPoint = document.querySelector('#progress-panel .chart-point');
  const svg = firstPoint.closest('svg');
  assert.notEqual(svg.lastElementChild, firstPoint, 'first point starts below its siblings');
  firstPoint.dispatchEvent(new document.defaultView.Event('mouseover', { bubbles: true }));
  assert.equal(svg.lastElementChild, firstPoint, 'hovered point moves to the top of the paint order');
});

test('bodyweight progress chart labels its line as repetitions', () => {
  const mkSession = (id, date, reps) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Pull Up', comments: '', sets: [{ reps, weightMode: 'bodyweight' }] }] });
  const { document } = loadApp({ trainingSessions: [mkSession('b1', '2026-06-01', 8), mkSession('b2', '2026-06-08', 10)] });
  click(document, '.nav-button[data-view="progress"]');
  const legend = document.querySelector('#progress-panel .chart-legend').innerHTML;
  assert.ok(legend.includes('Επαναλήψεις'), 'legend explains what the line measures');
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

test('language picker switches all supported languages and persists the choice', () => {
  const { document, localStorage } = loadApp();
  click(document, '[data-language="en"]');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'History');
  assert.equal(document.querySelector('[data-language="en"]').getAttribute('aria-pressed'), 'true');
  assert.equal(localStorage.getItem('logbookLanguage'), 'en');

  click(document, '[data-language="fr"]');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Historique');
  click(document, '[data-language="de"]');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Verlauf');
  click(document, '[data-language="el"]');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Ιστορικό');
});

test('changing language preserves in-progress workout values', () => {
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press')]),
  });
  setValue(document, '#log-date', '2026-07-06');
  const reps = document.querySelector('#scheduled-session .set-reps');
  const weight = document.querySelector('#scheduled-session .set-weight');
  reps.value = '8';
  weight.value = '62.5';
  click(document, '[data-language="de"]');
  assert.equal(document.querySelector('#scheduled-session .set-reps').value, '8');
  assert.equal(document.querySelector('#scheduled-session .set-weight').value, '62.5');
});

test('saved language is restored on the next load', () => {
  const { document } = loadApp({ logbookLanguage: 'fr' });
  assert.equal(document.documentElement.lang, 'fr');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Historique');
  assert.equal(document.querySelector('[data-language="fr"]').getAttribute('aria-pressed'), 'true');
});

test('legacy trainingPlan migrates into a single active routine', () => {
  const legacy = [planDay('Δευτέρα', 'Squat')];
  const { localStorage } = loadApp({ trainingPlan: legacy });
  const routines = JSON.parse(localStorage.getItem('trainingRoutines'));
  assert.equal(routines.length, 1);
  assert.equal(routines[0].isActive, true);
  assert.equal(routines[0].plan[0].exercise, 'Squat');
});

test('two saved routines flagged active keep only the first as active', () => {
  const routines = [
    { id: 'r1', name: 'A', isActive: true, plan: [] },
    { id: 'r2', name: 'B', isActive: true, plan: [] },
  ];
  const { document, localStorage } = loadApp({ trainingRoutines: routines });
  assert.equal(document.querySelectorAll('.routine-card.active-routine').length, 1);
  assert.equal(document.querySelector('[data-activate-routine="r1"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('[data-activate-routine="r2"]').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(JSON.parse(localStorage.getItem('trainingRoutines')).map(routine => routine.isActive), [true, false]);
});

test('routine persistence failure is handled without showing a false success', () => {
  const { document, localStorage } = loadApp();
  Object.getPrototypeOf(localStorage).setItem = () => { throw new Error('quota'); };
  setValue(document, '#routine-name', 'Will Not Persist', 'input');
  document.querySelector('#routine-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  assert.equal(JSON.parse(localStorage.getItem('trainingRoutines')).length, 1);
  assert.match(document.querySelector('#toast').textContent, /Δεν ήταν δυνατή η αποθήκευση/);
  assert.equal(document.querySelector('#toast').textContent.includes('δημιουργήθηκε'), false);
});

test('saving a free workout stores a free session with its exercises', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#log-date', '2026-07-06');
  click(document, '[data-mode="free"]');
  const card = document.querySelector('#free-exercises [data-exercise]');
  assert.ok(card, 'switching to free mode should add one exercise card');
  card.querySelector('.exercise-name').value = 'Dips';
  card.querySelectorAll('[data-set]').forEach(row => {
    row.querySelector('.set-reps').value = '10';
    row.querySelector('.set-weight').value = '0';
  });
  click(document, '#save-session');
  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].type, 'free');
  assert.equal(sessions[0].workoutName, 'Ελεύθερη προπόνηση');
  assert.equal(sessions[0].exercises[0].exercise, 'Dips');
  assert.equal(sessions[0].exercises[0].sets.length, 3);
});

test('editing a session saves in place without creating a duplicate', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg', plates: null }] }] };
  const { document, localStorage } = loadApp({ trainingSessions: [session] });
  click(document, '.nav-button[data-view="overview"]');
  click(document, '[data-edit-session="s1"]');
  const row = document.querySelector('#free-exercises [data-set]');
  row.querySelector('.set-reps').value = '6';
  click(document, '#save-session');
  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, 's1');
  assert.equal(sessions[0].exercises[0].sets[0].reps, 6);
});

test('a deleted session cannot be recreated by its stale edit form', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg', plates: null }] }] };
  const { document, localStorage } = loadApp({ trainingSessions: [session] });
  click(document, '[data-edit-session="s1"]');
  click(document, '[data-delete-session="s1"]');
  click(document, '#confirm-delete-accept');
  click(document, '#save-session');
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions')).length, 0);
  assert.equal(document.querySelector('#cancel-session-edit').classList.contains('hidden'), true);
});

test('copy-first-set fills the remaining rows with the first set values', () => {
  const { document } = loadApp({ trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press')]) });
  setValue(document, '#log-date', '2026-07-06');
  const card = document.querySelector('#scheduled-session [data-exercise]');
  const first = card.querySelector('[data-set]');
  first.querySelector('.set-reps').value = '8';
  setValue(document, '#scheduled-session [data-set] .set-weight', '60', 'input');
  const button = card.querySelector('.copy-first-set');
  assert.equal(button.classList.contains('hidden'), false, 'copy button appears once first set is complete');
  click(document, button);
  const rows = [...card.querySelectorAll('[data-set]')];
  assert.equal(rows[1].querySelector('.set-reps').value, '8');
  assert.equal(rows[2].querySelector('.set-weight').value, '60');
});

test('extra set is added, saved with the session, and removable with renumbering', () => {
  const { document, localStorage } = loadApp({ trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press')]) });
  setValue(document, '#log-date', '2026-07-06');
  click(document, '.add-extra-set');
  let numbers = [...document.querySelectorAll('#scheduled-session .set-number')].map(el => el.textContent);
  assert.deepEqual(numbers, ['01', '02', '03', '04']);
  assert.equal(document.querySelector('#scheduled-session [data-extra-set] .set-reps').getAttribute('aria-label'), 'Επαναλήψεις σετ 4');
  assert.equal(document.querySelector('#scheduled-session [data-extra-set] .weight-mode').getAttribute('aria-label'), 'Τρόπος καταγραφής βάρους για το σετ 4');
  document.querySelectorAll('#scheduled-session [data-set]').forEach(row => {
    row.querySelector('.set-reps').value = '8';
    row.querySelector('.set-weight').value = '60';
  });
  click(document, '#save-session');
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions'))[0].exercises[0].sets.length, 4);
  // fresh form after save: add + remove again renumbers back
  setValue(document, '#log-date', '2026-07-06');
  click(document, '.add-extra-set');
  click(document, '.remove-extra-set');
  numbers = [...document.querySelectorAll('#scheduled-session .set-number')].map(el => el.textContent);
  assert.deepEqual(numbers, ['01', '02', '03']);
});

test('saving a plan day through the form stores exercises on the selected routine', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#plan-day', '3');
  setValue(document, '#workout-name', 'Push', 'input');
  const cards = [...document.querySelectorAll('.plan-exercise-fields')];
  assert.equal(cards.length, 3, 'default builder shows 3 exercises');
  cards.forEach((card, i) => { card.querySelector('.builder-name').value = `Ex ${i + 1}`; });
  document.querySelector('#plan-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  const plan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.equal(plan.length, 3);
  assert.ok(plan.every(item => item.cycleDay === 3 && item.day === 'Τετάρτη' && item.workoutName === 'Push'));
});

test('renaming a workout during day edit can sync old sessions to the new name', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight: 60, weightMode: 'kg', plates: null }] }] };
  const { document, localStorage } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [session],
  });
  click(document, '[data-edit-day="1"]');
  setValue(document, '#workout-name', 'Upper A', 'input');
  document.querySelector('#plan-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  assert.equal(document.querySelector('#exercise-delete-dialog').open, true, 'rename should ask about history');
  click(document, '#confirm-delete-accept'); // primary: Πρόγραμμα + Ιστορικό
  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  assert.equal(sessions[0].workoutName, 'Upper A');
  const plan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.equal(plan[0].workoutName, 'Upper A');
});

test('deleting a plan day keeps history but clears the day', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight: 60, weightMode: 'kg', plates: null }] }] };
  const { document, localStorage } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [session],
  });
  click(document, '[data-delete-day="1"]');
  click(document, '#confirm-delete-accept');
  assert.equal(JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan.length, 0);
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions')).length, 1, 'history stays');
});

test('inline routine rename saves the new name', () => {
  const { document, localStorage } = loadApp({ trainingRoutines: [{ id: 'r1', name: 'Old', isActive: true, plan: [] }] });
  click(document, '[data-rename-routine="r1"]');
  const input = document.querySelector('[data-routine-rename-form="r1"] .routine-inline-name');
  input.value = 'New Name';
  document.querySelector('[data-routine-rename-form="r1"]').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  assert.equal(JSON.parse(localStorage.getItem('trainingRoutines'))[0].name, 'New Name');
});

test('the last remaining routine cannot be deleted', () => {
  const { document, localStorage } = loadApp({ trainingRoutines: [{ id: 'r1', name: 'Only', isActive: true, plan: [] }] });
  click(document, '[data-delete-routine="r1"]');
  assert.notEqual(document.querySelector('#exercise-delete-dialog').open, true, 'no confirmation dialog for last routine');
  assert.equal(JSON.parse(localStorage.getItem('trainingRoutines')).length, 1);
});

test('activating another routine switches the scheduled workout', () => {
  const routines = [
    { id: 'r1', name: 'A', isActive: true, plan: [planDay('Δευτέρα', 'Bench Press')] },
    { id: 'r2', name: 'B', isActive: false, plan: [{ ...planDay('Δευτέρα', 'Row'), workoutName: 'Pull Day' }] },
  ];
  const { document, localStorage } = loadApp({ trainingRoutines: routines });
  setValue(document, '#log-date', '2026-07-06');
  click(document, '[data-activate-routine="r2"]');
  assert.ok(document.querySelector('#scheduled-session').innerHTML.includes('Row'));
  const saved = JSON.parse(localStorage.getItem('trainingRoutines'));
  assert.deepEqual(saved.map(r => r.isActive), [false, true]);
});

test('profile form submit persists the profile and updates the menu identity', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#profile-name', 'Δημήτρης', 'input');
  setValue(document, '#profile-birthdate', '1990-01-01', 'input');
  setValue(document, '#profile-weight', '80', 'input');
  document.querySelector('#profile-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  const profile = JSON.parse(localStorage.getItem('userProfile'));
  assert.equal(profile.name, 'Δημήτρης');
  assert.equal(profile.weight, 80);
  assert.equal(document.querySelector('#menu-profile-name').textContent, 'Δημήτρης');
  assert.equal(document.querySelector('#profile-status').textContent, 'ΑΠΟΘΗΚΕΥΜΕΝΟ');
  assert.equal(document.querySelector('#home-profile-name').textContent, 'Δημήτρης');
  assert.ok(!document.querySelector('#home-profile-card').classList.contains('hidden'));
});

test('exercise names with HTML are escaped in the history view', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', comments: '<b>bold</b>', exercises: [{ exercise: '<img src=x onerror=alert(1)>', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg' }] }] };
  const { document } = loadApp({ trainingSessions: [session] });
  click(document, '.nav-button[data-view="overview"]');
  assert.equal(document.querySelector('#session-cards img'), null, 'no injected element');
  assert.ok(document.querySelector('.card-exercises').textContent.includes('<img'));
  assert.equal(document.querySelector('.card-comment b'), null, 'comments are escaped too');
});

test('personal bests track modes separately and rank bodyweight by reps', () => {
  const mk = (id, date, sets) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Pull Up', comments: '', sets }] });
  const { document } = loadApp({ trainingSessions: [
    mk('s1', '2026-07-01', [{ reps: 10, weight: null, plates: null, weightMode: 'bodyweight' }]),
    mk('s2', '2026-07-03', [{ reps: 12, weight: null, plates: null, weightMode: 'bodyweight' }]),
    mk('s3', '2026-07-05', [{ reps: 6, weight: 10, plates: null, weightMode: 'bodyweight_extra' }]),
  ] });
  click(document, '.nav-button[data-view="overview"]');
  const bests = document.querySelector('#personal-bests').innerHTML;
  assert.ok(bests.includes('12'), 'bodyweight best is 12 reps');
  assert.ok(bests.includes('extra kg'), 'bodyweight_extra tracked as its own mode');
});

test('overview metrics count sessions and total working sets', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', comments: '', exercises: [
    { exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg' }, { reps: 5, weight: 100, weightMode: 'kg' }] },
    { exercise: 'Dips', comments: '', sets: [{ reps: 10, weight: null, weightMode: 'bodyweight' }] },
  ] };
  const { document } = loadApp({ trainingSessions: [session] });
  click(document, '.nav-button[data-view="overview"]');
  const metrics = document.querySelector('#metrics').innerHTML;
  assert.ok(metrics.includes('<strong>1</strong>'), 'one session');
  assert.ok(metrics.includes('<strong>3</strong>'), 'three working sets');
});

test('opening a history workout reveals a read-only modal over the overview', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'scheduled', workoutName: 'Upper A', comments: 'Καλή ενέργεια', exercises: [
    { exercise: 'Bench Press', comments: 'Παύση στο στήθος', sets: [{ reps: 8, weight: 72.5, weightMode: 'kg' }, { reps: 7, weight: 72.5, weightMode: 'kg' }] },
  ] };
  const { document } = loadApp({ trainingSessions: [session, { ...session, id:'s2', date:'2026-06-29', workoutName:'Upper B' }] });
  click(document, '.nav-button[data-view="overview"]');
  assert.equal(document.querySelector('button[data-view-session="s1"]'), null, 'the card has no separate open button');
  assert.equal(document.querySelector('[data-view-session="s1"]').textContent.includes('ΑΝΟΙΓΜΑ ΣΕΛΙΔΑΣ'), false);
  click(document, '[data-view-session="s1"] .card-body');
  assert.ok(document.querySelector('#overview-view').classList.contains('active'), 'history stays on screen');
  assert.equal(document.querySelector('#log-view').classList.contains('active'), false, 'read-only view does not open the workout form');
  assert.equal(document.querySelector('#session-detail-dialog').open, true, 'the workout opens as a modal');
  assert.equal(document.querySelector('.session-card .session-page'), null, 'the workout is not expanded below its card');
  assert.equal(document.querySelectorAll('.session-page').length, 1, 'only the opened workout page is rendered');
  assert.ok(document.querySelector('.session-page').textContent.includes('Bench Press'));
  assert.ok(document.querySelector('.session-page').textContent.includes('72.5 kg'));
  assert.equal(document.querySelector('.session-page input'), null, 'the historical page has no editable inputs');
  click(document, '[data-close-session="s1"]');
  assert.equal(document.querySelector('#session-detail-dialog').open, false);
  assert.equal(document.querySelectorAll('.session-page').length, 0);
  click(document, '[data-view-session="s1"] .card-body');
  document.querySelector('#session-detail-dialog').dispatchEvent(new document.defaultView.Event('cancel', { cancelable:true }));
  assert.equal(document.querySelector('#session-detail-dialog').open, false, 'Escape/cancel closes the modal');
  assert.equal(document.activeElement, document.querySelector('[data-view-session="s1"]'), 'focus returns to the opened card');
});

test('the daily quote is deterministic within the same day', () => {
  const first = loadApp().document.querySelector('#daily-quote-text').textContent;
  const second = loadApp().document.querySelector('#daily-quote-text').textContent;
  assert.equal(first, second);
});

test('default dates use the local calendar date and a birthday today has age zero', () => {
  const { window, document } = loadApp();
  const now = new window.Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.equal(document.querySelector('#log-date').value, today);
  assert.equal(document.querySelector('#profile-birthdate').max, today);
  setValue(document, '#profile-birthdate', today, 'input');
  assert.equal(document.querySelector('#profile-age').textContent, '0');
});

test('i18n never changes user-authored Greek exercise names', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', workoutName: 'Σετ', comments: 'Παρ', exercises: [{ exercise: 'Τρίποδο άλμα · Σετ · Κιλά', comments: 'Τρί', sets: [{ reps: 5, weight: 10, weightMode: 'kg' }] }] };
  const { document } = loadApp({ trainingSessions: [session] });
  click(document, '[data-language="en"]');
  assert.equal(document.querySelector('.card-body h3').textContent, 'Σετ');
  assert.equal(document.querySelector('.card-exercises').textContent, 'Τρίποδο άλμα · Σετ · Κιλά');
  assert.equal(document.querySelector('.card-comment').textContent, 'Παρ');
  assert.equal(document.querySelector('.nav-button[data-view="plan"]').textContent, 'Plan');
  const boundaryProbe = document.createElement('p');
  boundaryProbe.textContent = 'Τρίποδο άλμα';
  document.body.append(boundaryProbe);
  document.defaultView.LogbookI18n.translate(boundaryProbe);
  assert.equal(boundaryProbe.textContent, 'Τρίποδο άλμα');
});

test('the switch-free button on a rest day starts a free workout', () => {
  const { document } = loadApp(); // empty plan → no scheduled workout
  click(document, '.nav-button[data-view="log"]');
  const button = document.querySelector('#scheduled-session .switch-free');
  assert.ok(button, 'rest-day state offers a free workout button');
  click(document, button);
  assert.equal(document.querySelector('#free-session').classList.contains('hidden'), false);
  assert.ok(document.querySelector('#free-exercises [data-exercise]'), 'a free exercise card is added');
});

test('Escape key closes the side menu', () => {
  const { document, window } = loadApp();
  click(document, '#open-menu');
  assert.equal(document.querySelector('#side-menu').classList.contains('open'), true);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.querySelector('#side-menu').classList.contains('open'), false);
  assert.equal(document.querySelector('#open-menu').getAttribute('aria-expanded'), 'false');
});

test('week strip marks a session logged today and counts weekly frequency', () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const session = { id: 's1', date: today, type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg' }] }] };
  const { document } = loadApp({ trainingSessions: [session] });
  click(document, '.nav-button[data-view="overview"]');
  assert.equal(document.querySelectorAll('#week-strip .day-tile').length, 7);
  assert.equal(document.querySelectorAll('#week-strip .day-tile.done').length, 1);
  assert.ok(document.querySelector('#metrics').innerHTML.includes('<strong>1<small>/7</small></strong>'));
  click(document, '.session-summary');
  assert.equal(document.querySelector('#session-detail-dialog').open, true, 'the card itself opens the workout modal');
  click(document, '#session-detail-close');
  click(document, '#week-strip .day-tile.done');
  assert.equal(document.querySelector('#session-detail-dialog').open, false, 'date navigation does not open the workout page');
  assert.equal(document.querySelectorAll('.session-page').length, 0);
  assert.ok(document.querySelector('#overview-view').classList.contains('active'), 'logged day remains in history');
});

test('progress chart excludes sessions logged in a different weight mode', () => {
  const mk = (id, date, sets) => ({ id, date, type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets }] });
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [
      mk('s1', '2026-07-01', [{ reps: 8, weight: 60, plates: null, weightMode: 'kg' }]),
      mk('s2', '2026-07-08', [{ reps: 8, weight: 65, plates: null, weightMode: 'kg' }]),
      mk('s3', '2026-07-10', [{ reps: 8, weight: null, plates: 4, weightMode: 'plates' }]),
    ],
  });
  click(document, '.nav-button[data-view="progress"]');
  const panel = document.querySelector('#progress-panel').innerHTML;
  assert.ok(panel.includes('class="chart-line"'), 'kg majority still charts');
  assert.ok(panel.includes('recording-warning'), 'mismatched plates session is flagged');
  assert.ok(panel.includes('εξαιρέθηκε'), 'warning mentions one excluded workout');
});

test('moving a workout to another day can sync the session workoutDay', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight: 60, weightMode: 'kg', plates: null }] }] };
  const { document, localStorage } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [session],
  });
  click(document, '[data-edit-day="1"]');
  setValue(document, '#plan-day', '2');
  document.querySelector('#plan-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  assert.equal(document.querySelector('#exercise-delete-dialog').open, true, 'moving the day asks about history');
  click(document, '#confirm-delete-accept'); // Πρόγραμμα + Ιστορικό
  const plan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.ok(plan.every(item => item.cycleDay === 2 && item.day === 'Τρίτη'));
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions'))[0].workoutDay, 'Τρίτη');
});

test('renaming an exercise during day edit syncs old sessions by planExerciseId', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'scheduled', routineId: 'r1', workoutDay: 'Δευτέρα', workoutName: 'Δευτέρα Workout', comments: '', exercises: [{ exercise: 'Bench Press', planExerciseId: 'p1', comments: '', sets: [{ reps: 8, weight: 60, weightMode: 'kg', plates: null }] }] };
  const { document, localStorage } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { id: 'p1' })]),
    trainingSessions: [session],
  });
  click(document, '[data-edit-day="1"]');
  document.querySelector('.builder-name').value = 'Incline Press';
  document.querySelector('#plan-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  assert.equal(document.querySelector('#exercise-delete-dialog').open, true, 'rename asks about history');
  click(document, '#confirm-delete-accept');
  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  assert.equal(sessions[0].exercises[0].exercise, 'Incline Press');
});

test('removing a planned exercise from the log form renumbers the rest', () => {
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press'), planDay('Δευτέρα', 'Row')]),
  });
  setValue(document, '#log-date', '2026-07-06');
  assert.equal(document.querySelectorAll('#scheduled-session [data-exercise]').length, 2);
  click(document, '#scheduled-session [data-exercise] .remove-planned-exercise');
  click(document, '#confirm-delete-accept');
  const cards = document.querySelectorAll('#scheduled-session [data-exercise]');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].querySelector('.exercise-order').textContent, 'ΑΣΚΗΣΗ 1η');
});

test('changing the free set count rebuilds rows without losing entered values', () => {
  const { document } = loadApp();
  setValue(document, '#log-date', '2026-07-06');
  click(document, '[data-mode="free"]');
  const card = document.querySelector('#free-exercises [data-exercise]');
  card.querySelector('.set-reps').value = '10';
  card.querySelector('.set-weight').value = '25';
  const counter = card.querySelector('.free-set-count');
  counter.value = '5';
  counter.dispatchEvent(new (document.defaultView.Event)('input', { bubbles: true }));
  const rows = card.querySelectorAll('[data-set]');
  assert.equal(rows.length, 5);
  assert.equal(rows[0].querySelector('.set-reps').value, '10');
  assert.equal(rows[0].querySelector('.set-weight').value, '25');
});

test('switching a set to plates mode swaps the required weight inputs', () => {
  const { document } = loadApp({ trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press')]) });
  setValue(document, '#log-date', '2026-07-06');
  const row = document.querySelector('#scheduled-session [data-set]');
  assert.equal(row.querySelector('.set-weight').required, true, 'kg mode requires kg');
  const modeSelect = row.querySelector('.weight-mode');
  modeSelect.value = 'plates';
  modeSelect.dispatchEvent(new (document.defaultView.Event)('change', { bubbles: true }));
  assert.equal(row.dataset.weightMode, 'plates');
  assert.equal(row.querySelector('.set-plates').required, true);
  assert.equal(row.querySelector('.set-weight').required, false);
});

test('plan cues appear as a banner on the scheduled exercise card', () => {
  const { document } = loadApp({
    trainingRoutines: routineWith([planDay('Δευτέρα', 'Bench Press', { cues: 'ώμοι πίσω, σταθερά πόδια' })]),
  });
  setValue(document, '#log-date', '2026-07-06');
  const banner = document.querySelector('#scheduled-session .cue-banner');
  assert.ok(banner, 'cue banner rendered');
  assert.ok(banner.textContent.includes('ώμοι πίσω'));
});

test('Greek user content keeps Greek uppercase rules in every interface language', () => {
  const { document } = loadApp({
    userProfile: { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' },
  });
  click(document, '[data-language="en"]');
  assert.equal(document.querySelector('#menu-profile-name').getAttribute('lang'), 'el');
  assert.equal(document.querySelector('#profile-preview-name').getAttribute('lang'), 'el');
  assert.equal('Δημήτρης'.toLocaleUpperCase('el-GR'), 'ΔΗΜΗΤΡΗΣ');

  click(document, '[data-language="fr"]');
  assert.equal(document.querySelector('#menu-profile-name').getAttribute('lang'), 'el');
  click(document, '[data-language="de"]');
  assert.equal(document.querySelector('#menu-profile-name').getAttribute('lang'), 'el');
});

test('reward track grants PLAN SETUP as soon as an active plan has workout days', () => {
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()) });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'PLAN SETUP');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-1'));
  assert.ok(!document.querySelector('#home-reward-stamp').classList.contains('hidden'));
  assert.equal(document.querySelector('#home-reward-stamp').dataset.stage, '1');
});

test('one complete program week grants KEEP UP THE WORK', () => {
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:rewardSessions([0]) });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'KEEP UP THE WORK');
  assert.ok(document.querySelector('#profile-reward-ring').getAttribute('aria-label').includes('1 συνεχόμενη εβδομάδα'));
  assert.equal(document.querySelector('#home-reward-stamp').dataset.stage, '2');
});

test('an empty active week breaks the completed-week streak', () => {
  const sessions = rewardSessions([-2, 0]);
  const tracking = { version:1, activeRoutineId:'r1', periods:{ r1:[{ start:rewardDate(-2), end:null }] } };
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:sessions, routineRewardTracking:tracking });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'KEEP UP THE WORK');
  assert.ok(document.querySelector('#profile-reward-ring').getAttribute('aria-label').includes('1 συνεχόμενη εβδομάδα'));
});

test('four and twelve complete weeks grant NEVER GIVE UP and GYMRAT', () => {
  const four = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:rewardSessions([-3,-2,-1,0]) }).document;
  assert.equal(four.querySelector('#home-reward-label').textContent, 'NEVER GIVE UP');
  const twelve = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:rewardSessions([-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0]) }).document;
  assert.equal(twelve.querySelector('#home-reward-label').textContent, 'GYMRAT');
  assert.ok(twelve.querySelector('#profile-reward-ring').classList.contains('reward-stage-4'));
});

test('streaks beyond twelve weeks keep GYMRAT and the full streak count', () => {
  const sixteenWeeks = Array.from({ length: 16 }, (_, index) => index - 15);
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:rewardSessions(sixteenWeeks) });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'GYMRAT');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-4'));
  assert.ok(document.querySelector('#profile-reward-ring').getAttribute('aria-label').includes('16 συνεχόμενες εβδομάδες'));
  assert.equal(document.querySelector('#home-reward-stamp').dataset.stage, '4');
});

test('GYMRAT is kept on the same routine even after a missed week past twelve', () => {
  const longRunWithGap = [...Array.from({ length: 13 }, (_, index) => index - 14), 0]; // -14..-2 complete, -1 missed, current complete
  const tracking = { version:1, activeRoutineId:'r1', periods:{ r1:[{ start:rewardDate(-14), end:null }] } };
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:rewardSessions(longRunWithGap), routineRewardTracking:tracking });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'GYMRAT');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-4'));
  assert.ok(document.querySelector('#profile-reward-ring').getAttribute('aria-label').includes('1 συνεχόμενη εβδομάδα'));
});

test('a missed week before reaching twelve still resets the streak to stage 2', () => {
  const shortRunWithGap = [...Array.from({ length: 5 }, (_, index) => index - 6), 0]; // -6..-2 complete, -1 missed, current complete
  const tracking = { version:1, activeRoutineId:'r1', periods:{ r1:[{ start:rewardDate(-6), end:null }] } };
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:rewardSessions(shortRunWithGap), routineRewardTracking:tracking });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'KEEP UP THE WORK');
  assert.ok(document.querySelector('#profile-reward-ring').getAttribute('aria-label').includes('1 συνεχόμενη εβδομάδα'));
});

test('switching routines freezes and later restores each routine reward streak', () => {
  const routines = [
    { id:'r1', name:'Program One', isActive:true, plan:rewardPlan() },
    { id:'r2', name:'Program Two', isActive:false, plan:rewardPlan() },
  ];
  const { document } = loadApp({ trainingRoutines:routines, trainingSessions:rewardSessions([-1,0]) });
  click(document, '[data-activate-routine="r2"]');
  click(document, '[data-activate-routine="r1"]');
  click(document, '.nav-button[data-view="profile"]');
  assert.ok(document.querySelector('#profile-reward-ring').getAttribute('aria-label').includes('2 συνεχόμενες εβδομάδες'));
  assert.equal(document.querySelector('#home-reward-label').textContent, 'KEEP UP THE WORK');
});
