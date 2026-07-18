# Logbook — Development Guide

Το αρχείο αυτό συγκεντρώνει τις τεχνικές πληροφορίες ανάπτυξης και διάθεσης του Logbook. Η τρέχουσα έκδοση του interface είναι η **0.3.2**.

## Αρχιτεκτονική

Το Logbook είναι μια local-first web εφαρμογή χωρίς build step. Το `localStorage` χρησιμοποιείται για άμεση τοπική αποθήκευση, ενώ τα προγράμματα, οι προπονήσεις, το προφίλ και οι ρυθμίσεις συγχρονίζονται μέσω Supabase σε versioned cloud snapshot ανά λογαριασμό.

Κατά την εκκίνηση ελέγχεται πρώτα η συνεδρία του χρήστη. Χωρίς ενεργό login εμφανίζεται μόνο η οθόνη σύνδεσης και το κύριο UI φορτώνεται μετά τον αρχικό συγχρονισμό.

Βασικά χαρακτηριστικά της τρέχουσας υλοποίησης:

- Πολλαπλά ανεξάρτητα προγράμματα και μικρόκυκλοι 3–10 ημερών.
- Προγραμματισμένες και ελεύθερες προπονήσεις με ασκήσεις, σετ, επαναλήψεις, βάρη, cues και σχόλια.
- Ιστορικό, προσωπικά ρεκόρ, στατιστικά και γραφήματα προόδου.
- Συγχρονισμός αλλαγών ονομάτων και ασκήσεων με το υπάρχον ιστορικό.
- Προφίλ αθλητή και σύστημα επιβράβευσης συνέπειας ανά ενεργό πρόγραμμα.
- Ελληνικό, αγγλικό, γαλλικό και γερμανικό interface.
- Supabase Auth με email/κωδικό ή Google και συγχρονισμός πολλών συσκευών.
- Αυτόματη μεταφορά παλαιότερων τοπικών δεδομένων στο τρέχον μοντέλο.

## Τοπική εκτέλεση

Δεν απαιτείται build. Επειδή το authentication χρησιμοποιεί ασφαλή callbacks, μην ανοίγεις το `index.html` απευθείας ως `file://`.

Από τον φάκελο του repository εκτέλεσε:

```powershell
npx.cmd serve . -l 3001
```

και άνοιξε το:

```text
http://localhost:3001/
```

Η θύρα `3000` είναι επίσης επιτρεπόμενη και μπορεί να χρησιμοποιηθεί όταν είναι διαθέσιμη.

## Canonical URLs

### Production app και Supabase Site URL

```text
https://ddevezoglou.github.io/logbook/
```

### Supabase Auth Redirect URLs

```text
https://ddevezoglou.github.io/logbook/
http://localhost:3000/**
http://localhost:3001/**
```

### Google OAuth Authorized JavaScript origins

```text
https://ddevezoglou.github.io
http://localhost:3000
http://localhost:3001
```

### Google OAuth Authorized redirect URI

```text
https://hixnqtjsjcndeatxhpgd.supabase.co/auth/v1/callback
```

Το Google redirect URI οδηγεί πρώτα στο Supabase Auth callback. Στη συνέχεια, το Supabase επιστρέφει τον χρήστη σε ένα από τα επιτρεπόμενα app Redirect URLs.

## GitHub Pages και PWA

Το production deployment ορίζεται στο `.github/workflows/pages.yml`. Με GitHub Pages source το **GitHub Actions**, κάθε push στο `main` δημιουργεί νέο production artifact από ρητή λίστα runtime αρχείων.

Τα tests, τα designs, τα scripts και τα seed εργαλεία δεν συμπεριλαμβάνονται στο production artifact.

Το manifest, τα app icons, οι self-hosted γραμματοσειρές και το offline shell είναι ρυθμισμένα για τη διαδρομή `/logbook/`.

## Tests

Την πρώτη φορά εγκατέστησε τις εξαρτήσεις:

```powershell
npm.cmd install
```

Για να εκτελέσεις ολόκληρη τη σουίτα ελέγχων:

```powershell
npm.cmd test
```

Το `package-lock.json` παραμένει versioned, ενώ το `node_modules/` δημιουργείται τοπικά και δεν αποθηκεύεται στο repository.

## Supabase development

Η υποδομή του Supabase βρίσκεται στα:

- `supabase-config.js`
- `supabase-client.js`
- `auth.js`
- `cloud-sync.js`
- `supabase/migrations/`

Οι migrations δημιουργούν τους πίνακες `profiles`, `routines`, `sessions` και το versioned `user_sync_state`. Ενεργοποιούν Row Level Security και περιορίζουν κάθε εγγραφή στον συνδεδεμένο χρήστη.

Η πρώτη φόρτωση απαιτεί επιβεβαιωμένη συνεδρία και επιτυχημένο αρχικό sync. Μετά τη φόρτωση, οι αλλαγές γράφονται πρώτα τοπικά και συγχρονίζονται όταν υπάρχει δίκτυο. Το UI εμφανίζει την κατάσταση του sync και παρέχει χειροκίνητο **Συγχρονισμό τώρα**.

## Γνωστοί περιορισμοί της έκδοσης 0.3.2

- Το sync είναι snapshot-based και όχι live collaborative editing. Υπάρχει optimistic conflict retry, αλλά όχι ακόμη UI χειροκίνητης επίλυσης αλλαγών στο ίδιο αντικείμενο.
- Δεν υπάρχει ακόμη ασφαλές export/import ή αυτόματο backup δεδομένων από το UI.
- Η PWA έχει δημοσιευτεί, αλλά χρειάζεται mobile-specific QA και διόρθωση layout, viewport, touch και interaction conflicts σε πραγματικές συσκευές Android και iOS.
- Το offline shell υπάρχει, αλλά το πλήρες offline boot με αποθηκευμένη συνεδρία χρειάζεται περαιτέρω σκλήρυνση.
- Οι ασκήσεις αποθηκεύονται ως ελεύθερο κείμενο και δεν συνδέονται ακόμη με ενιαία προσωπική βιβλιοθήκη.

## Roadmap

### Προϊόν και προπονητική δομή

- [ ] Ολοκλήρωση της ενότητας **Επίβλεψη** με περισσότερες μετρικές και σαφέστερη σύγκριση της προόδου ανά προπόνηση, άσκηση και σετ.

### Cloud και λογαριασμοί

- [x] Authentication, Row Level Security και αρχικός συγχρονισμός πολλών συσκευών.
- [x] Αυτόματη πρώτη μεταφορά δεδομένων από `localStorage`.
- [x] Διαγραφή λογαριασμού και συγχρονισμένων δεδομένων από το UI.
- [ ] Ιστορικό snapshots, χειροκίνητη επαναφορά και προηγμένη επίλυση conflicts.
- [ ] Export και import προπονήσεων και προγραμμάτων σε JSON/CSV.

### Mobile και διάθεση

- [x] Installable PWA με manifest, service worker, offline shell και app icons.
- [ ] Mobile hardening σε πραγματικές συσκευές Android και iOS χωρίς regression στο desktop UI.
- [ ] Πλήρες offline boot με αποθηκευμένη συνεδρία και αυτόματο sync μετά την επαναφορά του δικτύου.
- [ ] Αξιολόγηση PWA έναντι native wrapper ή ξεχωριστού mobile client.
- [ ] End-to-end mobile tests, accessibility audit και ενιαία διαχείριση releases.

### Τεχνικό χρέος και υποδομή

- [ ] Ελαφρύ error tracking για αποτυχίες συγχρονισμού και προβλήματα πραγματικών χρηστών.
- [x] Παραγωγή GitHub Pages artifact μόνο από εγκεκριμένα runtime αρχεία.
- [ ] Αντικατάσταση των text glyphs πλοήγησης με το υπάρχον SVG icon set.

## Κατεύθυνση

Βασική αρχή του project είναι η γρήγορη και αξιόπιστη καταγραφή. Κάθε επόμενο βήμα πρέπει να προστατεύει το υπάρχον ιστορικό, να διατηρεί την τοπική λειτουργία και να αποφεύγει περιττή πολυπλοκότητα κατά τη διάρκεια της προπόνησης.
