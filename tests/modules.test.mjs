import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createStore, migrateLocalData, writeSafely } from '../modules/storage-migrations.js';
import {
  cycleDayForDate,
  normalizeRoutine,
  validCycleDay,
  weekdayDeclarationCount,
} from '../modules/routines.js';
import {
  csvEscape,
  inputWeightToStored,
  nonNegativeNumber,
  storedWeightToDisplay,
} from '../modules/sessions.js';
import {
  calculateRoutineReward,
  isBetterPerformance,
  smoothPath,
  weightModeGroup,
} from '../modules/progress-rewards.js';
import { escapeHtml, setMenuState, syncNavigationState } from '../modules/ui.js';

test('typed storage fallbacks preserve object and array boundaries', () => {
  const values = new Map([['broken', '{']]);
  const storage = {
    getItem:key => values.has(key) ? values.get(key) : null,
    setItem:(key, value) => values.set(key, value),
  };
  const writes = [];
  const store = createStore(storage, { onWrite:key => writes.push(key) });
  assert.deepEqual(store.read('missing-array', []), []);
  assert.equal(store.read('missing-object', null), null);
  assert.deepEqual(store.read('broken', {}), {});
  assert.equal(writeSafely(store, 'profile', { name:'Alex' }), true);
  assert.deepEqual(store.read('profile', null), { name:'Alex' });
  assert.deepEqual(writes, ['profile']);
});

test('storage write failure is contained at the module boundary', () => {
  const store = { write() { throw new Error('quota'); } };
  let reported = false;
  assert.equal(writeSafely(store, 'sessions', [], () => { reported = true; }), false);
  assert.equal(reported, true);
});

test('local migration repairs legacy sessions and routine activity deterministically', () => {
  let id = 0;
  const result = migrateLocalData({
    oldLogs:[{ id:'old-1', date:'2026-07-01', exercise:'Squat', sets:[{ reps:5 }] }],
    savedRoutines:[
      { id:'r1', name:'One', isActive:true, plan:[] },
      { id:'r2', name:'Two', isActive:true, plan:[] },
    ],
    randomUUID:() => `generated-${++id}`,
  });
  assert.equal(result.state.sessions[0].type, 'free');
  assert.equal(result.state.sessions[0].exercises[0].exercise, 'Squat');
  assert.equal(result.state.routines.filter(routine => routine.isActive).length, 1);
  assert.equal(result.repairs.sessionsChanged, true);
  assert.equal(result.repairs.routinesChanged, true);
});

test('routine model keeps microcycle slots valid and weekday declarations capped', () => {
  const routine = normalizeRoutine({
    id:'r1',
    cycleLength:8,
    cycleAnchorDate:'2026-07-20',
    usesWeekdays:true,
    plan:[
      { id:'p1', day:'Δευτέρα', cycleDay:1 },
      { id:'p2', day:'Δευτέρα', cycleDay:8 },
    ],
  });
  assert.equal(validCycleDay(8, routine.cycleLength), 8);
  assert.equal(validCycleDay(9, routine.cycleLength), null);
  assert.equal(cycleDayForDate(routine, '2026-07-27'), 8);
  assert.equal(weekdayDeclarationCount(routine, 'Δευτέρα'), 2);
});

test('session model validates numbers, converts pounds and neutralizes CSV formulas', () => {
  assert.equal(nonNegativeNumber('-1'), null);
  assert.equal(nonNegativeNumber('4.5'), 4.5);
  const kilograms = inputWeightToStored('220.46', 'lbs');
  assert.ok(Math.abs(kilograms - 100) < 0.01);
  assert.equal(storedWeightToDisplay(kilograms, 'lbs'), 220.46);
  assert.equal(csvEscape('=SUM(A1:A2)'), "'=SUM(A1:A2)");
});

test('progress and reward helpers keep comparisons and chart math independent from rendering', () => {
  assert.equal(weightModeGroup('mixed'), 'plates');
  assert.equal(isBetterPerformance(
    { weightMode:'kg', weight:60, reps:5 },
    { weightMode:'kg', weight:55, reps:10 }
  ), true);
  assert.match(smoothPath([{ x:0, y:2 }, { x:10, y:1 }, { x:20, y:3 }]), /^M 0 2 C /);

  const routine = {
    id:'r1',
    cycleLength:7,
    cycleAnchorDate:'2026-07-06',
    plan:[{ cycleDay:1 }, { cycleDay:3 }],
  };
  const reward = calculateRoutineReward({
    routine,
    sessions:[
      { routineId:'r1', type:'scheduled', date:'2026-07-06', cycleDay:1 },
      { routineId:'r1', type:'scheduled', date:'2026-07-08', cycleDay:3 },
    ],
    rewardTracking:{ periods:{ r1:[{ start:'2026-07-06', end:null }] } },
    today:'2026-07-13',
  });
  assert.equal(reward.stage, 2);
  assert.equal(reward.streak, 1);
});

test('UI helpers escape content and own navigation/menu state', () => {
  const dom = new JSDOM(`
    <body>
      <button id="open-menu"></button><div id="menu-backdrop"></div>
      <aside id="side-menu"><button id="close-menu"></button></aside>
      <button class="nav-button active" data-view="home"></button>
      <button class="nav-button" data-view="plan"></button>
    </body>
  `, { pretendToBeVisual:true });
  assert.equal(escapeHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  syncNavigationState(dom.window.document, 'plan');
  assert.equal(dom.window.document.querySelector('[data-view="plan"]').getAttribute('aria-current'), 'page');
  setMenuState(dom.window.document, true, { focus:false });
  assert.equal(dom.window.document.querySelector('#side-menu').getAttribute('aria-hidden'), 'false');
  assert.equal(dom.window.document.body.style.overflow, 'hidden');
});
