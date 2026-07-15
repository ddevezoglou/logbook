const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

function safeStoreWrite(key, value, message = 'Δεν ήταν δυνατή η αποθήκευση. Ελευθέρωσε χώρο και δοκίμασε ξανά.') {
  try {
    store.write(key, value);
    return true;
  } catch {
    const notification = document.querySelector('#toast');
    if (notification) {
      notification.textContent = message;
      notification.classList.add('show');
      setTimeout(() => notification.classList.remove('show'), 2200);
    }
    return false;
  }
}

const days = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const planOrder = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
const MIN_CYCLE_LENGTH = 3;
const MAX_CYCLE_LENGTH = 10;
const clampCycleLength = value => Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, Number(value) || 7));
const dateParts = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? match.slice(1).map(Number) : null;
};
const dateFromParts = parts => parts ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
const inputDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const mondayFor = (value = inputDateValue()) => {
  const date = dateFromParts(dateParts(value)) || new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return inputDateValue(date);
};
const legacyCycleDay = day => { const index = planOrder.indexOf(day); return index >= 0 ? index + 1 : null; };
const validCycleDay = (value, length) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= length ? Number(value) : null;
function normalizeRoutine(routine = {}, index = 0) {
  const cycleLength = clampCycleLength(routine.cycleLength);
  const cycleAnchorDate = dateParts(routine.cycleAnchorDate) ? routine.cycleAnchorDate : mondayFor();
  const plan = Array.isArray(routine.plan) ? routine.plan.map(item => {
    const cycleDay = validCycleDay(item.cycleDay, cycleLength) || validCycleDay(legacyCycleDay(item.day), cycleLength);
    return cycleDay ? { ...item, cycleDay } : null;
  }).filter(Boolean) : [];
  return { id:routine.id || crypto.randomUUID(), name:routine.name || `Πρόγραμμα ${index + 1}`, isActive:Boolean(routine.isActive), cycleLength, cycleAnchorDate, plan };
}
const cycleDayForDate = (routine, value) => {
  const anchor = dateParts(routine?.cycleAnchorDate);
  const current = dateParts(value);
  if (!anchor || !current) return 1;
  const difference = Math.round((Date.UTC(...[current[0], current[1] - 1, current[2]]) - Date.UTC(...[anchor[0], anchor[1] - 1, anchor[2]])) / 86400000);
  const length = clampCycleLength(routine?.cycleLength);
  return ((difference % length) + length) % length + 1;
};
const weekdayForCycleDay = (routine, cycleDay) => {
  const anchor = dateFromParts(dateParts(routine?.cycleAnchorDate)) || new Date();
  anchor.setDate(anchor.getDate() + Number(cycleDay) - 1);
  return days[anchor.getDay()];
};
const cycleDayLabel = (routine, cycleDay) => `Ημέρα ${cycleDay} · ${weekdayForCycleDay(routine, cycleDay)}`;
const itemCycleDay = (item, routine) => validCycleDay(item?.cycleDay, clampCycleLength(routine?.cycleLength)) || legacyCycleDay(item?.day);
const oldLogs = store.read('trainingLogs');
const savedSessions = store.read('trainingSessions');
const savedProfile = store.read('userProfile');
const legacyPlan = store.read('trainingPlan');
const savedRoutines = store.read('trainingRoutines');
const migratedRoutine = normalizeRoutine({ id:crypto.randomUUID(), name:'Το πρόγραμμά μου', isActive:true, cycleLength:7, cycleAnchorDate:mondayFor(), plan:Array.isArray(legacyPlan) ? legacyPlan : [] });
const routines = Array.isArray(savedRoutines) && savedRoutines.length
  ? savedRoutines.map(normalizeRoutine)
  : [migratedRoutine];
if (!routines.some(routine => routine.isActive)) routines[0].isActive = true;
let foundActiveRoutine = false;
routines.forEach(routine => { if (routine.isActive && !foundActiveRoutine) foundActiveRoutine = true; else if (routine.isActive) routine.isActive = false; });
const state = { routines, selectedRoutineId:routines.find(routine => routine.isActive)?.id ?? routines[0]?.id ?? null, editingRoutineId:null, sessions: savedSessions.length ? savedSessions : oldLogs.map(log => ({ id:log.id, date:log.date, type:'free', comments:'', exercises:[{ exercise:log.exercise, comments:log.comments || '', sets:log.sets || [] }] })), profile:(!Array.isArray(savedProfile) && savedProfile) ? savedProfile : null, mode: 'scheduled', editingDay:null, editingSessionId:null, selectedPlanDay:null, expandedSessionId:null };
let customAvatarData = state.profile?.customImage || '';
if (!savedSessions.length && oldLogs.length) safeStoreWrite('trainingSessions', state.sessions);
if (!(Array.isArray(savedRoutines) && savedRoutines.length) || JSON.stringify(savedRoutines) !== JSON.stringify(state.routines)) safeStoreWrite('trainingRoutines', state.routines);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const dailyQuotes = Array.isArray(window.LogbookQuotes)
  ? window.LogbookQuotes.filter(quote => quote?.active !== false && typeof quote?.text === 'string' && quote.text.trim())
  : [];

function renderHome() {
  const now = new Date();
  const locale = window.LogbookI18n?.getLocale?.() || 'el-GR';
  $('#home-date').textContent = new Intl.DateTimeFormat(locale, { weekday:'long', day:'numeric', month:'long' }).format(now);
  const loggedDays = new Set(state.sessions.map(session => session.date)).size;
  $('.home-pageno').textContent = `PAGE ${String(loggedDays + 1).padStart(3, '0')}`;
  const dayNumber = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  const quoteIndex = dailyQuotes.length ? ((dayNumber % dailyQuotes.length) + dailyQuotes.length) % dailyQuotes.length : 0;
  const quote = dailyQuotes[quoteIndex];
  $('#daily-quote-text').textContent = quote?.text || '—';
  $('#daily-quote-author').textContent = quote?.author || 'Logbook';
  $('#quote-index').textContent = dailyQuotes.length ? `${String(quoteIndex + 1).padStart(2, '0')} / ${String(dailyQuotes.length).padStart(2, '0')}` : '00 / 00';
  renderHomeProfileCard();
}
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const id = () => crypto.randomUUID();
const localDateInputValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const localDate = date => date ? new Date(`${date}T12:00:00`) : null;
const dayForDate = date => date ? days[localDate(date).getDay()] : 'Χωρίς ημέρα';
const formatDate = date => date ? localDate(date).toLocaleDateString(window.LogbookI18n?.getLocale() || 'el-GR', { day:'numeric', month:'short', year:'numeric' }) : 'Χωρίς ημερομηνία';
const selectedRoutine = () => state.routines.find(routine => routine.id === state.selectedRoutineId) || state.routines[0];
const activeRoutine = () => state.routines.find(routine => routine.isActive) || state.routines[0];
const selectedPlan = () => selectedRoutine()?.plan || [];
const activePlan = () => activeRoutine()?.plan || [];
const persistRoutines = () => safeStoreWrite('trainingRoutines', state.routines);
const persistSessions = sessions => safeStoreWrite('trainingSessions', sessions);

const rewardLabels = ['ΔΗΜΙΟΥΡΓΗΣΕ ΠΡΟΓΡΑΜΜΑ','PLAN SETUP','KEEP UP THE WORK','NEVER GIVE UP','GYMRAT'];
const shiftCycle = (routine, cycle, amount) => { const date = localDate(cycle); date.setDate(date.getDate() + amount * clampCycleLength(routine?.cycleLength)); return localDateInputValue(date); };
const cycleStartKey = (routine, value) => {
  const date = localDate(value) || new Date();
  date.setDate(date.getDate() - (cycleDayForDate(routine, localDateInputValue(date)) - 1));
  return localDateInputValue(date);
};

function createRewardTracking() {
  const periods = {};
  state.routines.forEach(routine => {
    const weeks = state.sessions
      .filter(session => session.type === 'scheduled' && session.routineId === routine.id && session.date)
      .map(session => cycleStartKey(routine, session.date)).sort();
    periods[routine.id] = weeks.length ? [{ start:weeks[0], end:routine.isActive ? null : weeks.at(-1) }] : [];
  });
  const active = activeRoutine();
  if (active && !periods[active.id].some(period => period.end === null)) periods[active.id].push({ start:cycleStartKey(active, localDateInputValue()), end:null });
  return { version:1, activeRoutineId:active?.id || null, periods };
}

function loadRewardTracking() {
  const saved = store.read('routineRewardTracking');
  const valid = !Array.isArray(saved) && saved?.version === 1 && saved.periods && typeof saved.periods === 'object';
  const tracking = valid ? saved : createRewardTracking();
  state.routines.forEach(routine => { if (!Array.isArray(tracking.periods[routine.id])) tracking.periods[routine.id] = []; });
  const activeId = activeRoutine()?.id || null;
  if (tracking.activeRoutineId !== activeId) {
    const previousPeriods = tracking.periods[tracking.activeRoutineId] || [];
    const previousOpen = previousPeriods.findLast?.(period => period.end === null) || [...previousPeriods].reverse().find(period => period.end === null);
    const previousRoutine = state.routines.find(routine => routine.id === tracking.activeRoutineId);
    if (previousOpen) previousOpen.end = cycleStartKey(previousRoutine, localDateInputValue());
    if (activeId) tracking.periods[activeId].push({ start:cycleStartKey(activeRoutine(), localDateInputValue()), end:null });
    tracking.activeRoutineId = activeId;
  }
  safeStoreWrite('routineRewardTracking', tracking);
  return tracking;
}

let rewardTracking = loadRewardTracking();

function switchRewardRoutine(previousId, nextId) {
  if (!nextId || previousId === nextId) return;
  const previousRoutine = state.routines.find(routine => routine.id === previousId);
  const nextRoutine = state.routines.find(routine => routine.id === nextId);
  const previousPeriods = rewardTracking.periods[previousId] || [];
  const openPeriod = previousPeriods.findLast?.(period => period.end === null) || [...previousPeriods].reverse().find(period => period.end === null);
  if (openPeriod) openPeriod.end = cycleStartKey(previousRoutine, localDateInputValue());
  if (!Array.isArray(rewardTracking.periods[nextId])) rewardTracking.periods[nextId] = [];
  const last = rewardTracking.periods[nextId].at(-1);
  if (!last || last.end !== null) rewardTracking.periods[nextId].push({ start:cycleStartKey(nextRoutine, localDateInputValue()), end:null });
  rewardTracking.activeRoutineId = nextId;
  safeStoreWrite('routineRewardTracking', rewardTracking);
}

function routineReward(routine = activeRoutine()) {
  const plannedDays = new Set((routine?.plan || []).map(item => itemCycleDay(item, routine)));
  const target = plannedDays.size;
  if (!routine || !target) return { stage:0, streak:0, target:0, completedThisWeek:0, label:rewardLabels[0], routine };
  const completions = new Map();
  state.sessions.forEach(session => {
    if (session.type !== 'scheduled' || session.routineId !== routine.id || !session.date) return;
    const cycle = cycleStartKey(routine, session.date);
    if (!completions.has(cycle)) completions.set(cycle, new Set());
    const cycleDay = validCycleDay(session.cycleDay, routine.cycleLength) || legacyCycleDay(session.workoutDay) || cycleDayForDate(routine, session.date);
    completions.get(cycle).add(plannedDays.has(cycleDay) ? cycleDay : `date:${session.date}`);
  });
  const currentWeek = cycleStartKey(routine, localDateInputValue());
  const periods = rewardTracking.periods[routine.id] || [];
  let streak = 0, maxStreak = 0;
  const processed = new Set();
  periods.forEach(period => {
    const cappedEnd = !period.end || period.end > currentWeek ? currentWeek : period.end;
    for (let week = cycleStartKey(routine, period.start); week <= cappedEnd; week = shiftCycle(routine, week, 1)) {
      if (processed.has(week)) continue;
      processed.add(week);
      const completed = (completions.get(week)?.size || 0) >= target;
      const partialBoundary = week === cappedEnd && (week === currentWeek || period.end !== null);
      if (completed) { streak += 1; maxStreak = Math.max(maxStreak, streak); }
      else if (!partialBoundary) streak = 0;
    }
  });
  // GYMRAT is permanent for a routine after 12 completed microcycles.
  const stage = maxStreak >= 12 ? 4 : streak >= 4 ? 3 : streak >= 1 ? 2 : 1;
  return { stage, streak, target, completedThisWeek:Math.min(target, completions.get(currentWeek)?.size || 0), label:rewardLabels[stage], routine };
}

function renderRewards() {
  const reward = routineReward();
  const ring = $('#profile-reward-ring');
  if (ring) {
    ring.className = `profile-reward-ring reward-stage-${reward.stage}`;
    const periodLabel = reward.routine?.cycleLength === 7
      ? (reward.streak === 1 ? 'συνεχόμενη εβδομάδα' : 'συνεχόμενες εβδομάδες')
      : (reward.streak === 1 ? 'συνεχόμενος μικρόκυκλος' : 'συνεχόμενοι μικρόκυκλοι');
    const detail = reward.target
      ? `${reward.routine.name} · ${reward.streak} ${periodLabel} · ${reward.completedThisWeek}/${reward.target} ${reward.routine.cycleLength === 7 ? 'αυτή την εβδομάδα' : 'σε αυτόν τον μικρόκυκλο'}`
      : 'Δήλωσε τις ημέρες του πρώτου σου προγράμματος';
    ring.setAttribute('aria-label', `${reward.label} · ${reward.stage} από 4 στάδια επιβράβευσης · ${detail}`);
  }
  const stamp = $('#home-reward-stamp');
  if (stamp) {
    stamp.classList.toggle('hidden', reward.stage === 0);
    stamp.dataset.stage = String(reward.stage);
    $('#home-reward-label').textContent = reward.label;
    $('#home-profile-card').dataset.rewardStage = String(reward.stage);
  }
}

function setRows(count, values = [], prefix = '', options = {}) {
  const { extra = false, startIndex = 0 } = options;
  return Array.from({ length: count }, (_, i) => {
    const value = values[i] || {};
    const mode = value.weightMode || (value.plates !== undefined && value.plates !== '' ? (value.weight !== undefined && value.weight !== '' ? 'mixed' : 'plates') : 'kg');
    const setPosition = startIndex + i + 1;
    return `<div class="set-row ${extra ? 'extra-set' : ''}" data-set data-weight-mode="${mode}" ${extra ? 'data-extra-set' : ''}><span class="set-number">${String(setPosition).padStart(2,'0')}</span>
      <input class="${prefix}reps set-reps" type="number" min="0" placeholder="0" value="${value.reps ?? ''}" aria-label="Επαναλήψεις σετ ${setPosition}" required>
      <select class="weight-mode" aria-label="Τρόπος καταγραφής βάρους για το σετ ${setPosition}"><option value="kg" ${mode === 'kg' ? 'selected' : ''}>Κιλά</option><option value="plates" ${mode === 'plates' ? 'selected' : ''}>Πλάκες</option><option value="mixed" ${mode === 'mixed' ? 'selected' : ''}>Πλάκες + Κιλά</option><option value="bodyweight" ${mode === 'bodyweight' ? 'selected' : ''}>Bodyweight</option><option value="bodyweight_extra" ${mode === 'bodyweight_extra' ? 'selected' : ''}>Bodyweight + Extra Βάρος</option></select>
      <div class="weight-entry"><input class="${prefix}plates set-plates" type="number" min="0" step="1" placeholder="πλάκες" value="${value.plates ?? ''}" aria-label="Πλάκες σετ ${setPosition}" ${mode === 'plates' || mode === 'mixed' ? 'required' : ''}><input class="${prefix}weight set-weight" type="number" min="0" step="0.05" placeholder="${mode === 'bodyweight_extra' ? 'extra kg' : 'kg'}" value="${value.weight ?? ''}" aria-label="Κιλά σετ ${setPosition}" ${mode === 'kg' || mode === 'mixed' || mode === 'bodyweight_extra' ? 'required' : ''}></div>${extra ? '<button class="remove-extra-set" type="button" aria-label="Διαγραφή extra σετ">×</button>' : ''}</div>`;
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
  const routine = selectedRoutine();
  if (!routine) return;
  const preferredCycleDay = validCycleDay(preferred, routine.cycleLength);
  const used = new Set(selectedPlan().map(item => itemCycleDay(item, routine)));
  const available = Array.from({ length:routine.cycleLength }, (_, index) => index + 1).filter(cycleDay => !used.has(cycleDay) || cycleDay === preferredCycleDay);
  $('#plan-day').innerHTML = available.length
    ? available.map(cycleDay => `<option value="${cycleDay}" ${cycleDay === preferredCycleDay ? 'selected' : ''}>${cycleDayLabel(routine, cycleDay)}</option>`).join('')
    : '<option value="" selected disabled>Όλες οι ημέρες του μικρόκυκλου έχουν πρόγραμμα</option>';
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
  const routine = selectedRoutine();
  const plan = selectedPlan();
  const activeDays = new Set(plan.map(item => itemCycleDay(item, routine))).size;
  $('#selected-routine-label').toggleAttribute('data-i18n-user', Boolean(routine?.name));
  $('#plan-board-title').toggleAttribute('data-i18n-user', Boolean(routine?.name));
  $('#selected-routine-label').textContent = routine?.name || '';
  $('#plan-board-title').textContent = routine?.name || 'ΤΟ ΠΛΑΝΟ ΣΟΥ';
  $('#plan-count').textContent = `${activeDays}/${routine?.cycleLength || 7} ημέρες`;
  $('#plan-list').innerHTML = Array.from({ length:routine?.cycleLength || 7 }, (_, dayIndex) => {
    const cycleDay = dayIndex + 1;
    const day = weekdayForCycleDay(routine, cycleDay);
    const items = plan.filter(item => itemCycleDay(item, routine) === cycleDay);
    const workoutName = items[0]?.workoutName || (items.length ? 'Προπόνηση' : 'Ημέρα ξεκούρασης');
    return `<section class="day-card ${items.length ? 'active-day' : ''}"><div class="day-card-head"><span>${String(cycleDay).padStart(2,'0')}</span><div><h3>${day}</h3><p ${items.length ? 'data-i18n-user' : ''}>${esc(workoutName)}</p></div>${items.length ? `<div class="day-card-actions"><button class="edit-day" data-edit-day="${cycleDay}" type="button">Επεξεργασία</button><button class="delete-day" data-delete-day="${cycleDay}" aria-label="Διαγραφή ημέρας ${cycleDay}">×</button></div>` : ''}</div>
      <div class="day-exercises">${items.length ? items.map(item => `<article><div><strong data-i18n-user>${esc(item.exercise)}</strong><small>${item.sets?.length || item.workSets || 3} εργάσιμα σετ</small></div>${item.cues ? `<p data-i18n-user>→ ${esc(item.cues)}</p>` : ''}</article>`).join('') : '<small>Δεν έχει οριστεί προπόνηση</small>'}</div></section>`;
  }).join('');
}

function renderRoutines() {
  $('#routine-list').innerHTML = state.routines.map((routine, index) => {
    const selected = routine.id === state.selectedRoutineId;
    const dayCount = new Set(routine.plan.map(item => itemCycleDay(item, routine))).size;
    if (routine.id === state.editingRoutineId) return `<article class="routine-card routine-card-editing ${selected ? 'selected-routine' : ''} ${routine.isActive ? 'active-routine' : ''}" data-routine-id="${esc(routine.id)}">
      <form class="routine-inline-form" data-routine-rename-form="${esc(routine.id)}"><span>${String(index + 1).padStart(2,'0')}</span><label>Όνομα προγράμματος<input class="routine-inline-name" type="text" maxlength="50" value="${esc(routine.name)}" required></label><div><button class="routine-inline-save" type="submit" aria-label="Αποθήκευση ονόματος">✓</button><button class="routine-inline-cancel" data-cancel-routine-edit type="button" aria-label="Ακύρωση μετονομασίας">×</button></div></form>
      ${routine.isActive ? '<em>ΣΤΗΝ ΚΑΤΑΓΡΑΦΗ</em>' : ''}
    </article>`;
    return `<article class="routine-card ${selected ? 'selected-routine' : ''} ${routine.isActive ? 'active-routine' : ''}" data-routine-id="${esc(routine.id)}">
      <button class="routine-select" data-select-routine="${esc(routine.id)}" type="button"><span>${String(index + 1).padStart(2,'0')}</span><strong data-i18n-user>${esc(routine.name)}</strong><small>${dayCount}/${routine.cycleLength} ημέρες · έναρξη ${formatDate(routine.cycleAnchorDate)}</small></button>
      <div class="routine-actions"><button class="routine-star" data-activate-routine="${esc(routine.id)}" type="button" aria-label="${routine.isActive ? 'Ενεργό πρόγραμμα' : 'Ορισμός ως ενεργό πρόγραμμα'}" aria-pressed="${routine.isActive}">${routine.isActive ? '★' : '☆'}</button><button class="routine-rename" data-rename-routine="${esc(routine.id)}" type="button" aria-label="Μετονομασία προγράμματος">✎</button><button class="routine-delete" data-delete-routine="${esc(routine.id)}" type="button" aria-label="Διαγραφή προγράμματος">×</button></div>
      ${routine.isActive ? '<em>ΣΤΗΝ ΚΑΤΑΓΡΑΦΗ</em>' : ''}
    </article>`;
  }).join('');
}

function exerciseCard(exercise, free = false, exerciseIndex = 0) {
  return `<article class="workout-exercise" data-exercise data-id="${exercise.id || id()}" data-plan-exercise-id="${esc(exercise.planExerciseId || exercise.id || '')}">
    <div class="exercise-title">${free ? `<input class="exercise-name" data-i18n-user type="text" value="${esc(exercise.exercise || '')}" placeholder="Όνομα άσκησης" required>` : `<div><span class="exercise-order">ΑΣΚΗΣΗ ${exerciseIndex + 1}η</span><h3 data-i18n-user>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<div class="exercise-title-actions"><span class="planned-tag">${exercise.sets.length} σετ</span><button class="remove-planned-exercise" type="button" aria-label="Διαγραφή άσκησης">×</button></div>`}</div>
    ${exercise.cues ? `<div class="cue-banner"><span>CUE</span><b data-i18n-user>${esc(exercise.cues)}</b></div>` : ''}
    ${free ? `<label class="free-set-selector">Αριθμός σετ<input class="free-set-count" type="number" min="1" max="20" value="${exercise.sets?.length || 3}"></label>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΜΕΤΡΗΣΗ ΒΑΡΟΥΣ</span><span>ΒΑΡΟΣ</span></div>
    <div class="exercise-sets">${setRows(exercise.sets?.length || 3, exercise.sets || [])}</div>
    <div class="set-actions"><button class="mini-button copy-first-set hidden" type="button" aria-label="Αντιγραφή του πρώτου σετ στα υπόλοιπα">ΑΝΤΙΓΡΑΦΗ</button>${free ? '' : `<button class="mini-button add-extra-set" type="button">＋ Extra σετ</button>`}</div>
    <label class="full-field">Σχόλια άσκησης<textarea class="exercise-comments" data-i18n-user rows="2" placeholder="Τεχνική, αίσθηση, RPE...">${esc(exercise.comments || '')}</textarea></label>
    <input class="exercise-source-name" type="hidden" value="${esc(exercise.exercise || '')}">
  </article>`;
}

function refreshWorkoutDayOptions(preferredDay) {
  const routine = activeRoutine();
  const plan = activePlan();
  if (!routine || !plan.length) {
    $('#workout-day-select').innerHTML = '<option value="" selected disabled>Δεν έχει δηλωθεί πρόγραμμα</option>';
    return preferredDay;
  }
  const selectedDay = validCycleDay(preferredDay, routine.cycleLength) || 1;
  const slots = Array.from({ length:routine.cycleLength }, (_, index) => {
    const cycleDay = index + 1;
    const workoutName = plan.find(item => itemCycleDay(item, routine) === cycleDay)?.workoutName || 'Ξεκούραση';
    return { cycleDay, label:`${cycleDayLabel(routine, cycleDay)} — ${workoutName}` };
  });
  $('#workout-day-select').innerHTML = slots.map(item => `<option data-i18n-user value="${item.cycleDay}" ${item.cycleDay === selectedDay ? 'selected' : ''}>${esc(item.label)}</option>`).join('');
  return selectedDay;
}

function renderScheduledSession(preferredDay = null) {
  const date = $('#log-date').value;
  const calendarDay = dayForDate(date);
  const routine = activeRoutine();
  const requestedPlanDay = preferredDay || state.selectedPlanDay || cycleDayForDate(routine, date);
  const planDay = refreshWorkoutDayOptions(requestedPlanDay);
  state.selectedPlanDay = planDay;
  $('#day-badge').innerHTML = `<span>${calendarDay}</span><small>${formatDate(date)}</small>`;
  const planned = activePlan().filter(item => itemCycleDay(item, routine) === Number(planDay)).map(item => ({ ...item, sets:Array.from({ length:item.sets?.length || item.workSets || 3 }, () => ({ reps:'', weight:'' })) }));
  const workoutName = planned[0]?.workoutName || 'Η προπόνηση της ημέρας';
  const slotLabel = cycleDayLabel(routine, planDay);
  $('#scheduled-session').innerHTML = planned.length ? `<div class="session-intro"><div><span class="active-routine-label" data-i18n-user>★ ${esc(routine?.name || 'Ενεργό πρόγραμμα')}</span><h2 data-i18n-user>${esc(workoutName)}</h2><p>${slotLabel} · Συμπλήρωσε όσα πραγματικά εκτέλεσες.</p></div></div>${planned.map((item, index) => exerciseCard(item, false, index)).join('')}` : `<div class="no-workout"><span data-i18n-user>★ ${esc(routine?.name || 'Ενεργό πρόγραμμα')} / REST</span><h2>Δεν υπάρχει ορισμένη προπόνηση για ${slotLabel}.</h2><p>Επίλεξε άλλη ημέρα μικρόκυκλου ή ξεκίνα μια «Ελεύθερη» καταγραφή.</p><button class="secondary-button switch-free" type="button">Έναρξη ελεύθερης προπόνησης</button></div>`;
  refreshCopySetButtons($('#scheduled-session'));
}

function addFreeExercise() { $('#free-exercises').insertAdjacentHTML('beforeend', exerciseCard({ sets:[{},{},{}] }, true)); refreshCopySetButtons($('#free-exercises')); }

function loadDayForEdit(day) {
  const routine = selectedRoutine();
  const cycleDay = validCycleDay(day, routine?.cycleLength);
  const items = selectedPlan().filter(item => itemCycleDay(item, routine) === cycleDay);
  if (!items.length) return;
  let addedStableIds = false;
  items.forEach(item => { if (!item.id) { item.id = id(); addedStableIds = true; } });
  if (addedStableIds) persistRoutines();
  state.editingDay = cycleDay;
  refreshDayOptions(cycleDay);
  $('#workout-name').value = items[0].workoutName || 'Προπόνηση';
  $('#exercise-count').value = items.length;
  renderPlanExercises();
  $$('.plan-exercise-fields').forEach((card, index) => {
    card.dataset.planId = items[index].id || id();
    card.querySelector('.builder-name').value = items[index].exercise;
    card.querySelector('.builder-sets').value = items[index].sets?.length || items[index].workSets || 3;
    card.querySelector('.builder-cues').value = items[index].cues || '';
  });
  $('#plan-form-title').textContent = `Επεξεργασία · ${cycleDayLabel(routine, cycleDay)}`;
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
  const routine = state.routines.find(item => item.id === session.routineId) || activeRoutine();
  const routinePlan = routine?.plan || activePlan();
  const cycleDay = validCycleDay(session.cycleDay, routine?.cycleLength) || legacyCycleDay(session.workoutDay || dayForDate(session.date));
  return routinePlan.find(item => itemCycleDay(item, routine) === cycleDay)?.workoutName || 'Προπόνηση';
}

function syncPlanChangesToHistory(routineId, sourceDay, targetDay, previousItems, nextItems) {
  if (!sourceDay || !previousItems.length) return true;
  const previousWorkoutName = previousItems[0].workoutName;
  const renameByOldName = new Map(previousItems.map(item => [normalizedName(item.exercise), nextItems.find(next => next.id === item.id) || null]));
  const nextSessions = state.sessions.map(session => {
    if (session.type !== 'scheduled') return session;
    const routine = state.routines.find(item => item.id === routineId);
    const sessionCycleDay = validCycleDay(session.cycleDay, routine?.cycleLength) || legacyCycleDay(session.workoutDay);
    const belongsToPlan = (session.routineId ? session.routineId === routineId : true) && (sessionCycleDay === Number(sourceDay) || (!sessionCycleDay && normalizedName(session.workoutName) === normalizedName(previousWorkoutName)));
    if (!belongsToPlan) return session;
    const syncedExercises = session.exercises.map(exercise => {
      const replacement = nextItems.find(item => item.id === exercise.planExerciseId) || renameByOldName.get(normalizedName(exercise.exercise));
      return replacement ? { ...exercise, exercise:replacement.exercise, planExerciseId:replacement.id } : exercise;
    });
    return { ...session, routineId, cycleDay:Number(targetDay), workoutDay:weekdayForCycleDay(routine, targetDay), workoutName:nextItems[0]?.workoutName || session.workoutName, exercises:syncedExercises };
  });
  if (!persistSessions(nextSessions)) return false;
  state.sessions = nextSessions;
  return true;
}

function loggedLoad(set = {}) {
  const mode = set.weightMode || 'kg';
  if (mode === 'bodyweight') return 'Σωματικό βάρος';
  if (mode === 'plates') return `${Number(set.plates) || 0} πλάκες`;
  if (mode === 'mixed') return `${Number(set.plates) || 0} πλάκες + ${Number(set.weight) || 0} kg`;
  if (mode === 'bodyweight_extra') return `Σωματικό βάρος + ${Number(set.weight) || 0} kg`;
  return `${Number(set.weight) || 0} kg`;
}

function sessionPage(session, sessionNumber) {
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  return `<section class="session-page" aria-label="Η σελίδα της προπόνησης">
    <div class="page-binding" aria-hidden="true"><i></i><i></i><i></i></div>
    <header class="session-page-head">
      <div><span>Η ΣΕΛΙΔΑ ΤΗΣ ΠΡΟΠΟΝΗΣΗΣ</span><strong>SESSION No ${sessionNumber}</strong></div>
      <time datetime="${esc(session.date || '')}">${dayForDate(session.date)} · ${formatDate(session.date)}</time>
    </header>
    <div class="session-page-title"><div><small>${session.type === 'scheduled' ? 'ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ' : 'ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ'}</small><h4 data-i18n-user>${esc(sessionWorkoutName(session))}</h4></div><span aria-hidden="true">LOGGED</span></div>
    ${session.comments ? `<p class="page-session-note" data-i18n-user><b>ΣΗΜΕΙΩΣΕΙΣ</b>${esc(session.comments)}</p>` : ''}
    <div class="page-exercises">${exercises.map((exercise, exerciseIndex) => {
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      return `<article class="page-exercise">
        <div class="page-exercise-title"><span>${String(exerciseIndex + 1).padStart(2, '0')}</span><div><h5 data-i18n-user>${esc(exercise.exercise || 'Άσκηση')}</h5>${exercise.comments ? `<p data-i18n-user>${esc(exercise.comments)}</p>` : ''}</div></div>
        <div class="page-set-table"><div class="page-set-head"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΒΑΡΟΣ</span></div>${sets.length ? sets.map((set, setIndex) => `<div class="page-set-row"><strong>${String(setIndex + 1).padStart(2, '0')}</strong><span>${Number(set.reps) || 0}</span><span>${esc(loggedLoad(set))}</span></div>`).join('') : '<p class="page-no-sets">Δεν καταγράφηκαν σετ.</p>'}</div>
      </article>`;
    }).join('')}</div>
    <footer><span>LOGBOOK / TRAINING JOURNAL</span><button type="button" data-close-session="${esc(session.id)}">ΚΛΕΙΣΙΜΟ ΣΕΛΙΔΑΣ ↑</button></footer>
  </section>`;
}

function renderOverview() {
  state.sessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const uniqueDates = new Set(state.sessions.map(s => s.date));
  const recentDays = Array.from({length:7}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - (6-i)); return d; });
  const completedRecent = recentDays.filter(d => uniqueDates.has(localDateInputValue(d))).length;
  const workingSetTotal = state.sessions.reduce((total, session) => total + session.exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0), 0);
  $('#metrics').innerHTML = `<article><strong>${state.sessions.length}</strong><span>ΠΡΟΠΟΝΗΣΕΙΣ</span></article><article><strong>${workingSetTotal}</strong><span>WORKING SETS</span></article><article><strong>${completedRecent}<small>/7</small></strong><span>ΣΥΧΝΟΤΗΤΑ ΕΒΔΟΜΑΔΑΣ</span></article>`;
  $('#week-strip').innerHTML = recentDays.map(d => {
    const key = localDateInputValue(d), done = uniqueDates.has(key);
    const inner = `<span>${days[d.getDay()].slice(0,3)}</span><strong>${d.getDate()}</strong>`;
    return done
      ? `<button class="day-tile done" type="button" data-goto-date="${key}" aria-label="Δες την προπόνηση της ${formatDate(key)}">${inner}</button>`
      : `<div class="day-tile">${inner}</div>`;
  }).join('');
  $('#session-cards').innerHTML = state.sessions.length ? state.sessions.map((session, index) => {
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    const sessionNumber = state.sessions.length - index;
    const setCount = exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0);
    const expanded = String(state.expandedSessionId) === String(session.id);
    return `<article class="session-card ${expanded ? 'session-expanded' : ''}" data-session-id="${esc(session.id)}" data-session-date="${esc(session.date || '')}"><div class="session-summary" data-view-session="${esc(session.id)}" role="button" tabindex="0" aria-expanded="${expanded}" aria-label="${expanded ? 'Κλείσιμο' : 'Άνοιγμα'} προπόνησης ${esc(sessionWorkoutName(session))}"><div class="card-date"><span>${dayForDate(session.date)}</span><strong>${formatDate(session.date)}</strong><small>SESSION No ${sessionNumber}</small></div><div class="card-body"><div class="card-stats"><span>${exercises.length} ΑΣΚΗΣΕΙΣ</span><span>${setCount} WORKING SETS</span><span class="card-type">${session.type === 'scheduled' ? 'ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ' : 'ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ'}</span></div><div class="card-title-row"><h3 data-i18n-user>${esc(sessionWorkoutName(session))}</h3></div><p class="card-exercises" data-i18n-user>${exercises.map(ex => esc(ex.exercise)).join(' · ')}</p>${session.comments ? `<p class="card-comment" data-i18n-user>${esc(session.comments)}</p>` : ''}</div><span class="card-stamp" aria-hidden="true">LOGGED</span><div class="card-actions"><label class="session-select"><input type="checkbox" data-select-session="${session.id}"><span>ΕΠΙΛΟΓΗ</span></label><div class="card-selection-actions"><button class="card-edit" data-edit-session="${session.id}" type="button">ΕΠΕΞΕΡΓΑΣΙΑ</button><button class="card-delete" data-delete-session="${session.id}" type="button">ΔΙΑΓΡΑΦΗ</button></div></div></div><div class="session-page-wrap" aria-hidden="${!expanded}">${expanded ? sessionPage(session, sessionNumber) : ''}</div></article>`;
  }).join('') : '<div class="empty"><strong>Η γραμμή εκκίνησης είναι εδώ.</strong><span>Ολοκλήρωσε την πρώτη προπόνηση και άρχισε να χτίζεις το αρχείο σου.</span></div>';
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
  $('#personal-bests').innerHTML = ranked.length ? ranked.map(best => `<article><div><strong data-i18n-user>${esc(best.name)}</strong><small>${best.set.reps} επαναλήψεις</small></div><b>${bestValue(best)}</b></article>`).join('') : '<div class="empty"><strong>Τα σημεία αναφοράς θα έρθουν.</strong><span>Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σου.</span></div>';
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
  workoutSelect.innerHTML = workouts.length ? workouts.map(item => `<option data-i18n-user value="${esc(item.key)}">${esc(item.name)}</option>`).join('') : '<option value="">Δεν υπάρχουν προπονήσεις</option>';
  if (workouts.some(item => item.key === previousWorkout)) workoutSelect.value = previousWorkout;
  const selected = workouts.find(item => item.key === workoutSelect.value), exercises = new Map();
  selected?.sessions.forEach(session => session.exercises.forEach(exercise => { const key = normalizedName(exercise.exercise); if (!exercises.has(key)) exercises.set(key, exercise.exercise); }));
  const exerciseSelect = $('#progress-exercise'), previousExercise = exerciseSelect.value;
  exerciseSelect.innerHTML = exercises.size ? [...exercises].map(([key, name]) => `<option data-i18n-user value="${esc(key)}">${esc(name)}</option>`).join('') : '<option value="">Δεν υπάρχουν ασκήσεις</option>';
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
    const exercise = session?.exercises?.find(item => normalizedName(item.exercise) === exerciseKey);
    if (!exercise) return { session, reason:'Η άσκηση δεν καταγράφηκε' };
    const set = exercise.sets?.[setIndex];
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
  const xStep = (width-left-right) / Math.max(points.length-1, 1);
  const x=i => left+i*xStep, y=value => top+(ceiling-value)/(ceiling-floor)*(height-top-bottom), repY=value => top+(repCeiling-value)/(repCeiling-repFloor)*(height-top-bottom), extraY=value => top+(extraCeiling-value)/(extraCeiling-extraFloor)*(height-top-bottom);
  const primaryUnit = comparableMode === 'bodyweight' ? null : comparableMode === 'kg' ? 'kg' : comparableMode === 'bodyweight_extra' ? 'extra kg' : 'πλάκες';
  const linePoints = points.map((item,i) => ({ x:x(i), y:y(item.value) }));
  const extraPoints = points.map((item,i) => ({ x:x(i), y:extraY(item.extraWeight) }));
  const smoothPath = series => series.length < 2 ? '' : `M ${series[0].x} ${series[0].y} ${series.slice(1).map((point, index) => {
    const previous = series[index], middleX = (previous.x + point.x) / 2;
    return `Q ${middleX} ${previous.y} ${point.x} ${point.y}`;
  }).join(' ')}`;
  const mainPoints = primaryUnit ? linePoints : points.map((item,i) => ({ x:x(i), y:repY(item.reps) }));
  const smoothLine = smoothPath(mainPoints), extraLine=comparableMode==='mixed'?smoothPath(extraPoints):'';
  const weightDelta=points.at(-1).value-points[0].value, extraDelta=comparableMode==='mixed'?points.at(-1).extraWeight-points[0].extraWeight:0, repsDelta=points.at(-1).reps-points[0].reps;
  const exerciseName = points[0]?.session?.exercises?.find(item => normalizedName(item.exercise) === exerciseKey)?.exercise || '';
  const weightChanged = weightDelta !== 0 || extraDelta !== 0, decline = weightDelta < 0 || extraDelta < 0 || (!weightChanged && repsDelta < 0);
  const progressItems = decline ? '<div class="progress-alert"><strong>Δες όλη την εικόνα.</strong><span>Η τελευταία επίδοση είναι χαμηλότερη. Έλεγξε τεχνική, ύπνο και αποκατάσταση πριν βγάλεις συμπέρασμα.</span></div>' : [primaryUnit && weightDelta > 0 ? `<span><b>+${weightDelta.toFixed(1)}</b> ${primaryUnit}</span>` : '', extraDelta > 0 ? `<span><b>+${extraDelta.toFixed(1)}</b> kg</span>` : '', repsDelta > 0 ? `<span><b>+${repsDelta}</b> επαναλήψεις</span>` : ''].filter(Boolean).join('');
  const pointLabel = item => comparableMode === 'bodyweight' ? `${item.reps} επαν.` : comparableMode === 'mixed' ? `${item.value} πλάκες + ${item.extraWeight} kg · ${item.reps} επαν.` : `${item.value} ${primaryUnit} · ${item.reps} επαν.`;
  const weightLegend = `<span class="weight-key">${primaryUnit || 'Επαναλήψεις'}</span>`;
  const weightSeries = `<path d="${smoothLine}" class="chart-line"/>`;
  const dateStep = Math.max(1, Math.ceil(points.length / 5));
  const latest = points.at(-1), latestLoad = pointLabel(latest);
  panel.innerHTML = `<div class="chart-summary"><div><h2>${esc(exerciseName)}</h2><small>${points.length} καταγραφές · τελευταία ${formatDate(latest.session.date)}</small></div><div class="chart-latest"><span>ΤΕΛΕΥΤΑΙΑ ΕΠΙΔΟΣΗ</span><strong>${latestLoad}</strong></div>${progressItems ? `<div class="progress-verdict ${decline?'is-alert':''}">${progressItems}</div>` : ''}</div><div class="chart-legend">${weightLegend}${comparableMode==='mixed'?'<span class="extra-weight-key">Επιπλέον kg</span>':''}<span class="chart-hint">Πέρασε πάνω από σημείο για λεπτομέρειες</span></div><div class="chart-wrap"><svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Γράφημα προόδου βάρους και επαναλήψεων"><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="chart-axis"/>${weightSeries}${extraLine?`<path d="${extraLine}" class="chart-extra-line"/>`:''}${points.map((item,i) => { const isFirst=i===0, isLast=i===points.length-1, anchor=isFirst?'start':isLast?'end':'middle', pointY=primaryUnit?y(item.value):repY(item.reps), labelY=Math.min(pointY,comparableMode==='mixed'?extraY(item.extraWeight):height)-17, tipLabel=pointLabel(item), tipDate=formatDate(item.session.date), tooltipWidth=Math.max(120,Math.round(Math.max(tipLabel.length,tipDate.length)*6.6)+26), tooltipX=Math.max(8,Math.min(width-tooltipWidth-8,x(i)-tooltipWidth/2)), tooltipY=Math.max(8,pointY-64), showDate=isFirst || isLast || (i % dateStep === 0 && points.length-1-i >= dateStep); return `<g class="chart-point" tabindex="0"><title>${tipLabel} · ${tipDate}</title><line x1="${x(i)}" y1="${pointY}" x2="${x(i)}" y2="${height-bottom}" class="chart-guide"/>${primaryUnit || comparableMode==='bodyweight'?`<circle cx="${x(i)}" cy="${pointY}" r="7" class="chart-dot"/>`:''}${comparableMode==='mixed'?`<circle cx="${x(i)}" cy="${extraY(item.extraWeight)}" r="5" class="chart-extra-dot"/>`:''}<g class="chart-tooltip-card" transform="translate(${tooltipX} ${tooltipY})" aria-hidden="true"><rect width="${tooltipWidth}" height="48" rx="5"/><text x="${tooltipWidth/2}" y="18" text-anchor="middle"><tspan x="${tooltipWidth/2}" dy="0">${tipLabel}</tspan><tspan x="${tooltipWidth/2}" dy="17">${tipDate}</tspan></text></g>${(isFirst || isLast) ? `<text x="${x(i)}" y="${labelY}" text-anchor="${anchor}" class="chart-value">${tipLabel}</text>` : ''}${showDate ? `<text x="${x(i)}" y="${height-bottom+24}" text-anchor="${anchor}" class="chart-date">${tipDate}</text>` : ''}</g>`; }).join('')}</svg></div>${excluded.length ? `<div class="recording-warning"><strong>Έλεγχος καταγραφής: ${excluded.length} ${excluded.length===1?'προπόνηση εξαιρέθηκε':'προπονήσεις εξαιρέθηκαν'}.</strong><p>Το γράφημα χρησιμοποιεί μόνο «${modeLabel(comparableMode)}». ${excluded.map(item => `${formatDate(item.session.date)} — ${item.reason || `καταγράφηκε σε ${modeLabel(item.mode)}`}`).join(' · ')}</p></div>` : `<div class="recording-ok">✓ Όλες οι καταγραφές του σετ χρησιμοποιούν κοινή μέτρηση: ${modeLabel(comparableMode)}.</div>`}`;
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

function profileAge(birthdate) {
  if (!birthdate) return null;
  const parts = birthdate.split('-').map(Number), today = new Date();
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part)) || birthdate > localDateInputValue(today)) return null;
  const [birthYear, birthMonth, birthDay] = parts;
  let age = today.getFullYear() - birthYear;
  const birthdayPending = today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay);
  if (birthdayPending) age -= 1;
  return age;
}

function renderProfilePreview() {
  const name = $('#profile-name').value.trim();
  const birthdate = $('#profile-birthdate').value;
  const age = profileAge(birthdate);
  const weight = $('#profile-weight').value;
  const unit = $('#profile-weight-unit').value;
  const avatar = $('[name="profile-avatar"]:checked')?.value || 'male';
  $('#profile-age').textContent = age ?? '—';
  $('#profile-age-label').textContent = age === null ? 'Συμπλήρωσε ημερομηνία' : age === 1 ? 'έτος' : 'έτη';
  $('#profile-preview-name').textContent = name || 'ΤΟ ΟΝΟΜΑ ΣΟΥ';
  $('#profile-preview-age').textContent = age === null ? '—' : `${age}`;
  $('#profile-preview-weight').textContent = weight ? `${Number(weight).toLocaleString('el-GR', { maximumFractionDigits:1 })} ${unit}` : '—';
  $('#profile-preview-avatar').classList.toggle('male-avatar', avatar === 'male');
  $('#profile-preview-avatar').classList.toggle('female-avatar', avatar === 'female');
  $('#profile-preview-avatar').classList.toggle('custom-avatar', avatar === 'custom' && Boolean(customAvatarData));
  $('#profile-preview-image').src = customAvatarData;
  $('#custom-avatar-thumb').src = customAvatarData;
  $('#custom-avatar-option').classList.toggle('has-image', Boolean(customAvatarData));
  $('#avatar-upload-status').textContent = customAvatarData ? 'Η εικόνα είναι έτοιμη' : 'JPG, PNG ή WEBP';
  renderRewards();
}

function renderMenuIdentity() {
  const profile = state.profile;
  const hasProfile = Boolean(profile?.name);
  $('#menu-brand-mark').classList.toggle('hidden', hasProfile);
  $('#menu-profile-summary').classList.toggle('hidden', !hasProfile);
  if (!hasProfile) return;
  const avatar = profile.avatar || 'male';
  const hasCustomImage = avatar === 'custom' && Boolean(profile.customImage);
  $('#menu-profile-name').textContent = profile.name;
  $('#menu-profile-avatar').classList.toggle('male-avatar', avatar === 'male' || (avatar === 'custom' && !hasCustomImage));
  $('#menu-profile-avatar').classList.toggle('female-avatar', avatar === 'female');
  $('#menu-profile-avatar').classList.toggle('custom-avatar', hasCustomImage);
  $('#menu-profile-image').src = hasCustomImage ? profile.customImage : '';
}

function readHomeCardPosition() {
  const saved = store.read('homeProfileCardPosition');
  return !Array.isArray(saved) && Number.isFinite(saved?.x) && Number.isFinite(saved?.y) ? saved : null;
}

function homeCardBounds() {
  const shell = $('.home-shell'), card = $('#home-profile-card');
  return {
    maxX:Math.max(0, shell.clientWidth - card.offsetWidth),
    maxY:Math.max(0, shell.scrollHeight - card.offsetHeight)
  };
}

function placeHomeProfileCard(position = readHomeCardPosition()) {
  const card = $('#home-profile-card');
  if (card.classList.contains('hidden')) return;
  const { maxX, maxY } = homeCardBounds();
  const x = Math.max(0, Math.min(maxX, position ? position.x * maxX : maxX * .92));
  const y = Math.max(0, Math.min(maxY, position ? position.y * maxY : Math.min(205, maxY * .16)));
  card.dataset.x = String(x);
  card.dataset.y = String(y);
  card.style.setProperty('--card-x', `${x}px`);
  card.style.setProperty('--card-y', `${y}px`);
}

function renderHomeProfileCard() {
  const card = $('#home-profile-card'), profile = state.profile;
  const hasProfile = Boolean(profile?.name);
  card.classList.toggle('hidden', !hasProfile);
  if (!hasProfile) return;
  const avatar = profile.avatar || 'male';
  const hasCustomImage = avatar === 'custom' && Boolean(profile.customImage);
  $('#home-profile-name').textContent = profile.name;
  $('#home-profile-avatar').classList.toggle('male-avatar', avatar === 'male' || (avatar === 'custom' && !hasCustomImage));
  $('#home-profile-avatar').classList.toggle('female-avatar', avatar === 'female');
  $('#home-profile-avatar').classList.toggle('custom-avatar', hasCustomImage);
  $('#home-profile-image').src = hasCustomImage ? profile.customImage : '';
  renderRewards();
  requestAnimationFrame(() => placeHomeProfileCard());
}

function enableHomeProfileCardDrag() {
  const card = $('#home-profile-card');
  let drag = null;
  const finish = event => {
    if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    const { maxX, maxY } = homeCardBounds();
    const x = Number(card.dataset.x) || 0, y = Number(card.dataset.y) || 0;
    safeStoreWrite('homeProfileCardPosition', { x:maxX ? x / maxX : 0, y:maxY ? y / maxY : 0 });
    card.classList.remove('is-dragging');
    drag = null;
  };
  card.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    drag = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:Number(card.dataset.x) || 0, y:Number(card.dataset.y) || 0 };
    card.setPointerCapture?.(event.pointerId);
    card.classList.add('is-dragging');
    event.preventDefault();
  });
  card.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { maxX, maxY } = homeCardBounds();
    const x = Math.max(0, Math.min(maxX, drag.x + event.clientX - drag.startX));
    const y = Math.max(0, Math.min(maxY, drag.y + event.clientY - drag.startY));
    card.dataset.x = String(x); card.dataset.y = String(y);
    card.style.setProperty('--card-x', `${x}px`); card.style.setProperty('--card-y', `${y}px`);
  });
  card.addEventListener('pointerup', finish);
  card.addEventListener('pointercancel', finish);
  card.addEventListener('keydown', event => {
    const movement = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[event.key];
    if (!movement) return;
    event.preventDefault();
    const step = event.shiftKey ? 30 : 8, { maxX, maxY } = homeCardBounds();
    const x = Math.max(0, Math.min(maxX, (Number(card.dataset.x) || 0) + movement[0] * step));
    const y = Math.max(0, Math.min(maxY, (Number(card.dataset.y) || 0) + movement[1] * step));
    card.dataset.x = String(x); card.dataset.y = String(y);
    card.style.setProperty('--card-x', `${x}px`); card.style.setProperty('--card-y', `${y}px`);
    safeStoreWrite('homeProfileCardPosition', { x:maxX ? x / maxX : 0, y:maxY ? y / maxY : 0 });
  });
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => placeHomeProfileCard());
  });
}

function prepareProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return reject(new Error('Επίλεξε εικόνα JPG, PNG ή WEBP.'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Η εικόνα πρέπει να είναι μικρότερη από 10 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Δεν ήταν δυνατή η ανάγνωση της εικόνας.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Το αρχείο εικόνας δεν είναι έγκυρο.'));
      image.onload = () => {
        const size = 480, crop = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = (image.naturalWidth - crop) / 2, sourceY = (image.naturalHeight - crop) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Δεν ήταν δυνατή η επεξεργασία της εικόνας.'));
        context.fillStyle = '#efe8d8';
        context.fillRect(0, 0, size, size);
        context.drawImage(image, sourceX, sourceY, crop, crop, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', .84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadProfile() {
  const profile = state.profile;
  $('#profile-birthdate').max = localDateInputValue();
  if (profile) {
    $('#profile-name').value = profile.name || '';
    $('#profile-birthdate').value = profile.birthdate || '';
    $('#profile-weight').value = profile.weight || '';
    $('#profile-weight-unit').value = profile.weightUnit || 'kg';
    const avatar = $(`[name="profile-avatar"][value="${profile.avatar || 'male'}"]`);
    if (avatar) avatar.checked = true;
    $('#profile-status').textContent = 'ΑΠΟΘΗΚΕΥΜΕΝΟ';
  }
  renderProfilePreview();
  renderMenuIdentity();
}
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
  $('#log-date').value = localDateInputValue();
  $('#session-comments').value = '';
  $('#free-exercises').innerHTML = '';
  $('#cancel-session-edit').classList.add('hidden');
  $('#save-session').innerHTML = 'Ολοκλήρωση προπόνησης <span>✓</span>';
  $$('.mode-button').forEach(button => { button.disabled = false; });
  $('#workout-day-select').disabled = false;
  setMode('scheduled');
  renderScheduledSession();
}

function loadSessionForEdit(sessionId) {
  const session = state.sessions.find(item => String(item.id) === String(sessionId));
  if (!session) return;
  state.editingSessionId = sessionId;
  const routine = state.routines.find(item => item.id === session.routineId) || activeRoutine();
  state.selectedPlanDay = session.type === 'scheduled' ? (validCycleDay(session.cycleDay, routine?.cycleLength) || legacyCycleDay(session.workoutDay || dayForDate(session.date)) || cycleDayForDate(routine, session.date)) : null;
  $('#log-date').value = session.date;
  $('#session-comments').value = session.comments || '';
  setMode(session.type);
  if (session.type === 'scheduled') {
    refreshWorkoutDayOptions(state.selectedPlanDay);
    $('#day-badge').innerHTML = `<span>${dayForDate(session.date)}</span><small>${formatDate(session.date)}</small>`;
    $('#scheduled-session').innerHTML = `<div class="session-intro"><div><h2 data-i18n-user>${esc(sessionWorkoutName(session))}</h2><p>Διόρθωσε τις τιμές που θέλεις και αποθήκευσε ξανά.</p></div></div>${session.exercises.map((item, index) => exerciseCard(item, false, index)).join('')}`;
  } else {
    $('#free-exercises').innerHTML = session.exercises.map(item => exerciseCard(item, true)).join('');
  }
  refreshCopySetButtons();
  $$('.mode-button').forEach(button => { button.disabled = true; });
  $('#workout-day-select').disabled = true;
  $('#cancel-session-edit').classList.remove('hidden');
  $('#save-session').innerHTML = 'Αποθήκευση διορθώσεων <span>✓</span>';
  showView('log');
  $('#log-view').scrollIntoView({ behavior:'smooth', block:'start' });
}

function showView(view) {
  const current = $('.view.active')?.id.replace('-view','');
  const labels = { home:'Αρχική', log:'Καταγραφή', plan:'Πρόγραμμα', overview:'Ιστορικό', progress:'Επίβλεψη', profile:'Προφίλ' };
  closeMenu();
  if (!labels[view]) return;
  history.replaceState(null, '', `#${view}`);
  if (current === view) return;
  const swap = () => {
    $$('.nav-button,.view').forEach(el => el.classList.remove('active'));
    $(`.nav-button[data-view="${view}"]`).classList.add('active');
    $(`#${view}-view`).classList.add('active');
    $('#current-view-label').textContent = labels[view];
    if (view === 'home') renderHome();
    if (view === 'overview') renderOverview();
    if (view === 'progress') renderProgressSelectors();
    if (view === 'profile') renderProfilePreview();
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
document.addEventListener('keydown', event => {
  const sessionSummary = event.target.closest?.('.session-summary[data-view-session]');
  if (sessionSummary && event.target === sessionSummary && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    sessionSummary.click();
  }
  if (event.key === 'Escape') closeMenu();
});
$('#progress-workout').addEventListener('change', renderProgressSelectors);
$('#progress-exercise').addEventListener('change', renderProgressSelectors);
$('#progress-set').addEventListener('change', renderProgressChart);
// SVG has no z-index: the tooltip of an early point paints below later points, so lift the active point last in the tree.
const raiseChartPoint = target => { const point = target.closest?.('.chart-point'); if (point?.parentNode && point.parentNode.lastElementChild !== point) point.parentNode.appendChild(point); };
document.addEventListener('mouseover', event => raiseChartPoint(event.target));
document.addEventListener('focusin', event => raiseChartPoint(event.target));
$('.brand').addEventListener('click', event => { event.preventDefault(); showView('home'); });
document.addEventListener('click', event => { const action = event.target.closest('[data-home-action]'); if (action) showView(action.dataset.homeAction); });
$$('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#log-date').addEventListener('change', () => {
  if (!state.editingSessionId) { state.selectedPlanDay = null; return renderScheduledSession(); }
  const date = $('#log-date').value;
  $('#day-badge').innerHTML = `<span>${dayForDate(date)}</span><small>${formatDate(date)}</small>`;
});
$('#workout-day-select').addEventListener('change', event => { if (state.editingSessionId) return; renderScheduledSession(event.target.value); });
$('#exercise-count').addEventListener('input', renderPlanExercises);
$('#routine-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#routine-name').value.trim();
  if (!name) return;
  const cycleLength = clampCycleLength($('#routine-cycle-length').value);
  const cycleAnchorDate = $('#routine-cycle-anchor').value;
  if (!dateParts(cycleAnchorDate)) return;
  const routine = { id:id(), name, isActive:false, cycleLength, cycleAnchorDate, plan:[] };
  const previousSelectedRoutineId = state.selectedRoutineId;
  state.routines.push(routine);
  rewardTracking.periods[routine.id] = [];
  state.selectedRoutineId = routine.id;
  if (!persistRoutines()) {
    state.routines.pop();
    delete rewardTracking.periods[routine.id];
    state.selectedRoutineId = previousSelectedRoutineId;
    return;
  }
  event.currentTarget.reset();
  $('#routine-cycle-anchor').value = localDateInputValue();
  resetPlanForm();
  renderRoutines();
  renderPlan();
  toast(`Το πρόγραμμα «${name}» δημιουργήθηκε`);
});
document.addEventListener('submit', event => {
  const form = event.target.closest('[data-routine-rename-form]');
  if (!form) return;
  event.preventDefault();
  const routine = state.routines.find(item => item.id === form.dataset.routineRenameForm);
  const nextName = form.querySelector('.routine-inline-name').value.trim();
  if (!routine || !nextName) return;
  const previousName = routine.name;
  routine.name = nextName;
  if (!persistRoutines()) {
    routine.name = previousName;
    return;
  }
  state.editingRoutineId = null;
  renderRoutines();
  renderPlan();
  if (routine.isActive) renderScheduledSession();
  toast('Το όνομα του προγράμματος αποθηκεύτηκε');
});
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
$('#profile-form').addEventListener('input', renderProfilePreview);
$('#profile-form').addEventListener('change', renderProfilePreview);
$('#profile-avatar-upload-button').addEventListener('click', () => $('#profile-avatar-upload').click());
$('#custom-avatar-option').addEventListener('click', event => {
  if (event.target.closest('button') || !customAvatarData) return;
  $('#profile-custom-avatar').checked = true;
  renderProfilePreview();
});
$('#profile-avatar-upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const button = $('#profile-avatar-upload-button');
  button.disabled = true;
  button.textContent = 'ΕΠΕΞΕΡΓΑΣΙΑ…';
  try {
    customAvatarData = await prepareProfileImage(file);
    $('#profile-custom-avatar').checked = true;
    renderProfilePreview();
    toast('Η εικόνα προστέθηκε στο προφίλ');
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = customAvatarData ? 'ΑΛΛΑΓΗ ΕΙΚΟΝΑΣ' : 'ΑΝΕΒΑΣΕ ΕΙΚΟΝΑ';
    event.target.value = '';
  }
});
$('#profile-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.checkValidity()) return event.currentTarget.reportValidity();
  const profile = {
    name:$('#profile-name').value.trim(),
    birthdate:$('#profile-birthdate').value,
    weight:Number($('#profile-weight').value),
    weightUnit:$('#profile-weight-unit').value,
    avatar:$('[name="profile-avatar"]:checked')?.value || 'male',
    customImage:customAvatarData
  };
  try {
    store.write('userProfile', profile);
  } catch {
    return toast('Δεν υπάρχει αρκετός χώρος για την εικόνα. Δοκίμασε μικρότερο αρχείο.');
  }
  state.profile = profile;
  $('#profile-status').textContent = 'ΑΠΟΘΗΚΕΥΜΕΝΟ';
  renderProfilePreview();
  renderMenuIdentity();
  renderHomeProfileCard();
  toast('Το προφίλ αποθηκεύτηκε ✓');
});
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
  const routine = selectedRoutine();
  const plan = selectedPlan();
  const day = validCycleDay($('#plan-day').value, routine?.cycleLength);
  if (!routine || !day) return;
  const workoutName = $('#workout-name').value.trim();
  const sourceDay = state.editingDay;
  const previousItems = sourceDay ? plan.filter(item => itemCycleDay(item, routine) === Number(sourceDay)) : [];
  const exercises = $$('.plan-exercise-fields').map(card => ({ id:card.dataset.planId || id(), cycleDay:day, day:weekdayForCycleDay(routine, day), workoutName, exercise:card.querySelector('.builder-name').value.trim(), workSets:Number(card.querySelector('.builder-sets').value), cues:card.querySelector('.builder-cues').value.trim(), sets:Array.from({ length:Number(card.querySelector('.builder-sets').value) }, () => ({})) }));
  const savePlan = updateHistory => {
    const nextPlan = [...plan.filter(item => itemCycleDay(item, routine) !== day && itemCycleDay(item, routine) !== Number(sourceDay)), ...exercises];
    routine.plan = nextPlan;
    if (!persistRoutines()) { routine.plan = plan; return; }
    if (updateHistory && !syncPlanChangesToHistory(routine.id, sourceDay, day, previousItems, exercises)) return;
    resetPlanForm(); renderRoutines(); renderPlan(); renderScheduledSession(); renderOverview();
    toast(updateHistory ? 'Το Πρόγραμμα και το Ιστορικό ενημερώθηκαν ✓' : sourceDay ? 'Ενημερώθηκε μόνο το Πρόγραμμα ✓' : `Η προπόνηση για ${cycleDayLabel(routine, day)} αποθηκεύτηκε`);
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
  if (state.editingSessionId && !existing) {
    resetSessionForm();
    return toast('Η προπόνηση έχει διαγραφεί και δεν μπορεί να αποθηκευτεί ξανά.');
  }
  const routine = state.mode === 'scheduled' && existing?.routineId
    ? state.routines.find(item => item.id === existing.routineId) || activeRoutine()
    : activeRoutine();
  const selectedCycleDay = state.mode === 'scheduled' ? validCycleDay(state.selectedPlanDay, routine?.cycleLength) : null;
  const routinePlan = routine?.plan || [];
  const workoutName = state.mode === 'scheduled' ? (existing ? sessionWorkoutName(existing) : routinePlan.find(item => itemCycleDay(item, routine) === selectedCycleDay)?.workoutName || 'Προπόνηση') : 'Ελεύθερη προπόνηση';
  const session = { id:existing?.id || id(), date:$('#log-date').value, type:state.mode, routineId:state.mode === 'scheduled' ? (existing?.routineId || routine?.id || null) : null, cycleDay:selectedCycleDay, workoutDay:state.mode === 'scheduled' ? dayForDate($('#log-date').value) : null, workoutName, comments:$('#session-comments').value.trim(), exercises };
  const nextSessions = existing
    ? state.sessions.map(item => String(item.id) === String(existing.id) ? session : item)
    : [session, ...state.sessions];
  if (!persistSessions(nextSessions)) return;
  state.sessions = nextSessions;
  const wasEditing = Boolean(existing);
  resetSessionForm(); renderOverview(); toast(wasEditing ? 'Οι διορθώσεις αποθηκεύτηκαν.' : 'Η δουλειά καταγράφηκε.');
});

document.addEventListener('click', event => {
  const dayTile = event.target.closest('[data-goto-date]');
  if (dayTile) {
    state.expandedSessionId = null;
    renderOverview();
    const card = $(`.session-card[data-session-date="${dayTile.dataset.gotoDate}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('card-flash');
      setTimeout(() => card.classList.remove('card-flash'), 1600);
    }
  }
  const viewSession = event.target.closest('[data-view-session]');
  if (viewSession && !event.target.closest('.card-actions')) {
    state.expandedSessionId = String(state.expandedSessionId) === String(viewSession.dataset.viewSession) ? null : viewSession.dataset.viewSession;
    renderOverview();
    if (state.expandedSessionId) $(`.session-card[data-session-id="${state.expandedSessionId}"]`)?.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  const closeSession = event.target.closest('[data-close-session]');
  if (closeSession) {
    const cardId = closeSession.dataset.closeSession;
    state.expandedSessionId = null;
    renderOverview();
    $(`.session-card[data-session-id="${cardId}"]`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }
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
  const selectRoutineButton = event.target.closest('[data-select-routine]');
  const activateRoutineButton = event.target.closest('[data-activate-routine]');
  const renameRoutineButton = event.target.closest('[data-rename-routine]');
  const deleteRoutineButton = event.target.closest('[data-delete-routine]');
  const cancelRoutineEditButton = event.target.closest('[data-cancel-routine-edit]');
  if (selectRoutineButton) {
    state.selectedRoutineId = selectRoutineButton.dataset.selectRoutine;
    resetPlanForm();
    renderRoutines();
    renderPlan();
  }
  if (activateRoutineButton) {
    const routineId = activateRoutineButton.dataset.activateRoutine;
    const previousActiveRoutineId = activeRoutine()?.id;
    const previousSelectedRoutineId = state.selectedRoutineId;
    state.routines.forEach(routine => { routine.isActive = routine.id === routineId; });
    state.selectedRoutineId = routineId;
    state.selectedPlanDay = null;
    if (!persistRoutines()) {
      state.routines.forEach(routine => { routine.isActive = routine.id === previousActiveRoutineId; });
      state.selectedRoutineId = previousSelectedRoutineId;
      return;
    }
    switchRewardRoutine(previousActiveRoutineId, routineId);
    resetPlanForm();
    renderRoutines();
    renderPlan();
    renderScheduledSession();
    toast(`Το «${activeRoutine().name}» είναι τώρα ενεργό ★`);
  }
  if (renameRoutineButton) {
    const routine = state.routines.find(item => item.id === renameRoutineButton.dataset.renameRoutine);
    if (routine) {
      state.editingRoutineId = routine.id;
      state.selectedRoutineId = routine.id;
      renderRoutines();
      renderPlan();
      const input = $(`[data-routine-rename-form="${routine.id}"] .routine-inline-name`);
      input.focus();
      input.select();
    }
  }
  if (cancelRoutineEditButton) {
    state.editingRoutineId = null;
    renderRoutines();
  }
  if (deleteRoutineButton) {
    const routine = state.routines.find(item => item.id === deleteRoutineButton.dataset.deleteRoutine);
    if (!routine) return;
    if (state.routines.length === 1) return toast('Χρειάζεται να υπάρχει τουλάχιστον ένα πρόγραμμα');
    askToConfirm('Διαγραφή εβδομαδιαίου προγράμματος', `Να διαγραφεί οριστικά το «${routine.name}» και όλες οι ημέρες του; Το Ιστορικό προπονήσεων θα παραμείνει.`, () => {
      const nextRoutines = state.routines.filter(item => item.id !== routine.id);
      if (routine.isActive) nextRoutines[0].isActive = true;
      if (!safeStoreWrite('trainingRoutines', nextRoutines)) return;
      if (routine.isActive) switchRewardRoutine(routine.id, nextRoutines[0].id);
      state.routines = nextRoutines;
      delete rewardTracking.periods[routine.id];
      safeStoreWrite('routineRewardTracking', rewardTracking);
      if (state.selectedRoutineId === routine.id) state.selectedRoutineId = activeRoutine().id;
      resetPlanForm();
      renderRoutines();
      renderPlan();
      renderScheduledSession();
      toast(`Το «${routine.name}» διαγράφηκε`);
    });
  }
  if (event.target.dataset.editDay) loadDayForEdit(event.target.dataset.editDay);
  if (event.target.dataset.editSession) loadSessionForEdit(event.target.dataset.editSession);
  if (event.target.dataset.deleteDay) {
    const routine = selectedRoutine();
    const day = validCycleDay(event.target.dataset.deleteDay, routine?.cycleLength);
    askToConfirm('Διαγραφή ημέρας προγράμματος', `Να διαγραφεί ολόκληρο το πρόγραμμα για ${cycleDayLabel(routine, day)}; Το ήδη καταγεγραμμένο Ιστορικό θα παραμείνει.`, () => {
      const previousPlan = routine.plan;
      routine.plan = selectedPlan().filter(item => itemCycleDay(item, routine) !== day);
      if (!persistRoutines()) { routine.plan = previousPlan; return; }
      if (Number(state.editingDay) === day) resetPlanForm(); else refreshDayOptions();
      renderRoutines(); renderPlan(); renderScheduledSession(); toast(`Η ${cycleDayLabel(routine, day)} διαγράφηκε`);
    });
  }
  if (event.target.dataset.deleteSession) {
    const sessionId = event.target.dataset.deleteSession;
    const session = state.sessions.find(item => String(item.id) === String(sessionId));
    askToConfirm('Διαγραφή προπόνησης', `Να διαγραφεί οριστικά η προπόνηση ${session ? `«${sessionWorkoutName(session)}» στις ${formatDate(session.date)}` : ''}; Θα χαθούν όλα τα σετ και οι μετρήσεις της.`, () => {
      const nextSessions = state.sessions.filter(x => String(x.id) !== String(sessionId));
      if (!persistSessions(nextSessions)) return;
      state.sessions = nextSessions;
      if (String(state.editingSessionId) === String(sessionId)) resetSessionForm();
      renderOverview(); toast('Η προπόνηση διαγράφηκε');
    });
  }
});

enableHomeProfileCardDrag();
$('#log-date').value = localDateInputValue(); $('#routine-cycle-anchor').value = localDateInputValue(); refreshDayOptions(); renderPlanExercises(); renderRoutines(); renderPlan(); renderScheduledSession(); renderOverview(); loadProfile(); renderHome();
document.addEventListener('logbook:languagechange', () => {
  // Re-render only date-dependent views. Form fields and in-progress sets stay intact.
  const logDate = $('#log-date').value;
  if (logDate) $('#day-badge').innerHTML = `<span>${dayForDate(logDate)}</span><small>${formatDate(logDate)}</small>`;
  renderOverview();
  renderProgressChart();
  renderHome();
});
window.LogbookI18n?.translate(document);
if (location.hash) showView(location.hash.slice(1));
