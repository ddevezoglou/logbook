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
// Γερμανός χρήστης θα έβλεπε ελληνικές ασκήσεις μέσα στην ξενάγηση. Οι ετικέτες
// του UI ακολουθούν τον κατάλογο του i18n.js, ώστε η μινιατούρα να γράφει ό,τι
// γράφει και η αληθινή σελίδα σε κάθε γλώσσα.
const TEXT = {
  'ui.prev':['Προηγούμενο βήμα', 'Previous step', 'Étape précédente', 'Vorheriger Schritt'],
  'ui.again':['Ξανά', 'Replay', 'Rejouer', 'Wiederholen'],
  'ui.next':['Επόμενο βήμα', 'Next step', 'Étape suivante', 'Nächster Schritt'],
  'ui.done':['Τέλος', 'Done', 'Terminé', 'Fertig'],
  'ui.close':['Κλείσιμο', 'Close', 'Fermer', 'Schließen'],
  'log.t1':['Ημερομηνία και τύπος', 'Date and type', 'Date et type', 'Datum und Art'],
  'log.t2':['Σύρετε τις ασκήσεις', 'Swipe through exercises', 'Faites défiler les exercices', 'Übungen wischen'],
  'log.t3':['Επαναλήψεις και μέτρηση', 'Reps and measure', 'Répétitions et mesure', 'Wiederholungen und Messart'],
  'log.t4':['Σετ και σχόλια', 'Sets and notes', 'Séries et notes', 'Sätze und Notizen'],
  'log.t5':['Ολοκλήρωση', 'Finish', 'Terminer', 'Abschließen'],
  'plan.t1':['Πρώτα η βιβλιοθήκη', 'Library first', 'La bibliothèque d’abord', 'Zuerst die Bibliothek'],
  'plan.t2':['Μολύβι, × και Cues', 'Pencil, × and Cues', 'Crayon, × et Cues', 'Stift, × und Cues'],
  'plan.t3':['Νέο πρόγραμμα', 'New routine', 'Nouveau programme', 'Neuer Plan'],
  'plan.t4':['Προπονήσεις και αστέρι', 'Workouts and star', 'Séances et étoile', 'Trainings und Stern'],
  'plan.t5':['Το ιστορικό μένει', 'History stays', 'L’historique reste', 'Der Verlauf bleibt'],
  'progress.t1':['Άσκηση και σετ', 'Exercise and set', 'Exercice et série', 'Übung und Satz'],
  'progress.t2':['Φορτίο και επαναλήψεις', 'Load and reps', 'Charge et répétitions', 'Last und Wiederholungen'],
  'progress.t3':['Σύρετε το γράφημα', 'Drag the chart', 'Faites glisser le graphique', 'Diagramm ziehen'],
  'progress.t4':['Ο έλεγχος', 'The check', 'Le contrôle', 'Die Prüfung'],
  'progress.t5':['Personal Records', 'Personal Records', 'Personal Records', 'Personal Records'],
  'profile.t1':['Πατήστε την κάρτα', 'Tap the card', 'Touchez la carte', 'Karte antippen'],
  'profile.t2':['Φωτογραφίες', 'Photos', 'Photos', 'Fotos'],
  'profile.t3':['Ηλικία', 'Age', 'Âge', 'Alter'],
  'profile.t4':['Μονάδα μέτρησης', 'Measurement unit', 'Unité de mesure', 'Maßeinheit'],
  'profile.t5':['Εξαγωγή και αποθήκευση', 'Export and save', 'Exporter et enregistrer', 'Exportieren und speichern'],

  /* Κοινά */
  'choose':['Επιλογή', 'Select', 'Choisir', 'Auswählen'],
  'cancel':['Ακύρωση', 'Cancel', 'Annuler', 'Abbrechen'],
  'delete':['Διαγραφή', 'Delete', 'Supprimer', 'Löschen'],
  'confirm':['ΕΠΙΒΕΒΑΙΩΣΗ', 'CONFIRMATION', 'CONFIRMATION', 'BESTÄTIGUNG'],
  'close-slip':['ΚΛΕΙΣΙΜΟ', 'CLOSE', 'FERMER', 'SCHLIESSEN'],
  'cues':['Cues', 'Cues', 'Cues', 'Cues'],
  'exercise':['Άσκηση', 'Exercise', 'Exercice', 'Übung'],
  'exercise-name':['Όνομα άσκησης', 'Exercise name', 'Nom de l’exercice', 'Übungsname'],
  'choose-exercise':['Επιλογή άσκησης', 'Select exercise', 'Choisir un exercice', 'Übung auswählen'],
  'reps-word':['επαναλήψεις', 'reps', 'répétitions', 'Wiederholungen'],
  'reps-short':['επαν.', 'reps', 'rép.', 'Wdh.'],

  /* Ασκήσεις-δείγματα */
  'bench':['Πιέσεις πάγκου', 'Bench press', 'Développé couché', 'Bankdrücken'],
  'ohp':['Στρατιωτικές πιέσεις', 'Overhead press', 'Développé militaire', 'Schulterdrücken'],
  'dips':['Βυθίσεις', 'Dips', 'Dips', 'Dips'],
  'pullups':['Έλξεις', 'Pull-ups', 'Tractions', 'Klimmzüge'],
  'smith':['Πιέσεις Smith', 'Smith press', 'Développé Smith', 'Smith-Drücken'],
  'barbell':['μπάρα', 'barbell', 'barre', 'Langhantel'],
  'standing':['όρθιος, σφιχτός κορμός', 'standing, tight core', 'debout, gainage serré', 'stehend, Rumpf fest'],
  'lean':['κορμός μπροστά', 'lean forward', 'buste penché', 'Oberkörper vor'],
  'overhand':['πρηνής λαβή', 'overhand grip', 'prise pronation', 'Obergriff'],
  'underhand':['υπτία λαβή', 'underhand grip', 'prise supination', 'Untergriff'],

  /* Καταγραφή */
  'date':['Ημερομηνία', 'Date', 'Date', 'Datum'],
  'scheduled':['Από το πρόγραμμα', 'From plan', 'Depuis le programme', 'Aus dem Plan'],
  'free':['Ελεύθερη', 'Free', 'Libre', 'Frei'],
  'day-workout':['Προπόνηση ημέρας', 'Day’s workout', 'Séance du jour', 'Tagestraining'],
  'exercise-of':['ΑΣΚΗΣΗ {n} / {total}', 'EXERCISE {n} / {total}', 'EXERCICE {n} / {total}', 'ÜBUNG {n} / {total}'],
  'exercise-n':['ΑΣΚΗΣΗ {n}', 'EXERCISE {n}', 'EXERCICE {n}', 'ÜBUNG {n}'],
  'sets-n':['{n} σετ', '{n} sets', '{n} séries', '{n} Sätze'],
  'h-set':['ΣΕΤ', 'SET', 'SÉRIE', 'SATZ'],
  'h-reps':['ΕΠΑΝΑΛΗΨΕΙΣ', 'REPS', 'RÉPÉTITIONS', 'WIEDERHOLUNGEN'],
  'h-load':['ΒΑΡΟΣ / ΜΕΤΡΗΣΗ', 'WEIGHT / MEASURE', 'CHARGE / MESURE', 'GEWICHT / MESSART'],
  'kg':['Κιλά', 'kg', 'kg', 'kg'],
  'plates':['Πλάκες', 'Plates', 'Plaques', 'Scheiben'],
  'plates-kg':['Πλάκες+Κιλά', 'Plates+kg', 'Plaques+kg', 'Scheiben+kg'],
  'bodyweight':['Bodyweight', 'Bodyweight', 'Poids du corps', 'Körpergewicht'],
  'bodyweight-kg':['Bodyweight+Κιλά', 'Bodyweight + kg', 'Poids du corps + kg', 'Körpergewicht + kg'],
  'copy-first':['ΑΝΤΙΓΡΑΦΗ', 'COPY', 'COPIER', 'KOPIEREN'],
  'extra':['＋ Extra σετ', '＋ Extra set', '＋ Série supplémentaire', '＋ Extrasatz'],
  'exercise-notes':['Σχόλια άσκησης', 'Exercise notes', 'Notes de l’exercice', 'Übungsnotizen'],
  'notes-hint':['Τεχνική, αίσθηση, RPE...', 'Technique, feel, RPE...', 'Technique, sensations, RPE...', 'Technik, Gefühl, RPE...'],
  'note-demo':['Καλή αίσθηση, RPE 8', 'Felt good, RPE 8', 'Bonnes sensations, RPE 8', 'Gutes Gefühl, RPE 8'],
  'add-exercise':['＋ Προσθήκη άσκησης', '＋ Add exercise', '＋ Ajouter un exercice', '＋ Übung hinzufügen'],
  'from-library':['Από τη βιβλιοθήκη', 'From the library', 'Depuis la bibliothèque', 'Aus der Bibliothek'],
  'set-count':['Αριθμός σετ', 'Number of sets', 'Nombre de séries', 'Anzahl Sätze'],
  'session-notes':['Σχόλια προπόνησης', 'Workout notes', 'Notes de séance', 'Trainingsnotizen'],
  'session-hint':['Πώς πήγε συνολικά η σημερινή προπόνηση;', 'How did today’s workout go overall?', 'Comment s’est passée la séance aujourd’hui ?', 'Wie lief das heutige Training insgesamt?'],
  'finish':['ΟΛΟΚΛΗΡΩΣΗ ΠΡΟΠΟΝΗΣΗΣ', 'COMPLETE WORKOUT', 'TERMINER LA SÉANCE', 'TRAINING ABSCHLIESSEN'],
  'logged':['Η προπόνηση καταγράφηκε.', 'Workout logged.', 'Séance enregistrée.', 'Training erfasst.'],
  'remove-set':['Αφαίρεση σετ', 'Remove set', 'Retirer la série', 'Satz entfernen'],
  'remove-set-message':['Είστε σίγουροι ότι θέλετε να πραγματοποιηθεί αφαίρεση του εργάσιμου σετ ;', 'Are you sure you want to remove the working set?', 'Êtes-vous sûr de vouloir retirer la série de travail ?', 'Möchten Sie den Arbeitssatz wirklich entfernen?'],
  'remove':['Αφαίρεση', 'Remove', 'Retirer', 'Entfernen'],
  'history':['Ιστορικό προπονήσεων', 'Workout history', 'Historique des séances', 'Trainingsverlauf'],
  'n-exercises':['{n} ΑΣΚΗΣΕΙΣ', '{n} EXERCISES', '{n} EXERCICES', '{n} ÜBUNGEN'],
  'planned-workout':['ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ', 'PLANNED WORKOUT', 'SÉANCE PLANIFIÉE', 'GEPLANTES TRAINING'],
  'select':['ΕΠΙΛΟΓΗ', 'SELECT', 'SÉLECTIONNER', 'AUSWÄHLEN'],
  'edit':['ΕΠΕΞΕΡΓΑΣΙΑ', 'EDIT', 'MODIFIER', 'BEARBEITEN'],
  'copy':['ΑΝΤΙΓΡΑΦΗ', 'COPY', 'COPIER', 'KOPIEREN'],
  'delete-caps':['ΔΙΑΓΡΑΦΗ', 'DELETE', 'SUPPRIMER', 'LÖSCHEN'],

  /* Πρόγραμμα */
  'my-exercises':['Οι ασκήσεις μου', 'My exercises', 'Mes exercices', 'Meine Übungen'],
  'my-routines':['Τα προγράμματά μου', 'My routines', 'Mes programmes', 'Meine Pläne'],
  'new-exercise':['Νέα άσκηση', 'New exercise', 'Nouvel exercice', 'Neue Übung'],
  'cues-hint':['π.χ. ώμοι πίσω, σταθερά πόδια', 'e.g. shoulders back, feet planted', 'p. ex. épaules en arrière, pieds stables', 'z. B. Schultern zurück, Füße stabil'],
  'save-exercise':['Αποθήκευση άσκησης', 'Save exercise', 'Enregistrer l’exercice', 'Übung speichern'],
  'exercise-saved':['Η άσκηση αποθηκεύτηκε.', 'Exercise saved.', 'Exercice enregistré.', 'Übung gespeichert.'],
  'delete-exercise':['Διαγραφή άσκησης', 'Delete exercise', 'Supprimer l’exercice', 'Übung löschen'],
  'delete-warning':['Η άσκηση «{name}» θα διαγραφεί από τη βιβλιοθήκη, από όλα τα προγράμματα που τη χρησιμοποιούν και από την επίβλεψη. Οι παλιές καταγραφές στο ιστορικό θα διατηρηθούν. Θέλετε να συνεχίσετε;', 'The exercise “{name}” will be deleted from the library, all programs that use it, and progress tracking. Past entries in history will be preserved. Continue?', 'L’exercice « {name} » sera supprimé de la bibliothèque, de tous les programmes qui l’utilisent et du suivi. Les anciennes entrées de l’historique seront conservées. Continuer ?', 'Die Übung „{name}“ wird aus der Bibliothek, allen zugehörigen Programmen und der Fortschrittsübersicht gelöscht. Frühere Einträge im Verlauf bleiben erhalten. Fortfahren?'],
  'new-routine':['Νέο πρόγραμμα', 'New routine', 'Nouveau programme', 'Neuer Plan'],
  'routine-name':['Όνομα προγράμματος', 'Routine name', 'Nom du programme', 'Planname'],
  'routine-hint':['π.χ. Push Pull Legs', 'e.g. Push Pull Legs', 'ex. Push Pull Legs', 'z. B. Push Pull Legs'],
  'length':['Διάρκεια (σε ημέρες)', 'Duration (days)', 'Durée (jours)', 'Dauer (Tage)'],
  'weekdays':['Δήλωση ημερών', 'Use weekdays', 'Utiliser les jours de la semaine', 'Wochentage verwenden'],
  'no':['Όχι', 'No', 'Non', 'Nein'],
  'yes':['Ναι', 'Yes', 'Oui', 'Ja'],
  'create':['＋ Δημιουργία', '＋ Create', '＋ Créer', '＋ Erstellen'],
  'routine-created':['Το πρόγραμμα «{name}» δημιουργήθηκε', 'Routine “{name}” created', 'Programme « {name} » créé', 'Plan „{name}“ erstellt'],
  'in-use':['Σε ισχύ', 'In use', 'En cours', 'Aktiv'],
  'routine':['Πρόγραμμα', 'Plan', 'Programme', 'Plan'],
  'no-workout':['Δεν έχει οριστεί προπόνηση', 'No workout has been set', 'Aucune séance définie', 'Kein Training festgelegt'],
  'length-n':['ΔΙΑΡΚΕΙΑ: {n} ΗΜΕΡΕΣ', 'DURATION: {n} DAYS', 'DURÉE : {n} JOURS', 'DAUER: {n} TAGE'],
  'view-plan':['Προβολή πλάνου', 'View plan', 'Voir le programme', 'Plan anzeigen'],
  'add-workout':['Προσθήκη προπόνησης', 'Add workout', 'Ajouter une séance', 'Training hinzufügen'],
  'new-day-workout':['Νέα προπόνηση ημέρας', 'New day workout', 'Nouvelle séance du jour', 'Neues Tagestraining'],
  'day':['Ημέρα', 'Day', 'Jour', 'Tag'],
  'workout-name':['Όνομα προπόνησης', 'Workout name', 'Nom de la séance', 'Trainingsname'],
  'workout-hint':['π.χ. Push, Upper A', 'e.g. Push, Upper A', 'ex. Push, Upper A', 'z. B. Push, Upper A'],
  'exercise-count':['Αριθμός ασκήσεων', 'Number of exercises', 'Nombre d’exercices', 'Anzahl Übungen'],
  'workout-exercises':['ΑΣΚΗΣΕΙΣ ΠΡΟΠΟΝΗΣΗΣ', 'WORKOUT EXERCISES', 'EXERCICES DE LA SÉANCE', 'TRAININGSÜBUNGEN'],
  'work-sets':['Εργάσιμα σετ', 'Working sets', 'Séries de travail', 'Arbeitssätze'],
  'cues-set':['Ορίζονται στις ασκήσεις μου.', 'Set in My exercises.', 'À définir dans Mes exercices.', 'Unter Meine Übungen festlegen.'],
  'save-day':['Αποθήκευση ημέρας', 'Save day', 'Enregistrer le jour', 'Tag speichern'],
  'weekday-names':['Δευτέρα,Τρίτη,Τετάρτη', 'Monday,Tuesday,Wednesday', 'Lundi,Mardi,Mercredi', 'Montag,Dienstag,Mittwoch'],
  'history-tag':['ΙΣΤΟΡΙΚΟ', 'HISTORY', 'HISTORIQUE', 'VERLAUF'],
  'sets-line':['3 σετ · 10 × 60 kg', '3 sets · 10 × 60 kg', '3 séries · 10 × 60 kg', '3 Sätze · 10 × 60 kg'],

  /* Επίβλεψη */
  'set':['Σετ', 'Set', 'Série', 'Satz'],
  'set-n':['Σετ {n}', 'Set {n}', 'Série {n}', 'Satz {n}'],
  'records-n':['{n} καταγραφές', '{n} logs', '{n} saisies', '{n} Einträge'],
  'latest':['ΤΕΛΕΥΤΑΙΑ ΕΠΙΔΟΣΗ', 'LATEST PERFORMANCE', 'DERNIÈRE PERFORMANCE', 'LETZTE LEISTUNG'],
  'audit-title':['Έλεγχος καταγραφής: {n} προπονήσεις εξαιρέθηκαν.', 'Log check: {n} workouts excluded.', 'Contrôle des saisies : {n} séances exclues.', 'Eintragsprüfung: {n} Trainings ausgeschlossen.'],
  'audit-uses':['Το γράφημα χρησιμοποιεί μόνο «κιλά».', 'The chart only uses “kg”.', 'Le graphique utilise uniquement « kg ».', 'Das Diagramm verwendet nur „kg“.'],
  'audit-bodyweight':['καταγράφηκε σε σωματικό βάρος', 'logged as bodyweight', 'saisie au poids du corps', 'als Körpergewicht erfasst'],
  'audit-plates':['καταγράφηκε σε πλάκες', 'logged as plates', 'saisie en plaques', 'als Scheiben erfasst'],
  'best-sets':['ΚΑΛΥΤΕΡΑ ΣΕΤ', 'BEST SETS', 'MEILLEURES SÉRIES', 'BESTE SÄTZE'],

  /* Προφίλ */
  'new-profile':['ΝΕΟ ΠΡΟΦΙΛ', 'NEW PROFILE', 'NOUVEAU PROFIL', 'NEUES PROFIL'],
  'unsaved':['ΜΗ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ', 'UNSAVED CHANGES', 'MODIFICATIONS NON ENREGISTRÉES', 'NICHT GESPEICHERTE ÄNDERUNGEN'],
  'change-photo':['ΑΛΛΑΓΗ ΦΩΤΟΓΡΑΦΙΑΣ', 'CHANGE PHOTO', 'CHANGER LA PHOTO', 'FOTO ÄNDERN'],
  'name-placeholder':['ΟΝΟΜΑ', 'NAME', 'NOM', 'NAME'],
  'age':['ΗΛΙΚΙΑ', 'AGE', 'ÂGE', 'ALTER'],
  'years':['έτη', 'years', 'ans', 'Jahre'],
  'no-date':['Χωρίς ημερομηνία', 'No date', 'Sans date', 'Kein Datum'],
  'name':['Όνομα', 'Name', 'Nom', 'Name'],
  'name-hint':['π.χ. Δημήτρης', 'e.g. Alex', 'ex. Alex', 'z. B. Alex'],
  'demo-name':['ΑΛΕΞ', 'ALEX', 'ALEX', 'ALEX'],
  'name-slip':['ΟΝΟΜΑ', 'NAME', 'NOM', 'NAME'],
  'photo-slip':['ΦΩΤΟΓΡΑΦΙΕΣ ΠΡΟΦΙΛ', 'PROFILE PHOTOS', 'PHOTOS DE PROFIL', 'PROFILFOTOS'],
  'upload':['ΑΝΕΒΑΣΜΑ ΝΕΑΣ', 'UPLOAD NEW', 'IMPORTER UNE NOUVELLE', 'NEUES HOCHLADEN'],
  'formats':['JPG, PNG ή WEBP', 'JPG, PNG or WEBP', 'JPG, PNG ou WEBP', 'JPG, PNG oder WEBP'],
  'in-use-photo':['ΣΕ ΧΡΗΣΗ', 'IN USE', 'UTILISÉE', 'IN VERWENDUNG'],
  'use-photo':['ΕΠΙΛΟΓΗ', 'SELECT', 'SÉLECTIONNER', 'AUSWÄHLEN'],
  'birth-slip':['ΗΜΕΡΟΜΗΝΙΑ ΓΕΝΝΗΣΗΣ', 'DATE OF BIRTH', 'DATE DE NAISSANCE', 'GEBURTSDATUM'],
  'hide-age':['Απόκρυψη ηλικίας από την κάρτα', 'Hide age from the card', 'Masquer l’âge sur la carte', 'Alter auf der Karte ausblenden'],
  'unit':['Μονάδα μέτρησης', 'Measurement unit', 'Unité de mesure', 'Maßeinheit'],
  'export':['Εξαγωγή ιστορικού', 'Export history', 'Exporter l’historique', 'Verlauf exportieren'],
  'logged-workouts':['ΚΑΤΑΓΕΓΡΑΜΜΕΝΕΣ ΠΡΟΠΟΝΗΣΕΙΣ', 'LOGGED WORKOUTS', 'SÉANCES ENREGISTRÉES', 'ERFASSTE TRAININGS'],
  'file':['ΑΡΧΕΙΟ', 'FILE', 'FICHIER', 'DATEI'],
  'save-profile':['ΑΠΟΘΗΚΕΥΣΗ ΠΡΟΦΙΛ', 'SAVE PROFILE', 'ENREGISTRER LE PROFIL', 'PROFIL SPEICHERN'],
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
  // Διάλογος ή σελίδα πάνω από τη μινιατούρα. Μπαίνει μέσα στη σκηνή, στο ύψος
  // της κάμερας, ώστε να έχει την ίδια κλίμακα με τη σελίδα από κάτω.
  sheet(html, place = 'full') {
    const p = this.p, layer = p.doc.createElement('div');
    layer.className = `gt-sheet gt-sheet-${place}`;
    layer.innerHTML = html;
    layer.style.top = `${p.y}px`;
    layer.style.height = `${Math.ceil(p.view.clientHeight / p.k)}px`;
    p.scene.append(layer);
    p.spot.classList.remove('is-on'); p.spotTarget = null;
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
    this.stage.querySelectorAll('.gt-stamp, .gt-ripple').forEach(node => node.remove());
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

// Κάθε μινιατούρα αντιγράφει τη διάταξη της αληθινής σελίδας στο κινητό: ίδια
// σειρά πεδίων, ίδιες ετικέτες, ίδια κουμπιά. Όταν αλλάζει το UI, αλλάζει κι εδώ.
const calendar = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';
const silhouette = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="17"/><path d="M14 100c2-22 17-34 36-34s34 12 36 34Z"/></svg>';
const trophy = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4a5 5 0 0 1-10 0V3Zm-4 1h3v3a3 3 0 0 1-3-3Zm15 0h3a3 3 0 0 1-3 3V4ZM10.5 13h3v3H16v3H8v-3h2.5v-3Z"/></svg>';
const eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>';
const duplicate = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M16 8V5H5v11h3"/></svg>';
const flex = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17c3-1 5-3 6-6l2-5 3 1-1 4c2 0 4 1 4 4s-3 5-7 5H6Z"/></svg>';

// Καρουζέλ με μία κάρτα στο κέντρο και τις γειτονικές πίσω της, όπως τα
// «Οι ασκήσεις μου» / «Τα προγράμματά μου». Κυκλικό, όπως και το αληθινό.
function carTo(root, name, index) {
  const car = root.querySelector(`[data-car="${name}"]`);
  const cards = [...car.querySelectorAll(':scope > .gt-cc')];
  const count = cards.length;
  const current = count ? ((index % count) + count) % count : 0;
  cards.forEach((card, position) => {
    let offset = position - current;
    if (offset > count / 2) offset -= count;
    if (offset < -count / 2) offset += count;
    card.dataset.pos = Math.abs(offset) <= 1 ? String(offset) : 'hidden';
  });
  car.dataset.index = String(current);
  root.querySelector(`[data-k="${name}-count"]`).textContent = `${pad(count ? current + 1 : 0)} / ${pad(count)}`;
}
const carIndex = (root, name) => Number(root.querySelector(`[data-car="${name}"]`).dataset.index) || 0;

function scenes(t, locale) {
  const today = new Date();
  const daysAgo = days => { const date = new Date(today); date.setDate(date.getDate() - days); return date; };
  const format = (date, options) => new Intl.DateTimeFormat(locale, options).format(date);
  const dateText = date => format(date, { day:'2-digit', month:'2-digit', year:'numeric' });
  const shortDate = date => format(date, { day:'numeric', month:'short', year:'numeric' });
  const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const birth = new Date(1994, 2, 12);
  const age = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), 2, 12) ? 1 : 0);
  const confirmBox = (title, message, cancelKey, acceptLabel) => `<div class="gt-confirm"><span class="gt-confirm-mark">!</span><small>${t('confirm')}</small><b>${title}</b><p>${message}</p><div><span class="gt-mini" data-k="${cancelKey}">${t('cancel')}</span><span class="gt-mini is-danger" data-k="${cancelKey}-ok">${acceptLabel}</span></div></div>`;
  const pullupsA = `${t('pullups')} (1) · ${t('overhand')}`, pullupsB = `${t('pullups')} (2) · ${t('underhand')}`;
  const libraryLabels = [t('dips'), pullupsA, pullupsB, t('bench')];

  /* ---------- Καταγραφή ---------- */
  const modes = [t('kg'), t('plates'), t('plates-kg'), t('bodyweight'), t('bodyweight-kg')];
  const setRow = (index, live, extra) => {
    const key = name => live ? ` data-k="${name}${index}"` : '';
    return `<div class="gt-row${extra ? ' is-extra is-entering gt-demo' : ''}" data-row="${index}"><span class="gt-row-n">${pad(index + 1)}</span><span class="gt-f gt-f-sm"${key('r')}><span class="gt-v"></span><i class="gt-ph">0</i></span><span class="gt-row-x">×</span><span class="gt-f gt-f-sm gt-select gt-mode"${key('m')}><span class="gt-v">${t('kg')}</span><em>▾</em></span><span class="gt-f gt-f-sm"${key('w')}><span class="gt-v"></span><i class="gt-ph">kg</i></span><b class="gt-row-remove"${key('rm')}>−</b></div>`;
  };
  const setHead = `<div class="gt-set-head"><span>${t('h-set')}</span><span>${t('h-reps')}</span><span></span><span class="gt-set-head-load">${t('h-load')}</span><span></span></div>`;
  const logCard = (index, name, cue, live) => `<article class="gt-card" data-c="${index}"><span class="gt-tape"></span>
    <div class="gt-card-title"><div><small>${t('exercise-n', { n:index + 1 })}</small><h4>${name}</h4></div><div class="gt-card-tools"><span class="gt-tag">${t('sets-n', { n:3 })}</span><b class="gt-x">×</b></div></div>
    <div class="gt-cue"><small>CUES</small><span>${cue}</span></div>
    ${setHead}
    <div class="gt-sets">${[0, 1, 2].map(n => setRow(n, live)).join('')}</div>
    <div class="gt-acts"><b class="gt-mini is-off"${live ? ' data-k="copy"' : ''}>${t('copy-first')}</b><b class="gt-link"${live ? ' data-k="extra"' : ''}>${t('extra')}</b></div>
    <div class="gt-lab">${t('exercise-notes')}</div>
    <div class="gt-f gt-area"${live ? ' data-k="com"' : ''}><span class="gt-v"></span><i class="gt-ph">${t('notes-hint')}</i></div>
  </article>`;
  // Η κάρτα της «Ελεύθερης» και της «＋ Προσθήκη άσκησης»: όνομα ή βιβλιοθήκη.
  const freeCard = (live, demo) => `<article class="gt-card gt-card-free${demo ? ' gt-demo' : ''}"><span class="gt-tape"></span>
    <div class="gt-card-title"><div class="gt-f gt-line gt-free-name"${live ? ' data-k="fname"' : ''}><span class="gt-v"></span><i class="gt-ph">${t('exercise-name')}</i></div><b class="gt-x">×</b></div>
    <div class="gt-lab">${t('from-library')}</div>
    <div class="gt-f gt-line gt-select"${live ? ' data-k="flib"' : ''}><span class="gt-v"></span><i class="gt-ph">${t('choose-exercise')}</i><em>▾</em></div>
    <div class="gt-lab">${t('set-count')}</div>
    <div class="gt-f gt-line gt-f-short"><span class="gt-v">3</span></div>
    ${setHead}
    <div class="gt-sets">${[0, 1, 2].map(n => setRow(n, false)).join('')}</div>
  </article>`;
  const deckTo = (c, position, dragging = false) => {
    const track = c.q('.gt-track');
    const total = track.children.length;
    track.classList.toggle('is-dragging', dragging);
    track.style.transform = `translateX(calc(${-position * 100}% - ${position * 10}px))`;
    const index = Math.round(position);
    c.text('.gt-sch .gt-deck-stamp', t('exercise-of', { n:pad(index + 1), total:pad(total) }));
    c.q('.gt-sch .gt-deck-progress i').style.width = `${(index + 1) / total * 100}%`;
  };
  const mode = (c, value) => {
    c.cls('[data-k=sch]', 'is-on', value === 'sch'); c.cls('[data-k=free]', 'is-on', value === 'free');
    c.cls(c.root, 'is-free', value === 'free');
  };
  const workouts = ['Push', 'Pull', 'Legs'];
  const historyCard = `<div class="gt-hcard">
      <div class="gt-hcard-date"><small>${format(today, { weekday:'long' })}</small><b>${shortDate(today)}</b><i>SESSION No 48</i></div>
      <div class="gt-hcard-body">
        <div class="gt-chips"><span>${t('n-exercises', { n:3 })}</span><span>9 WORKING SETS</span><i class="gt-logged">LOGGED</i><span>${t('planned-workout')}</span></div>
        <b class="gt-hcard-title">Push</b>
        <p>${[t('bench'), t('ohp'), t('dips')].join(', ')}</p>
        <div class="gt-hcard-acts"><b class="gt-check" data-k="h-select"><i></i>${t('select')}</b>
          <div class="gt-hcard-more"><b data-k="h-edit">${t('edit')}</b><b data-k="h-copy">${t('copy')}</b><b class="is-danger" data-k="h-delete">${t('delete-caps')}</b></div></div>
      </div></div>`;

  const log = {
    titles:['log.t1', 'log.t2', 'log.t3', 'log.t4', 'log.t5'],
    durations:[6200, 9800, 7800, 10200, 7600],
    html:() => `<div class="gt-scene gt-log">
      <div class="gt-lab gt-lab-first">${t('date')}</div>
      <div class="gt-f gt-line" data-k="date"><span class="gt-v"></span><i class="gt-ph">${dateText(today)}</i>${calendar}</div>
      <div class="gt-toggle gt-toggle-ink"><b data-k="sch" class="is-on">${t('scheduled')}</b><b data-k="free">${t('free')}</b></div>
      <div class="gt-dayfield"><div class="gt-lab">${t('day-workout')}</div>
        <div class="gt-f gt-line gt-select" data-k="day"><span class="gt-v"></span><i class="gt-ph">${t('choose')}</i><em>▾</em></div></div>
      <div class="gt-badge"><b>${format(today, { weekday:'long' })}</b><small>${shortDate(today)}</small></div>
      <div class="gt-sch">
        <div class="gt-intro"><span class="gt-intro-tag">FULL BODY</span><b data-k="workout">Push</b></div>
        <div class="gt-deck">
          <span class="gt-deck-stamp">${t('exercise-of', { n:'01', total:'03' })}</span>
          <div class="gt-deck-body"><b class="gt-arrow is-prev" data-k="prev">‹</b><div class="gt-deck-view"><div class="gt-track">${logCard(0, t('bench'), t('barbell'), true)}${logCard(1, t('ohp'), t('standing'))}${logCard(2, t('dips'), t('lean'))}</div></div><b class="gt-arrow is-next" data-k="next">›</b></div>
          <div class="gt-deck-progress"><i></i></div>
          <div class="gt-deck-add" data-k="add">${t('add-exercise')}</div>
        </div>
      </div>
      <div class="gt-free-deck">
        <div class="gt-deck"><span class="gt-deck-stamp">${t('exercise-of', { n:'01', total:'01' })}</span>
          <div class="gt-deck-view">${freeCard(false)}</div>
          <div class="gt-deck-progress is-full"><i></i></div>
          <div class="gt-deck-add">${t('add-exercise')}</div></div>
      </div>
      <div class="gt-lab">${t('session-notes')}</div>
      <div class="gt-f gt-area gt-area-tall"><span class="gt-v"></span><i class="gt-ph">${t('session-hint')}</i></div>
      <div class="gt-motto">${flex}EARN IT${flex}</div>
      <div class="gt-save" data-k="save">${t('finish')}</div>
    </div>`,
    prep:scene => {
      scene.querySelector('[data-k=date] .gt-v').textContent = dateText(today);
      scene.querySelector('[data-k=day] .gt-v').textContent = workouts[0];
    },
    steps:[
      async c => {
        await c.cam(null);
        await c.tap('[data-k=date]'); c.val('[data-k=date]', dateText(today)); c.flash('[data-k=date]'); await c.wait(380);
        await c.tap('[data-k=free]'); mode(c, 'free'); await c.wait(900);
        await c.tap('[data-k=sch]'); mode(c, 'sch'); await c.wait(300);
        await c.pick('[data-k=day]', workouts, 0);
        c.text('[data-k=workout]', workouts[0]); c.flash('[data-k=workout]'); await c.wait(420);
      },
      async c => {
        await c.cam('.gt-sch .gt-deck', 8);
        await c.drag('.gt-sch .gt-deck-view', -150, 0, v => deckTo(c, v * .55, true), { ax:.78, ay:.4, duration:620 });
        deckTo(c, 1); await c.wait(450);
        await c.tap('[data-k=next]'); deckTo(c, 2); await c.wait(450);
        await c.cam('[data-k=add]', 330);
        await c.tap('[data-k=add]');
        c.q('.gt-sch .gt-track').insertAdjacentHTML('beforeend', freeCard(true, true));
        deckTo(c, 3); await c.wait(450);
        await c.cam('.gt-sch .gt-deck', 8);
        await c.pick('[data-k=flib]', [t('choose-exercise'), ...libraryLabels], 1);
        c.val('[data-k=fname]', t('dips')); c.flash('[data-k=fname]'); await c.wait(450);
        await c.drag('.gt-sch .gt-deck-view', 150, 0, v => deckTo(c, 3 - v * .55, true), { ax:.22, ay:.4, duration:620 });
        deckTo(c, 2); await c.wait(380);
        await c.tap('[data-k=prev]'); deckTo(c, 1); await c.wait(380);
        await c.tap('[data-k=prev]'); deckTo(c, 0); await c.wait(300);
      },
      async c => {
        await c.cam('.gt-card[data-c="0"] .gt-set-head', 60);
        await c.tap('[data-k=r0]'); await c.type('[data-k=r0]', '10');
        await c.pick('[data-k=m0]', modes, 0, { browse:true });
        await c.tap('[data-k=w0]'); await c.type('[data-k=w0]', '60');
        c.cls('[data-k=copy]', 'is-off', false); c.flash('[data-k=copy]'); await c.wait(500);
      },
      async c => {
        await c.cam('.gt-card[data-c="0"] .gt-set-head', 40);
        await c.tap('[data-k=copy]');
        for (const index of [1, 2]) { c.val(`[data-k=r${index}]`, '10'); c.val(`[data-k=w${index}]`, '60'); c.flash(`[data-row="${index}"]`); }
        await c.wait(560);
        await c.tap('[data-k=extra]');
        c.q('.gt-card[data-c="0"] .gt-sets').insertAdjacentHTML('beforeend', setRow(3, true, true));
        await c.wait(520);
        await c.tap('[data-k=rm3]');
        const sheet = c.sheet(confirmBox(t('remove-set'), t('remove-set-message'), 'rs', t('remove')), 'center');
        await c.wait(900);
        await c.tap('[data-k=rs-ok]'); await c.close(sheet);
        c.cls('[data-row="3"]', 'is-leaving'); await c.wait(320); c.q('[data-row="3"]').remove();
        await c.cam('[data-k=com]', 110);
        await c.tap('[data-k=com]'); await c.type('[data-k=com]', t('note-demo'));
        await c.wait(300);
      },
      async c => {
        await c.cam('[data-k=save]', 260);
        await c.tap('[data-k=save]');
        const stamp = c.toast(t('logged'));
        await c.wait(1400);
        if (!c.fast) { stamp.classList.remove('is-shown'); await c.wait(200); }
        stamp.remove();
        c.sheet(`<div class="gt-history"><div class="gt-history-title">${t('history')}</div>${historyCard}</div>`, 'full');
        await c.wait(700);
        await c.tap('[data-k=h-select]');
        c.cls('.gt-hcard', 'is-selected'); await c.wait(300);
        await c.point('[data-k=h-edit]'); await c.point('[data-k=h-copy]'); await c.point('[data-k=h-delete]');
        await c.wait(300);
      },
    ],
  };

  /* ---------- Πρόγραμμα ---------- */
  const exCard = (id, name, cue, demo) => `<div class="gt-cc gt-ex${demo ? ' gt-demo' : ''}" data-e="${id}"><b><span class="gt-v">${name}</span></b><small><b>${t('cues')}:</b> <span class="gt-v">${cue}</span></small><span class="gt-ex-icons"><i data-k="pen">✎</i><i data-k="del">×</i></span></div>`;
  const routineCard = (id, name, days, items, active, demo) => `<article class="gt-cc gt-rt${active ? ' is-active' : ''}${demo ? ' gt-demo' : ''}" data-r="${id}">
      <div class="gt-rt-reg"><span></span><b class="gt-rt-live">${t('in-use')}</b><span class="gt-rt-kind">${t('routine')}</span></div>
      <b class="gt-rt-name">${name}</b>
      <ul class="gt-rt-list">${items.length ? items.map(item => `<li>${item}</li>`).join('') : `<li class="is-empty">${t('no-workout')}</li>`}</ul>
      <small class="gt-rt-len">${t('length-n', { n:days })}</small>
      <div class="gt-rt-btns"><span data-k="view">${eye}${t('view-plan')}</span><span class="is-gold" data-k="add"><em>＋</em>${t('add-workout')}</span></div>
      <div class="gt-rt-icons"><i class="gt-star" data-k="star">${active ? '★' : '☆'}</i><i>${duplicate}</i><i>✎</i><i class="is-danger">×</i></div>
    </article>`;
  const numberRoutines = root => root.querySelectorAll('.gt-rt').forEach((card, index) => { card.querySelector('.gt-rt-reg span').textContent = pad(index + 1); });
  const exerciseForm = `<div class="gt-sum" data-k="new-ex"><em></em>${t('new-exercise')}</div>
    <div class="gt-form" data-f="ex">
      <div class="gt-lab">${t('exercise-name')}</div><div class="gt-f gt-line" data-k="ex-name"><span class="gt-v"></span></div>
      <div class="gt-lab">${t('cues')}</div><div class="gt-f gt-line gt-area" data-k="ex-cue"><span class="gt-v"></span><i class="gt-ph">${t('cues-hint')}</i></div>
      <div class="gt-form-acts"><span class="gt-button" data-k="ex-save">${t('save-exercise')}</span><span class="gt-mini gt-cancel">${t('cancel')}</span></div>
    </div>
    <div class="gt-status" data-k="ex-status"></div>`;
  const routineForm = `<div class="gt-sum" data-k="new-rt"><em></em>${t('new-routine')}</div>
    <div class="gt-form" data-f="rt">
      <div class="gt-lab">${t('routine-name')}</div><div class="gt-f gt-line" data-k="rt-name"><span class="gt-v"></span><i class="gt-ph">${t('routine-hint')}</i></div>
      <div class="gt-form-row">
        <div><div class="gt-lab">${t('length')}</div><div class="gt-f gt-line" data-k="len"><span class="gt-v">7</span></div></div>
        <div><div class="gt-lab">${t('weekdays')}</div><div class="gt-toggle gt-toggle-gold gt-toggle-flush"><b data-k="no" class="is-on">${t('no')}</b><b data-k="yes">${t('yes')}</b></div></div>
      </div>
      <div class="gt-button" data-k="rt-create">${t('create')}</div>
    </div>`;
  const weekdays = t('weekday-names').split(',');
  const dayDialog = `<div class="gt-dialog"><span class="gt-dialog-x">×</span>
      <small class="gt-eyebrow">PUSH PULL LEGS</small><h4>${t('new-day-workout')}</h4>
      <div class="gt-lab">${t('day')}</div><div class="gt-f gt-line gt-select" data-k="pd-day"><span class="gt-v">${weekdays[0]}</span><em>▾</em></div>
      <div class="gt-lab">${t('workout-name')}</div><div class="gt-f gt-line" data-k="pd-name"><span class="gt-v"></span><i class="gt-ph">${t('workout-hint')}</i></div>
      <div class="gt-lab">${t('exercise-count')}</div><div class="gt-f gt-line gt-f-short" data-k="pd-count"><span class="gt-v">3</span></div>
      <div class="gt-dialog-sec">${t('workout-exercises')}</div>
      <div class="gt-builder"><span class="gt-builder-n">01</span><div>
        <div class="gt-lab gt-lab-first">${t('exercise')}</div><div class="gt-f gt-line gt-select" data-k="pd-ex"><span class="gt-v"></span><i class="gt-ph">${t('choose-exercise')}</i><em>▾</em></div>
        <div class="gt-lab">${t('work-sets')}</div><div class="gt-f gt-line gt-f-short"><span class="gt-v">3</span></div>
        <div class="gt-lab">${t('cues')}</div><div class="gt-f gt-line gt-area" data-k="pd-cue"><span class="gt-v"></span></div>
        <small class="gt-builder-note">${t('cues-set')}</small>
      </div><b class="gt-x">×</b></div>
      <div class="gt-button" data-k="pd-save">${t('save-day')}</div>
    </div>`;

  const plan = {
    titles:['plan.t1', 'plan.t2', 'plan.t3', 'plan.t4', 'plan.t5'],
    durations:[7600, 8600, 9400, 11800, 7800],
    html:() => `<div class="gt-scene gt-plan">
      <div class="gt-sec" data-s="lib">
        <div class="gt-sec-head" data-k="lib-toggle"><span><i>01</i>${t('my-exercises')}</span><small>03</small><em>▾</em></div>
        <div class="gt-sec-body">
          <div class="gt-count" data-k="ex-count">01 / 03</div>
          <div class="gt-car" data-car="ex">${exCard(1, t('pullups'), t('overhand'))}${exCard(2, t('pullups'), t('underhand'))}${exCard(0, t('bench'), t('barbell'))}<b class="gt-side is-prev" data-k="ex-prev">←</b><b class="gt-side is-next" data-k="ex-next">→</b></div>
          ${exerciseForm}
        </div>
      </div>
      <div class="gt-sec" data-s="rt">
        <div class="gt-sec-head" data-k="rt-toggle"><span><i>02</i>${t('my-routines')}</span><small>02</small><em>▾</em></div>
        <div class="gt-sec-body">
          <div class="gt-count" data-k="rt-count">01 / 02</div>
          <div class="gt-car gt-car-rt" data-car="rt">${routineCard(0, 'Full Body', 7, ['Full A', 'Full B'], true)}${routineCard(1, 'Upper Lower', 7, ['Upper', 'Lower'])}<b class="gt-side is-prev">←</b><b class="gt-side is-next">→</b></div>
          ${routineForm}
        </div>
      </div>
    </div>`,
    prep:scene => { numberRoutines(scene); carTo(scene, 'ex', 0); carTo(scene, 'rt', 0); },
    steps:[
      async c => {
        await c.cam(null);
        await c.tap('[data-k=lib-toggle]'); c.cls('[data-s=lib]', 'is-open'); await c.wait(450);
        await c.tap('[data-k=new-ex]'); c.cls('[data-k=new-ex]', 'is-open'); c.cls('[data-f=ex]', 'is-open'); await c.wait(250);
        await c.cam('[data-k=new-ex]', 40);
        await c.tap('[data-k=ex-name]'); await c.type('[data-k=ex-name]', t('dips'));
        await c.tap('[data-k=ex-cue]'); await c.type('[data-k=ex-cue]', t('lean'));
        await c.tap('[data-k=ex-save]');
        c.q('[data-car=ex]').insertAdjacentHTML('afterbegin', exCard(3, t('dips'), t('lean'), true));
        carTo(c.root, 'ex', 0);
        c.text('[data-k=lib-toggle] small', '04'); c.val('[data-k=ex-name]', ''); c.val('[data-k=ex-cue]', '');
        c.text('[data-k=ex-status]', t('exercise-saved'));
        await c.cam(null); await c.point('[data-e="3"]'); await c.wait(300);
      },
      async c => {
        await c.cam(null);
        await c.tap('[data-k=ex-next]'); carTo(c.root, 'ex', 1); await c.wait(450);
        await c.point('[data-e="1"] small');
        await c.tap('[data-k=ex-next]'); carTo(c.root, 'ex', 2); await c.wait(450);
        await c.point('[data-e="2"] small');
        await c.point('[data-e="2"] [data-k=pen]');
        await c.tap('[data-e="2"] [data-k=del]');
        const sheet = c.sheet(confirmBox(t('delete-exercise'), t('delete-warning', { name:t('pullups') }), 'dx', t('delete')), 'center');
        await c.wait(1300);
        await c.tap('[data-k=dx]'); await c.close(sheet);
      },
      async c => {
        await c.cam('[data-s=rt]', 6);
        await c.tap('[data-k=rt-toggle]'); c.cls('[data-s=rt]', 'is-open'); await c.wait(400);
        await c.cam('[data-k=new-rt]', 60);
        await c.tap('[data-k=new-rt]'); c.cls('[data-k=new-rt]', 'is-open'); c.cls('[data-f=rt]', 'is-open'); await c.wait(250);
        await c.tap('[data-k=rt-name]'); await c.type('[data-k=rt-name]', 'Push Pull Legs');
        await c.tap('[data-k=len]'); await c.type('[data-k=len]', '6');
        await c.tap('[data-k=yes]'); c.cls('[data-k=yes]', 'is-on'); c.cls('[data-k=no]', 'is-on', false); await c.wait(300);
        await c.tap('[data-k=rt-create]');
        c.q('[data-car=rt] .gt-side').insertAdjacentHTML('beforebegin', routineCard(2, 'Push Pull Legs', 6, [], false, true));
        numberRoutines(c.root); carTo(c.root, 'rt', 2);
        c.text('[data-k=rt-toggle] small', '03');
        c.val('[data-k=rt-name]', ''); c.val('[data-k=len]', '7'); c.cls('[data-k=no]', 'is-on'); c.cls('[data-k=yes]', 'is-on', false);
        const stamp = c.toast(t('routine-created', { name:'Push Pull Legs' }));
        await c.cam('[data-s=rt]', 6); await c.wait(1100);
        if (!c.fast) { stamp.classList.remove('is-shown'); await c.wait(200); }
        stamp.remove();
      },
      async c => {
        await c.cam('[data-car=rt]', 40);
        await c.tap('[data-r="2"] [data-k=add]');
        const sheet = c.sheet(dayDialog, 'full');
        await c.wait(400);
        await c.pick('[data-k=pd-day]', weekdays, 0);
        await c.tap('[data-k=pd-name]'); await c.type('[data-k=pd-name]', 'Push');
        await c.tap('[data-k=pd-count]'); await c.type('[data-k=pd-count]', '1');
        await c.pick('[data-k=pd-ex]', libraryLabels, 3);
        c.val('[data-k=pd-cue]', t('barbell')); c.flash('[data-k=pd-cue]'); await c.wait(400);
        await c.tap('[data-k=pd-save]'); await c.close(sheet);
        const list = c.q('[data-r="2"] .gt-rt-list');
        list.innerHTML = '<li class="gt-sample">Push</li>';
        c.flash(list); await c.wait(400);
        await c.tap('[data-r="2"] [data-k=star]');
        c.cls('[data-r="0"]', 'is-active', false); c.text('[data-r="0"] [data-k=star]', '☆');
        c.cls('[data-r="2"]', 'is-active'); c.text('[data-r="2"] [data-k=star]', '★');
        // Όπως στην αληθινή λίστα, το πρόγραμμα σε ισχύ περνά πρώτο.
        c.q('[data-car=rt]').prepend(c.q('[data-r="2"]'));
        numberRoutines(c.root); carTo(c.root, 'rt', 0); await c.wait(600);
        await c.point('[data-r="2"] [data-k=view]'); await c.wait(200);
      },
      async c => {
        await c.cam(null);
        await c.tap('[data-k=ex-next]'); carTo(c.root, 'ex', carIndex(c.root, 'ex') + 1); await c.wait(450);
        const past = c.sheet(`<div class="gt-past"><small>${t('history-tag')} · FULL BODY</small><b>${t('bench')}</b><span>${t('sets-line')}</span><i>LOGGED</i></div>`, 'bottom');
        await c.wait(600);
        await c.tap('[data-e="0"] [data-k=pen]');
        c.cls('[data-e="0"]', 'is-editing'); c.cls('[data-f=ex]', 'is-editing');
        c.val('[data-k=ex-name]', t('bench')); c.val('[data-k=ex-cue]', t('barbell')); c.text('[data-k=ex-status]', '');
        await c.tap('[data-k=ex-name]'); await c.type('[data-k=ex-name]', t('smith'));
        await c.tap('[data-k=ex-save]');
        c.val('[data-e="0"] b', t('smith')); c.cls('[data-e="0"]', 'is-editing', false); c.cls('[data-f=ex]', 'is-editing', false); c.flash('[data-e="0"]');
        c.val('[data-k=ex-name]', ''); c.val('[data-k=ex-cue]', ''); c.text('[data-k=ex-status]', t('exercise-saved'));
        await c.wait(300);
        const card = past.querySelector('.gt-past');
        await c.point(card); card.classList.add('is-stamped');
        await c.wait(900);
      },
    ],
  };

  /* ---------- Επίβλεψη ---------- */
  // Ίδιοι κανόνες με το modules/progress-chart.js: μία γραμμή φορτίου, σταθερό βήμα
  // ανά προπόνηση και αγκύλες με τις επαναλήψεις όπου το φορτίο μένει ίδιο.
  const chart = (() => {
    const kg = [50, 50, 50, 55, 55, 55, 57.5, 57.5, 60, 60, 60, 62.5], reps = [8, 9, 10, 8, 9, 10, 8, 10, 8, 9, 10, 8];
    const dates = kg.map((_, index) => format(daysAgo((kg.length - 1 - index) * 7), { day:'numeric', month:'short' }));
    const step = 52, x0 = 14, right = 16, width = x0 + step * (kg.length - 1) + right, height = 150, top = 12, axis = 112;
    const range = Math.max(...kg) - Math.min(...kg), floor = Math.min(...kg) - range * .15, ceiling = Math.max(...kg) + range * .15;
    const y = value => top + (ceiling - value) / (ceiling - floor) * (axis - top);
    const xs = kg.map((_, index) => x0 + index * step);
    let line = `M${xs[0]} ${y(kg[0])}`;
    for (let index = 1; index < kg.length; index++) {
      const middle = (xs[index - 1] + xs[index]) / 2;
      line += ` C${middle} ${y(kg[index - 1])} ${middle} ${y(kg[index])} ${xs[index]} ${y(kg[index])}`;
    }
    const ticks = Array.from({ length:5 }, (_, index) => floor + (ceiling - floor) * index / 4);
    const runs = [];
    for (let start = 0, index = 1; index <= kg.length; index++) if (index === kg.length || kg[index] !== kg[start]) { if (index - start > 1) runs.push([start, index - 1]); start = index; }
    const brackets = runs.map(([start, end], index) => {
      const x1 = xs[start], x2 = xs[end], pointY = y(kg[start]), below = pointY <= axis - 30;
      const bracketY = below ? pointY + 13 : pointY - 13, tick = below ? -4 : 4, labelY = below ? bracketY + 10 : bracketY - 5;
      const text = `${reps[start]} → ${reps[end]}`;
      const label = x2 - x1 >= 70
        ? `<text class="gt-cycle" x="${(x1 + x2) / 2}" y="${labelY}" text-anchor="middle">${text} <tspan>${t('reps-word')}</tspan></text>`
        : `<text class="gt-cycle" x="${(x1 + x2) / 2}" y="${labelY}" text-anchor="middle">${text.replace(/ /g, '')}</text>`;
      return `<g class="gt-bracket"${index === runs.length - 1 ? ' data-k="bracket"' : ''}><path d="M${x1} ${bracketY + tick} V${bracketY} H${x2} V${bracketY + tick}"/>${label}</g>`;
    }).join('');
    const svg = `<svg class="gt-plot" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <g class="gt-grid">${ticks.map(value => `<line x1="0" x2="${width - right}" y1="${y(value)}" y2="${y(value)}"/>`).join('')}</g>
      <line class="gt-axis" x1="0" x2="${width - right}" y1="${axis}" y2="${axis}"/>
      <path class="gt-line" d="${line}"/>${brackets}
      <g class="gt-dots">${xs.map((x, index) => `<circle cx="${x}" cy="${y(kg[index])}" r="3.4"/>`).join('')}</g>
      ${xs.map((x, index) => `<text class="gt-date" x="${x}" y="${axis + 10}" transform="rotate(-38 ${x} ${axis + 10})" text-anchor="end">${dates[index]}</text>`).join('')}
    </svg>`;
    const rail = `<svg class="gt-rail" viewBox="0 0 28 ${height}" aria-hidden="true">${ticks.map(value => `<text x="25" y="${y(value) + 3}" text-anchor="end">${Number(value.toFixed(1))}</text>`).join('')}<line x1="27.5" x2="27.5" y1="${top}" y2="${axis}"/></svg>`;
    return { svg, rail, width };
  })();
  const chartX = (root, x, dragging = false) => {
    const plot = root.querySelector('.gt-plot');
    plot.classList.toggle('is-dragging', dragging);
    plot.style.transform = `translateX(${-x}px)`;
  };
  const chartMax = root => Math.max(0, chart.width - root.querySelector('[data-k=chart]').offsetWidth);
  const exercises = [t('bench'), pullupsA, pullupsB, t('dips')];
  const audit = `${shortDate(daysAgo(64))} — ${t('audit-bodyweight')} · ${shortDate(daysAgo(15))} — ${t('audit-plates')}`;

  const progress = {
    titles:['progress.t1', 'progress.t2', 'progress.t3', 'progress.t4', 'progress.t5'],
    durations:[5600, 4400, 5200, 3000, 3800],
    html:() => `<div class="gt-scene gt-progress">
      <div class="gt-lab gt-lab-first">${t('exercise')}</div><div class="gt-f gt-line gt-select" data-k="ex"><span class="gt-v"></span><em>▾</em></div>
      <div class="gt-lab">${t('set')}</div><div class="gt-f gt-line gt-select" data-k="set"><span class="gt-v"></span><em>▾</em></div>
      <div class="gt-panel">
        <div class="gt-summary"><b>${t('bench')}</b><small>${t('records-n', { n:12 })}</small></div>
        <div class="gt-latest"><small>${t('latest')}</small><b>62.5 kg · 8 ${t('reps-word')}</b></div>
        <div class="gt-legend"><span class="gt-legend-kg"><i></i>kg</span></div>
        <div class="gt-chart">${chart.rail}<div class="gt-chart-scroll" data-k="chart">${chart.svg}</div></div>
        <div class="gt-warn" data-k="audit"><b>${t('audit-title', { n:2 })}</b><p>${t('audit-uses')} ${audit}</p></div>
      </div>
      <div class="gt-pr" data-k="pr">${trophy}<span>Personal Records</span></div>
      <div class="gt-records"><div class="gt-records-head"><b>${t('best-sets')}</b><i>PR</i></div>
        <div class="gt-record"><div><b>${t('dips')}</b><small>9 ${t('reps-word')}</small></div><strong>10<em>extra kg</em></strong></div>
        <div class="gt-record"><div><b>${t('pullups')}</b><small>12 ${t('reps-word')}</small></div><strong>12<em>${t('reps-short')}</em></strong></div>
        <div class="gt-record"><div><b>${t('bench')}</b><small>8 ${t('reps-word')}</small></div><strong>62.5<em>kg</em></strong></div></div>
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
        await c.cam('.gt-panel', 6);
        await c.point('.gt-legend-kg'); await c.wait(300);
        await c.point('[data-k=bracket]'); await c.wait(900);
      },
      async c => {
        await c.cam('.gt-panel', 6);
        const max = chartMax(c.root);
        await c.drag('[data-k=chart]', 150, 0, v => chartX(c.root, max - 150 * v, true), { ax:.25, ay:.45, duration:900 });
        await c.wait(250);
        await c.drag('[data-k=chart]', 150, 0, v => chartX(c.root, Math.max(0, max - 150 - 150 * v), true), { ax:.25, ay:.45, duration:900 });
        await c.wait(650);
        await c.drag('[data-k=chart]', -170, 0, v => chartX(c.root, Math.min(max, Math.max(0, max - 300) + 170 * v), true), { ax:.8, ay:.45, duration:800 });
        chartX(c.root, Math.min(max, Math.max(0, max - 300) + 170)); await c.wait(300);
      },
      async c => {
        await c.cam('[data-k=audit]', 90);
        await c.point('[data-k=audit]'); await c.wait(1100);
      },
      async c => {
        await c.cam('[data-k=pr]', 40);
        await c.tap('[data-k=pr]'); c.cls('.gt-records', 'is-open'); await c.wait(250);
        await c.cam('.gt-records', 60); await c.point('.gt-record'); await c.wait(900);
      },
    ],
  };

  /* ---------- Προφίλ ---------- */
  const slipHead = (title, key) => `<div class="gt-slip-head"><b>${title}</b><span data-k="${key}">${t('close-slip')}</span></div>`;
  const dirty = c => { c.text('[data-k=status]', t('unsaved')); c.cls('[data-k=profile-save]', 'is-shown'); };
  const profile = {
    titles:['profile.t1', 'profile.t2', 'profile.t3', 'profile.t4', 'profile.t5'],
    durations:[6600, 6800, 7400, 3600, 5200],
    html:() => `<div class="gt-scene gt-profile">
      <div class="gt-athlete"><span class="gt-elastic"></span>
        <div class="gt-athlete-top"><span class="gt-rings"><i></i><i></i></span><small data-k="status">${t('new-profile')}</small></div>
        <div class="gt-polaroid"><span class="gt-tape"></span>
          <div class="gt-photo" data-k="photo"><span class="gt-avatar">${silhouette}<span class="gt-photo-image"></span></span><em>${t('change-photo')}</em></div>
          <div class="gt-name" data-k="name"><span class="gt-v">${t('name-placeholder')}</span></div>
          <div class="gt-age" data-k="age"><span>${t('age')}</span><b><span class="gt-v">—</span><small data-k="age-unit"></small></b></div>
        </div>
        <div class="gt-athlete-foot">TRAIN . LOG . REPEAT</div>
      </div>
      <div class="gt-unit"><div class="gt-lab">${t('unit')}</div><div class="gt-toggle gt-toggle-gold gt-toggle-flush"><b data-k="kg" class="is-on">KG</b><b data-k="lb">LBS</b></div></div>
      <div class="gt-receipt" data-k="receipt"><div class="gt-receipt-button" data-k="export"><span>${t('export')}</span><i>↓</i></div>
        <div class="gt-receipt-paper"><p>${t('logged-workouts')} .. 48</p><hr><p>${t('file')}: logbook-istoriko-${isoDate(today)}.csv</p><small>${format(today, { day:'2-digit', month:'2-digit', year:'numeric' })}</small></div></div>
      <div class="gt-slip" data-slip="name">${slipHead(t('name-slip'), 'close-name')}<div class="gt-lab">${t('name')}</div><div class="gt-f gt-line" data-k="name-field"><span class="gt-v"></span><i class="gt-ph">${t('name-hint')}</i></div></div>
      <div class="gt-slip" data-slip="photo">${slipHead(t('photo-slip'), 'close-photo')}<div class="gt-photos"><span class="gt-upload" data-k="upload"><em>+</em>${t('upload')}<small>${t('formats')}</small></span><span class="gt-cell gt-photo-a" data-ph="1"><small></small></span><span class="gt-cell gt-photo-b" data-ph="2"><small></small></span></div></div>
      <div class="gt-slip" data-slip="birth">${slipHead(t('birth-slip'), 'close-birth')}
        <div class="gt-lab">${t('date')}</div><div class="gt-f gt-line" data-k="birth"><span class="gt-v"></span><i class="gt-ph">${dateText(birth)}</i>${calendar}</div>
        <div class="gt-readout"><div><small>${t('age')}</small><span data-k="readout-label">${t('no-date')}</span></div><b data-k="readout">—</b></div>
        <div class="gt-checkbox" data-k="hide-age"><i></i>${t('hide-age')}</div></div>
      <div class="gt-save gt-profile-save" data-k="profile-save">${t('save-profile')}</div>
    </div>`,
    steps:[
      async c => {
        await c.cam(null);
        await c.point('[data-k=photo]'); await c.point('[data-k=age]');
        await c.tap('[data-k=name]'); c.cls('[data-slip=name]', 'is-open'); await c.wait(250);
        await c.cam('[data-slip=name]', 40);
        await c.tap('[data-k=name-field]'); await c.type('[data-k=name-field]', t('demo-name'));
        c.val('[data-k=name]', t('demo-name')); dirty(c); await c.wait(250);
        await c.tap('[data-k=close-name]'); c.cls('[data-slip=name]', 'is-open', false);
        await c.cam(null); c.flash('[data-k=name]'); await c.point('[data-k=name]');
      },
      async c => {
        await c.cam(null);
        await c.tap('[data-k=photo]'); c.cls('[data-slip=photo]', 'is-open');
        await c.cam('[data-slip=photo]', 40);
        const use = selected => {
          c.q('[data-ph="1"] small').textContent = t(selected === 1 ? 'in-use-photo' : 'use-photo');
          c.q('[data-ph="2"] small').textContent = t(selected === 2 ? 'in-use-photo' : 'use-photo');
          c.cls('[data-ph="1"]', 'is-selected', selected === 1); c.cls('[data-ph="2"]', 'is-selected', selected === 2);
        };
        await c.tap('[data-k=upload]'); c.cls('[data-ph="1"]', 'is-shown'); use(1); await c.wait(300);
        await c.tap('[data-k=upload]'); c.cls('[data-ph="2"]', 'is-shown'); use(2); await c.wait(300);
        await c.tap('[data-ph="1"]'); use(1); c.cls('[data-k=photo]', 'has-image'); dirty(c); await c.wait(300);
        await c.tap('[data-k=close-photo]'); c.cls('[data-slip=photo]', 'is-open', false);
        await c.cam(null); await c.point('[data-k=photo]');
      },
      async c => {
        await c.cam(null);
        await c.tap('[data-k=age]'); c.cls('[data-slip=birth]', 'is-open');
        await c.cam('[data-slip=birth]', 40);
        await c.tap('[data-k=birth]'); await c.type('[data-k=birth]', dateText(birth));
        c.text('[data-k=readout]', String(age)); c.text('[data-k=readout-label]', t('years')); c.flash('[data-k=readout]');
        c.val('[data-k=age]', String(age)); c.text('[data-k=age-unit]', t('years')); dirty(c); await c.wait(300);
        await c.tap('[data-k=hide-age]'); c.cls('[data-k=hide-age]', 'is-on'); c.cls('[data-k=age]', 'is-hidden'); await c.wait(500);
        await c.tap('[data-k=hide-age]'); c.cls('[data-k=hide-age]', 'is-on', false); c.cls('[data-k=age]', 'is-hidden', false); await c.wait(200);
        await c.tap('[data-k=close-birth]'); c.cls('[data-slip=birth]', 'is-open', false);
        await c.cam(null); c.flash('[data-k=age]'); await c.point('[data-k=age]');
      },
      async c => {
        await c.cam('.gt-unit', 60);
        await c.tap('[data-k=lb]'); c.cls('[data-k=lb]', 'is-on'); c.cls('[data-k=kg]', 'is-on', false); await c.wait(500);
        await c.tap('[data-k=kg]'); c.cls('[data-k=kg]', 'is-on'); c.cls('[data-k=lb]', 'is-on', false); await c.wait(300);
      },
      async c => {
        await c.cam('[data-k=receipt]', 60);
        await c.tap('[data-k=export]'); c.cls('[data-k=receipt]', 'is-open'); await c.wait(900);
        await c.cam('[data-k=profile-save]', 220);
        await c.tap('[data-k=profile-save]');
        const stamp = c.toast(t('profile-saved'));
        c.cls('[data-k=profile-save]', 'is-shown', false); c.text('[data-k=status]', '');
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
