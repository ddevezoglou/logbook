import * as SessionModel from './sessions.js';
import { escapeHtml } from './ui.js';

export function setRows(count, values = [], prefix = '', { extra = false, startIndex = 0, unit = 'kg' } = {}) {
  const symbol = SessionModel.weightUnitSymbol(unit);
  const unitName = SessionModel.weightUnitName(unit);
  return Array.from({ length:count }, (_, index) => {
    const value = values[index] || {};
    const mode = SessionModel.safeWeightMode(value.weightMode) || SessionModel.inferredWeightMode(value);
    const setPosition = startIndex + index + 1;
    const reps = SessionModel.numericInputValue(value.reps, { integer:true });
    const plates = SessionModel.numericInputValue(value.plates, { integer:true });
    const displayedWeight = SessionModel.numericInputValue(SessionModel.storedWeightToDisplay(value.weight, unit));
    const optionsMarkup = SessionModel.WEIGHT_MODES
      .map(option => `<option value="${option}" ${mode === option ? 'selected' : ''}>${SessionModel.weightModeSourceLabel(option, unit)}</option>`)
      .join('');
    return `<div class="set-row ${extra ? 'extra-set' : ''}" data-set data-weight-mode="${mode}" ${extra ? 'data-extra-set' : ''}><span class="set-number">${String(setPosition).padStart(2,'0')}</span>
      <label class="set-control set-reps-control"><span class="set-control-label">Επαναλήψεις</span><input class="${prefix}reps set-reps" type="number" min="0" inputmode="numeric" placeholder="0" value="${reps}" aria-label="Επαναλήψεις σετ ${setPosition}" required></label>
      <span class="set-times" aria-hidden="true">×</span>
      <div class="set-load-entry"><label class="set-control set-mode-control"><span class="set-control-label">Μέτρηση</span><select class="weight-mode" aria-label="Τρόπος καταγραφής βάρους για το σετ ${setPosition}">${optionsMarkup}</select></label>
        <div class="weight-entry"><label class="set-control set-plates-control"><span class="set-control-label">Πλάκες</span><input class="${prefix}plates set-plates" type="number" min="0" step="1" inputmode="numeric" placeholder="πλάκες" value="${plates}" aria-label="Πλάκες σετ ${setPosition}" ${mode === 'plates' || mode === 'mixed' ? 'required' : ''}></label><label class="set-control set-weight-control"><span class="set-control-label">Βάρος (${symbol})</span><input class="${prefix}weight set-weight" type="number" min="0" step="any" inputmode="decimal" placeholder="${symbol}" value="${displayedWeight}" aria-label="${unitName} σετ ${setPosition}" ${mode === 'kg' || mode === 'mixed' || mode === 'bodyweight_extra' ? 'required' : ''}></label></div>
      </div><button class="remove-set${extra ? ' remove-extra-set' : ''}" type="button" aria-label="Αφαίρεση εργάσιμου σετ">−</button></div>`;
  }).join('');
}

export function exerciseCard(exercise = {}, {
  free = false,
  exerciseIndex = 0,
  custom = false,
  unit = 'kg',
  generatedId = '',
  library = [],
} = {}) {
  const esc = escapeHtml;
  const sets = Array.isArray(exercise.sets) && exercise.sets.length ? exercise.sets : [{}, {}, {}];
  return `<article class="workout-exercise" data-exercise data-exercise-id="${esc(exercise.exerciseId || '')}" data-id="${esc(exercise.id || generatedId)}" data-plan-exercise-id="${esc(exercise.planExerciseId || exercise.id || '')}" ${custom ? 'data-custom-exercise="true"' : ''}>
    <span class="exercise-tape" aria-hidden="true"></span>
    <div class="exercise-title">${free ? `<input class="exercise-name" data-i18n-user type="text" value="${esc(exercise.exercise || '')}" placeholder="Όνομα άσκησης" required>` : `<div><span class="exercise-order">ΑΣΚΗΣΗ ${exerciseIndex + 1}</span><h3 data-i18n-user>${esc(exercise.exercise)}</h3></div>`}
      ${free ? '<button class="remove-exercise" type="button" aria-label="Αφαίρεση">×</button>' : `<div class="exercise-title-actions"><span class="planned-tag">${sets.length} σετ</span><button class="remove-planned-exercise" type="button" aria-label="Διαγραφή άσκησης">×</button></div>`}</div>
    ${free && library.length ? `<label class="full-field">Από τη βιβλιοθήκη<select class="session-library-exercise"><option value="">Επιλογή άσκησης</option>${library.map(entry => `<option data-i18n-user value="${esc(entry.id)}" ${entry.id === exercise.exerciseId ? 'selected' : ''}>${esc(entry.label || entry.name)}</option>`).join('')}</select></label>` : ''}
    ${exercise.cues ? `<div class="cue-banner"><span>CUES</span><b data-i18n-user>${esc(exercise.cues)}</b></div>` : ''}
    ${free ? `<label class="free-set-selector">Αριθμός σετ<input class="free-set-count" type="number" min="1" max="20" value="${sets.length}"></label>` : ''}
    <div class="sets-header"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span></span><span>ΒΑΡΟΣ / ΜΕΤΡΗΣΗ</span><span></span></div>
    <div class="exercise-sets">${setRows(sets.length, sets, '', { unit })}</div>
    <div class="set-actions"><button class="mini-button copy-first-set hidden" type="button" aria-label="Αντιγραφή του πρώτου σετ στα υπόλοιπα">ΑΝΤΙΓΡΑΦΗ</button>${free ? '' : `<button class="mini-button add-extra-set" type="button">＋ Extra σετ</button>`}</div>
    <label class="full-field">Σχόλια άσκησης<textarea class="exercise-comments" data-i18n-user rows="2" placeholder="Τεχνική, αίσθηση, RPE...">${esc(exercise.comments || '')}</textarea></label>
    <input class="exercise-source-name" type="hidden" value="${esc(exercise.exercise || '')}">
  </article>`;
}

export function sessionPage({
  session,
  sessionNumber = 0,
  workoutName = 'Προπόνηση',
  dayLabel = 'Χωρίς ημέρα',
  formattedDate = '',
  formatLoad = () => '',
} = {}) {
  if (!session) return '';
  const esc = escapeHtml;
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  return `<section class="session-page" aria-label="Η σελίδα της προπόνησης">
    <div class="page-binding" aria-hidden="true"><i></i><i></i><i></i></div>
    <header class="session-page-head">
      <strong>SESSION No ${Number(sessionNumber) || 0}</strong>
      <time datetime="${esc(session.date || '')}">${esc(dayLabel)} · ${esc(formattedDate)}</time>
    </header>
    <div class="session-page-title"><div><h4 data-i18n-user>${esc(workoutName)}</h4></div><span aria-hidden="true">LOGGED</span></div>
    ${session.comments ? `<p class="page-session-note" data-i18n-user><b>ΣΗΜΕΙΩΣΕΙΣ</b>${esc(session.comments)}</p>` : ''}
    <div class="page-exercises">${exercises.map((exercise, exerciseIndex) => {
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      return `<article class="page-exercise">
        <div class="page-exercise-title"><span>${String(exerciseIndex + 1).padStart(2, '0')}</span><div><h5 data-i18n-user>${esc(exercise.exercise || 'Άσκηση')}</h5>${exercise.comments ? `<p data-i18n-user>${esc(exercise.comments)}</p>` : ''}</div></div>
        <div class="page-set-table"><div class="page-set-head"><span>ΣΕΤ</span><span>ΕΠΑΝΑΛΗΨΕΙΣ</span><span>ΒΑΡΟΣ</span></div>${sets.length ? sets.map((set, setIndex) => `<div class="page-set-row"><strong>${String(setIndex + 1).padStart(2, '0')}</strong><span>${Number(set.reps) || 0}</span><span>${esc(formatLoad(set))}</span></div>`).join('') : '<p class="page-no-sets">Δεν καταγράφηκαν σετ.</p>'}</div>
      </article>`;
    }).join('')}</div>
    <footer><button type="button" data-close-session="${esc(session.id)}">ΚΛΕΙΣΙΜΟ ΣΕΛΙΔΑΣ ↑</button></footer>
  </section>`;
}
