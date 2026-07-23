(function () {
  const locales = { el:'el-GR', en:'en-GB', fr:'fr-FR', de:'de-DE' };
  const languages = ['el', 'en', 'fr', 'de'];

  // Greek remains the stable source language so existing saved plans keep working.
  // Each entry is [English, French, German]. Longer phrases are applied first.
  const catalog = {
    'message.0001':['Οι προπονήσεις και τα προγράμματά σου παραμένουν συγχρονισμένα σε κάθε συσκευή.','Your workouts and routines stay synced on every device.','Vos séances et programmes restent synchronisés sur tous vos appareils.','Ihre Trainings und Pläne bleiben auf allen Geräten synchronisiert.'],
    'message.0002':['Ελέγχουμε αν υπάρχει ενεργή συνεδρία σε αυτή τη συσκευή.','Checking for an active session on this device.','Vérification d’une session active sur cet appareil.','Auf diesem Gerät wird nach einer aktiven Sitzung gesucht.'],
    'message.0003':['Φέρνουμε τις τελευταίες προπονήσεις και τα προγράμματά σας.','Fetching your latest workouts and routines.','Récupération de vos dernières séances et programmes.','Ihre neuesten Trainings und Pläne werden geladen.'],
    'message.0004':['Όλα είναι έτοιμα. Ανοίγουμε το Logbook.','Everything is ready. Opening Logbook.','Tout est prêt. Ouverture de Logbook.','Alles ist bereit. Logbook wird geöffnet.'],
    'message.0005':['Δεν φορτώθηκε η εφαρμογή. Δοκιμάστε ξανά.','The application did not load. Try again.','L’application ne s’est pas chargée. Réessayez.','Die Anwendung wurde nicht geladen. Versuchen Sie es erneut.'],
    'message.0006':['Δεν μπορέσαμε να ελέγξουμε τη σύνδεσή σας. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.','We could not check your session. Check the network and try again.','Impossible de vérifier votre session. Vérifiez le réseau et réessayez.','Ihre Sitzung konnte nicht geprüft werden. Prüfen Sie das Netzwerk und versuchen Sie es erneut.'],
    'message.0007':['Ο αρχικός συγχρονισμός δεν ολοκληρώθηκε. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.','Initial sync did not complete. Check the network and try again.','La synchronisation initiale a échoué. Vérifiez le réseau et réessayez.','Die erste Synchronisierung wurde nicht abgeschlossen. Prüfen Sie das Netzwerk und versuchen Sie es erneut.'],
    'message.0008':['Η υπηρεσία σύνδεσης δεν είναι διαθέσιμη. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.','The sign-in service is unavailable. Check the network and try again.','Le service de connexion est indisponible. Vérifiez le réseau et réessayez.','Der Anmeldedienst ist nicht verfügbar. Prüfen Sie das Netzwerk und versuchen Sie es erneut.'],
    'message.0009':['ΠΡΟΕΤΟΙΜΑΣΙΑ LOGBOOK','PREPARING LOGBOOK','PRÉPARATION DE LOGBOOK','LOGBOOK WIRD VORBEREITET'],
    'message.0010':['ΕΛΕΓΧΟΣ ΣΥΝΔΕΣΗΣ','CHECKING SESSION','VÉRIFICATION DE LA SESSION','SITZUNG WIRD GEPRÜFT'],
    'message.0011':['ΣΥΓΧΡΟΝΙΣΜΟΣ ΔΕΔΟΜΕΝΩΝ','SYNCING DATA','SYNCHRONISATION DES DONNÉES','DATEN WERDEN SYNCHRONISIERT'],
    'message.0012':['ΦΟΡΤΩΣΗ ΕΦΑΡΜΟΓΗΣ','LOADING APPLICATION','CHARGEMENT DE L’APPLICATION','ANWENDUNG WIRD GELADEN'],
    'message.0013':['Η ΣΥΝΔΕΣΗ ΔΙΑΚΟΠΗΚΕ','CONNECTION INTERRUPTED','CONNEXION INTERROMPUE','VERBINDUNG UNTERBROCHEN'],
    'message.0014':['ΠΡΟΣΠΑΘΕΙΑ ΞΑΝΑ','TRY AGAIN','RÉESSAYER','ERNEUT VERSUCHEN'],
    'message.0015':['ΗΜΕΡΟΛΟΓΙΟ ΠΡΟΠΟΝΗΣΗΣ','TRAINING JOURNAL','JOURNAL D’ENTRAÎNEMENT','TRAININGSTAGEBUCH'],
    'message.0016':['ΜΠΕΣ ΣΤΟ','ENTER THE','ENTREZ DANS','ÖFFNEN SIE'],
    'message.0017':['Logbook — Ημερολόγιο Προπόνησης','Logbook — Training Journal','Logbook — Journal d’entraînement','Logbook — Trainingstagebuch'],
    'message.0018':['Ημερολόγιο Προπόνησης','Training Journal','Journal d’entraînement','Trainingstagebuch'],
    'message.0019':['Το σημερινό σας πλάνο σας περιμένει. Καταγράψτε σετ, κιλά και επαναλήψεις — τα νούμερα χτίζουν την πρόοδο.','Today’s plan is waiting. Log sets, weight and reps — the numbers build progress.','Le programme du jour vous attend. Notez séries, charges et répétitions — les chiffres construisent vos progrès.','Der heutige Plan wartet. Erfassen Sie Sätze, Gewicht und Wiederholungen — Zahlen schaffen Fortschritt.'],
    'message.0020':['Κάρτα αθλητή. Σύρετε για να την μετακινήσετε στην αρχική σελίδα.','Athlete card. Drag to reposition it on the home page.','Carte d’athlète. Faites-la glisser pour la repositionner sur l’accueil.','Athletenkarte. Ziehen Sie sie, um sie auf der Startseite neu zu positionieren.'],
    'message.0021':['Κάρτα ενεργού προγράμματος. Σύρετε για να την μετακινήσετε στην αρχική σελίδα.','Active routine card. Drag to reposition it on the home page.','Carte du programme actif. Faites-la glisser pour la repositionner sur l’accueil.','Karte des aktiven Plans. Ziehen Sie sie, um sie auf der Startseite neu zu positionieren.'],
    'message.0022':['Επιλέξτε άλλη ημέρα μικρόκυκλου ή ξεκινήστε μια «Ελεύθερη» καταγραφή.','Choose another cycle day or start a “Free” log.','Choisissez un autre jour du cycle ou démarrez une saisie « Libre ».','Wählen Sie einen anderen Zyklustag oder starten Sie eine „Freie“ Erfassung.'],
    'message.0023':['Δηλώστε τις ημέρες του πρώτου σας προγράμματος','Set the days of your first routine','Définissez les jours de votre premier programme','Legen Sie die Tage Ihres ersten Plans fest'],
    'message.0024':['ΔΗΜΙΟΥΡΓΙΑ ΠΡΟΓΡΑΜΜΑΤΟΣ','CREATE A ROUTINE','CRÉER UN PROGRAMME','PLAN ERSTELLEN'],
    'message.0025':['Προσθέστε την πρώτη ημέρα προπόνησης','Add the first training day','Ajoutez le premier jour d’entraînement','Fügen Sie den ersten Trainingstag hinzu'],
    'message.0026':['ΑΝΟΙΓΜΑ ΠΡΟΓΡΑΜΜΑΤΟΣ','OPEN ROUTINE','OUVRIR LE PROGRAMME','PLAN ÖFFNEN'],
    'message.0027':['Γρήγορη πλοήγηση','Quick navigation','Navigation rapide','Schnellnavigation'],
    'message.0028':['Διαχείριση προγραμμάτων','Routine management','Gestion des programmes','Planverwaltung'],
    'message.0029':['Διάρκεια (σε ημέρες)','Duration (days)','Durée (jours)','Dauer (Tage)'],
    'message.0030':['Δήλωση ημερών','Use weekdays','Utiliser les jours de la semaine','Wochentage verwenden'],
    'message.0031':['Μονάδα μέτρησης','Measurement unit','Unité de mesure','Maßeinheit'],
    'message.0032':['Εξαγωγή ιστορικού','Export history','Exporter l’historique','Verlauf exportieren'],
    'message.0033':['Δεν υπάρχουν καταγεγραμμένες προπονήσεις για εξαγωγή.','There are no logged workouts to export.','Aucune séance enregistrée n’est disponible pour l’export.','Es sind keine erfassten Trainings zum Exportieren vorhanden.'],
    'message.0034':['Δεν ήταν δυνατή η εξαγωγή του ιστορικού.','History could not be exported.','L’historique n’a pas pu être exporté.','Der Verlauf konnte nicht exportiert werden.'],
    'message.0035':['ΑΡΧΕΙΟ','FILE','FICHIER','DATEI'],
    'message.0036':['Λεπτομέρειες προπόνησης','Workout details','Détails de la séance','Trainingsdetails'],
    'message.0037':['Κλείσιμο προπόνησης','Close workout','Fermer la séance','Training schließen'],
    'message.0038':['Άνοιγμα προπόνησης','Open workout','Ouvrir la séance','Training öffnen'],
    'message.0039':['Διαγραφή προπόνησης','Delete workout','Supprimer la séance','Training löschen'],
    'message.0040':['Τρόπος καταγραφής βάρους για το σετ','Weight entry method for set','Mode de saisie de la charge pour la série','Gewichtserfassung für Satz'],
    'message.0041':['Διαγραφή extra σετ','Delete extra set','Supprimer la série supplémentaire','Extrasatz löschen'],
    'message.0042':['από 4 στάδια επιβράβευσης','of 4 reward stages','sur 4 niveaux de récompense','von 4 Belohnungsstufen'],
    'message.0043':['συνεχόμενη εβδομάδα','consecutive week','semaine consécutive','Woche in Folge'],
    'message.0044':['συνεχόμενες εβδομάδες','consecutive weeks','semaines consécutives','Wochen in Folge'],
    'message.0045':['συνεχόμενος μικρόκυκλος','consecutive cycle','cycle consécutif','Zyklus in Folge'],
    'message.0046':['συνεχόμενοι μικρόκυκλοι','consecutive cycles','cycles consécutifs','Zyklen in Folge'],
    'message.0047':['αυτή την εβδομάδα','this week','cette semaine','diese Woche'],
    'message.0048':['σε αυτόν τον μικρόκυκλο','in this cycle','dans ce cycle','in diesem Zyklus'],
    'message.0049':['Κενό πρόγραμμα','Empty routine','Programme vide','Leerer Plan'],
    'message.0050':['ΠΡΟΓΡΑΜΜΑ','ROUTINE','PROGRAMME','PLAN'],
    'message.0051':['ΙΣΤΟΡΙΚΟ','HISTORY','HISTORIQUE','VERLAUF'],
    'message.0052':['Όχι','No','Non','Nein'],
    'message.0053':['Ναι','Yes','Oui','Ja'],
    'message.0054':['Δημιουργήστε όσα εβδομαδιαία προγράμματα θέλετε. Το πρόγραμμα με το αστέρι είναι το ενεργό — αυτό ανοίγει στην Καταγραφή.','Create as many weekly routines as you like. The starred routine is active — it opens in Log.','Créez autant de programmes hebdomadaires que vous le souhaitez. Le programme étoilé est actif — il s’ouvre dans Saisie.','Erstellen Sie beliebig viele Wochenpläne. Der Plan mit Stern ist aktiv — er öffnet sich unter Erfassen.'],
    'message.0055':['Μία μέτρηση δεν ορίζει την πορεία. Το γράφημα δείχνει βάρος και επαναλήψεις ανά σετ, προπόνηση με προπόνηση.','One measurement does not define your journey. The chart tracks weight and reps per set, workout by workout.','Une mesure ne définit pas votre progression. Le graphique suit charge et répétitions par série, séance après séance.','Ein einzelner Wert bestimmt nicht Ihren Weg. Das Diagramm zeigt Gewicht und Wiederholungen pro Satz, Training für Training.'],
    'message.0056':['Τα βασικά στοιχεία του αθλητή, συγκεντρωμένα σε μία καθαρή κάρτα. Επιλέξτε ένα έτοιμο avatar ή ανεβάστε τη δική σας εικόνα.','Your essential athlete details in one clear card. Choose an avatar or upload your own image.','Les informations essentielles de l’athlète réunies sur une carte claire. Choisissez un avatar ou importez votre image.','Ihre wichtigsten Athletendaten auf einer übersichtlichen Karte. Wählen Sie einen Avatar oder laden Sie ein eigenes Bild hoch.'],
    'message.0057':['Χρειάζονται τουλάχιστον δύο καταγραφές της άσκησης με συγκρίσιμη μονάδα βάρους.','At least two logs of the exercise with a comparable weight unit are required.','Il faut au moins deux saisies de l’exercice avec une unité de poids comparable.','Mindestens zwei Einträge der Übung mit vergleichbarer Gewichtseinheit sind nötig.'],
    'message.0058':['Άλλαξε όνομα προπόνησης, άσκησης ή ημέρα. Θέλετε οι παλιές καταγραφές να διατηρήσουν τα ιστορικά τους ονόματα ή να ενημερωθούν μαζί με το Πρόγραμμα;','A workout name, exercise or day changed. Should old logs keep their historical names or update with the Plan?','Un nom de séance, un exercice ou un jour a changé. Les anciennes saisies doivent-elles garder leurs noms ou suivre le Programme ?','Ein Trainingsname, eine Übung oder ein Tag wurde geändert. Sollen alte Einträge ihre Namen behalten oder mit dem Plan aktualisiert werden?'],
    'message.0059':['Επιλέξτε το πρόγραμμα άλλης ημέρας ή ξεκινήστε μια «Ελεύθερη» καταγραφή.','Choose another day’s workout or start a “Free” log.','Choisissez la séance d’un autre jour ou démarrez une saisie « Libre ».','Wählen Sie das Training eines anderen Tages oder starten Sie eine „Freie“ Erfassung.'],
    'message.0060':['Ολοκληρώστε την πρώτη προπόνηση και αρχίστε να χτίζετε το αρχείο σας.','Complete your first workout and start building your record.','Terminez votre première séance et commencez à construire votre historique.','Schließen Sie Ihr erstes Training ab und beginnen Sie, Ihr Archiv aufzubauen.'],
    'message.0061':['Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σας.','Personal bests are calculated automatically from your logs.','Les meilleures performances sont calculées automatiquement à partir de vos saisies.','Bestleistungen werden automatisch aus Ihren Einträgen berechnet.'],
    'message.0062':['Καταγράψτε τουλάχιστον δύο ίδια σετ για να δείτε πρόοδο.','Log at least two matching sets to see progress.','Saisissez au moins deux séries comparables pour voir les progrès.','Erfassen Sie mindestens zwei vergleichbare Sätze, um Fortschritt zu sehen.'],
    'message.0063':['Το ήδη καταγεγραμμένο Ιστορικό θα παραμείνει.','Existing workout history will remain.','L’historique déjà enregistré sera conservé.','Der bestehende Trainingsverlauf bleibt erhalten.'],
    'message.0064':['Το Ιστορικό προπονήσεων θα παραμείνει.','Workout history will remain.','L’historique des séances sera conservé.','Der Trainingsverlauf bleibt erhalten.'],
    'message.0065':['Θα χαθούν όλα τα σετ και οι μετρήσεις της.','All its sets and measurements will be lost.','Toutes ses séries et mesures seront perdues.','Alle Sätze und Messwerte gehen verloren.'],
    'message.0066':['Διορθώστε τις τιμές που θέλετε και αποθηκεύστε ξανά.','Adjust the values you want and save again.','Corrigez les valeurs souhaitées et enregistrez à nouveau.','Passen Sie die gewünschten Werte an und speichern Sie erneut.'],
    'message.0067':['Προσαρμόστε ό,τι εκτελέσατε σήμερα και ολοκληρώστε τη νέα προπόνηση.','Adjust what you completed today, then finish the new workout.','Adaptez ce que vous avez réalisé aujourd’hui, puis terminez la nouvelle séance.','Passen Sie an, was Sie heute absolviert haben, und schließen Sie dann das neue Training ab.'],
    'message.0068':['Συμπληρώστε όσα πραγματικά εκτελέσατε.','Enter what you actually completed.','Saisissez ce que vous avez réellement effectué.','Tragen Sie ein, was Sie tatsächlich absolviert haben.'],
    'message.0069':['Η πρώτη καταγραφή είναι η γραμμή εκκίνησης.','Your first log is the starting line.','Votre première saisie est la ligne de départ.','Ihr erster Eintrag ist die Startlinie.'],
    'message.0070':['Ο ρυθμός ξεκίνησε. Η επόμενη καταγραφή τον χτίζει.','The rhythm has started. The next log builds it.','Le rythme est lancé. La prochaine saisie le renforce.','Der Rhythmus ist gestartet. Der nächste Eintrag baut ihn aus.'],
    'message.0071':['Η γραμμή εκκίνησης είναι εδώ.','The starting line is here.','La ligne de départ est ici.','Die Startlinie ist hier.'],
    'message.0072':['Τα σημεία αναφοράς θα έρθουν.','Your benchmarks will appear here.','Vos repères apparaîtront ici.','Ihre Richtwerte erscheinen hier.'],
    'message.0073':['Η πορεία χτίζεται με επαναλήψεις.','Progress is built rep by rep.','Les progrès se construisent répétition après répétition.','Fortschritt entsteht Wiederholung für Wiederholung.'],
    'message.0074':['Έναρξη καταγραφής','Start logging','Commencer la saisie','Erfassung starten'],
    'message.0075':['Άνοιγμα Καταγραφής','Open the Log','Ouvrir la saisie','Erfassung öffnen'],
    'message.0076':['Δεν υπάρχει αρκετός χώρος για την εικόνα. Χρειάζεται μικρότερο αρχείο.','There is not enough space for the image. A smaller file is needed.','L’espace est insuffisant pour l’image. Un fichier plus petit est nécessaire.','Für das Bild ist nicht genug Speicher vorhanden. Es wird eine kleinere Datei benötigt.'],
    'message.0077':['Η εικόνα πρέπει να είναι μικρότερη από 10 MB.','The image must be smaller than 10 MB.','L’image doit faire moins de 10 Mo.','Das Bild muss kleiner als 10 MB sein.'],
    'message.0078':['Δεν ήταν δυνατή η επεξεργασία της εικόνας.','The image could not be processed.','Impossible de traiter l’image.','Das Bild konnte nicht verarbeitet werden.'],
    'message.0079':['Δεν ήταν δυνατή η ανάγνωση της εικόνας.','The image could not be read.','Impossible de lire l’image.','Das Bild konnte nicht gelesen werden.'],
    'message.0080':['Το αρχείο εικόνας δεν είναι έγκυρο.','The image file is invalid.','Le fichier image n’est pas valide.','Die Bilddatei ist ungültig.'],
    'message.0081':['Επιλογή εικόνας JPG, PNG ή WEBP.','Choose a JPG, PNG or WEBP image.','Choisissez une image JPG, PNG ou WEBP.','Wählen Sie ein JPG-, PNG- oder WEBP-Bild.'],
    'message.0082':['Χρειάζεται να υπάρχει τουλάχιστον ένα πρόγραμμα','At least one routine is required','Au moins un programme est requis','Mindestens ein Plan ist erforderlich'],
    'message.0083':['Χρειάζεται τουλάχιστον μία άσκηση','At least one exercise is required','Au moins un exercice est requis','Mindestens eine Übung ist erforderlich'],
    'message.0084':['Επιλογή ημερομηνίας προπόνησης','Choose a workout date','Choisissez une date de séance','Wählen Sie ein Trainingsdatum'],
    'message.0085':['Όλες οι ημέρες έχουν πρόγραμμα','All days have a workout','Tous les jours ont une séance','Alle Tage haben ein Training'],
    'message.0086':['Δεν έχει δηλωθεί πρόγραμμα','No routine has been set','Aucun programme défini','Kein Plan festgelegt'],
    'message.0087':['Δεν έχει οριστεί προπόνηση','No workout has been set','Aucune séance définie','Kein Training festgelegt'],
    'message.0088':['Δεν υπάρχει ορισμένη προπόνηση για','There is no workout set for','Aucune séance n’est prévue pour','Kein Training festgelegt für'],
    'message.0089':['Δεν υπάρχουν προπονήσεις','No workouts available','Aucune séance disponible','Keine Trainings verfügbar'],
    'message.0090':['Δεν υπάρχουν ασκήσεις','No exercises available','Aucun exercice disponible','Keine Übungen verfügbar'],
    'message.0091':['Δεν υπάρχουν σετ','No sets available','Aucune série disponible','Keine Sätze verfügbar'],
    'message.0092':['Ενημέρωση παλιού Ιστορικού','Update previous History','Mettre à jour l’ancien historique','Früheren Verlauf aktualisieren'],
    'message.0093':['Πρόγραμμα + Ιστορικό','Plan + History','Programme + Historique','Plan + Verlauf'],
    'message.0094':['Μόνο Πρόγραμμα','Plan only','Programme uniquement','Nur Plan'],
    'message.0095':['Διαγραφή εβδομαδιαίου προγράμματος','Delete weekly routine','Supprimer le programme hebdomadaire','Wochenplan löschen'],
    'message.0096':['Διαγραφή ημέρας προγράμματος','Delete workout day','Supprimer le jour du programme','Trainingstag löschen'],
    'message.0097':['ΕΠΙΒΕΒΑΙΩΣΗ','CONFIRMATION','CONFIRMATION','BESTÄTIGUNG'],
    'message.0098':['ΕΚΤΕΛΕΣΗ ΠΡΟΠΟΝΗΣΗΣ','WORKOUT EXECUTION','EXÉCUTION DE LA SÉANCE','TRAININGSAUSFÜHRUNG'],
    'message.0099':['Οδηγίες σελίδας','Page guide','Guide de la page','Seitenanleitung'],
    'message.0100':['ΟΔΗΓΙΕΣ','GUIDE','GUIDE','ANLEITUNG'],
    'message.0101':['Διαλέξτε ημερομηνία και «Από το πρόγραμμα» ή «Ελεύθερη» προπόνηση.','Choose a date and either a “Scheduled” or “Free” workout.','Choisissez une date et une séance « Depuis le programme » ou « Libre ».','Wählen Sie ein Datum und ein Training „Nach Plan“ oder „Frei“.'],
    'message.0102':['Μετακινηθείτε στις κάρτες ασκήσεων με τα βέλη ή με σύρσιμο.','Move through the exercise cards with the arrows or by swiping.','Parcourez les cartes d’exercices avec les flèches ou en les faisant glisser.','Wechseln Sie mit den Pfeilen oder durch Wischen zwischen den Übungskarten.'],
    'message.0103':['Καταγράψτε επαναλήψεις και επιλέξτε κιλά, πλάκες, συνδυασμό ή Bodyweight.','Log reps and choose kg, plates, a combination or Bodyweight.','Notez les répétitions et choisissez kg, disques, une combinaison ou le poids du corps.','Erfassen Sie Wiederholungen und wählen Sie kg, Scheiben, eine Kombination oder Körpergewicht.'],
    'message.0104':['Καταγράψτε επαναλήψεις και επιλέξτε λίβρες, πλάκες, συνδυασμό ή Bodyweight.','Log reps and choose lbs, plates, a combination or Bodyweight.','Notez les répétitions et choisissez lbs, disques, une combinaison ou le poids du corps.','Erfassen Sie Wiederholungen und wählen Sie lbs, Scheiben, eine Kombination oder Körpergewicht.'],
    'message.0105':['Προσθέστε ή αφαιρέστε σετ, αντιγράψτε το πρώτο στα υπόλοιπα και γράψτε σχόλια όπου χρειάζεται.','Add or remove sets, copy the first to the rest and add notes where needed.','Ajoutez ou retirez des séries, copiez la première sur les autres et ajoutez des notes si nécessaire.','Fügen Sie Sätze hinzu oder entfernen Sie sie, kopieren Sie den ersten auf die übrigen und ergänzen Sie bei Bedarf Notizen.'],
    'message.0106':['Με «Ολοκλήρωση προπόνησης» η καταγραφή αποθηκεύεται στο Ιστορικό. Από εκεί μπορείτε να τη διορθώσετε ή να την αντιγράψετε.','“Complete workout” saves the log to History. From there you can edit or copy it.','« Terminer la séance » enregistre la saisie dans l’historique. Vous pouvez ensuite la modifier ou la copier.','„Training abschließen“ speichert den Eintrag im Verlauf. Dort können Sie ihn bearbeiten oder kopieren.'],
    'message.0107':['Δημιουργήστε όσα προγράμματα θέλετε, με διάρκεια 3–10 ημερών και προαιρετική δήλωση ημερών εβδομάδας.','Create as many routines as you like, lasting 3–10 days, with optional weekdays.','Créez autant de programmes que vous le souhaitez, sur 3 à 10 jours, avec des jours de semaine facultatifs.','Erstellen Sie beliebig viele Pläne mit 3–10 Tagen und optionalen Wochentagen.'],
    'message.0108':['Προσθέστε σε κάθε προπόνηση όνομα, ασκήσεις, εργάσιμα σετ και cues.','Add a name, exercises, working sets and cues to each workout.','Ajoutez à chaque séance un nom, des exercices, des séries de travail et des consignes.','Fügen Sie jedem Training einen Namen, Übungen, Arbeitssätze und Hinweise hinzu.'],
    'message.0109':['Ανοίξτε ένα πρόγραμμα για επεξεργασία, αντιγραφή ή διαγραφή και ορίστε με το αστέρι ποιο είναι ενεργό.','Open a routine to edit, copy or delete it, and use the star to make it active.','Ouvrez un programme pour le modifier, le copier ou le supprimer, puis utilisez l’étoile pour l’activer.','Öffnen Sie einen Plan zum Bearbeiten, Kopieren oder Löschen und aktivieren Sie ihn mit dem Stern.'],
    'message.0110':['Όταν αλλάζετε ημέρα ή ονόματα, επιλέξτε αν θα ενημερωθεί μαζί και το παλιό Ιστορικό.','When changing a day or names, choose whether previous History should update too.','Lorsque vous changez un jour ou des noms, choisissez si l’ancien historique doit aussi être mis à jour.','Wählen Sie beim Ändern eines Tages oder Namens, ob der frühere Verlauf ebenfalls aktualisiert werden soll.'],
    'message.0111':['Το γράφημα συγκρίνει βάρος ή πλάκες και δείχνει την πορεία των επαναλήψεων στο ίδιο φορτίο.','The chart compares weight or plates and shows how reps progress at the same load.','Le graphique compare la charge ou les disques et montre l’évolution des répétitions à charge égale.','Das Diagramm vergleicht Gewicht oder Scheiben und zeigt die Wiederholungsentwicklung bei gleicher Last.'],
    'message.0112':['Καταγραφές με ασύμβατη μέτρηση εξαιρούνται και εμφανίζονται στον έλεγχο κάτω από το γράφημα.','Logs with an incompatible measurement are excluded and listed below the chart.','Les saisies avec une mesure incompatible sont exclues et signalées sous le graphique.','Einträge mit inkompatibler Messart werden ausgeschlossen und unter dem Diagramm aufgeführt.'],
    'message.0113':['Ανοίξτε το «Personal Records» για τα καλύτερα σετ κάθε άσκησης και τρόπου μέτρησης.','Open “Personal Records” for the best sets in each exercise and measurement method.','Ouvrez « Personal Records » pour voir les meilleures séries de chaque exercice et mode de mesure.','Öffnen Sie „Personal Records“ für die besten Sätze jeder Übung und Messart.'],
    'message.0114':['Ανεβάστε έως έξι εικόνες και επιλέξτε ποια θα χρησιμοποιείται στο προφίλ.','Upload up to six images and choose which one to use for your profile.','Importez jusqu’à six images et choisissez celle à utiliser pour votre profil.','Laden Sie bis zu sechs Bilder hoch und wählen Sie das Profilbild aus.'],
    'message.0115':['Δηλώστε ημερομηνία γέννησης και επιλέξτε αν η ηλικία θα φαίνεται στην κάρτα.','Enter your date of birth and choose whether age appears on the card.','Indiquez votre date de naissance et choisissez si l’âge apparaît sur la carte.','Geben Sie Ihr Geburtsdatum ein und wählen Sie, ob das Alter auf der Karte erscheint.'],
    'message.0116':['Αποθηκεύστε τις αλλαγές για να ενημερωθούν η Αρχική και το μενού.','Save your changes to update Home and the menu.','Enregistrez les modifications pour mettre à jour l’accueil et le menu.','Speichern Sie die Änderungen, um Startseite und Menü zu aktualisieren.'],
    'message.0117':['Συμπληρώστε όνομα, ημερομηνία γέννησης και βάρος.','Fill in your name, birth date and weight.','Renseignez nom, date de naissance et poids.','Tragen Sie Name, Geburtsdatum und Gewicht ein.'],
    'message.0118':['Διαλέξτε έτοιμο avatar ή ανεβάστε δική σας εικόνα.','Choose a ready-made avatar or upload your own image.','Choisissez un avatar prêt à l’emploi ou importez votre image.','Wählen Sie einen fertigen Avatar oder laden Sie ein eigenes Bild hoch.'],
    'message.0119':['Ανεβάστε τη δική σας εικόνα προφίλ.','Upload your own profile image.','Importez votre propre image de profil.','Laden Sie Ihr eigenes Profilbild hoch.'],
    'message.0120':['Η κάρτα αθλητή ενημερώνεται αυτόματα και εμφανίζεται στην Αρχική.','The athlete card updates automatically and appears on Home.','La carte d’athlète se met à jour automatiquement et apparaît sur l’Accueil.','Die Athletenkarte aktualisiert sich automatisch und erscheint auf der Startseite.'],
    'message.0121':['Επιλέξτε από τα φίλτρα προπόνηση, άσκηση και σετ.','Use the filters to pick a workout, exercise and set.','Utilisez les filtres pour choisir séance, exercice et série.','Wählen Sie über die Filter Training, Übung und Satz.'],
    'message.0122':['ΕΒΔΟΜΑΔΙΑΙΟ ΠΛΑΝΟ','WEEKLY PLAN','PROGRAMME HEBDOMADAIRE','WOCHENPLAN'],
    'message.0123':['01 / ΕΒΔΟΜΑΔΙΑΙΕΣ ΡΟΥΤΙΝΕΣ','01 / WEEKLY ROUTINES','01 / PROGRAMMES HEBDOMADAIRES','01 / WOCHENPLÄNE'],
    'message.0124':['ΤΑ ΠΡΟΓΡΑΜΜΑΤΑ ΣΑΣ','YOUR ROUTINES','VOS PROGRAMMES','IHRE PLÄNE'],
    'message.0125':['ΝΕΟ ΠΡΟΓΡΑΜΜΑ','NEW ROUTINE','NOUVEAU PROGRAMME','NEUER PLAN'],
    'message.0126':['ΟΡΙΣΜΟΣ ΜΙΚΡΟΚΥΚΛΟΥ','TRAINING CYCLE SETUP','DÉFINITION DU MICROCYCLE','TRAININGSZYKLUS FESTLEGEN'],
    'message.0127':['Πλοήγηση προγραμμάτων','Routine navigation','Navigation des programmes','Plannavigation'],
    'message.0128':['Προγράμματα προπόνησης','Training routines','Programmes d’entraînement','Trainingspläne'],
    'message.0129':['Προηγούμενο πρόγραμμα','Previous routine','Programme précédent','Vorheriger Plan'],
    'message.0130':['Επόμενο πρόγραμμα','Next routine','Programme suivant','Nächster Plan'],
    'message.0131':['ΕΝΕΡΓΟ ΠΡΟΓΡΑΜΜΑ','ACTIVE ROUTINE','PROGRAMME ACTIF','AKTIVER PLAN'],
    'message.0132':['ΗΜΕΡΕΣ','DAYS','JOURS','TAGE'],
    'message.0133':['ΔΙΑΡΚΕΙΑ','DURATION','DURÉE','DAUER'],
    'message.0134':['ΑΣΚΗΣΕΙΣ ΠΡΟΠΟΝΗΣΗΣ','WORKOUT EXERCISES','EXERCICES DE LA SÉANCE','TRAININGSÜBUNGEN'],
    'message.0135':['ΣΥΧΝΟΤΗΤΑ 7 ΗΜΕΡΩΝ','7-DAY FREQUENCY','FRÉQUENCE SUR 7 JOURS','7-TAGE-FREQUENZ'],
    'message.0136':['Ιστορικό προπονήσεων','Workout history','Historique des séances','Trainingsverlauf'],
    'message.0137':['Η ΣΕΛΙΔΑ ΤΗΣ ΠΡΟΠΟΝΗΣΗΣ','THE WORKOUT PAGE','LA PAGE DE LA SÉANCE','DIE TRAININGSSEITE'],
    'message.0138':['Η σελίδα της προπόνησης','The workout page','La page de la séance','Die Trainingsseite'],
    'message.0139':['ΚΛΕΙΣΙΜΟ ΣΕΛΙΔΑΣ ↑','CLOSE PAGE ↑','FERMER LA PAGE ↑','SEITE SCHLIESSEN ↑'],
    'message.0140':['ΣΗΜΕΙΩΣΕΙΣ','NOTES','NOTES','NOTIZEN'],
    'message.0141':['Δεν καταγράφηκαν σετ.','No sets were logged.','Aucune série n’a été saisie.','Keine Sätze wurden erfasst.'],
    'message.0142':['Σωματικό βάρος','Bodyweight','Poids du corps','Körpergewicht'],
    'message.0143':['ΚΑΛΥΤΕΡΑ ΣΕΤ','BEST SETS','MEILLEURES SÉRIES','BESTE SÄTZE'],
    'message.0144':['Άνοιγμα Personal Records','Open Personal Records','Ouvrir les Personal Records','Personal Records öffnen'],
    'message.0145':['Κλείσιμο Personal Records','Close Personal Records','Fermer les Personal Records','Personal Records schließen'],
    'message.0146':['ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ','BASIC DETAILS','INFORMATIONS DE BASE','GRUNDDATEN'],
    'message.0147':['ΑΠΟΘΗΚΕΥΣΗ ΠΡΟΦΙΛ','SAVE PROFILE','ENREGISTRER LE PROFIL','PROFIL SPEICHERN'],
    'message.0148':['ΟΝΟΜΑ','NAME','NOM','NAME'],
    'message.0149':['ΝΕΟ ΠΡΟΦΙΛ','NEW PROFILE','NOUVEAU PROFIL','NEUES PROFIL'],
    'message.0150':['ΕΙΚΟΝΑ','IMAGE','IMAGE','BILD'],
    'message.0151':['ΑΝΕΒΑΣΜΑ ΕΙΚΟΝΑΣ','UPLOAD IMAGE','IMPORTER UNE IMAGE','BILD HOCHLADEN'],
    'message.0152':['ΑΛΛΑΓΗ ΦΩΤΟΓΡΑΦΙΑΣ','CHANGE PHOTO','CHANGER LA PHOTO','FOTO ÄNDERN'],
    'message.0153':['Αλλαγή φωτογραφίας','Change photo','Changer la photo','Foto ändern'],
    'message.0154':['Αλλαγή ονόματος','Change name','Changer le nom','Namen ändern'],
    'message.0155':['ΦΩΤΟΓΡΑΦΙΕΣ ΠΡΟΦΙΛ','PROFILE PHOTOS','PHOTOS DE PROFIL','PROFILFOTOS'],
    'message.0156':['Φωτογραφίες προφίλ','Profile photos','Photos de profil','Profilfotos'],
    'message.0157':['ΑΝΕΒΑΣΜΑ ΝΕΑΣ','UPLOAD NEW','IMPORTER UNE NOUVELLE','NEUES HOCHLADEN'],
    'message.0158':['ΚΛΕΙΣΙΜΟ','CLOSE','FERMER','SCHLIESSEN'],
    'message.0159':['ΗΜΕΡΟΜΗΝΙΑ ΓΕΝΝΗΣΗΣ','DATE OF BIRTH','DATE DE NAISSANCE','GEBURTSDATUM'],
    'message.0160':['Απόκρυψη ηλικίας από την κάρτα','Hide age from the card','Masquer l’âge sur la carte','Alter auf der Karte ausblenden'],
    'message.0161':['Η ημερομηνία μένει αποθηκευμένη — απλώς δεν φαίνεται στην κάρτα.','The date stays saved — it just is not shown on the card.','La date reste enregistrée — elle n’apparaît simplement pas sur la carte.','Das Datum bleibt gespeichert — es wird nur nicht auf der Karte angezeigt.'],
    'message.0162':['ΣΕ ΧΡΗΣΗ','IN USE','UTILISÉE','IN VERWENDUNG'],
    'message.0163':['ΕΠΙΛΟΓΗ','SELECT','CHOISIR','AUSWÄHLEN'],
    'message.0164':['Φωτογραφία σε χρήση','Photo in use','Photo utilisée','Verwendetes Foto'],
    'message.0165':['Χρήση αυτής της φωτογραφίας','Use this photo','Utiliser cette photo','Dieses Foto verwenden'],
    'message.0166':['Συμπληρώστε όνομα για την κάρτα.','Enter a name for the card.','Saisissez un nom pour la carte.','Geben Sie einen Namen für die Karte ein.'],
    'message.0167':['Συμπληρώστε έγκυρη ημερομηνία γέννησης.','Enter a valid date of birth.','Saisissez une date de naissance valide.','Geben Sie ein gültiges Geburtsdatum ein.'],
    'message.0168':['ΑΛΛΑΓΗ ΕΙΚΟΝΑΣ','CHANGE IMAGE','CHANGER L’IMAGE','BILD ÄNDERN'],
    'message.0169':['Η εικόνα είναι έτοιμη','Image ready','Image prête','Bild bereit'],
    'message.0170':['ΜΗ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ','UNSAVED CHANGES','MODIFICATIONS NON ENREGISTRÉES','NICHT GESPEICHERTE ÄNDERUNGEN'],
    'message.0171':['ΤΟ ΑΠΟΤΥΠΩΜΑ','MARK','L’EMPREINTE','DIE SPUR'],
    'message.0172':['ΜΕΝΕΙ.','REMAINS.','RESTE.','BLEIBT.'],
    'message.0173':['ΤΟ ΠΛΑΝΟ','PLAN','LE PLAN','DER PLAN'],
    'message.0174':['ΟΔΗΓΕΙ.','LEADS.','GUIDE.','FÜHRT.'],
    'message.0175':['Η ΔΟΥΛΕΙΑ','WORK','LE TRAVAIL','DIE ARBEIT'],
    'message.0176':['ΜΙΛΑΕΙ.','SPEAKS.','PARLE.','SPRICHT.'],
    'message.0177':['Η ΠΟΡΕΙΑ','PROGRESS','LA PROGRESSION','DER FORTSCHRITT'],
    'message.0178':['ΦΑΙΝΕΤΑΙ.','SHOWS.','SE VOIT.','ZEIGT SICH.'],
    'message.0179':['ΣΗΜΕΡΑ','TODAY','AUJOURD’HUI','HEUTE'],
    'message.0180':['ΤΟ ΣΗΜΕΡΑ.','TODAY.','AUJOURD’HUI.','HEUTE.'],
    'message.0181':['ΜΕΤΡΑΕΙ.','COUNTS.','COMPTE.','ZÄHLT.'],
    'message.0182':['ΠΛΟΗΓΗΣΗ','NAVIGATION','NAVIGATION','NAVIGATION'],
    'message.0183':['Μετάβαση στο Ιστορικό','Go to History','Accéder à l’historique','Zum Verlauf'],
    'message.0184':['Κλείσιμο μενού','Close menu','Fermer le menu','Menü schließen'],
    'message.0185':['Κύρια πλοήγηση','Main navigation','Navigation principale','Hauptnavigation'],
    'message.0186':['Μετάβαση στην Αρχική','Go to Home','Accéder à l’accueil','Zur Startseite'],
    'message.0187':['ΚΑΤΑΓΡΑΦΗ ΠΡΟΠΟΝΗΣΗΣ','WORKOUT LOG','SAISIE D’ENTRAÎNEMENT','TRAININGSEINTRAG'],
    'message.0188':['Η σημερινή προπόνηση καταγράφηκε — η ανάπτυξη έρχεται με την ξεκούραση','Today’s workout is logged — growth comes with rest','L’entraînement du jour est enregistré — la croissance vient avec le repos','Das heutige Training ist erfasst — Wachstum kommt mit der Erholung'],
    'message.0189':['ΠΕΡΙΣΣΟΤΕΡΑ ΑΠΟ ΜΙΑ ΚΑΤΑΓΡΑΦΗ.','MORE THAN A LOG.','PLUS QU’UNE SAISIE.','MEHR ALS EIN EINTRAG.'],
    'message.0190':['Ένας χώρος που θα μεγαλώνει μαζί με την κοινότητα — ήχος, ιστορίες και ιδέες για την επόμενη προπόνηση.','A space that will grow with the community — sound, stories and ideas for the next workout.','Un espace qui grandira avec la communauté — sons, histoires et idées pour la prochaine séance.','Ein Ort, der mit der Community wächst — Sound, Geschichten und Ideen fürs nächste Training.'],
    'message.0191':['Προσεχείς προτάσεις κοινότητας','Upcoming community recommendations','Prochaines recommandations de la communauté','Kommende Empfehlungen der Community'],
    'message.0192':['PODCAST ΤΗΣ ΕΒΔΟΜΑΔΑΣ','PODCAST OF THE WEEK','PODCAST DE LA SEMAINE','PODCAST DER WOCHE'],
    'message.0193':['ΣΥΝΤΟΜΑ','COMING SOON','BIENTÔT','BALD'],
    'message.0194':['Αρχική','Home','Accueil','Start'],
    'message.0195':['Γλώσσα εφαρμογής','Application language','Langue de l’application','Anwendungssprache'],
    'message.0196':['ΓΛΩΣΣΑ','LANGUAGE','LANGUE','SPRACHE'],
    'message.0197':['Καταγραφή','Log','Saisie','Erfassen'],
    'message.0198':['Πρόγραμμα','Plan','Programme','Plan'],
    'message.0199':['Ιστορικό','History','Historique','Verlauf'],
    'message.0200':['Επαναλήψεις','Reps','Répétitions','Wiederholungen'],
    'message.0201':['Μέτρηση','Measure','Mesure','Messart'],
    'message.0202':['Πλάκες','Plates','Disques','Scheiben'],
    'message.0203':['Βάρος (kg)','Weight (kg)','Charge (kg)','Gewicht (kg)'],
    'message.0204':['Βάρος (lbs)','Weight (lbs)','Charge (lbs)','Gewicht (lbs)'],
    'message.0205':['Επίβλεψη','Progress','Progression','Fortschritt'],
    'message.0206':['Προφίλ','Profile','Profil','Profil'],
    'message.0207':['ΛΟΓΑΡΙΑΣΜΟΣ','ACCOUNT','COMPTE','KONTO'],
    'message.0208':['Λογαριασμός','Account','Compte','Konto'],
    'message.0209':['ΤΟΠΙΚΗ ΛΕΙΤΟΥΡΓΙΑ','LOCAL MODE','MODE LOCAL','LOKALER MODUS'],
    'message.0210':['ΧΩΡΙΣ ΣΥΝΔΕΣΗ','SIGNED OUT','DÉCONNECTÉ','ABGEMELDET'],
    'message.0211':['ΣΥΝΔΕΔΕΜΕΝΟΣ','SIGNED IN','CONNECTÉ','ANGEMELDET'],
    'message.0212':['Κλείσιμο λογαριασμού','Close account','Fermer le compte','Konto schließen'],
    'message.0213':['Επιλογή σύνδεσης ή εγγραφής','Choose sign in or sign up','Choisir connexion ou inscription','Anmelden oder registrieren wählen'],
    'message.0214':['ΚΑΡΤΑ ΜΕΛΟΥΣ','MEMBER CARD','CARTE DE MEMBRE','MITGLIEDSKARTE'],
    'message.0215':['ΣΥΝΕΧΕΙΑ ΜΕ GOOGLE','CONTINUE WITH GOOGLE','CONTINUER AVEC GOOGLE','WEITER MIT GOOGLE'],
    'message.0216':['Ή ΜΕ EMAIL','OR WITH EMAIL','OU AVEC UN E-MAIL','ODER MIT E-MAIL'],
    'message.0217':['ΣΥΝΔΕΣΗ','SIGN IN','CONNEXION','ANMELDEN'],
    'message.0218':['ΕΓΓΡΑΦΗ','SIGN UP','INSCRIPTION','REGISTRIEREN'],
    'message.0219':['Email','Email','E-mail','E-Mail'],
    'message.0220':['Κωδικός','Password','Mot de passe','Passwort'],
    'message.0221':['Ξεχάσατε τον κωδικό πρόσβασης','Forgot your password','Mot de passe oublié','Passwort vergessen'],
    'message.0222':['Γράψτε το email του λογαριασμού σας και θα σας στείλουμε ασφαλή σύνδεσμο αλλαγής κωδικού.','Enter your account email and we will send you a secure password reset link.','Saisissez l’e-mail de votre compte et nous vous enverrons un lien sécurisé pour changer votre mot de passe.','Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden Ihnen einen sicheren Link zum Ändern Ihres Passworts.'],
    'message.0223':['ΑΠΟΣΤΟΛΗ ΣΥΝΔΕΣΜΟΥ','SEND LINK','ENVOYER LE LIEN','LINK SENDEN'],
    'message.0224':['ΕΠΙΣΤΡΟΦΗ ΣΤΗ ΣΥΝΔΕΣΗ','BACK TO SIGN IN','RETOUR À LA CONNEXION','ZURÜCK ZUR ANMELDUNG'],
    'message.0225':['Ορίστε έναν νέο κωδικό πρόσβασης για τον λογαριασμό σας.','Set a new password for your account.','Définissez un nouveau mot de passe pour votre compte.','Legen Sie ein neues Passwort für Ihr Konto fest.'],
    'message.0226':['Νέος κωδικός','New password','Nouveau mot de passe','Neues Passwort'],
    'message.0227':['Επιβεβαίωση νέου κωδικού','Confirm new password','Confirmer le nouveau mot de passe','Neues Passwort bestätigen'],
    'message.0228':['ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ','CHANGE PASSWORD','CHANGER LE MOT DE PASSE','PASSWORT ÄNDERN'],
    'message.0229':['Τουλάχιστον 8 χαρακτήρες','At least 8 characters','Au moins 8 caractères','Mindestens 8 Zeichen'],
    'message.0230':['ΣΥΝΔΕΣΗ ΣΤΟΝ ΛΟΓΑΡΙΑΣΜΟ','SIGN IN TO ACCOUNT','SE CONNECTER AU COMPTE','BEIM KONTO ANMELDEN'],
    'message.0231':['Επιβεβαίωση κωδικού','Confirm password','Confirmer le mot de passe','Passwort bestätigen'],
    'message.0232':['ΔΗΜΙΟΥΡΓΙΑ ΛΟΓΑΡΙΑΣΜΟΥ','CREATE ACCOUNT','CRÉER LE COMPTE','KONTO ERSTELLEN'],
    'message.0233':['Η σύνδεση είναι ενεργή σε αυτή τη συσκευή.','Your session is active on this device.','Votre session est active sur cet appareil.','Ihre Sitzung ist auf diesem Gerät aktiv.'],
    'message.0234':['Τοπική αποθήκευση · συνδεθείτε για συγχρονισμό.','Local storage · sign in to sync.','Stockage local · connectez-vous pour synchroniser.','Lokale Speicherung · zum Synchronisieren anmelden.'],
    'message.0235':['Τοπική αποθήκευση · αναμονή για συγχρονισμό.','Local storage · waiting to sync.','Stockage local · en attente de synchronisation.','Lokale Speicherung · Synchronisierung ausstehend.'],
    'message.0236':['Πατήστε τη φωτογραφία, το όνομα ή την ηλικία πάνω στην κάρτα.','Tap the photo, name, or age on the card.','Touchez la photo, le nom ou l’âge sur la carte.','Tippen Sie auf Foto, Name oder Alter auf der Karte.'],
    'message.0237':['Εκτός σύνδεσης','Offline','Hors ligne','Offline'],
    'message.0238':['Εκτός σύνδεσης · οι αλλαγές μένουν σε αυτή τη συσκευή.','Offline · changes remain on this device.','Hors ligne · les modifications restent sur cet appareil.','Offline · Änderungen bleiben auf diesem Gerät.'],
    'message.0239':['Εκκίνηση εκτός σύνδεσης με τα δεδομένα αυτής της συσκευής.','Starting offline with this device’s data.','Démarrage hors ligne avec les données de cet appareil.','Offline-Start mit den Daten dieses Geräts.'],
    'message.0240':['Η σύνδεση επανήλθε · συγχρονισμός δεδομένων…','Connection restored · syncing data…','Connexion rétablie · synchronisation des données…','Verbindung wiederhergestellt · Daten werden synchronisiert…'],
    'message.0241':['Συγχρονισμός δεδομένων…','Syncing data…','Synchronisation des données…','Daten werden synchronisiert…'],
    'message.0242':['Συγχρονισμένο σε όλες τις συσκευές.','Synced across all devices.','Synchronisé sur tous les appareils.','Auf allen Geräten synchronisiert.'],
    'message.0243':['Ήρθαν αλλαγές από άλλη συσκευή. Θα εφαρμοστούν μόλις αποθηκεύσετε.','Changes arrived from another device. They will apply once you save.','Des modifications sont arrivées d’un autre appareil. Elles s’appliqueront après l’enregistrement.','Änderungen von einem anderen Gerät sind eingetroffen. Sie werden nach dem Speichern übernommen.'],
    'message.0244':['Δεν ολοκληρώθηκε ο συγχρονισμός. Οι αλλαγές παραμένουν ασφαλείς στη συσκευή.','Sync did not complete. Changes remain safe on this device.','La synchronisation a échoué. Les modifications restent en sécurité sur cet appareil.','Synchronisierung fehlgeschlagen. Änderungen bleiben sicher auf diesem Gerät.'],
    'message.0245':['Δεν ήταν δυνατή η εκκίνηση του συγχρονισμού.','Sync could not be started.','Impossible de démarrer la synchronisation.','Synchronisierung konnte nicht gestartet werden.'],
    'message.0246':['Cloud εκτός σύνδεσης · τα δεδομένα παραμένουν τοπικά.','Cloud offline · data remains local.','Cloud hors ligne · les données restent locales.','Cloud offline · Daten bleiben lokal.'],
    'message.0247':['ΑΠΟΣΥΝΔΕΣΗ','SIGN OUT','DÉCONNEXION','ABMELDEN'],
    'message.0248':['ΔΙΑΓΡΑΦΗ ΛΟΓΑΡΙΑΣΜΟΥ','DELETE ACCOUNT','SUPPRIMER LE COMPTE','KONTO LÖSCHEN'],
    'message.0249':['ΜΗ ΑΝΑΣΤΡΕΨΙΜΗ ΕΝΕΡΓΕΙΑ','IRREVERSIBLE ACTION','ACTION IRRÉVERSIBLE','UNWIDERRUFLICHE AKTION'],
    'message.0250':['Οριστική διαγραφή λογαριασμού','Permanently delete account','Supprimer définitivement le compte','Konto endgültig löschen'],
    'message.0251':['Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον λογαριασμό σας; Όλα τα συγχρονισμένα δεδομένα σας θα διαγραφούν από τη βάση και δεν θα μπορούν να ανακτηθούν. Τα τοπικά δεδομένα θα παραμείνουν σε αυτή τη συσκευή.','Are you sure you want to permanently delete your account? All your synced data will be deleted from the database and cannot be recovered. Local data will remain on this device.','Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Toutes vos données synchronisées seront supprimées de la base de données et ne pourront pas être récupérées. Les données locales resteront sur cet appareil.','Möchten Sie Ihr Konto wirklich endgültig löschen? Alle synchronisierten Daten werden aus der Datenbank gelöscht und können nicht wiederhergestellt werden. Lokale Daten bleiben auf diesem Gerät.'],
    'message.0252':['ΑΚΥΡΩΣΗ','CANCEL','ANNULER','ABBRECHEN'],
    'message.0253':['ΝΑΙ, ΔΙΑΓΡΑΦΗ','YES, DELETE','OUI, SUPPRIMER','JA, LÖSCHEN'],
    'message.0254':['Γίνεται οριστική διαγραφή του λογαριασμού σας…','Permanently deleting your account…','Suppression définitive de votre compte…','Ihr Konto wird endgültig gelöscht…'],
    'message.0255':['Δεν ήταν δυνατή η διαγραφή του λογαριασμού. Δοκιμάστε ξανά.','The account could not be deleted. Try again.','Le compte n’a pas pu être supprimé. Réessayez.','Das Konto konnte nicht gelöscht werden. Versuchen Sie es erneut.'],
    'message.0256':['Οι προπονήσεις παραμένουν σε αυτή τη συσκευή μέχρι να ενεργοποιηθεί ο συγχρονισμός.','Workouts remain on this device until sync is enabled.','Les séances restent sur cet appareil jusqu’à l’activation de la synchronisation.','Trainings bleiben auf diesem Gerät, bis die Synchronisierung aktiviert ist.'],
    'message.0257':['Η σύνδεση στο cloud φορτώνει…','Cloud connection is loading…','Connexion au cloud en cours…','Cloud-Verbindung wird geladen…'],
    'message.0258':['Το cloud δεν είναι διαθέσιμο. Η τοπική λειτουργία συνεχίζεται.','Cloud is unavailable. Local mode remains active.','Le cloud est indisponible. Le mode local reste actif.','Die Cloud ist nicht verfügbar. Der lokale Modus bleibt aktiv.'],
    'message.0259':['Δεν ήταν δυνατή η ανάκτηση της σύνδεσης.','The session could not be restored.','Impossible de restaurer la session.','Die Sitzung konnte nicht wiederhergestellt werden.'],
    'message.0260':['Δεν ήταν δυνατή η σύνδεση. Ελέγξτε email και κωδικό.','Sign in failed. Check your email and password.','Échec de la connexion. Vérifiez votre e-mail et votre mot de passe.','Anmeldung fehlgeschlagen. Prüfen Sie E-Mail und Passwort.'],
    'message.0261':['Αποστολή συνδέσμου αλλαγής κωδικού…','Sending password reset link…','Envoi du lien de changement de mot de passe…','Link zum Ändern des Passworts wird gesendet…'],
    'message.0262':['Δεν ήταν δυνατή η αποστολή του συνδέσμου. Δοκιμάστε ξανά.','The link could not be sent. Try again.','Le lien n’a pas pu être envoyé. Réessayez.','Der Link konnte nicht gesendet werden. Versuchen Sie es erneut.'],
    'message.0263':['Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο αλλαγής κωδικού.','If an account exists for this email, you will receive a password reset link.','Si un compte existe pour cet e-mail, vous recevrez un lien pour changer votre mot de passe.','Wenn für diese E-Mail ein Konto existiert, erhalten Sie einen Link zum Ändern des Passworts.'],
    'message.0264':['Αλλαγή κωδικού…','Changing password…','Modification du mot de passe…','Passwort wird geändert…'],
    'message.0265':['Δεν ήταν δυνατή η αλλαγή του κωδικού. Ζητήστε νέο σύνδεσμο.','The password could not be changed. Request a new link.','Le mot de passe n’a pas pu être modifié. Demandez un nouveau lien.','Das Passwort konnte nicht geändert werden. Fordern Sie einen neuen Link an.'],
    'message.0266':['Μεταφορά στη Google…','Redirecting to Google…','Redirection vers Google…','Weiterleitung zu Google…'],
    'message.0267':['Δεν ήταν δυνατή η σύνδεση με Google.','Google sign in failed.','Échec de la connexion avec Google.','Google-Anmeldung fehlgeschlagen.'],
    'message.0268':['Ξεκινήστε πρώτα τον τοπικό server και ανοίξτε το Logbook από http://localhost:3000/.','Start the local server first and open Logbook at http://localhost:3000/.','Démarrez d’abord le serveur local et ouvrez Logbook sur http://localhost:3000/.','Starten Sie zuerst den lokalen Server und öffnen Sie Logbook unter http://localhost:3000/.'],
    'message.0269':['Δεν ήταν δυνατή η δημιουργία λογαριασμού.','The account could not be created.','Impossible de créer le compte.','Das Konto konnte nicht erstellt werden.'],
    'message.0270':['Οι κωδικοί δεν ταιριάζουν.','Passwords do not match.','Les mots de passe ne correspondent pas.','Die Passwörter stimmen nicht überein.'],
    'message.0271':['Συνδεθήκατε επιτυχώς.','You are signed in.','Vous êtes connecté.','Sie sind angemeldet.'],
    'message.0272':['Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό.','Check your email to confirm your account.','Consultez votre e-mail pour confirmer votre compte.','Prüfen Sie Ihre E-Mail, um Ihr Konto zu bestätigen.'],
    'message.0273':['Δεν ήταν δυνατή η αποσύνδεση.','Sign out failed.','Échec de la déconnexion.','Abmeldung fehlgeschlagen.'],
    'message.0274':['Αποσυνδεθήκατε. Τα τοπικά δεδομένα παραμένουν στη συσκευή.','You are signed out. Local data remains on the device.','Vous êtes déconnecté. Les données locales restent sur l’appareil.','Sie sind abgemeldet. Lokale Daten bleiben auf dem Gerät.'],
    'message.0275':['Μενού','Menu','Menu','Menü'],
    'message.0276':['Ημερομηνία γέννησης','Date of birth','Date de naissance','Geburtsdatum'],
    'message.0277':['Ημερομηνία','Date','Date','Datum'],
    'message.0278':['Τύπος προπόνησης','Workout type','Type de séance','Trainingsart'],
    'message.0279':['Από το πρόγραμμα','From plan','Depuis le programme','Aus dem Plan'],
    'message.0280':['Ελεύθερη προπόνηση','Free workout','Séance libre','Freies Training'],
    'message.0281':['ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ','FREE WORKOUT','SÉANCE LIBRE','FREIES TRAINING'],
    'message.0282':['ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ','PLANNED WORKOUT','SÉANCE PLANIFIÉE','GEPLANTES TRAINING'],
    'message.0283':['Ελεύθερη','Free','Libre','Frei'],
    'message.0284':['Προπόνηση ημέρας','Day’s workout','Séance du jour','Tagestraining'],
    'message.0285':['Προσθήκη άσκησης','Add exercise','Ajouter un exercice','Übung hinzufügen'],
    'message.0286':['Σχόλια προπόνησης','Workout notes','Notes de séance','Trainingsnotizen'],
    'message.0287':['Πώς πήγε συνολικά η σημερινή προπόνηση;','How did today’s workout go overall?','Comment s’est passée la séance aujourd’hui ?','Wie lief das heutige Training insgesamt?'],
    'message.0288':['Ακύρωση διορθώσεων','Cancel changes','Annuler les corrections','Änderungen verwerfen'],
    'message.0289':['Ακύρωση αντιγραφής','Cancel copy','Annuler la copie','Kopieren abbrechen'],
    'message.0290':['ΟΛΟΚΛΗΡΩΣΗ ΠΡΟΠΟΝΗΣΗΣ','COMPLETE WORKOUT','TERMINER LA SÉANCE','TRAINING ABSCHLIESSEN'],
    'message.0291':['Ολοκλήρωση προπόνησης','Complete workout','Terminer la séance','Training abschließen'],
    'message.0292':['Αποθήκευση διορθώσεων','Save changes','Enregistrer les corrections','Änderungen speichern'],
    'message.0293':['Νέα εβδομαδιαία ρουτίνα','New weekly routine','Nouveau programme hebdomadaire','Neuer Wochenplan'],
    'message.0294':['Δημιουργία','Create','Créer','Erstellen'],
    'message.0295':['Νέα προπόνηση ημέρας','New day workout','Nouvelle séance du jour','Neues Tagestraining'],
    'message.0296':['Νέα προπόνηση','New workout','Nouvelle séance','Neues Training'],
    'message.0297':['Αποθήκευση προπόνησης','Save workout','Enregistrer la séance','Training speichern'],
    'message.0298':['Ενημέρωση προπόνησης','Update workout','Mettre à jour la séance','Training aktualisieren'],
    'message.0299':['Ημέρα','Day','Jour','Tag'],
    'message.0300':['Όνομα προπόνησης','Workout name','Nom de la séance','Trainingsname'],
    'message.0301':['Όνομα','Name','Nom','Name'],
    'message.0302':['Αριθμός ασκήσεων','Number of exercises','Nombre d’exercices','Anzahl Übungen'],
    'message.0303':['Ακύρωση επεξεργασίας','Cancel editing','Annuler la modification','Bearbeitung abbrechen'],
    'message.0304':['Αποθήκευση ημέρας','Save day','Enregistrer le jour','Tag speichern'],
    'message.0305':['Ενημέρωση ημέρας','Update day','Mettre à jour le jour','Tag aktualisieren'],
    'message.0306':['ΤΟ ΠΛΑΝΟ ΣΑΣ','YOUR PLAN','VOTRE PROGRAMME','IHR PLAN'],
    'message.0307':['Προπόνηση','Workout','Séance','Training'],
    'message.0308':['Ημέρα ξεκούρασης','Rest day','Jour de repos','Ruhetag'],
    'message.0309':['Επεξεργασία','Edit','Modifier','Bearbeiten'],
    'message.0310':['Διαγραφή ημέρας','Delete day','Supprimer le jour','Tag löschen'],
    'message.0311':['εργάσιμα σετ','working sets','séries de travail','Arbeitssätze'],
    'message.0312':['Εργάσιμα σετ','Working sets','Séries de travail','Arbeitssätze'],
    'message.0313':['Όνομα προγράμματος','Routine name','Nom du programme','Planname'],
    'message.0314':['Αποθήκευση ονόματος','Save name','Enregistrer le nom','Name speichern'],
    'message.0315':['Ακύρωση μετονομασίας','Cancel rename','Annuler le renommage','Umbenennen abbrechen'],
    'message.0316':['ΣΤΗΝ ΚΑΤΑΓΡΑΦΗ','ACTIVE IN LOG','ACTIF DANS SAISIE','AKTIV IN ERFASSEN'],
    'message.0317':['Ενεργό πρόγραμμα','Active routine','Programme actif','Aktiver Plan'],
    'message.0318':['Ορισμός ως ενεργό πρόγραμμα','Set as active routine','Définir comme programme actif','Als aktiven Plan festlegen'],
    'message.0319':['Μετονομασία προγράμματος','Rename routine','Renommer le programme','Plan umbenennen'],
    'message.0320':['Προβολή πλάνου','View plan','Voir le programme','Plan anzeigen'],
    'message.0321':['Προσθήκη προπόνησης','Add workout','Ajouter une séance','Training hinzufügen'],
    'message.0322':['Αντιγραφή προγράμματος','Duplicate routine','Dupliquer le programme','Plan duplizieren'],
    'message.0323':['Κλείσιμο πλάνου','Close plan','Fermer le programme','Plan schließen'],
    'message.0324':['Κλείσιμο προπόνησης','Close workout','Fermer la séance','Training schließen'],
    'message.0325':['Διαγραφή προγράμματος','Delete routine','Supprimer le programme','Plan löschen'],
    'message.0326':['Όνομα άσκησης','Exercise name','Nom de l’exercice','Übungsname'],
    'message.0327':['Άσκηση','Exercise','Exercice','Übung'],
    'message.0328':['ΑΣΚΗΣΗ','EXERCISE','EXERCICE','ÜBUNG'],
    'message.0329':['ΣΕΤ','SET','SÉRIE','SATZ'],
    'message.0330':['Αφαίρεση','Remove','Retirer','Entfernen'],
    'message.0331':['Αριθμός σετ','Number of sets','Nombre de séries','Anzahl Sätze'],
    'message.0332':['ΕΠΑΝΑΛΗΨΕΙΣ','REPS','RÉPÉTITIONS','WIEDERHOLUNGEN'],
    'message.0333':['ΜΕΤΡΗΣΗ ΒΑΡΟΥΣ','WEIGHT METHOD','MODE DE CHARGE','GEWICHTSMESSUNG'],
    'message.0334':['ΒΑΡΟΣ / ΜΕΤΡΗΣΗ','WEIGHT / MEASURE','CHARGE / MESURE','GEWICHT / MESSART'],
    'message.0335':['ΒΑΡΟΣ','WEIGHT','CHARGE','GEWICHT'],
    'message.0336':['Αντιγραφή του πρώτου σετ στα υπόλοιπα','Copy first set to the rest','Copier la première série sur les autres','Ersten Satz auf die übrigen kopieren'],
    'message.0337':['ΑΝΤΙΓΡΑΦΗ','COPY','COPIER','KOPIEREN'],
    'message.0338':['Extra σετ','Extra set','Série supplémentaire','Extrasatz'],
    'message.0339':['Σχόλια άσκησης','Exercise notes','Notes de l’exercice','Übungsnotizen'],
    'message.0340':['Τεχνική, αίσθηση, RPE...','Technique, feel, RPE...','Technique, sensations, RPE...','Technik, Gefühl, RPE...'],
    'message.0341':['Η προπόνηση της ημέρας','Today’s workout','Séance du jour','Heutiges Training'],
    'message.0342':['Έναρξη ελεύθερης προπόνησης','Start free workout','Démarrer une séance libre','Freies Training starten'],
    'message.0343':['ΠΡΟΠΟΝΗΣΕΙΣ','WORKOUTS','SÉANCES','TRAININGS'],
    'message.0344':['ΣΥΧΝΟΤΗΤΑ ΕΒΔΟΜΑΔΑΣ','WEEKLY FREQUENCY','FRÉQUENCE HEBDOMADAIRE','WOCHENFREQUENZ'],
    'message.0345':['ΚΑΤΑΓΕΓΡΑΜΜΕΝΕΣ ΠΡΟΠΟΝΗΣΕΙΣ','LOGGED WORKOUTS','SÉANCES ENREGISTRÉES','ERFASSTE TRAININGS'],
    'message.0346':['Πλοήγηση στις ημέρες του ιστορικού','Browse history days','Parcourir les jours de l’historique','Verlaufstage durchsuchen'],
    'message.0347':['Προηγούμενη ημέρα','Previous day','Jour précédent','Vorheriger Tag'],
    'message.0348':['Επόμενη ημέρα','Next day','Jour suivant','Nächster Tag'],
    'message.0349':['Προηγούμενη άσκηση','Previous exercise','Exercice précédent','Vorherige Übung'],
    'message.0350':['Επόμενη άσκηση','Next exercise','Exercice suivant','Nächste Übung'],
    'message.0351':['Κάθε καταγραφή αφήνει το σημάδι της.','Every log leaves its mark.','Chaque saisie laisse sa trace.','Jeder Eintrag hinterlässt Spuren.'],
    'message.0352':['ΑΣΚΗΣΕΙΣ','EXERCISES','EXERCICES','ÜBUNGEN'],
    'message.0353':['ΚΑΤΑΓΡΑΦΗΚΕ','LOGGED','ENREGISTRÉ','ERFASST'],
    'message.0354':['ΕΠΙΛΟΓΗ','SELECT','SÉLECTIONNER','AUSWÄHLEN'],
    'message.0355':['ΕΠΕΞΕΡΓΑΣΙΑ','EDIT','MODIFIER','BEARBEITEN'],
    'message.0356':['ΔΙΑΓΡΑΦΗ','DELETE','SUPPRIMER','LÖSCHEN'],
    'message.0357':['επαναλήψεις','reps','répétitions','Wiederholungen'],
    'message.0358':['επαν.','reps','rép.','Wdh.'],
    'message.0359':['σε εξέλιξη','in progress','en cours','laufend'],
    'message.0360':['πλάκες','plates','plaques','Scheiben'],
    'message.0361':['Πλάκες + Κιλά','Plates + kg','Plaques + kg','Scheiben + kg'],
    'message.0362':['Πλάκες+Κιλά','Plates+kg','Plaques+kg','Scheiben+kg'],
    'message.0363':['Πλάκες+Λίβρες','Plates+lbs','Plaques+lbs','Scheiben+lbs'],
    'message.0364':['Πλάκες','Plates','Plaques','Scheiben'],
    'message.0365':['Κιλά','kg','kg','kg'],
    'message.0366':['Λίβρες','lbs','lbs','lbs'],
    'message.0367':['Bodyweight + Extra Βάρος','Bodyweight + Extra Weight','Poids du corps + charge','Körpergewicht + Zusatzgewicht'],
    'message.0368':['Bodyweight+Κιλά','Bodyweight + kg','Poids du corps + kg','Körpergewicht + kg'],
    'message.0369':['Bodyweight+Λίβρες','Bodyweight + lbs','Poids du corps + lbs','Körpergewicht + lbs'],
    'message.0370':['Μη αποθηκευμένη καταγραφή','Unsaved workout log','Saisie non enregistrée','Nicht gespeicherter Trainingseintrag'],
    'message.0371':['Έχετε μη αποθηκευμένα δεδομένα προπόνησης. Αν αποχωρήσετε χωρίς αποθήκευση, θα χαθούν. Θέλετε να αποθηκεύσετε την καταγραφή πριν συνεχίσετε;','You have unsaved workout data. If you leave without saving, it will be lost. Would you like to save the log before continuing?','Vous avez des données d’entraînement non enregistrées. Si vous partez sans enregistrer, elles seront perdues. Souhaitez-vous enregistrer la saisie avant de continuer ?','Sie haben nicht gespeicherte Trainingsdaten. Wenn Sie ohne Speichern fortfahren, gehen sie verloren. Möchten Sie den Eintrag vorher speichern?'],
    'message.0372':['Έξοδος χωρίς αποθήκευση','Leave without saving','Quitter sans enregistrer','Ohne Speichern verlassen'],
    'message.0373':['Παραμονή','Stay','Rester','Bleiben'],
    'message.0374':['Πλάκες (+ kg)','Plates (+ kg)','Plaques (+ kg)','Scheiben (+ kg)'],
    'message.0375':['Bodyweight (+ kg)','Bodyweight (+ kg)','Poids du corps (+ kg)','Körpergewicht (+ kg)'],
    'message.0376':['Σετ','Set','Série','Satz'],
    'message.0377':['Γράφημα προόδου βάρους και επαναλήψεων','Weight and reps progress chart','Graphique de progression charge et répétitions','Fortschrittsdiagramm für Gewicht und Wiederholungen'],
    'message.0378':['Έλεγχος καταγραφής:','Log check:','Contrôle des saisies :','Eintragsprüfung:'],
    'message.0379':['προπόνηση εξαιρέθηκε','workout excluded','séance exclue','Training ausgeschlossen'],
    'message.0380':['προπονήσεις εξαιρέθηκαν','workouts excluded','séances exclues','Trainings ausgeschlossen'],
    'message.0381':['Λείπει βάρος ή επαναλήψεις από το σετ','Weight or reps are missing from the set','Il manque la charge ou les répétitions de la série','Gewicht oder Wiederholungen fehlen im Satz'],
    'message.0382':['Η άσκηση δεν καταγράφηκε','Exercise was not logged','L’exercice n’a pas été saisi','Übung wurde nicht erfasst'],
    'message.0383':['Δεν καταγράφηκε το σετ','Set was not logged','La série n’a pas été saisie','Satz wurde nicht erfasst'],
    'message.0384':['ΗΛΙΚΙΑ','AGE','ÂGE','ALTER'],
    'message.0385':['έτος','year','an','Jahr'],
    'message.0386':['έτη','years','ans','Jahre'],
    'message.0387':['Βάρος','Weight','Poids','Gewicht'],
    'message.0388':['Μονάδα βάρους','Weight unit','Unité de poids','Gewichtseinheit'],
    'message.0389':['ΕΠΙΛΟΓΗ AVATAR','CHOOSE AVATAR','CHOISIR UN AVATAR','AVATAR WÄHLEN'],
    'message.0390':['ΕΙΚΟΝΑ ΠΡΟΦΙΛ','PROFILE IMAGE','IMAGE DE PROFIL','PROFILBILD'],
    'message.0391':['Επιλογή','Select','Choisir','Auswählen'],
    'message.0392':['Προεπισκόπηση προφίλ','Profile preview','Aperçu du profil','Profilvorschau'],
    'message.0393':['Διαγραφή άσκησης','Delete exercise','Supprimer l’exercice','Übung löschen'],
    'message.0394':['Αφαίρεση σετ','Remove set','Retirer la série','Satz entfernen'],
    'message.0395':['Αφαίρεση','Remove','Retirer','Entfernen'],
    'message.0396':['Είστε σίγουροι ότι θέλετε να πραγματοποιηθεί αφαίρεση του εργάσιμου σετ ;','Are you sure you want to remove the working set?','Êtes-vous sûr de vouloir retirer la série de travail ?','Möchten Sie den Arbeitssatz wirklich entfernen?'],
    'message.0397':['Αφαίρεση εργάσιμου σετ','Remove working set','Retirer la série de travail','Arbeitssatz entfernen'],
    'message.0398':['Χρειάζεται να υπάρχει τουλάχιστον ένα εργάσιμο σετ','At least one working set is required','Au moins une série de travail est requise','Mindestens ein Arbeitssatz ist erforderlich'],
    'message.0399':['Το εργάσιμο σετ αφαιρέθηκε','The working set was removed','La série de travail a été retirée','Der Arbeitssatz wurde entfernt'],
    'message.0400':['Ακύρωση','Cancel','Annuler','Abbrechen'],
    'message.0401':['Διαγραφή','Delete','Supprimer','Löschen'],
    'message.0402':['Χωρίς ημέρα','No day','Sans jour','Kein Tag'],
    'message.0403':['Χωρίς ημερομηνία','No date','Sans date','Kein Datum'],
    'message.0404':['Το πρόγραμμά μου','My routine','Mon programme','Mein Plan'],
    'message.0405':['Δευτέρα','Monday','Lundi','Montag'],
    'message.0406':['Τρίτη','Tuesday','Mardi','Dienstag'],
    'message.0407':['Τετάρτη','Wednesday','Mercredi','Mittwoch'],
    'message.0408':['Πέμπτη','Thursday','Jeudi','Donnerstag'],
    'message.0409':['Παρασκευή','Friday','Vendredi','Freitag'],
    'message.0410':['Σάββατο','Saturday','Samedi','Samstag'],
    'message.0411':['Κυριακή','Sunday','Dimanche','Sonntag'],
    'message.0412':['Δευ','Mon','Lun','Mo'],
    'message.0413':['Τρί','Tue','Mar','Di'],
    'message.0414':['Τετ','Wed','Mer','Mi'],
    'message.0415':['Πέμ','Thu','Jeu','Do'],
    'message.0416':['Παρ','Fri','Ven','Fr'],
    'message.0417':['Σάβ','Sat','Sam','Sa'],
    'message.0418':['Κυρ','Sun','Dim','So'],
    'message.0419':['JPG, PNG ή WEBP','JPG, PNG or WEBP','JPG, PNG ou WEBP','JPG, PNG oder WEBP'],
    'message.0420':['Να διαγραφεί οριστικά η προπόνηση','Permanently delete workout','Supprimer définitivement la séance','Training endgültig löschen'],
    'message.0421':['Να διαγραφεί ολόκληρο το πρόγραμμα της','Delete the entire workout for','Supprimer tout le programme du','Das gesamte Training löschen für'],
    'message.0422':['Να διαγραφεί οριστικά το','Permanently delete','Supprimer définitivement','Endgültig löschen'],
    'message.0423':['και όλες οι ημέρες του;','and all its days?','et tous ses jours ?','und alle zugehörigen Tage?'],
    'message.0424':['Είστε σίγουροι για την διαγραφή της άσκησης','Are you sure you want to delete exercise','Voulez-vous vraiment supprimer l’exercice','Möchten Sie die Übung wirklich löschen'],
    'message.0425':['από την δήλωση της προπόνησης;','from the workout entry?','de la saisie de séance ?','aus dem Trainingseintrag?'],
    'message.0426':['Η εικόνα προστέθηκε στο προφίλ','The image was added to your profile','L’image a été ajoutée au profil','Das Bild wurde dem Profil hinzugefügt'],
    'message.0427':['Το προφίλ αποθηκεύτηκε','Profile saved','Profil enregistré','Profil gespeichert'],
    'message.0428':['Οι διορθώσεις αποθηκεύτηκαν.','Changes saved.','Corrections enregistrées.','Änderungen gespeichert.'],
    'message.0429':['Η προπόνηση αντιγράφηκε και καταγράφηκε.','Workout copied and logged.','Séance copiée et enregistrée.','Training kopiert und erfasst.'],
    'message.0430':['Η αρχική προπόνηση έχει διαγραφεί και δεν μπορεί να αντιγραφεί.','The original workout was deleted and cannot be copied.','La séance d’origine a été supprimée et ne peut pas être copiée.','Das ursprüngliche Training wurde gelöscht und kann nicht kopiert werden.'],
    'message.0431':['Υπάρχει ήδη καταγεγραμμένη προπόνηση για αυτή την ημέρα.','A workout is already logged for this day.','Une séance est déjà enregistrée pour ce jour.','Für diesen Tag ist bereits ein Training erfasst.'],
    'message.0432':['Η προπόνηση καταγράφηκε.','Workout logged.','Séance enregistrée.','Training erfasst.'],
    'message.0433':['Το 1ο σετ αντιγράφηκε στα υπόλοιπα.','The first set was copied to the rest.','La première série a été copiée sur les autres.','Der erste Satz wurde auf die übrigen kopiert.'],
    'message.0434':['Η άσκηση αφαιρέθηκε από το Πρόγραμμα','Exercise removed from the Plan','Exercice retiré du Programme','Übung aus dem Plan entfernt'],
    'message.0435':['Η άσκηση αφαιρέθηκε από τη δήλωση','Exercise removed from the entry','Exercice retiré de la saisie','Übung aus dem Eintrag entfernt'],
    'message.0436':['Η προπόνηση διαγράφηκε','Workout deleted','Séance supprimée','Training gelöscht'],
    'message.0437':['χωρίς όνομα','unnamed','sans nom','ohne Namen'],
    'message.0438':['είναι τώρα ενεργό','is now active','est maintenant actif','ist jetzt aktiv'],
    'message.0439':['δημιουργήθηκε','created','créé','erstellt'],
    'message.0440':['διαγράφηκε','deleted','supprimé','gelöscht'],
    'message.0441':['αποθηκεύτηκε','saved','enregistré','gespeichert'],
    'message.0442':['Ενημερώθηκε μόνο το Πρόγραμμα','Only the Plan was updated','Seul le Programme a été mis à jour','Nur der Plan wurde aktualisiert'],
    'message.0443':['Το Πρόγραμμα και το Ιστορικό ενημερώθηκαν','Plan and History updated','Programme et Historique mis à jour','Plan und Verlauf aktualisiert'],
    'message.0444':['Το όνομα του προγράμματος αποθηκεύτηκε','Routine name saved','Nom du programme enregistré','Planname gespeichert'],
    'message.0445':['Το πρόγραμμα','The routine','Le programme','Der Plan'],
    'message.0446':['Η προπόνηση για','Workout for','Séance du','Training für'],
    'message.0447':['σε 7 ημέρες. Ο ρυθμός χτίζεται.','workouts in 7 days. The rhythm is building.','séances en 7 jours. Le rythme se construit.','Trainings in 7 Tagen. Der Rhythmus wächst.'],
    'message.0448':['σε 7 ημέρες. Κρατήστε τη γραμμή.','workouts in 7 days. Keep the streak.','séances en 7 jours. Gardez le rythme.','Trainings in 7 Tagen. Halten Sie die Serie.'],
    'message.0449':['προπονήσεις','workouts','séances','Trainings'],
    'message.0450':['ημέρες προπόνησης','training days','jours d’entraînement','Trainingstage'],
    'message.0451':['ημέρα προπόνησης','training day','jour d’entraînement','Trainingstag'],
    'message.0452':['ημέρες','days','jours','Tage'],
    'message.0453':['π.χ. ώμοι πίσω, σταθερά πόδια','e.g. shoulders back, feet planted','p. ex. épaules en arrière, pieds stables','z. B. Schultern zurück, Füße stabil'],
    'message.0454':['π.χ. Δημήτρης','e.g. Alex','p. ex. Alex','z. B. Alex'],
    'message.0455':['π.χ.','e.g.','p. ex.','z. B.'],
    'message.0456':['Αποθήκευση','Save','Enregistrer','Speichern'],
    'message.0457':['σετ','sets','séries','Sätze'],
    'message.0458':['καταγραφές','logs','séries','Einträge'],
    'message.0459':['στις','on','du','am'],
    'message.0460':['Η ημερομηνία προπόνησης δεν μπορεί να είναι μεταγενέστερη από τη σημερινή','The workout date cannot be later than today','La date de la séance ne peut pas être postérieure à aujourd’hui','Das Trainingsdatum darf nicht nach heute liegen'],
    'message.0461':['έχει ήδη δηλωθεί','has already been declared','a déjà été déclaré','wurde bereits festgelegt'],
    'message.0462':['μία φορά','once','une fois','einmal'],
    'message.0463':['δύο φορές','twice','deux fois','zweimal'],
    'message.0464':['Να διαγραφεί οριστικά το','Permanently delete','Supprimer définitivement','Endgültig löschen'],
    'message.0465':['και όλες οι ημέρες του','and all its days','et tous ses jours','und alle seine Tage'],
    'message.0466':['Να διαγραφεί ολόκληρο το πρόγραμμα για','Delete the entire workout for','Supprimer entièrement le programme pour','Das gesamte Trainingsprogramm für'],
    'message.0467':['Να διαγραφεί οριστικά η προπόνηση','Permanently delete the workout','Supprimer définitivement la séance','Das Training endgültig löschen'],
    'message.0468':['Το ','','',''],
    'message.0469':['Η ','','',''],
    'aria.weight-set':['{unit} σετ {number}','{unit}, set {number}','{unit}, série {number}','{unit}, Satz {number}']
  };

  const wordCharacter = /[\p{L}\p{N}_]/u;
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const catalogEntries = Object.entries(catalog)
    .map(([id, [source, ...values]]) => {
      const escaped = escapeRegExp(source);
      const prefix = wordCharacter.test(source[0]) ? '(^|[^\\p{L}\\p{N}_])' : '()';
      const suffix = wordCharacter.test(source.at(-1)) ? '(?=$|[^\\p{L}\\p{N}_])' : '';
      return { id, source, values, pattern:new RegExp(`${prefix}${escaped}${suffix}`, 'gu') };
    });
  const messagesById = new Map(catalogEntries.map(entry => [entry.id, entry]));
  const sourceMessages = new Map();
  catalogEntries.forEach(entry => sourceMessages.set(entry.source, entry));
  const entries = [...sourceMessages.values()].sort((a, b) => b.source.length - a.source.length);
  const textState = new WeakMap();
  const attrState = new WeakMap();
  const greekLanguageElements = new WeakSet();
  const greekCharacters = /[\u0370-\u03ff\u1f00-\u1fff]/;
  let language = languages.includes(localStorage.getItem('logbookLanguage')) ? localStorage.getItem('logbookLanguage') : 'el';

  function interpolate(value, parameters = {}) {
    return String(value ?? '').replace(/\{(\w+)\}/g, (match, name) =>
      Object.hasOwn(parameters, name) ? String(parameters[name]) : match);
  }

  function translateId(id, parameters = {}, lang = language) {
    const message = messagesById.get(id);
    if (!message) return id;
    const column = languages.indexOf(lang);
    const value = column <= 0 ? message.source : message.values[column - 1];
    return interpolate(value, parameters);
  }

  function convert(source, lang = language) {
    if (lang === 'el' || !source) return source;
    const column = languages.indexOf(lang) - 1;
    let output = source;
    entries.forEach(({ pattern, values }) => { output = output.replace(pattern, (_, lead) => `${lead}${values[column]}`); });
    return output;
  }

  function translateTextNode(node) {
    // Only the direct text owned by a user-content element is protected.
    // Nested UI labels (for example <b>ΣΗΜΕΙΩΣΕΙΣ</b> inside a user note)
    // must still be translated.
    if (node.parentElement?.matches('[data-i18n-user]')) {
      textState.set(node, { source:node.nodeValue, last:node.nodeValue });
      updateGreekLanguage(node.parentElement);
      return;
    }
    if (node.parentElement?.matches('[data-i18n-id]')) return;
    let state = textState.get(node);
    if (!state || node.nodeValue !== state.last) state = { source:node.nodeValue, last:node.nodeValue };
    const output = convert(state.source);
    state.last = output;
    textState.set(node, state);
    if (node.nodeValue !== output) node.nodeValue = output;
    updateGreekLanguage(node.parentElement);
  }

  function updateGreekLanguage(element) {
    if (!element) return;
    const directText = [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.nodeValue).join('');
    const editableValue = element.matches('input,textarea') ? element.value : '';
    const needsGreekRules = language !== 'el' && greekCharacters.test(`${directText}${editableValue}`);
    if (needsGreekRules) {
      if (!element.hasAttribute('lang') || greekLanguageElements.has(element)) {
        element.setAttribute('lang', 'el');
        greekLanguageElements.add(element);
      }
    } else if (greekLanguageElements.has(element)) {
      element.removeAttribute('lang');
      greekLanguageElements.delete(element);
    }
  }

  function translateAttribute(element, name) {
    const messageId = element.getAttribute(`data-i18n-${name}`);
    if (messageId) {
      const output = translateId(messageId);
      if (element.getAttribute(name) !== output) element.setAttribute(name, output);
      return;
    }
    let states = attrState.get(element);
    if (!states) { states = {}; attrState.set(element, states); }
    const value = element.getAttribute(name);
    let state = states[name];
    if (!state || value !== state.last) state = { source:value, last:value };
    const output = convert(state.source);
    state.last = output;
    states[name] = state;
    if (value !== output) element.setAttribute(name, output);
  }

  function translate(root = document) {
    const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    elements.filter(element => element.hasAttribute('data-i18n-id')).forEach(element => {
      const output = translateId(element.dataset.i18nId);
      if (element.textContent !== output) element.textContent = output;
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    elements.forEach(element => ['aria-label','placeholder','title'].forEach(name => {
      if (element.hasAttribute(name)) translateAttribute(element, name);
    }));
    elements.forEach(updateGreekLanguage);
    document.documentElement.lang = language;
    document.title = translateId('message.0017');
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  }

  function setLanguage(next) {
    if (!languages.includes(next)) return;
    language = next;
    localStorage.setItem('logbookLanguage', next);
    window.dispatchEvent(new CustomEvent('logbook:local-data-changed', { detail:{ key:'logbookLanguage' } }));
    document.dispatchEvent(new CustomEvent('logbook:languagechange', { detail:{ language:next, locale:locales[next] } }));
    translate(document);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (button) setLanguage(button.dataset.language);
  });
  document.addEventListener('input', event => updateGreekLanguage(event.target));

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'characterData') translateTextNode(record.target);
      record.addedNodes.forEach(node => {
        if (node.nodeType === 3) translateTextNode(node);
        else if (node.nodeType === 1) translate(node);
      });
    });
  });
  observer.observe(document.documentElement, { subtree:true, childList:true, characterData:true });

  window.LogbookI18n = {
    translate,
    setLanguage,
    getLanguage:() => language,
    getLocale:() => locales[language],
    t:convert,
    tId:translateId,
  };
  translate(document);
}());
