import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, click, setValue } from './helpers.mjs';

const seed = () => ({
  trainingExercises:[
    { id:'press', name:'Shoulder Press Pin Loaded Machine', cues:'Θέση στο 2ο και λαβή Neutral', aliases:[] },
    { id:'pushdown', name:'Tricep Pushdown', cues:'Αγκώνες σταθεροί', aliases:[] },
    { id:'other-press', name:'Shoulder Press Pin Loaded Machine', cues:'Different machine', aliases:[] },
  ],
  trainingRoutines:[{
    id:'routine', name:'Current plan', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06',
    plan:[{ id:'replacement-slot', exerciseId:'press', exercise:'Shoulder Press Pin Loaded Machine', cycleDay:1, workoutName:'Push', workSets:3 }],
  }],
  trainingSessions:[{
    id:'source', date:'2026-07-06', type:'scheduled', routineId:'routine', cycleDay:1, workoutName:'Push', comments:'Old notes',
    exercises:[
      { exerciseId:'pushdown', exercise:'Tricep Pushdown', planExerciseId:'original-slot', comments:'Keep in history', sets:[{ reps:9, weight:4.6, plates:14, weightMode:'mixed' }] },
      { exerciseId:'press', exercise:'Shoulder Press Pin Loaded Machine', planExerciseId:null, isCustom:true, comments:'Keep too', sets:[{ reps:10, weight:36, plates:null, weightMode:'kg' }, { reps:10, weight:36, plates:null, weightMode:'kg' }] },
    ],
  }],
});
const readSessions = app => JSON.parse(app.localStorage.getItem('trainingSessions'));

test('copied scheduled exercises share the compact card, including a replacement originally added by hand', async () => {
  const app = loadApp(seed());
  const { document } = app;
  try {
    const before = readSessions(app);
    click(document, '[data-copy-session="source"]');
    const cards = [...document.querySelectorAll('#scheduled-session [data-exercise]')];
    assert.equal(cards.length, 2, 'copy keeps the source exercises even after the plan changes');
    for (const card of cards) {
      assert.ok(card.querySelector('h3'));
      assert.ok(card.querySelector('.planned-tag'));
      assert.ok(card.querySelector('.add-extra-set'));
      assert.equal(card.querySelector('.exercise-name, .session-library-exercise, .free-set-count'), null);
    }
    assert.equal(cards[1].querySelector('.cue-banner b').textContent, 'Θέση στο 2ο και λαβή Neutral');
    assert.equal(cards[1].querySelector('.planned-tag').textContent, '2 σετ', 'copy preserves the recorded set count');
    assert.equal(cards[1].querySelector('.set-weight').value, '36');
    assert.equal(cards[0].querySelector('.cue-banner b').textContent, 'Αγκώνες σταθεροί');
    click(document, cards[1].querySelector('.add-extra-set'));
    assert.equal(cards[1].querySelectorAll('[data-set]').length, 3);
    click(document, cards[1].querySelector('.remove-extra-set'));
    click(document, '#confirm-delete-accept');
    click(document, '#save-session');
    const after = readSessions(app);
    assert.equal(after.length, 2);
    assert.deepEqual(after.find(item => item.id === 'source'), before[0]);
    const copied = after.find(item => item.id !== 'source');
    assert.equal(copied.comments, '');
    assert.equal(copied.exercises[1].comments, '');
    assert.equal(copied.exercises[1].isCustom, true, 'layout does not rewrite the recorded origin');
    assert.equal(copied.exercises[1].planExerciseId, null);
    assert.deepEqual(copied.exercises[1].sets, before[0].exercises[1].sets);
  } finally { await new Promise(resolve => setTimeout(resolve, 0)); app.window.close(); }
});

for (const type of ['scheduled', 'free']) {
  test(`copying a ${type} workout resolves cues by identity and respects a cleared cue`, async () => {
    const data = seed();
    data.trainingSessions[0].type = type;
    data.trainingSessions[0].exercises[0].cues = 'Stale saved cue';
    data.trainingExercises[1].cues = '';
    const app = loadApp(data);
    try {
      click(app.document, '[data-copy-session="source"]');
      const container = type === 'scheduled' ? '#scheduled-session' : '#free-exercises';
      const cards = app.document.querySelectorAll(`${container} [data-exercise]`);
      assert.equal(cards[0].querySelector('.cue-banner'), null);
      assert.equal(cards[1].querySelector('.cue-banner b').textContent, data.trainingExercises[0].cues);
      assert.doesNotMatch(cards[1].querySelector('.cue-banner').textContent, /Different machine/);
    } finally { await new Promise(resolve => setTimeout(resolve, 0)); app.window.close(); }
  });
}

test('copy draft restores compact cards, cues and entered values after reopening', async () => {
  const app = loadApp(seed());
  let reopened;
  try {
    click(app.document, '[data-copy-session="source"]');
    setValue(app.document, '#scheduled-session [data-exercise-id="press"] .set-reps', '11', 'input');
    const storage = Object.fromEntries(Object.keys(app.localStorage).filter(key => key.startsWith('training') || key === 'logbookWorkoutDraft').map(key => [key, JSON.parse(app.localStorage.getItem(key))]));
    reopened = loadApp(storage);
    const card = reopened.document.querySelector('#scheduled-session [data-exercise-id="press"]');
    assert.ok(card.querySelector('h3'));
    assert.equal(card.querySelector('.exercise-name'), null);
    assert.equal(card.querySelector('.cue-banner b').textContent, seed().trainingExercises[0].cues);
    assert.equal(card.querySelector('.set-reps').value, '11');
    assert.equal(card.querySelector('.set-weight').value, '36');
  } finally { await new Promise(resolve => setTimeout(resolve, 0)); reopened?.window.close(); app.window.close(); }
});

test('changing a copied free exercise updates cues and typing another name hides the old cue', async () => {
  const data = seed();
  data.trainingSessions[0].type = 'free';
  data.trainingExercises[2].cues = '<img src=x onerror=alert(1)>\nDifferent machine';
  const app = loadApp(data);
  try {
    click(app.document, '[data-copy-session="source"]');
    const card = app.document.querySelector('#free-exercises [data-exercise-id="press"]');
    setValue(app.document, '#free-exercises [data-exercise-id="press"] .session-library-exercise', 'other-press');
    assert.equal(card.querySelector('.cue-banner b').textContent, data.trainingExercises[2].cues);
    assert.equal(card.querySelector('.cue-banner img'), null);
    setValue(app.document, '#free-exercises [data-exercise-id="other-press"] .exercise-name', 'Another exercise', 'input');
    assert.equal(card.querySelector('.cue-banner'), null);
    setValue(app.document, '#free-exercises [data-exercise-id="other-press"] .exercise-name', data.trainingExercises[2].name, 'input');
    assert.equal(card.querySelector('.cue-banner b').textContent, data.trainingExercises[2].cues);
    setValue(app.document, '#free-exercises [data-exercise-id="other-press"] .session-library-exercise', '');
    assert.equal(card.querySelector('.cue-banner'), null);
  } finally { await new Promise(resolve => setTimeout(resolve, 0)); app.window.close(); }
});
