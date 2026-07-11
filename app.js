const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const days = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const planOrder = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
const oldLogs = store.read('trainingLogs');
const savedSessions = store.read('trainingSessions');
const state = { plan: store.read('trainingPlan'), sessions: savedSessions.length ? savedSessions : oldLogs.map(log => ({ id:log.id, date:log.date, type:'free', comments:'', exercises:[{ exercise:log.exercise, comments:log.comments || '', sets:log.sets || [] }] })), mode: 'scheduled' };
if (!savedSessions.length && oldLogs.length) store.write('trainingSessions', state.sessions);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const id = () => crypto.randomUUID();
const localDate = date => new Date(`${date}T12:00:00`);
const dayForDate = date => days[localDate(date).getDay()];
const formatDate = date => localDate(date).toLocaleDateString('el-GR', { day:'numeric', month:'short', year:'numeric' });

function setRows(count, values = [], prefix = '') {
  return Array.from({ length: count }, (_, i) => `<div class="set-row" data-set><span class="set-number">${String(i + 1).padStart(2,'0')}</span>
    <input class="${prefix}reps" type="number" min="0" placeholder="0" value="${values[i]?.reps ?? ''}" aria-label="Επαναλήψεις σετ ${i + 1}" required>
    <input class="${prefix}weight" type="number" min="0" step="0.25" placeholder="0" value="${values[i]?.weight ?? ''}" aria-label="Βάρος σετ ${i + 1}" required></div>`).join('');
}

function renderPlanSetRows() {
  const container = $('#plan-sets-container');
  const old = $$('[data-plan-set]').map(row => ({ reps: row.querySelector('.plan-reps').value, weight: row.querySelector('.plan-weight').value }));
  const count = Math.max(1, Math.min(20, Number($('#plan-set-count').value) || 1));
  container.innerHTML = setRows(count, old, 'plan-').replaceAll('data-set', 'data-plan-set');
}

function renderPlan() {
  $('#plan-count').textContent = `${state.plan.length} ασκήσεις`;
  $('#plan-list').innerHTML = planOrder.map(day => {
    const items = state.plan.filter(item => item.day === day);
    if (!items.length) return '';
    return `<section class="day-group"><h3>${day}<span>${items.length}</span></h3>${items.map(item => `<article class="plan-entry">
      <div><strong>${esc(item.exercise)}</strong><small>${item.sets.length} σετ · ${item.sets.map(s => `${s.reps}×${s.weight}kg`).join(' / ')}</small></div>
      ${item.cues ? `<p class="cue">↳ ${esc(item.cues)}</p>` : ''}${item.comments ? `<p>${esc(item.comments)}</p>` : ''}
      <button class="delete" data-delete-plan="${item.id}" aria-label="Διαγραφή">×</button></article>`).join('')}</section>`;
  }).join('') || '<div class="empty">Το εβδομαδιαίο σου πρόγραμμα είναι ακόμη κενό.</div>';
}

function exerciseCard(exercise, free = false) {
  return `<article class="workout-exercise" data-exercise data-id="${exercise.id || id()}">
    <div class="exercise-title">${free ? `<input class="exercise-name" type="text" placeholder="Όνομα άσκησης" required>` : `<div><span>ΑΣΚΗΣΗ</span><h3>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<span class="planned-tag">${exercise.sets.length} σετ</span>`}</div>
    ${exercise.cues ? `<div class="cue-banner"><span>CUE</span>${esc(exercise.cues)}</div>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΒΑΡΟΣ (KG)</span></div>
    <div class="exercise-sets">${setRows(exercise.sets?.length || 3, exercise.sets || [])}</div>
    ${free ? `<button class="mini-button add-set" type="button">＋ σετ</button>` : ''}
    <label class="full-field">Σχόλια άσκησης<textarea class="exercise-comments" rows="2" placeholder="Τεχνική, αίσθηση, RPE...">${esc(exercise.comments || '')}</textarea></label>
    <input class="exercise-source-name" type="hidden" value="${esc(exercise.exercise || '')}">
  </article>`;
}

function renderScheduledSession() {
  const date = $('#log-date').value;
  const day = dayForDate(date);
  $('#day-badge').innerHTML = `<span>${day}</span><small>${formatDate(date)}</small>`;
  const planned = state.plan.filter(item => item.day === day);
  $('#scheduled-session').innerHTML = planned.length ? `<div class="session-intro"><span>${String(planned.length).padStart(2,'0')}</span><div><h2>Η προπόνηση της ημέρας</h2><p>Συμπλήρωσε τι πραγματικά εκτέλεσες.</p></div></div>${planned.map(item => exerciseCard(item)).join('')}` : `<div class="no-workout"><span>REST / FREE</span><h2>Δεν υπάρχει ορισμένη προπόνηση για ${day}.</h2><p>Μπορείς να πας στην «Ελεύθερη» καταγραφή ή να προσθέσεις ασκήσεις στο Πρόγραμμα.</p><button class="secondary-button switch-free" type="button">Έναρξη ελεύθερης προπόνησης</button></div>`;
}

function addFreeExercise() { $('#free-exercises').insertAdjacentHTML('beforeend', exerciseCard({ sets:[{},{},{}] }, true)); }

function collectExercises(container) {
  return [...container.querySelectorAll('[data-exercise]')].map(card => ({
    exercise: (card.querySelector('.exercise-name')?.value || card.querySelector('.exercise-source-name').value).trim(),
    comments: card.querySelector('.exercise-comments').value.trim(),
    sets: [...card.querySelectorAll('[data-set]')].map(row => ({ reps:Number(row.querySelector('input:nth-of-type(1)').value), weight:Number(row.querySelector('input:nth-of-type(2)').value) }))
  })).filter(item => item.exercise);
}

function volume(session) { return session.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0); }
function renderOverview() {
  const totalVolume = state.sessions.reduce((sum, session) => sum + volume(session), 0);
  const uniqueDates = new Set(state.sessions.map(s => s.date));
  const recentDays = Array.from({length:7}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - (6-i)); return d; });
  const completedRecent = recentDays.filter(d => uniqueDates.has(d.toISOString().slice(0,10))).length;
  $('#metrics').innerHTML = `<article><strong>${state.sessions.length}</strong><span>Προπονήσεις</span></article><article><strong>${Math.round(totalVolume).toLocaleString('el-GR')}</strong><span>Συνολικά kg</span></article><article><strong>${completedRecent}<small>/7</small></strong><span>Ρυθμός εβδομάδας</span></article>`;
  $('#week-strip').innerHTML = recentDays.map(d => { const key = d.toISOString().slice(0,10); const done = uniqueDates.has(key); return `<div class="day-tile ${done ? 'done' : ''}"><span>${days[d.getDay()].slice(0,3)}</span><strong>${d.getDate()}</strong><small>${done ? '✓ έγινε' : '—'}</small></div>`; }).join('');
  $('#session-cards').innerHTML = state.sessions.length ? state.sessions.map(session => `<article class="session-card"><div class="card-date"><span>${dayForDate(session.date)}</span><strong>${formatDate(session.date)}</strong></div><div class="card-body"><div class="card-stats"><span>${session.exercises.length} ασκήσεις</span><span>${Math.round(volume(session)).toLocaleString('el-GR')} kg όγκος</span><span>${session.type === 'scheduled' ? 'Πρόγραμμα' : 'Ελεύθερη'}</span></div><h3>${session.exercises.map(ex => esc(ex.exercise)).join(' · ')}</h3>${session.comments ? `<p>${esc(session.comments)}</p>` : ''}</div><button class="delete card-delete" data-delete-session="${session.id}" aria-label="Διαγραφή">×</button></article>`).join('') : '<div class="empty">Μόλις ολοκληρώσεις μια προπόνηση, θα εμφανιστεί εδώ ως κάρτα.</div>';
  const bests = {};
  state.sessions.forEach(session => session.exercises.forEach(ex => ex.sets.forEach(set => { if (!bests[ex.exercise] || set.weight > bests[ex.exercise].weight) bests[ex.exercise] = { weight:set.weight, reps:set.reps }; })));
  const ranked = Object.entries(bests).sort((a,b) => b[1].weight - a[1].weight);
  $('#personal-bests').innerHTML = ranked.length ? ranked.map(([name, best], i) => `<article><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(name)}</strong><small>${best.reps} επαναλήψεις</small></div><b>${best.weight}<em>kg</em></b></article>`).join('') : '<div class="empty">Τα καλύτερα βάρη σου θα υπολογίζονται αυτόματα.</div>';
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
function setMode(mode) {
  state.mode = mode; $$('.mode-button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#scheduled-session').classList.toggle('hidden', mode !== 'scheduled'); $('#free-session').classList.toggle('hidden', mode !== 'free');
  if (mode === 'free' && !$('#free-exercises').children.length) addFreeExercise();
}

$$('.nav-button').forEach(button => button.addEventListener('click', () => { $$('.nav-button,.view').forEach(el => el.classList.remove('active')); button.classList.add('active'); $(`#${button.dataset.view}-view`).classList.add('active'); if (button.dataset.view === 'overview') renderOverview(); }));
$$('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#log-date').addEventListener('change', renderScheduledSession);
$('#plan-set-count').addEventListener('input', renderPlanSetRows);
$('#add-free-exercise').addEventListener('click', addFreeExercise);

$('#plan-form').addEventListener('submit', event => {
  event.preventDefault();
  state.plan.push({ id:id(), day:$('#plan-day').value, exercise:$('#plan-exercise').value.trim(), cues:$('#plan-cues').value.trim(), comments:$('#plan-comments').value.trim(), sets:$$('[data-plan-set]').map(row => ({ reps:Number(row.querySelector('.plan-reps').value), weight:Number(row.querySelector('.plan-weight').value) })) });
  store.write('trainingPlan', state.plan); event.target.reset(); $('#plan-set-count').value = 3; renderPlanSetRows(); renderPlan(); renderScheduledSession(); toast('Η άσκηση προστέθηκε στο πρόγραμμα');
});

$('#save-session').addEventListener('click', () => {
  const container = state.mode === 'scheduled' ? $('#scheduled-session') : $('#free-exercises');
  const exercises = collectExercises(container);
  if (!exercises.length) return toast('Πρόσθεσε τουλάχιστον μία άσκηση');
  if (container.querySelector(':invalid')) { container.querySelector(':invalid').reportValidity(); return; }
  state.sessions.unshift({ id:id(), date:$('#log-date').value, type:state.mode, comments:$('#session-comments').value.trim(), exercises });
  store.write('trainingSessions', state.sessions); $('#session-comments').value = ''; $('#free-exercises').innerHTML = ''; renderScheduledSession(); renderOverview(); toast('Η προπόνηση ολοκληρώθηκε ✓');
});

document.addEventListener('click', event => {
  if (event.target.matches('.switch-free')) setMode('free');
  if (event.target.matches('.remove-exercise')) event.target.closest('[data-exercise]').remove();
  if (event.target.matches('.add-set')) { const rows = event.target.closest('[data-exercise]').querySelector('.exercise-sets'); rows.insertAdjacentHTML('beforeend', setRows(1).replace('01', String(rows.children.length + 1).padStart(2,'0'))); }
  if (event.target.dataset.deletePlan) { state.plan = state.plan.filter(x => x.id !== event.target.dataset.deletePlan); store.write('trainingPlan', state.plan); renderPlan(); renderScheduledSession(); }
  if (event.target.dataset.deleteSession) { state.sessions = state.sessions.filter(x => x.id !== event.target.dataset.deleteSession); store.write('trainingSessions', state.sessions); renderOverview(); }
});

$('#log-date').valueAsDate = new Date(); renderPlanSetRows(); renderPlan(); renderScheduledSession(); renderOverview();
