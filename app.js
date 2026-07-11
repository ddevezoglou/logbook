const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const days = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const planOrder = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
const oldLogs = store.read('trainingLogs');
const savedSessions = store.read('trainingSessions');
const state = { plan: store.read('trainingPlan'), sessions: savedSessions.length ? savedSessions : oldLogs.map(log => ({ id:log.id, date:log.date, type:'free', comments:'', exercises:[{ exercise:log.exercise, comments:log.comments || '', sets:log.sets || [] }] })), mode: 'scheduled', editingDay:null };
if (!savedSessions.length && oldLogs.length) store.write('trainingSessions', state.sessions);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const id = () => crypto.randomUUID();
const localDate = date => new Date(`${date}T12:00:00`);
const dayForDate = date => days[localDate(date).getDay()];
const formatDate = date => localDate(date).toLocaleDateString('el-GR', { day:'numeric', month:'short', year:'numeric' });

function setRows(count, values = [], prefix = '', options = {}) {
  const { extra = false, startIndex = 0 } = options;
  return Array.from({ length: count }, (_, i) => `<div class="set-row ${extra ? 'extra-set' : ''}" data-set ${extra ? 'data-extra-set' : ''}><span class="set-number">${String(startIndex + i + 1).padStart(2,'0')}</span>
    <input class="${prefix}reps" type="number" min="0" placeholder="0" value="${values[i]?.reps ?? ''}" aria-label="Επαναλήψεις σετ ${i + 1}" required>
    <input class="${prefix}weight" type="number" min="0" step="0.25" placeholder="0" value="${values[i]?.weight ?? ''}" aria-label="Βάρος σετ ${i + 1}" required>${extra ? '<button class="remove-extra-set" type="button" aria-label="Διαγραφή extra σετ">×</button>' : ''}</div>`).join('');
}

function refreshDayOptions(preferred = null) {
  const used = new Set(state.plan.map(item => item.day));
  const available = planOrder.filter(day => !used.has(day) || day === preferred);
  $('#plan-day').innerHTML = available.length ? available.map(day => `<option ${day === preferred ? 'selected' : ''}>${day}</option>`).join('') : '<option value="" selected disabled>Όλες οι ημέρες έχουν πρόγραμμα</option>';
}

function renderPlanExercises() {
  const old = $$('.plan-exercise-fields').map(card => ({ exercise:card.querySelector('.builder-name').value, workSets:card.querySelector('.builder-sets').value, cues:card.querySelector('.builder-cues').value }));
  const count = Math.max(1, Math.min(15, Number($('#exercise-count').value) || 1));
  $('#plan-exercises-container').innerHTML = Array.from({ length:count }, (_, i) => `<article class="plan-exercise-fields">
    <span class="builder-number">${String(i + 1).padStart(2,'0')}</span>
    <label>Άσκηση<input class="builder-name" type="text" value="${esc(old[i]?.exercise || '')}" placeholder="π.χ. Bench Press" required></label>
    <label>Εργάσιμα σετ<input class="builder-sets" type="number" min="1" max="20" value="${esc(old[i]?.workSets || 3)}" required></label>
    <label class="builder-cue">Cues<input class="builder-cues" type="text" value="${esc(old[i]?.cues || '')}" placeholder="π.χ. ώμοι πίσω, σταθερά πόδια"></label>
  </article>`).join('');
}

function renderPlan() {
  const activeDays = new Set(state.plan.map(item => item.day)).size;
  $('#plan-count').textContent = `${activeDays}/7 ημέρες`;
  $('#plan-list').innerHTML = planOrder.map((day, dayIndex) => {
    const items = state.plan.filter(item => item.day === day);
    const workoutName = items[0]?.workoutName || (items.length ? 'Προπόνηση' : 'Ημέρα ξεκούρασης');
    return `<section class="day-card ${items.length ? 'active-day' : ''}"><div class="day-card-head"><span>${String(dayIndex + 1).padStart(2,'0')}</span><div><h3>${day}</h3><p>${esc(workoutName)}</p></div>${items.length ? `<div class="day-card-actions"><button class="edit-day" data-edit-day="${day}" type="button">Επεξεργασία</button><button class="delete-day" data-delete-day="${day}" aria-label="Διαγραφή ημέρας">×</button></div>` : ''}</div>
      <div class="day-exercises">${items.length ? items.map(item => `<article><div><strong>${esc(item.exercise)}</strong><small>${item.sets?.length || item.workSets || 3} εργάσιμα σετ</small></div>${item.cues ? `<p>↳ ${esc(item.cues)}</p>` : ''}</article>`).join('') : '<small>Δεν έχει οριστεί προπόνηση</small>'}</div></section>`;
  }).join('');
}

function exerciseCard(exercise, free = false) {
  return `<article class="workout-exercise" data-exercise data-id="${exercise.id || id()}">
    <div class="exercise-title">${free ? `<input class="exercise-name" type="text" placeholder="Όνομα άσκησης" required>` : `<div><span>ΑΣΚΗΣΗ</span><h3>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<span class="planned-tag">${exercise.sets.length} σετ</span>`}</div>
    ${exercise.cues ? `<div class="cue-banner"><span>CUE</span>${esc(exercise.cues)}</div>` : ''}
    ${free ? `<label class="free-set-selector">Αριθμός σετ<input class="free-set-count" type="number" min="1" max="20" value="${exercise.sets?.length || 3}"></label>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΒΑΡΟΣ (KG)</span></div>
    <div class="exercise-sets">${setRows(exercise.sets?.length || 3, exercise.sets || [])}</div>
    ${free ? '' : `<button class="mini-button add-extra-set" type="button">＋ Extra σετ</button>`}
    <label class="full-field">Σχόλια άσκησης<textarea class="exercise-comments" rows="2" placeholder="Τεχνική, αίσθηση, RPE...">${esc(exercise.comments || '')}</textarea></label>
    <input class="exercise-source-name" type="hidden" value="${esc(exercise.exercise || '')}">
  </article>`;
}

function renderScheduledSession() {
  const date = $('#log-date').value;
  const day = dayForDate(date);
  $('#day-badge').innerHTML = `<span>${day}</span><small>${formatDate(date)}</small>`;
  const planned = state.plan.filter(item => item.day === day).map(item => ({ ...item, sets:Array.from({ length:item.sets?.length || item.workSets || 3 }, () => ({ reps:'', weight:'' })) }));
  const workoutName = planned[0]?.workoutName || 'Η προπόνηση της ημέρας';
  $('#scheduled-session').innerHTML = planned.length ? `<div class="session-intro"><span>${String(planned.length).padStart(2,'0')}</span><div><h2>${esc(workoutName)}</h2><p>Συμπλήρωσε επαναλήψεις και κιλά που πραγματικά εκτέλεσες.</p></div></div>${planned.map(item => exerciseCard(item)).join('')}` : `<div class="no-workout"><span>REST / FREE</span><h2>Δεν υπάρχει ορισμένη προπόνηση για ${day}.</h2><p>Μπορείς να πας στην «Ελεύθερη» καταγραφή ή να προσθέσεις ασκήσεις στο Πρόγραμμα.</p><button class="secondary-button switch-free" type="button">Έναρξη ελεύθερης προπόνησης</button></div>`;
}

function addFreeExercise() { $('#free-exercises').insertAdjacentHTML('beforeend', exerciseCard({ sets:[{},{},{}] }, true)); }

function loadDayForEdit(day) {
  const items = state.plan.filter(item => item.day === day);
  if (!items.length) return;
  state.editingDay = day;
  refreshDayOptions(day);
  $('#workout-name').value = items[0].workoutName || 'Προπόνηση';
  $('#exercise-count').value = items.length;
  renderPlanExercises();
  $$('.plan-exercise-fields').forEach((card, index) => {
    card.querySelector('.builder-name').value = items[index].exercise;
    card.querySelector('.builder-sets').value = items[index].sets?.length || items[index].workSets || 3;
    card.querySelector('.builder-cues').value = items[index].cues || '';
  });
  $('#plan-form-title').textContent = `Επεξεργασία · ${day}`;
  $('#plan-submit').innerHTML = 'Ενημέρωση ημέρας <span>↗</span>';
  $('#cancel-plan-edit').classList.remove('hidden');
  $('#plan-form').scrollIntoView({ behavior:'smooth', block:'start' });
}

function resetPlanForm() {
  state.editingDay = null;
  $('#plan-form').reset();
  $('#exercise-count').value = 3;
  refreshDayOptions();
  renderPlanExercises();
  $('#plan-form-title').textContent = 'Νέα προπόνηση ημέρας';
  $('#plan-submit').innerHTML = 'Αποθήκευση ημέρας <span>↗</span>';
  $('#cancel-plan-edit').classList.add('hidden');
}

function collectExercises(container) {
  return [...container.querySelectorAll('[data-exercise]')].map(card => ({
    exercise: (card.querySelector('.exercise-name')?.value || card.querySelector('.exercise-source-name').value).trim(),
    comments: card.querySelector('.exercise-comments').value.trim(),
    sets: [...card.querySelectorAll('[data-set]')].map(row => ({ reps:Number(row.querySelector('input:nth-of-type(1)').value), weight:Number(row.querySelector('input:nth-of-type(2)').value) }))
  })).filter(item => item.exercise);
}

function volume(session) { return session.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0); }
function renderOverview() {
  const uniqueDates = new Set(state.sessions.map(s => s.date));
  const recentDays = Array.from({length:7}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - (6-i)); return d; });
  const completedRecent = recentDays.filter(d => uniqueDates.has(d.toISOString().slice(0,10))).length;
  const exerciseTotal = state.sessions.reduce((sum, session) => sum + session.exercises.length, 0);
  $('#metrics').innerHTML = `<article><strong>${state.sessions.length}</strong><span>Προπονήσεις</span></article><article><strong>${exerciseTotal}</strong><span>Ασκήσεις που έγιναν</span></article><article><strong>${completedRecent}<small>/7</small></strong><span>Ρυθμός εβδομάδας</span></article>`;
  $('#week-strip').innerHTML = recentDays.map(d => { const key = d.toISOString().slice(0,10); const done = uniqueDates.has(key); return `<div class="day-tile ${done ? 'done' : ''}"><span>${days[d.getDay()].slice(0,3)}</span><strong>${d.getDate()}</strong><small>${done ? '✓ έγινε' : '—'}</small></div>`; }).join('');
  $('#session-cards').innerHTML = state.sessions.length ? state.sessions.map(session => `<article class="session-card"><div class="card-date"><span>${dayForDate(session.date)}</span><strong>${formatDate(session.date)}</strong></div><div class="card-body"><div class="card-stats"><span>${session.exercises.length} ασκήσεις</span><span>${session.type === 'scheduled' ? 'Πρόγραμμα' : 'Ελεύθερη'}</span></div><h3>${session.exercises.map(ex => esc(ex.exercise)).join(' · ')}</h3>${session.comments ? `<p>${esc(session.comments)}</p>` : ''}</div><button class="delete card-delete" data-delete-session="${session.id}" aria-label="Διαγραφή">×</button></article>`).join('') : '<div class="empty">Μόλις ολοκληρώσεις μια προπόνηση, θα εμφανιστεί εδώ ως κάρτα.</div>';
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
$('#exercise-count').addEventListener('input', renderPlanExercises);
$('#add-free-exercise').addEventListener('click', addFreeExercise);
$('#cancel-plan-edit').addEventListener('click', resetPlanForm);
document.addEventListener('input', event => {
  if (!event.target.matches('.free-set-count')) return;
  const card = event.target.closest('[data-exercise]');
  const rows = card.querySelector('.exercise-sets');
  const values = [...rows.querySelectorAll('[data-set]')].map(row => ({ reps:row.querySelector('input:nth-of-type(1)').value, weight:row.querySelector('input:nth-of-type(2)').value }));
  const count = Math.max(1, Math.min(20, Number(event.target.value) || 1));
  rows.innerHTML = setRows(count, values);
});

$('#plan-form').addEventListener('submit', event => {
  event.preventDefault();
  const day = $('#plan-day').value;
  const workoutName = $('#workout-name').value.trim();
  const exercises = $$('.plan-exercise-fields').map(card => ({ id:id(), day, workoutName, exercise:card.querySelector('.builder-name').value.trim(), workSets:Number(card.querySelector('.builder-sets').value), cues:card.querySelector('.builder-cues').value.trim(), sets:Array.from({ length:Number(card.querySelector('.builder-sets').value) }, () => ({})) }));
  state.plan = [...state.plan.filter(item => item.day !== day), ...exercises];
  store.write('trainingPlan', state.plan); resetPlanForm(); renderPlan(); renderScheduledSession(); toast(`Η ${day} αποθηκεύτηκε`);
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
  if (event.target.matches('.add-extra-set')) { const rows = event.target.closest('[data-exercise]').querySelector('.exercise-sets'); rows.insertAdjacentHTML('beforeend', setRows(1, [{}], '', { extra:true, startIndex:rows.children.length })); }
  if (event.target.matches('.remove-extra-set')) { const rows = event.target.closest('.exercise-sets'); event.target.closest('[data-set]').remove(); [...rows.children].forEach((row, index) => row.querySelector('.set-number').textContent = String(index + 1).padStart(2,'0')); }
  if (event.target.dataset.editDay) loadDayForEdit(event.target.dataset.editDay);
  if (event.target.dataset.deleteDay) { const day = event.target.dataset.deleteDay; state.plan = state.plan.filter(x => x.day !== day); store.write('trainingPlan', state.plan); if (state.editingDay === day) resetPlanForm(); else refreshDayOptions(); renderPlan(); renderScheduledSession(); }
  if (event.target.dataset.deleteSession) { state.sessions = state.sessions.filter(x => x.id !== event.target.dataset.deleteSession); store.write('trainingSessions', state.sessions); renderOverview(); }
});

$('#log-date').valueAsDate = new Date(); refreshDayOptions(); renderPlanExercises(); renderPlan(); renderScheduledSession(); renderOverview();
