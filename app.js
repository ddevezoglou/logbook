const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const state = { logs: store.read('trainingLogs'), plan: store.read('trainingPlan') };
const $ = (selector) => document.querySelector(selector);
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function renderSets() {
  const count = Math.max(1, Math.min(20, Number($('#set-count').value) || 1));
  const previous = [...document.querySelectorAll('.set-row')].map(row => ({ reps: row.querySelector('.reps').value, weight: row.querySelector('.weight').value }));
  $('#sets-container').innerHTML = Array.from({ length: count }, (_, i) => `
    <div class="set-row"><span class="set-number">${String(i + 1).padStart(2, '0')}</span>
      <input class="reps" type="number" min="0" placeholder="0" value="${previous[i]?.reps || ''}" aria-label="Επαναλήψεις σετ ${i + 1}" required>
      <input class="weight" type="number" min="0" step="0.25" placeholder="0" value="${previous[i]?.weight || ''}" aria-label="Βάρος σετ ${i + 1}" required>
    </div>`).join('');
}

function renderHistory() {
  $('#log-count').textContent = `${state.logs.length} ${state.logs.length === 1 ? 'εγγραφή' : 'εγγραφές'}`;
  $('#history-list').innerHTML = state.logs.length ? state.logs.map(log => `
    <article class="entry"><div class="entry-top"><h3>${esc(log.exercise)}</h3><time>${new Date(log.date + 'T12:00:00').toLocaleDateString('el-GR')}</time></div>
      <div class="set-summary">${log.sets.map(s => `<span>${esc(s.reps)} × ${esc(s.weight)} kg</span>`).join('')}</div>
      ${log.comments ? `<p>${esc(log.comments)}</p>` : ''}<button class="delete" data-delete-log="${log.id}" aria-label="Διαγραφή">×</button></article>`).join('') : '<div class="empty">Η πρώτη σου καταγραφή θα εμφανιστεί εδώ.</div>';
}

const dayOrder = ['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
function renderPlan() {
  const sorted = [...state.plan].sort((a,b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
  $('#plan-list').innerHTML = sorted.length ? sorted.map(item => `
    <article class="entry"><div class="entry-top"><h3>${esc(item.exercise)}</h3><span class="day">${esc(item.day)}</span></div>
      <div class="set-summary"><span>${esc(item.sets)} εργάσιμα σετ</span></div>${item.cues ? `<p><strong>CUE:</strong> ${esc(item.cues)}</p>` : ''}
      <button class="delete" data-delete-plan="${item.id}" aria-label="Διαγραφή">×</button></article>`).join('') : '<div class="empty">Το εβδομαδιαίο σου πρόγραμμα είναι ακόμη κενό.</div>';
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-button,.view').forEach(el => el.classList.remove('active'));
  button.classList.add('active'); $(`#${button.dataset.view}-view`).classList.add('active');
}));

$('#set-count').addEventListener('input', renderSets);
$('#log-form').addEventListener('submit', event => {
  event.preventDefault();
  state.logs.unshift({ id: crypto.randomUUID(), date: $('#log-date').value, exercise: $('#exercise').value.trim(), comments: $('#comments').value.trim(), sets: [...document.querySelectorAll('.set-row')].map(row => ({ reps: Number(row.querySelector('.reps').value), weight: Number(row.querySelector('.weight').value) })) });
  store.write('trainingLogs', state.logs); event.target.reset(); $('#log-date').valueAsDate = new Date(); $('#set-count').value = 3; renderSets(); renderHistory(); toast('Η καταγραφή αποθηκεύτηκε');
});

$('#plan-form').addEventListener('submit', event => {
  event.preventDefault(); state.plan.push({ id: crypto.randomUUID(), day: $('#plan-day').value, exercise: $('#plan-exercise').value.trim(), sets: Number($('#plan-sets').value), cues: $('#plan-cues').value.trim() });
  store.write('trainingPlan', state.plan); event.target.reset(); $('#plan-sets').value = 3; renderPlan(); toast('Η άσκηση προστέθηκε στο πρόγραμμα');
});

document.addEventListener('click', event => {
  if (event.target.dataset.deleteLog) { state.logs = state.logs.filter(x => x.id !== event.target.dataset.deleteLog); store.write('trainingLogs', state.logs); renderHistory(); }
  if (event.target.dataset.deletePlan) { state.plan = state.plan.filter(x => x.id !== event.target.dataset.deletePlan); store.write('trainingPlan', state.plan); renderPlan(); }
});

$('#log-date').valueAsDate = new Date(); renderSets(); renderHistory(); renderPlan();
