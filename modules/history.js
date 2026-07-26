import { escapeHtml } from './ui.js';

export function buildSessionCardMarkup({
  session,
  sessionNumber,
  workoutName = 'Προπόνηση',
  dayLabel = '',
  formattedDate = 'Χωρίς ημερομηνία',
} = {}) {
  if (!session) return '';
  const esc = escapeHtml;
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  const setCount = exercises.reduce((sum, exercise) => sum + (Array.isArray(exercise.sets) ? exercise.sets.length : 0), 0);
  const id = esc(session.id ?? '');
  const date = esc(session.date || '');
  const name = esc(workoutName);
  const type = session.type === 'scheduled' ? 'ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ' : 'ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ';

  return `<article class="session-card" data-session-id="${id}" data-session-date="${date}"><div class="session-summary" data-view-session="${id}"><div class="card-date"><span>${esc(dayLabel)}</span><strong>${esc(formattedDate)}</strong><small>SESSION No ${Number(sessionNumber) || 0}</small></div><div class="card-body"><div class="card-stats"><span>${exercises.length} ΑΣΚΗΣΕΙΣ</span><span>${setCount} WORKING SETS</span><span class="card-stamp" aria-hidden="true">LOGGED</span><span class="card-type">${type}</span></div><div class="card-title-row"><h3><button class="session-open" data-view-session="${id}" type="button" aria-haspopup="dialog" aria-controls="session-detail-dialog" aria-label="Άνοιγμα προπόνησης ${name}"><span data-i18n-user>${name}</span></button></h3></div><p class="card-exercises" data-i18n-user>${exercises.map(exercise => esc(exercise?.exercise || '')).join(' · ')}</p>${session.comments ? `<p class="card-comment" data-i18n-user>${esc(session.comments)}</p>` : ''}</div><div class="card-actions"><label class="session-select"><input type="checkbox" data-select-session="${id}"><span>ΕΠΙΛΟΓΗ</span></label><div class="card-selection-actions"><button class="card-edit" data-edit-session="${id}" type="button">ΕΠΕΞΕΡΓΑΣΙΑ</button><button class="card-copy" data-copy-session="${id}" type="button">ΑΝΤΙΓΡΑΦΗ</button><button class="card-delete" data-delete-session="${id}" type="button">ΔΙΑΓΡΑΦΗ</button></div></div></div></article>`;
}

export function buildHistoryMarkup({
  sessions = [],
  totalCount = sessions.length,
  pageSize = 30,
  getWorkoutName = () => 'Προπόνηση',
  getDayLabel = () => '',
  formatDate = () => 'Χωρίς ημερομηνία',
} = {}) {
  if (!totalCount) {
    return '<div class="empty"><span>Ολοκληρώστε την πρώτη προπόνηση και αρχίστε να χτίζετε το αρχείο σας.</span></div>';
  }
  const cards = sessions.map((session, index) => buildSessionCardMarkup({
    session,
    sessionNumber:totalCount - index,
    workoutName:getWorkoutName(session),
    dayLabel:getDayLabel(session.date),
    formattedDate:formatDate(session.date),
  })).join('');
  const remaining = Math.max(0, totalCount - sessions.length);
  const loadMore = remaining
    ? `<button class="history-load-more" type="button" data-load-more-history>ΕΜΦΑΝΙΣΗ ΑΚΟΜΗ ${Math.min(pageSize, remaining)} · ΑΠΟΜΕΝΟΥΝ ${remaining}</button>`
    : '';
  return `${cards}${loadMore}`;
}
