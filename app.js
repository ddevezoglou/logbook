import * as StorageMigrations from './modules/storage-migrations.js';
import * as RoutineModel from './modules/routines.js';
import * as SessionModel from './modules/sessions.js';
import * as ProgressRewards from './modules/progress-rewards.js';
import * as UI from './modules/ui.js';

const store = StorageMigrations.createStore(localStorage, {
  onWrite:key => window.dispatchEvent(new CustomEvent('logbook:local-data-changed', { detail:{ key } })),
});

// A cloud payload was just written into localStorage. A blind reload here would
// wipe any half-typed workout, plan day or profile edit, so reload only when the
// screen holds no unsaved work; otherwise defer to the next safe navigation.
let pendingCloudReload = false;
function hasUnsavedSession() {
  if (state.editingSessionId || state.copyingSessionId) return true;
  if ($('#session-comments').value.trim()) return true;
  const fields = $$('#scheduled-session .set-reps, #scheduled-session .set-weight, #scheduled-session .set-plates, #scheduled-session .exercise-comments, #free-exercises .exercise-name, #free-exercises .set-reps, #free-exercises .set-weight, #free-exercises .set-plates, #free-exercises .exercise-comments');
  return fields.some(field => String(field.value).trim() !== '');
}
function hasUnsavedWork() {
  if (hasUnsavedSession() || state.editingDay) return true;
  const typedFields = $$('#scheduled-session input[type="number"], #scheduled-session input[type="text"], #plan-exercises-container input[type="text"], #plan-exercises-container textarea');
  if (typedFields.some(field => String(field.value).trim() !== '')) return true;
  if ($('#session-comments').value.trim() || $('#workout-name').value.trim() || $('#routine-name').value.trim()) return true;
  return $('#profile-form').dataset.dirty === 'true';
}
window.addEventListener('logbook:cloud-data-applied', () => {
  if (hasUnsavedWork()) {
    pendingCloudReload = true;
    toast('Ήρθαν αλλαγές από άλλη συσκευή. Θα εφαρμοστούν μόλις αποθηκεύσετε.');
    return;
  }
  pendingCloudReload = false;
  window.location.reload();
});

function safeStoreWrite(key, value, message = 'Δεν ήταν δυνατή η αποθήκευση. Ελευθέρωσε χώρο και δοκίμασε ξανά.') {
  return StorageMigrations.writeSafely(store, key, value, () => {
    const notification = document.querySelector('#toast');
    if (notification) {
      notification.textContent = message;
      notification.classList.add('toast-error');
      notification.classList.add('show');
      setTimeout(() => notification.classList.remove('show'), 2200);
    }
  });
}

const {
  DAYS:days,
  PLAN_ORDER:planOrder,
  MIN_CYCLE_LENGTH,
  MAX_CYCLE_LENGTH,
  clampCycleLength,
  dateParts,
  inputDateValue,
  mondayFor,
  legacyCycleDay,
  validCycleDay,
  normalizeRoutine,
  cycleDayForDate,
  weekdayForCycleDay,
  itemCycleDay,
  planItemsForCycleDay,
  declaredWeekdayForCycleDay,
  weekdayDeclarationCount,
  cycleDayLabel,
} = RoutineModel;
const oldLogs = store.read('trainingLogs', []);
const savedSessions = store.read('trainingSessions', []);
const savedProfile = store.read('userProfile', null);
const legacyPlan = store.read('trainingPlan', []);
const savedRoutines = store.read('trainingRoutines', []);
const { state, repairs } = StorageMigrations.migrateLocalData({
  oldLogs,
  savedSessions,
  savedProfile,
  legacyPlan,
  savedRoutines,
  randomUUID:() => crypto.randomUUID(),
});
let customAvatarData = state.profile?.customImage || '';
let routineCarouselIndex = 0;
let routineSwipeStartX = null;
let historySwipe = null;
if (repairs.sessionsChanged) safeStoreWrite('trainingSessions', state.sessions);
if (repairs.routinesChanged) safeStoreWrite('trainingRoutines', state.routines);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const {
  WEIGHT_MODES,
  localDateInputValue,
  localDate,
  dayForDate,
  profileWeightUnit,
  nonNegativeNumber,
  numericInputValue,
  inferredWeightMode,
  safeWeightMode,
  csvEscape,
} = SessionModel;
const weightUnit = () => profileWeightUnit(state.profile);
const weightUnitName = (unit = weightUnit()) => SessionModel.weightUnitName(unit);
const weightUnitSymbol = (unit = weightUnit()) => SessionModel.weightUnitSymbol(unit);
const storedWeightToDisplay = (value, unit = weightUnit()) => SessionModel.storedWeightToDisplay(value, unit);
const inputWeightToStored = (value, unit = weightUnit()) => SessionModel.inputWeightToStored(value, unit);
const weightModeSourceLabel = (mode, unit = weightUnit()) => SessionModel.weightModeSourceLabel(mode, unit);

function refreshWeightUnitUI(previousUnit = weightUnit()) {
  const unit = weightUnit(), symbol = weightUnitSymbol(unit), unitName = weightUnitName(unit);
  $$('[data-set]').forEach(row => {
    const input = row.querySelector('.set-weight');
    if (input && previousUnit !== unit && input.value !== '') {
      input.value = storedWeightToDisplay(inputWeightToStored(input.value, previousUnit), unit);
    }
    const label = row.querySelector('.set-weight-control .set-control-label');
    if (label) label.textContent = `Βάρος (${symbol})`;
    if (input) {
      input.placeholder = symbol;
      input.step = 'any';
      const setPosition = Number(row.querySelector('.set-number')?.textContent) || 1;
      input.setAttribute('aria-label', window.LogbookI18n?.tId?.('aria.weight-set', {
        unit:window.LogbookI18n?.tId?.(unit === 'lbs' ? 'message.0366' : 'message.0365') || unitName,
        number:setPosition,
      }) || `${unitName} σετ ${setPosition}`);
    }
    row.querySelectorAll('.weight-mode option').forEach(option => { option.textContent = weightModeSourceLabel(option.value, unit); });
    window.LogbookI18n?.translate(row);
  });
  const guide = $('#log-weight-guide');
  if (guide) {
    guide.textContent = unit === 'lbs'
      ? 'Καταγράψτε επαναλήψεις και επιλέξτε λίβρες, πλάκες, συνδυασμό ή Bodyweight.'
      : 'Καταγράψτε επαναλήψεις και επιλέξτε κιλά, πλάκες, συνδυασμό ή Bodyweight.';
    window.LogbookI18n?.translate(guide);
  }
}

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
  const loggedToday = state.sessions.some(session => session.date === localDateInputValue());
  $('#home-rest-stamp')?.classList.toggle('hidden', !loggedToday);
  renderHomeProfileCard();
  renderHomeRoutineCard();
}
const esc = UI.escapeHtml;
const id = () => crypto.randomUUID();
const formatDate = date => date ? localDate(date).toLocaleDateString(window.LogbookI18n?.getLocale() || 'el-GR', { day:'numeric', month:'short', year:'numeric' }) : 'Χωρίς ημερομηνία';
const selectedRoutine = () => state.routines.find(routine => routine.id === state.selectedRoutineId) || state.routines[0];
const activeRoutine = () => state.routines.find(routine => routine.isActive) || state.routines[0];
const selectedPlan = () => selectedRoutine()?.plan || [];
const activePlan = () => activeRoutine()?.plan || [];
const persistRoutines = () => safeStoreWrite('trainingRoutines', state.routines);
const persistSessions = sessions => safeStoreWrite('trainingSessions', sessions);

const rewardLabels = ['ΔΗΜΙΟΥΡΓΙΑ ΠΡΟΓΡΑΜΜΑΤΟΣ','PLAN SETUP','KEEP UP THE WORK','NEVER GIVE UP','GYMRAT'];
const scheduledForRoutine = (session, routine) => session?.routineId != null
  && String(session.routineId) === String(routine?.id)
  && session.type !== 'free';
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
      .filter(session => scheduledForRoutine(session, routine) && session.date)
      .map(session => cycleStartKey(routine, session.date)).sort();
    periods[routine.id] = weeks.length ? [{ start:weeks[0], end:routine.isActive ? null : weeks.at(-1) }] : [];
  });
  const active = activeRoutine();
  if (active && !periods[active.id].some(period => period.end === null)) periods[active.id].push({ start:cycleStartKey(active, localDateInputValue()), end:null });
  return { version:1, activeRoutineId:active?.id || null, periods };
}

function reconcileRewardTracking(tracking) {
  const activeId = activeRoutine()?.id || null;
  state.routines.forEach(routine => {
    const completedCycles = state.sessions
      .filter(session => scheduledForRoutine(session, routine) && session.date)
      .map(session => cycleStartKey(routine, session.date))
      .sort();
    const periods = tracking.periods[routine.id];
    if (!periods.length) {
      if (completedCycles.length) periods.push({ start:completedCycles[0], end:routine.id === activeId ? null : completedCycles.at(-1) });
      else if (routine.id === activeId) periods.push({ start:cycleStartKey(routine, localDateInputValue()), end:null });
      return;
    }
    periods.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    if (completedCycles.length && completedCycles[0] < periods[0].start) periods[0].start = completedCycles[0];
    if (routine.id === activeId && !periods.some(period => period.end === null)) {
      periods.push({ start:cycleStartKey(routine, localDateInputValue()), end:null });
    }
  });
  return tracking;
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
  reconcileRewardTracking(tracking);
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
  const reward = ProgressRewards.calculateRoutineReward({
    routine,
    sessions:state.sessions,
    rewardTracking,
  });
  return { ...reward, label:rewardLabels[reward.stage], routine };
}

function renderRewards() {
  const reward = routineReward();
  const ring = $('#profile-reward-ring');
  if (ring) {
    const periodLabel = reward.routine?.cycleLength === 7
      ? (reward.streak === 1 ? 'συνεχόμενη εβδομάδα' : 'συνεχόμενες εβδομάδες')
      : (reward.streak === 1 ? 'συνεχόμενος μικρόκυκλος' : 'συνεχόμενοι μικρόκυκλοι');
    const detail = reward.target
      ? `${reward.routine.name} · ${reward.streak} ${periodLabel} · ${reward.completedThisWeek}/${reward.target} ${reward.routine.cycleLength === 7 ? 'αυτή την εβδομάδα' : 'σε αυτόν τον μικρόκυκλο'}`
      : 'Δηλώστε τις ημέρες του πρώτου σας προγράμματος';
    ring.className = `profile-reward-ring reward-stage-${reward.stage}`;
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
  const unit = weightUnit(), symbol = weightUnitSymbol(unit), unitName = weightUnitName(unit);
  return Array.from({ length: count }, (_, i) => {
    const value = values[i] || {};
    const mode = safeWeightMode(value.weightMode) || inferredWeightMode(value);
    const setPosition = startIndex + i + 1;
    const reps = numericInputValue(value.reps, { integer:true });
    const plates = numericInputValue(value.plates, { integer:true });
    const displayedWeight = numericInputValue(storedWeightToDisplay(value.weight, unit));
    const optionsMarkup = WEIGHT_MODES.map(option => `<option value="${option}" ${mode === option ? 'selected' : ''}>${weightModeSourceLabel(option, unit)}</option>`).join('');
    return `<div class="set-row ${extra ? 'extra-set' : ''}" data-set data-weight-mode="${mode}" ${extra ? 'data-extra-set' : ''}><span class="set-number">${String(setPosition).padStart(2,'0')}</span>
      <label class="set-control set-reps-control"><span class="set-control-label">Επαναλήψεις</span><input class="${prefix}reps set-reps" type="number" min="0" inputmode="numeric" placeholder="0" value="${reps}" aria-label="Επαναλήψεις σετ ${setPosition}" required></label>
      <span class="set-times" aria-hidden="true">×</span>
      <div class="set-load-entry"><label class="set-control set-mode-control"><span class="set-control-label">Μέτρηση</span><select class="weight-mode" aria-label="Τρόπος καταγραφής βάρους για το σετ ${setPosition}">${optionsMarkup}</select></label>
        <div class="weight-entry"><label class="set-control set-plates-control"><span class="set-control-label">Πλάκες</span><input class="${prefix}plates set-plates" type="number" min="0" step="1" inputmode="numeric" placeholder="πλάκες" value="${plates}" aria-label="Πλάκες σετ ${setPosition}" ${mode === 'plates' || mode === 'mixed' ? 'required' : ''}></label><label class="set-control set-weight-control"><span class="set-control-label">Βάρος (${symbol})</span><input class="${prefix}weight set-weight" type="number" min="0" step="any" inputmode="decimal" placeholder="${symbol}" value="${displayedWeight}" aria-label="${unitName} σετ ${setPosition}" ${mode === 'kg' || mode === 'mixed' || mode === 'bodyweight_extra' ? 'required' : ''}></label></div>
      </div><button class="remove-set${extra ? ' remove-extra-set' : ''}" type="button" aria-label="Αφαίρεση εργάσιμου σετ">−</button></div>`;
  }).join('');
}

function renumberSetRows(card) {
  const rows = [...card.querySelectorAll('.exercise-sets [data-set]')];
  rows.forEach((row, index) => {
    const setPosition = index + 1;
    row.querySelector('.set-number').textContent = String(setPosition).padStart(2,'0');
    row.querySelector('.set-reps').setAttribute('aria-label', `Επαναλήψεις σετ ${setPosition}`);
    row.querySelector('.weight-mode').setAttribute('aria-label', `Τρόπος καταγραφής βάρους για το σετ ${setPosition}`);
    row.querySelector('.set-plates').setAttribute('aria-label', `Πλάκες σετ ${setPosition}`);
    row.querySelector('.set-weight').setAttribute('aria-label', `${weightUnitName()} σετ ${setPosition}`);
  });
  const freeSetCount = card.querySelector('.free-set-count');
  if (freeSetCount) freeSetCount.value = rows.length;
  const plannedTag = card.querySelector('.planned-tag');
  if (plannedTag) plannedTag.textContent = `${rows.length} σετ`;
  refreshCopySetButton(card);
}

function configureWeightMode(row, mode) {
  row.dataset.weightMode = mode;
  const weightInput = row.querySelector('.set-weight');
  weightInput.required = ['kg','mixed','bodyweight_extra'].includes(mode);
  weightInput.placeholder = weightUnitSymbol();
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
  const field = $('#plan-day-field');
  const select = $('#plan-day');
  const preferredCycleDay = validCycleDay(preferred, routine.cycleLength);
  const used = new Set(selectedPlan().map(item => itemCycleDay(item, routine)));
  const available = Array.from({ length:routine.cycleLength }, (_, index) => index + 1).filter(cycleDay => !used.has(cycleDay) || cycleDay === preferredCycleDay);
  select.disabled = false;
  delete select.dataset.cycleDay;

  if (routine.usesWeekdays === false) {
    field.classList.add('hidden');
    const cycleDay = preferredCycleDay || available[0];
    select.innerHTML = cycleDay
      ? `<option value="${cycleDay}" selected></option>`
      : '<option value="" selected disabled></option>';
    return;
  }

  field.classList.remove('hidden');
  $('#plan-day-label').textContent = 'Ημέρα';
  if (routine.cycleLength > 7) {
    const cycleDay = preferredCycleDay || available[0];
    const currentWeekday = preferredCycleDay ? declaredWeekdayForCycleDay(routine, preferredCycleDay) : planOrder[0];
    const availableWeekdays = planOrder.filter(weekday => weekdayDeclarationCount(routine, weekday, preferredCycleDay) < 2);
    select.dataset.cycleDay = cycleDay || '';
    select.innerHTML = cycleDay
      ? availableWeekdays.map(weekday => `<option value="${weekday}" ${weekday === currentWeekday ? 'selected' : ''}>${weekday}</option>`).join('')
      : '<option value="" selected disabled>Έχουν δηλωθεί όλες οι προπονήσεις</option>';
    return;
  }

  select.innerHTML = available.length
    ? available.map(cycleDay => `<option value="${cycleDay}" ${cycleDay === preferredCycleDay ? 'selected' : ''}>${weekdayForCycleDay(routine, cycleDay)}</option>`).join('')
    : '<option value="" selected disabled>Έχουν δηλωθεί όλες οι ημέρες</option>';
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
  $('#plan-board-title').textContent = routine?.name || 'ΤΟ ΠΛΑΝΟ ΣΑΣ';
  $('#plan-form-title').textContent = state.editingDay
    ? $('#plan-form-title').textContent
    : routine?.usesWeekdays === false ? 'Νέα προπόνηση' : 'Νέα προπόνηση ημέρας';
  $('#plan-submit').innerHTML = state.editingDay
    ? $('#plan-submit').innerHTML
    : `${routine?.usesWeekdays === false ? 'Αποθήκευση προπόνησης' : 'Αποθήκευση ημέρας'}`;
  $('#plan-count').textContent = routine?.usesWeekdays === false
    ? `${activeDays}/${routine?.cycleLength || 7} προπονήσεις`
    : `${activeDays}/${routine?.cycleLength || 7} ημέρες`;
  const planList = $('#plan-list');
  planList.classList.toggle('unordered-plan', routine?.usesWeekdays === false);
  const visibleCycleDays = routine?.usesWeekdays === false
    ? [...new Set(plan.map(item => itemCycleDay(item, routine)))].filter(Boolean)
    : Array.from({ length:routine?.cycleLength || 7 }, (_, dayIndex) => dayIndex + 1);
  planList.innerHTML = visibleCycleDays.length ? visibleCycleDays.map(cycleDay => {
    const day = declaredWeekdayForCycleDay(routine, cycleDay);
    const items = plan.filter(item => itemCycleDay(item, routine) === cycleDay);
    const workoutName = items[0]?.workoutName || (items.length ? 'Προπόνηση' : 'Ημέρα ξεκούρασης');
    const heading = routine?.usesWeekdays === false ? workoutName : day;
    const detail = routine?.usesWeekdays === false ? `${items.length} ασκήσεις` : workoutName;
    const number = routine?.usesWeekdays === false ? '' : `<span>${String(cycleDay).padStart(2,'0')}</span>`;
    return `<section class="day-card ${items.length ? 'active-day' : ''}"><div class="day-card-head">${number}<div><h3 ${routine?.usesWeekdays === false ? 'data-i18n-user' : ''}>${esc(heading)}</h3><p ${items.length ? 'data-i18n-user' : ''}>${esc(detail)}</p></div>${items.length ? `<div class="day-card-actions"><button class="edit-day" data-edit-day="${cycleDay}" type="button">Επεξεργασία</button><button class="delete-day" data-delete-day="${cycleDay}" aria-label="Διαγραφή προπόνησης">×</button></div>` : ''}</div>
      <div class="day-exercises">${items.length ? items.map(item => `<article><div><strong data-i18n-user>${esc(item.exercise)}</strong><small>${item.sets?.length || item.workSets || 3} εργάσιμα σετ</small></div>${item.cues ? `<p data-i18n-user>→ ${esc(item.cues)}</p>` : ''}</article>`).join('') : '<small>Δεν έχει οριστεί προπόνηση</small>'}</div></section>`;
  }).join('') : '<section class="day-card"><div class="day-card-head"><div><h3>Δεν υπάρχουν προπονήσεις</h3></div></div></section>';
}

function updateRoutineCarousel(nextIndex = routineCarouselIndex) {
  const list = $('#routine-list');
  const cards = [...list.querySelectorAll('.routine-card')];
  if (!cards.length) {
    $('#routine-carousel-count').textContent = '00 / 00';
    return;
  }
  routineCarouselIndex = ((nextIndex % cards.length) + cards.length) % cards.length;
  cards.forEach((card, index) => {
    let offset = index - routineCarouselIndex;
    if (offset > cards.length / 2) offset -= cards.length;
    if (offset < -cards.length / 2) offset += cards.length;
    const visible = Math.abs(offset) <= 2;
    card.dataset.carouselPosition = visible ? String(offset) : 'hidden';
    card.setAttribute('aria-hidden', String(!visible));
    card.querySelector('.routine-select')?.setAttribute('aria-current', String(offset === 0));
    card.querySelectorAll('button,input').forEach(control => { control.tabIndex = offset === 0 && visible ? 0 : -1; });
    card.querySelectorAll('.routine-actions button').forEach(control => { control.disabled = offset !== 0; });
  });
  $('#routine-carousel-count').textContent = `${String(routineCarouselIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  const tallestCard = Math.max(...cards.map(card => card.offsetHeight));
  if (tallestCard > 0) list.style.height = `${Math.ceil(tallestCard * 1.06) + 36}px`;
}

function renderRoutines({ resetCarousel = false, centerRoutineId = null } = {}) {
  const list = $('#routine-list');
  const previousCenteredRoutineId = resetCarousel ? null : list.querySelector('[data-carousel-position="0"]')?.dataset.routineId;
  const routines = [...state.routines].sort((a, b) => Number(b.isActive) - Number(a.isActive));
  list.innerHTML = routines.map((routine, index) => {
    const selected = routine.id === state.selectedRoutineId;
    const seenCycleDays = new Set();
    const workoutNames = [];
    routine.plan.forEach(item => {
      const cycleDay = itemCycleDay(item, routine);
      if (seenCycleDays.has(cycleDay)) return;
      seenCycleDays.add(cycleDay);
      workoutNames.push(item.workoutName || 'Προπόνηση');
    });
    if (routine.id === state.editingRoutineId) return `<article class="routine-card routine-card-editing ${selected ? 'selected-routine' : ''} ${routine.isActive ? 'active-routine' : ''}" data-routine-id="${esc(routine.id)}">
      <form class="routine-inline-form" data-routine-rename-form="${esc(routine.id)}"><label>Όνομα προγράμματος<input class="routine-inline-name" type="text" maxlength="50" value="${esc(routine.name)}" required></label><div><button class="routine-inline-save" type="submit" aria-label="Αποθήκευση ονόματος">✓</button><button class="routine-inline-cancel" data-cancel-routine-edit type="button" aria-label="Ακύρωση μετονομασίας">×</button></div></form>
    </article>`;
    return `<article class="routine-card ${selected ? 'selected-routine' : ''} ${routine.isActive ? 'active-routine' : ''}" data-routine-id="${esc(routine.id)}">
      <span class="routine-tape routine-tape-tl" aria-hidden="true"></span>
      <span class="routine-tape routine-tape-br" aria-hidden="true"></span>
      <button class="routine-select" data-select-routine="${esc(routine.id)}" type="button"><strong data-i18n-user>${esc(routine.name)}</strong></button>
      <ul class="routine-workouts">${workoutNames.length
        ? workoutNames.map(name => `<li data-i18n-user>${esc(name)}</li>`).join('')
        : '<li class="routine-workouts-empty">Δεν έχει οριστεί προπόνηση</li>'}</ul>
      <span class="routine-stub"><span>ΔΙΑΡΚΕΙΑ: ${routine.cycleLength || 7} ΗΜΕΡΕΣ</span></span>
      <div class="routine-topline"><div class="routine-actions"><button class="routine-star" data-activate-routine="${esc(routine.id)}" type="button" aria-label="${routine.isActive ? 'Ενεργό πρόγραμμα' : 'Ορισμός ως ενεργό πρόγραμμα'}" aria-pressed="${routine.isActive}">${routine.isActive ? '★' : '☆'}</button><button class="routine-view" data-view-routine="${esc(routine.id)}" type="button" aria-label="Προβολή πλάνου"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg></button><button class="routine-add-workout" data-add-routine-workout="${esc(routine.id)}" type="button" aria-label="Προσθήκη προπόνησης"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><button class="routine-duplicate" data-duplicate-routine="${esc(routine.id)}" type="button" aria-label="Αντιγραφή προγράμματος"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M16 8V5H5v11h3"/></svg></button><button class="routine-rename" data-rename-routine="${esc(routine.id)}" type="button" aria-label="Μετονομασία προγράμματος">✎</button><button class="routine-delete" data-delete-routine="${esc(routine.id)}" type="button" aria-label="Διαγραφή προγράμματος">×</button></div></div>
    </article>`;
  }).join('');
  const requestedCenterId = centerRoutineId || previousCenteredRoutineId;
  const requestedCenterIndex = routines.findIndex(routine => routine.id === requestedCenterId);
  updateRoutineCarousel(requestedCenterIndex >= 0 ? requestedCenterIndex : 0);
}

function scrollRoutineTickets(direction) {
  updateRoutineCarousel(routineCarouselIndex + direction);
}

function selectRoutineForPlan(routineId) {
  const routine = state.routines.find(item => item.id === routineId);
  if (!routine) return null;
  state.selectedRoutineId = routine.id;
  resetPlanForm();
  renderRoutines({ centerRoutineId:routine.id });
  renderPlan();
  return routine;
}

function showPlanDialog(dialog) {
  window.LogbookI18n?.translate(dialog);
  if (!dialog.open) dialog.showModal();
}

function openPlanOverview(routineId) {
  if (!selectRoutineForPlan(routineId)) return;
  showPlanDialog($('#plan-overview-dialog'));
}

function openPlanWorkout(routineId) {
  if (!selectRoutineForPlan(routineId)) return;
  showPlanDialog($('#plan-workout-dialog'));
}

function duplicateRoutineName(name) {
  const base = String(name || 'Πρόγραμμα').replace(/\s+\(\d+\)$/, '').trim() || 'Πρόγραμμα';
  const names = new Set(state.routines.map(routine => routine.name));
  let copyNumber = 1;
  let candidate = '';
  do {
    const suffix = ` (${copyNumber})`;
    candidate = `${base.slice(0, Math.max(1, 50 - suffix.length)).trimEnd()}${suffix}`;
    copyNumber += 1;
  } while (names.has(candidate));
  return candidate;
}

function duplicateRoutine(routineId) {
  const source = state.routines.find(routine => routine.id === routineId);
  if (!source) return;
  const duplicate = {
    ...source,
    id:id(),
    name:duplicateRoutineName(source.name),
    isActive:false,
    plan:(source.plan || []).map(item => ({
      ...item,
      id:id(),
      sets:Array.isArray(item.sets) ? item.sets.map(set => ({ ...set })) : [],
    })),
  };
  const nextRoutines = [...state.routines, duplicate];
  if (!safeStoreWrite('trainingRoutines', nextRoutines)) return;
  state.routines = nextRoutines;
  state.selectedRoutineId = duplicate.id;
  resetPlanForm();
  renderRoutines({ centerRoutineId:duplicate.id });
  renderPlan();
  toast(`Το «${duplicate.name}» δημιουργήθηκε`);
}

function exerciseCard(exercise, free = false, exerciseIndex = 0) {
  return `<article class="workout-exercise" data-exercise data-id="${esc(exercise.id || id())}" data-plan-exercise-id="${esc(exercise.planExerciseId || exercise.id || '')}">
    <span class="exercise-tape" aria-hidden="true"></span>
    <div class="exercise-title">${free ? `<input class="exercise-name" data-i18n-user type="text" value="${esc(exercise.exercise || '')}" placeholder="Όνομα άσκησης" required>` : `<div><span class="exercise-order">ΑΣΚΗΣΗ ${exerciseIndex + 1}</span><h3 data-i18n-user>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<div class="exercise-title-actions"><span class="planned-tag">${exercise.sets.length} σετ</span><button class="remove-planned-exercise" type="button" aria-label="Διαγραφή άσκησης">×</button></div>`}</div>
    ${exercise.cues ? `<div class="cue-banner"><span>CUES</span><b data-i18n-user>${esc(exercise.cues)}</b></div>` : ''}
    ${free ? `<label class="free-set-selector">Αριθμός σετ<input class="free-set-count" type="number" min="1" max="20" value="${exercise.sets?.length || 3}"></label>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span></span><span>ΒΑΡΟΣ / ΜΕΤΡΗΣΗ</span><span></span></div>
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
  const plannedCycleDays = [...new Set(plan.map(item => itemCycleDay(item, routine)))].filter(Boolean);
  const requestedDay = validCycleDay(preferredDay, routine.cycleLength);
  const selectedDay = routine.usesWeekdays === false
    ? (plannedCycleDays.includes(requestedDay) ? requestedDay : plannedCycleDays[0])
    : requestedDay || 1;
  const slots = plannedCycleDays.map(cycleDay => {
    const workoutName = plan.find(item => itemCycleDay(item, routine) === cycleDay)?.workoutName || '';
    const label = workoutName;
    return { cycleDay, label };
  });
  const hiddenRestOption = plannedCycleDays.includes(selectedDay) ? '' : `<option value="${selectedDay}" selected hidden></option>`;
  $('#workout-day-select').innerHTML = hiddenRestOption + slots.map(item => `<option data-i18n-user value="${item.cycleDay}" ${item.cycleDay === selectedDay ? 'selected' : ''}>${esc(item.label)}</option>`).join('');
  return selectedDay;
}

function deckShellHTML(cardsHTML) {
  return `<div class="exercise-deck-shell" tabindex="0">
    <div class="deck-head">
      <button class="deck-arrow deck-arrow-prev" type="button" aria-label="Προηγούμενη άσκηση" data-i18n-aria-label="message.0349"><svg aria-hidden="true"><use href="#chevron-left-icon"/></svg></button>
      <span class="deck-stamp" role="status"></span>
      <button class="deck-arrow deck-arrow-next" type="button" aria-label="Επόμενη άσκηση" data-i18n-aria-label="message.0350"><svg aria-hidden="true"><use href="#chevron-right-icon"/></svg></button>
    </div>
    <div class="exercise-deck">${cardsHTML}</div>
    <div class="deck-progress"><i></i></div>
  </div>`;
}

function deckCards(deck) {
  return [...deck.querySelectorAll(':scope > [data-exercise]')];
}

function deckIndex(deck) {
  const cards = deckCards(deck);
  return Math.max(0, Math.min(cards.length - 1, Number(deck.dataset.currentIndex) || 0));
}

function measureDeck(deck) {
  const cards = deckCards(deck);
  const heights = cards.map(card => Math.max(card.offsetHeight, card.scrollHeight));
  const height = Math.max(0, ...heights);
  if (height) {
    deck.style.height = `${height + 18}px`;
    const activeCard = cards[deckIndex(deck)];
    const activeHeight = Math.max(activeCard.offsetHeight, activeCard.scrollHeight);
    deck.closest('.exercise-deck-shell').style.setProperty('--deck-arrow-y', `${deck.offsetTop + activeCard.offsetTop + activeHeight / 2}px`);
  }
}

function layoutDeck(shell) {
  const deck = shell.querySelector('.exercise-deck');
  const cards = deckCards(deck);
  const index = deckIndex(deck);
  deck.dataset.currentIndex = String(index);
  shell.classList.toggle('deck-empty', !cards.length);
  shell.classList.toggle('deck-single', cards.length === 1);
  if (!cards.length) {
    deck.style.height = '0px';
    return;
  }

  cards.forEach((card, cardIndex) => {
    const distance = cardIndex - index;
    card.classList.remove('deck-dragging');
    if (distance < 0) {
      card.style.transform = 'translateX(132%) rotate(14deg)';
      card.style.opacity = '0';
      card.style.zIndex = String(200 + cardIndex);
    } else {
      const depth = Math.min(distance, 3);
      card.style.transform = `translateY(${-11 * depth}px) scale(${1 - .035 * depth})`;
      card.style.opacity = distance > 3 ? '0' : '1';
      card.style.zIndex = String(100 - distance);
    }
    card.style.pointerEvents = distance === 0 ? 'auto' : 'none';
    card.inert = distance !== 0;
    card.toggleAttribute('inert', distance !== 0);
    if (distance === 0) card.removeAttribute('aria-hidden');
    else card.setAttribute('aria-hidden', 'true');
  });

  const stampText = `ΑΣΚΗΣΗ ${String(index + 1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
  if (shell.dataset.stampValue !== stampText) {
    shell.dataset.stampValue = stampText;
    shell.querySelector('.deck-stamp').textContent = stampText;
  }
  shell.querySelector('.deck-progress i').style.width = `${((index + 1) / cards.length) * 100}%`;
  shell.querySelector('.deck-arrow-prev').disabled = index === 0;
  shell.querySelector('.deck-arrow-next').disabled = index === cards.length - 1;
  requestAnimationFrame(() => measureDeck(deck));
}

function showDeckCard(deck, nextIndex) {
  if (!deck) return;
  const cards = deckCards(deck);
  if (!cards.length) return;
  const index = Math.max(0, Math.min(cards.length - 1, nextIndex));
  const shell = deck.closest('.exercise-deck-shell');
  const focusedCard = document.activeElement?.closest?.('[data-exercise]');
  if (focusedCard && focusedCard !== cards[index]) shell.focus({ preventScroll:true });
  deck.dataset.currentIndex = String(index);
  layoutDeck(shell);
}

function showDeckCardForField(deck, card) {
  if (!deck || !card) return;
  showDeckCard(deck, deckCards(deck).indexOf(card));
}

function setupDeck(shell) {
  if (shell.dataset.deckReady) return layoutDeck(shell);
  shell.dataset.deckReady = 'true';
  const deck = shell.querySelector('.exercise-deck');
  const observeCardSizes = () => {
    if (!shell.deckResizeObserver) return;
    shell.deckResizeObserver.disconnect();
    deckCards(deck).forEach(card => shell.deckResizeObserver.observe(card));
  };
  if ('ResizeObserver' in window) {
    shell.deckResizeObserver = new ResizeObserver(() => measureDeck(deck));
    observeCardSizes();
  }
  new MutationObserver(() => {
    observeCardSizes();
    layoutDeck(shell);
  }).observe(deck, { childList:true });

  const move = step => showDeckCard(deck, deckIndex(deck) + step);
  shell.querySelector('.deck-arrow-prev').addEventListener('click', () => move(-1));
  shell.querySelector('.deck-arrow-next').addEventListener('click', () => move(1));
  shell.addEventListener('keydown', event => {
    if (event.target.closest('input,select,textarea,button,a')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  });

  let gesture = null;
  deck.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0) || event.target.closest('input,select,textarea,button,label,a')) return;
    gesture = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, distanceX:0, horizontal:false, card:deckCards(deck)[deckIndex(deck)] };
  });
  deck.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const distanceX = event.clientX - gesture.startX;
    const distanceY = event.clientY - gesture.startY;
    if (!gesture.horizontal) {
      if (Math.abs(distanceX) < 6 && Math.abs(distanceY) < 6) return;
      if (Math.abs(distanceY) > Math.abs(distanceX)) { gesture = null; return; }
      gesture.horizontal = true;
      gesture.card.classList.add('deck-dragging');
      deck.setPointerCapture?.(event.pointerId);
    }
    gesture.distanceX = distanceX;
    const index = deckIndex(deck);
    const canMove = (distanceX > 0 && index < deckCards(deck).length - 1) || (distanceX < 0 && index > 0);
    const visualDistance = canMove ? distanceX : distanceX / 4;
    gesture.card.style.transform = `translateX(${visualDistance}px) rotate(${visualDistance / 15}deg)`;
  });
  const finishGesture = (event, cancelled = false) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const { distanceX, horizontal } = gesture;
    gesture = null;
    if (!cancelled && horizontal && distanceX > 70) move(1);
    else if (!cancelled && horizontal && distanceX < -70) move(-1);
    else layoutDeck(shell);
  };
  deck.addEventListener('pointerup', event => finishGesture(event));
  deck.addEventListener('pointercancel', event => finishGesture(event, true));
  layoutDeck(shell);
}

function refreshSessionDecks() { $$('#log-view .exercise-deck-shell').forEach(setupDeck); }
window.addEventListener('resize', refreshSessionDecks);

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
  $('#scheduled-session').innerHTML = planned.length ? `<div class="session-intro"><div><span class="active-routine-label" data-i18n-user>${esc(routine?.name || 'Ενεργό πρόγραμμα')}</span><h2 data-i18n-user>${esc(workoutName)}</h2></div></div>${deckShellHTML(planned.map((item, index) => exerciseCard(item, false, index)).join(''))}` : `<div class="no-workout empty"><span>Δεν υπάρχει ορισμένη προπόνηση για ${esc(slotLabel)}.</span></div>`;
  refreshCopySetButtons($('#scheduled-session'));
  refreshSessionDecks();
}

function addFreeExercise() {
  const deck = $('#free-exercises');
  deck.insertAdjacentHTML('beforeend', exerciseCard({ sets:[{},{},{}] }, true));
  refreshCopySetButtons(deck);
  refreshSessionDecks();
  showDeckCard(deck, deckCards(deck).length - 1);
}

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
  $('#plan-submit').innerHTML = `${routine.usesWeekdays === false ? 'Ενημέρωση προπόνησης' : 'Ενημέρωση ημέρας'}`;
  $('#cancel-plan-edit').classList.remove('hidden');
  if ($('#plan-overview-dialog').open) $('#plan-overview-dialog').close();
  showPlanDialog($('#plan-workout-dialog'));
}

function resetPlanForm() {
  state.editingDay = null;
  $('#plan-form').reset();
  $('#exercise-count').value = 3;
  refreshDayOptions();
  $('#plan-exercises-container').innerHTML = '';
  renderPlanExercises();
  const routine = selectedRoutine();
  $('#plan-form-title').textContent = routine?.usesWeekdays === false ? 'Νέα προπόνηση' : 'Νέα προπόνηση ημέρας';
  $('#plan-submit').innerHTML = `${routine?.usesWeekdays === false ? 'Αποθήκευση προπόνησης' : 'Αποθήκευση ημέρας'}`;
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
      return { reps:Number(row.querySelector('.set-reps').value), weightMode, weight:['kg','mixed','bodyweight_extra'].includes(weightMode) && weight !== '' ? inputWeightToStored(weight) : null, plates:['plates','mixed'].includes(weightMode) && plates !== '' ? Number(plates) : null };
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

function sessionsToCsvRows() {
  const rows = [['Ημερομηνία', 'Προπόνηση', 'Άσκηση', 'Σετ', 'Επαναλήψεις', 'Βάρος', 'Μονάδα', 'Πλάκες', 'Σχόλια άσκησης', 'Σχόλια προπόνησης']];
  [...state.sessions].sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(session => {
    const workoutName = sessionWorkoutName(session);
    session.exercises.forEach(exercise => {
      exercise.sets.forEach((set, index) => rows.push([
        session.date,
        workoutName,
        exercise.exercise,
        index + 1,
        set.reps ?? '',
        set.weight != null ? storedWeightToDisplay(set.weight) : '',
        set.weight != null ? weightUnitSymbol() : '',
        set.plates ?? '',
        exercise.comments || '',
        session.comments || ''
      ]));
    });
  });
  return rows;
}

function exportSessionsCsv() {
  const csv = '﻿' + sessionsToCsvRows().map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const filename = `logbook-istoriko-${localDateInputValue()}.csv`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
  return filename;
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
    return { ...session, routineId, cycleDay:Number(targetDay), workoutDay:routine?.usesWeekdays === false ? null : nextItems[0]?.day || weekdayForCycleDay(routine, targetDay), workoutName:nextItems[0]?.workoutName || session.workoutName, exercises:syncedExercises };
  });
  if (!persistSessions(nextSessions)) return false;
  state.sessions = nextSessions;
  return true;
}

function loggedLoad(set = {}) {
  const mode = set.weightMode || 'kg';
  const displayedWeight = storedWeightToDisplay(set.weight), symbol = weightUnitSymbol();
  if (mode === 'bodyweight') return 'Σωματικό βάρος';
  if (mode === 'plates') return `${Number(set.plates) || 0} πλάκες`;
  if (mode === 'mixed') return `${Number(set.plates) || 0} πλάκες + ${displayedWeight || 0} ${symbol}`;
  if (mode === 'bodyweight_extra') return `Σωματικό βάρος + ${displayedWeight || 0} ${symbol}`;
  return `${displayedWeight || 0} ${symbol}`;
}

function sessionPage(session, sessionNumber) {
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  return `<section class="session-page" aria-label="Η σελίδα της προπόνησης">
    <div class="page-binding" aria-hidden="true"><i></i><i></i><i></i></div>
    <header class="session-page-head">
      <strong>SESSION No ${sessionNumber}</strong>
      <time datetime="${esc(session.date || '')}">${dayForDate(session.date)} · ${formatDate(session.date)}</time>
    </header>
    <div class="session-page-title"><div><h4 data-i18n-user>${esc(sessionWorkoutName(session))}</h4></div><span aria-hidden="true">LOGGED</span></div>
    ${session.comments ? `<p class="page-session-note" data-i18n-user><b>ΣΗΜΕΙΩΣΕΙΣ</b>${esc(session.comments)}</p>` : ''}
    <div class="page-exercises">${exercises.map((exercise, exerciseIndex) => {
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      return `<article class="page-exercise">
        <div class="page-exercise-title"><span>${String(exerciseIndex + 1).padStart(2, '0')}</span><div><h5 data-i18n-user>${esc(exercise.exercise || 'Άσκηση')}</h5>${exercise.comments ? `<p data-i18n-user>${esc(exercise.comments)}</p>` : ''}</div></div>
        <div class="page-set-table"><div class="page-set-head"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΒΑΡΟΣ</span></div>${sets.length ? sets.map((set, setIndex) => `<div class="page-set-row"><strong>${String(setIndex + 1).padStart(2, '0')}</strong><span>${Number(set.reps) || 0}</span><span>${esc(loggedLoad(set))}</span></div>`).join('') : '<p class="page-no-sets">Δεν καταγράφηκαν σετ.</p>'}</div>
      </article>`;
    }).join('')}</div>
    <footer><button type="button" data-close-session="${esc(session.id)}">ΚΛΕΙΣΙΜΟ ΣΕΛΙΔΑΣ ↑</button></footer>
  </section>`;
}

let sessionDialogOpener = null;
function closeSessionDialog({ restoreFocus = true } = {}) {
  const dialog = $('#session-detail-dialog');
  if (dialog.open) dialog.close();
  $('#session-detail-content').innerHTML = '';
  state.openSessionId = null;
  if (restoreFocus) sessionDialogOpener?.focus();
  sessionDialogOpener = null;
}

function openSessionDialog(sessionId, opener) {
  const sessionIndex = state.sessions.findIndex(session => String(session.id) === String(sessionId));
  if (sessionIndex < 0) return;
  const session = state.sessions[sessionIndex];
  state.openSessionId = session.id;
  sessionDialogOpener = opener;
  $('#session-detail-content').innerHTML = sessionPage(session, state.sessions.length - sessionIndex);
  const dialog = $('#session-detail-dialog');
  window.LogbookI18n?.translate(dialog);
  dialog.showModal();
  $('#session-detail-close').focus();
}

function renderHistoryWeek(direction = 0) {
  const today = localDate(localDateInputValue());
  const sessionDates = state.sessions.map(session => session.date).filter(date => dateParts(date) && date <= localDateInputValue());
  const oldestDate = sessionDates.sort()[0];
  const oldestDifference = oldestDate ? Math.max(0, Math.round((today - localDate(oldestDate)) / 86400000)) : 0;
  const maxOffset = oldestDifference;
  state.historyWeekOffset = Math.max(0, Math.min(maxOffset, state.historyWeekOffset));
  const end = new Date(today);
  end.setDate(end.getDate() - state.historyWeekOffset);
  const visibleDays = Array.from({ length:7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (6 - index));
    return date;
  });
  const visibleDateKeys = visibleDays.map(localDateInputValue);
  if (!visibleDateKeys.includes(state.selectedHistoryDate)) state.selectedHistoryDate = null;
  const sessionCountByDate = state.sessions.reduce((counts, session) => {
    if (session.date) counts.set(session.date, (counts.get(session.date) || 0) + 1);
    return counts;
  }, new Map());
  const weekStrip = $('#week-strip');
  weekStrip.innerHTML = visibleDays.map(date => {
    const key = localDateInputValue(date);
    const sessionCount = sessionCountByDate.get(key) || 0;
    const inner = `<span>${days[date.getDay()].slice(0,3)}</span><strong>${date.getDate()}</strong><small>${date.toLocaleDateString(window.LogbookI18n?.getLocale() || 'el-GR', { month:'short' })}</small>`;
    return sessionCount
      ? `<button class="day-tile done ${state.selectedHistoryDate === key ? 'selected' : ''}" type="button" data-history-date="${key}" aria-label="Δείτε ${sessionCount === 1 ? 'την προπόνηση' : `τις ${sessionCount} προπονήσεις`} της ${formatDate(key)}">${inner}</button>`
      : `<div class="day-tile">${inner}</div>`;
  }).join('');
  requestAnimationFrame(() => {
    if (window.matchMedia?.('(max-width:600px)').matches) weekStrip.scrollLeft = weekStrip.scrollWidth;
  });
  weekStrip.classList.remove('week-shift-older', 'week-shift-newer');
  if (direction) {
    void weekStrip.offsetWidth;
    weekStrip.classList.add(direction > 0 ? 'week-shift-older' : 'week-shift-newer');
  }
  const olderButton = $('[data-history-week-step="1"]');
  const newerButton = $('[data-history-week-step="-1"]');
  olderButton.disabled = state.historyWeekOffset >= maxOffset;
  newerButton.disabled = state.historyWeekOffset === 0;
  $$('.session-card').forEach(card => card.classList.toggle('history-date-active', card.dataset.sessionDate === state.selectedHistoryDate));
}

function moveHistoryWeek(step) {
  state.historyWeekOffset += step;
  state.selectedHistoryDate = null;
  renderHistoryWeek(step);
}

function selectHistoryDate(date) {
  state.selectedHistoryDate = date;
  renderHistoryWeek();
  const card = $(`.session-card[data-session-date="${date}"]`);
  card?.scrollIntoView({ behavior:'smooth', block:'center' });
}

function renderOverview() {
  state.sessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#history-session-count').textContent = state.sessions.length;
  $('#history-counter').classList.toggle('hidden', !state.sessions.length);
  $('#session-cards').innerHTML = state.sessions.length ? state.sessions.map((session, index) => {
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    const sessionNumber = state.sessions.length - index;
    const setCount = exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0);
    return `<article class="session-card" data-session-id="${esc(session.id)}" data-session-date="${esc(session.date || '')}"><div class="session-summary" data-view-session="${esc(session.id)}" role="button" tabindex="0" aria-haspopup="dialog" aria-controls="session-detail-dialog" aria-label="Άνοιγμα προπόνησης ${esc(sessionWorkoutName(session))}"><div class="card-date"><span>${dayForDate(session.date)}</span><strong>${formatDate(session.date)}</strong><small>SESSION No ${sessionNumber}</small></div><div class="card-body"><div class="card-stats"><span>${exercises.length} ΑΣΚΗΣΕΙΣ</span><span>${setCount} WORKING SETS</span><span class="card-stamp" aria-hidden="true">LOGGED</span><span class="card-type">${session.type === 'scheduled' ? 'ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ' : 'ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ'}</span></div><div class="card-title-row"><h3 data-i18n-user>${esc(sessionWorkoutName(session))}</h3></div><p class="card-exercises" data-i18n-user>${exercises.map(ex => esc(ex.exercise)).join(' · ')}</p>${session.comments ? `<p class="card-comment" data-i18n-user>${esc(session.comments)}</p>` : ''}</div><div class="card-actions"><label class="session-select"><input type="checkbox" data-select-session="${esc(session.id)}"><span>ΕΠΙΛΟΓΗ</span></label><div class="card-selection-actions"><button class="card-edit" data-edit-session="${esc(session.id)}" type="button">ΕΠΕΞΕΡΓΑΣΙΑ</button><button class="card-copy" data-copy-session="${esc(session.id)}" type="button">ΑΝΤΙΓΡΑΦΗ</button><button class="card-delete" data-delete-session="${esc(session.id)}" type="button">ΔΙΑΓΡΑΦΗ</button></div></div></div></article>`;
  }).join('') : '<div class="empty"><span>Ολοκληρώστε την πρώτη προπόνηση και αρχίστε να χτίζετε το αρχείο σας.</span></div>';
  renderHistoryWeek();
}

function renderPersonalBests() {
  const bests = new Map();
  state.sessions.forEach(session => session.exercises.forEach(ex => ex.sets.forEach(set => {
    const mode = set.weightMode || 'kg';
    if (!(Number(set.reps) > 0)) return;
    const hasValidLoad = mode === 'bodyweight' || (['kg','bodyweight_extra'].includes(mode) && Number(set.weight) > 0) || (mode === 'plates' && Number(set.plates) > 0) || (mode === 'mixed' && (Number(set.plates) > 0 || Number(set.weight) > 0));
    if (!hasValidLoad) return;
    const key = `${normalizedName(ex.exercise)}::${mode}`;
    if (ProgressRewards.isBetterPerformance({ ...set, weightMode:mode }, bests.get(key)?.set)) bests.set(key, { name:ex.exercise, mode, set:{ ...set, weightMode:mode } });
  })));
  const ranked = [...bests.values()].sort((a,b) => a.name.localeCompare(b.name,'el'));
  const bestValue = best => {
    const displayedWeight = storedWeightToDisplay(best.set.weight), symbol = weightUnitSymbol();
    return best.mode === 'bodyweight' ? `${best.set.reps}<em>επαν.</em>` : best.mode === 'plates' ? `${best.set.plates}<em>πλάκες</em>` : best.mode === 'mixed' ? `${best.set.plates}<em>πλάκες</em> + ${displayedWeight}<em>${symbol}</em>` : `${displayedWeight}<em>${best.mode === 'bodyweight_extra' ? `extra ${symbol}` : symbol}</em>`;
  };
  $('#personal-bests').innerHTML = ranked.length ? ranked.map(best => `<article><div><strong data-i18n-user>${esc(best.name)}</strong><small>${best.set.reps} επαναλήψεις</small></div><b>${bestValue(best)}</b></article>`).join('') : '<div class="empty"><span>Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σας.</span></div>';
}

const normalizedName = ProgressRewards.normalizedName;
const modeLabel = mode => ({ kg:weightUnitSymbol(), plates:'πλάκες', mixed:`πλάκες + ${weightUnitSymbol()}`, bodyweight:'Bodyweight', bodyweight_extra:'Bodyweight + Extra Βάρος' }[mode] || mode);
// Πλάκες and Πλάκες + Κιλά share the plates scale; Bodyweight and Bodyweight + kg share the extra-kg scale.
const weightModeGroup = ProgressRewards.weightModeGroup;
const groupLabel = group => ({ kg:weightUnitSymbol(), plates:`Πλάκες (+ ${weightUnitSymbol()})`, bodyweight:`Bodyweight (+ ${weightUnitSymbol()})` }[group] || group);

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
  renderPersonalBests();
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
  if (!workout || !exerciseKey || !Number.isInteger(setIndex)) { panel.innerHTML = '<div class="empty"><span>Καταγράψτε τουλάχιστον δύο ίδια σετ για να δείτε πρόοδο.</span></div>'; return; }
  const records = workout.sessions.map(session => {
    const exercise = session?.exercises?.find(item => normalizedName(item.exercise) === exerciseKey);
    if (!exercise) return { session, reason:'Η άσκηση δεν καταγράφηκε' };
    const set = exercise.sets?.[setIndex];
    if (!set) return { session, reason:`Δεν καταγράφηκε το σετ ${setIndex + 1}` };
    const mode = set.weightMode || 'kg', group = weightModeGroup(mode), reps = Number(set.reps);
    // kg group: value = kg. plates group: value = plates, extraWeight = extra kg (0 when plates-only).
    // bodyweight group: value = extra kg over bodyweight (0 for plain bodyweight), so BW → BW + kg reads as progress.
    const value = group === 'kg' ? storedWeightToDisplay(set.weight) : group === 'plates' ? Number(set.plates) : mode === 'bodyweight_extra' ? storedWeightToDisplay(set.weight) : 0;
    const extraWeight = group === 'plates' ? (mode === 'mixed' ? storedWeightToDisplay(set.weight) : 0) : null;
    const validLoad = group === 'kg' ? value > 0 : group === 'plates' ? value > 0 && extraWeight >= 0 : mode === 'bodyweight' || value > 0;
    if (!validLoad || !(reps > 0)) return { session, reason:'Λείπει βάρος ή επαναλήψεις από το σετ' };
    return { session, mode, group, value, extraWeight, reps };
  });
  const groupCounts = records.filter(item => item.group).reduce((counts, item) => ({ ...counts, [item.group]:(counts[item.group] || 0) + 1 }), {});
  const comparableGroup = Object.entries(groupCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
  const points = records.filter(item => item.group === comparableGroup).sort((a,b) => a.session.date.localeCompare(b.session.date));
  const excluded = records.filter(item => !item.group || item.group !== comparableGroup);
  if (!comparableGroup || points.length < 2) { panel.innerHTML = '<div class="recording-warning"><p>Χρειάζονται τουλάχιστον δύο καταγραφές της άσκησης με συγκρίσιμη μονάδα βάρους.</p></div>'; return; }
  const height=340, left=64, right=28, top=28, bottom=76, panelWidth=panel.clientWidth || 900;
  const width=Math.max(panelWidth, 320);
  // Plates chart on one line: extra kg counts as a fraction of a plate (assumed 5 kg step, capped just
  // below the next plate), so 9 plates + 2.3 kg plots above 9 plates and below 10 — a visible rise.
  const plateStep = storedWeightToDisplay(5);
  const chartValue = item => comparableGroup === 'plates' && item.extraWeight > 0 ? item.value + Math.min(item.extraWeight / plateStep, .95) : item.value;
  const values=points.map(chartValue), min=Math.min(...values), max=Math.max(...values);
  const floor=min===max ? Math.max(0,min-1) : Math.max(0, min-(max-min)*.15), ceiling=min===max ? max+1 : max+(max-min)*.15;
  const repValues=points.map(item => item.reps), repMin=Math.min(...repValues), repMax=Math.max(...repValues), repFloor=repMin===repMax?Math.max(0,repMin-1):repMin-.5, repCeiling=repMin===repMax?repMax+1:repMax+.5;
  const xStep = (width-left-right) / Math.max(points.length-1, 1);
  const x=i => left+i*xStep, y=value => top+(ceiling-value)/(ceiling-floor)*(height-top-bottom), repY=value => top+(repCeiling-value)/(repCeiling-repFloor)*(height-top-bottom);
  // Bodyweight-only history has no load to chart, so the line tracks reps instead.
  const primaryUnit = comparableGroup === 'kg' ? weightUnitSymbol() : comparableGroup === 'plates' ? 'πλάκες' : points.some(item => item.value > 0) ? `extra ${weightUnitSymbol()}` : null;
  const linePoints = points.map((item,i) => ({ x:x(i), y:y(chartValue(item)) }));
  const mainPoints = primaryUnit ? linePoints : points.map((item,i) => ({ x:x(i), y:repY(item.reps) }));
  const smoothLine = ProgressRewards.smoothPath(mainPoints);
  const exerciseName = points[0]?.session?.exercises?.find(item => normalizedName(item.exercise) === exerciseKey)?.exercise || '';
  const pointLabel = (item, { fullReps = false } = {}) => {
    const repsUnit = fullReps ? 'επαναλήψεις' : 'επαν.';
    return comparableGroup === 'bodyweight' ? (item.value > 0 ? `Σωματικό βάρος + ${item.value} ${weightUnitSymbol()} · ${item.reps} ${repsUnit}` : `Σωματικό βάρος · ${item.reps} ${repsUnit}`) : comparableGroup === 'plates' ? `${item.value} πλάκες${item.extraWeight > 0 ? ` + ${item.extraWeight} ${weightUnitSymbol()}` : ''} · ${item.reps} ${repsUnit}` : `${item.value} ${primaryUnit} · ${item.reps} ${repsUnit}`;
  };
  const weightLegend = `<span class="weight-key">${primaryUnit || 'Επαναλήψεις'}</span>`;
  const weightSeries = `<path d="${smoothLine}" class="chart-line"/>`;
  // Κάτω από κάθε ίσιωμα της γραμμής (ίδιο φορτίο σε συνεχόμενες προπονήσεις) μια αγκύλη σημειώνει
  // την πορεία των επαναλήψεων μέσα στον κύκλο, ώστε η διπλή πρόοδος να μη διαβάζεται ως στασιμότητα.
  const cycleBrackets = !primaryUnit ? '' : (() => {
    const sameLoad = (first, second) => first.value === second.value && (comparableGroup !== 'plates' || first.extraWeight === second.extraWeight);
    const runs = [];
    for (let start = 0, i = 1; i <= points.length; i++)
      if (i === points.length || !sameLoad(points[i], points[start])) { if (i - start > 1) runs.push([start, i - 1]); start = i; }
    return runs.map(([start, end]) => {
      const x1 = x(start), x2 = x(end), pointY = y(chartValue(points[start]));
      const below = pointY <= height - bottom - 49;
      const bracketY = below ? pointY + 26 : pointY - 26, tickDir = below ? -6 : 6, labelY = below ? bracketY + 17 : bracketY - 10;
      const fromReps = points[start].reps, toReps = points[end].reps;
      const repsText = fromReps === toReps ? `${fromReps}` : `${fromReps} → ${toReps}`;
      const label = x2 - x1 >= 64 ? `<text class="cycle-label" x="${(x1 + x2) / 2}" y="${labelY}" text-anchor="middle">${repsText} <tspan>επαναλήψεις</tspan></text>` : '';
      return `<path class="cycle-bracket" d="M ${x1} ${bracketY + tickDir} L ${x1} ${bracketY} L ${x2} ${bracketY} L ${x2} ${bracketY + tickDir}"/>${label}`;
    }).join('');
  })();
  const axisDate = date => localDate(date).toLocaleDateString(window.LogbookI18n?.getLocale() || 'el-GR', { day:'numeric', month:'short' });
  const latest = points.at(-1), latestLoad = pointLabel(latest, { fullReps:true });
  const scaleFloor = primaryUnit ? floor : repFloor, scaleCeiling = primaryUnit ? ceiling : repCeiling, scaleY = primaryUnit ? y : repY;
  const gridMarkup = Array.from({ length:5 }, (_, index) => {
    const tickValue = scaleFloor + (scaleCeiling - scaleFloor) * index / 4, tickY = scaleY(tickValue);
    return `<line x1="${left}" y1="${tickY}" x2="${width-right}" y2="${tickY}" class="chart-grid"/><text x="${left-12}" y="${tickY+4}" text-anchor="end" class="chart-tick">${Number(tickValue.toFixed(1))}</text>`;
  }).join('');
  panel.innerHTML = `<div class="chart-summary"><div><h2>${esc(exerciseName)}</h2><small>${points.length} καταγραφές</small></div><div class="chart-latest"><span>ΤΕΛΕΥΤΑΙΑ ΕΠΙΔΟΣΗ</span><strong>${latestLoad}</strong></div></div><div class="chart-legend">${weightLegend}</div><div class="chart-wrap"><svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Γράφημα προόδου βάρους και επαναλήψεων">${gridMarkup}<line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="chart-axis"/>${weightSeries}${cycleBrackets}${points.map((item,i) => { const pointY=primaryUnit?y(chartValue(item)):repY(item.reps), tipLabel=pointLabel(item), tipDate=formatDate(item.session.date), tooltipWidth=Math.max(120,Math.round(Math.max(tipLabel.length,tipDate.length)*6.6)+26), tooltipX=Math.max(8,Math.min(width-tooltipWidth-8,x(i)-tooltipWidth/2)), tooltipY=Math.max(8,pointY-64), dateY=height-bottom+18; return `<g class="chart-point" tabindex="0"><title>${tipLabel} · ${tipDate}</title><line x1="${x(i)}" y1="${pointY}" x2="${x(i)}" y2="${height-bottom}" class="chart-guide"/><circle cx="${x(i)}" cy="${pointY}" r="7" class="chart-dot"/><g class="chart-tooltip-card" transform="translate(${tooltipX} ${tooltipY})" aria-hidden="true"><rect width="${tooltipWidth}" height="48" rx="5"/><text x="${tooltipWidth/2}" y="18" text-anchor="middle"><tspan x="${tooltipWidth/2}" dy="0">${tipLabel}</tspan><tspan x="${tooltipWidth/2}" dy="17">${tipDate}</tspan></text></g><text x="${x(i)}" y="${dateY}" transform="rotate(-38 ${x(i)} ${dateY})" text-anchor="end" class="chart-date">${axisDate(item.session.date)}</text></g>`; }).join('')}</svg></div>${excluded.length ? `<div class="recording-warning"><strong>Έλεγχος καταγραφής: ${excluded.length} ${excluded.length===1?'προπόνηση εξαιρέθηκε':'προπονήσεις εξαιρέθηκαν'}.</strong><p>Το γράφημα χρησιμοποιεί μόνο «${groupLabel(comparableGroup)}». ${excluded.map(item => `${formatDate(item.session.date)} — ${item.reason || `καταγράφηκε σε ${modeLabel(item.mode)}`}`).join(' · ')}</p></div>` : ''}`;
}

function toast(message, kind = 'recorded') { const el = $('#toast'); el.textContent = message; el.classList.toggle('toast-error', kind === 'error'); el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

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
  const hasCustomImage = Boolean(customAvatarData);
  $('#profile-age').textContent = age ?? '—';
  $('#profile-age-label').textContent = age === null ? 'Χωρίς ημερομηνία' : age === 1 ? 'έτος' : 'έτη';
  $('#profile-preview-name').textContent = name || 'ΟΝΟΜΑ';
  $('#profile-preview-age').textContent = age === null ? '—' : `${age}`;
  $('#profile-preview-age-unit').textContent = age === null ? '' : age === 1 ? 'έτος' : 'έτη';
  $('#profile-card-stats').classList.toggle('hidden', $('#profile-hide-age').checked);
  $('#profile-preview-avatar').classList.toggle('male-avatar', !hasCustomImage);
  $('#profile-preview-avatar').classList.remove('female-avatar');
  $('#profile-preview-avatar').classList.toggle('custom-avatar', hasCustomImage);
  $('#profile-preview-image').src = customAvatarData;
  renderProfileGallery();
  renderRewards();
}

const PROFILE_GALLERY_LIMIT = 6;
let profileGalleryDraft = [];

function comparableProfile(profile = {}) {
  profile ||= {};
  const customImage = typeof profile.customImage === 'string' ? profile.customImage : '';
  const imageGallery = Array.isArray(profile.imageGallery)
    ? profile.imageGallery.filter(image => typeof image === 'string' && image)
    : [];
  if (customImage && !imageGallery.includes(customImage)) imageGallery.unshift(customImage);
  return {
    name:String(profile.name || '').trim(),
    birthdate:profile.birthdate || '',
    hideAge:Boolean(profile.hideAge),
    weightUnit:profileWeightUnit(profile),
    customImage,
    imageGallery:imageGallery.slice(0, PROFILE_GALLERY_LIMIT)
  };
}

function currentProfileDraft() {
  return comparableProfile({
    name:$('#profile-name').value,
    birthdate:$('#profile-birthdate').value,
    hideAge:$('#profile-hide-age').checked,
    weightUnit:$('#profile-form input[name="profile-weight-unit"]:checked')?.value,
    customImage:customAvatarData,
    imageGallery:profileGalleryDraft
  });
}

function updateProfileDraftState() {
  const dirty = JSON.stringify(currentProfileDraft()) !== JSON.stringify(comparableProfile(state.profile));
  $('#profile-form').dataset.dirty = String(dirty);
  $('#profile-save').classList.toggle('hidden', !dirty);
  setProfileStatus(dirty ? 'ΜΗ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ' : state.profile ? '' : 'ΝΕΟ ΠΡΟΦΙΛ');
  renderProfilePreview();
}

function renderProfileGallery() {
  $$('#profile-photo-grid .profile-photo-cell').forEach(cell => cell.remove());
  profileGalleryDraft.forEach((image, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'profile-photo-cell';
    cell.dataset.galleryIndex = String(index);
    const selected = image === customAvatarData;
    cell.classList.toggle('selected', selected);
    const thumb = document.createElement('img');
    thumb.src = image;
    thumb.alt = '';
    const label = document.createElement('small');
    label.textContent = selected ? 'ΣΕ ΧΡΗΣΗ' : 'ΕΠΙΛΟΓΗ';
    cell.setAttribute('aria-label', selected ? 'Φωτογραφία σε χρήση' : 'Χρήση αυτής της φωτογραφίας');
    cell.append(thumb, label);
    $('#profile-photo-grid').append(cell);
  });
}

const profileSlips = { name:'#profile-name-slip', photo:'#profile-photo-slip', date:'#profile-date-slip' };
const profileSlipButtons = { name:'#profile-name-button', photo:'#profile-photo-button', date:'#profile-age-button' };

function setProfileSlip(slip, open) {
  Object.keys(profileSlips).forEach(key => {
    const isOpen = key === slip ? open : false;
    $(profileSlips[key]).classList.toggle('hidden', !isOpen);
    $(profileSlipButtons[key]).setAttribute('aria-expanded', String(isOpen));
  });
}

function toggleProfileSlip(slip) {
  setProfileSlip(slip, $(profileSlips[slip]).classList.contains('hidden'));
}

function renderMenuIdentity() {
  const profile = state.profile;
  const hasProfile = Boolean(profile?.name);
  $('#menu-brand-mark').classList.toggle('hidden', hasProfile);
  $('#menu-profile-summary').classList.toggle('hidden', !hasProfile);
  if (!hasProfile) return;
  const hasCustomImage = Boolean(profile.customImage);
  $('#menu-profile-name').textContent = profile.name;
  $('#menu-profile-avatar').classList.toggle('male-avatar', !hasCustomImage);
  $('#menu-profile-avatar').classList.remove('female-avatar');
  $('#menu-profile-avatar').classList.toggle('custom-avatar', hasCustomImage);
  $('#menu-profile-image').src = hasCustomImage ? profile.customImage : '';
}

function mobileHomeLayout() {
  return window.innerWidth <= 700;
}

function homeCardStorageKey(storageKey) {
  return mobileHomeLayout() ? `${storageKey}Mobile` : storageKey;
}

function readHomeCardPosition(storageKey = 'homeProfileCardPosition') {
  const saved = store.read(homeCardStorageKey(storageKey));
  return !Array.isArray(saved) && Number.isFinite(saved?.x) && Number.isFinite(saved?.y) ? saved : null;
}

function homeCardBounds(card = $('#home-profile-card')) {
  const shell = $('.home-shell');
  if (mobileHomeLayout()) {
    const gutter = 16;
    const shellRect = shell.getBoundingClientRect();
    // The active mobile view slides in from the right. Using its transient
    // bounding rect here would bake that animation offset into the saved card
    // position and leave the card outside the viewport when the animation ends.
    const baseLeft = card.offsetLeft;
    const baseTop = shellRect.top + card.offsetTop;
    const minX = gutter - baseLeft;
    const minY = gutter - baseTop;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return {
      minX,
      minY,
      maxX:Math.max(minX, viewportWidth - gutter - baseLeft - card.offsetWidth),
      maxY:Math.max(minY, viewportHeight - gutter - baseTop - card.offsetHeight)
    };
  }
  const minX = -card.offsetLeft;
  const minY = -card.offsetTop;
  return {
    minX,
    minY,
    maxX:Math.max(minX, shell.clientWidth - card.offsetLeft - card.offsetWidth),
    maxY:Math.max(minY, shell.scrollHeight - card.offsetTop - card.offsetHeight)
  };
}

function placeHomeCard(card, position, fallback) {
  if (card.classList.contains('hidden')) return;
  const { minX, minY, maxX, maxY } = homeCardBounds(card);
  const rangeX = maxX - minX, rangeY = maxY - minY;
  const mobile = mobileHomeLayout();
  const fallbackX = mobile ? 0 : fallback.x(maxX);
  const fallbackY = mobile ? 0 : fallback.y(maxY);
  const x = Math.max(minX, Math.min(maxX, position ? minX + position.x * rangeX : fallbackX));
  const y = Math.max(minY, Math.min(maxY, position ? minY + position.y * rangeY : fallbackY));
  card.dataset.x = String(x);
  card.dataset.y = String(y);
  card.style.setProperty('--card-x', `${x}px`);
  card.style.setProperty('--card-y', `${y}px`);
}

function placeHomeProfileCard(position = readHomeCardPosition()) {
  placeHomeCard($('#home-profile-card'), position, { x:maxX => maxX * .92, y:maxY => Math.min(205, maxY * .16) });
}

function placeHomeRoutineCard(position = readHomeCardPosition('homeRoutineCardPosition')) {
  placeHomeCard($('#home-routine-card'), position, { x:maxX => maxX * .58, y:maxY => Math.min(330, maxY * .62) });
}

function renderHomeProfileCard() {
  const card = $('#home-profile-card'), profile = state.profile;
  const hasProfile = Boolean(profile?.name);
  card.classList.toggle('hidden', !hasProfile);
  if (!hasProfile) return;
  const hasCustomImage = Boolean(profile.customImage);
  $('#home-profile-name').textContent = profile.name;
  $('#home-profile-avatar').classList.toggle('male-avatar', !hasCustomImage);
  $('#home-profile-avatar').classList.remove('female-avatar');
  $('#home-profile-avatar').classList.toggle('custom-avatar', hasCustomImage);
  $('#home-profile-image').src = hasCustomImage ? profile.customImage : '';
  renderRewards();
  requestAnimationFrame(() => placeHomeProfileCard());
}

function renderHomeRoutineCard() {
  const card = $('#home-routine-card');
  const routine = activeRoutine();
  const plannedDays = Array.from({ length:routine?.cycleLength || 0 }, (_, index) => index + 1).map(cycleDay => {
    const items = (routine?.plan || []).filter(item => itemCycleDay(item, routine) === cycleDay);
    return items.length ? { cycleDay, workoutName:items[0].workoutName || 'Προπόνηση' } : null;
  }).filter(Boolean);
  card.classList.toggle('hidden', !routine);
  if (!routine) return;
  $('#home-routine-name').textContent = routine.name;
  $('#home-routine-days').innerHTML = plannedDays.length
    ? plannedDays.map(({ cycleDay, workoutName }, index) => {
      const declaredDay = routine.usesWeekdays === false ? '' : declaredWeekdayForCycleDay(routine, cycleDay);
      const marker = declaredDay ? '' : `<span>${String(index + 1).padStart(2,'0')}</span>`;
      return `<li${marker ? '' : ' class="no-marker"'}>${marker}<div><strong data-i18n-user>${esc(workoutName)}</strong>${declaredDay ? `<small>${declaredDay}</small>` : ''}</div></li>`;
    }).join('')
    : '<li class="home-routine-empty"><span>—</span><div><strong>Κενό πρόγραμμα</strong><small>Προσθέστε την πρώτη ημέρα προπόνησης</small></div></li>';
  const routineRowCount = Math.max(1, plannedDays.length);
  card.dataset.routineSize = String(routineRowCount);
  card.style.setProperty('--routine-list-height', `${routineRowCount * 49}px`);
  requestAnimationFrame(() => placeHomeRoutineCard());
}

function enableHomeCardDrag(card, storageKey, placeCard) {
  let drag = null;
  const finish = event => {
    if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    const { minX, minY, maxX, maxY } = homeCardBounds(card);
    const rangeX = maxX - minX, rangeY = maxY - minY;
    const x = Number(card.dataset.x) || 0, y = Number(card.dataset.y) || 0;
    safeStoreWrite(homeCardStorageKey(storageKey), { x:rangeX ? (x - minX) / rangeX : 0, y:rangeY ? (y - minY) / rangeY : 0 });
    card.classList.remove('is-dragging');
    drag = null;
  };
  card.addEventListener('pointerdown', event => {
    if ((event.button !== undefined && event.button !== 0) || event.target.closest('button,a,input,select,textarea')) return;
    const coarsePointer = event.pointerType === 'touch' || (event.pointerType && event.pointerType !== 'mouse' && window.matchMedia?.('(pointer:coarse)').matches);
    if (coarsePointer && card.id === 'home-routine-card' && !event.target.closest('.home-routine-head,.home-routine-title')) return;
    drag = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:Number(card.dataset.x) || 0, y:Number(card.dataset.y) || 0 };
    card.setPointerCapture?.(event.pointerId);
    card.classList.add('is-dragging');
    event.preventDefault();
  });
  card.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { minX, minY, maxX, maxY } = homeCardBounds(card);
    const x = Math.max(minX, Math.min(maxX, drag.x + event.clientX - drag.startX));
    const y = Math.max(minY, Math.min(maxY, drag.y + event.clientY - drag.startY));
    card.dataset.x = String(x); card.dataset.y = String(y);
    card.style.setProperty('--card-x', `${x}px`); card.style.setProperty('--card-y', `${y}px`);
  });
  card.addEventListener('pointerup', finish);
  card.addEventListener('pointercancel', finish);
  card.addEventListener('keydown', event => {
    if (event.target !== card) return;
    const movement = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[event.key];
    if (!movement) return;
    event.preventDefault();
    const step = event.shiftKey ? 30 : 8, { minX, minY, maxX, maxY } = homeCardBounds(card);
    const rangeX = maxX - minX, rangeY = maxY - minY;
    const x = Math.max(minX, Math.min(maxX, (Number(card.dataset.x) || 0) + movement[0] * step));
    const y = Math.max(minY, Math.min(maxY, (Number(card.dataset.y) || 0) + movement[1] * step));
    card.dataset.x = String(x); card.dataset.y = String(y);
    card.style.setProperty('--card-x', `${x}px`); card.style.setProperty('--card-y', `${y}px`);
    safeStoreWrite(homeCardStorageKey(storageKey), { x:rangeX ? (x - minX) / rangeX : 0, y:rangeY ? (y - minY) / rangeY : 0 });
  });
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(placeCard);
  });
}

function enableHomeProfileCardDrag() {
  enableHomeCardDrag($('#home-profile-card'), 'homeProfileCardPosition', () => placeHomeProfileCard());
}

function enableHomeRoutineCardDrag() {
  enableHomeCardDrag($('#home-routine-card'), 'homeRoutineCardPosition', () => placeHomeRoutineCard());
}

function prepareProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return reject(new Error('Επιλογή εικόνας JPG, PNG ή WEBP.'));
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

function setProfileStatus(message) {
  const status = $('#profile-status');
  status.textContent = message;
  status.classList.toggle('hidden', !message);
}

function loadProfile() {
  const profile = state.profile;
  $('#profile-form').reset();
  $('#profile-form').dataset.dirty = 'false';
  customAvatarData = profile?.customImage || '';
  profileGalleryDraft = Array.isArray(profile?.imageGallery) ? profile.imageGallery.filter(image => typeof image === 'string' && image) : [];
  // Προφίλ πριν το gallery: η ήδη αποθηκευμένη εικόνα γίνεται η πρώτη καταχώρηση.
  if (customAvatarData && !profileGalleryDraft.includes(customAvatarData)) profileGalleryDraft.unshift(customAvatarData);
  profileGalleryDraft = profileGalleryDraft.slice(0, PROFILE_GALLERY_LIMIT);
  $('#profile-birthdate').max = localDateInputValue();
  setProfileSlip('name', false);
  const unitInput = $(`#profile-form input[name="profile-weight-unit"][value="${profileWeightUnit(profile)}"]`);
  if (unitInput) unitInput.checked = true;
  if (profile) {
    $('#profile-name').value = profile.name || '';
    $('#profile-birthdate').value = profile.birthdate || '';
    $('#profile-hide-age').checked = Boolean(profile.hideAge);
  }
  updateProfileDraftState();
  refreshWeightUnitUI();
  renderMenuIdentity();
}
let pendingConfirmation = null;
let pendingSecondaryConfirmation = null;
function askToConfirm(title, message, onConfirm, confirmLabel = 'Διαγραφή') {
  $('#exercise-delete-title').textContent = title;
  $('#exercise-delete-message').textContent = message;
  $('#confirm-delete-accept').textContent = confirmLabel;
  $('#confirm-delete-secondary').classList.add('hidden');
  $('#confirm-delete-cancel').textContent = 'Ακύρωση';
  pendingConfirmation = onConfirm;
  pendingSecondaryConfirmation = null;
  window.LogbookI18n?.translate($('#exercise-delete-dialog'));
  $('#exercise-delete-dialog').showModal();
}
function askToChoose(title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary, cancelLabel = 'Ακύρωση') {
  $('#exercise-delete-title').textContent = title;
  $('#exercise-delete-message').textContent = message;
  $('#confirm-delete-accept').textContent = primaryLabel;
  const secondary = $('#confirm-delete-secondary');
  secondary.textContent = secondaryLabel;
  secondary.classList.remove('hidden');
  $('#confirm-delete-cancel').textContent = cancelLabel;
  pendingConfirmation = onPrimary;
  pendingSecondaryConfirmation = onSecondary;
  window.LogbookI18n?.translate($('#exercise-delete-dialog'));
  $('#exercise-delete-dialog').showModal();
}
function askToDeleteExercise(exerciseName, onConfirm) { askToConfirm('Διαγραφή άσκησης', `Είστε σίγουροι για την διαγραφή της άσκησης "${exerciseName}" από την δήλωση της προπόνησης;`, onConfirm); }
function askToRemoveSet(onConfirm) { askToConfirm('Αφαίρεση σετ', 'Είστε σίγουροι ότι θέλετε να πραγματοποιηθεί αφαίρεση του εργάσιμου σετ ;', onConfirm, 'Αφαίρεση'); }

function setMode(mode) {
  state.mode = mode; $$('.mode-button').forEach(b => { const active = b.dataset.mode === mode; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  $('#scheduled-session').classList.toggle('hidden', mode !== 'scheduled'); $('#free-session').classList.toggle('hidden', mode !== 'free');
  $('#workout-day-field').classList.toggle('hidden', mode !== 'scheduled');
  if (mode === 'free' && !$('#free-exercises').children.length) addFreeExercise();
  refreshSessionDecks();
}

function resetSessionForm() {
  state.editingSessionId = null;
  state.copyingSessionId = null;
  state.selectedPlanDay = null;
  $('#log-date').max = localDateInputValue();
  $('#log-date').value = localDateInputValue();
  $('#session-comments').value = '';
  $('#free-exercises').innerHTML = '';
  $('#cancel-session-edit').classList.add('hidden');
  $('#cancel-session-edit').textContent = 'Ακύρωση διορθώσεων';
  $('#save-session').innerHTML = 'Ολοκλήρωση προπόνησης';
  $$('.mode-button').forEach(button => { button.disabled = false; });
  $('#workout-day-select').disabled = false;
  setMode('scheduled');
  renderScheduledSession();
}

function loadSessionForEdit(sessionId) {
  const session = state.sessions.find(item => String(item.id) === String(sessionId));
  if (!session) return;
  state.editingSessionId = sessionId;
  state.copyingSessionId = null;
  const routine = state.routines.find(item => item.id === session.routineId) || activeRoutine();
  state.selectedPlanDay = session.type === 'scheduled' ? (validCycleDay(session.cycleDay, routine?.cycleLength) || legacyCycleDay(session.workoutDay || dayForDate(session.date)) || cycleDayForDate(routine, session.date)) : null;
  $('#log-date').value = session.date;
  $('#session-comments').value = session.comments || '';
  setMode(session.type);
  if (session.type === 'scheduled') {
    refreshWorkoutDayOptions(state.selectedPlanDay);
    $('#day-badge').innerHTML = `<span>${dayForDate(session.date)}</span><small>${formatDate(session.date)}</small>`;
    $('#scheduled-session').innerHTML = `<div class="session-intro"><div><h2 data-i18n-user>${esc(sessionWorkoutName(session))}</h2><p>Διορθώστε τις τιμές που θέλετε και αποθηκεύστε ξανά.</p></div></div>${deckShellHTML(session.exercises.map((item, index) => exerciseCard(item, false, index)).join(''))}`;
  } else {
    $('#free-exercises').innerHTML = session.exercises.map(item => exerciseCard(item, true)).join('');
  }
  refreshCopySetButtons();
  refreshSessionDecks();
  $$('.mode-button').forEach(button => { button.disabled = true; });
  $('#workout-day-select').disabled = true;
  $('#cancel-session-edit').classList.remove('hidden');
  $('#cancel-session-edit').textContent = 'Ακύρωση διορθώσεων';
  $('#save-session').innerHTML = 'Αποθήκευση διορθώσεων';
  showView('log');
  $('#log-view').scrollIntoView({ behavior:'smooth', block:'start' });
}

function loadSessionForCopy(sessionId) {
  const session = state.sessions.find(item => String(item.id) === String(sessionId));
  if (!session) return;
  state.editingSessionId = null;
  state.copyingSessionId = sessionId;
  const routine = state.routines.find(item => item.id === session.routineId) || activeRoutine();
  state.selectedPlanDay = session.type === 'scheduled' ? (validCycleDay(session.cycleDay, routine?.cycleLength) || legacyCycleDay(session.workoutDay || dayForDate(session.date)) || cycleDayForDate(routine, session.date)) : null;
  const today = localDateInputValue();
  $('#log-date').max = today;
  $('#log-date').value = today;
  $('#session-comments').value = '';
  setMode(session.type);
  if (session.type === 'scheduled') {
    refreshWorkoutDayOptions(state.selectedPlanDay);
    $('#day-badge').innerHTML = `<span>${dayForDate(today)}</span><small>${formatDate(today)}</small>`;
    $('#scheduled-session').innerHTML = `<div class="session-intro"><div><h2 data-i18n-user>${esc(sessionWorkoutName(session))}</h2><p>Προσαρμόστε ό,τι εκτελέσατε σήμερα και ολοκληρώστε τη νέα προπόνηση.</p></div></div>${deckShellHTML(session.exercises.map((item, index) => exerciseCard({ ...item, comments:'' }, false, index)).join(''))}`;
  } else {
    $('#free-exercises').innerHTML = session.exercises.map(item => exerciseCard({ ...item, comments:'' }, true)).join('');
  }
  refreshCopySetButtons();
  refreshSessionDecks();
  $$('.mode-button').forEach(button => { button.disabled = true; });
  $('#workout-day-select').disabled = true;
  $('#cancel-session-edit').classList.remove('hidden');
  $('#cancel-session-edit').textContent = 'Ακύρωση αντιγραφής';
  $('#save-session').innerHTML = 'Ολοκλήρωση προπόνησης';
  showView('log');
  $('#log-view').scrollIntoView({ behavior:'smooth', block:'start' });
}

function showView(view, { skipSessionWarning = false } = {}) {
  if (pendingCloudReload && !hasUnsavedWork()) { window.location.reload(); return; }
  const current = $('.view.active')?.id.replace('-view','');
  const labels = { home:'Αρχική', log:'Καταγραφή', plan:'Πρόγραμμα', overview:'Ιστορικό', progress:'Επίβλεψη', profile:'Προφίλ' };
  if (!labels[view]) return;
  closeMenu();
  if (!skipSessionWarning && current === 'log' && view !== 'log' && hasUnsavedSession()) {
    askToChoose(
      'Μη αποθηκευμένη καταγραφή',
      'Έχετε μη αποθηκευμένα δεδομένα προπόνησης. Αν αποχωρήσετε χωρίς αποθήκευση, θα χαθούν. Θέλετε να αποθηκεύσετε την καταγραφή πριν συνεχίσετε;',
      'Αποθήκευση',
      'Έξοδος χωρίς αποθήκευση',
      () => {
        if (saveSession()) showView(view, { skipSessionWarning:true });
      },
      () => {
        resetSessionForm();
        showView(view, { skipSessionWarning:true });
      },
      'Παραμονή'
    );
    return;
  }
  history.replaceState(null, '', `#${view}`);
  if (current === view) { syncNavigation(view); return; }
  if (current === 'profile') loadProfile();
  const swap = () => {
    $$('.view').forEach(el => el.classList.remove('active'));
    syncNavigation(view);
    $(`#${view}-view`).classList.add('active');
    if (view === 'home') renderHome();
    if (view === 'overview') renderOverview();
    if (view === 'progress') renderProgressSelectors();
    if (view === 'profile') renderProfilePreview();
  };
  if (window.matchMedia('(max-width:700px), (prefers-reduced-motion: reduce)').matches) { swap(); return; }
  const transition = $('#view-transition');
  transition.querySelector('span').textContent = labels[view];
  transition.classList.remove('running');
  void transition.offsetWidth;
  transition.classList.add('running');
  setTimeout(swap, 320);
  setTimeout(() => transition.classList.remove('running'), 780);
}

function syncNavigation(view) {
  UI.syncNavigationState(document, view);
}

function setMenu(open) {
  UI.setMenuState(document, open);
}
function closeMenu() { setMenu(false); }

$$('.nav-button').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
window.addEventListener('beforeunload', event => {
  if (!hasUnsavedSession()) return;
  event.preventDefault();
  event.returnValue = '';
});
$('#open-menu').addEventListener('click', () => setMenu(true));
window.addEventListener('scroll', () => {
  $('#open-menu').classList.toggle('faded', window.scrollY > 60);
}, { passive: true });
$('#close-menu').addEventListener('click', closeMenu);
$('#menu-backdrop').addEventListener('click', closeMenu);
$('#routine-list').addEventListener('pointerdown', event => {
  if (event.button !== undefined && event.button !== 0) return;
  routineSwipeStartX = event.clientX;
});
$('#routine-list').addEventListener('pointerup', event => {
  if (routineSwipeStartX === null) return;
  const distance = event.clientX - routineSwipeStartX;
  routineSwipeStartX = null;
  if (Math.abs(distance) >= 45) scrollRoutineTickets(distance < 0 ? 1 : -1);
});
$('#routine-list').addEventListener('pointercancel', () => { routineSwipeStartX = null; });
$('#week-strip').addEventListener('pointerdown', event => {
  if (event.isPrimary === false || (event.pointerType && !['touch', 'pen'].includes(event.pointerType))) return;
  historySwipe = { pointerId:event.pointerId, x:event.clientX, y:event.clientY };
  event.currentTarget.setPointerCapture?.(event.pointerId);
});
$('#week-strip').addEventListener('pointerup', event => {
  if (!historySwipe || (event.pointerId !== undefined && event.pointerId !== historySwipe.pointerId)) return;
  const distanceX = event.clientX - historySwipe.x;
  const distanceY = event.clientY - historySwipe.y;
  historySwipe = null;
  if (Math.abs(distanceX) >= 45 && Math.abs(distanceX) > Math.abs(distanceY) * 1.25) moveHistoryWeek(distanceX > 0 ? 1 : -1);
});
$('#week-strip').addEventListener('pointercancel', () => { historySwipe = null; });
$('#session-detail-close').addEventListener('click', () => closeSessionDialog());
$('#session-detail-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  closeSessionDialog();
});
$('#session-detail-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeSessionDialog();
});
$('#session-detail-dialog').addEventListener('close', () => {
  state.openSessionId = null;
});
$$('[data-close-plan-dialog]').forEach(button => button.addEventListener('click', () => {
  const dialog = button.closest('dialog');
  if (dialog?.open) dialog.close();
}));
[$('#plan-overview-dialog'), $('#plan-workout-dialog')].forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
});
$('#plan-workout-dialog').addEventListener('close', () => resetPlanForm());
document.addEventListener('keydown', event => {
  const sessionSummary = event.target.closest?.('.session-summary[data-view-session]');
  const routineList = event.target.closest?.('#routine-list');
  if (sessionSummary && event.target === sessionSummary && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    sessionSummary.click();
  }
  if (routineList && event.target === routineList && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault();
    scrollRoutineTickets(event.key === 'ArrowRight' ? 1 : -1);
  }
  if (event.key === 'Escape') closeMenu();
});
$('#progress-workout').addEventListener('change', renderProgressSelectors);
$('#progress-exercise').addEventListener('change', renderProgressSelectors);
$('#progress-set').addEventListener('change', renderProgressChart);
$('#personal-records-trigger').addEventListener('click', event => {
  const trigger = event.currentTarget;
  const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
  trigger.setAttribute('aria-expanded', String(willOpen));
  trigger.setAttribute('aria-label', `${willOpen ? 'Κλείσιμο' : 'Άνοιγμα'} Personal Records`);
  $('#personal-records-sheet').hidden = !willOpen;
});
// SVG has no z-index: the tooltip of an early point paints below later points, so lift the active point last in the tree.
const raiseChartPoint = target => { const point = target.closest?.('.chart-point'); if (point?.parentNode && point.parentNode.lastElementChild !== point) point.parentNode.appendChild(point); };
document.addEventListener('mouseover', event => raiseChartPoint(event.target));
document.addEventListener('focusin', event => raiseChartPoint(event.target));
$('.brand')?.addEventListener('click', event => { event.preventDefault(); showView('home'); });
document.addEventListener('click', event => { const action = event.target.closest('[data-home-action]'); if (action) showView(action.dataset.homeAction); });
$$('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#log-date').addEventListener('change', () => {
  const dateInput = $('#log-date');
  dateInput.max = localDateInputValue();
  if (dateInput.value > dateInput.max) {
    dateInput.value = dateInput.max;
    toast('Η ημερομηνία προπόνησης δεν μπορεί να είναι μεταγενέστερη από τη σημερινή', 'error');
  }
  if (!state.editingSessionId && !state.copyingSessionId) { state.selectedPlanDay = null; return renderScheduledSession(); }
  const date = dateInput.value;
  $('#day-badge').innerHTML = `<span>${dayForDate(date)}</span><small>${formatDate(date)}</small>`;
});
$('#workout-day-select').addEventListener('change', event => { if (state.editingSessionId) return; renderScheduledSession(event.target.value); });
$('#exercise-count').addEventListener('input', renderPlanExercises);
$('#routine-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#routine-name').value.trim();
  if (!name) return;
  const cycleLength = clampCycleLength($('#routine-cycle-length').value);
  const usesWeekdays = $('#routine-form input[name="routine-weekdays"]:checked')?.value === 'true';
  const cycleAnchorDate = usesWeekdays ? mondayFor() : localDateInputValue();
  const routine = { id:id(), name, isActive:false, cycleLength, cycleAnchorDate, usesWeekdays, plan:[] };
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
  resetPlanForm();
  renderRoutines({ centerRoutineId:routine.id });
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
const renderProfileDraft = () => updateProfileDraftState();
$('#profile-form').addEventListener('input', renderProfileDraft);
$('#profile-form').addEventListener('change', renderProfileDraft);
$('#profile-photo-button').addEventListener('click', () => toggleProfileSlip('photo'));
$('#profile-name-button').addEventListener('click', () => {
  toggleProfileSlip('name');
  if (!$('#profile-name-slip').classList.contains('hidden')) $('#profile-name').focus();
});
$('#profile-age-button').addEventListener('click', () => toggleProfileSlip('date'));
$$('.profile-slip-close').forEach(button => button.addEventListener('click', () => setProfileSlip(button.dataset.closeSlip, false)));
$('#profile-photo-grid').addEventListener('click', event => {
  const cell = event.target.closest('.profile-photo-cell');
  if (!cell) return;
  customAvatarData = profileGalleryDraft[Number(cell.dataset.galleryIndex)] || '';
  renderProfileDraft();
});
$('#profile-avatar-upload-button').addEventListener('click', () => $('#profile-avatar-upload').click());
$('#profile-avatar-upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const button = $('#profile-avatar-upload-button');
  button.disabled = true;
  $('#avatar-upload-status').textContent = 'ΕΠΕΞΕΡΓΑΣΙΑ…';
  try {
    customAvatarData = await prepareProfileImage(file);
    profileGalleryDraft = [customAvatarData, ...profileGalleryDraft.filter(image => image !== customAvatarData)].slice(0, PROFILE_GALLERY_LIMIT);
    renderProfileDraft();
    toast('Η εικόνα προστέθηκε στο προφίλ');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    $('#avatar-upload-status').textContent = 'JPG, PNG ή WEBP';
    event.target.value = '';
  }
});
$('#export-history-button').addEventListener('click', () => {
  const button = $('#export-history-button');
  const panel = $('#export-history-print');
  const open = !panel.classList.contains('show');
  panel.classList.toggle('show', open);
  button.setAttribute('aria-expanded', String(open));
  if (!open) return;
  if (!state.sessions.length) {
    $('#export-history-count').textContent = 'ΚΑΤΑΓΕΓΡΑΜΜΕΝΕΣ ΠΡΟΠΟΝΗΣΕΙΣ .. 0';
    $('#export-history-filename').textContent = 'ΑΡΧΕΙΟ: —';
    $('#export-history-stamp').textContent = '—';
    return toast('Δεν υπάρχουν καταγεγραμμένες προπονήσεις για εξαγωγή.', 'error');
  }
  let filename;
  try {
    filename = exportSessionsCsv();
  } catch {
    return toast('Δεν ήταν δυνατή η εξαγωγή του ιστορικού.', 'error');
  }
  $('#export-history-count').textContent = `ΚΑΤΑΓΕΓΡΑΜΜΕΝΕΣ ΠΡΟΠΟΝΗΣΕΙΣ .. ${state.sessions.length}`;
  $('#export-history-filename').textContent = `ΑΡΧΕΙΟ: ${filename}`;
  $('#export-history-stamp').textContent = new Date().toLocaleString(window.LogbookI18n?.getLocale() || 'el-GR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
});
$('#profile-form').addEventListener('submit', event => {
  event.preventDefault();
  const previousUnit = weightUnit();
  const name = $('#profile-name').value.trim();
  if (!name) {
    setProfileSlip('name', true);
    $('#profile-name').focus();
    return toast('Συμπληρώστε όνομα για την κάρτα.', 'error');
  }
  const birthdate = $('#profile-birthdate').value;
  if (!birthdate || profileAge(birthdate) === null) {
    setProfileSlip('date', true);
    $('#profile-birthdate').focus();
    return toast('Συμπληρώστε έγκυρη ημερομηνία γέννησης.', 'error');
  }
  const profile = {
    name,
    birthdate,
    hideAge:$('#profile-hide-age').checked,
    weightUnit:$('#profile-form input[name="profile-weight-unit"]:checked')?.value === 'lbs' ? 'lbs' : 'kg',
    avatar:'custom',
    customImage:customAvatarData,
    imageGallery:profileGalleryDraft
  };
  try {
    store.write('userProfile', profile);
  } catch {
    return toast('Δεν υπάρχει αρκετός χώρος για την εικόνα. Χρειάζεται μικρότερο αρχείο.', 'error');
  }
  state.profile = profile;
  refreshWeightUnitUI(previousUnit);
  setProfileSlip('name', false);
  updateProfileDraftState();
  renderMenuIdentity();
  renderHomeProfileCard();
  renderOverview();
  renderProgressSelectors();
  toast('Το προφίλ αποθηκεύτηκε');
});
document.addEventListener('input', event => {
  if (event.target.closest('[data-set]')) refreshCopySetButton(event.target.closest('[data-exercise]'));
  if (!event.target.matches('.free-set-count')) return;
  const card = event.target.closest('[data-exercise]');
  const rows = card.querySelector('.exercise-sets');
  const values = [...rows.querySelectorAll('[data-set]')].map(row => ({ reps:row.querySelector('.set-reps').value, weightMode:row.querySelector('.weight-mode').value, weight:inputWeightToStored(row.querySelector('.set-weight').value), plates:row.querySelector('.set-plates').value }));
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
  const daySelect = $('#plan-day');
  const day = validCycleDay(routine?.usesWeekdays && routine.cycleLength > 7 ? daySelect.dataset.cycleDay : daySelect.value, routine?.cycleLength);
  if (!routine || !day) return;
  const declaredWeekday = routine.usesWeekdays === false
    ? null
    : routine.cycleLength > 7 ? daySelect.value : weekdayForCycleDay(routine, day);
  const weekdayLimit = routine.cycleLength > 7 ? 2 : 1;
  if (declaredWeekday && weekdayDeclarationCount(routine, declaredWeekday, state.editingDay) >= weekdayLimit) {
    return toast(`Η ${declaredWeekday} έχει ήδη δηλωθεί ${weekdayLimit === 1 ? 'μία φορά' : 'δύο φορές'}`, 'error');
  }
  const workoutName = $('#workout-name').value.trim();
  const sourceDay = state.editingDay;
  const previousItems = sourceDay ? plan.filter(item => itemCycleDay(item, routine) === Number(sourceDay)) : [];
  const exercises = $$('.plan-exercise-fields').map(card => ({ id:card.dataset.planId || id(), cycleDay:day, day:declaredWeekday, workoutName, exercise:card.querySelector('.builder-name').value.trim(), workSets:Number(card.querySelector('.builder-sets').value), cues:card.querySelector('.builder-cues').value.trim(), sets:Array.from({ length:Number(card.querySelector('.builder-sets').value) }, () => ({})) }));
  const savePlan = updateHistory => {
    const nextPlan = [...plan.filter(item => itemCycleDay(item, routine) !== day && itemCycleDay(item, routine) !== Number(sourceDay)), ...exercises];
    routine.plan = nextPlan;
    if (!persistRoutines()) { routine.plan = plan; return; }
    if (updateHistory && !syncPlanChangesToHistory(routine.id, sourceDay, day, previousItems, exercises)) return;
    resetPlanForm(); renderRoutines(); renderPlan(); renderScheduledSession(); renderOverview();
    if ($('#plan-workout-dialog').open) $('#plan-workout-dialog').close();
    toast(updateHistory ? 'Το Πρόγραμμα και το Ιστορικό ενημερώθηκαν ✓' : sourceDay ? 'Ενημερώθηκε μόνο το Πρόγραμμα' : `Η προπόνηση για ${cycleDayLabel(routine, day)} αποθηκεύτηκε`);
  };
  const renamedWorkout = previousItems.length && previousItems[0].workoutName !== workoutName;
  const renamedExercise = previousItems.some(previous => { const next = exercises.find(item => item.id === previous.id); return next && next.exercise !== previous.exercise; });
  const movedDay = Boolean(sourceDay && sourceDay !== day);
  const changedWeekday = Boolean(previousItems.length && previousItems[0].day !== declaredWeekday);
  if (renamedWorkout || renamedExercise || movedDay || changedWeekday) {
    askToChoose('Ενημέρωση παλιού Ιστορικού', 'Άλλαξε όνομα προπόνησης, άσκησης ή ημέρα. Θέλετε οι παλιές καταγραφές να διατηρήσουν τα ιστορικά τους ονόματα ή να ενημερωθούν μαζί με το Πρόγραμμα;', 'Πρόγραμμα + Ιστορικό', 'Μόνο Πρόγραμμα', () => savePlan(true), () => savePlan(false));
  } else savePlan(false);
});

function saveSession() {
  $('#log-date').max = localDateInputValue();
  if ($('#log-date').value > $('#log-date').max) {
    $('#log-date').reportValidity();
    return toast('Η ημερομηνία προπόνησης δεν μπορεί να είναι μεταγενέστερη από τη σημερινή', 'error');
  }
  if (!$('#log-date').checkValidity()) { $('#log-date').reportValidity(); return toast('Επιλογή ημερομηνίας προπόνησης', 'error'); }
  const container = state.mode === 'scheduled' ? $('#scheduled-session') : $('#free-exercises');
  const exercises = collectExercises(container);
  if (!exercises.length) return toast('Χρειάζεται τουλάχιστον μία άσκηση', 'error');
  const invalidField = container.querySelector(':invalid');
  if (invalidField) {
    const deck = container.matches('.exercise-deck') ? container : container.querySelector('.exercise-deck');
    showDeckCardForField(deck, invalidField.closest('[data-exercise]'));
    invalidField.reportValidity();
    return;
  }
  const existing = state.sessions.find(item => String(item.id) === String(state.editingSessionId));
  if (state.editingSessionId && !existing) {
    resetSessionForm();
    return toast('Η προπόνηση έχει διαγραφεί και δεν μπορεί να αποθηκευτεί ξανά.', 'error');
  }
  const copySource = state.sessions.find(item => String(item.id) === String(state.copyingSessionId));
  if (state.copyingSessionId && !copySource) {
    resetSessionForm();
    return toast('Η αρχική προπόνηση έχει διαγραφεί και δεν μπορεί να αντιγραφεί.', 'error');
  }
  const targetDate = $('#log-date').value;
  const dateAlreadyLogged = state.sessions.some(item =>
    item.date === targetDate && String(item.id) !== String(existing?.id)
  );
  if (dateAlreadyLogged) {
    return toast('Υπάρχει ήδη καταγεγραμμένη προπόνηση για αυτή την ημέρα.', 'error');
  }
  const sourceSession = existing || copySource;
  const routine = state.mode === 'scheduled' && sourceSession?.routineId
    ? state.routines.find(item => item.id === sourceSession.routineId) || activeRoutine()
    : activeRoutine();
  const selectedCycleDay = state.mode === 'scheduled' ? validCycleDay(state.selectedPlanDay, routine?.cycleLength) : null;
  const routinePlan = routine?.plan || [];
  const workoutName = state.mode === 'scheduled' ? (sourceSession ? sessionWorkoutName(sourceSession) : routinePlan.find(item => itemCycleDay(item, routine) === selectedCycleDay)?.workoutName || 'Προπόνηση') : 'Ελεύθερη προπόνηση';
  const session = { id:existing?.id || id(), date:targetDate, type:state.mode, routineId:state.mode === 'scheduled' ? (sourceSession?.routineId || routine?.id || null) : null, cycleDay:selectedCycleDay, workoutDay:state.mode === 'scheduled' ? dayForDate(targetDate) : null, workoutName, comments:$('#session-comments').value.trim(), exercises };
  const nextSessions = existing
    ? state.sessions.map(item => String(item.id) === String(existing.id) ? session : item)
    : [session, ...state.sessions];
  if (!persistSessions(nextSessions)) return;
  state.sessions = nextSessions;
  const wasEditing = Boolean(existing);
  const wasCopying = Boolean(copySource);
  resetSessionForm(); renderOverview(); toast(wasEditing ? 'Οι διορθώσεις αποθηκεύτηκαν.' : wasCopying ? 'Η προπόνηση αντιγράφηκε και καταγράφηκε.' : 'Η προπόνηση καταγράφηκε.');
  return true;
}
$('#save-session').addEventListener('click', saveSession);

document.addEventListener('click', event => {
  const historyWeekButton = event.target.closest('[data-history-week-step]');
  if (historyWeekButton) moveHistoryWeek(Number(historyWeekButton.dataset.historyWeekStep));
  const historyDateButton = event.target.closest('[data-history-date]');
  if (historyDateButton) selectHistoryDate(historyDateButton.dataset.historyDate);
  const viewSession = event.target.closest('[data-view-session]');
  if (viewSession && !event.target.closest('.card-actions')) {
    openSessionDialog(viewSession.dataset.viewSession, viewSession);
  }
  const closeSession = event.target.closest('[data-close-session]');
  if (closeSession) {
    closeSessionDialog();
  }
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
      $$('#scheduled-session [data-exercise] .exercise-order').forEach((label, index) => { label.textContent = `ΑΣΚΗΣΗ ${index + 1}`; });
      toast('Η άσκηση αφαιρέθηκε από τη δήλωση');
    });
  }
  if (event.target.matches('.add-extra-set')) { const card = event.target.closest('[data-exercise]'), rows = card.querySelector('.exercise-sets'); rows.insertAdjacentHTML('beforeend', setRows(1, [{}], '', { extra:true, startIndex:rows.children.length })); refreshCopySetButton(card); }
  if (event.target.matches('.remove-set')) {
    const card = event.target.closest('[data-exercise]');
    const row = event.target.closest('[data-set]');
    const rows = card.querySelectorAll('.exercise-sets [data-set]');
    if (rows.length === 1) return toast('Χρειάζεται να υπάρχει τουλάχιστον ένα εργάσιμο σετ', 'error');
    askToRemoveSet(() => {
      row.remove();
      renumberSetRows(card);
      toast('Το εργάσιμο σετ αφαιρέθηκε');
    });
  }
  const selectRoutineButton = event.target.closest('[data-select-routine]');
  const scrollRoutineButton = event.target.closest('[data-routine-scroll]');
  const activateRoutineButton = event.target.closest('[data-activate-routine]');
  const viewRoutineButton = event.target.closest('[data-view-routine]');
  const addRoutineWorkoutButton = event.target.closest('[data-add-routine-workout]');
  const duplicateRoutineButton = event.target.closest('[data-duplicate-routine]');
  const renameRoutineButton = event.target.closest('[data-rename-routine]');
  const deleteRoutineButton = event.target.closest('[data-delete-routine]');
  const cancelRoutineEditButton = event.target.closest('[data-cancel-routine-edit]');
  if (scrollRoutineButton) scrollRoutineTickets(Number(scrollRoutineButton.dataset.routineScroll));
  if (viewRoutineButton) openPlanOverview(viewRoutineButton.dataset.viewRoutine);
  if (addRoutineWorkoutButton) openPlanWorkout(addRoutineWorkoutButton.dataset.addRoutineWorkout);
  if (duplicateRoutineButton) duplicateRoutine(duplicateRoutineButton.dataset.duplicateRoutine);
  if (selectRoutineButton) {
    state.selectedRoutineId = selectRoutineButton.dataset.selectRoutine;
    resetPlanForm();
    const routineCards = [...$('#routine-list').querySelectorAll('.routine-card')];
    const selectedIndex = routineCards.findIndex(card => card.dataset.routineId === state.selectedRoutineId);
    if (selectedIndex >= 0) {
      routineCards.forEach(card => card.classList.toggle('selected-routine', card.dataset.routineId === state.selectedRoutineId));
      updateRoutineCarousel(selectedIndex);
    } else {
      renderRoutines({ centerRoutineId:state.selectedRoutineId });
    }
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
    renderRoutines({ resetCarousel:true });
    renderPlan();
    renderScheduledSession();
    toast(`Το «${activeRoutine().name}» είναι τώρα ενεργό`);
  }
  if (renameRoutineButton) {
    const routine = state.routines.find(item => item.id === renameRoutineButton.dataset.renameRoutine);
    if (routine) {
      state.editingRoutineId = routine.id;
      state.selectedRoutineId = routine.id;
      renderRoutines({ centerRoutineId:routine.id });
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
    if (state.routines.length === 1) return toast('Χρειάζεται να υπάρχει τουλάχιστον ένα πρόγραμμα', 'error');
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
  if (event.target.dataset.copySession) loadSessionForCopy(event.target.dataset.copySession);
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
      if ([state.editingSessionId, state.copyingSessionId].some(activeId => String(activeId) === String(sessionId))) resetSessionForm();
      renderOverview(); toast('Η προπόνηση διαγράφηκε');
    });
  }
});

enableHomeProfileCardDrag();
enableHomeRoutineCardDrag();
$('#log-date').max = localDateInputValue(); $('#log-date').value = localDateInputValue(); refreshDayOptions(); renderPlanExercises(); renderRoutines(); renderPlan(); renderScheduledSession(); renderOverview(); loadProfile(); renderHome();
document.addEventListener('logbook:languagechange', () => {
  // Re-render only date-dependent views. Form fields and in-progress sets stay intact.
  const logDate = $('#log-date').value;
  if (logDate) $('#day-badge').innerHTML = `<span>${dayForDate(logDate)}</span><small>${formatDate(logDate)}</small>`;
  renderOverview();
  renderProgressChart();
  renderHome();
});
$$('.info-stamp').forEach(button => {
  button.addEventListener('click', event => {
    event.stopPropagation();
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const nowHidden = panel.classList.toggle('hidden');
    button.setAttribute('aria-expanded', String(!nowHidden));
  });
});
document.addEventListener('click', event => {
  $$('.info-panel:not(.hidden)').forEach(panel => {
    if (panel.contains(event.target)) return;
    panel.classList.add('hidden');
    document.querySelector(`[aria-controls="${panel.id}"]`)?.setAttribute('aria-expanded', 'false');
  });
});
window.LogbookI18n?.translate(document);
if (location.hash) showView(location.hash.slice(1));
