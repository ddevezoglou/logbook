const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const days = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const planOrder = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
const oldLogs = store.read('trainingLogs');
const savedSessions = store.read('trainingSessions');
const state = { plan: store.read('trainingPlan'), sessions: savedSessions.length ? savedSessions : oldLogs.map(log => ({ id:log.id, date:log.date, type:'free', comments:'', exercises:[{ exercise:log.exercise, comments:log.comments || '', sets:log.sets || [] }] })), mode: 'scheduled', editingDay:null, editingSessionId:null, selectedPlanDay:null };
if (!savedSessions.length && oldLogs.length) store.write('trainingSessions', state.sessions);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const id = () => crypto.randomUUID();
const localDate = date => date ? new Date(`${date}T12:00:00`) : null;
const dayForDate = date => date ? days[localDate(date).getDay()] : 'Χωρίς ημέρα';
const formatDate = date => date ? localDate(date).toLocaleDateString('el-GR', { day:'numeric', month:'short', year:'numeric' }) : 'Χωρίς ημερομηνία';

function setRows(count, values = [], prefix = '', options = {}) {
  const { extra = false, startIndex = 0 } = options;
  return Array.from({ length: count }, (_, i) => {
    const value = values[i] || {};
    const mode = value.weightMode || (value.plates !== undefined && value.plates !== '' ? (value.weight !== undefined && value.weight !== '' ? 'mixed' : 'plates') : 'kg');
    return `<div class="set-row ${extra ? 'extra-set' : ''}" data-set data-weight-mode="${mode}" ${extra ? 'data-extra-set' : ''}><span class="set-number">${String(startIndex + i + 1).padStart(2,'0')}</span>
      <input class="${prefix}reps set-reps" type="number" min="0" placeholder="0" value="${value.reps ?? ''}" aria-label="Επαναλήψεις σετ ${i + 1}" required>
      <select class="weight-mode" aria-label="Τρόπος καταγραφής βάρους για το σετ ${i + 1}"><option value="kg" ${mode === 'kg' ? 'selected' : ''}>Κιλά</option><option value="plates" ${mode === 'plates' ? 'selected' : ''}>Πλάκες</option><option value="mixed" ${mode === 'mixed' ? 'selected' : ''}>Πλάκες + Κιλά</option><option value="bodyweight" ${mode === 'bodyweight' ? 'selected' : ''}>Bodyweight</option><option value="bodyweight_extra" ${mode === 'bodyweight_extra' ? 'selected' : ''}>Bodyweight + Extra Βάρος</option></select>
      <div class="weight-entry"><input class="${prefix}plates set-plates" type="number" min="0" step="1" placeholder="πλάκες" value="${value.plates ?? ''}" aria-label="Πλάκες σετ ${i + 1}" ${mode === 'plates' || mode === 'mixed' ? 'required' : ''}><input class="${prefix}weight set-weight" type="number" min="0" step="0.05" placeholder="${mode === 'bodyweight_extra' ? 'extra kg' : 'kg'}" value="${value.weight ?? ''}" aria-label="Κιλά σετ ${i + 1}" ${mode === 'kg' || mode === 'mixed' || mode === 'bodyweight_extra' ? 'required' : ''}></div>${extra ? '<button class="remove-extra-set" type="button" aria-label="Διαγραφή extra σετ">×</button>' : ''}</div>`;
  }).join('');
}

function configureWeightMode(row, mode) {
  row.dataset.weightMode = mode;
  const weightInput = row.querySelector('.set-weight');
  weightInput.required = ['kg','mixed','bodyweight_extra'].includes(mode);
  weightInput.placeholder = mode === 'bodyweight_extra' ? 'extra kg' : 'kg';
  row.querySelector('.set-plates').required = ['plates','mixed'].includes(mode);
}

function completedFirstSet(card) {
  const rows = [...card.querySelectorAll('.exercise-sets [data-set]')];
  if (rows.length < 2) return null;
  const first = rows[0], mode = first.querySelector('.weight-mode').value;
  const values = {
    reps:first.querySelector('.set-reps').value,
    weightMode:mode,
    weight:['kg','mixed','bodyweight_extra'].includes(mode) ? first.querySelector('.set-weight').value : '',
    plates:['plates','mixed'].includes(mode) ? first.querySelector('.set-plates').value : ''
  };
  if (values.reps === '') return null;
  if (['kg','bodyweight_extra'].includes(mode) && values.weight === '') return null;
  if (mode === 'plates' && values.plates === '') return null;
  if (mode === 'mixed' && (values.plates === '' || values.weight === '')) return null;
  return values;
}

function refreshCopySetButton(card) {
  const button = card?.querySelector('.copy-first-set');
  if (button) button.classList.toggle('hidden', !completedFirstSet(card));
}

function refreshCopySetButtons(scope = document) {
  scope.querySelectorAll('[data-exercise]').forEach(refreshCopySetButton);
}

function copyFirstSetToRemaining(card) {
  const values = completedFirstSet(card);
  if (!values) return;
  [...card.querySelectorAll('.exercise-sets [data-set]')].slice(1).forEach(row => {
    row.querySelector('.set-reps').value = values.reps;
    row.querySelector('.weight-mode').value = values.weightMode;
    row.querySelector('.set-weight').value = values.weight;
    row.querySelector('.set-plates').value = values.plates;
    configureWeightMode(row, values.weightMode);
  });
}

function refreshDayOptions(preferred = null) {
  const used = new Set(state.plan.map(item => item.day));
  const available = planOrder.filter(day => !used.has(day) || day === preferred);
  $('#plan-day').innerHTML = available.length ? available.map(day => `<option ${day === preferred ? 'selected' : ''}>${day}</option>`).join('') : '<option value="" selected disabled>Όλες οι ημέρες έχουν πρόγραμμα</option>';
}

function renderPlanExercises() {
  const old = $$('.plan-exercise-fields').map(card => ({ id:card.dataset.planId, exercise:card.querySelector('.builder-name').value, workSets:card.querySelector('.builder-sets').value, cues:card.querySelector('.builder-cues').value }));
  const count = Math.max(1, Math.min(15, Number($('#exercise-count').value) || 1));
  $('#plan-exercises-container').innerHTML = Array.from({ length:count }, (_, i) => `<article class="plan-exercise-fields" data-plan-id="${esc(old[i]?.id || id())}">
    <span class="builder-number">${String(i + 1).padStart(2,'0')}</span>
    <label>Άσκηση<input class="builder-name" type="text" value="${esc(old[i]?.exercise || '')}" placeholder="π.χ. Bench Press" required></label>
    <label>Εργάσιμα σετ<input class="builder-sets" type="number" min="1" max="20" value="${esc(old[i]?.workSets || 3)}" required></label>
    <label class="builder-cue">Cues<input class="builder-cues" type="text" value="${esc(old[i]?.cues || '')}" placeholder="π.χ. ώμοι πίσω, σταθερά πόδια"></label>
    <button class="remove-plan-exercise" type="button" aria-label="Διαγραφή άσκησης">×</button>
  </article>`).join('');
}

function renderPlan() {
  const activeDays = new Set(state.plan.map(item => item.day)).size;
  $('#plan-count').textContent = `${activeDays}/7 ημέρες`;
  $('#plan-list').innerHTML = planOrder.map((day, dayIndex) => {
    const items = state.plan.filter(item => item.day === day);
    const workoutName = items[0]?.workoutName || (items.length ? 'Προπόνηση' : 'Ημέρα ξεκούρασης');
    return `<section class="day-card ${items.length ? 'active-day' : ''}"><div class="day-card-head"><span>${String(dayIndex + 1).padStart(2,'0')}</span><div><h3>${day}</h3><p>${esc(workoutName)}</p></div>${items.length ? `<div class="day-card-actions"><button class="edit-day" data-edit-day="${day}" type="button">Επεξεργασία</button><button class="delete-day" data-delete-day="${day}" aria-label="Διαγραφή ημέρας">×</button></div>` : ''}</div>
      <div class="day-exercises">${items.length ? items.map(item => `<article><div><strong>${esc(item.exercise)}</strong><small>${item.sets?.length || item.workSets || 3} εργάσιμα σετ</small></div>${item.cues ? `<p>→ ${esc(item.cues)}</p>` : ''}</article>`).join('') : '<small>Δεν έχει οριστεί προπόνηση</small>'}</div></section>`;
  }).join('');
}

function exerciseCard(exercise, free = false, exerciseIndex = 0) {
  return `<article class="workout-exercise" data-exercise data-id="${exercise.id || id()}" data-plan-exercise-id="${esc(exercise.planExerciseId || exercise.id || '')}">
    <div class="exercise-title">${free ? `<input class="exercise-name" type="text" value="${esc(exercise.exercise || '')}" placeholder="Όνομα άσκησης" required>` : `<div><span class="exercise-order">ΑΣΚΗΣΗ ${exerciseIndex + 1}η</span><h3>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<div class="exercise-title-actions"><span class="planned-tag">${exercise.sets.length} σετ</span><button class="remove-planned-exercise" type="button" aria-label="Διαγραφή άσκησης">×</button></div>`}</div>
    ${exercise.cues ? `<div class="cue-banner"><span>CUE</span>${esc(exercise.cues)}</div>` : ''}
    ${free ? `<label class="free-set-selector">Αριθμός σετ<input class="free-set-count" type="number" min="1" max="20" value="${exercise.sets?.length || 3}"></label>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΜΕΤΡΗΣΗ ΒΑΡΟΥΣ</span><span>ΒΑΡΟΣ</span></div>
    <div class="exercise-sets">${setRows(exercise.sets?.length || 3, exercise.sets || [])}</div>
    <div class="set-actions"><button class="mini-button copy-first-set hidden" type="button" aria-label="Αντιγραφή του πρώτου σετ στα υπόλοιπα">ΑΝΤΙΓΡΑΦΗ</button>${free ? '' : `<button class="mini-button add-extra-set" type="button">＋ Extra σετ</button>`}</div>
    <label class="full-field">Σχόλια άσκησης<textarea class="exercise-comments" rows="2" placeholder="Τεχνική, αίσθηση, RPE...">${esc(exercise.comments || '')}</textarea></label>
    <input class="exercise-source-name" type="hidden" value="${esc(exercise.exercise || '')}">
  </article>`;
}

function refreshWorkoutDayOptions(preferredDay) {
  const workouts = planOrder.map(day => ({ day, workoutName:state.plan.find(item => item.day === day)?.workoutName })).filter(item => item.workoutName);
  if (!workouts.length) {
    $('#workout-day-select').innerHTML = '<option value="" selected disabled>Δεν έχει δηλωθεί πρόγραμμα</option>';
    return preferredDay;
  }
  const selectedDay = workouts.some(item => item.day === preferredDay) ? preferredDay : workouts[0].day;
  $('#workout-day-select').innerHTML = workouts.map(item => `<option value="${item.day}" ${item.day === selectedDay ? 'selected' : ''}>${esc(item.workoutName)}</option>`).join('');
  return selectedDay;
}

function renderScheduledSession(preferredDay = null) {
  const date = $('#log-date').value;
  const calendarDay = dayForDate(date);
  const requestedPlanDay = preferredDay || state.selectedPlanDay || calendarDay;
  const planDay = refreshWorkoutDayOptions(requestedPlanDay);
  state.selectedPlanDay = planDay;
  $('#day-badge').innerHTML = `<span>${calendarDay}</span><small>${formatDate(date)}</small>`;
  const planned = state.plan.filter(item => item.day === planDay).map(item => ({ ...item, sets:Array.from({ length:item.sets?.length || item.workSets || 3 }, () => ({ reps:'', weight:'' })) }));
  const workoutName = planned[0]?.workoutName || 'Η προπόνηση της ημέρας';
  $('#scheduled-session').innerHTML = planned.length ? `<div class="session-intro"><div><h2>${esc(workoutName)}</h2><p>Πρόγραμμα ${planDay} · Συμπλήρωσε όσα πραγματικά εκτέλεσες.</p></div></div>${planned.map((item, index) => exerciseCard(item, false, index)).join('')}` : `<div class="no-workout"><span>REST / FREE</span><h2>Δεν υπάρχει ορισμένη προπόνηση για ${planDay}.</h2><p>Επίλεξε το πρόγραμμα άλλης ημέρας ή ξεκίνα μια «Ελεύθερη» καταγραφή.</p><button class="secondary-button switch-free" type="button">Έναρξη ελεύθερης προπόνησης</button></div>`;
  refreshCopySetButtons($('#scheduled-session'));
}

function addFreeExercise() { $('#free-exercises').insertAdjacentHTML('beforeend', exerciseCard({ sets:[{},{},{}] }, true)); refreshCopySetButtons($('#free-exercises')); }

function loadDayForEdit(day) {
  const items = state.plan.filter(item => item.day === day);
  if (!items.length) return;
  let addedStableIds = false;
  items.forEach(item => { if (!item.id) { item.id = id(); addedStableIds = true; } });
  if (addedStableIds) store.write('trainingPlan', state.plan);
  state.editingDay = day;
  refreshDayOptions(day);
  $('#workout-name').value = items[0].workoutName || 'Προπόνηση';
  $('#exercise-count').value = items.length;
  renderPlanExercises();
  $$('.plan-exercise-fields').forEach((card, index) => {
    card.dataset.planId = items[index].id || id();
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
    planExerciseId: card.dataset.planExerciseId || null,
    comments: card.querySelector('.exercise-comments').value.trim(),
    sets: [...card.querySelectorAll('[data-set]')].map(row => {
      const weightMode = row.querySelector('.weight-mode').value;
      const weight = row.querySelector('.set-weight').value;
      const plates = row.querySelector('.set-plates').value;
      return { reps:Number(row.querySelector('.set-reps').value), weightMode, weight:['kg','mixed','bodyweight_extra'].includes(weightMode) && weight !== '' ? Number(weight) : null, plates:['plates','mixed'].includes(weightMode) && plates !== '' ? Number(plates) : null };
    })
  })).filter(item => item.exercise);
}

function sessionWorkoutName(session) {
  if (session.workoutName) return session.workoutName;
  if (session.type === 'free') return 'Ελεύθερη προπόνηση';
  return state.plan.find(item => item.day === (session.workoutDay || dayForDate(session.date)))?.workoutName || 'Προπόνηση';
}

function syncPlanChangesToHistory(sourceDay, targetDay, previousItems, nextItems) {
  if (!sourceDay || !previousItems.length) return;
  const previousWorkoutName = previousItems[0].workoutName;
  const renameByOldName = new Map(previousItems.map(item => [normalizedName(item.exercise), nextItems.find(next => next.id === item.id) || null]));
  state.sessions = state.sessions.map(session => {
    if (session.type !== 'scheduled') return session;
    const belongsToPlan = session.workoutDay === sourceDay || (!session.workoutDay && normalizedName(session.workoutName) === normalizedName(previousWorkoutName));
    if (!belongsToPlan) return session;
    const syncedExercises = session.exercises.map(exercise => {
      const replacement = nextItems.find(item => item.id === exercise.planExerciseId) || renameByOldName.get(normalizedName(exercise.exercise));
      return replacement ? { ...exercise, exercise:replacement.exercise, planExerciseId:replacement.id } : exercise;
    });
    return { ...session, workoutDay:targetDay, workoutName:nextItems[0]?.workoutName || session.workoutName, exercises:syncedExercises };
  });
  store.write('trainingSessions', state.sessions);
}

function renderOverview() {
  state.sessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const uniqueDates = new Set(state.sessions.map(s => s.date));
  const recentDays = Array.from({length:7}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - (6-i)); return d; });
  const completedRecent = recentDays.filter(d => uniqueDates.has(d.toISOString().slice(0,10))).length;
  const workingSetTotal = state.sessions.reduce((total, session) => total + session.exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0), 0);
  $('#metrics').innerHTML = `<article><strong>${state.sessions.length}</strong><span>ΠΡΟΠΟΝΗΣΕΙΣ</span></article><article><strong>${workingSetTotal}</strong><span>WORKING SETS</span></article><article><strong>${completedRecent}<small>/7</small></strong><span>ΣΥΧΝΟΤΗΤΑ ΕΒΔΟΜΑΔΑΣ</span></article>`;
  const rhythmMessage = completedRecent === 0 ? 'Η πρώτη καταγραφή είναι η γραμμή εκκίνησης.' : completedRecent === 1 ? 'Ο ρυθμός ξεκίνησε. Η επόμενη καταγραφή τον χτίζει.' : completedRecent < 4 ? `${completedRecent} προπονήσεις σε 7 ημέρες. Ο ρυθμός χτίζεται.` : `${completedRecent} προπονήσεις σε 7 ημέρες. Κράτησε τη γραμμή.`;
  $('#rhythm-message').textContent = rhythmMessage;
  $('#week-strip').innerHTML = recentDays.map(d => { const key = d.toISOString().slice(0,10); const done = uniqueDates.has(key); return `<div class="day-tile ${done ? 'done' : ''}"><span>${days[d.getDay()].slice(0,3)}</span><strong>${d.getDate()}</strong><small>${done ? '✓ logged' : '—'}</small></div>`; }).join('');
  $('#session-cards').innerHTML = state.sessions.length ? state.sessions.map((session, index) => { const setCount = session.exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0); return `<article class="session-card"><div class="card-date"><span>${dayForDate(session.date)}</span><strong>${formatDate(session.date)}</strong><small>SESSION No ${state.sessions.length - index}</small></div><div class="card-body"><div class="card-stats"><span>${session.exercises.length} ΑΣΚΗΣΕΙΣ</span><span>${setCount} WORKING SETS</span><span class="card-type">${session.type === 'scheduled' ? 'ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ' : 'ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ'}</span></div><h3>${esc(sessionWorkoutName(session))}</h3><p class="card-exercises">${session.exercises.map(ex => esc(ex.exercise)).join(' · ')}</p>${session.comments ? `<p class="card-comment">${esc(session.comments)}</p>` : ''}</div><span class="card-stamp" aria-hidden="true">ΚΑΤΑΓΡΑΦΗΚΕ</span><div class="card-actions"><label class="session-select"><input type="checkbox" data-select-session="${session.id}"><span>ΕΠΙΛΟΓΗ</span></label><div class="card-selection-actions"><button class="card-edit" data-edit-session="${session.id}" type="button">ΕΠΕΞΕΡΓΑΣΙΑ</button><button class="card-delete" data-delete-session="${session.id}" type="button">ΔΙΑΓΡΑΦΗ</button></div></div></article>`; }).join('') : '<div class="empty"><strong>Η γραμμή εκκίνησης είναι εδώ.</strong><span>Ολοκλήρωσε την πρώτη προπόνηση και άρχισε να χτίζεις το αρχείο σου.</span></div>';
  const bests = new Map();
  const performanceScore = set => set.weightMode === 'bodyweight' ? [Number(set.reps)||0] : set.weightMode === 'mixed' ? [Number(set.plates)||0,Number(set.weight)||0,Number(set.reps)||0] : set.weightMode === 'plates' ? [Number(set.plates)||0,Number(set.reps)||0] : [Number(set.weight)||0,Number(set.reps)||0];
  const isBetter = (candidate, current) => !current || performanceScore(candidate).some((value,index) => value !== performanceScore(current)[index] && performanceScore(candidate).slice(0,index).every((prior,i) => prior === performanceScore(current)[i]) && value > performanceScore(current)[index]);
  state.sessions.forEach(session => session.exercises.forEach(ex => ex.sets.forEach(set => {
    const mode = set.weightMode || 'kg';
    if (!(Number(set.reps) > 0)) return;
    const hasValidLoad = mode === 'bodyweight' || (['kg','bodyweight_extra'].includes(mode) && Number(set.weight) > 0) || (mode === 'plates' && Number(set.plates) > 0) || (mode === 'mixed' && (Number(set.plates) > 0 || Number(set.weight) > 0));
    if (!hasValidLoad) return;
    const key = `${normalizedName(ex.exercise)}::${mode}`;
    if (isBetter({ ...set, weightMode:mode }, bests.get(key)?.set)) bests.set(key, { name:ex.exercise, mode, set:{ ...set, weightMode:mode } });
  })));
  const ranked = [...bests.values()].sort((a,b) => a.name.localeCompare(b.name,'el'));
  const bestValue = best => best.mode === 'bodyweight' ? `${best.set.reps}<em>επαν.</em>` : best.mode === 'plates' ? `${best.set.plates}<em>πλάκες</em>` : best.mode === 'mixed' ? `${best.set.plates}<em>πλάκες</em> + ${best.set.weight}<em>kg</em>` : `${best.set.weight}<em>${best.mode === 'bodyweight_extra' ? 'extra kg' : 'kg'}</em>`;
  $('#personal-bests').innerHTML = ranked.length ? ranked.map(best => `<article><div><strong>${esc(best.name)}</strong><small>${best.set.reps} επαναλήψεις</small></div><b>${bestValue(best)}</b></article>`).join('') : '<div class="empty"><strong>Τα σημεία αναφοράς θα έρθουν.</strong><span>Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σου.</span></div>';
}

const normalizedName = value => String(value || '').trim().toLocaleLowerCase('el-GR').replace(/\s+/g, ' ');
const modeLabel = mode => ({ kg:'kg', plates:'πλάκες', mixed:'πλάκες + kg', bodyweight:'Bodyweight', bodyweight_extra:'Bodyweight + Extra Βάρος' }[mode] || mode);

function progressWorkouts() {
  const groups = new Map();
  state.sessions.forEach(session => {
    const name = sessionWorkoutName(session), key = normalizedName(name);
    if (!groups.has(key)) groups.set(key, { key, name, sessions:[] });
    groups.get(key).sessions.push(session);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'el'));
}

function renderProgressSelectors() {
  const workouts = progressWorkouts(), workoutSelect = $('#progress-workout'), previousWorkout = workoutSelect.value;
  workoutSelect.innerHTML = workouts.length ? workouts.map(item => `<option value="${esc(item.key)}">${esc(item.name)}</option>`).join('') : '<option value="">Δεν υπάρχουν προπονήσεις</option>';
  if (workouts.some(item => item.key === previousWorkout)) workoutSelect.value = previousWorkout;
  const selected = workouts.find(item => item.key === workoutSelect.value), exercises = new Map();
  selected?.sessions.forEach(session => session.exercises.forEach(exercise => { const key = normalizedName(exercise.exercise); if (!exercises.has(key)) exercises.set(key, exercise.exercise); }));
  const exerciseSelect = $('#progress-exercise'), previousExercise = exerciseSelect.value;
  exerciseSelect.innerHTML = exercises.size ? [...exercises].map(([key, name]) => `<option value="${esc(key)}">${esc(name)}</option>`).join('') : '<option value="">Δεν υπάρχουν ασκήσεις</option>';
  if (exercises.has(previousExercise)) exerciseSelect.value = previousExercise;
  const selectedExerciseKey = exerciseSelect.value, setSelect = $('#progress-set'), previousSet = setSelect.value;
  const maxSets = selected?.sessions.reduce((maximum, session) => {
    const exercise = session.exercises.find(item => normalizedName(item.exercise) === selectedExerciseKey);
    return Math.max(maximum, exercise?.sets?.length || 0);
  }, 0) || 0;
  setSelect.innerHTML = maxSets ? Array.from({ length:maxSets }, (_, index) => `<option value="${index}">Σετ ${index + 1}</option>`).join('') : '<option value="">Δεν υπάρχουν σετ</option>';
  if (previousSet !== '' && Number(previousSet) < maxSets) setSelect.value = previousSet;
  renderProgressChart();
}

function renderProgressChart() {
  const panel = $('#progress-panel');
  const workout = progressWorkouts().find(item => item.key === $('#progress-workout').value), exerciseKey = $('#progress-exercise').value, setIndex = Number($('#progress-set').value);
  if (!workout || !exerciseKey || !Number.isInteger(setIndex)) { panel.innerHTML = '<div class="empty">Κατάγραψε τουλάχιστον δύο ίδια σετ για να δεις πρόοδο.</div>'; return; }
  const records = workout.sessions.map(session => {
    const exercise = session.exercises.find(item => normalizedName(item.exercise) === exerciseKey);
    if (!exercise) return { session, reason:'Η άσκηση δεν καταγράφηκε' };
    const set = exercise.sets[setIndex];
    if (!set) return { session, reason:`Δεν καταγράφηκε το σετ ${setIndex + 1}` };
    const mode = set.weightMode || 'kg';
    const value = Number(['kg','bodyweight_extra'].includes(mode) ? set.weight : mode === 'bodyweight' ? 0 : set.plates), extraWeight = mode === 'mixed' ? Number(set.weight) : null, reps = Number(set.reps);
    if ((mode !== 'bodyweight' && !(value > 0)) || !(reps > 0) || (mode === 'mixed' && !(extraWeight >= 0))) return { session, reason:'Λείπει βάρος ή επαναλήψεις από το σετ' };
    return { session, mode, value, extraWeight, reps };
  });
  const modeCounts = records.filter(item => item.mode).reduce((counts, item) => ({ ...counts, [item.mode]:(counts[item.mode] || 0) + 1 }), {});
  const comparableMode = Object.entries(modeCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
  const points = records.filter(item => item.mode === comparableMode).sort((a,b) => a.session.date.localeCompare(b.session.date));
  const excluded = records.filter(item => !item.mode || item.mode !== comparableMode);
  if (!comparableMode || points.length < 2) { panel.innerHTML = '<div class="recording-warning"><strong>Δεν υπάρχει ασφαλής σύγκριση.</strong><p>Χρειάζονται τουλάχιστον δύο καταγραφές της άσκησης με την ίδια μονάδα βάρους. Μην εναλλάσσεις Κιλά, Πλάκες ή μικτή μέτρηση.</p></div>'; return; }
  const width=900, height=330, left=92, right=92, top=42, bottom=55, values=points.map(item => item.value), min=Math.min(...values), max=Math.max(...values);
  const floor=min===max ? Math.max(0,min-1) : min-(max-min)*.15, ceiling=min===max ? max+1 : max+(max-min)*.15;
  const repValues=points.map(item => item.reps), repMin=Math.min(...repValues), repMax=Math.max(...repValues), repFloor=repMin===repMax?Math.max(0,repMin-1):repMin-.5, repCeiling=repMin===repMax?repMax+1:repMax+.5;
  const extraValues=comparableMode==='mixed'?points.map(item=>item.extraWeight):[], extraMin=extraValues.length?Math.min(...extraValues):0, extraMax=extraValues.length?Math.max(...extraValues):0, extraFloor=extraMin===extraMax?Math.max(0,extraMin-1):extraMin-(extraMax-extraMin)*.15, extraCeiling=extraMin===extraMax?extraMax+1:extraMax+(extraMax-extraMin)*.15;
  const x=i => left+i*(width-left-right)/(points.length-1), y=value => top+(ceiling-value)/(ceiling-floor)*(height-top-bottom), repY=value => top+(repCeiling-value)/(repCeiling-repFloor)*(height-top-bottom), extraY=value => top+(extraCeiling-value)/(extraCeiling-extraFloor)*(height-top-bottom);
  const line=points.map((item,i) => `${x(i)},${y(item.value)}`).join(' '), repLine=points.map((item,i) => `${x(i)},${repY(item.reps)}`).join(' '), extraLine=comparableMode==='mixed'?points.map((item,i)=>`${x(i)},${extraY(item.extraWeight)}`).join(' '):'';
  const weightDelta=points.at(-1).value-points[0].value, extraDelta=comparableMode==='mixed'?points.at(-1).extraWeight-points[0].extraWeight:0, repsDelta=points.at(-1).reps-points[0].reps;
  const exerciseName = points[0].session.exercises.find(item => normalizedName(item.exercise) === exerciseKey)?.exercise || '';
  const weightChanged = weightDelta !== 0 || extraDelta !== 0, decline = weightDelta < 0 || extraDelta < 0 || (!weightChanged && repsDelta < 0);
  const primaryUnit = comparableMode === 'bodyweight' ? null : comparableMode === 'kg' ? 'kg' : comparableMode === 'bodyweight_extra' ? 'extra kg' : 'πλάκες';
  const progressItems = decline ? '<div class="progress-alert"><strong>Δες όλη την εικόνα.</strong><span>Η τελευταία επίδοση είναι χαμηλότερη. Έλεγξε τεχνική, ύπνο και αποκατάσταση πριν βγάλεις συμπέρασμα.</span></div>' : [primaryUnit && weightDelta > 0 ? `<span><b>+${weightDelta.toFixed(1)}</b> ${primaryUnit}</span>` : '', extraDelta > 0 ? `<span><b>+${extraDelta.toFixed(1)}</b> kg</span>` : '', repsDelta > 0 ? `<span><b>+${repsDelta}</b> επαναλήψεις</span>` : ''].filter(Boolean).join('');
  const pointLabel = item => comparableMode === 'bodyweight' ? `${item.reps} επαν.` : comparableMode === 'mixed' ? `${item.value} πλάκες + ${item.extraWeight} kg · ${item.reps} επαν.` : `${item.value} ${primaryUnit} · ${item.reps} επαν.`;
  const weightLegend = primaryUnit ? `<span class="weight-key">${primaryUnit}</span>` : '';
  const weightSeries = primaryUnit ? `<polyline points="${line}" class="chart-line"/>` : '';
  panel.innerHTML = `<div class="chart-summary"><div><h2>${esc(exerciseName)}</h2></div>${progressItems ? `<div class="progress-verdict ${decline?'is-alert':''}">${progressItems}</div>` : ''}</div><div class="chart-legend">${weightLegend}${comparableMode==='mixed'?'<span class="extra-weight-key">Επιπλέον kg</span>':''}<span class="reps-key">Επαναλήψεις</span></div><div class="chart-wrap"><svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Γράφημα προόδου βάρους και επαναλήψεων"><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="chart-axis"/>${weightSeries}${extraLine?`<polyline points="${extraLine}" class="chart-extra-line"/>`:''}<polyline points="${repLine}" class="chart-reps-line"/>${points.map((item,i) => { const anchor=i===0?'start':i===points.length-1?'end':'middle', weightY=primaryUnit?y(item.value):height, labelY=Math.min(weightY,repY(item.reps),comparableMode==='mixed'?extraY(item.extraWeight):height)-17; return `<g><line x1="${x(i)}" y1="${repY(item.reps)}" x2="${x(i)}" y2="${height-bottom}" class="chart-guide"/>${primaryUnit?`<circle cx="${x(i)}" cy="${y(item.value)}" r="7" class="chart-dot"/>`:''}${comparableMode==='mixed'?`<circle cx="${x(i)}" cy="${extraY(item.extraWeight)}" r="5" class="chart-extra-dot"/>`:''}<circle cx="${x(i)}" cy="${repY(item.reps)}" r="5" class="chart-reps-dot"/><text x="${x(i)}" y="${labelY}" text-anchor="${anchor}" class="chart-value">${pointLabel(item)}</text><text x="${x(i)}" y="${height-bottom+24}" text-anchor="${anchor}" class="chart-date">${formatDate(item.session.date)}</text></g>`; }).join('')}</svg></div>${excluded.length ? `<div class="recording-warning"><strong>Έλεγχος καταγραφής: ${excluded.length} ${excluded.length===1?'προπόνηση εξαιρέθηκε':'προπονήσεις εξαιρέθηκαν'}.</strong><p>Το γράφημα χρησιμοποιεί μόνο «${modeLabel(comparableMode)}». ${excluded.map(item => `${formatDate(item.session.date)} — ${item.reason || `καταγράφηκε σε ${modeLabel(item.mode)}`}`).join(' · ')}</p></div>` : `<div class="recording-ok">✓ Όλες οι καταγραφές του σετ χρησιμοποιούν κοινή μέτρηση: ${modeLabel(comparableMode)}.</div>`}`;
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
let pendingConfirmation = null;
let pendingSecondaryConfirmation = null;
function askToConfirm(title, message, onConfirm) {
  $('#exercise-delete-title').textContent = title;
  $('#exercise-delete-message').textContent = message;
  $('#confirm-delete-accept').textContent = 'Διαγραφή';
  $('#confirm-delete-secondary').classList.add('hidden');
  pendingConfirmation = onConfirm;
  pendingSecondaryConfirmation = null;
  $('#exercise-delete-dialog').showModal();
}
function askToChoose(title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary) {
  $('#exercise-delete-title').textContent = title;
  $('#exercise-delete-message').textContent = message;
  $('#confirm-delete-accept').textContent = primaryLabel;
  const secondary = $('#confirm-delete-secondary');
  secondary.textContent = secondaryLabel;
  secondary.classList.remove('hidden');
  pendingConfirmation = onPrimary;
  pendingSecondaryConfirmation = onSecondary;
  $('#exercise-delete-dialog').showModal();
}
function askToDeleteExercise(exerciseName, onConfirm) { askToConfirm('Διαγραφή άσκησης', `Είστε σίγουροι για την διαγραφή της άσκησης "${exerciseName}" από την δήλωση της προπόνησης;`, onConfirm); }

function setMode(mode) {
  state.mode = mode; $$('.mode-button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#scheduled-session').classList.toggle('hidden', mode !== 'scheduled'); $('#free-session').classList.toggle('hidden', mode !== 'free');
  $('#workout-day-field').classList.toggle('hidden', mode !== 'scheduled');
  if (mode === 'free' && !$('#free-exercises').children.length) addFreeExercise();
}

function resetSessionForm() {
  state.editingSessionId = null;
  state.selectedPlanDay = null;
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
  state.selectedPlanDay = session.type === 'scheduled' ? (session.workoutDay || dayForDate(session.date)) : null;
  $('#log-date').value = session.date;
  $('#session-comments').value = session.comments || '';
  setMode(session.type);
  if (session.type === 'scheduled') {
    refreshWorkoutDayOptions(state.selectedPlanDay);
    $('#day-badge').innerHTML = `<span>${dayForDate(session.date)}</span><small>${formatDate(session.date)}</small>`;
    $('#scheduled-session').innerHTML = `<div class="session-intro"><div><h2>${esc(sessionWorkoutName(session))}</h2><p>Διόρθωσε τις τιμές που θέλεις και αποθήκευσε ξανά.</p></div></div>${session.exercises.map((item, index) => exerciseCard(item, false, index)).join('')}`;
  } else {
    $('#free-exercises').innerHTML = session.exercises.map(item => exerciseCard(item, true)).join('');
  }
  refreshCopySetButtons();
  $$('.mode-button').forEach(button => { button.disabled = true; });
  $('#cancel-session-edit').classList.remove('hidden');
  $('#save-session').innerHTML = 'Αποθήκευση διορθώσεων <span>✓</span>';
  showView('log');
  $('#log-view').scrollIntoView({ behavior:'smooth', block:'start' });
}

function showView(view) {
  const current = $('.view.active')?.id.replace('-view','');
  const labels = { log:'Καταγραφή', plan:'Πρόγραμμα', overview:'Ιστορικό', progress:'Επίβλεψη' };
  closeMenu();
  if (current === view) return;
  const swap = () => {
    $$('.nav-button,.view').forEach(el => el.classList.remove('active'));
    $(`.nav-button[data-view="${view}"]`).classList.add('active');
    $(`#${view}-view`).classList.add('active');
    $('#current-view-label').textContent = labels[view];
    if (view === 'overview') renderOverview();
    if (view === 'progress') renderProgressSelectors();
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
  const transition = $('#view-transition');
  transition.querySelector('span').textContent = labels[view];
  transition.classList.remove('running');
  void transition.offsetWidth;
  transition.classList.add('running');
  setTimeout(swap, 320);
  setTimeout(() => transition.classList.remove('running'), 780);
}

function setMenu(open) {
  $('#side-menu').classList.toggle('open', open);
  $('#menu-backdrop').classList.toggle('open', open);
  $('#side-menu').setAttribute('aria-hidden', String(!open));
  $('#open-menu').setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeMenu() { setMenu(false); }

$$('.nav-button').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
$('#open-menu').addEventListener('click', () => setMenu(true));
$('#close-menu').addEventListener('click', closeMenu);
$('#menu-backdrop').addEventListener('click', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
$('#progress-workout').addEventListener('change', renderProgressSelectors);
$('#progress-exercise').addEventListener('change', renderProgressSelectors);
$('#progress-set').addEventListener('change', renderProgressChart);
$('.brand').addEventListener('click', event => { event.preventDefault(); showView('overview'); });
$$('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#log-date').addEventListener('change', () => {
  if (!state.editingSessionId) { state.selectedPlanDay = null; return renderScheduledSession(); }
  const date = $('#log-date').value;
  $('#day-badge').innerHTML = `<span>${dayForDate(date)}</span><small>${formatDate(date)}</small>`;
});
$('#workout-day-select').addEventListener('change', event => renderScheduledSession(event.target.value));
$('#exercise-count').addEventListener('input', renderPlanExercises);
$('#add-free-exercise').addEventListener('click', addFreeExercise);
$('#cancel-plan-edit').addEventListener('click', resetPlanForm);
$('#cancel-session-edit').addEventListener('click', resetSessionForm);
$('#confirm-delete-cancel').addEventListener('click', () => { pendingConfirmation = null; pendingSecondaryConfirmation = null; $('#exercise-delete-dialog').close(); });
$('#confirm-delete-secondary').addEventListener('click', () => {
  const action = pendingSecondaryConfirmation;
  pendingConfirmation = null; pendingSecondaryConfirmation = null;
  $('#exercise-delete-dialog').close();
  if (action) action();
});
$('#confirm-delete-accept').addEventListener('click', () => {
  const deletion = pendingConfirmation;
  pendingConfirmation = null; pendingSecondaryConfirmation = null;
  $('#exercise-delete-dialog').close();
  if (deletion) deletion();
});
$('#exercise-delete-dialog').addEventListener('cancel', () => { pendingConfirmation = null; pendingSecondaryConfirmation = null; });
document.addEventListener('input', event => {
  if (event.target.closest('[data-set]')) refreshCopySetButton(event.target.closest('[data-exercise]'));
  if (!event.target.matches('.free-set-count')) return;
  const card = event.target.closest('[data-exercise]');
  const rows = card.querySelector('.exercise-sets');
  const values = [...rows.querySelectorAll('[data-set]')].map(row => ({ reps:row.querySelector('.set-reps').value, weightMode:row.querySelector('.weight-mode').value, weight:row.querySelector('.set-weight').value, plates:row.querySelector('.set-plates').value }));
  const count = Math.max(1, Math.min(20, Number(event.target.value) || 1));
  rows.innerHTML = setRows(count, values);
  refreshCopySetButton(card);
});

document.addEventListener('change', event => {
  if (event.target.matches('.weight-mode')) {
    const row = event.target.closest('[data-set]');
    const mode = event.target.value;
    configureWeightMode(row, mode);
    refreshCopySetButton(event.target.closest('[data-exercise]'));
    return;
  }
  if (!event.target.matches('[data-select-session]')) return;
  event.target.closest('.session-card').classList.toggle('session-selected', event.target.checked);
});

$('#plan-form').addEventListener('submit', event => {
  event.preventDefault();
  const day = $('#plan-day').value;
  const workoutName = $('#workout-name').value.trim();
  const sourceDay = state.editingDay;
  const previousItems = sourceDay ? state.plan.filter(item => item.day === sourceDay) : [];
  const exercises = $$('.plan-exercise-fields').map(card => ({ id:card.dataset.planId || id(), day, workoutName, exercise:card.querySelector('.builder-name').value.trim(), workSets:Number(card.querySelector('.builder-sets').value), cues:card.querySelector('.builder-cues').value.trim(), sets:Array.from({ length:Number(card.querySelector('.builder-sets').value) }, () => ({})) }));
  const savePlan = updateHistory => {
    state.plan = [...state.plan.filter(item => item.day !== day && item.day !== sourceDay), ...exercises];
    store.write('trainingPlan', state.plan);
    if (updateHistory) syncPlanChangesToHistory(sourceDay, day, previousItems, exercises);
    resetPlanForm(); renderPlan(); renderScheduledSession(); renderOverview();
    toast(updateHistory ? 'Το Πρόγραμμα και το Ιστορικό ενημερώθηκαν ✓' : sourceDay ? 'Ενημερώθηκε μόνο το Πρόγραμμα ✓' : `Η προπόνηση για ${day} αποθηκεύτηκε`);
  };
  const renamedWorkout = previousItems.length && previousItems[0].workoutName !== workoutName;
  const renamedExercise = previousItems.some(previous => { const next = exercises.find(item => item.id === previous.id); return next && next.exercise !== previous.exercise; });
  const movedDay = Boolean(sourceDay && sourceDay !== day);
  if (renamedWorkout || renamedExercise || movedDay) {
    askToChoose('Ενημέρωση παλιού Ιστορικού', 'Άλλαξε όνομα προπόνησης, άσκησης ή ημέρα. Θέλεις οι παλιές καταγραφές να διατηρήσουν τα ιστορικά τους ονόματα ή να ενημερωθούν μαζί με το Πρόγραμμα;', 'Πρόγραμμα + Ιστορικό', 'Μόνο Πρόγραμμα', () => savePlan(true), () => savePlan(false));
  } else savePlan(false);
});

$('#save-session').addEventListener('click', () => {
  if (!$('#log-date').checkValidity()) { $('#log-date').reportValidity(); return toast('Επίλεξε ημερομηνία προπόνησης'); }
  const container = state.mode === 'scheduled' ? $('#scheduled-session') : $('#free-exercises');
  const exercises = collectExercises(container);
  if (!exercises.length) return toast('Πρόσθεσε τουλάχιστον μία άσκηση');
  if (container.querySelector(':invalid')) { container.querySelector(':invalid').reportValidity(); return; }
  const existing = state.sessions.find(item => String(item.id) === String(state.editingSessionId));
  const workoutName = state.mode === 'scheduled' ? state.plan.find(item => item.day === state.selectedPlanDay)?.workoutName || (existing ? sessionWorkoutName(existing) : 'Προπόνηση') : 'Ελεύθερη προπόνηση';
  const session = { id:existing?.id || id(), date:$('#log-date').value, type:state.mode, workoutDay:state.mode === 'scheduled' ? state.selectedPlanDay : null, workoutName, comments:$('#session-comments').value.trim(), exercises };
  if (existing) state.sessions = state.sessions.map(item => String(item.id) === String(existing.id) ? session : item);
  else state.sessions.unshift(session);
  store.write('trainingSessions', state.sessions);
  const wasEditing = Boolean(existing);
  resetSessionForm(); renderOverview(); toast(wasEditing ? 'Οι διορθώσεις αποθηκεύτηκαν.' : 'Η δουλειά καταγράφηκε.');
});

document.addEventListener('click', event => {
  if (event.target.matches('.switch-free')) setMode('free');
  if (event.target.matches('.copy-first-set')) {
    copyFirstSetToRemaining(event.target.closest('[data-exercise]'));
    toast('Το 1ο σετ αντιγράφηκε στα υπόλοιπα.');
  }
  if (event.target.matches('.remove-exercise')) event.target.closest('[data-exercise]').remove();
  if (event.target.matches('.remove-plan-exercise')) {
    const card = event.target.closest('.plan-exercise-fields');
    const exerciseName = card.querySelector('.builder-name').value.trim() || 'χωρίς όνομα';
    askToDeleteExercise(exerciseName, () => {
      card.remove();
      const cards = $$('.plan-exercise-fields');
      cards.forEach((item, index) => { item.querySelector('.builder-number').textContent = String(index + 1).padStart(2,'0'); });
      $('#exercise-count').value = cards.length;
      toast('Η άσκηση αφαιρέθηκε από το Πρόγραμμα');
    });
  }
  if (event.target.matches('.remove-planned-exercise')) {
    const card = event.target.closest('[data-exercise]');
    const exerciseName = card.querySelector('.exercise-source-name').value;
    askToDeleteExercise(exerciseName, () => {
      card.remove();
      $$('#scheduled-session [data-exercise] .exercise-order').forEach((label, index) => { label.textContent = `ΑΣΚΗΣΗ ${index + 1}η`; });
      toast('Η άσκηση αφαιρέθηκε από τη δήλωση');
    });
  }
  if (event.target.matches('.add-extra-set')) { const card = event.target.closest('[data-exercise]'), rows = card.querySelector('.exercise-sets'); rows.insertAdjacentHTML('beforeend', setRows(1, [{}], '', { extra:true, startIndex:rows.children.length })); refreshCopySetButton(card); }
  if (event.target.matches('.remove-extra-set')) { const card = event.target.closest('[data-exercise]'), rows = event.target.closest('.exercise-sets'); event.target.closest('[data-set]').remove(); [...rows.children].forEach((row, index) => row.querySelector('.set-number').textContent = String(index + 1).padStart(2,'0')); refreshCopySetButton(card); }
  if (event.target.dataset.editDay) loadDayForEdit(event.target.dataset.editDay);
  if (event.target.dataset.editSession) loadSessionForEdit(event.target.dataset.editSession);
  if (event.target.dataset.deleteDay) {
    const day = event.target.dataset.deleteDay;
    askToConfirm('Διαγραφή ημέρας προγράμματος', `Να διαγραφεί ολόκληρο το πρόγραμμα της ${day}; Το ήδη καταγεγραμμένο Ιστορικό θα παραμείνει.`, () => {
      state.plan = state.plan.filter(x => x.day !== day);
      store.write('trainingPlan', state.plan);
      if (state.editingDay === day) resetPlanForm(); else refreshDayOptions();
      renderPlan(); renderScheduledSession(); toast(`Το πρόγραμμα της ${day} διαγράφηκε`);
    });
  }
  if (event.target.dataset.deleteSession) {
    const sessionId = event.target.dataset.deleteSession;
    const session = state.sessions.find(item => String(item.id) === String(sessionId));
    askToConfirm('Διαγραφή προπόνησης', `Να διαγραφεί οριστικά η προπόνηση ${session ? `«${sessionWorkoutName(session)}» στις ${formatDate(session.date)}` : ''}; Θα χαθούν όλα τα σετ και οι μετρήσεις της.`, () => {
      state.sessions = state.sessions.filter(x => String(x.id) !== String(sessionId));
      store.write('trainingSessions', state.sessions); renderOverview(); toast('Η προπόνηση διαγράφηκε');
    });
  }
});

$('#log-date').valueAsDate = new Date(); refreshDayOptions(); renderPlanExercises(); renderPlan(); renderScheduledSession(); renderOverview();
