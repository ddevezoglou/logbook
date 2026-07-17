(function () {
  const locales = { el:'el-GR', en:'en-GB', fr:'fr-FR', de:'de-DE' };
  const languages = ['el', 'en', 'fr', 'de'];

  // Greek remains the stable source language so existing saved plans keep working.
  // Each entry is [English, French, German]. Longer phrases are applied first.
  const p = {
    'Οι προπονήσεις και τα προγράμματά σου παραμένουν συγχρονισμένα σε κάθε συσκευή.':['Your workouts and routines stay synced on every device.','Vos séances et programmes restent synchronisés sur tous vos appareils.','Ihre Trainings und Pläne bleiben auf allen Geräten synchronisiert.'],
    'Ελέγχουμε αν υπάρχει ενεργή συνεδρία σε αυτή τη συσκευή.':['Checking for an active session on this device.','Vérification d’une session active sur cet appareil.','Auf diesem Gerät wird nach einer aktiven Sitzung gesucht.'],
    'Φέρνουμε τις τελευταίες προπονήσεις και τα προγράμματά σας.':['Fetching your latest workouts and routines.','Récupération de vos dernières séances et programmes.','Ihre neuesten Trainings und Pläne werden geladen.'],
    'Όλα είναι έτοιμα. Ανοίγουμε το Logbook.':['Everything is ready. Opening Logbook.','Tout est prêt. Ouverture de Logbook.','Alles ist bereit. Logbook wird geöffnet.'],
    'Δεν φορτώθηκε η εφαρμογή. Δοκιμάστε ξανά.':['The application did not load. Try again.','L’application ne s’est pas chargée. Réessayez.','Die Anwendung wurde nicht geladen. Versuchen Sie es erneut.'],
    'Δεν μπορέσαμε να ελέγξουμε τη σύνδεσή σας. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.':['We could not check your session. Check the network and try again.','Impossible de vérifier votre session. Vérifiez le réseau et réessayez.','Ihre Sitzung konnte nicht geprüft werden. Prüfen Sie das Netzwerk und versuchen Sie es erneut.'],
    'Ο αρχικός συγχρονισμός δεν ολοκληρώθηκε. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.':['Initial sync did not complete. Check the network and try again.','La synchronisation initiale a échoué. Vérifiez le réseau et réessayez.','Die erste Synchronisierung wurde nicht abgeschlossen. Prüfen Sie das Netzwerk und versuchen Sie es erneut.'],
    'Η υπηρεσία σύνδεσης δεν είναι διαθέσιμη. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.':['The sign-in service is unavailable. Check the network and try again.','Le service de connexion est indisponible. Vérifiez le réseau et réessayez.','Der Anmeldedienst ist nicht verfügbar. Prüfen Sie das Netzwerk und versuchen Sie es erneut.'],
    'ΠΡΟΕΤΟΙΜΑΣΙΑ LOGBOOK':['PREPARING LOGBOOK','PRÉPARATION DE LOGBOOK','LOGBOOK WIRD VORBEREITET'],
    'ΕΛΕΓΧΟΣ ΣΥΝΔΕΣΗΣ':['CHECKING SESSION','VÉRIFICATION DE LA SESSION','SITZUNG WIRD GEPRÜFT'],
    'ΣΥΓΧΡΟΝΙΣΜΟΣ ΔΕΔΟΜΕΝΩΝ':['SYNCING DATA','SYNCHRONISATION DES DONNÉES','DATEN WERDEN SYNCHRONISIERT'],
    'ΦΟΡΤΩΣΗ ΕΦΑΡΜΟΓΗΣ':['LOADING APPLICATION','CHARGEMENT DE L’APPLICATION','ANWENDUNG WIRD GELADEN'],
    'Η ΣΥΝΔΕΣΗ ΔΙΑΚΟΠΗΚΕ':['CONNECTION INTERRUPTED','CONNEXION INTERROMPUE','VERBINDUNG UNTERBROCHEN'],
    'ΠΡΟΣΠΑΘΕΙΑ ΞΑΝΑ':['TRY AGAIN','RÉESSAYER','ERNEUT VERSUCHEN'],
    'ΗΜΕΡΟΛΟΓΙΟ ΠΡΟΠΟΝΗΣΗΣ':['TRAINING JOURNAL','JOURNAL D’ENTRAÎNEMENT','TRAININGSTAGEBUCH'],
    'ΜΠΕΣ ΣΤΟ':['ENTER THE','ENTREZ DANS','ÖFFNEN SIE'],
    'Logbook — Ημερολόγιο Προπόνησης':['Logbook — Training Journal','Logbook — Journal d’entraînement','Logbook — Trainingstagebuch'],
    'Ημερολόγιο Προπόνησης':['Training Journal','Journal d’entraînement','Trainingstagebuch'],
    'Το σημερινό σας πλάνο σας περιμένει. Καταγράψτε σετ, κιλά και επαναλήψεις — τα νούμερα χτίζουν την πρόοδο.':['Today’s plan is waiting. Log sets, weight and reps — the numbers build progress.','Le programme du jour vous attend. Notez séries, charges et répétitions — les chiffres construisent vos progrès.','Der heutige Plan wartet. Erfassen Sie Sätze, Gewicht und Wiederholungen — Zahlen schaffen Fortschritt.'],
    'Κάρτα αθλητή. Σύρετε για να την μετακινήσετε στην αρχική σελίδα.':['Athlete card. Drag to reposition it on the home page.','Carte d’athlète. Faites-la glisser pour la repositionner sur l’accueil.','Athletenkarte. Ziehen Sie sie, um sie auf der Startseite neu zu positionieren.'],
    'Κάρτα ενεργού προγράμματος. Σύρετε για να την μετακινήσετε στην αρχική σελίδα.':['Active routine card. Drag to reposition it on the home page.','Carte du programme actif. Faites-la glisser pour la repositionner sur l’accueil.','Karte des aktiven Plans. Ziehen Sie sie, um sie auf der Startseite neu zu positionieren.'],
    'Επιλέξτε άλλη ημέρα μικρόκυκλου ή ξεκινήστε μια «Ελεύθερη» καταγραφή.':['Choose another cycle day or start a “Free” log.','Choisissez un autre jour du cycle ou démarrez une saisie « Libre ».','Wählen Sie einen anderen Zyklustag oder starten Sie eine „Freie“ Erfassung.'],
    'Δηλώστε τις ημέρες του πρώτου σας προγράμματος':['Set the days of your first routine','Définissez les jours de votre premier programme','Legen Sie die Tage Ihres ersten Plans fest'],
    'ΔΗΜΙΟΥΡΓΙΑ ΠΡΟΓΡΑΜΜΑΤΟΣ':['CREATE A ROUTINE','CRÉER UN PROGRAMME','PLAN ERSTELLEN'],
    'Προσθέστε την πρώτη ημέρα προπόνησης':['Add the first training day','Ajoutez le premier jour d’entraînement','Fügen Sie den ersten Trainingstag hinzu'],
    'ΑΝΟΙΓΜΑ ΠΡΟΓΡΑΜΜΑΤΟΣ':['OPEN ROUTINE','OUVRIR LE PROGRAMME','PLAN ÖFFNEN'],
    'Γρήγορη πλοήγηση':['Quick navigation','Navigation rapide','Schnellnavigation'],
    'Διαχείριση προγραμμάτων':['Routine management','Gestion des programmes','Planverwaltung'],
    'Διάρκεια (σε ημέρες)':['Duration (days)','Durée (jours)','Dauer (Tage)'],
    'Δήλωση ημερών':['Use weekdays','Utiliser les jours de la semaine','Wochentage verwenden'],
    'Λεπτομέρειες προπόνησης':['Workout details','Détails de la séance','Trainingsdetails'],
    'Κλείσιμο προπόνησης':['Close workout','Fermer la séance','Training schließen'],
    'Άνοιγμα προπόνησης':['Open workout','Ouvrir la séance','Training öffnen'],
    'Διαγραφή προπόνησης':['Delete workout','Supprimer la séance','Training löschen'],
    'Τρόπος καταγραφής βάρους για το σετ':['Weight entry method for set','Mode de saisie de la charge pour la série','Gewichtserfassung für Satz'],
    'Διαγραφή extra σετ':['Delete extra set','Supprimer la série supplémentaire','Extrasatz löschen'],
    'από 4 στάδια επιβράβευσης':['of 4 reward stages','sur 4 niveaux de récompense','von 4 Belohnungsstufen'],
    'συνεχόμενη εβδομάδα':['consecutive week','semaine consécutive','Woche in Folge'],
    'συνεχόμενες εβδομάδες':['consecutive weeks','semaines consécutives','Wochen in Folge'],
    'συνεχόμενος μικρόκυκλος':['consecutive cycle','cycle consécutif','Zyklus in Folge'],
    'συνεχόμενοι μικρόκυκλοι':['consecutive cycles','cycles consécutifs','Zyklen in Folge'],
    'αυτή την εβδομάδα':['this week','cette semaine','diese Woche'],
    'σε αυτόν τον μικρόκυκλο':['in this cycle','dans ce cycle','in diesem Zyklus'],
    'καταγεγραμμένες προπονήσεις':['logged workouts','séances enregistrées','erfasste Trainings'],
    'Κενό πρόγραμμα':['Empty routine','Programme vide','Leerer Plan'],
    'ΠΡΟΓΡΑΜΜΑ':['ROUTINE','PROGRAMME','PLAN'],
    'ΙΣΤΟΡΙΚΟ':['HISTORY','HISTORIQUE','VERLAUF'],
    'Όχι':['No','Non','Nein'],
    'Ναι':['Yes','Oui','Ja'],
    'Δημιουργήστε όσα εβδομαδιαία προγράμματα θέλετε. Το πρόγραμμα με το αστέρι είναι το ενεργό — αυτό ανοίγει στην Καταγραφή.':['Create as many weekly routines as you like. The starred routine is active — it opens in Log.','Créez autant de programmes hebdomadaires que vous le souhaitez. Le programme étoilé est actif — il s’ouvre dans Saisie.','Erstellen Sie beliebig viele Wochenpläne. Der Plan mit Stern ist aktiv — er öffnet sich unter Erfassen.'],
    'Μία μέτρηση δεν ορίζει την πορεία. Το γράφημα δείχνει βάρος και επαναλήψεις ανά σετ, προπόνηση με προπόνηση.':['One measurement does not define your journey. The chart tracks weight and reps per set, workout by workout.','Une mesure ne définit pas votre progression. Le graphique suit charge et répétitions par série, séance après séance.','Ein einzelner Wert bestimmt nicht Ihren Weg. Das Diagramm zeigt Gewicht und Wiederholungen pro Satz, Training für Training.'],
    'Τα βασικά στοιχεία του αθλητή, συγκεντρωμένα σε μία καθαρή κάρτα. Επιλέξτε ένα έτοιμο avatar ή ανεβάστε τη δική σας εικόνα.':['Your essential athlete details in one clear card. Choose an avatar or upload your own image.','Les informations essentielles de l’athlète réunies sur une carte claire. Choisissez un avatar ou importez votre image.','Ihre wichtigsten Athletendaten auf einer übersichtlichen Karte. Wählen Sie einen Avatar oder laden Sie ein eigenes Bild hoch.'],
    'Χρειάζονται τουλάχιστον δύο καταγραφές της άσκησης με συγκρίσιμη μονάδα βάρους. Οι Πλάκες συγκρίνονται με τις Πλάκες + Κιλά και το Σωματικό βάρος με το Σωματικό βάρος + kg.':['At least two logs of the exercise with a comparable weight unit are required. Plates compare with Plates + kg, and Bodyweight compares with Bodyweight + kg.','Il faut au moins deux saisies de l’exercice avec une unité comparable. Les plaques se comparent aux plaques + kg, et le poids du corps au poids du corps + kg.','Mindestens zwei Einträge der Übung mit vergleichbarer Gewichtseinheit sind nötig. Scheiben sind mit Scheiben + kg vergleichbar, Körpergewicht mit Körpergewicht + kg.'],
    'Άλλαξε όνομα προπόνησης, άσκησης ή ημέρα. Θέλετε οι παλιές καταγραφές να διατηρήσουν τα ιστορικά τους ονόματα ή να ενημερωθούν μαζί με το Πρόγραμμα;':['A workout name, exercise or day changed. Should old logs keep their historical names or update with the Plan?','Un nom de séance, un exercice ou un jour a changé. Les anciennes saisies doivent-elles garder leurs noms ou suivre le Programme ?','Ein Trainingsname, eine Übung oder ein Tag wurde geändert. Sollen alte Einträge ihre Namen behalten oder mit dem Plan aktualisiert werden?'],
    'Επιλέξτε το πρόγραμμα άλλης ημέρας ή ξεκινήστε μια «Ελεύθερη» καταγραφή.':['Choose another day’s workout or start a “Free” log.','Choisissez la séance d’un autre jour ou démarrez une saisie « Libre ».','Wählen Sie das Training eines anderen Tages oder starten Sie eine „Freie“ Erfassung.'],
    'Ολοκληρώστε την πρώτη προπόνηση και αρχίστε να χτίζετε το αρχείο σας.':['Complete your first workout and start building your record.','Terminez votre première séance et commencez à construire votre historique.','Schließen Sie Ihr erstes Training ab und beginnen Sie, Ihr Archiv aufzubauen.'],
    'Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σας.':['Personal bests are calculated automatically from your logs.','Les meilleures performances sont calculées automatiquement à partir de vos saisies.','Bestleistungen werden automatisch aus Ihren Einträgen berechnet.'],
    'Καταγράψτε τουλάχιστον δύο ίδια σετ για να δείτε πρόοδο.':['Log at least two matching sets to see progress.','Saisissez au moins deux séries comparables pour voir les progrès.','Erfassen Sie mindestens zwei vergleichbare Sätze, um Fortschritt zu sehen.'],
    'Το ήδη καταγεγραμμένο Ιστορικό θα παραμείνει.':['Existing workout history will remain.','L’historique déjà enregistré sera conservé.','Der bestehende Trainingsverlauf bleibt erhalten.'],
    'Το Ιστορικό προπονήσεων θα παραμείνει.':['Workout history will remain.','L’historique des séances sera conservé.','Der Trainingsverlauf bleibt erhalten.'],
    'Θα χαθούν όλα τα σετ και οι μετρήσεις της.':['All its sets and measurements will be lost.','Toutes ses séries et mesures seront perdues.','Alle Sätze und Messwerte gehen verloren.'],
    'Διορθώστε τις τιμές που θέλετε και αποθηκεύστε ξανά.':['Adjust the values you want and save again.','Corrigez les valeurs souhaitées et enregistrez à nouveau.','Passen Sie die gewünschten Werte an und speichern Sie erneut.'],
    'Προσαρμόστε ό,τι εκτελέσατε σήμερα και ολοκληρώστε τη νέα προπόνηση.':['Adjust what you completed today, then finish the new workout.','Adaptez ce que vous avez réalisé aujourd’hui, puis terminez la nouvelle séance.','Passen Sie an, was Sie heute absolviert haben, und schließen Sie dann das neue Training ab.'],
    'Συμπληρώστε όσα πραγματικά εκτελέσατε.':['Enter what you actually completed.','Saisissez ce que vous avez réellement effectué.','Tragen Sie ein, was Sie tatsächlich absolviert haben.'],
    'Η πρώτη καταγραφή είναι η γραμμή εκκίνησης.':['Your first log is the starting line.','Votre première saisie est la ligne de départ.','Ihr erster Eintrag ist die Startlinie.'],
    'Ο ρυθμός ξεκίνησε. Η επόμενη καταγραφή τον χτίζει.':['The rhythm has started. The next log builds it.','Le rythme est lancé. La prochaine saisie le renforce.','Der Rhythmus ist gestartet. Der nächste Eintrag baut ihn aus.'],
    'Η γραμμή εκκίνησης είναι εδώ.':['The starting line is here.','La ligne de départ est ici.','Die Startlinie ist hier.'],
    'Τα σημεία αναφοράς θα έρθουν.':['Your benchmarks will appear here.','Vos repères apparaîtront ici.','Ihre Richtwerte erscheinen hier.'],
    'Η πορεία χτίζεται με επαναλήψεις.':['Progress is built rep by rep.','Les progrès se construisent répétition après répétition.','Fortschritt entsteht Wiederholung für Wiederholung.'],
    'Έναρξη καταγραφής':['Start logging','Commencer la saisie','Erfassung starten'],
    'Άνοιγμα Καταγραφής':['Open the Log','Ouvrir la saisie','Erfassung öffnen'],
    'Δεν υπάρχει ασφαλής σύγκριση.':['No reliable comparison is available.','Aucune comparaison fiable n’est disponible.','Kein zuverlässiger Vergleich verfügbar.'],
    'Δεν υπάρχει αρκετός χώρος για την εικόνα. Χρειάζεται μικρότερο αρχείο.':['There is not enough space for the image. A smaller file is needed.','L’espace est insuffisant pour l’image. Un fichier plus petit est nécessaire.','Für das Bild ist nicht genug Speicher vorhanden. Es wird eine kleinere Datei benötigt.'],
    'Η εικόνα πρέπει να είναι μικρότερη από 10 MB.':['The image must be smaller than 10 MB.','L’image doit faire moins de 10 Mo.','Das Bild muss kleiner als 10 MB sein.'],
    'Δεν ήταν δυνατή η επεξεργασία της εικόνας.':['The image could not be processed.','Impossible de traiter l’image.','Das Bild konnte nicht verarbeitet werden.'],
    'Δεν ήταν δυνατή η ανάγνωση της εικόνας.':['The image could not be read.','Impossible de lire l’image.','Das Bild konnte nicht gelesen werden.'],
    'Το αρχείο εικόνας δεν είναι έγκυρο.':['The image file is invalid.','Le fichier image n’est pas valide.','Die Bilddatei ist ungültig.'],
    'Επιλογή εικόνας JPG, PNG ή WEBP.':['Choose a JPG, PNG or WEBP image.','Choisissez une image JPG, PNG ou WEBP.','Wählen Sie ein JPG-, PNG- oder WEBP-Bild.'],
    'Χρειάζεται να υπάρχει τουλάχιστον ένα πρόγραμμα':['At least one routine is required','Au moins un programme est requis','Mindestens ein Plan ist erforderlich'],
    'Χρειάζεται τουλάχιστον μία άσκηση':['At least one exercise is required','Au moins un exercice est requis','Mindestens eine Übung ist erforderlich'],
    'Επιλογή ημερομηνίας προπόνησης':['Choose a workout date','Choisissez une date de séance','Wählen Sie ein Trainingsdatum'],
    'Όλες οι ημέρες έχουν πρόγραμμα':['All days have a workout','Tous les jours ont une séance','Alle Tage haben ein Training'],
    'Δεν έχει δηλωθεί πρόγραμμα':['No routine has been set','Aucun programme défini','Kein Plan festgelegt'],
    'Δεν έχει οριστεί προπόνηση':['No workout has been set','Aucune séance définie','Kein Training festgelegt'],
    'Δεν υπάρχει ορισμένη προπόνηση για':['There is no workout set for','Aucune séance n’est prévue pour','Kein Training festgelegt für'],
    'Δεν υπάρχουν προπονήσεις':['No workouts available','Aucune séance disponible','Keine Trainings verfügbar'],
    'Δεν υπάρχουν ασκήσεις':['No exercises available','Aucun exercice disponible','Keine Übungen verfügbar'],
    'Δεν υπάρχουν σετ':['No sets available','Aucune série disponible','Keine Sätze verfügbar'],
    'Ενημέρωση παλιού Ιστορικού':['Update previous History','Mettre à jour l’ancien historique','Früheren Verlauf aktualisieren'],
    'Πρόγραμμα + Ιστορικό':['Plan + History','Programme + Historique','Plan + Verlauf'],
    'Μόνο Πρόγραμμα':['Plan only','Programme uniquement','Nur Plan'],
    'Διαγραφή εβδομαδιαίου προγράμματος':['Delete weekly routine','Supprimer le programme hebdomadaire','Wochenplan löschen'],
    'Διαγραφή ημέρας προγράμματος':['Delete workout day','Supprimer le jour du programme','Trainingstag löschen'],
    'ΕΠΙΒΕΒΑΙΩΣΗ':['CONFIRMATION','CONFIRMATION','BESTÄTIGUNG'],
    'ΕΚΤΕΛΕΣΗ ΠΡΟΠΟΝΗΣΗΣ':['WORKOUT EXECUTION','EXÉCUTION DE LA SÉANCE','TRAININGSAUSFÜHRUNG'],
    'Οδηγίες σελίδας':['Page guide','Guide de la page','Seitenanleitung'],
    'ΟΔΗΓΙΕΣ':['GUIDE','GUIDE','ANLEITUNG'],
    'Διαλέξτε την ημερομηνία της προπόνησης.':['Pick the date of your workout.','Choisissez la date de votre séance.','Wählen Sie das Datum Ihres Trainings.'],
    'Επιλέξτε «Από το πρόγραμμα» για την ημέρα του ενεργού πλάνου, ή «Ελεύθερη» για δικές σας ασκήσεις.':['Choose “Scheduled” for the day of your active plan, or “Free” for your own exercises.','Choisissez « Depuis le programme » pour le jour du plan actif, ou « Libre » pour vos propres exercices.','Wählen Sie „Nach Plan“ für den Tag Ihres aktiven Plans oder „Frei“ für eigene Übungen.'],
    'Καταγράψτε κιλά και επαναλήψεις σε κάθε σετ.':['Log weight and reps for every set.','Notez charge et répétitions pour chaque série.','Erfassen Sie Gewicht und Wiederholungen für jeden Satz.'],
    'Με «Ολοκλήρωση προπόνησης» η μέρα αποθηκεύεται στο Ιστορικό.':['“Complete workout” saves the day to History.','« Terminer la séance » enregistre la journée dans l’historique.','„Training abschließen“ speichert den Tag im Verlauf.'],
    'Δώστε όνομα στο πρόγραμμα και ορίστε διάρκεια 3–10 ημερών.':['Name your routine and set a duration of 3–10 days.','Nommez votre programme et définissez une durée de 3 à 10 jours.','Benennen Sie Ihren Plan und legen Sie eine Dauer von 3–10 Tagen fest.'],
    'Προσθέστε σε κάθε ημέρα προπόνηση με ασκήσεις και εργάσιμα sets.':['Add a workout with exercises and working sets to each day.','Ajoutez à chaque jour une séance avec exercices et séries de travail.','Fügen Sie jedem Tag ein Training mit Übungen und Arbeitssätzen hinzu.'],
    'Ορίστε ποιο πρόγραμμα είναι το ενεργό και αυτό θα φορτώνει στην Καταγραφή.':['Set which routine is active and that one will load in Log.','Définissez le programme actif et c’est lui qui se chargera dans Saisie.','Legen Sie den aktiven Plan fest — dieser lädt dann unter Erfassen.'],
    'Συμπληρώστε όνομα, ημερομηνία γέννησης και βάρος.':['Fill in your name, birth date and weight.','Renseignez nom, date de naissance et poids.','Tragen Sie Name, Geburtsdatum und Gewicht ein.'],
    'Διαλέξτε έτοιμο avatar ή ανεβάστε δική σας εικόνα.':['Choose a ready-made avatar or upload your own image.','Choisissez un avatar prêt à l’emploi ou importez votre image.','Wählen Sie einen fertigen Avatar oder laden Sie ein eigenes Bild hoch.'],
    'Ανεβάστε τη δική σας εικόνα προφίλ.':['Upload your own profile image.','Importez votre propre image de profil.','Laden Sie Ihr eigenes Profilbild hoch.'],
    'Η κάρτα αθλητή ενημερώνεται αυτόματα και εμφανίζεται στην Αρχική.':['The athlete card updates automatically and appears on Home.','La carte d’athlète se met à jour automatiquement et apparaît sur l’Accueil.','Die Athletenkarte aktualisiert sich automatisch und erscheint auf der Startseite.'],
    'Επιλέξτε από τα φίλτρα προπόνηση, άσκηση και σετ.':['Use the filters to pick a workout, exercise and set.','Utilisez les filtres pour choisir séance, exercice et série.','Wählen Sie über die Filter Training, Übung und Satz.'],
    'Το γράφημα δείχνει πώς εξελίσσονται το βάρος και οι επαναλήψεις από προπόνηση σε προπόνηση.':['The chart shows how weight and reps evolve from workout to workout.','Le graphique montre l’évolution de la charge et des répétitions séance après séance.','Das Diagramm zeigt, wie sich Gewicht und Wiederholungen von Training zu Training entwickeln.'],
    'Η τάση δείχνει την πραγματική πορεία.':['The trend shows the real progress.','La tendance montre la vraie progression.','Der Trend zeigt den wahren Fortschritt.'],
    'ΕΒΔΟΜΑΔΙΑΙΟ ΠΛΑΝΟ':['WEEKLY PLAN','PROGRAMME HEBDOMADAIRE','WOCHENPLAN'],
    '01 / ΕΒΔΟΜΑΔΙΑΙΕΣ ΡΟΥΤΙΝΕΣ':['01 / WEEKLY ROUTINES','01 / PROGRAMMES HEBDOMADAIRES','01 / WOCHENPLÄNE'],
    'ΤΑ ΠΡΟΓΡΑΜΜΑΤΑ ΣΑΣ':['YOUR ROUTINES','VOS PROGRAMMES','IHRE PLÄNE'],
    'ΝΕΟ ΠΡΟΓΡΑΜΜΑ':['NEW ROUTINE','NOUVEAU PROGRAMME','NEUER PLAN'],
    'ΟΡΙΣΜΟΣ ΜΙΚΡΟΚΥΚΛΟΥ':['TRAINING CYCLE SETUP','DÉFINITION DU MICROCYCLE','TRAININGSZYKLUS FESTLEGEN'],
    'Πλοήγηση προγραμμάτων':['Routine navigation','Navigation des programmes','Plannavigation'],
    'Προγράμματα προπόνησης':['Training routines','Programmes d’entraînement','Trainingspläne'],
    'Προηγούμενο πρόγραμμα':['Previous routine','Programme précédent','Vorheriger Plan'],
    'Επόμενο πρόγραμμα':['Next routine','Programme suivant','Nächster Plan'],
    'ΕΝΕΡΓΟ ΠΡΟΓΡΑΜΜΑ':['ACTIVE ROUTINE','PROGRAMME ACTIF','AKTIVER PLAN'],
    'ΗΜΕΡΕΣ':['DAYS','JOURS','TAGE'],
    'ΔΙΑΡΚΕΙΑ':['DURATION','DURÉE','DAUER'],
    'ΑΣΚΗΣΕΙΣ ΠΡΟΠΟΝΗΣΗΣ':['WORKOUT EXERCISES','EXERCICES DE LA SÉANCE','TRAININGSÜBUNGEN'],
    'ΣΥΧΝΟΤΗΤΑ 7 ΗΜΕΡΩΝ':['7-DAY FREQUENCY','FRÉQUENCE SUR 7 JOURS','7-TAGE-FREQUENZ'],
    'Ιστορικό προπονήσεων':['Workout history','Historique des séances','Trainingsverlauf'],
    'Η ΣΕΛΙΔΑ ΤΗΣ ΠΡΟΠΟΝΗΣΗΣ':['THE WORKOUT PAGE','LA PAGE DE LA SÉANCE','DIE TRAININGSSEITE'],
    'Η σελίδα της προπόνησης':['The workout page','La page de la séance','Die Trainingsseite'],
    'ΚΛΕΙΣΙΜΟ ΣΕΛΙΔΑΣ ↑':['CLOSE PAGE ↑','FERMER LA PAGE ↑','SEITE SCHLIESSEN ↑'],
    'ΣΗΜΕΙΩΣΕΙΣ':['NOTES','NOTES','NOTIZEN'],
    'Δεν καταγράφηκαν σετ.':['No sets were logged.','Aucune série n’a été saisie.','Keine Sätze wurden erfasst.'],
    'Σωματικό βάρος':['Bodyweight','Poids du corps','Körpergewicht'],
    'ΚΑΛΥΤΕΡΑ ΣΕΤ':['BEST SETS','MEILLEURES SÉRIES','BESTE SÄTZE'],
    'ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ ΑΘΛΗΤΗ':['ATHLETE DETAILS','INFORMATIONS DE L’ATHLÈTE','ATHLETENDATEN'],
    'ΑΠΟΘΗΚΕΥΣΗ ΠΡΟΦΙΛ':['SAVE PROFILE','ENREGISTRER LE PROFIL','PROFIL SPEICHERN'],
    'ΟΝΟΜΑ':['NAME','NOM','NAME'],
    'ΝΕΟ ΠΡΟΦΙΛ':['NEW PROFILE','NOUVEAU PROFIL','NEUES PROFIL'],
    'ΕΙΚΟΝΑ':['IMAGE','IMAGE','BILD'],
    'ΑΝΕΒΑΣΜΑ ΕΙΚΟΝΑΣ':['UPLOAD IMAGE','IMPORTER UNE IMAGE','BILD HOCHLADEN'],
    'ΑΛΛΑΓΗ ΕΙΚΟΝΑΣ':['CHANGE IMAGE','CHANGER L’IMAGE','BILD ÄNDERN'],
    'Η εικόνα είναι έτοιμη':['Image ready','Image prête','Bild bereit'],
    'ΜΗ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ':['UNSAVED CHANGES','MODIFICATIONS NON ENREGISTRÉES','NICHT GESPEICHERTE ÄNDERUNGEN'],
    'ΤΟ ΑΠΟΤΥΠΩΜΑ':['THE MARK','L’EMPREINTE','DIE SPUR'],
    'ΜΕΝΕΙ.':['REMAINS.','RESTE.','BLEIBT.'],
    'ΤΟ ΠΛΑΝΟ':['THE PLAN','LE PLAN','DER PLAN'],
    'ΟΔΗΓΕΙ.':['LEADS.','GUIDE.','FÜHRT.'],
    'Η ΔΟΥΛΕΙΑ':['THE WORK','LE TRAVAIL','DIE ARBEIT'],
    'ΜΙΛΑΕΙ.':['SPEAKS.','PARLE.','SPRICHT.'],
    'Η ΠΟΡΕΙΑ':['PROGRESS','LA PROGRESSION','DER FORTSCHRITT'],
    'ΦΑΙΝΕΤΑΙ.':['SHOWS.','SE VOIT.','ZEIGT SICH.'],
    'ΣΗΜΕΡΑ':['TODAY','AUJOURD’HUI','HEUTE'],
    'ΜΕΤΡΑΕΙ.':['COUNTS.','COMPTE.','ZÄHLT.'],
    'ΠΛΟΗΓΗΣΗ':['NAVIGATION','NAVIGATION','NAVIGATION'],
    'Μετάβαση στο Ιστορικό':['Go to History','Accéder à l’historique','Zum Verlauf'],
    'Κλείσιμο μενού':['Close menu','Fermer le menu','Menü schließen'],
    'Κύρια πλοήγηση':['Main navigation','Navigation principale','Hauptnavigation'],
    'Μετάβαση στην Αρχική':['Go to Home','Accéder à l’accueil','Zur Startseite'],
    'ΚΑΤΑΓΡΑΦΗ ΠΡΟΠΟΝΗΣΗΣ':['WORKOUT LOG','SAISIE D’ENTRAÎNEMENT','TRAININGSEINTRAG'],
    'ΠΕΡΙΣΣΟΤΕΡΑ ΑΠΟ ΜΙΑ ΚΑΤΑΓΡΑΦΗ.':['MORE THAN A LOG.','PLUS QU’UNE SAISIE.','MEHR ALS EIN EINTRAG.'],
    'Ένας χώρος που θα μεγαλώνει μαζί με την κοινότητα — ήχος, ιστορίες και ιδέες για την επόμενη προπόνηση.':['A space that will grow with the community — sound, stories and ideas for the next workout.','Un espace qui grandira avec la communauté — sons, histoires et idées pour la prochaine séance.','Ein Ort, der mit der Community wächst — Sound, Geschichten und Ideen fürs nächste Training.'],
    'Προσεχείς προτάσεις κοινότητας':['Upcoming community recommendations','Prochaines recommandations de la communauté','Kommende Empfehlungen der Community'],
    'PODCAST ΤΗΣ ΕΒΔΟΜΑΔΑΣ':['PODCAST OF THE WEEK','PODCAST DE LA SEMAINE','PODCAST DER WOCHE'],
    'ΣΥΝΤΟΜΑ':['COMING SOON','BIENTÔT','BALD'],
    'Αρχική':['Home','Accueil','Start'],
    'Γλώσσα εφαρμογής':['Application language','Langue de l’application','Anwendungssprache'],
    'ΓΛΩΣΣΑ':['LANGUAGE','LANGUE','SPRACHE'],
    'Καταγραφή':['Log','Saisie','Erfassen'],
    'Πρόγραμμα':['Plan','Programme','Plan'],
    'Ιστορικό':['History','Historique','Verlauf'],
    'Επίβλεψη':['Progress','Progression','Fortschritt'],
    'Προφίλ':['Profile','Profil','Profil'],
    'ΛΟΓΑΡΙΑΣΜΟΣ':['ACCOUNT','COMPTE','KONTO'],
    'ΤΟΠΙΚΗ ΛΕΙΤΟΥΡΓΙΑ':['LOCAL MODE','MODE LOCAL','LOKALER MODUS'],
    'ΧΩΡΙΣ ΣΥΝΔΕΣΗ':['SIGNED OUT','DÉCONNECTÉ','ABGEMELDET'],
    'ΣΥΝΔΕΔΕΜΕΝΟΣ':['SIGNED IN','CONNECTÉ','ANGEMELDET'],
    'Κλείσιμο λογαριασμού':['Close account','Fermer le compte','Konto schließen'],
    'Επιλογή σύνδεσης ή εγγραφής':['Choose sign in or sign up','Choisir connexion ou inscription','Anmelden oder registrieren wählen'],
    'ΚΑΡΤΑ ΜΕΛΟΥΣ':['MEMBER CARD','CARTE DE MEMBRE','MITGLIEDSKARTE'],
    'ΣΥΝΕΧΕΙΑ ΜΕ GOOGLE':['CONTINUE WITH GOOGLE','CONTINUER AVEC GOOGLE','WEITER MIT GOOGLE'],
    'Ή ΜΕ EMAIL':['OR WITH EMAIL','OU AVEC UN E-MAIL','ODER MIT E-MAIL'],
    'ΣΥΝΔΕΣΗ':['SIGN IN','CONNEXION','ANMELDEN'],
    'ΕΓΓΡΑΦΗ':['SIGN UP','INSCRIPTION','REGISTRIEREN'],
    'Email':['Email','E-mail','E-Mail'],
    'Κωδικός':['Password','Mot de passe','Passwort'],
    'Ξεχάσατε τον κωδικό πρόσβασης':['Forgot your password','Mot de passe oublié','Passwort vergessen'],
    'Γράψτε το email του λογαριασμού σας και θα σας στείλουμε ασφαλή σύνδεσμο αλλαγής κωδικού.':['Enter your account email and we will send you a secure password reset link.','Saisissez l’e-mail de votre compte et nous vous enverrons un lien sécurisé pour changer votre mot de passe.','Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden Ihnen einen sicheren Link zum Ändern Ihres Passworts.'],
    'ΑΠΟΣΤΟΛΗ ΣΥΝΔΕΣΜΟΥ':['SEND LINK','ENVOYER LE LIEN','LINK SENDEN'],
    'ΕΠΙΣΤΡΟΦΗ ΣΤΗ ΣΥΝΔΕΣΗ':['BACK TO SIGN IN','RETOUR À LA CONNEXION','ZURÜCK ZUR ANMELDUNG'],
    'Ορίστε έναν νέο κωδικό πρόσβασης για τον λογαριασμό σας.':['Set a new password for your account.','Définissez un nouveau mot de passe pour votre compte.','Legen Sie ein neues Passwort für Ihr Konto fest.'],
    'Νέος κωδικός':['New password','Nouveau mot de passe','Neues Passwort'],
    'Επιβεβαίωση νέου κωδικού':['Confirm new password','Confirmer le nouveau mot de passe','Neues Passwort bestätigen'],
    'ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ':['CHANGE PASSWORD','CHANGER LE MOT DE PASSE','PASSWORT ÄNDERN'],
    'Τουλάχιστον 8 χαρακτήρες':['At least 8 characters','Au moins 8 caractères','Mindestens 8 Zeichen'],
    'ΣΥΝΔΕΣΗ ΣΤΟΝ ΛΟΓΑΡΙΑΣΜΟ':['SIGN IN TO ACCOUNT','SE CONNECTER AU COMPTE','BEIM KONTO ANMELDEN'],
    'Επιβεβαίωση κωδικού':['Confirm password','Confirmer le mot de passe','Passwort bestätigen'],
    'ΔΗΜΙΟΥΡΓΙΑ ΛΟΓΑΡΙΑΣΜΟΥ':['CREATE ACCOUNT','CRÉER LE COMPTE','KONTO ERSTELLEN'],
    'Η σύνδεση είναι ενεργή σε αυτή τη συσκευή.':['Your session is active on this device.','Votre session est active sur cet appareil.','Ihre Sitzung ist auf diesem Gerät aktiv.'],
    'Τοπική αποθήκευση · συνδεθείτε για συγχρονισμό.':['Local storage · sign in to sync.','Stockage local · connectez-vous pour synchroniser.','Lokale Speicherung · zum Synchronisieren anmelden.'],
    'Εκτός σύνδεσης · οι αλλαγές μένουν σε αυτή τη συσκευή.':['Offline · changes remain on this device.','Hors ligne · les modifications restent sur cet appareil.','Offline · Änderungen bleiben auf diesem Gerät.'],
    'Συγχρονισμός δεδομένων…':['Syncing data…','Synchronisation des données…','Daten werden synchronisiert…'],
    'Συγχρονισμένο σε όλες τις συσκευές.':['Synced across all devices.','Synchronisé sur tous les appareils.','Auf allen Geräten synchronisiert.'],
    'Ήρθαν αλλαγές από άλλη συσκευή. Θα εφαρμοστούν μόλις αποθηκεύσετε.':['Changes arrived from another device. They will apply once you save.','Des modifications sont arrivées d’un autre appareil. Elles s’appliqueront après l’enregistrement.','Änderungen von einem anderen Gerät sind eingetroffen. Sie werden nach dem Speichern übernommen.'],
    'Δεν ολοκληρώθηκε ο συγχρονισμός. Οι αλλαγές παραμένουν ασφαλείς στη συσκευή.':['Sync did not complete. Changes remain safe on this device.','La synchronisation a échoué. Les modifications restent en sécurité sur cet appareil.','Synchronisierung fehlgeschlagen. Änderungen bleiben sicher auf diesem Gerät.'],
    'Δεν ήταν δυνατή η εκκίνηση του συγχρονισμού.':['Sync could not be started.','Impossible de démarrer la synchronisation.','Synchronisierung konnte nicht gestartet werden.'],
    'Cloud εκτός σύνδεσης · τα δεδομένα παραμένουν τοπικά.':['Cloud offline · data remains local.','Cloud hors ligne · les données restent locales.','Cloud offline · Daten bleiben lokal.'],
    'ΑΠΟΣΥΝΔΕΣΗ':['SIGN OUT','DÉCONNEXION','ABMELDEN'],
    'Οι προπονήσεις παραμένουν σε αυτή τη συσκευή μέχρι να ενεργοποιηθεί ο συγχρονισμός.':['Workouts remain on this device until sync is enabled.','Les séances restent sur cet appareil jusqu’à l’activation de la synchronisation.','Trainings bleiben auf diesem Gerät, bis die Synchronisierung aktiviert ist.'],
    'Η σύνδεση στο cloud φορτώνει…':['Cloud connection is loading…','Connexion au cloud en cours…','Cloud-Verbindung wird geladen…'],
    'Το cloud δεν είναι διαθέσιμο. Η τοπική λειτουργία συνεχίζεται.':['Cloud is unavailable. Local mode remains active.','Le cloud est indisponible. Le mode local reste actif.','Die Cloud ist nicht verfügbar. Der lokale Modus bleibt aktiv.'],
    'Δεν ήταν δυνατή η ανάκτηση της σύνδεσης.':['The session could not be restored.','Impossible de restaurer la session.','Die Sitzung konnte nicht wiederhergestellt werden.'],
    'Δεν ήταν δυνατή η σύνδεση. Ελέγξτε email και κωδικό.':['Sign in failed. Check your email and password.','Échec de la connexion. Vérifiez votre e-mail et votre mot de passe.','Anmeldung fehlgeschlagen. Prüfen Sie E-Mail und Passwort.'],
    'Αποστολή συνδέσμου αλλαγής κωδικού…':['Sending password reset link…','Envoi du lien de changement de mot de passe…','Link zum Ändern des Passworts wird gesendet…'],
    'Δεν ήταν δυνατή η αποστολή του συνδέσμου. Δοκιμάστε ξανά.':['The link could not be sent. Try again.','Le lien n’a pas pu être envoyé. Réessayez.','Der Link konnte nicht gesendet werden. Versuchen Sie es erneut.'],
    'Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο αλλαγής κωδικού.':['If an account exists for this email, you will receive a password reset link.','Si un compte existe pour cet e-mail, vous recevrez un lien pour changer votre mot de passe.','Wenn für diese E-Mail ein Konto existiert, erhalten Sie einen Link zum Ändern des Passworts.'],
    'Αλλαγή κωδικού…':['Changing password…','Modification du mot de passe…','Passwort wird geändert…'],
    'Δεν ήταν δυνατή η αλλαγή του κωδικού. Ζητήστε νέο σύνδεσμο.':['The password could not be changed. Request a new link.','Le mot de passe n’a pas pu être modifié. Demandez un nouveau lien.','Das Passwort konnte nicht geändert werden. Fordern Sie einen neuen Link an.'],
    'Μεταφορά στη Google…':['Redirecting to Google…','Redirection vers Google…','Weiterleitung zu Google…'],
    'Δεν ήταν δυνατή η σύνδεση με Google.':['Google sign in failed.','Échec de la connexion avec Google.','Google-Anmeldung fehlgeschlagen.'],
    'Δεν ήταν δυνατή η δημιουργία λογαριασμού.':['The account could not be created.','Impossible de créer le compte.','Das Konto konnte nicht erstellt werden.'],
    'Οι κωδικοί δεν ταιριάζουν.':['Passwords do not match.','Les mots de passe ne correspondent pas.','Die Passwörter stimmen nicht überein.'],
    'Συνδεθήκατε επιτυχώς.':['You are signed in.','Vous êtes connecté.','Sie sind angemeldet.'],
    'Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό.':['Check your email to confirm your account.','Consultez votre e-mail pour confirmer votre compte.','Prüfen Sie Ihre E-Mail, um Ihr Konto zu bestätigen.'],
    'Δεν ήταν δυνατή η αποσύνδεση.':['Sign out failed.','Échec de la déconnexion.','Abmeldung fehlgeschlagen.'],
    'Αποσυνδεθήκατε. Τα τοπικά δεδομένα παραμένουν στη συσκευή.':['You are signed out. Local data remains on the device.','Vous êtes déconnecté. Les données locales restent sur l’appareil.','Sie sind abgemeldet. Lokale Daten bleiben auf dem Gerät.'],
    'Μενού':['Menu','Menu','Menü'],
    'Ημερομηνία γέννησης':['Date of birth','Date de naissance','Geburtsdatum'],
    'Ημερομηνία':['Date','Date','Datum'],
    'Τύπος προπόνησης':['Workout type','Type de séance','Trainingsart'],
    'Από το πρόγραμμα':['From plan','Depuis le programme','Aus dem Plan'],
    'Ελεύθερη προπόνηση':['Free workout','Séance libre','Freies Training'],
    'ΕΛΕΥΘΕΡΗ ΠΡΟΠΟΝΗΣΗ':['FREE WORKOUT','SÉANCE LIBRE','FREIES TRAINING'],
    'ΠΡΟΠΟΝΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ':['PLANNED WORKOUT','SÉANCE PLANIFIÉE','GEPLANTES TRAINING'],
    'Ελεύθερη':['Free','Libre','Frei'],
    'Προπόνηση ημέρας':['Day’s workout','Séance du jour','Tagestraining'],
    'Προσθήκη άσκησης':['Add exercise','Ajouter un exercice','Übung hinzufügen'],
    'Σχόλια προπόνησης':['Workout notes','Notes de séance','Trainingsnotizen'],
    'Πώς πήγε συνολικά η σημερινή προπόνηση;':['How did today’s workout go overall?','Comment s’est passée la séance aujourd’hui ?','Wie lief das heutige Training insgesamt?'],
    'Ακύρωση διορθώσεων':['Cancel changes','Annuler les corrections','Änderungen verwerfen'],
    'Ακύρωση αντιγραφής':['Cancel copy','Annuler la copie','Kopieren abbrechen'],
    'ΟΛΟΚΛΗΡΩΣΗ ΠΡΟΠΟΝΗΣΗΣ':['COMPLETE WORKOUT','TERMINER LA SÉANCE','TRAINING ABSCHLIESSEN'],
    'Ολοκλήρωση προπόνησης':['Complete workout','Terminer la séance','Training abschließen'],
    'Αποθήκευση διορθώσεων':['Save changes','Enregistrer les corrections','Änderungen speichern'],
    'Νέα εβδομαδιαία ρουτίνα':['New weekly routine','Nouveau programme hebdomadaire','Neuer Wochenplan'],
    'Δημιουργία':['Create','Créer','Erstellen'],
    'Νέα προπόνηση ημέρας':['New day workout','Nouvelle séance du jour','Neues Tagestraining'],
    'Νέα προπόνηση':['New workout','Nouvelle séance','Neues Training'],
    'Αποθήκευση προπόνησης':['Save workout','Enregistrer la séance','Training speichern'],
    'Ενημέρωση προπόνησης':['Update workout','Mettre à jour la séance','Training aktualisieren'],
    'Ημέρα':['Day','Jour','Tag'],
    'Όνομα προπόνησης':['Workout name','Nom de la séance','Trainingsname'],
    'Όνομα':['Name','Nom','Name'],
    'Αριθμός ασκήσεων':['Number of exercises','Nombre d’exercices','Anzahl Übungen'],
    'Ακύρωση επεξεργασίας':['Cancel editing','Annuler la modification','Bearbeitung abbrechen'],
    'Αποθήκευση ημέρας':['Save day','Enregistrer le jour','Tag speichern'],
    'Ενημέρωση ημέρας':['Update day','Mettre à jour le jour','Tag aktualisieren'],
    'ΤΟ ΠΛΑΝΟ ΣΑΣ':['YOUR PLAN','VOTRE PROGRAMME','IHR PLAN'],
    'Προπόνηση':['Workout','Séance','Training'],
    'Ημέρα ξεκούρασης':['Rest day','Jour de repos','Ruhetag'],
    'Επεξεργασία':['Edit','Modifier','Bearbeiten'],
    'Διαγραφή ημέρας':['Delete day','Supprimer le jour','Tag löschen'],
    'εργάσιμα σετ':['working sets','séries de travail','Arbeitssätze'],
    'Εργάσιμα σετ':['Working sets','Séries de travail','Arbeitssätze'],
    'Όνομα προγράμματος':['Routine name','Nom du programme','Planname'],
    'Αποθήκευση ονόματος':['Save name','Enregistrer le nom','Name speichern'],
    'Ακύρωση μετονομασίας':['Cancel rename','Annuler le renommage','Umbenennen abbrechen'],
    'ΣΤΗΝ ΚΑΤΑΓΡΑΦΗ':['ACTIVE IN LOG','ACTIF DANS SAISIE','AKTIV IN ERFASSEN'],
    'Ενεργό πρόγραμμα':['Active routine','Programme actif','Aktiver Plan'],
    'Ορισμός ως ενεργό πρόγραμμα':['Set as active routine','Définir comme programme actif','Als aktiven Plan festlegen'],
    'Μετονομασία προγράμματος':['Rename routine','Renommer le programme','Plan umbenennen'],
    'Διαγραφή προγράμματος':['Delete routine','Supprimer le programme','Plan löschen'],
    'Όνομα άσκησης':['Exercise name','Nom de l’exercice','Übungsname'],
    'Άσκηση':['Exercise','Exercice','Übung'],
    'ΑΣΚΗΣΗ':['EXERCISE','EXERCICE','ÜBUNG'],
    'ΣΕΤ':['SET','SÉRIE','SATZ'],
    'Αφαίρεση':['Remove','Retirer','Entfernen'],
    'Αριθμός σετ':['Number of sets','Nombre de séries','Anzahl Sätze'],
    'ΕΠΑΝΑΛΗΨΕΙΣ':['REPS','RÉPÉTITIONS','WIEDERHOLUNGEN'],
    'ΜΕΤΡΗΣΗ ΒΑΡΟΥΣ':['WEIGHT METHOD','MODE DE CHARGE','GEWICHTSMESSUNG'],
    'ΒΑΡΟΣ':['WEIGHT','CHARGE','GEWICHT'],
    'Αντιγραφή του πρώτου σετ στα υπόλοιπα':['Copy first set to the rest','Copier la première série sur les autres','Ersten Satz auf die übrigen kopieren'],
    'ΑΝΤΙΓΡΑΦΗ':['COPY','COPIER','KOPIEREN'],
    'Extra σετ':['Extra set','Série supplémentaire','Extrasatz'],
    'Σχόλια άσκησης':['Exercise notes','Notes de l’exercice','Übungsnotizen'],
    'Τεχνική, αίσθηση, RPE...':['Technique, feel, RPE...','Technique, sensations, RPE...','Technik, Gefühl, RPE...'],
    'Η προπόνηση της ημέρας':['Today’s workout','Séance du jour','Heutiges Training'],
    'Έναρξη ελεύθερης προπόνησης':['Start free workout','Démarrer une séance libre','Freies Training starten'],
    'ΠΡΟΠΟΝΗΣΕΙΣ':['WORKOUTS','SÉANCES','TRAININGS'],
    'ΣΥΧΝΟΤΗΤΑ ΕΒΔΟΜΑΔΑΣ':['WEEKLY FREQUENCY','FRÉQUENCE HEBDOMADAIRE','WOCHENFREQUENZ'],
    'ΚΑΤΑΓΕΓΡΑΜΜΕΝΕΣ ΠΡΟΠΟΝΗΣΕΙΣ':['LOGGED WORKOUTS','SÉANCES ENREGISTRÉES','ERFASSTE TRAININGS'],
    'Πλοήγηση στις ημέρες του ιστορικού':['Browse history days','Parcourir les jours de l’historique','Verlaufstage durchsuchen'],
    'Προηγούμενη ημέρα':['Previous day','Jour précédent','Vorheriger Tag'],
    'Επόμενη ημέρα':['Next day','Jour suivant','Nächster Tag'],
    'Κάθε καταγραφή αφήνει το σημάδι της.':['Every log leaves its mark.','Chaque saisie laisse sa trace.','Jeder Eintrag hinterlässt Spuren.'],
    'ΑΣΚΗΣΕΙΣ':['EXERCISES','EXERCICES','ÜBUNGEN'],
    'ΚΑΤΑΓΡΑΦΗΚΕ':['LOGGED','ENREGISTRÉ','ERFASST'],
    'ΕΠΙΛΟΓΗ':['SELECT','SÉLECTIONNER','AUSWÄHLEN'],
    'ΕΠΕΞΕΡΓΑΣΙΑ':['EDIT','MODIFIER','BEARBEITEN'],
    'ΔΙΑΓΡΑΦΗ':['DELETE','SUPPRIMER','LÖSCHEN'],
    'επαναλήψεις':['reps','répétitions','Wiederholungen'],
    'επαν.':['reps','rép.','Wdh.'],
    'πλάκες':['plates','plaques','Scheiben'],
    'Πλάκες + Κιλά':['Plates + kg','Plaques + kg','Scheiben + kg'],
    'Πλάκες':['Plates','Plaques','Scheiben'],
    'Κιλά':['kg','kg','kg'],
    'Bodyweight + Extra Βάρος':['Bodyweight + Extra Weight','Poids du corps + charge','Körpergewicht + Zusatzgewicht'],
    'Πλάκες (+ kg)':['Plates (+ kg)','Plaques (+ kg)','Scheiben (+ kg)'],
    'Bodyweight (+ kg)':['Bodyweight (+ kg)','Poids du corps (+ kg)','Körpergewicht (+ kg)'],
    'Σετ':['Set','Série','Satz'],
    'Γράφημα προόδου βάρους και επαναλήψεων':['Weight and reps progress chart','Graphique de progression charge et répétitions','Fortschrittsdiagramm für Gewicht und Wiederholungen'],
    'Έλεγχος καταγραφής:':['Log check:','Contrôle des saisies :','Eintragsprüfung:'],
    'προπόνηση εξαιρέθηκε':['workout excluded','séance exclue','Training ausgeschlossen'],
    'προπονήσεις εξαιρέθηκαν':['workouts excluded','séances exclues','Trainings ausgeschlossen'],
    'Λείπει βάρος ή επαναλήψεις από το σετ':['Weight or reps are missing from the set','Il manque la charge ou les répétitions de la série','Gewicht oder Wiederholungen fehlen im Satz'],
    'Η άσκηση δεν καταγράφηκε':['Exercise was not logged','L’exercice n’a pas été saisi','Übung wurde nicht erfasst'],
    'Δεν καταγράφηκε το σετ':['Set was not logged','La série n’a pas été saisie','Satz wurde nicht erfasst'],
    'ΗΛΙΚΙΑ':['AGE','ÂGE','ALTER'],
    'έτος':['year','an','Jahr'],
    'έτη':['years','ans','Jahre'],
    'Βάρος':['Weight','Poids','Gewicht'],
    'Μονάδα βάρους':['Weight unit','Unité de poids','Gewichtseinheit'],
    'ΕΠΙΛΟΓΗ AVATAR':['CHOOSE AVATAR','CHOISIR UN AVATAR','AVATAR WÄHLEN'],
    'ΕΙΚΟΝΑ ΠΡΟΦΙΛ':['PROFILE IMAGE','IMAGE DE PROFIL','PROFILBILD'],
    'Επιλογή':['Select','Choisir','Auswählen'],
    'Προεπισκόπηση προφίλ':['Profile preview','Aperçu du profil','Profilvorschau'],
    'Διαγραφή άσκησης':['Delete exercise','Supprimer l’exercice','Übung löschen'],
    'Ακύρωση':['Cancel','Annuler','Abbrechen'],
    'Διαγραφή':['Delete','Supprimer','Löschen'],
    'Χωρίς ημέρα':['No day','Sans jour','Kein Tag'],
    'Χωρίς ημερομηνία':['No date','Sans date','Kein Datum'],
    'Το πρόγραμμά μου':['My routine','Mon programme','Mein Plan'],
    'Δευτέρα':['Monday','Lundi','Montag'],
    'Τρίτη':['Tuesday','Mardi','Dienstag'],
    'Τετάρτη':['Wednesday','Mercredi','Mittwoch'],
    'Πέμπτη':['Thursday','Jeudi','Donnerstag'],
    'Παρασκευή':['Friday','Vendredi','Freitag'],
    'Σάββατο':['Saturday','Samedi','Samstag'],
    'Κυριακή':['Sunday','Dimanche','Sonntag'],
    'Δευ':['Mon','Lun','Mo'],
    'Τρί':['Tue','Mar','Di'],
    'Τετ':['Wed','Mer','Mi'],
    'Πέμ':['Thu','Jeu','Do'],
    'Παρ':['Fri','Ven','Fr'],
    'Σάβ':['Sat','Sam','Sa'],
    'Κυρ':['Sun','Dim','So'],
    'JPG, PNG ή WEBP':['JPG, PNG or WEBP','JPG, PNG ou WEBP','JPG, PNG oder WEBP'],
    'Να διαγραφεί οριστικά η προπόνηση':['Permanently delete workout','Supprimer définitivement la séance','Training endgültig löschen'],
    'Να διαγραφεί ολόκληρο το πρόγραμμα της':['Delete the entire workout for','Supprimer tout le programme du','Das gesamte Training löschen für'],
    'Να διαγραφεί οριστικά το':['Permanently delete','Supprimer définitivement','Endgültig löschen'],
    'και όλες οι ημέρες του;':['and all its days?','et tous ses jours ?','und alle zugehörigen Tage?'],
    'Είστε σίγουροι για την διαγραφή της άσκησης':['Are you sure you want to delete exercise','Voulez-vous vraiment supprimer l’exercice','Möchten Sie die Übung wirklich löschen'],
    'από την δήλωση της προπόνησης;':['from the workout entry?','de la saisie de séance ?','aus dem Trainingseintrag?'],
    'Η εικόνα προστέθηκε στο προφίλ':['The image was added to your profile','L’image a été ajoutée au profil','Das Bild wurde dem Profil hinzugefügt'],
    'Το προφίλ αποθηκεύτηκε':['Profile saved','Profil enregistré','Profil gespeichert'],
    'Οι διορθώσεις αποθηκεύτηκαν.':['Changes saved.','Corrections enregistrées.','Änderungen gespeichert.'],
    'Η προπόνηση αντιγράφηκε και καταγράφηκε.':['Workout copied and logged.','Séance copiée et enregistrée.','Training kopiert und erfasst.'],
    'Η αρχική προπόνηση έχει διαγραφεί και δεν μπορεί να αντιγραφεί.':['The original workout was deleted and cannot be copied.','La séance d’origine a été supprimée et ne peut pas être copiée.','Das ursprüngliche Training wurde gelöscht und kann nicht kopiert werden.'],
    'Υπάρχει ήδη καταγεγραμμένη προπόνηση για αυτή την ημέρα.':['A workout is already logged for this day.','Une séance est déjà enregistrée pour ce jour.','Für diesen Tag ist bereits ein Training erfasst.'],
    'Η προπόνηση καταγράφηκε.':['Workout logged.','Séance enregistrée.','Training erfasst.'],
    'Το 1ο σετ αντιγράφηκε στα υπόλοιπα.':['The first set was copied to the rest.','La première série a été copiée sur les autres.','Der erste Satz wurde auf die übrigen kopiert.'],
    'Η άσκηση αφαιρέθηκε από το Πρόγραμμα':['Exercise removed from the Plan','Exercice retiré du Programme','Übung aus dem Plan entfernt'],
    'Η άσκηση αφαιρέθηκε από τη δήλωση':['Exercise removed from the entry','Exercice retiré de la saisie','Übung aus dem Eintrag entfernt'],
    'Η προπόνηση διαγράφηκε':['Workout deleted','Séance supprimée','Training gelöscht'],
    'χωρίς όνομα':['unnamed','sans nom','ohne Namen'],
    'είναι τώρα ενεργό':['is now active','est maintenant actif','ist jetzt aktiv'],
    'δημιουργήθηκε':['created','créé','erstellt'],
    'διαγράφηκε':['deleted','supprimé','gelöscht'],
    'αποθηκεύτηκε':['saved','enregistré','gespeichert'],
    'Ενημερώθηκε μόνο το Πρόγραμμα':['Only the Plan was updated','Seul le Programme a été mis à jour','Nur der Plan wurde aktualisiert'],
    'Το Πρόγραμμα και το Ιστορικό ενημερώθηκαν':['Plan and History updated','Programme et Historique mis à jour','Plan und Verlauf aktualisiert'],
    'Το όνομα του προγράμματος αποθηκεύτηκε':['Routine name saved','Nom du programme enregistré','Planname gespeichert'],
    'Το πρόγραμμα':['The routine','Le programme','Der Plan'],
    'Η προπόνηση για':['Workout for','Séance du','Training für'],
    'σε 7 ημέρες. Ο ρυθμός χτίζεται.':['workouts in 7 days. The rhythm is building.','séances en 7 jours. Le rythme se construit.','Trainings in 7 Tagen. Der Rhythmus wächst.'],
    'σε 7 ημέρες. Κρατήστε τη γραμμή.':['workouts in 7 days. Keep the streak.','séances en 7 jours. Gardez le rythme.','Trainings in 7 Tagen. Halten Sie die Serie.'],
    'προπονήσεις':['workouts','séances','Trainings'],
    'ημέρες προπόνησης':['training days','jours d’entraînement','Trainingstage'],
    'ημέρα προπόνησης':['training day','jour d’entraînement','Trainingstag'],
    'ημέρες':['days','jours','Tage'],
    'π.χ. ώμοι πίσω, σταθερά πόδια':['e.g. shoulders back, feet planted','p. ex. épaules en arrière, pieds stables','z. B. Schultern zurück, Füße stabil'],
    'π.χ. Δημήτρης':['e.g. Alex','p. ex. Alex','z. B. Alex'],
    'π.χ.':['e.g.','p. ex.','z. B.']
  };

  const wordCharacter = /[\p{L}\p{N}_]/u;
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entries = Object.entries(p)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([greek, values]) => {
      const escaped = escapeRegExp(greek);
      const prefix = wordCharacter.test(greek[0]) ? '(^|[^\\p{L}\\p{N}_])' : '()';
      const suffix = wordCharacter.test(greek.at(-1)) ? '(?=$|[^\\p{L}\\p{N}_])' : '';
      return { values, pattern:new RegExp(`${prefix}${escaped}${suffix}`, 'gu') };
    });
  const textState = new WeakMap();
  const attrState = new WeakMap();
  const greekLanguageElements = new WeakSet();
  const greekCharacters = /[\u0370-\u03ff\u1f00-\u1fff]/;
  let language = languages.includes(localStorage.getItem('logbookLanguage')) ? localStorage.getItem('logbookLanguage') : 'el';

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
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    elements.forEach(element => ['aria-label','placeholder','title'].forEach(name => {
      if (element.hasAttribute(name)) translateAttribute(element, name);
    }));
    elements.forEach(updateGreekLanguage);
    document.documentElement.lang = language;
    document.title = convert('Logbook — Ημερολόγιο Προπόνησης');
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

  window.LogbookI18n = { translate, setLanguage, getLanguage:() => language, getLocale:() => locales[language], t:convert };
  translate(document);
}());
