(function () {
  const locales = { el:'el-GR', en:'en-GB', fr:'fr-FR', de:'de-DE' };
  const languages = ['el', 'en', 'fr', 'de'];

  // Greek remains the stable source language so existing saved plans keep working.
  // Each entry is [English, French, German]. Longer phrases are applied first.
  const p = {
    'Logbook — Ημερολόγιο Προπόνησης':['Logbook — Training Journal','Logbook — Journal d’entraînement','Logbook — Trainingstagebuch'],
    'Ημερολόγιο Προπόνησης':['Training Journal','Journal d’entraînement','Trainingstagebuch'],
    'Το σημερινό σου πλάνο σε περιμένει. Κατάγραψε σετ, κιλά και επαναλήψεις — τα νούμερα χτίζουν την πρόοδο.':['Today’s plan is waiting. Log sets, weight and reps — the numbers build progress.','Le programme du jour vous attend. Notez séries, charges et répétitions — les chiffres construisent vos progrès.','Der heutige Plan wartet. Erfasse Sätze, Gewicht und Wiederholungen — Zahlen schaffen Fortschritt.'],
    'Δημιούργησε όσα εβδομαδιαία προγράμματα θέλεις. Το πρόγραμμα με το αστέρι είναι το ενεργό — αυτό ανοίγει στην Καταγραφή.':['Create as many weekly routines as you like. The starred routine is active — it opens in Log.','Créez autant de programmes hebdomadaires que vous le souhaitez. Le programme étoilé est actif — il s’ouvre dans Saisie.','Erstelle beliebig viele Wochenpläne. Der Plan mit Stern ist aktiv — er öffnet sich unter Erfassen.'],
    'Επίλεξε πρόγραμμα για να επεξεργαστείς τις ημέρες του ή όρισέ το ως ενεργό με το αστέρι.':['Select a routine to edit its days, or make it active with the star.','Sélectionnez un programme pour modifier ses jours ou activez-le avec l’étoile.','Wähle einen Plan, um seine Tage zu bearbeiten, oder aktiviere ihn mit dem Stern.'],
    'Ορίζεις άσκηση, working sets και τεχνικό cue. Κιλά και επαναλήψεις καταγράφονται στην εκτέλεση.':['Set the exercise, working sets and technical cue. Weight and reps are logged during training.','Définissez l’exercice, les séries de travail et le repère technique. Charges et répétitions sont saisies pendant la séance.','Lege Übung, Arbeitssätze und Technikhinweis fest. Gewicht und Wiederholungen werden beim Training erfasst.'],
    'Μία μέτρηση δεν ορίζει την πορεία. Το γράφημα δείχνει βάρος και επαναλήψεις ανά σετ, προπόνηση με προπόνηση.':['One measurement does not define your journey. The chart tracks weight and reps per set, workout by workout.','Une mesure ne définit pas votre progression. Le graphique suit charge et répétitions par série, séance après séance.','Ein einzelner Wert bestimmt nicht deinen Weg. Das Diagramm zeigt Gewicht und Wiederholungen pro Satz, Training für Training.'],
    'Τα βασικά στοιχεία του αθλητή, συγκεντρωμένα σε μία καθαρή κάρτα. Επίλεξε ένα έτοιμο avatar ή ανέβασε τη δική σου εικόνα.':['Your essential athlete details in one clear card. Choose an avatar or upload your own image.','Les informations essentielles de l’athlète réunies sur une carte claire. Choisissez un avatar ou importez votre image.','Deine wichtigsten Athletendaten auf einer übersichtlichen Karte. Wähle einen Avatar oder lade ein eigenes Bild hoch.'],
    'Χρειάζονται τουλάχιστον δύο καταγραφές της άσκησης με την ίδια μονάδα βάρους. Μην εναλλάσσεις Κιλά, Πλάκες ή μικτή μέτρηση.':['At least two logs of the exercise using the same weight unit are required. Do not mix kg, plates or mixed measurement.','Il faut au moins deux saisies de l’exercice avec la même unité. Ne mélangez pas kg, plaques et mesure mixte.','Mindestens zwei Einträge der Übung mit derselben Gewichtseinheit sind nötig. Mische nicht kg, Scheiben und gemischte Messung.'],
    'Η τελευταία επίδοση είναι χαμηλότερη. Έλεγξε τεχνική, ύπνο και αποκατάσταση πριν βγάλεις συμπέρασμα.':['The latest result is lower. Check technique, sleep and recovery before drawing a conclusion.','La dernière performance est plus faible. Vérifiez technique, sommeil et récupération avant de conclure.','Die letzte Leistung ist niedriger. Prüfe Technik, Schlaf und Erholung, bevor du Schlüsse ziehst.'],
    'Άλλαξε όνομα προπόνησης, άσκησης ή ημέρα. Θέλεις οι παλιές καταγραφές να διατηρήσουν τα ιστορικά τους ονόματα ή να ενημερωθούν μαζί με το Πρόγραμμα;':['A workout name, exercise or day changed. Should old logs keep their historical names or update with the Plan?','Un nom de séance, un exercice ou un jour a changé. Les anciennes saisies doivent-elles garder leurs noms ou suivre le Programme ?','Ein Trainingsname, eine Übung oder ein Tag wurde geändert. Sollen alte Einträge ihre Namen behalten oder mit dem Plan aktualisiert werden?'],
    'Επίλεξε το πρόγραμμα άλλης ημέρας ή ξεκίνα μια «Ελεύθερη» καταγραφή.':['Choose another day’s workout or start a “Free” log.','Choisissez la séance d’un autre jour ou démarrez une saisie « Libre ».','Wähle das Training eines anderen Tages oder starte eine „Freie“ Erfassung.'],
    'Ολοκλήρωσε την πρώτη προπόνηση και άρχισε να χτίζεις το αρχείο σου.':['Complete your first workout and start building your record.','Terminez votre première séance et commencez à construire votre historique.','Schließe dein erstes Training ab und beginne dein Archiv aufzubauen.'],
    'Οι καλύτερες επιδόσεις υπολογίζονται αυτόματα από τις καταγραφές σου.':['Personal bests are calculated automatically from your logs.','Les meilleures performances sont calculées automatiquement à partir de vos saisies.','Bestleistungen werden automatisch aus deinen Einträgen berechnet.'],
    'Κατάγραψε τουλάχιστον δύο ίδια σετ για να δεις πρόοδο.':['Log at least two matching sets to see progress.','Saisissez au moins deux séries comparables pour voir les progrès.','Erfasse mindestens zwei vergleichbare Sätze, um Fortschritt zu sehen.'],
    'Το ήδη καταγεγραμμένο Ιστορικό θα παραμείνει.':['Existing workout history will remain.','L’historique déjà enregistré sera conservé.','Der bestehende Trainingsverlauf bleibt erhalten.'],
    'Το Ιστορικό προπονήσεων θα παραμείνει.':['Workout history will remain.','L’historique des séances sera conservé.','Der Trainingsverlauf bleibt erhalten.'],
    'Θα χαθούν όλα τα σετ και οι μετρήσεις της.':['All its sets and measurements will be lost.','Toutes ses séries et mesures seront perdues.','Alle Sätze und Messwerte gehen verloren.'],
    'Διόρθωσε τις τιμές που θέλεις και αποθήκευσε ξανά.':['Adjust the values you want and save again.','Corrigez les valeurs souhaitées et enregistrez à nouveau.','Passe die gewünschten Werte an und speichere erneut.'],
    'Συμπλήρωσε όσα πραγματικά εκτέλεσες.':['Enter what you actually completed.','Saisissez ce que vous avez réellement effectué.','Trage ein, was du tatsächlich absolviert hast.'],
    'Η πρώτη καταγραφή είναι η γραμμή εκκίνησης.':['Your first log is the starting line.','Votre première saisie est la ligne de départ.','Dein erster Eintrag ist die Startlinie.'],
    'Ο ρυθμός ξεκίνησε. Η επόμενη καταγραφή τον χτίζει.':['The rhythm has started. The next log builds it.','Le rythme est lancé. La prochaine saisie le renforce.','Der Rhythmus ist gestartet. Der nächste Eintrag baut ihn aus.'],
    'Η γραμμή εκκίνησης είναι εδώ.':['The starting line is here.','La ligne de départ est ici.','Die Startlinie ist hier.'],
    'Τα σημεία αναφοράς θα έρθουν.':['Your benchmarks will appear here.','Vos repères apparaîtront ici.','Deine Richtwerte erscheinen hier.'],
    'Δεν υπάρχει ασφαλής σύγκριση.':['No reliable comparison is available.','Aucune comparaison fiable n’est disponible.','Kein zuverlässiger Vergleich verfügbar.'],
    'Δεν υπάρχει αρκετός χώρος για την εικόνα. Δοκίμασε μικρότερο αρχείο.':['There is not enough space for the image. Try a smaller file.','L’espace est insuffisant pour l’image. Essayez un fichier plus petit.','Für das Bild ist nicht genug Speicher vorhanden. Versuche eine kleinere Datei.'],
    'Η εικόνα πρέπει να είναι μικρότερη από 10 MB.':['The image must be smaller than 10 MB.','L’image doit faire moins de 10 Mo.','Das Bild muss kleiner als 10 MB sein.'],
    'Δεν ήταν δυνατή η επεξεργασία της εικόνας.':['The image could not be processed.','Impossible de traiter l’image.','Das Bild konnte nicht verarbeitet werden.'],
    'Δεν ήταν δυνατή η ανάγνωση της εικόνας.':['The image could not be read.','Impossible de lire l’image.','Das Bild konnte nicht gelesen werden.'],
    'Το αρχείο εικόνας δεν είναι έγκυρο.':['The image file is invalid.','Le fichier image n’est pas valide.','Die Bilddatei ist ungültig.'],
    'Επίλεξε εικόνα JPG, PNG ή WEBP.':['Choose a JPG, PNG or WEBP image.','Choisissez une image JPG, PNG ou WEBP.','Wähle ein JPG-, PNG- oder WEBP-Bild.'],
    'Χρειάζεται να υπάρχει τουλάχιστον ένα πρόγραμμα':['At least one routine is required','Au moins un programme est requis','Mindestens ein Plan ist erforderlich'],
    'Πρόσθεσε τουλάχιστον μία άσκηση':['Add at least one exercise','Ajoutez au moins un exercice','Füge mindestens eine Übung hinzu'],
    'Επίλεξε ημερομηνία προπόνησης':['Choose a workout date','Choisissez une date de séance','Wähle ein Trainingsdatum'],
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
    'ΕΒΔΟΜΑΔΙΑΙΟ ΠΛΑΝΟ':['WEEKLY PLAN','PROGRAMME HEBDOMADAIRE','WOCHENPLAN'],
    '01 / ΕΒΔΟΜΑΔΙΑΙΕΣ ΡΟΥΤΙΝΕΣ':['01 / WEEKLY ROUTINES','01 / PROGRAMMES HEBDOMADAIRES','01 / WOCHENPLÄNE'],
    'ΤΑ ΠΡΟΓΡΑΜΜΑΤΑ ΣΟΥ':['YOUR ROUTINES','VOS PROGRAMMES','DEINE PLÄNE'],
    'ΑΣΚΗΣΕΙΣ ΠΡΟΠΟΝΗΣΗΣ':['WORKOUT EXERCISES','EXERCICES DE LA SÉANCE','TRAININGSÜBUNGEN'],
    'ΣΥΧΝΟΤΗΤΑ 7 ΗΜΕΡΩΝ':['7-DAY FREQUENCY','FRÉQUENCE SUR 7 JOURS','7-TAGE-FREQUENZ'],
    'Ιστορικό προπονήσεων':['Workout history','Historique des séances','Trainingsverlauf'],
    'ΚΑΛΥΤΕΡΑ ΣΕΤ':['BEST SETS','MEILLEURES SÉRIES','BESTE SÄTZE'],
    'ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ ΑΘΛΗΤΗ':['ATHLETE DETAILS','INFORMATIONS DE L’ATHLÈTE','ATHLETENDATEN'],
    'ΑΠΟΘΗΚΕΥΣΗ ΠΡΟΦΙΛ':['SAVE PROFILE','ENREGISTRER LE PROFIL','PROFIL SPEICHERN'],
    'ΟΝΟΜΑ ΑΘΛΗΤΗ':['ATHLETE NAME','NOM DE L’ATHLÈTE','ATHLETENNAME'],
    'ΤΟ ΟΝΟΜΑ ΣΟΥ':['YOUR NAME','VOTRE NOM','DEIN NAME'],
    'ΝΕΟ ΠΡΟΦΙΛ':['NEW PROFILE','NOUVEAU PROFIL','NEUES PROFIL'],
    'ΔΙΚΗ ΣΟΥ ΕΙΚΟΝΑ':['YOUR IMAGE','VOTRE IMAGE','DEIN BILD'],
    'ΑΝΕΒΑΣΕ ΕΙΚΟΝΑ':['UPLOAD IMAGE','IMPORTER UNE IMAGE','BILD HOCHLADEN'],
    'ΑΛΛΑΓΗ ΕΙΚΟΝΑΣ':['CHANGE IMAGE','CHANGER L’IMAGE','BILD ÄNDERN'],
    'Η εικόνα είναι έτοιμη':['Image ready','Image prête','Bild bereit'],
    'ΑΠΟΘΗΚΕΥΜΕΝΟ':['SAVED','ENREGISTRÉ','GESPEICHERT'],
    'ΤΟ ΔΙΚΟ ΣΟΥ':['YOUR','VOTRE','DEIN'],
    'ΑΠΟΤΥΠΩΜΑ.':['MARK.','EMPREINTE.','PROFIL.'],
    'ΧΤΙΣΕ ΤΟ':['BUILD','CRÉEZ','BAUE'],
    'ΠΛΑΝΟ ΣΟΥ.':['YOUR PLAN.','VOTRE PROGRAMME.','DEINEN PLAN.'],
    'Η ΔΟΥΛΕΙΑ':['THE WORK','LE TRAVAIL','DIE ARBEIT'],
    'ΜΙΛΑΕΙ.':['SPEAKS.','PARLE.','SPRICHT.'],
    'ΔΕΣ ΤΗΝ':['SEE YOUR','SUIVEZ VOTRE','SIEH DEINEN'],
    'ΠΟΡΕΙΑ ΣΟΥ.':['PROGRESS.','PROGRESSION.','FORTSCHRITT.'],
    'ΣΗΜΕΡΑ':['TODAY','AUJOURD’HUI','HEUTE'],
    'ΜΕΤΡΑΕΙ.':['COUNTS.','COMPTE.','ZÄHLT.'],
    'ΠΛΟΗΓΗΣΗ':['NAVIGATION','NAVIGATION','NAVIGATION'],
    'Μετάβαση στο Ιστορικό':['Go to History','Accéder à l’historique','Zum Verlauf'],
    'Κλείσιμο μενού':['Close menu','Fermer le menu','Menü schließen'],
    'Κύρια πλοήγηση':['Main navigation','Navigation principale','Hauptnavigation'],
    'Μετάβαση στην Αρχική':['Go to Home','Accéder à l’accueil','Zur Startseite'],
    'ΤΟ ΣΗΜΕΡΙΝΟ ΣΟΥ ΣΗΜΕΙΟ ΕΚΚΙΝΗΣΗΣ':['YOUR STARTING POINT FOR TODAY','VOTRE POINT DE DÉPART DU JOUR','DEIN STARTPUNKT FÜR HEUTE'],
    'ΞΕΚΙΝΑ ΤΗ ΣΗΜΕΡΙΝΗ ΚΑΤΑΓΡΑΦΗ':['START TODAY’S LOG','COMMENCER LA SAISIE DU JOUR','HEUTIGEN EINTRAG STARTEN'],
    'ΠΕΡΙΣΣΟΤΕΡΑ ΑΠΟ ΜΙΑ ΚΑΤΑΓΡΑΦΗ.':['MORE THAN A LOG.','PLUS QU’UNE SAISIE.','MEHR ALS EIN EINTRAG.'],
    'Ένας χώρος που θα μεγαλώνει μαζί με την κοινότητα — ήχος, ιστορίες και ιδέες για την επόμενη προπόνηση.':['A space that will grow with the community — sound, stories and ideas for the next workout.','Un espace qui grandira avec la communauté — sons, histoires et idées pour la prochaine séance.','Ein Ort, der mit der Community wächst — Sound, Geschichten und Ideen fürs nächste Training.'],
    'Προσεχείς προτάσεις κοινότητας':['Upcoming community recommendations','Prochaines recommandations de la communauté','Kommende Empfehlungen der Community'],
    'PODCAST ΤΗΣ ΕΒΔΟΜΑΔΑΣ':['PODCAST OF THE WEEK','PODCAST DE LA SEMAINE','PODCAST DER WOCHE'],
    'ΣΥΝΤΟΜΑ':['COMING SOON','BIENTÔT','BALD'],
    'Αρχική':['Home','Accueil','Start'],
    'Γλώσσα εφαρμογής':['Application language','Langue de l’application','Anwendungssprache'],
    'Καταγραφή':['Log','Saisie','Erfassen'],
    'Πρόγραμμα':['Plan','Programme','Plan'],
    'Ιστορικό':['History','Historique','Verlauf'],
    'Επίβλεψη':['Progress','Progression','Fortschritt'],
    'Προφίλ':['Profile','Profil','Profil'],
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
    'ΟΛΟΚΛΗΡΩΣΗ ΠΡΟΠΟΝΗΣΗΣ':['COMPLETE WORKOUT','TERMINER LA SÉANCE','TRAINING ABSCHLIESSEN'],
    'Ολοκλήρωση προπόνησης':['Complete workout','Terminer la séance','Training abschließen'],
    'Αποθήκευση διορθώσεων':['Save changes','Enregistrer les corrections','Änderungen speichern'],
    'Νέα εβδομαδιαία ρουτίνα':['New weekly routine','Nouveau programme hebdomadaire','Neuer Wochenplan'],
    'Δημιουργία':['Create','Créer','Erstellen'],
    'Νέα προπόνηση ημέρας':['New day workout','Nouvelle séance du jour','Neues Tagestraining'],
    'Ημέρα':['Day','Jour','Tag'],
    'Όνομα προπόνησης':['Workout name','Nom de la séance','Trainingsname'],
    'Όνομα':['Name','Nom','Name'],
    'Αριθμός ασκήσεων':['Number of exercises','Nombre d’exercices','Anzahl Übungen'],
    'Ακύρωση επεξεργασίας':['Cancel editing','Annuler la modification','Bearbeitung abbrechen'],
    'Αποθήκευση ημέρας':['Save day','Enregistrer le jour','Tag speichern'],
    'Ενημέρωση ημέρας':['Update day','Mettre à jour le jour','Tag aktualisieren'],
    'ΤΟ ΠΛΑΝΟ ΣΟΥ':['YOUR PLAN','VOTRE PROGRAMME','DEIN PLAN'],
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
    'Σετ':['Set','Série','Satz'],
    'Επιπλέον kg':['Extra kg','kg supplémentaires','Zusätzliche kg'],
    'Γράφημα προόδου βάρους και επαναλήψεων':['Weight and reps progress chart','Graphique de progression charge et répétitions','Fortschrittsdiagramm für Gewicht und Wiederholungen'],
    'Έλεγχος καταγραφής:':['Log check:','Contrôle des saisies :','Eintragsprüfung:'],
    'προπόνηση εξαιρέθηκε':['workout excluded','séance exclue','Training ausgeschlossen'],
    'προπονήσεις εξαιρέθηκαν':['workouts excluded','séances exclues','Trainings ausgeschlossen'],
    'Όλες οι καταγραφές του σετ χρησιμοποιούν κοινή μέτρηση:':['All set logs use the same measurement:','Toutes les saisies de la série utilisent la même mesure :','Alle Satzeinträge verwenden dieselbe Messung:'],
    'Δες όλη την εικόνα.':['See the full picture.','Considérez l’ensemble.','Sieh das Gesamtbild.'],
    'Λείπει βάρος ή επαναλήψεις από το σετ':['Weight or reps are missing from the set','Il manque la charge ou les répétitions de la série','Gewicht oder Wiederholungen fehlen im Satz'],
    'Η άσκηση δεν καταγράφηκε':['Exercise was not logged','L’exercice n’a pas été saisi','Übung wurde nicht erfasst'],
    'Δεν καταγράφηκε το σετ':['Set was not logged','La série n’a pas été saisie','Satz wurde nicht erfasst'],
    'Συμπλήρωσε ημερομηνία':['Enter a date','Saisissez une date','Datum eingeben'],
    'ΗΛΙΚΙΑ':['AGE','ÂGE','ALTER'],
    'έτος':['year','an','Jahr'],
    'έτη':['years','ans','Jahre'],
    'Βάρος':['Weight','Poids','Gewicht'],
    'Μονάδα βάρους':['Weight unit','Unité de poids','Gewichtseinheit'],
    'ΕΠΙΛΟΓΗ AVATAR':['CHOOSE AVATAR','CHOISIR UN AVATAR','AVATAR WÄHLEN'],
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
    'Είστε σίγουροι για την διαγραφή της άσκησης':['Are you sure you want to delete exercise','Voulez-vous vraiment supprimer l’exercice','Möchtest du die Übung wirklich löschen'],
    'από την δήλωση της προπόνησης;':['from the workout entry?','de la saisie de séance ?','aus dem Trainingseintrag?'],
    'Η εικόνα προστέθηκε στο προφίλ':['The image was added to your profile','L’image a été ajoutée au profil','Das Bild wurde dem Profil hinzugefügt'],
    'Το προφίλ αποθηκεύτηκε':['Profile saved','Profil enregistré','Profil gespeichert'],
    'Οι διορθώσεις αποθηκεύτηκαν.':['Changes saved.','Corrections enregistrées.','Änderungen gespeichert.'],
    'Η δουλειά καταγράφηκε.':['Workout logged.','Séance enregistrée.','Training erfasst.'],
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
    'σε 7 ημέρες. Κράτησε τη γραμμή.':['workouts in 7 days. Keep the streak.','séances en 7 jours. Gardez le rythme.','Trainings in 7 Tagen. Halte die Serie.'],
    'προπονήσεις':['workouts','séances','Trainings'],
    'ημέρες':['days','jours','Tage'],
    'Πώς πήγε συνολικά η σημερινή προπόνηση;':['How did today’s workout go overall?','Comment s’est passée la séance aujourd’hui ?','Wie lief das heutige Training insgesamt?'],
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
    if (node.parentElement?.closest('[data-i18n-user]')) {
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
