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
import { buildProgressChartMarkup } from '../modules/progress-chart.js';
import { buildHistoryMarkup, buildSessionCardMarkup } from '../modules/history.js';
import { exerciseCard, sessionPage, setRows } from '../modules/session-templates.js';
import { escapeHtml, setMenuState, syncNavigationState } from '../modules/ui.js';
import { readFileSync } from 'node:fs';

test('typed storage fallbacks preserve object and array boundaries', () => {
  const values = new Map([['broken', '{']]);
  const storage = {
    getItem:key => values.has(key) ? values.get(key) : null,
    setItem:(key, value) => values.set(key, value),
  };
  const writes = [];
  const store = createStore(storage, { onWrite:key => writes.push(key) });
  assert.deepEqual(store.read('missing-array', { type:'array', fallback:[] }), []);
  assert.equal(store.read('missing-object', { type:'object', fallback:null }), null);
  assert.deepEqual(store.read('broken', { type:'object', fallback:{} }), {});
  assert.equal(writeSafely(store, 'profile', { name:'Alex' }), true);
  assert.deepEqual(store.read('profile', { type:'object', fallback:null }), { name:'Alex' });
  assert.deepEqual(store.read('profile', { type:'array', fallback:[] }), [], 'a valid JSON value with the wrong shape uses the typed fallback');
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

test('progress chart module returns complete escaped markup without a DOM', () => {
  const workout = {
    sessions:[
      { date:'2026-07-01', exercises:[{ exercise:'Bench <Press>', sets:[{ reps:8, weight:60, weightMode:'kg' }] }] },
      { date:'2026-07-08', exercises:[{ exercise:'Bench <Press>', sets:[{ reps:9, weight:60, weightMode:'kg' }] }] },
    ],
  };
  const markup = buildProgressChartMarkup({
    workout,
    exerciseKey:'bench <press>',
    setIndex:0,
    panelWidth:600,
    weightSymbol:'kg',
    formatDate:value => value,
  });

  assert.match(markup, /class="progress-chart"/);
  assert.match(markup, /class="cycle-bracket"/);
  assert.match(markup, /Bench &lt;Press&gt;/);
  assert.doesNotMatch(markup, /<h2>Bench <Press><\/h2>/);
});

test('every rep cycle keeps a visible range on a phone-sized chart, however many records', () => {
  const sessions = Array.from({ length:24 }, (_, index) => ({
    date:new Date(2026, 0, 1 + index * 7).toISOString().slice(0, 10),
    exercises:[{ exercise:'Bench Press', sets:[{ reps:6 + (index % 2) * 4, weight:60 + Math.floor(index / 2) * 2.5, weightMode:'kg' }] }],
  }));

  for (const records of [4, 5, 6, 8, 12, 24]) {
    const markup = buildProgressChartMarkup({
      workout:{ sessions:sessions.slice(0, records) },
      exerciseKey:'bench press',
      setIndex:0,
      panelWidth:346,
      weightSymbol:'kg',
      formatDate:value => value,
    });
    const canvas = Number(/class="progress-chart" viewBox="0 0 ([\d.]+)/.exec(markup)[1]);
    const spots = [...markup.matchAll(/<circle cx="([\d.]+)"[^>]*class="chart-dot"/g)].map(match => Number(match[1]));
    const tightest = Math.min(...spots.slice(1).map((spot, index) => spot - spots[index]));
    assert.ok(tightest >= 78 || canvas === 346, `${records} records: κάθε προπόνηση κρατά τουλάχιστον 78 μονάδες (στενότερο ${tightest.toFixed(1)})`);
    assert.equal(markup.includes('is-scrollable'), canvas > 346, `${records} records: η κύλιση δηλώνεται μόνο όταν ο καμβάς ξεπερνά την οθόνη`);
    assert.equal(markup.includes('chart-rail'), canvas > 346, `${records} records: ο άξονας καρφώνεται μόνο όταν το χαρτί κυλάει`);
    const brackets = markup.match(/class="cycle-bracket"/g) || [];
    const labels = [...markup.matchAll(/<text class="(cycle-label[^"]*)" x="([\d.]+)"[^>]*>(.*?)<\/text>/g)];
    assert.equal(labels.length, brackets.length, `${records} records: every bracket keeps its rep range`);
    labels.forEach(match => assert.match(match[3], /\d+\s*→\s*\d+|^\d+$/, `${records} records: the range stays readable`));

    const boxes = labels.map(match => {
      const text = match[3].replace(/<[^>]+>/g, '');
      const halfWidth = text.length * (match[1].includes('is-compact') ? 5.2 : 5.4) / 2;
      return { left:Number(match[2]) - halfWidth, right:Number(match[2]) + halfWidth };
    });
    boxes.forEach((box, index) => {
      assert.ok(box.left >= 0 && box.right <= canvas, `${records} records: label ${index + 1} stays inside the canvas`);
      if (index) assert.ok(box.left >= boxes[index - 1].right, `${records} records: label ${index + 1} does not overlap its neighbour`);
    });
  }
});

test('history module renders escaped workout cards and pagination without a DOM', () => {
  const sessions = [{
    id:'s<1>',
    date:'2026-07-26',
    type:'scheduled',
    comments:'Δυνατά <script>',
    exercises:[{ exercise:'Squat & Press', sets:[{ reps:5 }, { reps:5 }] }],
  }];
  const card = buildSessionCardMarkup({
    session:sessions[0],
    sessionNumber:31,
    workoutName:'Legs <A>',
    dayLabel:'Κυριακή',
    formattedDate:'26 Ιουλ 2026',
  });
  assert.match(card, /class="session-card"/);
  assert.match(card, /2 WORKING SETS/);
  assert.match(card, /Legs &lt;A&gt;/);
  assert.doesNotMatch(card, /<script>/);

  const history = buildHistoryMarkup({
    sessions,
    totalCount:61,
    pageSize:30,
    getWorkoutName:() => 'Legs',
    getDayLabel:() => 'Κυριακή',
    formatDate:value => value,
  });
  assert.match(history, /SESSION No 61/);
  assert.match(history, /ΕΜΦΑΝΙΣΗ ΑΚΟΜΗ 30 · ΑΠΟΜΕΝΟΥΝ 60/);
  assert.match(buildHistoryMarkup(), /Ολοκληρώστε την πρώτη προπόνηση/);
});

test('session templates render escaped cards, set rows and printable pages without a DOM', () => {
  const rows = setRows(1, [{ reps:8, weight:100, weightMode:'kg' }], '', {
    extra:true,
    startIndex:2,
    unit:'lbs',
  });
  assert.match(rows, /class="set-number">03</);
  assert.match(rows, /data-extra-set/);
  assert.match(rows, /value="220\.46"/);
  assert.match(rows, /Βάρος \(lbs\)/);

  const card = exerciseCard({
    exercise:'Press <script>',
    cues:'Brace & breathe',
    sets:[{ reps:5, weight:60 }],
  }, { exerciseIndex:1, generatedId:'generated-1' });
  assert.match(card, /data-id="generated-1"/);
  assert.match(card, /ΑΣΚΗΣΗ 2/);
  assert.match(card, /Press &lt;script&gt;/);
  assert.doesNotMatch(card, /Press <script>/);

  const page = sessionPage({
    session:{
      id:'session-1',
      date:'2026-07-27',
      comments:'Good <day>',
      exercises:[{ exercise:'Press & Pull', sets:[{ reps:5 }] }],
    },
    sessionNumber:4,
    workoutName:'Upper <A>',
    dayLabel:'Δευτέρα',
    formattedDate:'27 Ιουλ 2026',
    formatLoad:() => '60 kg',
  });
  assert.match(page, /SESSION No 4/);
  assert.match(page, /Upper &lt;A&gt;/);
  assert.match(page, /Good &lt;day&gt;/);
  assert.match(page, /60 kg/);
});

test('session exercise cards repair an empty legacy set list with three editable rows', () => {
  const card = exerciseCard({ exercise:'Legacy press', sets:[] }, { free:true });

  assert.match(card, /class="free-set-count"[^>]*value="3"/);
  assert.equal((card.match(/class="set-row/g) || []).length, 3);
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

test('session state machine exposes only the four explicit lifecycle states', () => {
  const dom = new JSDOM('<body></body>', { runScripts:'outside-only' });
  dom.window.eval(readFileSync(new URL('../session-state.js', import.meta.url), 'utf8'));
  const { STATES, createSessionStateMachine } = dom.window.LogbookSessionState;
  const machine = createSessionStateMachine();
  const transitions = [];
  machine.subscribe((next, previous) => transitions.push(`${previous.state}->${next.state}`));

  assert.deepEqual(Object.values(STATES), ['unknown', 'member', 'offline-member', 'guest']);
  machine.transition(STATES.GUEST);
  machine.transition(STATES.MEMBER, { session:{ user:{ id:'user-a' } } });
  machine.transition(STATES.OFFLINE_MEMBER, { session:{ user:{ id:'user-a' } } });
  machine.transition(STATES.UNKNOWN);

  assert.equal(machine.state, STATES.UNKNOWN);
  assert.deepEqual(transitions, [
    'unknown->guest',
    'guest->member',
    'member->offline-member',
    'offline-member->unknown',
  ]);
  assert.throws(() => machine.transition(STATES.MEMBER), /requires a session/);
  assert.throws(() => machine.transition('signed-in'), /Unknown session state/);
});
