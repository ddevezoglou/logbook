// Η ξενάγηση του ( i ). Αντί για πέντε γραμμές κείμενο, ένα δάχτυλο πατά πάνω σε
// μια μινιατούρα της σελίδας, τα πεδία γράφονται μόνα τους και η κάρτα-οδηγός
// λέει τι συμβαίνει. Τρεις κανόνες κρατούν κάθε απόφαση εδώ:
//
// 1. Τίποτα αληθινό. Η μινιατούρα δεν έχει κανένα <input>, κανένα κλειδί
//    αποθήκευσης και κανένα event της εφαρμογής: είναι <span> που γράφει ένα
//    σενάριο. Πρόχειρο, sessions και συγχρονισμός δεν βλέπουν τίποτα.
// 2. Το κείμενο της οδηγίας είναι το υπάρχον. Η λεζάντα κάθε βήματος διαβάζεται
//    από το ήδη μεταφρασμένο <ol> του .info-panel, που μένει στο DOM.
// 3. Ούτε ένα inline style στο markup (CSP style-src 'self'). Θέσεις και κλίμακα
//    περνούν από το element.style, όλα τα υπόλοιπα είναι κλάσεις.

const LANGUAGES = ['el', 'en', 'fr', 'de'];
const SCENE_WIDTH = 300;

// [el, en, fr, de]. Τα δεδομένα-δείγματα μεταφράζονται κι αυτά, αλλιώς ένας
// Γερμανός χρήστης θα έβλεπε ελληνικές ασκήσεις μέσα στην ξενάγηση.
const TEXT = {
  'ui.prev':['Προηγούμενο βήμα', 'Previous step', 'Étape précédente', 'Vorheriger Schritt'],
  'ui.again':['Ξανά', 'Replay', 'Rejouer', 'Wiederholen'],
  'ui.next':['Επόμενο βήμα', 'Next step', 'Étape suivante', 'Nächster Schritt'],
  'ui.done':['Τέλος', 'Done', 'Terminé', 'Fertig'],
  'ui.close':['Κλείσιμο', 'Close', 'Fermer', 'Schließen'],
  'log.t1':['Ημερομηνία και τύπος', 'Date and type', 'Date et type', 'Datum und Art'],
  'log.t2':['Σύρετε τις ασκήσεις', 'Swipe through exercises', 'Faites défiler les exercices', 'Übungen wischen'],
  'log.t3':['Επαναλήψεις και βάρος', 'Reps and weight', 'Répétitions et charge', 'Wiederholungen und Gewicht'],
  'log.t4':['Σετ και σχόλια', 'Sets and notes', 'Séries et commentaires', 'Sätze und Notizen'],
  'log.t5':['Ολοκλήρωση', 'Finish', 'Terminer', 'Abschließen'],
  'plan.t1':['Πρώτα η βιβλιοθήκη', 'Library first', 'La bibliothèque d’abord', 'Zuerst die Bibliothek'],
  'plan.t2':['Μολύβι, × και σημείωση', 'Pencil, × and note', 'Crayon, × et note', 'Stift, × und Notiz'],
  'plan.t3':['Νέο πρόγραμμα', 'New routine', 'Nouveau programme', 'Neuer Plan'],
  'plan.t4':['Ημέρες και αστέρι', 'Days and star', 'Jours et étoile', 'Tage und Stern'],
  'plan.t5':['Το ιστορικό μένει', 'History stays', 'L’historique reste', 'Der Verlauf bleibt'],
  'progress.t1':['Άσκηση και σετ', 'Exercise and set', 'Exercice et série', 'Übung und Satz'],
  'progress.t2':['Κιλά και επαναλήψεις', 'Weight and reps', 'Charge et répétitions', 'Gewicht und Wiederholungen'],
  'progress.t3':['Σύρετε το γράφημα', 'Drag the chart', 'Faites glisser le graphique', 'Diagramm ziehen'],
  'progress.t4':['Ο έλεγχος', 'The check', 'Le contrôle', 'Die Prüfung'],
  'progress.t5':['Personal Records', 'Personal Records', 'Personal Records', 'Personal Records'],
  'profile.t1':['Πατήστε την κάρτα', 'Tap the card', 'Touchez la carte', 'Karte antippen'],
  'profile.t2':['Φωτογραφίες', 'Photos', 'Photos', 'Fotos'],
  'profile.t3':['Ηλικία', 'Age', 'Âge', 'Alter'],
  'profile.t4':['Μονάδα μέτρησης', 'Measurement unit', 'Unité de mesure', 'Maßeinheit'],
  'profile.t5':['Εξαγωγή και αποθήκευση', 'Export and save', 'Exporter et enregistrer', 'Exportieren und speichern'],

  'date':['Ημερομηνία', 'Date', 'Date', 'Datum'],
  'scheduled':['Από το πρόγραμμα', 'From routine', 'Depuis le programme', 'Aus dem Plan'],
  'free':['Ελεύθερη', 'Free', 'Libre', 'Frei'],
  'day-workout':['Προπόνηση ημέρας', 'Day’s workout', 'Séance du jour', 'Training des Tages'],
  'choose':['Επιλογή', 'Select', 'Choisir', 'Auswählen'],
  'day':['Ημέρα {n}', 'Day {n}', 'Jour {n}', 'Tag {n}'],
  'exercise-n':['ΑΣΚΗΣΗ {n}', 'EXERCISE {n}', 'EXERCICE {n}', 'ÜBUNG {n}'],
  'exercise-of':['ΑΣΚΗΣΗ {n} / 3', 'EXERCISE {n} / 3', 'EXERCICE {n} / 3', 'ÜBUNG {n} / 3'],
  'bench':['Πιέσεις πάγκου', 'Bench press', 'Développé couché', 'Bankdrücken'],
  'ohp':['Στρατιωτικές πιέσεις', 'Overhead press', 'Développé militaire', 'Schulterdrücken'],
  'dips':['Βυθίσεις', 'Dips', 'Dips', 'Dips'],
  'pullups':['Έλξεις', 'Pull-ups', 'Tractions', 'Klimmzüge'],
  'sets-3':['3 σετ', '3 sets', '3 séries', '3 Sätze'],
  'h-set':['ΣΕΤ', 'SET', 'SÉRIE', 'SATZ'],
  'h-reps':['ΕΠΑΝ.', 'REPS', 'RÉP.', 'WDH.'],
  'h-mode':['ΜΕΤΡΗΣΗ', 'MODE', 'MESURE', 'ART'],
  'h-weight':['ΒΑΡΟΣ', 'WEIGHT', 'CHARGE', 'GEWICHT'],
  'kg':['Κιλά', 'Kilos', 'Kilos', 'Kilo'],
  'plates':['Πλάκες', 'Plates', 'Disques', 'Scheiben'],
  'mixed':['Συνδυασμός', 'Combined', 'Combiné', 'Kombiniert'],
  'bodyweight':['Bodyweight', 'Bodyweight', 'Poids du corps', 'Körpergewicht'],
  'copy-first':['ΑΝΤΙΓΡΑΦΗ', 'COPY', 'COPIER', 'KOPIEREN'],
  'extra':['＋ Extra σετ', '＋ Extra set', '＋ Série extra', '＋ Extrasatz'],
  'exercise-notes':['Σχόλια άσκησης', 'Exercise notes', 'Commentaires de l’exercice', 'Übungsnotizen'],
  'notes-hint':['Τεχνική, αίσθηση, RPE...', 'Technique, feel, RPE...', 'Technique, sensations, RPE...', 'Technik, Gefühl, RPE...'],
  'note-demo':['Καλή αίσθηση, RPE 8', 'Felt good, RPE 8', 'Bonnes sensations, RPE 8', 'Gutes Gefühl, RPE 8'],
  'finish':['ΟΛΟΚΛΗΡΩΣΗ ΠΡΟΠΟΝΗΣΗΣ', 'FINISH WORKOUT', 'TERMINER LA SÉANCE', 'TRAINING ABSCHLIESSEN'],
  'logged':['Η προπόνηση καταγράφηκε', 'Workout logged', 'Séance enregistrée', 'Training erfasst'],
  'history':['Ιστορικό', 'History', 'Historique', 'Verlauf'],
  'history-meta':['3 ασκήσεις · 9 σετ', '3 exercises · 9 sets', '3 exercices · 9 séries', '3 Übungen · 9 Sätze'],
  'select':['ΕΠΙΛΟΓΗ', 'SELECT', 'SÉLECTION', 'AUSWAHL'],
  'edit':['Επεξεργασία', 'Edit', 'Modifier', 'Bearbeiten'],
  'copy':['Αντιγραφή', 'Copy', 'Copier', 'Kopieren'],

  'my-exercises':['Οι ασκήσεις μου', 'My exercises', 'Mes exercices', 'Meine Übungen'],
  'my-routines':['Τα προγράμματά μου', 'My routines', 'Mes programmes', 'Meine Pläne'],
  'new-exercise':['Νέα άσκηση', 'New exercise', 'Nouvel exercice', 'Neue Übung'],
  'new-routine':['Νέο πρόγραμμα', 'New routine', 'Nouveau programme', 'Neuer Plan'],
  'exercise-name':['Όνομα άσκησης', 'Exercise name', 'Nom de l’exercice', 'Übungsname'],
  'cues':['Cues', 'Cues', 'Consignes', 'Hinweise'],
  'cues-hint':['π.χ. ώμοι πίσω', 'e.g. shoulders back', 'ex. épaules en arrière', 'z. B. Schultern zurück'],
  'save-exercise':['Αποθήκευση άσκησης', 'Save exercise', 'Enregistrer l’exercice', 'Übung speichern'],
  'routine-name':['Όνομα προγράμματος', 'Routine name', 'Nom du programme', 'Planname'],
  'routine-hint':['π.χ. Push Pull Legs', 'e.g. Push Pull Legs', 'ex. Push Pull Legs', 'z. B. Push Pull Legs'],
  'length':['Διάρκεια (σε ημέρες)', 'Length (days)', 'Durée (jours)', 'Dauer (Tage)'],
  'weekdays':['Δήλωση ημερών', 'Set weekdays', 'Jours de la semaine', 'Wochentage festlegen'],
  'no':['Όχι', 'No', 'Non', 'Nein'],
  'yes':['Ναι', 'Yes', 'Oui', 'Ja'],
  'weekday-letters':['Δ,Τ,Τ,Π,Π,Σ,Κ', 'M,T,W,T,F,S,S', 'L,M,M,J,V,S,D', 'M,D,M,D,F,S,S'],
  'create':['＋ Δημιουργία', '＋ Create', '＋ Créer', '＋ Erstellen'],
  'length-n':['ΔΙΑΡΚΕΙΑ: {n} ΗΜΕΡΕΣ', 'LENGTH: {n} DAYS', 'DURÉE : {n} JOURS', 'DAUER: {n} TAGE'],
  'in-use':['ΣΕ ΙΣΧΥ', 'IN USE', 'EN COURS', 'AKTIV'],
  'day-n':['ΗΜΕΡΑ {n}', 'DAY {n}', 'JOUR {n}', 'TAG {n}'],
  'barbell':['μπάρα', 'barbell', 'barre', 'Langhantel'],
  'overhand':['πρηνής λαβή', 'overhand grip', 'prise pronation', 'Obergriff'],
  'underhand':['υπτία λαβή', 'underhand grip', 'prise supination', 'Untergriff'],
  'lean':['κορμός μπροστά', 'lean forward', 'buste penché', 'Oberkörper vor'],
  'overhand-wide':['πρηνής, φαρδιά λαβή', 'overhand, wide grip', 'pronation, prise large', 'Obergriff, breit'],
  'smith':['Πιέσεις Smith', 'Smith press', 'Développé Smith', 'Smith-Drücken'],
  'delete-exercise':['Διαγραφή άσκησης;', 'Delete exercise?', 'Supprimer l’exercice ?', 'Übung löschen?'],
  'used-in':['χρησιμοποιείται σε:', 'is used in:', 'est utilisé dans :', 'wird verwendet in:'],
  'cancel':['Ακύρωση', 'Cancel', 'Annuler', 'Abbrechen'],
  'delete':['Διαγραφή', 'Delete', 'Supprimer', 'Löschen'],
  'history-tag':['ΙΣΤΟΡΙΚΟ', 'HISTORY', 'HISTORIQUE', 'VERLAUF'],
  'sets-line':['3 σετ · 10 × 60 kg', '3 sets · 10 × 60 kg', '3 séries · 10 × 60 kg', '3 Sätze · 10 × 60 kg'],

  'exercise':['Άσκηση', 'Exercise', 'Exercice', 'Übung'],
  'set':['Σετ', 'Set', 'Série', 'Satz'],
  'set-n':['Σετ {n}', 'Set {n}', 'Série {n}', 'Satz {n}'],
  'course':['ΠΟΡΕΙΑ', 'PROGRESS', 'ÉVOLUTION', 'VERLAUF'],
  'weight':['Κιλά', 'Weight', 'Charge', 'Gewicht'],
  'reps':['Επαναλήψεις', 'Reps', 'Répétitions', 'Wiederholungen'],
  'chart-empty':['Επιλέξτε άσκηση και σετ', 'Choose an exercise and set', 'Choisissez un exercice et une série', 'Übung und Satz wählen'],
  'older':['← σύρετε για παλαιότερες', '← drag for older', '← glissez pour les plus anciennes', '← ziehen für ältere'],
  'audit':['Έλεγχος · 2 εκτός σύγκρισης', 'Check · 2 not compared', 'Contrôle · 2 hors comparaison', 'Prüfung · 2 nicht verglichen'],
  'other-mode':['άλλη μέτρηση', 'different mode', 'autre mesure', 'andere Messart'],
  'best-sets':['ΚΑΛΥΤΕΡΑ ΣΕΤ', 'BEST SETS', 'MEILLEURES SÉRIES', 'BESTE SÄTZE'],

  'new-profile':['ΝΕΟ ΠΡΟΦΙΛ', 'NEW PROFILE', 'NOUVEAU PROFIL', 'NEUES PROFIL'],
  'change-photo':['ΑΛΛΑΓΗ ΦΩΤΟΓΡΑΦΙΑΣ', 'CHANGE PHOTO', 'CHANGER LA PHOTO', 'FOTO ÄNDERN'],
  'name-placeholder':['ΟΝΟΜΑ', 'NAME', 'NOM', 'NAME'],
  'age':['ΗΛΙΚΙΑ', 'AGE', 'ÂGE', 'ALTER'],
  'name':['Όνομα', 'Name', 'Nom', 'Name'],
  'your-name':['Το όνομά σας', 'Your name', 'Votre nom', 'Ihr Name'],
  'demo-name':['ΑΛΕΞ', 'ALEX', 'ALEX', 'ALEX'],
  'photos':['Φωτογραφίες · έως 6', 'Photos · up to 6', 'Photos · 6 max', 'Fotos · bis zu 6'],
  'birth':['Ημερομηνία γέννησης', 'Date of birth', 'Date de naissance', 'Geburtsdatum'],
  'show-age':['Εμφάνιση ηλικίας στην κάρτα', 'Show age on the card', 'Afficher l’âge sur la carte', 'Alter auf der Karte zeigen'],
  'unit':['Μονάδα μέτρησης', 'Measurement unit', 'Unité de mesure', 'Maßeinheit'],
  'kilograms':['Κιλά (kg)', 'Kilograms (kg)', 'Kilogrammes (kg)', 'Kilogramm (kg)'],
  'pounds':['Λίβρες (lb)', 'Pounds (lb)', 'Livres (lb)', 'Pfund (lb)'],
  'stored':['αποθηκεύεται ως 60 kg', 'stored as 60 kg', 'enregistré en 60 kg', 'gespeichert als 60 kg'],
  'export':['⬇ ΕΞΑΓΩΓΗ ΙΣΤΟΡΙΚΟΥ', '⬇ EXPORT HISTORY', '⬇ EXPORTER L’HISTORIQUE', '⬇ VERLAUF EXPORTIEREN'],
  'workouts-48':['48 προπονήσεις', '48 workouts', '48 séances', '48 Trainings'],
  'save':['ΑΠΟΘΗΚΕΥΣΗ', 'SAVE', 'ENREGISTRER', 'SPEICHERN'],
  'profile-saved':['Το προφίλ αποθηκεύτηκε', 'Profile saved', 'Profil enregistré', 'Profil gespeichert'],
};

export const GUIDE_TEXT = TEXT;

const CANCEL = Symbol('guide-tour-cancel');
const pad = n => String(n).padStart(2, '0');
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function within(element, root, prop) {
  let value = 0;
  while (element && element !== root) { value += element[prop] || 0; element = element.offsetParent; }
  return value;
}

/* ============================ Κινητήρας ============================ */

// Ένα Ctx ανά εκτέλεση. Όταν ξεκινήσει νέα εκτέλεση, κάθε μέθοδος της παλιάς
// πετάει CANCEL στο επόμενο await, ώστε δύο σενάρια να μη γράφουν ποτέ μαζί.
class Ctx {
  constructor(player, runId) {
    this.p = player; this.runId = runId; this.fast = true; this.mark = false; this.lastMark = null;
  }
  get root() { return this.p.scene; }
  alive() { if (this.runId !== this.p.runId) throw CANCEL; }
  q(target) {
    if (typeof target !== 'string') return target;
    const node = this.p.scene.querySelector(target) || this.p.stage.querySelector(target);
    if (!node) throw new Error(`guide-tour: missing ${target}`);
    return node;
  }
  marked(node) { if (this.mark) { node.classList.add('gt-mark'); this.lastMark = node; } }
  async wait(ms) {
    this.alive();
    if (this.fast) return;
    let left = ms;
    while (left > 0) {
      const step = Math.min(left, 30);
      await this.p.sleep(step);
      this.alive();
      if (!this.p.paused) { left -= step; this.p.tick(step); }
    }
  }
  async cam(target, offset = 14) {
    this.alive();
    const p = this.p;
    let y = 0;
    if (target != null) y = within(this.q(target), p.scene, 'offsetTop') - offset;
    const max = p.scene.offsetHeight - p.view.clientHeight / p.k;
    const next = Math.round(Math.max(0, Math.min(y, Math.max(0, max))));
    const moved = next !== p.y;
    p.y = next; p.applyCam();
    if (!moved || this.fast) return;
    // Ο προβολέας μένει κολλημένος στο στοιχείο όσο κυλά η σελίδα.
    const spotTarget = p.spotTarget;
    if (spotTarget?.isConnected && p.spot.classList.contains('is-on')) {
      p.spot.classList.add('is-tracking');
      const start = p.now();
      while (p.now() - start < 480) { await p.sleep(16); this.alive(); if (spotTarget.isConnected) p.spotOn(spotTarget, false); }
      p.spot.classList.remove('is-tracking');
    } else await this.wait(480);
  }
  pos(node, ax = .5, ay = .5) {
    const rect = node.getBoundingClientRect(), stage = this.p.stage.getBoundingClientRect();
    return [rect.left - stage.left + rect.width * ax, rect.top - stage.top + rect.height * ay];
  }
  async move(target, ax, ay) {
    this.alive();
    if (this.fast) return;
    const node = this.q(target), finger = this.p.finger;
    const [x, y] = this.pos(node, ax, ay);
    const first = !finger.classList.contains('is-on');
    if (first) {
      finger.classList.add('is-jumping');
      finger.style.transform = `translate(${x}px,${y + 46}px)`;
      void finger.offsetWidth;
      finger.classList.remove('is-jumping');
      finger.classList.add('is-on');
    }
    finger.style.transform = `translate(${x}px,${y}px)`;
    this.p.spotOn(node);
    await this.wait(first ? 430 : 520);
  }
  async tap(target, ax, ay) {
    const node = this.q(target);
    if (this.fast) { this.marked(node); return; }
    await this.move(node, ax, ay);
    const finger = this.p.finger;
    finger.classList.add('is-pressing'); node.classList.add('gt-pressed'); this.ripple(node, ax, ay);
    await this.wait(170);
    finger.classList.remove('is-pressing'); node.classList.remove('gt-pressed');
    await this.wait(150);
  }
  async point(target, ax, ay) {
    const node = this.q(target);
    if (this.fast) { this.marked(node); return; }
    await this.move(node, ax, ay);
    node.classList.remove('gt-pulse'); void node.offsetWidth; node.classList.add('gt-pulse');
    await this.wait(720);
    node.classList.remove('gt-pulse');
  }
  ripple(node, ax, ay) {
    const [x, y] = this.pos(node, ax, ay);
    const ripple = this.p.doc.createElement('span');
    ripple.className = 'gt-ripple';
    ripple.style.left = `${x}px`; ripple.style.top = `${y}px`;
    this.p.stage.append(ripple);
    this.p.win.setTimeout(() => ripple.remove(), 600);
  }
  val(target, text) {
    const node = this.q(target), value = node.querySelector('.gt-v') || node;
    value.textContent = text;
    if (node.matches('.gt-f, .gt-name, .gt-age, .gt-ex b, .gt-ex small, .gt-unit-example')) value.classList.add('gt-sample');
  }
  text(target, text) { this.q(target).textContent = text; }
  cls(target, name, on = true) { this.q(target).classList.toggle(name, on); }
  flash(target) {
    if (this.fast) return;
    const node = this.q(target);
    node.classList.remove('gt-flash'); void node.offsetWidth; node.classList.add('gt-flash');
  }
  async type(target, text, mirror) {
    this.alive();
    const node = this.q(target);
    if (this.fast) { this.val(node, text); if (mirror) this.val(mirror, text); return; }
    node.classList.add('gt-focus'); this.val(node, '');
    let typed = '';
    for (const character of text) {
      typed += character;
      this.val(node, typed);
      if (mirror) this.val(mirror, typed);
      await this.wait(text.length > 14 ? 62 : 95);
    }
    await this.wait(260);
    node.classList.remove('gt-focus');
  }
  async pick(target, options, index, { browse = false, set = true } = {}) {
    const node = this.q(target);
    if (this.fast) { if (set) this.val(node, options[index]); this.marked(node); return; }
    await this.tap(node);
    const p = this.p, pop = p.doc.createElement('div');
    pop.className = 'gt-pop';
    options.forEach(option => { const item = p.doc.createElement('div'); item.textContent = option; pop.append(item); });
    pop.style.top = `${within(node, p.scene, 'offsetTop') + node.offsetHeight + 3}px`;
    pop.style.left = `${within(node, p.scene, 'offsetLeft')}px`;
    pop.style.minWidth = `${node.offsetWidth}px`;
    p.scene.append(pop);
    await this.wait(260);
    const items = [...pop.children];
    if (browse) {
      for (const item of items) { await this.move(item, .35, .5); item.classList.add('is-hover'); await this.wait(120); item.classList.remove('is-hover'); }
    }
    await this.tap(items[index], .35, .5);
    items[index].classList.add('is-selected');
    if (set) this.val(node, options[index]);
    await this.wait(200);
    pop.remove();
    p.spotOn(node);
  }
  async drag(target, dx, dy, frame, { ax = .5, ay = .5, duration = 700 } = {}) {
    const node = this.q(target);
    if (this.fast) { this.marked(node); frame?.(1); return; }
    await this.move(node, ax, ay);
    const [x, y] = this.pos(node, ax, ay), finger = this.p.finger, k = this.p.k;
    finger.classList.add('is-pressing', 'is-dragging');
    const frames = Math.max(10, Math.round(duration / 16));
    for (let index = 1; index <= frames; index++) {
      const t = ease(index / frames);
      finger.style.transform = `translate(${x + dx * k * t}px,${y + dy * k * t}px)`;
      frame?.(t);
      await this.wait(16);
    }
    finger.classList.remove('is-pressing', 'is-dragging');
    await this.wait(180);
  }
  toast(text) {
    const stamp = this.p.doc.createElement('div');
    stamp.className = 'gt-stamp';
    stamp.innerHTML = '<i aria-hidden="true">✓</i><span></span>';
    stamp.lastChild.textContent = text;
    this.p.stage.append(stamp);
    if (this.fast) stamp.classList.add('is-shown');
    else this.p.win.requestAnimationFrame(() => this.p.win.requestAnimationFrame(() => stamp.classList.add('is-shown')));
    return stamp;
  }
  overlay(html, place = 'bottom') {
    const layer = this.p.doc.createElement('div');
    layer.className = `gt-layer gt-layer-${place}`;
    layer.innerHTML = html;
    this.p.stage.append(layer);
    if (!this.fast) void layer.offsetWidth;
    layer.classList.add('is-in');
    return layer;
  }
  async close(layer) {
    if (this.fast) { layer.remove(); return; }
    layer.classList.remove('is-in');
    await this.wait(300);
    layer.remove();
  }
  fingerOff() { this.p.finger.classList.remove('is-on'); }
}

class Player {
  constructor({ doc, win, stage, onSpot, onStep, onProgress, onDone }) {
    Object.assign(this, { doc, win, stage, onSpot, onStep, onProgress, onDone });
    this.view = stage.querySelector('.gt-view');
    this.finger = stage.querySelector('.gt-finger');
    this.spot = stage.querySelector('.gt-spot');
    this.runId = 0; this.cur = 0; this.y = 0; this.k = 1; this.def = null; this.scene = null; this.spotTarget = null;
  }
  sleep(ms) { return new Promise(resolve => this.win.setTimeout(resolve, ms)); }
  now() { return this.win.performance?.now?.() ?? Date.now(); }
  get paused() { return Boolean(this.doc.hidden); }
  build(def) {
    this.def = def;
    this.stage.querySelectorAll('.gt-layer, .gt-stamp, .gt-ripple').forEach(node => node.remove());
    this.view.innerHTML = def.html();
    this.scene = this.view.firstElementChild;
    this.scene.classList.add('gt-still');
    def.prep?.(this.scene);
    this.measure(); this.y = 0; this.applyCam();
    this.finger.className = 'gt-finger';
    this.spot.classList.remove('is-on'); this.spotTarget = null;
  }
  measure() { this.k = (this.view.clientWidth || SCENE_WIDTH) / SCENE_WIDTH; }
  applyCam() { this.scene.style.transform = `translate3d(0,${(-this.y * this.k).toFixed(1)}px,0) scale(${this.k})`; }
  spotOn(node, dock = true) {
    const rect = node.getBoundingClientRect(), stage = this.stage.getBoundingClientRect(), padding = 5;
    this.spot.style.left = `${rect.left - stage.left - padding}px`;
    this.spot.style.top = `${rect.top - stage.top - padding}px`;
    this.spot.style.width = `${rect.width + 2 * padding}px`;
    this.spot.style.height = `${rect.height + 2 * padding}px`;
    this.spot.classList.add('is-on'); this.spotTarget = node;
    if (dock) this.onSpot(rect);
  }
  tick(ms) {
    this.elapsed += ms;
    this.onProgress(this.cur, Math.min(this.elapsed / (this.def.durations[this.cur] || 5000), .96));
  }
  stop() { this.runId++; this.finger.classList.remove('is-on'); this.spot.classList.remove('is-on'); }
  async run(def, from, { still }) {
    const runId = ++this.runId, ctx = new Ctx(this, runId), count = def.steps.length;
    from = Math.max(0, Math.min(from, count - 1));
    this.build(def);
    try {
      for (let index = 0; index < from; index++) await def.steps[index](ctx);
      this.cur = from;
      if (still) {
        // Χωρίς κίνηση: η τελική εικόνα του βήματος, με τον προβολέα στο στοιχείο που θα πατιόταν.
        ctx.mark = true; await def.steps[from](ctx); ctx.mark = false;
        this.onStep(from); this.onProgress(from, 1);
        if (ctx.lastMark) this.spotOn(ctx.lastMark);
        this.onDone(from);
        return;
      }
      void this.scene.offsetWidth;
      this.scene.classList.remove('gt-still');
      ctx.fast = false; this.elapsed = 0; this.onStep(from);
      await def.steps[from](ctx);
      this.onProgress(from, 1);
      await ctx.wait(250);
      ctx.fingerOff();
      if (runId === this.runId) this.onDone(from);
    } catch (error) {
      if (error !== CANCEL) throw error;
    }
  }
}

/* ============================ Μινιατούρες ============================ */

const calendar = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';
const silhouette = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="17"/><path d="M14 100c2-22 17-34 36-34s34 12 36 34Z"/></svg>';
const trophy = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4a5 5 0 0 1-10 0V3Zm-4 1h3v3a3 3 0 0 1-3-3Zm15 0h3a3 3 0 0 1-3 3V4ZM10.5 13h3v3H16v3H8v-3h2.5v-3Z"/></svg>';

function scenes(t, locale) {
  const today = new Date();
  const dateText = date => new Intl.DateTimeFormat(locale, { day:'2-digit', month:'2-digit', year:'numeric' }).format(date);
  const birth = new Date(1994, 2, 12);
  const age = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), 2, 12) ? 1 : 0);
  const historyDate = new Intl.DateTimeFormat(locale, { weekday:'short', day:'numeric', month:'short', year:'numeric' }).format(today).toLocaleUpperCase(locale);
  const pushDay = `PUSH · ${t('day', { n:1 })}`;
  const modes = [t('kg'), t('plates'), t('mixed'), t('bodyweight')];

  /* ---------- Καταγραφή ---------- */
  const setRow = (index, live, extra) => {
    const key = name => live ? ` data-k="${name}${index}"` : '';
    return `<div class="gt-row${extra ? ' is-extra is-entering gt-demo' : ''}" data-row="${index}"><span class="gt-row-n">${pad(index + 1)}</span><span class="gt-f gt-f-sm"${key('r')}><span class="gt-v"></span><i class="gt-ph">0</i></span><span class="gt-row-x">×</span><span class="gt-f gt-f-sm gt-select"${key('m')}><span class="gt-v">${t('kg')}</span><em>▾</em></span><span class="gt-f gt-f-sm"${key('w')}><span class="gt-v"></span><i class="gt-ph">kg</i></span><b class="gt-row-remove"${key('rm')}>−</b></div>`;
  };
  const logCard = (index, name, live) => `<article class="gt-card" data-c="${index}"><span class="gt-tape"></span>
    <div class="gt-card-title"><div><small>${t('exercise-n', { n:index + 1 })}</small><h4>${name}</h4></div><span class="gt-tag">${t('sets-3')}</span></div>
    <div class="gt-set-head"><span>${t('h-set')}</span><span>${t('h-reps')}</span><span></span><span>${t('h-mode')}</span><span>${t('h-weight')}</span><span></span></div>
    <div class="gt-sets">${[0, 1, 2].map(n => setRow(n, live)).join('')}</div>
    <div class="gt-acts"><b class="gt-mini is-off"${live ? ' data-k="copy"' : ''}>${t('copy-first')}</b><b class="gt-mini"${live ? ' data-k="extra"' : ''}>${t('extra')}</b></div>
    <div class="gt-lab">${t('exercise-notes')}</div>
    <div class="gt-f gt-area"${live ? ' data-k="com"' : ''}><span class="gt-v"></span><i class="gt-ph">${t('notes-hint')}</i></div>
  </article>`;
  const deckTo = (c, position, dragging = false) => {
    const track = c.q('.gt-track');
    track.classList.toggle('is-dragging', dragging);
    track.style.transform = `translateX(calc(${-position * 100}% - ${position * 10}px))`;
    const index = Math.round(position);
    c.text('.gt-deck-stamp', t('exercise-of', { n:index + 1 }));
    c.q('.gt-deck-progress i').style.width = `${(index + 1) / 3 * 100}%`;
  };
  const mode = (c, value) => {
    c.cls('[data-k=sch]', 'is-on', value === 'sch'); c.cls('[data-k=free]', 'is-on', value === 'free');
    c.cls(c.root, 'is-free', value === 'free');
  };

  const log = {
    titles:['log.t1', 'log.t2', 'log.t3', 'log.t4', 'log.t5'],
    durations:[6200, 6400, 7400, 9600, 6200],
    html:() => `<div class="gt-scene gt-log">
      <div class="gt-lab gt-lab-first">${t('date')}</div>
      <div class="gt-f" data-k="date"><span class="gt-v"></span><i class="gt-ph">${dateText(today)}</i>${calendar}</div>
      <div class="gt-toggle"><b data-k="sch" class="is-on">${t('scheduled')}</b><b data-k="free">${t('free')}</b></div>
      <div class="gt-lab">${t('day-workout')}</div>
      <div class="gt-f gt-select" data-k="day"><span class="gt-v"></span><i class="gt-ph">${t('choose')}</i><em>▾</em></div>
      <div class="gt-deck">
        <div class="gt-deck-head"><b class="gt-arrow" data-k="prev">‹</b><span class="gt-deck-stamp">${t('exercise-of', { n:1 })}</span><b class="gt-arrow" data-k="next">›</b></div>
        <div class="gt-deck-view"><div class="gt-track">${logCard(0, t('bench'), true)}${logCard(1, t('ohp'))}${logCard(2, t('dips'))}</div></div>
        <div class="gt-deck-progress"><i></i></div>
      </div>
      <div class="gt-save" data-k="save">${t('finish')}</div>
    </div>`,
    prep:scene => {
      scene.classList.add('has-day');
      scene.querySelector('[data-k=date] .gt-v').textContent = dateText(today);
      scene.querySelector('[data-k=day] .gt-v').textContent = pushDay;
    },
    steps:[
      async c => {
        await c.cam(null);
        await c.tap('[data-k=date]'); c.val('[data-k=date]', dateText(today)); c.flash('[data-k=date]'); await c.wait(380);
        await c.tap('[data-k=free]'); mode(c, 'free'); await c.wait(600);
        await c.tap('[data-k=sch]'); mode(c, 'sch'); await c.wait(300);
        await c.pick('[data-k=day]', [pushDay, `PULL · ${t('day', { n:2 })}`, `LEGS · ${t('day', { n:3 })}`], 0);
        c.cls(c.root, 'has-day'); await c.wait(420);
      },
      async c => {
        await c.cam('.gt-deck', 8);
        await c.drag('.gt-deck-view', -150, 0, v => deckTo(c, v * .55, true), { ax:.78, ay:.4, duration:620 });
        deckTo(c, 1); await c.wait(520);
        await c.tap('[data-k=next]'); deckTo(c, 2); await c.wait(520);
        await c.tap('[data-k=prev]'); deckTo(c, 1); await c.wait(380);
        await c.drag('.gt-deck-view', 150, 0, v => deckTo(c, 1 - v * .55, true), { ax:.22, ay:.4, duration:620 });
        deckTo(c, 0); await c.wait(420);
      },
      async c => {
        await c.cam('.gt-card[data-c="0"] .gt-set-head', 46);
        await c.tap('[data-k=r0]'); await c.type('[data-k=r0]', '10');
        await c.pick('[data-k=m0]', modes, 0, { browse:true });
        await c.tap('[data-k=w0]'); await c.type('[data-k=w0]', '60');
        c.cls('[data-k=copy]', 'is-off', false); c.flash('[data-k=copy]'); await c.wait(500);
      },
      async c => {
        await c.cam('.gt-card[data-c="0"] .gt-set-head', 30);
        await c.tap('[data-k=copy]');
        for (const index of [1, 2]) { c.val(`[data-k=r${index}]`, '10'); c.val(`[data-k=w${index}]`, '60'); c.flash(`[data-row="${index}"]`); }
        await c.wait(560);
        await c.tap('[data-k=extra]');
        c.q('.gt-card[data-c="0"] .gt-sets').insertAdjacentHTML('beforeend', setRow(3, true, true));
        await c.wait(520);
        await c.tap('[data-k=rm3]');
        c.cls('[data-row="3"]', 'is-leaving'); await c.wait(320); c.q('[data-row="3"]').remove();
        await c.cam('[data-k=com]', 90);
        await c.tap('[data-k=com]'); await c.type('[data-k=com]', t('note-demo'));
        await c.wait(300);
      },
      async c => {
        await c.cam('[data-k=save]', 170);
        await c.tap('[data-k=save]');
        const stamp = c.toast(t('logged'));
        await c.wait(1400);
        if (!c.fast) { stamp.classList.remove('is-shown'); await c.wait(200); }
        stamp.remove();
        c.overlay(`<div class="gt-history"><div class="gt-history-title">${t('history')}</div>
          <div class="gt-history-card"><div><small>${historyDate}</small><b>${pushDay}</b><span>${t('history-meta')}</span></div><i class="gt-logged">LOGGED</i></div>
          <div class="gt-acts"><b class="gt-mini" data-k="h-select">${t('select')}</b><b class="gt-mini is-off" data-k="h-edit">${t('edit')}</b><b class="gt-mini is-off" data-k="h-copy">${t('copy')}</b></div></div>`, 'full');
        await c.wait(700);
        await c.tap('[data-k=h-select]');
        c.cls('[data-k=h-edit]', 'is-off', false); c.cls('[data-k=h-copy]', 'is-off', false); await c.wait(260);
        await c.point('[data-k=h-edit]'); await c.point('[data-k=h-copy]');
        await c.wait(300);
      },
    ],
  };

  /* ---------- Πρόγραμμα ---------- */
  const exCard = (id, name, note, demo) => `<div class="gt-ex${demo ? ' is-entering gt-demo' : ''}" data-e="${id}"><b><span class="gt-v">${name}</span></b><small><span class="gt-v">${note}</span></small><span class="gt-ex-icons"><i data-k="pen">✎</i><i data-k="del">×</i></span></div>`;
  const routineCard = (id, name, days, active, demo) => `<div class="gt-rt${active ? ' is-active' : ''}${demo ? ' is-entering gt-demo' : ''}" data-r="${id}"><b>${name}</b><small>${t('length-n', { n:days })}</small><span class="gt-live">${t('in-use')}</span><i class="gt-star">★</i>
    <div class="gt-days">${[1, 2, 3].map(day => `<div class="gt-day" data-d="${day - 1}"><span>${t('day-n', { n:day })}</span><b class="gt-add">＋</b></div>`).join('')}</div></div>`;
  const exTo = (c, position, dragging = false) => {
    const track = c.q('[data-t=ex]');
    track.classList.toggle('is-dragging', dragging);
    track.style.transform = `translateX(calc(${-position * 46}% - ${position * 8}px))`;
  };
  const benchLabel = `${t('bench')} · ${t('barbell')}`;

  const plan = {
    titles:['plan.t1', 'plan.t2', 'plan.t3', 'plan.t4', 'plan.t5'],
    durations:[6400, 10500, 9800, 6800, 6200],
    html:() => `<div class="gt-scene gt-plan">
      <div class="gt-sec" data-s="lib">
        <div class="gt-sec-head" data-k="lib-toggle"><i>01</i><span>${t('my-exercises')}</span><small>03</small><em>▾</em></div>
        <div class="gt-sec-body">
          <div class="gt-car"><div class="gt-car-track" data-t="ex">${exCard(0, t('bench'), t('barbell'))}${exCard(1, t('pullups'), t('overhand'))}${exCard(2, t('pullups'), t('underhand'))}</div></div>
          <div class="gt-car-arrows"><b data-k="ex-prev">←</b><b data-k="ex-next">→</b></div>
          <div class="gt-new" data-k="new-ex">${t('new-exercise')}</div>
          <div class="gt-form" data-f="ex">
            <div class="gt-lab">${t('exercise-name')}</div><div class="gt-f" data-k="ex-name"><span class="gt-v"></span><i class="gt-ph"></i></div>
            <div class="gt-lab">${t('cues')}</div><div class="gt-f" data-k="ex-cue"><span class="gt-v"></span><i class="gt-ph">${t('cues-hint')}</i></div>
            <div class="gt-button" data-k="ex-save">${t('save-exercise')}</div>
          </div>
        </div>
      </div>
      <div class="gt-sec" data-s="rt">
        <div class="gt-sec-head" data-k="rt-toggle"><i>02</i><span>${t('my-routines')}</span><small>02</small><em>▾</em></div>
        <div class="gt-sec-body">
          <div class="gt-car"><div class="gt-car-track" data-t="rt">${routineCard(0, 'Full Body', 7, true)}${routineCard(1, 'Upper Lower', 7)}</div></div>
          <div class="gt-new" data-k="new-rt">${t('new-routine')}</div>
          <div class="gt-form" data-f="rt">
            <div class="gt-lab">${t('routine-name')}</div><div class="gt-f" data-k="rt-name"><span class="gt-v"></span><i class="gt-ph">${t('routine-hint')}</i></div>
            <div class="gt-lab">${t('length')}</div><div class="gt-stepper"><b data-k="dec">−</b><span data-k="len">7</span><b>＋</b></div>
            <div class="gt-lab">${t('weekdays')}</div><div class="gt-toggle gt-toggle-short"><b data-k="no" class="is-on">${t('no')}</b><b data-k="yes">${t('yes')}</b></div>
            <div class="gt-week">${t('weekday-letters').split(',').map((letter, index) => `<i data-w="${index}">${letter}</i>`).join('')}</div>
            <div class="gt-button is-outline" data-k="rt-create">${t('create')}</div>
          </div>
        </div>
      </div>
    </div>`,
    steps:[
      async c => {
        await c.cam(null);
        await c.tap('[data-k=lib-toggle]'); c.cls('[data-s=lib]', 'is-open'); await c.wait(450);
        await c.tap('[data-k=new-ex]'); c.cls('[data-f=ex]', 'is-open'); await c.wait(250);
        await c.cam('[data-k=new-ex]', 40);
        await c.tap('[data-k=ex-name]'); await c.type('[data-k=ex-name]', t('dips'));
        await c.tap('[data-k=ex-cue]'); await c.type('[data-k=ex-cue]', t('lean'));
        await c.tap('[data-k=ex-save]');
        c.q('[data-t=ex]').insertAdjacentHTML('afterbegin', exCard(3, t('dips'), t('lean'), true));
        c.text('[data-k=lib-toggle] small', '04'); c.cls('[data-f=ex]', 'is-open', false);
        await c.cam(null); await c.point('[data-e="3"]'); await c.wait(300);
      },
      async c => {
        await c.cam(null);
        await c.drag('[data-s=lib] .gt-car', -110, 0, v => exTo(c, v * .6, true), { ax:.8, ay:.45, duration:600 });
        exTo(c, 1); await c.wait(460);
        await c.tap('[data-k=ex-next]'); exTo(c, 2); await c.wait(500);
        await c.point('[data-e="1"] small'); await c.point('[data-e="2"] small');
        await c.tap('[data-e="1"] [data-k=pen]'); c.cls('[data-e="1"]', 'is-editing');
        await c.type('[data-e="1"] small', t('overhand-wide'));
        await c.tap('[data-e="1"] [data-k=pen]'); c.cls('[data-e="1"]', 'is-editing', false); c.flash('[data-e="1"]'); await c.wait(300);
        await c.tap('[data-k=ex-prev]'); exTo(c, 1); await c.wait(500);
        await c.tap('[data-e="0"] [data-k=del]');
        const layer = c.overlay(`<div class="gt-confirm"><b>${t('delete-exercise')}</b><p>«${benchLabel}» ${t('used-in')} <strong>Full Body · ${t('day', { n:1 })}</strong></p><div><span class="gt-mini" data-k="c-no">${t('cancel')}</span><span class="gt-mini is-danger">${t('delete')}</span></div></div>`, 'center');
        await c.wait(1100);
        await c.tap('[data-k=c-no]'); await c.close(layer);
      },
      async c => {
        await c.cam('[data-s=rt]', 6);
        await c.tap('[data-k=rt-toggle]'); c.cls('[data-s=rt]', 'is-open'); await c.wait(400);
        await c.tap('[data-k=new-rt]'); c.cls('[data-f=rt]', 'is-open');
        await c.cam('[data-k=new-rt]', 10);
        await c.tap('[data-k=rt-name]'); await c.type('[data-k=rt-name]', 'Push Pull Legs');
        await c.tap('[data-k=dec]'); c.text('[data-k=len]', '6'); c.flash('[data-k=len]'); await c.wait(250);
        await c.tap('[data-k=yes]'); c.cls('[data-k=yes]', 'is-on'); c.cls('[data-k=no]', 'is-on', false); c.cls('.gt-week', 'is-on'); await c.wait(300);
        for (const day of [0, 2, 4]) { await c.tap(`[data-w="${day}"]`); c.cls(`[data-w="${day}"]`, 'is-on'); }
        await c.tap('[data-k=rt-create]');
        c.q('[data-t=rt]').insertAdjacentHTML('afterbegin', routineCard(2, 'Push Pull Legs', 6, false, true));
        c.text('[data-k=rt-toggle] small', '03'); c.cls('[data-f=rt]', 'is-open', false);
        await c.cam('[data-s=rt]', 6); await c.wait(500);
      },
      async c => {
        await c.cam('[data-s=rt]', 6);
        await c.tap('[data-r="2"] b'); c.cls('[data-r="2"]', 'is-open'); await c.wait(400);
        await c.pick('[data-r="2"] [data-d="0"] .gt-add', [`${t('dips')} · ${t('lean')}`, benchLabel, `${t('pullups')} · ${t('overhand-wide')}`], 1, { set:false });
        const add = c.q('[data-r="2"] [data-d="0"] .gt-add');
        const chip = c.p.doc.createElement('span');
        chip.className = 'gt-chip gt-sample'; chip.textContent = t('bench');
        add.before(chip);
        await c.wait(400);
        await c.tap('[data-r="2"] b'); c.cls('[data-r="2"]', 'is-open', false); await c.wait(300);
        await c.tap('[data-r="2"] .gt-star');
        c.cls('[data-r="0"]', 'is-active', false); c.cls('[data-r="2"]', 'is-active'); await c.wait(700);
      },
      async c => {
        await c.cam(null);
        const layer = c.overlay(`<div class="gt-past"><small>${t('history-tag')} · FULL BODY</small><b>${benchLabel}</b><span>${t('sets-line')}</span><i>LOGGED</i></div>`, 'bottom');
        await c.wait(700);
        await c.tap('[data-e="0"] [data-k=pen]'); c.cls('[data-e="0"]', 'is-editing');
        await c.type('[data-e="0"] b', t('smith'));
        await c.tap('[data-e="0"] [data-k=pen]'); c.cls('[data-e="0"]', 'is-editing', false); c.flash('[data-e="0"]');
        await c.wait(300);
        const past = layer.querySelector('.gt-past');
        await c.point(past); past.classList.add('is-stamped');
        await c.wait(900);
      },
    ],
  };

  /* ---------- Επίβλεψη ---------- */
  const chart = (() => {
    const kg = [50, 50, 50, 55, 55, 55, 57.5, 57.5, 60, 60, 60, 62.5], reps = [8, 9, 10, 8, 9, 10, 8, 10, 8, 9, 10, 8];
    const dates = ['03/07', '10/07', '17/07', '24/07', '31/07', '07/08', '21/08', '04/09', '18/09', '25/09', '09/10', '16/10'];
    const step = 46, x0 = 16, width = x0 + step * (kg.length - 1) + 20, height = 158;
    const yKg = v => 74 - (v - 48) / (64 - 48) * 58, yReps = v => 134 - (v - 7) / (11 - 7) * 30;
    const xs = kg.map((_, index) => x0 + index * step);
    let kgPath = `M${xs[0]} ${yKg(kg[0])}`;
    for (let index = 1; index < kg.length; index++) kgPath += ` H${xs[index]} V${yKg(kg[index])}`;
    const repsPath = `M${xs.map((x, index) => `${x} ${yReps(reps[index])}`).join(' L')}`;
    const runs = [];
    let start = 0;
    for (let index = 1; index <= kg.length; index++) if (index === kg.length || kg[index] !== kg[start]) { runs.push([start, index - 1]); start = index; }
    const svg = `<svg class="gt-plot" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <g class="gt-grid">${[50, 55, 60].map(v => `<line x1="0" x2="${width}" y1="${yKg(v)}" y2="${yKg(v)}"/>`).join('')}</g>
      ${runs.map(([a, b]) => `<rect class="gt-bracket" x="${xs[a] - 11}" y="96" width="${xs[b] - xs[a] + 22}" height="44" rx="5"/>`).join('')}
      <path class="gt-line gt-kg" d="${kgPath}"/><path class="gt-line gt-rp" d="${repsPath}"/>
      <g class="gt-dots">${xs.map((x, index) => `<circle class="gt-kg" cx="${x}" cy="${yKg(kg[index])}" r="3.2"/><circle class="gt-rp" cx="${x}" cy="${yReps(reps[index])}" r="2.6"/><text class="gt-rv" x="${x}" y="${yReps(reps[index]) - 6}" text-anchor="middle">${reps[index]}</text>`).join('')}</g>
      ${xs.map((x, index) => `<text x="${x}" y="${height - 3}" text-anchor="middle">${dates[index]}</text>`).join('')}
    </svg>`;
    const rail = `<svg class="gt-rail" viewBox="0 0 24 ${height}" aria-hidden="true">${[50, 55, 60].map(v => `<text x="2" y="${yKg(v) + 3}">${v}</text>`).join('')}<text class="gt-rail-unit" x="2" y="${yKg(64) + 4}">kg</text></svg>`;
    return { svg, rail, width };
  })();
  const chartX = (root, x, dragging = false) => {
    const plot = root.querySelector('.gt-plot');
    plot.classList.toggle('is-dragging', dragging);
    plot.style.transform = `translateX(${-x}px)`;
  };
  const chartMax = root => Math.max(0, chart.width - root.querySelector('[data-k=chart]').offsetWidth);
  const exercises = [t('bench'), t('pullups'), t('dips')];

  const progress = {
    titles:['progress.t1', 'progress.t2', 'progress.t3', 'progress.t4', 'progress.t5'],
    durations:[5600, 5200, 5200, 3400, 3800],
    html:() => `<div class="gt-scene gt-progress">
      <div class="gt-controls">
        <div><div class="gt-lab gt-lab-first">${t('exercise')}</div><div class="gt-f gt-select" data-k="ex"><span class="gt-v"></span><i class="gt-ph">${t('choose')}</i><em>▾</em></div></div>
        <div><div class="gt-lab gt-lab-first">${t('set')}</div><div class="gt-f gt-select" data-k="set"><span class="gt-v"></span><i class="gt-ph">—</i><em>▾</em></div></div>
      </div>
      <div class="gt-panel">
        <div class="gt-panel-head"><b>${t('course')}</b><span class="gt-legend"><span class="gt-legend-kg"><i></i>${t('weight')}</span><span class="gt-legend-rp"><i></i>${t('reps')}</span></span></div>
        <div class="gt-chart">${chart.rail}<div class="gt-chart-scroll" data-k="chart">${chart.svg}<div class="gt-chart-empty">${t('chart-empty')}</div></div></div>
        <div class="gt-chart-hint">${t('older')}</div>
      </div>
      <div class="gt-audit" data-k="audit"><div class="gt-audit-head" data-k="audit-toggle"><span>${t('audit')}</span><em>▾</em></div>
        <div class="gt-audit-body"><div>14/08 · ${t('bodyweight')}: ${t('other-mode')}</div><div>02/10 · ${t('plates')}: ${t('other-mode')}</div></div></div>
      <div class="gt-pr" data-k="pr">${trophy}<span>Personal Records</span></div>
      <div class="gt-records"><div class="gt-records-head"><b>${t('best-sets')}</b><i>PR</i></div>
        <div class="gt-record"><span>${t('bench')} · ${t('kg')}</span><b>62,5 × 8</b></div>
        <div class="gt-record"><span>${t('pullups')} · ${t('bodyweight')}</span><b>BW × 12</b></div>
        <div class="gt-record"><span>${t('dips')} · ${t('mixed')}</span><b>BW + 10 × 9</b></div></div>
    </div>`,
    prep:scene => {
      scene.querySelector('[data-k=ex] .gt-v').textContent = exercises[0];
      scene.querySelector('[data-k=set] .gt-v').textContent = t('set-n', { n:1 });
      scene.classList.add('is-drawn');
      chartX(scene, chartMax(scene));
    },
    steps:[
      async c => {
        c.cls(c.root, 'is-drawn', false);
        await c.cam(null);
        await c.pick('[data-k=ex]', exercises, 0);
        await c.pick('[data-k=set]', [1, 2, 3].map(n => t('set-n', { n })), 0);
        chartX(c.root, chartMax(c.root)); c.cls(c.root, 'is-drawn'); await c.wait(1500);
      },
      async c => {
        await c.point('.gt-legend-kg'); c.cls(c.root, 'is-kg'); await c.wait(900); c.cls(c.root, 'is-kg', false);
        await c.point('.gt-legend-rp'); c.cls(c.root, 'is-reps'); await c.wait(500);
        c.cls(c.root, 'has-brackets');
        await c.point('[data-k=chart]', .62, .8); await c.wait(1100);
        if (!c.fast) { c.cls(c.root, 'is-reps', false); c.cls(c.root, 'has-brackets', false); }
      },
      async c => {
        const max = chartMax(c.root);
        await c.drag('[data-k=chart]', 150, 0, v => chartX(c.root, max - 150 * v, true), { ax:.25, ay:.45, duration:900 });
        await c.wait(250);
        await c.drag('[data-k=chart]', 150, 0, v => chartX(c.root, Math.max(0, max - 150 - 150 * v), true), { ax:.25, ay:.45, duration:900 });
        await c.wait(650);
        await c.drag('[data-k=chart]', -170, 0, v => chartX(c.root, Math.min(max, Math.max(0, max - 300) + 170 * v), true), { ax:.8, ay:.45, duration:800 });
        chartX(c.root, Math.min(max, Math.max(0, max - 300) + 170)); await c.wait(300);
      },
      async c => {
        await c.cam('[data-k=audit]', 70);
        await c.tap('[data-k=audit-toggle]'); c.cls('[data-k=audit]', 'is-open'); await c.wait(1100);
      },
      async c => {
        await c.cam('[data-k=pr]', 40);
        await c.tap('[data-k=pr]'); c.cls('.gt-records', 'is-open'); await c.wait(250);
        await c.cam('.gt-records', 60); await c.point('.gt-record'); await c.wait(900);
      },
    ],
  };

  /* ---------- Προφίλ ---------- */
  const profile = {
    titles:['profile.t1', 'profile.t2', 'profile.t3', 'profile.t4', 'profile.t5'],
    durations:[6200, 6200, 5600, 4600, 4600],
    html:() => `<div class="gt-scene gt-profile">
      <div class="gt-athlete">
        <div class="gt-athlete-top"><span class="gt-brand"><i></i><i></i><i></i><i></i><i></i></span><small>${t('new-profile')}</small></div>
        <div class="gt-polaroid"><span class="gt-tape"></span>
          <div class="gt-photo" data-k="photo">${silhouette}<span class="gt-photo-image"></span><em>${t('change-photo')}</em></div>
          <div class="gt-name" data-k="name"><span class="gt-v">${t('name-placeholder')}</span></div>
          <div class="gt-age" data-k="age"><span>${t('age')}</span><b class="gt-v">—</b></div>
        </div>
        <div class="gt-athlete-foot">TRAIN . LOG . REPEAT</div>
      </div>
      <div class="gt-slip" data-slip="name"><div class="gt-lab">${t('name')}</div><div class="gt-f" data-k="name-field"><span class="gt-v"></span><i class="gt-ph">${t('your-name')}</i></div></div>
      <div class="gt-slip" data-slip="photo"><div class="gt-lab">${t('photos')}</div><div class="gt-photos"><i class="gt-upload" data-k="upload">＋</i>${[1, 2, 3, 4, 5].map(n => `<i data-ph="${n}"></i>`).join('')}</div></div>
      <div class="gt-slip" data-slip="birth"><div class="gt-lab">${t('birth')}</div><div class="gt-f" data-k="birth"><span class="gt-v"></span><i class="gt-ph">${dateText(birth)}</i>${calendar}</div><div class="gt-switch" data-k="show-age"><i></i>${t('show-age')}</div></div>
      <div class="gt-unit"><div class="gt-lab">${t('unit')}</div><div class="gt-toggle gt-toggle-flush"><b data-k="kg" class="is-on">${t('kilograms')}</b><b data-k="lb">${t('pounds')}</b></div>
        <div class="gt-unit-example" data-k="example"><span class="gt-v">60 kg</span><small data-k="stored">${t('stored')}</small></div></div>
      <div class="gt-export" data-k="export">${t('export')}</div>
      <div class="gt-file gt-demo"><b>logbook.csv</b><small>${t('workouts-48')}</small></div>
      <div class="gt-save" data-k="profile-save">${t('save')}</div>
    </div>`,
    steps:[
      async c => {
        await c.cam(null);
        await c.point('[data-k=photo]'); await c.point('[data-k=age]');
        await c.tap('[data-k=name]'); c.cls('[data-slip=name]', 'is-open'); await c.wait(250);
        await c.cam('[data-k=name]', 60);
        await c.tap('[data-k=name-field]'); await c.type('[data-k=name-field]', t('demo-name'), '[data-k=name]');
        c.flash('[data-k=name]'); await c.wait(300); c.cls('[data-slip=name]', 'is-open', false);
      },
      async c => {
        await c.cam(null);
        await c.tap('[data-k=photo]'); c.cls('[data-slip=photo]', 'is-open');
        await c.cam('[data-k=name]', 30);
        await c.tap('[data-k=upload]'); c.cls('[data-ph="1"]', 'gt-photo-a'); await c.wait(300);
        await c.tap('[data-k=upload]'); c.cls('[data-ph="2"]', 'gt-photo-b'); await c.wait(300);
        await c.tap('[data-ph="2"]'); c.cls('[data-ph="2"]', 'is-selected'); c.cls('[data-k=photo]', 'has-image');
        await c.cam(null); await c.point('[data-k=photo]'); c.cls('[data-slip=photo]', 'is-open', false);
      },
      async c => {
        await c.cam(null);
        await c.tap('[data-k=age]'); c.cls('[data-slip=birth]', 'is-open');
        await c.cam('[data-k=name]', 30);
        await c.tap('[data-k=birth]'); await c.type('[data-k=birth]', dateText(birth));
        await c.tap('[data-k=show-age]'); c.cls('[data-k=show-age]', 'is-on'); c.val('[data-k=age]', String(age)); c.flash('[data-k=age]');
        await c.point('[data-k=age]'); c.cls('[data-slip=birth]', 'is-open', false);
      },
      async c => {
        await c.cam('.gt-unit', 30);
        await c.tap('[data-k=lb]'); c.cls('[data-k=lb]', 'is-on'); c.cls('[data-k=kg]', 'is-on', false); c.val('[data-k=example]', '132 lb'); c.flash('[data-k=example]');
        await c.wait(400); await c.point('[data-k=stored]'); await c.wait(300);
        await c.tap('[data-k=kg]'); c.cls('[data-k=kg]', 'is-on'); c.cls('[data-k=lb]', 'is-on', false); c.val('[data-k=example]', '60 kg'); c.flash('[data-k=example]');
        await c.wait(300);
      },
      async c => {
        await c.cam('[data-k=export]', 60);
        await c.tap('[data-k=export]'); c.cls('.gt-file', 'is-shown'); await c.wait(800);
        await c.tap('[data-k=profile-save]');
        const stamp = c.toast(t('profile-saved'));
        await c.wait(1400);
        if (!c.fast) { stamp.classList.remove('is-shown'); await c.wait(200); }
        stamp.remove();
      },
    ],
  };

  return { log, plan, progress, profile };
}

/* ============================ Ξενάγηση ============================ */

// Χτίζει το overlay μία φορά και επιστρέφει { open, close, isOpen }. Το ( i )
// καλεί open(key, opener)· το focus επιστρέφει στο ( i ) όταν κλείσει.
export function createGuideTours({ document:doc, window:win, guides }) {
  const i18n = () => win.LogbookI18n;
  const language = () => {
    const value = i18n()?.getLanguage?.();
    return LANGUAGES.includes(value) ? value : 'el';
  };
  const t = (key, parameters = {}) => {
    const values = TEXT[key];
    if (!values) return key;
    const value = values[LANGUAGES.indexOf(language())] ?? values[0];
    return value.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(parameters, name) ? String(parameters[name]) : match);
  };
  const reducedMotion = () => Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const root = doc.createElement('div');
  root.className = 'guide-tour';
  root.id = 'guide-tour';
  root.hidden = true;
  root.innerHTML = `<div class="gt-stage">
      <div class="gt-view" aria-hidden="true"></div>
      <div class="gt-spot" aria-hidden="true"></div>
      <div class="gt-finger" aria-hidden="true"></div>
      <section class="gt-coach" role="dialog" aria-modal="true" aria-labelledby="gt-coach-title" aria-describedby="gt-coach-text">
        <button class="gt-coach-close" type="button">✕</button>
        <h2 class="gt-coach-title" id="gt-coach-title"></h2>
        <p class="gt-coach-text" id="gt-coach-text" aria-live="polite"></p>
        <div class="gt-coach-steps" aria-hidden="true"></div>
        <div class="gt-coach-actions">
          <button class="gt-coach-prev" type="button">‹</button>
          <button class="gt-coach-again" type="button">↻</button>
          <button class="gt-coach-next" type="button">›</button>
        </div>
      </section>
    </div>`;
  doc.body.append(root);

  const stage = root.querySelector('.gt-stage');
  const coach = root.querySelector('.gt-coach');
  const title = root.querySelector('.gt-coach-title');
  const text = root.querySelector('.gt-coach-text');
  const stepsBar = root.querySelector('.gt-coach-steps');
  const prev = root.querySelector('.gt-coach-prev');
  const again = root.querySelector('.gt-coach-again');
  const next = root.querySelector('.gt-coach-next');
  const close = root.querySelector('.gt-coach-close');

  let defs = null;
  let current = null;
  let opener = null;
  let coachOnTop = false;

  const captions = key => [...(doc.getElementById(guides[key])?.querySelectorAll('li span') ?? [])].map(span => span.textContent.trim());
  const segment = index => stepsBar.children[index]?.firstElementChild;
  const fill = (index, value) => { const bar = segment(index); if (bar) bar.style.width = `${value * 100}%`; };

  // Η κάρτα κάθεται κάτω. Ανεβαίνει όταν από κάτω δεν χωράει χωρίς να σκεπάσει
  // τον στόχο· σε μεγάλο στόχο μένει κάτω, ώστε να φαίνεται η κορυφή του.
  const dock = rect => {
    const area = stage.getBoundingClientRect();
    const need = coach.offsetHeight + 18;
    const below = area.bottom - rect.bottom, above = rect.top - area.top;
    const big = rect.height > area.height * .4;
    coachOnTop = !big && below < need && (above >= need || above > below);
    coach.style.transform = coachOnTop ? `translateY(${-(area.height - coach.offsetHeight - 20)}px)` : '';
  };

  const player = new Player({
    doc, win, stage,
    onSpot:dock,
    onStep:index => {
      const lines = captions(current);
      title.textContent = t(defs[current].titles[index]);
      text.textContent = lines[index] ?? '';
      [...stepsBar.children].forEach((item, position) => { item.classList.toggle('is-done', position < index); fill(position, position < index ? 1 : 0); });
      prev.disabled = index === 0;
      next.classList.remove('is-ready');
      const last = index === defs[current].steps.length - 1;
      next.textContent = last ? '✓' : '›';
      next.setAttribute('aria-label', t(last ? 'ui.done' : 'ui.next'));
    },
    onProgress:fill,
    onDone:() => next.classList.add('is-ready'),
  });

  const labelControls = () => {
    close.setAttribute('aria-label', t('ui.close'));
    prev.setAttribute('aria-label', t('ui.prev'));
    again.setAttribute('aria-label', t('ui.again'));
  };

  const play = index => {
    defs = scenes(t, i18n()?.getLocale?.() ?? 'el-GR');
    return player.run(defs[current], index, { still:reducedMotion() });
  };

  function open(key, trigger) {
    if (!guides[key]) return;
    current = key; opener = trigger ?? null;
    defs = scenes(t, i18n()?.getLocale?.() ?? 'el-GR');
    stepsBar.innerHTML = defs[key].steps.map(() => '<i><s></s></i>').join('');
    labelControls();
    coach.style.transform = ''; coachOnTop = false;
    root.hidden = false;
    doc.documentElement.classList.add('guide-tour-open');
    opener?.setAttribute('aria-expanded', 'true');
    next.focus({ preventScroll:true });
    return play(0);
  }

  function closeTour() {
    if (root.hidden) return;
    player.stop();
    root.hidden = true;
    doc.documentElement.classList.remove('guide-tour-open');
    opener?.setAttribute('aria-expanded', 'false');
    opener?.focus({ preventScroll:true });
    current = null; opener = null;
  }

  const go = delta => {
    if (root.hidden) return;
    const index = player.cur + delta;
    if (index >= defs[current].steps.length) return closeTour();
    play(Math.max(0, index));
  };

  next.addEventListener('click', () => go(1));
  prev.addEventListener('click', () => go(-1));
  again.addEventListener('click', () => play(player.cur));
  close.addEventListener('click', closeTour);

  // Σύρσιμο πάνω στην κάρτα-οδηγό αλλάζει βήμα.
  let swipeStart = null;
  coach.addEventListener('pointerdown', event => { swipeStart = event.target.closest('button') ? null : event.clientX; });
  coach.addEventListener('pointerup', event => {
    if (swipeStart == null) return;
    const dx = event.clientX - swipeStart;
    swipeStart = null;
    if (Math.abs(dx) > 36) go(dx < 0 ? 1 : -1);
  });
  coach.addEventListener('pointercancel', () => { swipeStart = null; });

  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeTour(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); return; }
    if (event.key !== 'Tab') return;
    // Το focus μένει μέσα στην κάρτα-οδηγό όσο είναι ανοιχτή.
    const focusable = [...coach.querySelectorAll('button:not([disabled])')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  doc.addEventListener('logbook:languagechange', () => {
    if (root.hidden) return;
    labelControls();
    play(player.cur);
  });
  let resizeTimer = null;
  win.addEventListener('resize', () => {
    if (root.hidden) return;
    win.clearTimeout(resizeTimer);
    resizeTimer = win.setTimeout(() => play(player.cur), 160);
  });

  return {
    open,
    close:closeTour,
    get isOpen() { return !root.hidden; },
    get step() { return player.cur; },
  };
}

// Για τα tests: τρέχει ακαριαία κάθε βήμα κάθε μινιατούρας και επιστρέφει το
// τελικό markup, ώστε να ελέγχεται ότι κανένας selector δεν λείπει και ότι δεν
// μένει ελληνικό κείμενο στις άλλες γλώσσες.
export async function renderGuideScenesForTest({ document:doc, window:win, language = 'el', locale = 'el-GR' }) {
  const t = (key, parameters = {}) => {
    const values = TEXT[key];
    const value = values[LANGUAGES.indexOf(language)] ?? values[0];
    return value.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(parameters, name) ? String(parameters[name]) : match);
  };
  const defs = scenes(t, locale);
  const output = {};
  for (const [key, def] of Object.entries(defs)) {
    const stage = doc.createElement('div');
    stage.innerHTML = '<div class="gt-view"></div><div class="gt-spot"></div><div class="gt-finger"></div>';
    doc.body.append(stage);
    const player = new Player({ doc, win, stage, onSpot() {}, onStep() {}, onProgress() {}, onDone() {} });
    output[key] = [];
    for (let index = 0; index < def.steps.length; index++) {
      await player.run(def, index, { still:true });
      output[key].push({ title:t(def.titles[index]), html:stage.innerHTML });
    }
    stage.remove();
  }
  return output;
}
