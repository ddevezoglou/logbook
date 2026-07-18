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
  assert.equal(document.querySelector('.app-version b').textContent, '0.5.1');
  assert.ok(document.querySelector('#home-profile-card').classList.contains('hidden'));
  assert.equal(document.querySelector('.home-pageno').textContent, 'PAGE 001');
});

test('athlete profile card shows the notebook cover with brand mark, polaroid and motto', () => {
  const { document } = loadApp();
  assert.equal(document.querySelector('#profile-view .profile-hero h1').textContent.replace(/\s+/g, ''), 'ΤΟΑΠΟΤΥΠΩΜΑΜΕΝΕΙ.');
  assert.equal(document.querySelectorAll('#profile-guide li').length, 3);
  assert.equal(document.querySelectorAll('.profile-card-top .profile-brand-mark i').length, 5);
  assert.ok(document.querySelector('.profile-polaroid .profile-tape'));
  assert.ok(document.querySelector('.profile-polaroid-photo #profile-reward-ring'));
  assert.equal(document.querySelector('#profile-preview-name').textContent, 'ΟΝΟΜΑ');
  assert.equal(document.querySelector('.profile-card-foot > span').textContent, 'TRAIN . LOG . REPEAT');
  assert.ok(document.querySelector('.profile-card > .profile-elastic'));
  assert.equal(document.querySelector('.profile-hide-age').textContent.trim(), 'Απόκρυψη ηλικίας από την κάρτα');
  assert.equal(document.querySelector('.profile-hide-age small'), null);
  assert.match(styles, /\.profile-hide-age\s*\{[^}]*flex-direction:row;/);
  assert.match(styles, /\.profile-card-foot span\s*\{[^}]*white-space:nowrap;/);
  assert.match(styles, /@media\(min-width:701px\)\s*\{[\s\S]*?\.profile-card\s*\{\s*min-height:610px;/);
  assert.match(styles, /@media\(max-width:700px\)\s*\{[\s\S]*?#profile-view \.profile-hero\s*\{\s*display:grid;\s*min-height:164px;/);
  assert.match(styles, /#profile-view #profile-preview-age-unit\s*\{\s*display:none;/);
  assert.match(styles, /#profile-view \.profile-card\s*\{[^}]*width:min\(100%,360px\);[^}]*min-height:clamp\(430px,120vw,475px\);/);
  assert.match(styles, /\.profile-hero \.info-panel\s*\{\s*top:calc\(76px \+ env\(safe-area-inset-top\)\);\s*\}/);
  assert.match(styles, /\.hero \.info-panel,\.progress-hero \.info-panel,\.profile-hero \.info-panel\s*\{\s*width:min\(300px,78vw\);\s*left:auto;\s*\}/);
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
  assert.equal(card.dataset.routineSize, '2');
  assert.equal(card.style.getPropertyValue('--routine-list-height'), '98px');
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
  assert.equal(window.getComputedStyle(card).display, 'grid', 'the ticket card uses the topline + stub grid layout');
  assert.equal(window.getComputedStyle(name).whiteSpace, 'normal', 'the full name can use the card width instead of a 30px grid column');
  assert.equal(window.getComputedStyle(card.querySelector('.routine-topline')).display, 'flex', 'the actions live in the ticket topline');
  assert.equal(window.getComputedStyle(card.querySelector('.routine-stub')).display, 'flex', 'the duration stub sits beside the ticket body');
  assert.match(styles, /\.routine-carousel-controls button \{[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none;/, 'carousel arrows stay frameless and visually independent');
});

test('program manager keeps only the three creation fields before the tickets', () => {
  const { document } = loadApp();
  const manager = document.querySelector('.routine-manager');
  const createPanel = manager.querySelector('.routine-create-panel');
  const createForm = createPanel.querySelector('#routine-form');
  const tickets = manager.querySelector('#routine-list');
  assert.equal(manager.querySelector('.routine-manager-heading'), null);
  assert.equal(manager.querySelector('.routine-create-copy'), null);
  assert.equal(manager.textContent.includes('ΤΑ ΠΡΟΓΡΑΜΜΑΤΑ ΣΑΣ'), false);
  assert.equal(manager.textContent.includes('ROUTINE DESK'), false);
  assert.equal(createForm.querySelectorAll(':scope > label, :scope > fieldset').length, 3);
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.append(style);
  assert.equal(
    document.defaultView.getComputedStyle(createForm.querySelector('.routine-weekday-choice legend')).fontSize,
    document.defaultView.getComputedStyle(createForm.querySelector(':scope > label')).fontSize,
    'the weekday legend uses the same type size as the other creation labels',
  );
  assert.equal(manager.textContent.includes('01 / ΜΙΚΡΟΚΥΚΛΟΙ ΠΡΟΠΟΝΗΣΗΣ'), false);
  assert.equal(manager.textContent.includes('Επίλεξε πρόγραμμα για να επεξεργαστείς'), false);
  assert.ok(createPanel.compareDocumentPosition(tickets) & 4, 'the training tickets follow the definition form');
});

test('the plan exercise heading has no explanatory description', () => {
  const { document } = loadApp();
  const heading = document.querySelector('.exercise-builder-heading');
  assert.equal(heading.querySelector('span').textContent, 'ΑΣΚΗΣΕΙΣ ΠΡΟΠΟΝΗΣΗΣ');
  assert.equal(heading.querySelector('small'), null);
});

test('stamp copy uses the shortened notification labels and session wording', () => {
  const { document } = loadApp();
  assert.equal(document.querySelector('.bests-motto').textContent.trim(), 'STRONGER EVERY SESSION');
  assert.match(styles, /\.toast::before\s*\{\s*content:"RECORDED"/);
  assert.match(styles, /\.toast\.toast-error::before\s*\{\s*content:"ATTENTION"/);
});

test('internal section heroes share one compact light visual system', () => {
  const { document, window } = loadApp();
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.append(style);
  const heroes = ['#log-view .hero', '#plan-view .hero', '.overview-hero', '.progress-hero']
    .map(selector => document.querySelector(selector));
  const titleSizes = heroes.map(hero => window.getComputedStyle(hero.querySelector('h1')).fontSize);
  assert.equal(new Set(titleSizes).size, 1, 'all internal hero headings use the same type scale');
  const logStyle = window.getComputedStyle(heroes[0]);
  const progressStyle = window.getComputedStyle(heroes[3]);
  assert.equal(progressStyle.backgroundColor, logStyle.backgroundColor, 'progress uses the same light surface as log');
  assert.equal(progressStyle.color, logStyle.color, 'progress uses the same text color as log');
  assert.match(styles, /font-size:clamp\(2\.8rem,5\.2vw,5\.5rem\)/, 'desktop hero headings use the compact shared scale');
});

test('program ticket carousel keeps the active routine first', () => {
  const routines = [
    { id:'r-old', name:'Old Routine', isActive:false, cycleLength:8, plan:[] },
    { id:'r-active', name:'Active Routine', isActive:true, cycleLength:7, plan:[] },
    { id:'r-next', name:'Next Routine', isActive:false, cycleLength:9, plan:[] },
  ];
  const { document } = loadApp({ trainingRoutines:routines });
  const cards = [...document.querySelectorAll('#routine-list .routine-card')];
  assert.deepEqual(cards.map(card => card.dataset.routineId), ['r-active', 'r-old', 'r-next']);
  assert.equal(cards[0].querySelector('.routine-star').getAttribute('aria-pressed'), 'true', 'the active routine is marked only by the highlighted star');
  assert.doesNotMatch(cards[0].textContent, /TICKET|ΕΝΕΡΓΟ ΠΡΟΓΡΑΜΜΑ/);
  assert.match(cards[0].querySelector('.routine-stub').textContent, /ΔΙΑΡΚΕΙΑ: 7 ΗΜΕΡΕΣ/);
  assert.equal(cards[0].querySelector('.routine-ticket-number'), null, 'no ghost ticket number in the background');
  assert.deepEqual(cards.map(card => card.dataset.carouselPosition), ['0', '1', '-1']);
  assert.equal(document.querySelector('#routine-carousel-count').textContent, '01 / 03');
  assert.match(document.querySelector('.routine-carousel-bar').textContent, /TRAINING SPLITS/);
  assert.doesNotMatch(document.querySelector('.routine-carousel').textContent, /TRAINING TICKETS/);
  assert.ok(document.querySelector('.routine-carousel-controls').closest('.routine-carousel-stage'));
});

test('program ticket controls move one ticket left or right', () => {
  const routines = [
    { id:'r1', name:'One', isActive:true, cycleLength:7, plan:[] },
    { id:'r2', name:'Two', isActive:false, cycleLength:8, plan:[] },
  ];
  const { document } = loadApp({ trainingRoutines:routines });
  const list = document.querySelector('#routine-list');
  click(document, '[data-routine-scroll="1"]');
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r2');
  click(document, '[data-routine-scroll="-1"]');
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r1');
  list.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r2');
  list.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key:'ArrowLeft', bubbles:true }));
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r1');
  const pointer = (type, x) => {
    const event = new document.defaultView.Event(type, { bubbles:true });
    Object.defineProperties(event, { button:{ value:0 }, clientX:{ value:x } });
    list.dispatchEvent(event);
  };
  pointer('pointerdown', 220);
  pointer('pointerup', 120);
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r2');
});

test('clicking a side ticket centers it without rebuilding the carousel', () => {
  const routines = [
    { id:'r1', name:'One', isActive:true, cycleLength:7, plan:[] },
    { id:'r2', name:'Two', isActive:false, cycleLength:8, plan:[] },
  ];
  const { document } = loadApp({ trainingRoutines:routines });
  const list = document.querySelector('#routine-list');
  const sideCard = list.querySelector('[data-routine-id="r2"]');
  click(document, '[data-select-routine="r2"]');
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r2');
  assert.equal(list.querySelector('[data-routine-id="r2"]'), sideCard, 'the card element survives so the CSS transition can animate the move');
  assert.ok(sideCard.classList.contains('selected-routine'));
});

test('activating a program moves its ticket to the first position', () => {
  const routines = [
    { id:'r1', name:'One', isActive:true, cycleLength:7, plan:[] },
    { id:'r2', name:'Two', isActive:false, cycleLength:8, plan:[] },
  ];
  const { document } = loadApp({ trainingRoutines:routines });
  const list = document.querySelector('#routine-list');
  click(document, '[data-activate-routine="r2"]');
  assert.equal(document.querySelector('#routine-list .routine-card').dataset.routineId, 'r2');
  assert.equal(list.querySelector('[data-carousel-position="0"]').dataset.routineId, 'r2');
  assert.equal(document.querySelector('#routine-carousel-count').textContent, '01 / 02');
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

test('mobile touch can move both home cards while keeping mobile positions bounded and separate', () => {
  const { window, document, localStorage } = loadApp({ userProfile:{ name:'Δημήτρης', birthdate:'1990-01-01', avatar:'custom', customImage:'' } });
  Object.defineProperty(window, 'innerWidth', { value:390, configurable:true });
  Object.defineProperty(window, 'innerHeight', { value:640, configurable:true });
  const shell = document.querySelector('.home-shell');
  const profileCard = document.querySelector('#home-profile-card');
  const routineCard = document.querySelector('#home-routine-card');
  Object.defineProperties(shell, { clientWidth:{ value:390 }, scrollHeight:{ value:844 } });
  shell.getBoundingClientRect = () => ({ left:0, top:0 });
  Object.defineProperties(profileCard, { offsetLeft:{ value:90 }, offsetTop:{ value:500 }, offsetWidth:{ value:280 }, offsetHeight:{ value:100 } });
  Object.defineProperties(routineCard, { offsetLeft:{ value:25 }, offsetTop:{ value:80 }, offsetWidth:{ value:340 }, offsetHeight:{ value:300 } });
  const touch = (target, type, pointerId, x, y) => {
    const event = new document.defaultView.Event(type, { bubbles:true, cancelable:true });
    Object.defineProperties(event, {
      pointerId:{ value:pointerId }, pointerType:{ value:'touch' }, button:{ value:0 },
      clientX:{ value:x }, clientY:{ value:y }
    });
    target.dispatchEvent(event);
  };

  touch(profileCard, 'pointerdown', 11, 20, 20);
  touch(profileCard, 'pointermove', 11, 2000, 2000);
  touch(profileCard, 'pointerup', 11, 2000, 2000);
  touch(routineCard.querySelector('.home-routine-head'), 'pointerdown', 12, 20, 20);
  touch(routineCard, 'pointermove', 12, 2000, 2000);
  touch(routineCard, 'pointerup', 12, 2000, 2000);

  assert.deepEqual(JSON.parse(localStorage.getItem('homeProfileCardPositionMobile')), { x:1, y:1 });
  assert.deepEqual(JSON.parse(localStorage.getItem('homeRoutineCardPositionMobile')), { x:1, y:1 });
  assert.equal(Number(profileCard.dataset.x), 4);
  assert.equal(Number(profileCard.dataset.y), 24);
  assert.equal(Number(routineCard.dataset.x), 9);
  assert.equal(Number(routineCard.dataset.y), 244);
  assert.equal(localStorage.getItem('homeProfileCardPosition'), null);
  assert.equal(localStorage.getItem('homeRoutineCardPosition'), null);
});

test('mobile home styling keeps quote rotation, compact athlete card and bounded routine growth', () => {
  assert.match(styles, /html\s*\{[^}]*overflow-x:clip;/);
  assert.match(styles, /html:has\(#home-view\.active\),body:has\(#home-view\.active\)\s*\{\s*scrollbar-width:none;/);
  assert.match(styles, /html:has\(#home-view\.active\)::\-webkit-scrollbar,body:has\(#home-view\.active\)::\-webkit-scrollbar\s*\{\s*width:0;\s*height:0;/);
  assert.match(styles, /\.home-shell\s*\{[^}]*max-width:100vw;[^}]*overflow-x:clip;[^}]*overflow-y:visible;/);
  assert.match(styles, /\.daily-quote\s*\{[^}]*width:calc\(100% - 8px\);[^}]*transform:rotate\(\.8deg\);/);
  assert.match(styles, /\.home-profile-card\s*\{[^}]*width:min\(76vw,280px\);[^}]*padding:12px;/);
  assert.match(styles, /\.home-routine-card\s*\{[^}]*max-height:min\(68vh,560px\);/);
  assert.match(styles, /\.home-routine-days\s*\{\s*max-height:min\(var\(--routine-list-height,49px\),42vh,294px\);/);
});

test('desktop home program paper grows with its workout list without an internal scrollbar', () => {
  assert.match(styles, /@media\(min-width:701px\)\s*\{\.home-routine-days\s*\{max-height:none;overflow:visible\}\}/);
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
  assert.equal(document.querySelectorAll('#plan-list .day-card').length, 1, 'an unordered empty routine shows one empty state instead of numbered day slots');
});

test('a routine without declared weekdays hides day order and assigns internal slots automatically', () => {
  const { document, localStorage } = loadApp();
  setValue(document, '#routine-name', 'Floating Pull Push', 'input');
  setValue(document, '#routine-cycle-length', '8', 'input');
  document.querySelector('#routine-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const routine = JSON.parse(localStorage.getItem('trainingRoutines')).at(-1);
  assert.equal(routine.usesWeekdays, false);
  assert.equal(document.querySelector('#plan-day-field').classList.contains('hidden'), true);
  assert.equal(document.querySelector('#plan-form-title').textContent, 'Νέα προπόνηση');
  assert.equal(document.querySelector('#plan-form').textContent.includes('Ημέρα μικρόκυκλου'), false);
});

test('weekday display can be explicitly enabled when creating a routine', () => {
  const { document, localStorage } = loadApp();
  const enabled = document.querySelector('#routine-form input[name="routine-weekdays"][value="true"]');
  enabled.checked = true;
  setValue(document, '#routine-name', 'Calendar Rotation', 'input');
  document.querySelector('#routine-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const routine = JSON.parse(localStorage.getItem('trainingRoutines')).at(-1);
  assert.equal(routine.usesWeekdays, true);
  assert.equal(document.querySelector('#plan-day-label').textContent, 'Ημέρα');
  assert.deepEqual([...document.querySelectorAll('#plan-day option')].map(option => option.textContent), ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή']);
});

test('a weekday is hidden after it is assigned in a seven-day routine', () => {
  const { document } = loadApp({ trainingRoutines:[{ id:'r1', name:'Calendar', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:true, plan:[] }] });
  setValue(document, '#workout-name', 'Push', 'input');
  document.querySelectorAll('.builder-name').forEach((input, index) => { input.value = `Exercise ${index + 1}`; });
  document.querySelector('#plan-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const weekdays = [...document.querySelectorAll('#plan-day option')].map(option => option.textContent);
  assert.equal(weekdays.includes('Δευτέρα'), false);
  assert.deepEqual(weekdays, ['Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή']);
});

test('an eight-day routine keeps all seven weekday choices and allows repeats', () => {
  const { document, localStorage } = loadApp({ trainingRoutines:[{ id:'r1', name:'Long Calendar', isActive:true, cycleLength:8, cycleAnchorDate:'2026-07-06', usesWeekdays:true, plan:[] }] });
  const expected = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
  assert.deepEqual([...document.querySelectorAll('#plan-day option')].map(option => option.textContent), expected);

  for (const [index, workoutName] of ['First Monday', 'Second Monday'].entries()) {
    setValue(document, '#plan-day', 'Δευτέρα');
    setValue(document, '#workout-name', workoutName, 'input');
    document.querySelectorAll('.builder-name').forEach((input, index) => { input.value = `${workoutName} Exercise ${index + 1}`; });
    document.querySelector('#plan-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
    const remaining = [...document.querySelectorAll('#plan-day option')].map(option => option.textContent);
    assert.deepEqual(remaining, index === 0 ? expected : expected.slice(1));
  }

  const plan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.deepEqual([...new Set(plan.map(item => item.cycleDay))], [1, 2]);
  assert.ok(plan.every(item => item.day === 'Δευτέρα'));
  assert.deepEqual([...document.querySelectorAll('#plan-list .active-day h3')].map(heading => heading.textContent), ['Δευτέρα', 'Δευτέρα']);
});

test('every weekday is capped at two declarations in 8, 9 and 10-day routines', () => {
  const weekdays = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
  for (const cycleLength of [8, 9, 10]) {
    for (const weekday of weekdays) {
      const plan = [
        planDay(weekday, `${weekday} A`, { cycleDay:1, workoutName:`${weekday} A` }),
        planDay(weekday, `${weekday} B`, { cycleDay:2, workoutName:`${weekday} B` }),
      ];
      const { document } = loadApp({ trainingRoutines:[{ id:`r-${cycleLength}-${weekday}`, name:'Capped', isActive:true, cycleLength, cycleAnchorDate:'2026-07-06', usesWeekdays:true, plan }] });
      const options = [...document.querySelectorAll('#plan-day option')].map(option => option.textContent);
      assert.deepEqual(options, weekdays.filter(day => day !== weekday), `${weekday} must disappear after two uses in a ${cycleLength}-day routine`);
    }
  }
});

test('editing one of two repeated weekdays keeps it selectable and reopens it after a change', () => {
  const plan = [
    planDay('Δευτέρα', 'Bench Press', { cycleDay:1, workoutName:'Monday A' }),
    planDay('Δευτέρα', 'Row', { cycleDay:2, workoutName:'Monday B' }),
  ];
  const { document } = loadApp({ trainingRoutines:[{ id:'r1', name:'Editable', isActive:true, cycleLength:8, cycleAnchorDate:'2026-07-06', usesWeekdays:true, plan }] });
  assert.equal([...document.querySelectorAll('#plan-day option')].some(option => option.textContent === 'Δευτέρα'), false);
  click(document, '[data-edit-day="1"]');
  assert.equal([...document.querySelectorAll('#plan-day option')].some(option => option.textContent === 'Δευτέρα'), true, 'the weekday being edited remains available');
  setValue(document, '#plan-day', 'Τρίτη');
  document.querySelector('#plan-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  click(document, '#confirm-delete-secondary');
  assert.equal([...document.querySelectorAll('#plan-day option')].some(option => option.textContent === 'Δευτέρα'), true, 'Monday reopens after one declaration moves to Tuesday');
});

test('the save handler rejects a third declaration even if the weekday cap UI is bypassed', () => {
  const plan = [
    planDay('Δευτέρα', 'Bench Press', { cycleDay:1, workoutName:'Monday A' }),
    planDay('Δευτέρα', 'Row', { cycleDay:2, workoutName:'Monday B' }),
  ];
  const { document, localStorage } = loadApp({ trainingRoutines:[{ id:'r1', name:'Guarded', isActive:true, cycleLength:10, cycleAnchorDate:'2026-07-06', usesWeekdays:true, plan }] });
  const forcedMonday = document.createElement('option');
  forcedMonday.value = 'Δευτέρα';
  forcedMonday.textContent = 'Δευτέρα';
  document.querySelector('#plan-day').append(forcedMonday);
  setValue(document, '#plan-day', 'Δευτέρα');
  setValue(document, '#workout-name', 'Third Monday', 'input');
  document.querySelectorAll('.builder-name').forEach((input, index) => { input.value = `Forced ${index + 1}`; });
  document.querySelector('#plan-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  const storedPlan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.equal(new Set(storedPlan.map(item => item.cycleDay)).size, 2);
  assert.match(document.querySelector('#toast').textContent, /δύο φορές/);
});

test('weekday routines stop accepting declarations when all cycle slots are filled', () => {
  const weekdays = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
  for (const cycleLength of [8, 9, 10]) {
    const plan = Array.from({ length:cycleLength }, (_, index) => planDay(weekdays[index % 7], `Exercise ${index + 1}`, { cycleDay:index + 1, workoutName:`Workout ${index + 1}` }));
    const { document } = loadApp({ trainingRoutines:[{ id:`r-${cycleLength}`, name:'Full', isActive:true, cycleLength, cycleAnchorDate:'2026-07-06', usesWeekdays:true, plan }] });
    const onlyOption = document.querySelector('#plan-day option');
    assert.equal(onlyOption.disabled, true);
    assert.equal(onlyOption.textContent, 'Έχουν δηλωθεί όλες οι προπονήσεις');
  }
});

test('an unordered routine stores workouts without exposing day numbers', () => {
  const { document, localStorage } = loadApp({ trainingRoutines:[{ id:'r1', name:'Floating', isActive:true, cycleLength:8, cycleAnchorDate:'2026-07-06', usesWeekdays:false, plan:[] }] });
  for (const workoutName of ['Push', 'Pull']) {
    setValue(document, '#workout-name', workoutName, 'input');
    document.querySelectorAll('.builder-name').forEach((input, index) => { input.value = `${workoutName} Exercise ${index + 1}`; });
    document.querySelector('#plan-form').dispatchEvent(new document.defaultView.Event('submit', { bubbles:true, cancelable:true }));
  }
  const plan = JSON.parse(localStorage.getItem('trainingRoutines'))[0].plan;
  assert.deepEqual([...new Set(plan.map(item => item.cycleDay))], [1, 2]);
  assert.ok(plan.every(item => item.day === null));
  assert.equal(document.querySelector('#plan-day-field').classList.contains('hidden'), true);
  assert.deepEqual([...document.querySelectorAll('#plan-list .active-day h3')].map(heading => heading.textContent), ['Push', 'Pull']);
  assert.deepEqual([...document.querySelectorAll('#workout-day-select option')].map(option => option.textContent), ['Push', 'Pull']);
  assert.equal(document.querySelector('#plan-list').textContent.includes('Ημέρα 1'), false);
});

test('the log workout selector shows only workout names for weekday routines', () => {
  const routine = [{
    id:'r1', name:'Calendar', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:true,
    plan:[
      planDay('Δευτέρα', 'Bench Press', { cycleDay:1, workoutName:'Upper A' }),
      planDay('Τρίτη', 'Squat', { cycleDay:2, workoutName:'Lower A' }),
    ],
  }];
  const { document } = loadApp({ trainingRoutines:routine });
  setValue(document, '#log-date', '2026-07-08');
  assert.deepEqual([...document.querySelectorAll('#workout-day-select option:not([hidden])')].map(option => option.textContent), ['Upper A', 'Lower A']);
  assert.equal(document.querySelectorAll('#workout-day-select option[hidden]').length, 1);
  assert.equal(document.querySelector('#workout-day-select').value, '3');
});

test('the scheduled log shows the routine name as a plain stamp without the session prompt', () => {
  const { document } = loadApp({
    trainingRoutines:[{
      id:'r1', name:'Push/Pull Δοκιμής', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:true,
      plan:[planDay('Τρίτη', 'Squat', { cycleDay:2, workoutName:'Lower A' })],
    }],
  });
  setValue(document, '#log-date', '2026-07-07');
  const intro = document.querySelector('#scheduled-session .session-intro');
  assert.equal(intro.querySelector('.active-routine-label').textContent, 'Push/Pull Δοκιμής');
  assert.equal(intro.querySelector('p'), null);
  assert.doesNotMatch(intro.textContent, /★|Συμπληρώστε όσα πραγματικά εκτελέσατε/);
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
  assert.ok(panel.includes('65 kg · 8 επαν.'), 'latest performance shows weight and reps');
});

test('progress chart shows every date label with room to breathe', () => {
  const mkSession = (id, date, weight) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 8, weight, weightMode: 'kg', plates: null }] }] });
  const sessions = Array.from({ length: 11 }, (_, i) => mkSession(`s${i}`, `2026-05-${String(i + 1).padStart(2, '0')}`, 50 + i * 2.5));
  const { document } = loadApp({ trainingSessions: sessions });
  click(document, '.nav-button[data-view="progress"]');
  const dates = [...document.querySelectorAll('#progress-panel .chart-date')].map(t => Number(t.getAttribute('x'))).sort((a, b) => a - b);
  assert.strictEqual(dates.length, sessions.length, 'every recorded date should get a label');
  const gaps = dates.slice(1).map((value, i) => value - dates[i]);
  gaps.forEach(gap => assert.ok(gap >= 40, `label gap too tight (${gap})`));
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

test('bodyweight and bodyweight+extra sessions chart together as extra-kg progress', () => {
  const mk = (id, date, set) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Pull Up', comments: '', sets: [set] }] });
  const { document } = loadApp({ trainingSessions: [
    mk('b1', '2026-06-01', { reps: 8, weightMode: 'bodyweight' }),
    mk('b2', '2026-06-08', { reps: 8, weight: 5, weightMode: 'bodyweight_extra' }),
  ] });
  click(document, '.nav-button[data-view="progress"]');
  const panel = document.querySelector('#progress-panel').innerHTML;
  assert.ok(panel.includes('class="chart-line"'), 'both bodyweight modes chart on one line');
  assert.ok(!panel.includes('recording-warning'), 'no session is excluded');
  assert.ok(panel.includes('Σωματικό βάρος + 5 kg'), 'extra kg shows on the point details');
});

test('plates and plates+kg sessions chart together on the plates scale', () => {
  const mk = (id, date, set) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Dip', comments: '', sets: [set] }] });
  const { document } = loadApp({ trainingSessions: [
    mk('p1', '2026-06-01', { reps: 8, plates: 4, weight: null, weightMode: 'plates' }),
    mk('p2', '2026-06-08', { reps: 8, plates: 4, weight: 2.5, weightMode: 'mixed' }),
  ] });
  click(document, '.nav-button[data-view="progress"]');
  const panel = document.querySelector('#progress-panel').innerHTML;
  assert.ok(panel.includes('class="chart-line"'), 'both plate modes chart on one line');
  assert.ok(!panel.includes('recording-warning'), 'no session is excluded');
  const dotY = [...document.querySelectorAll('#progress-panel .chart-dot')].map(dot => Number(dot.getAttribute('cy')));
  assert.ok(dotY[1] < dotY[0], 'adding extra kg on the same plates plots as a rise');
  assert.ok(panel.includes('+ 2.5 kg'), 'extra kg shows on the point details');
});

test('a rep drop alongside a weight increase is not flagged as decline', () => {
  const mk = (id, date, weight, reps) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Row', comments: '', sets: [{ reps, weight, weightMode: 'kg', plates: null }] }] });
  const { document } = loadApp({ trainingSessions: [mk('r1', '2026-07-01', 50, 9), mk('r2', '2026-07-08', 50.5, 8)] });
  click(document, '.nav-button[data-view="progress"]');
  const panel = document.querySelector('#progress-panel').innerHTML;
  assert.ok(!panel.includes('progress-alert'), 'weight went up — no decline alert for the rep drop');
  assert.ok(panel.includes('50.5 kg · 8 επαν.'), 'latest point keeps weight and reps in its details');
  assert.ok(!panel.includes('επαναλήψεις</span>'), 'no reps chip on a weight-based chart');
});

test('equal weight with fewer reps shows neither progress nor decline', () => {
  const mk = (id, date, reps) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Row', comments: '', sets: [{ reps, weight: 50, weightMode: 'kg', plates: null }] }] });
  const { document } = loadApp({ trainingSessions: [mk('r1', '2026-07-01', 10), mk('r2', '2026-07-08', 9)] });
  click(document, '.nav-button[data-view="progress"]');
  const panel = document.querySelector('#progress-panel').innerHTML;
  assert.ok(!panel.includes('progress-alert'), 'a rep change alone is not a decline');
  assert.ok(panel.includes('9 επαν.'), 'reps stay available on the point tooltip');
});

test('progress chart fits the panel without horizontal scrolling', () => {
  const mkSession = (id, date, weight) => ({ id, date, type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 8, weight, weightMode: 'kg', plates: null }] }] });
  const sessions = Array.from({ length: 16 }, (_, i) => mkSession(`s${i}`, `2026-05-${String(i + 1).padStart(2, '0')}`, 50 + i * 2.5));
  const { document } = loadApp({ trainingSessions: sessions });
  click(document, '.nav-button[data-view="progress"]');
  const svg = document.querySelector('#progress-panel svg.progress-chart');
  assert.ok(!svg.hasAttribute('style'), 'svg no longer forces a fixed pixel width');
  const viewWidth = Number(svg.getAttribute('viewBox').split(' ')[2]);
  assert.ok(viewWidth <= 900, `viewBox width (${viewWidth}) stays within the panel fallback width`);
  const rotated = [...svg.querySelectorAll('.chart-date')].every(t => (t.getAttribute('transform') || '').includes('rotate'));
  assert.ok(rotated, 'date labels are angled so all of them fit');
  assert.strictEqual(svg.querySelectorAll('.chart-date').length, sessions.length, 'every date keeps its label');
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
  assert.equal(document.querySelector('#routine-form > label').childNodes[0].textContent, 'Routine name');
  assert.match(document.querySelector('#routine-form .secondary-button').textContent, /Create/);
  assert.equal(document.querySelector('[data-language="en"]').getAttribute('aria-pressed'), 'true');
  assert.equal(localStorage.getItem('logbookLanguage'), 'en');

  click(document, '[data-language="fr"]');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Historique');
  click(document, '[data-language="de"]');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Verlauf');
  click(document, '[data-language="el"]');
  assert.equal(document.querySelector('.nav-button[data-view="overview"]').textContent, 'Ιστορικό');
  assert.equal(document.querySelector('#routine-form > label').childNodes[0].textContent, 'Όνομα προγράμματος');
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

test('sync repair promotes the program that owns workout history over an empty default program', () => {
  const routines = [
    { id:'r1', name:'Push Pull Test', isActive:false, plan:rewardPlan() },
    { id:'placeholder', name:'Το πρόγραμμά μου', isActive:true, plan:[] },
  ];
  const thirteenWeeks = Array.from({ length:13 }, (_, index) => index - 12);
  const { document, localStorage } = loadApp({ trainingRoutines:routines, trainingSessions:rewardSessions(thirteenWeeks) });
  const saved = JSON.parse(localStorage.getItem('trainingRoutines'));
  assert.equal(saved.find(routine => routine.id === 'r1').isActive, true);
  assert.equal(saved.find(routine => routine.id === 'placeholder').isActive, false);
  assert.equal(document.querySelector('#home-reward-label').textContent, 'GYMRAT');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-4'));
});

test('sync repair rebuilds an emptied plan from the routine workout history so rewards return', () => {
  const thirteenWeeks = Array.from({ length:13 }, (_, index) => index - 12);
  const emptied = [{ id:'r1', name:'Push Pull Test', isActive:true, cycleLength:7, plan:[] }];
  const { document, localStorage } = loadApp({ trainingRoutines:emptied, trainingSessions:rewardSessions(thirteenWeeks) });
  const repaired = JSON.parse(localStorage.getItem('trainingRoutines')).find(routine => routine.id === 'r1');
  assert.deepEqual([...new Set(repaired.plan.map(item => item.cycleDay))].sort((a, b) => a - b), [1, 3, 5]);
  assert.equal(document.querySelector('#home-reward-label').textContent, 'GYMRAT');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-4'));
  assert.ok(!document.querySelector('#home-reward-stamp').classList.contains('hidden'));
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

test('a second workout cannot be logged on an already occupied date', () => {
  const existing = { id:'s1', date:'2026-07-06', type:'free', comments:'', exercises:[{ exercise:'Squat', comments:'', sets:[{ reps:5, weight:100, weightMode:'kg', plates:null }] }] };
  const { document, localStorage } = loadApp({ trainingSessions:[existing] });
  setValue(document, '#log-date', existing.date);
  click(document, '[data-mode="free"]');
  const card = document.querySelector('#free-exercises [data-exercise]');
  card.querySelector('.exercise-name').value = 'Dips';
  card.querySelectorAll('[data-set]').forEach(row => {
    row.querySelector('.set-reps').value = '10';
    row.querySelector('.set-weight').value = '0';
  });

  click(document, '#save-session');

  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), [existing]);
  assert.equal(document.querySelector('#toast').textContent, 'Υπάρχει ήδη καταγεγραμμένη προπόνηση για αυτή την ημέρα.');
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

test('editing a session cannot move it onto an occupied date', () => {
  const first = { id:'s1', date:'2026-07-06', type:'free', comments:'First', exercises:[{ exercise:'Squat', comments:'', sets:[{ reps:5, weight:100, weightMode:'kg', plates:null }] }] };
  const second = { id:'s2', date:'2026-07-07', type:'free', comments:'Second', exercises:[{ exercise:'Dips', comments:'', sets:[{ reps:10, weightMode:'bodyweight' }] }] };
  const { document, localStorage } = loadApp({ trainingSessions:[first, second] });

  click(document, '[data-edit-session="s1"]');
  setValue(document, '#log-date', second.date);
  click(document, '#save-session');

  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), [first, second]);
  assert.equal(document.querySelector('#toast').textContent, 'Υπάρχει ήδη καταγεγραμμένη προπόνηση για αυτή την ημέρα.');
});

test('copying a history session creates a new workout for today and preserves the original', () => {
  const session = { id:'s1', date:'2026-07-06', type:'scheduled', routineId:'r1', cycleDay:1, workoutDay:'Δευτέρα', workoutName:'Push Day', comments:'Original notes', exercises:[{ exercise:'Bench Press', planExerciseId:'p1', comments:'Pause', sets:[{ reps:8, weight:60, weightMode:'kg', plates:null }] }] };
  const { document, localStorage } = loadApp({
    trainingRoutines:routineWith([planDay('Δευτέρα', 'Bench Press', { id:'p1', cycleDay:1, workoutName:'Push Day' })]),
    trainingSessions:[session],
  });
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  click(document, '.nav-button[data-view="overview"]');
  click(document, '[data-copy-session="s1"]');

  assert.ok(document.querySelector('#log-view').classList.contains('active'));
  assert.equal(document.querySelector('#log-date').value, todayValue);
  assert.equal(document.querySelector('#save-session').textContent, 'Ολοκλήρωση προπόνησης');
  assert.equal(document.querySelector('#cancel-session-edit').textContent, 'Ακύρωση αντιγραφής');
  assert.equal(document.querySelector('#scheduled-session .set-reps').value, '8');

  click(document, '[data-language="en"]');
  assert.equal(document.querySelector('#cancel-session-edit').textContent, 'Cancel copy');
  assert.equal(document.querySelector('#save-session').textContent, 'Complete workout');
  assert.equal(document.querySelector('#scheduled-session .session-intro p').textContent, 'Adjust what you completed today, then finish the new workout.');

  document.querySelector('#scheduled-session .set-reps').value = '9';
  click(document, '#save-session');

  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  const original = sessions.find(item => item.id === 's1');
  const duplicate = sessions.find(item => item.id !== 's1');
  assert.equal(sessions.length, 2);
  assert.deepEqual(original, session, 'the source history entry remains unchanged');
  assert.ok(duplicate, 'a second session is created');
  assert.equal(duplicate.date, todayValue);
  assert.equal(duplicate.workoutName, 'Push Day');
  assert.equal(duplicate.routineId, 'r1');
  assert.equal(duplicate.cycleDay, 1);
  assert.equal(duplicate.exercises[0].sets[0].reps, 9);
});

test('copying keeps the source workout when the selected date has a different planned workout', () => {
  const source = { id:'source', date:'2026-07-06', type:'scheduled', routineId:'r1', cycleDay:1, workoutDay:'Δευτέρα', workoutName:'Upper A', comments:'Source notes', exercises:[{ exercise:'Bench Press', planExerciseId:'upper', comments:'Pause', sets:[{ reps:8, weight:60, weightMode:'kg', plates:null }] }] };
  const { document, localStorage } = loadApp({
    trainingRoutines:[{
      id:'r1', name:'Alternating', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:true,
      plan:[
        planDay('Δευτέρα', 'Bench Press', { id:'upper', cycleDay:1, workoutName:'Upper A' }),
        planDay('Τρίτη', 'Squat', { id:'lower', cycleDay:2, workoutName:'Lower B' }),
      ],
    }],
    trainingSessions:[source],
  });

  click(document, '[data-copy-session="source"]');
  setValue(document, '#log-date', '2026-07-07');

  assert.equal(document.querySelector('#scheduled-session h2').textContent, 'Upper A');
  assert.equal(document.querySelector('#scheduled-session .workout-exercise h3').textContent, 'Bench Press');
  assert.equal(document.querySelector('#scheduled-session .set-reps').value, '8');

  click(document, '#save-session');

  const sessions = JSON.parse(localStorage.getItem('trainingSessions'));
  const duplicate = sessions.find(item => item.id !== 'source');
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.find(item => item.id === 'source'), source);
  assert.equal(duplicate.date, '2026-07-07');
  assert.equal(duplicate.workoutName, 'Upper A');
  assert.equal(duplicate.cycleDay, 1);
  assert.equal(duplicate.exercises[0].exercise, 'Bench Press');
});

test('copying a workout is blocked when today already has a logged session', () => {
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const source = { id:'source', date:'2026-07-06', type:'free', comments:'', exercises:[{ exercise:'Squat', comments:'', sets:[{ reps:5, weight:100, weightMode:'kg', plates:null }] }] };
  const todaySession = { id:'today', date:todayValue, type:'free', comments:'', exercises:[{ exercise:'Dips', comments:'', sets:[{ reps:10, weightMode:'bodyweight' }] }] };
  const { document, localStorage } = loadApp({ trainingSessions:[source, todaySession] });

  click(document, '[data-copy-session="source"]');
  click(document, '#save-session');

  assert.deepEqual(JSON.parse(localStorage.getItem('trainingSessions')), [source, todaySession]);
  assert.equal(document.querySelector('#toast').textContent, 'Υπάρχει ήδη καταγεγραμμένη προπόνηση για αυτή την ημέρα.');
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

test('working sets are removable after confirmation and renumbered', () => {
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
  assert.equal(document.querySelector('#exercise-delete-message').textContent, 'Είστε σίγουροι ότι θέλετε να πραγματοποιηθεί αφαίρεση του εργάσιμου σετ ;');
  assert.equal(document.querySelectorAll('#scheduled-session [data-set]').length, 4, 'set remains until confirmation');
  click(document, '#confirm-delete-accept');
  numbers = [...document.querySelectorAll('#scheduled-session .set-number')].map(el => el.textContent);
  assert.deepEqual(numbers, ['01', '02', '03']);

  click(document, '#scheduled-session [data-set] .remove-set');
  click(document, '#confirm-delete-accept');
  numbers = [...document.querySelectorAll('#scheduled-session .set-number')].map(el => el.textContent);
  assert.deepEqual(numbers, ['01', '02']);
  assert.equal(document.querySelector('#scheduled-session .planned-tag').textContent, '2 σετ');
  assert.equal(document.querySelector('#scheduled-session [data-set] .set-reps').getAttribute('aria-label'), 'Επαναλήψεις σετ 1');
});

test('free-session set removal updates its set counter and keeps one minimum set', () => {
  const { document } = loadApp();
  click(document, '[data-mode="free"]');
  const card = document.querySelector('#free-exercises [data-exercise]');
  click(document, card.querySelector('.remove-set'));
  click(document, '#confirm-delete-accept');
  assert.equal(card.querySelectorAll('[data-set]').length, 2);
  assert.equal(card.querySelector('.free-set-count').value, '2');
  click(document, card.querySelector('.remove-set'));
  click(document, '#confirm-delete-accept');
  click(document, card.querySelector('.remove-set'));
  assert.equal(card.querySelectorAll('[data-set]').length, 1);
  assert.equal(document.querySelector('#exercise-delete-dialog').open, false, 'last set is protected without opening confirmation');
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
  assert.equal(document.querySelector('#toast').textContent, 'Το «B» είναι τώρα ενεργό');
  assert.doesNotMatch(document.querySelector('#toast').textContent, /★/);
});

test('profile form submit persists the profile and updates the menu identity', () => {
  const { document, localStorage } = loadApp();
  assert.ok(document.querySelector('#profile-save').classList.contains('hidden'));
  assert.equal(document.querySelectorAll('[name="profile-avatar"]').length, 0);
  assert.equal(document.querySelectorAll('.avatar-option').length, 0);
  assert.ok(document.querySelector('#profile-avatar-upload'));
  assert.equal(document.querySelector('#profile-weight'), null);
  assert.equal(document.querySelector('#profile-preview-weight'), null);
  setValue(document, '#profile-name', 'Δημήτρης', 'input');
  setValue(document, '#profile-birthdate', '1990-01-01', 'input');
  assert.ok(!document.querySelector('#profile-save').classList.contains('hidden'));
  document.querySelector('#profile-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles: true, cancelable: true }));
  const profile = JSON.parse(localStorage.getItem('userProfile'));
  assert.equal(profile.name, 'Δημήτρης');
  assert.equal(profile.weight, undefined);
  assert.equal(profile.hideAge, false);
  assert.deepEqual(profile.imageGallery, []);
  assert.equal(profile.avatar, 'custom');
  assert.equal(document.querySelector('#menu-profile-name').textContent, 'Δημήτρης');
  assert.equal(document.querySelector('#profile-status').textContent, '');
  assert.ok(document.querySelector('#profile-status').classList.contains('hidden'));
  assert.ok(document.querySelector('#profile-save').classList.contains('hidden'));
  assert.equal(document.querySelector('#home-profile-name').textContent, 'Δημήτρης');
  assert.ok(!document.querySelector('#home-profile-card').classList.contains('hidden'));
  assert.equal(document.querySelector('#toast').textContent, 'Το προφίλ αποθηκεύτηκε');
});

test('profile save appears only while the draft differs from the saved profile', () => {
  const profile = { name:'Δημήτρης', birthdate:'1990-01-01', avatar:'custom', customImage:'', hideAge:false, imageGallery:[] };
  const { document } = loadApp({ userProfile:profile });
  const save = document.querySelector('#profile-save');

  assert.ok(save.classList.contains('hidden'));
  setValue(document, '#profile-birthdate', '2000-02-02', 'input');
  assert.ok(!save.classList.contains('hidden'));
  setValue(document, '#profile-birthdate', profile.birthdate, 'input');
  assert.ok(save.classList.contains('hidden'));
  assert.equal(document.querySelector('#profile-form').dataset.dirty, 'false');
});

test('profile drafts stay unsaved and are discarded after leaving the profile view', () => {
  const savedProfile = { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' };
  const { document, localStorage } = loadApp({ userProfile:savedProfile });
  click(document, '.nav-button[data-view="profile"]');
  setValue(document, '#profile-name', 'Πρόχειρο όνομα', 'input');
  setValue(document, '#profile-birthdate', '2000-02-02', 'input');

  assert.deepEqual(JSON.parse(localStorage.getItem('userProfile')), savedProfile);
  assert.equal(document.querySelector('#profile-status').textContent, 'ΜΗ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ');
  assert.equal(document.querySelector('#menu-profile-name').textContent, 'Δημήτρης');
  assert.equal(document.querySelector('#home-profile-name').textContent, 'Δημήτρης');

  click(document, '.nav-button[data-view="home"]');
  click(document, '.nav-button[data-view="profile"]');
  assert.equal(document.querySelector('#profile-name').value, 'Δημήτρης');
  assert.equal(document.querySelector('#profile-birthdate').value, '1990-01-01');
  assert.equal(document.querySelector('#profile-status').textContent, '');
  assert.ok(document.querySelector('#profile-status').classList.contains('hidden'));
});

test('an unfinished new profile is cleared without creating stored profile data', () => {
  const { document, localStorage } = loadApp();
  click(document, '.nav-button[data-view="profile"]');
  setValue(document, '#profile-name', 'Πρόχειρο όνομα', 'input');
  setValue(document, '#profile-birthdate', '2000-02-02', 'input');
  click(document, '.nav-button[data-view="home"]');
  click(document, '.nav-button[data-view="profile"]');

  assert.equal(localStorage.getItem('userProfile'), null);
  assert.equal(document.querySelector('#profile-name').value, '');
  assert.equal(document.querySelector('#profile-birthdate').value, '');
  assert.equal(document.querySelector('#profile-status').textContent, 'ΝΕΟ ΠΡΟΦΙΛ');
});

test('hiding the age removes the stat from the card and persists with the profile', () => {
  const { document, localStorage } = loadApp({ userProfile:{ name:'Δημήτρης', birthdate:'1990-01-01', avatar:'custom', customImage:'', hideAge:false, imageGallery:[] } });
  click(document, '.nav-button[data-view="profile"]');
  assert.ok(!document.querySelector('#profile-card-stats').classList.contains('hidden'));
  assert.equal(document.querySelector('#profile-preview-age-unit').textContent, 'έτη');
  click(document, '#profile-age-button');
  assert.ok(!document.querySelector('#profile-date-slip').classList.contains('hidden'));
  const hide = document.querySelector('#profile-hide-age');
  hide.checked = true;
  hide.dispatchEvent(new (document.defaultView.Event)('change', { bubbles:true }));
  assert.ok(document.querySelector('#profile-card-stats').classList.contains('hidden'));
  document.querySelector('#profile-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles:true, cancelable:true }));
  assert.equal(JSON.parse(localStorage.getItem('userProfile')).hideAge, true);
  assert.equal(JSON.parse(localStorage.getItem('userProfile')).birthdate, '1990-01-01');
});

test('the photo slip lists uploaded images and selecting one updates the saved card', () => {
  const gallery = ['data:image/jpeg;base64,AAA', 'data:image/jpeg;base64,BBB'];
  const { document, localStorage } = loadApp({ userProfile:{ name:'Δημήτρης', birthdate:'1990-01-01', avatar:'custom', customImage:gallery[0], imageGallery:gallery } });
  click(document, '.nav-button[data-view="profile"]');
  click(document, '#profile-photo-button');
  assert.ok(!document.querySelector('#profile-photo-slip').classList.contains('hidden'));
  const cells = [...document.querySelectorAll('.profile-photo-cell')];
  assert.equal(cells.length, 2);
  assert.ok(cells[0].classList.contains('selected'));
  click(document, '.profile-photo-cell[data-gallery-index="1"]');
  assert.equal(document.querySelector('#profile-preview-image').getAttribute('src'), gallery[1]);
  assert.equal(document.querySelector('#profile-status').textContent, 'ΜΗ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ');
  document.querySelector('#profile-form').dispatchEvent(new (document.defaultView.Event)('submit', { bubbles:true, cancelable:true }));
  const saved = JSON.parse(localStorage.getItem('userProfile'));
  assert.equal(saved.customImage, gallery[1]);
  assert.deepEqual(saved.imageGallery, gallery);
});

test('the unsaved profile status follows the selected interface language', () => {
  const { document, window } = loadApp({ userProfile:{ name:'Dimitris', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' } });
  click(document, '[data-language="en"]');
  setValue(document, '#profile-birthdate', '2000-02-02', 'input');
  window.LogbookI18n.translate(document);
  assert.equal(document.querySelector('#profile-status').textContent, 'UNSAVED CHANGES');
});

test('editing core form drafts does not persist data before an explicit save action', () => {
  const profile = { name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' };
  const routine = routineWith([planDay('Δευτέρα', 'Bench Press')]);
  const session = { id:'s1', date:'2026-07-06', type:'free', comments:'', exercises:[{ exercise:'Squat', comments:'', sets:[{ reps:5, weight:100, weightMode:'kg' }] }] };
  const { document, localStorage } = loadApp({ userProfile:profile, trainingRoutines:routine, trainingSessions:[session] });
  const before = {
    userProfile:localStorage.getItem('userProfile'),
    trainingRoutines:localStorage.getItem('trainingRoutines'),
    trainingSessions:localStorage.getItem('trainingSessions'),
  };

  setValue(document, '#routine-name', 'Πρόχειρο πρόγραμμα', 'input');
  setValue(document, '#exercise-count', '3', 'input');
  setValue(document, '#profile-birthdate', '2000-02-02', 'input');
  click(document, '[data-mode="free"]');
  document.querySelector('#free-exercises .exercise-name').value = 'Πρόχειρη άσκηση';

  assert.deepEqual({
    userProfile:localStorage.getItem('userProfile'),
    trainingRoutines:localStorage.getItem('trainingRoutines'),
    trainingSessions:localStorage.getItem('trainingSessions'),
  }, before);
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

test('overview stamp counts logged workout sessions', () => {
  const session = { id: 's1', date: '2026-07-06', type: 'free', comments: '', exercises: [
    { exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg' }, { reps: 5, weight: 100, weightMode: 'kg' }] },
    { exercise: 'Dips', comments: '', sets: [{ reps: 10, weight: null, weightMode: 'bodyweight' }] },
  ] };
  const { document } = loadApp({ trainingSessions: [session, { ...session, id:'s2' }] });
  click(document, '.nav-button[data-view="overview"]');
  assert.equal(document.querySelector('#history-session-count').textContent, '2');
  assert.equal(document.querySelectorAll('#history-counter .history-counter-label').length, 1);
  assert.equal(document.querySelector('#history-counter').textContent.trim().replace(/\s+/g, ' '), '2 καταγεγραμμένες προπονήσεις');
  assert.equal(document.querySelector('#history-counter .history-counter-shadow'), null, 'the background figure is removed');
  assert.equal(document.querySelector('#metrics'), null, 'the old metric cards are removed');
});

test('history, personal bests and progress empty states show only their guidance sentence', () => {
  const { document } = loadApp();
  click(document, '.nav-button[data-view="overview"]');
  const historyEmpty = document.querySelector('#session-cards .empty');
  const bestsEmpty = document.querySelector('#personal-bests .empty');
  assert.equal(historyEmpty.children.length, 1);
  assert.equal(historyEmpty.firstElementChild.tagName, 'SPAN');
  assert.equal(historyEmpty.textContent, 'Ολοκληρώστε την πρώτη προπόνηση και αρχίστε να χτίζετε το αρχείο σας.');
  assert.equal(bestsEmpty.children.length, 1);
  assert.equal(bestsEmpty.firstElementChild.tagName, 'SPAN');
  assert.equal(bestsEmpty.textContent, 'Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σας.');

  click(document, '.nav-button[data-view="progress"]');
  const progressEmpty = document.querySelector('#progress-panel .empty');
  assert.equal(progressEmpty.children.length, 1);
  assert.equal(progressEmpty.firstElementChild.tagName, 'SPAN');
  assert.equal(progressEmpty.textContent, 'Καταγράψτε τουλάχιστον δύο ίδια σετ για να δείτε πρόοδο.');
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
  assert.doesNotMatch(document.querySelector('.session-page').textContent, /Η ΣΕΛΙΔΑ ΤΗΣ ΠΡΟΠΟΝΗΣΗΣ|ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ|LOGBOOK \/ TRAINING JOURNAL/);
  assert.ok(document.querySelector('.session-page-head').textContent.includes('SESSION No'));
  assert.ok(document.querySelector('.session-page footer button'));
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
  assert.equal(document.querySelector('#log-date').max, today);
  assert.equal(document.querySelector('#profile-birthdate').max, today);
  setValue(document, '#profile-birthdate', today, 'input');
  assert.equal(document.querySelector('#profile-age').textContent, '0');
});

test('a future workout date immediately returns to today', () => {
  const { window, document } = loadApp();
  const today = document.querySelector('#log-date').max;
  const tomorrow = new window.Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  setValue(document, '#log-date', futureDate);
  assert.equal(document.querySelector('#log-date').value, today);
  assert.match(document.querySelector('#toast').textContent, /δεν μπορεί να είναι μεταγενέστερη/);
});

test('a future workout date cannot bypass the save guard', () => {
  const { window, document, localStorage } = loadApp();
  const tomorrow = new window.Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  document.querySelector('#log-date').value = futureDate;
  click(document, '[data-mode="free"]');
  const card = document.querySelector('#free-exercises [data-exercise]');
  card.querySelector('.exercise-name').value = 'Dips';
  card.querySelectorAll('[data-set]').forEach(row => {
    row.querySelector('.set-reps').value = '10';
    row.querySelector('.set-weight').value = '0';
  });
  click(document, '#save-session');
  assert.equal(JSON.parse(localStorage.getItem('trainingSessions') || '[]').length, 0);
  assert.match(document.querySelector('#toast').textContent, /δεν μπορεί να είναι μεταγενέστερη/);
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

test('i18n leaves no Greek UI fragments in translated rendered content', () => {
  const routines = [{
    id:'r1', name:'Routine A', isActive:true, cycleLength:7, cycleAnchorDate:'2026-07-06', usesWeekdays:true,
    plan:[planDay('Δευτέρα', 'Bench Press', { cycleDay:1, workoutName:'Upper A', cues:'Κράτα τον κορμό σταθερό' })],
  }];
  const sessions = [{
    id:'s1', date:'2026-07-06', type:'scheduled', routineId:'r1', workoutDay:'Δευτέρα', workoutName:'Upper A',
    comments:'Καλή ενέργεια', exercises:[{ exercise:'Bench Press', comments:'Παύση στο στήθος', sets:[{ reps:8, weight:72.5, weightMode:'kg' }] }],
  }];
  const { document, window } = loadApp({
    trainingRoutines:routines,
    trainingSessions:sessions,
    userProfile:{ name:'Δημήτρης', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' },
  });
  click(document, '[data-language="en"]');
  ['home','log','plan','overview','progress','profile'].forEach(view => {
    click(document, `.nav-button[data-view="${view}"]`);
    window.LogbookI18n.translate(document);
  });
  click(document, '[data-view-session="s1"] .card-body');
  window.LogbookI18n.translate(document);

  const greek = /[\u0370-\u03ff\u1f00-\u1fff]/;
  const leaks = [];
  const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue.trim().replace(/\s+/g, ' ');
    if (text && greek.test(text) && !node.parentElement?.matches('[data-i18n-user]')) {
      leaks.push(`text: ${text}`);
    }
  }
  document.querySelectorAll('[aria-label],[placeholder],[title]').forEach(element => {
    ['aria-label','placeholder','title'].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value && greek.test(value) && !element.matches('[data-i18n-user]')) {
        leaks.push(`${attribute}: ${value}`);
      }
    });
  });

  assert.deepEqual([...new Set(leaks)], []);
  assert.ok(document.querySelector('.session-page').textContent.includes('NOTES'), 'nested UI labels inside user-content containers are translated');
  assert.ok(document.querySelector('.session-page').textContent.includes('Καλή ενέργεια'), 'the user-authored note remains Greek');
});

test('i18n translates empty and reward setup states in every supported UI language', () => {
  ['en','fr','de'].forEach(language => {
    const { document } = loadApp();
    click(document, `[data-language="${language}"]`);
    assert.doesNotMatch(document.querySelector('#home-reward-label').textContent, /[\u0370-\u03ff\u1f00-\u1fff]/);
    assert.doesNotMatch(document.querySelector('#profile-reward-ring').getAttribute('aria-label'), /[\u0370-\u03ff\u1f00-\u1fff]/);
  });
});

test('a rest day shows only the no-workout heading', () => {
  const { document } = loadApp(); // empty plan → no scheduled workout
  click(document, '.nav-button[data-view="log"]');
  const restState = document.querySelector('#scheduled-session .no-workout');
  assert.equal(restState.children.length, 1);
  assert.equal(restState.firstElementChild.tagName, 'SPAN');
  assert.ok(restState.classList.contains('empty'));
  assert.match(restState.textContent, /Δεν υπάρχει ορισμένη προπόνηση για/);
  assert.equal(restState.querySelector('h2,p,button'), null);
});

test('Escape key closes the side menu', () => {
  const { document, window } = loadApp();
  click(document, '#open-menu');
  assert.equal(document.querySelector('#side-menu').classList.contains('open'), true);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.querySelector('#side-menu').classList.contains('open'), false);
  assert.equal(document.querySelector('#open-menu').getAttribute('aria-expanded'), 'false');
});

test('history strip moves one day at a time and selects logged workouts without markers', () => {
  const dateAt = daysAgo => { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() - daysAgo); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const mk = (id, daysAgo) => ({ id, date:dateAt(daysAgo), type: 'free', comments: '', exercises: [{ exercise: 'Squat', comments: '', sets: [{ reps: 5, weight: 100, weightMode: 'kg' }] }] });
  const { document } = loadApp({ trainingSessions: [mk('s1', 1), mk('s2', 7), mk('s3', 15)] });
  click(document, '.nav-button[data-view="overview"]');
  assert.equal(document.querySelectorAll('#week-strip .day-tile').length, 7);
  assert.equal(document.querySelectorAll('#week-strip .day-tile.done').length, 1);
  assert.equal(document.querySelector('#week-strip i'), null, 'logged days have no circular marker');
  assert.equal(document.querySelector('.history-week-panel').textContent.includes('ΣΥΧΝΟΤΗΤΑ'), false);
  click(document, '#week-strip .day-tile.done');
  assert.equal(document.querySelector('.session-card.history-date-active').dataset.sessionDate, dateAt(1));
  click(document, '[data-history-week-step="1"]');
  assert.equal(document.querySelectorAll('#week-strip .day-tile').length, 7);
  assert.equal(document.querySelector('#week-strip .day-tile.done').dataset.historyDate, dateAt(7), 'one click reveals the day just before the previous window');
  assert.ok(document.querySelector('#week-strip').classList.contains('week-shift-older'));
  assert.equal(document.querySelector('[data-history-week-step="-1"]').disabled, false);
  click(document, '[data-history-week-step="-1"]');
  assert.equal(document.querySelector('#week-strip .day-tile.done').dataset.historyDate, dateAt(1));
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

test('synced scheduled sessions without a legacy type still count toward rewards', () => {
  const sessions = rewardSessions([-3,-2,-1,0]).map(({ type, ...session }) => session);
  const { document } = loadApp({ trainingRoutines:routineWith(rewardPlan()), trainingSessions:sessions });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'NEVER GIVE UP');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-3'));
});

test('synced workout history repairs reward tracking that started after the workouts', () => {
  const thirteenWeeks = Array.from({ length: 13 }, (_, index) => index - 12);
  const staleTracking = { version:1, activeRoutineId:'r1', periods:{ r1:[{ start:rewardDate(0), end:null }] } };
  const { document, window } = loadApp({
    trainingRoutines:routineWith(rewardPlan()),
    trainingSessions:rewardSessions(thirteenWeeks),
    routineRewardTracking:staleTracking,
  });
  assert.equal(document.querySelector('#home-reward-label').textContent, 'GYMRAT');
  assert.ok(document.querySelector('#profile-reward-ring').classList.contains('reward-stage-4'));
  const repaired = JSON.parse(window.localStorage.getItem('routineRewardTracking'));
  assert.equal(repaired.periods.r1[0].start, rewardDate(-12));
});

test('synced active routine change keeps a single open reward period', () => {
  const routines = [
    { id:'r1', name:'Previous', isActive:false, plan:rewardPlan() },
    { id:'r2', name:'Current', isActive:true, plan:rewardPlan() },
  ];
  const staleTracking = { version:1, activeRoutineId:'r1', periods:{ r1:[{ start:rewardDate(-2), end:null }], r2:[] } };
  const { window } = loadApp({ trainingRoutines:routines, routineRewardTracking:staleTracking });
  const repaired = JSON.parse(window.localStorage.getItem('routineRewardTracking'));
  assert.equal(repaired.activeRoutineId, 'r2');
  assert.equal(repaired.periods.r1.filter(period => period.end === null).length, 0);
  assert.equal(repaired.periods.r2.filter(period => period.end === null).length, 1);
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
