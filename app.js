const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const days = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const planOrder = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
const oldLogs = store.read('trainingLogs');
const savedSessions = store.read('trainingSessions');
const state = { plan: store.read('trainingPlan'), sessions: savedSessions.length ? savedSessions : oldLogs.map(log => ({ id:log.id, date:log.date, type:'free', comments:'', exercises:[{ exercise:log.exercise, comments:log.comments || '', sets:log.sets || [] }] })), mode: 'scheduled', editingDay:null, editingSessionId:null };
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
  return Array.from({ length: count }, (_, i) => {
    const value = values[i] || {};
    const mode = value.weightMode || (value.plates !== undefined && value.plates !== '' ? (value.weight !== undefined && value.weight !== '' ? 'mixed' : 'plates') : 'kg');
    return `<div class="set-row ${extra ? 'extra-set' : ''}" data-set data-weight-mode="${mode}" ${extra ? 'data-extra-set' : ''}><span class="set-number">${String(startIndex + i + 1).padStart(2,'0')}</span>
      <input class="${prefix}reps set-reps" type="number" min="0" placeholder="0" value="${value.reps ?? ''}" aria-label="Επαναλήψεις σετ ${i + 1}" required>
      <select class="weight-mode" aria-label="Τρόπος καταγραφής βάρους για το σετ ${i + 1}"><option value="kg" ${mode === 'kg' ? 'selected' : ''}>Κιλά</option><option value="plates" ${mode === 'plates' ? 'selected' : ''}>Πλάκες</option><option value="mixed" ${mode === 'mixed' ? 'selected' : ''}>Πλάκες + Κιλά</option></select>
      <div class="weight-entry"><input class="${prefix}plates set-plates" type="number" min="0" step="1" placeholder="πλάκες" value="${value.plates ?? ''}" aria-label="Πλάκες σετ ${i + 1}" ${mode !== 'kg' ? 'required' : ''}><input class="${prefix}weight set-weight" type="number" min="0" step="0.05" placeholder="kg" value="${value.weight ?? ''}" aria-label="Κιλά σετ ${i + 1}" ${mode !== 'plates' ? 'required' : ''}></div>${extra ? '<button class="remove-extra-set" type="button" aria-label="Διαγραφή extra σετ">×</button>' : ''}</div>`;
  }).join('');
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
    <div class="exercise-title">${free ? `<input class="exercise-name" type="text" value="${esc(exercise.exercise || '')}" placeholder="Όνομα άσκησης" required>` : `<div><span>ΑΣΚΗΣΗ</span><h3>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<span class="planned-tag">${exercise.sets.length} σετ</span>`}</div>
    ${exercise.cues ? `<div class="cue-banner"><span>CUE</span>${esc(exercise.cues)}</div>` : ''}
    ${free ? `<label class="free-set-selector">Αριθμός σετ<input class="free-set-count" type="number" min="1" max="20" value="${exercise.sets?.length || 3}"></label>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΜΕΤΡΗΣΗ ΒΑΡΟΥΣ</span><span>ΒΑΡΟΣ</span></div>
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
  $('#plan-exercises-container').innerHTML = '';
  renderPlanExercises();
  $('#plan-form-title').textContent = 'Νέα προπόνηση ημέρας';
  $('#plan-submit').innerHTML = 'Αποθήκευση ημέρας <span>↗</span>';
  $('#cancel-plan-edit').classList.add('hidden');
}

function collectExercises(container) {
  return [...container.querySelectorAll('[data-exercise]')].map(card => ({
    exercise: (card.querySelector('.exercise-name')?.value || card.querySelector('.exercise-source-name').value).trim(),
    comments: card.querySelector('.exercise-comments').value.trim(),
    sets: [...card.querySelectorAll('[data-set]')].map(row => {
      const weightMode = row.querySelector('.weight-mode').value;
      const weight = row.querySelector('.set-weight').value;
      const plates = row.querySelector('.set-plates').value;
      return { reps:Number(row.querySelector('.set-reps').value), weightMode, weight:weightMode === 'plates' || weight === '' ? null : Number(weight), plates:weightMode === 'kg' || plates === '' ? null : Number(plates) };
    })
  })).filter(item => item.exercise);
}

function volume(session) { return session.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + ((set.weightMode || 'kg') === 'kg' ? set.reps * set.weight : 0), 0), 0); }
function sessionWorkoutName(session) {
  if (session.workoutName) return session.workoutName;
  if (session.type === 'free') return 'Ελεύθερη προπόνηση';
  return state.plan.find(item => item.day === dayForDate(session.date))?.workoutName || 'Προπόνηση';
}

function renderOverview() {
  const uniqueDates = new Set(state.sessions.map(s => s.date));
  const recentDays = Array.from({length:7}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - (6-i)); return d; });
  const completedRecent = recentDays.filter(d => uniqueDates.has(d.toISOString().slice(0,10))).length;
  const exerciseTotal = state.sessions.reduce((sum, session) => sum + session.exercises.length, 0);
  $('#metrics').innerHTML = `<article><strong>${state.sessions.length}</strong><span>Προπονήσεις</span></article><article><strong>${exerciseTotal}</strong><span>Ασκήσεις που έγιναν</span></article><article><strong>${completedRecent}<small>/7</small></strong><span>Ρυθμός εβδομάδας</span></article>`;
  $('#week-strip').innerHTML = recentDays.map(d => { const key = d.toISOString().slice(0,10); const done = uniqueDates.has(key); return `<div class="day-tile ${done ? 'done' : ''}"><span>${days[d.getDay()].slice(0,3)}</span><strong>${d.getDate()}</strong><small>${done ? '✓ έγινε' : '—'}</small></div>`; }).join('');
  $('#session-cards').innerHTML = state.sessions.length ? state.sessions.map(session => `<article class="session-card"><div class="card-date"><span>${dayForDate(session.date)}</span><strong>${formatDate(session.date)}</strong></div><div class="card-body"><div class="card-stats"><span>${session.exercises.length} ασκήσεις</span><span>${session.type === 'scheduled' ? 'Πρόγραμμα' : 'Ελεύθερη'}</span></div><h3>${esc(sessionWorkoutName(session))}</h3><p class="card-exercises">${session.exercises.map(ex => esc(ex.exercise)).join(' · ')}</p>${session.comments ? `<p class="card-comment">${esc(session.comments)}</p>` : ''}</div><div class="card-actions"><label class="session-select"><input type="checkbox" data-select-session="${session.id}"><span>Επιλογή</span></label><div class="card-selection-actions"><button class="card-edit" data-edit-session="${session.id}" type="button">Επεξεργασία</button><button class="card-delete" data-delete-session="${session.id}" type="button">Διαγραφή</button></div></div></article>`).join('') : '<div class="empty">Μόλις ολοκληρώσεις μια προπόνηση, θα εμφανιστεί εδώ ως κάρτα.</div>';
  const bests = {};
  state.sessions.forEach(session => session.exercises.forEach(ex => ex.sets.forEach(set => { if ((set.weightMode || 'kg') === 'kg' && (!bests[ex.exercise] || set.weight > bests[ex.exercise].weight)) bests[ex.exercise] = { weight:set.weight, reps:set.reps }; })));
  const ranked = Object.entries(bests).sort((a,b) => b[1].weight - a[1].weight);
  $('#personal-bests').innerHTML = ranked.length ? ranked.map(([name, best], i) => `<article><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(name)}</strong><small>${best.reps} επαναλήψεις</small></div><b>${best.weight}<em>kg</em></b></article>`).join('') : '<div class="empty">Τα καλύτερα βάρη σου θα υπολογίζονται αυτόματα.</div>';
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
function setMode(mode) {
  state.mode = mode; $$('.mode-button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#scheduled-session').classList.toggle('hidden', mode !== 'scheduled'); $('#free-session').classList.toggle('hidden', mode !== 'free');
  if (mode === 'free' && !$('#free-exercises').children.length) addFreeExercise();
}

function resetSessionForm() {
  state.editingSessionId = null;
  $('#log-date').valueAsDate = new Date();
  $('#session-comments').value = '';
  $('#free-exercises').innerHTML = '';
  $('#cancel-session-edit').classList.add('hidden');
  $('#save-session').innerHTML = 'Ολοκλήρωση προπόνησης <span>✓</span>';
  $$('.mode-button').forEach(button => { button.disabled = false; });
  setMode('scheduled');
  renderScheduledSession();
}

function loadSessionForEdit(sessionId) {
  const session = state.sessions.find(item => String(item.id) === String(sessionId));
  if (!session) return;
  state.editingSessionId = sessionId;
  $('#log-date').value = session.date;
  $('#session-comments').value = session.comments || '';
  setMode(session.type);
  if (session.type === 'scheduled') {
    $('#day-badge').innerHTML = `<span>${dayForDate(session.date)}</span><small>${formatDate(session.date)}</small>`;
    $('#scheduled-session').innerHTML = `<div class="session-intro"><span>${String(session.exercises.length).padStart(2,'0')}</span><div><h2>${esc(sessionWorkoutName(session))}</h2><p>Διόρθωσε τις τιμές που θέλεις και αποθήκευσε ξανά.</p></div></div>${session.exercises.map(item => exerciseCard(item)).join('')}`;
  } else {
    $('#free-exercises').innerHTML = session.exercises.map(item => exerciseCard(item, true)).join('');
  }
  $$('.mode-button').forEach(button => { button.disabled = true; });
  $('#cancel-session-edit').classList.remove('hidden');
  $('#save-session').innerHTML = 'Αποθήκευση διορθώσεων <span>✓</span>';
  showView('log');
  $('#log-view').scrollIntoView({ behavior:'smooth', block:'start' });
}

function showView(view) {
  $$('.nav-button,.view').forEach(el => el.classList.remove('active'));
  $(`.nav-button[data-view="${view}"]`).classList.add('active');
  $(`#${view}-view`).classList.add('active');
  if (view === 'overview') renderOverview();
}

$$('.nav-button').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
$('.brand').addEventListener('click', event => { event.preventDefault(); showView('overview'); });
$$('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#log-date').addEventListener('change', () => {
  if (!state.editingSessionId) return renderScheduledSession();
  const date = $('#log-date').value;
  $('#day-badge').innerHTML = `<span>${dayForDate(date)}</span><small>${formatDate(date)}</small>`;
});
$('#exercise-count').addEventListener('input', renderPlanExercises);
$('#add-free-exercise').addEventListener('click', addFreeExercise);
$('#cancel-plan-edit').addEventListener('click', resetPlanForm);
$('#cancel-session-edit').addEventListener('click', resetSessionForm);
document.addEventListener('input', event => {
  if (!event.target.matches('.free-set-count')) return;
  const card = event.target.closest('[data-exercise]');
  const rows = card.querySelector('.exercise-sets');
  const values = [...rows.querySelectorAll('[data-set]')].map(row => ({ reps:row.querySelector('.set-reps').value, weightMode:row.querySelector('.weight-mode').value, weight:row.querySelector('.set-weight').value, plates:row.querySelector('.set-plates').value }));
  const count = Math.max(1, Math.min(20, Number(event.target.value) || 1));
  rows.innerHTML = setRows(count, values);
});

document.addEventListener('change', event => {
  if (event.target.matches('.weight-mode')) {
    const row = event.target.closest('[data-set]');
    const mode = event.target.value;
    row.dataset.weightMode = mode;
    row.querySelector('.set-weight').required = mode !== 'plates';
    row.querySelector('.set-plates').required = mode !== 'kg';
    return;
  }
  if (!event.target.matches('[data-select-session]')) return;
  event.target.closest('.session-card').classList.toggle('session-selected', event.target.checked);
});

$('#plan-form').addEventListener('submit', event => {
  event.preventDefault();
  const day = $('#plan-day').value;
  const workoutName = $('#workout-name').value.trim();
  const exercises = $$('.plan-exercise-fields').map(card => ({ id:id(), day, workoutName, exercise:card.querySelector('.builder-name').value.trim(), workSets:Number(card.querySelector('.builder-sets').value), cues:card.querySelector('.builder-cues').value.trim(), sets:Array.from({ length:Number(card.querySelector('.builder-sets').value) }, () => ({})) }));
  state.plan = [...state.plan.filter(item => item.day !== day), ...exercises];
  store.write('trainingPlan', state.plan); resetPlanForm(); renderPlan(); renderScheduledSession(); toast(`Η προπόνηση για ${day} αποθηκεύτηκε`);
});

$('#save-session').addEventListener('click', () => {
  const container = state.mode === 'scheduled' ? $('#scheduled-session') : $('#free-exercises');
  const exercises = collectExercises(container);
  if (!exercises.length) return toast('Πρόσθεσε τουλάχιστον μία άσκηση');
  if (container.querySelector(':invalid')) { container.querySelector(':invalid').reportValidity(); return; }
  const existing = state.sessions.find(item => String(item.id) === String(state.editingSessionId));
  const workoutName = existing ? sessionWorkoutName(existing) : state.mode === 'scheduled' ? state.plan.find(item => item.day === dayForDate($('#log-date').value))?.workoutName || 'Προπόνηση' : 'Ελεύθερη προπόνηση';
  const session = { id:existing?.id || id(), date:$('#log-date').value, type:state.mode, workoutName, comments:$('#session-comments').value.trim(), exercises };
  if (existing) state.sessions = state.sessions.map(item => String(item.id) === String(existing.id) ? session : item);
  else state.sessions.unshift(session);
  store.write('trainingSessions', state.sessions);
  const wasEditing = Boolean(existing);
  resetSessionForm(); renderOverview(); toast(wasEditing ? 'Οι διορθώσεις αποθηκεύτηκαν ✓' : 'Η προπόνηση ολοκληρώθηκε ✓');
});

document.addEventListener('click', event => {
  if (event.target.matches('.switch-free')) setMode('free');
  if (event.target.matches('.remove-exercise')) event.target.closest('[data-exercise]').remove();
  if (event.target.matches('.add-extra-set')) { const rows = event.target.closest('[data-exercise]').querySelector('.exercise-sets'); rows.insertAdjacentHTML('beforeend', setRows(1, [{}], '', { extra:true, startIndex:rows.children.length })); }
  if (event.target.matches('.remove-extra-set')) { const rows = event.target.closest('.exercise-sets'); event.target.closest('[data-set]').remove(); [...rows.children].forEach((row, index) => row.querySelector('.set-number').textContent = String(index + 1).padStart(2,'0')); }
  if (event.target.dataset.editDay) loadDayForEdit(event.target.dataset.editDay);
  if (event.target.dataset.editSession) loadSessionForEdit(event.target.dataset.editSession);
  if (event.target.dataset.deleteDay) { const day = event.target.dataset.deleteDay; state.plan = state.plan.filter(x => x.day !== day); store.write('trainingPlan', state.plan); if (state.editingDay === day) resetPlanForm(); else refreshDayOptions(); renderPlan(); renderScheduledSession(); }
  if (event.target.dataset.deleteSession) { state.sessions = state.sessions.filter(x => String(x.id) !== String(event.target.dataset.deleteSession)); store.write('trainingSessions', state.sessions); renderOverview(); }
});

$('#log-date').valueAsDate = new Date(); refreshDayOptions(); renderPlanExercises(); renderPlan(); renderScheduledSession(); renderOverview();
