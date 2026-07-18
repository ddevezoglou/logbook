# Logbook — Development Guide

Το `DEVELOPMENT.md` είναι ο τεχνικός οδηγός του Logbook: περιγράφει την αρχιτεκτονική, την τοπική εκτέλεση, το quality gate, τη διαδικασία release και το ενεργό τεχνικό roadmap.

| Στοιχείο | Τρέχουσα κατάσταση |
|---|---|
| Έκδοση | **0.6.0** |
| Runtime | Node.js 22 |
| Client | HTML, CSS και JavaScript χωρίς build step |
| Αποθήκευση | Local-first με `localStorage` και Supabase sync |
| Production | [ddevezoglou.github.io/logbook](https://ddevezoglou.github.io/logbook/) |
| Deployment | GitHub Pages μέσω GitHub Actions |

## Γρήγορη εκκίνηση

Από τον φάκελο του repository:

```powershell
npm.cmd ci
npm.cmd run dev
```

Άνοιξε το:

```text
http://localhost:3001/
```

Μην ανοίγεις το `index.html` ως `file://`. Το authentication, τα callbacks και ο service worker απαιτούν κανονικό web origin.

Για διαφορετική θύρα:

```powershell
node scripts/serve-static.mjs --port 3000
```

Ο τοπικός server στέλνει `Cache-Control: no-store`. Η εφαρμογή αφαιρεί επίσης αυτόματα παλιούς Logbook service workers και caches στο `localhost`, ώστε η ανάπτυξη να μη συνδυάζει αρχεία διαφορετικών εκδόσεων.

## Αρχιτεκτονική

Το Logbook είναι local-first web εφαρμογή. Οι αλλαγές γράφονται πρώτα στη συσκευή και το UI δεν εξαρτάται από συνεχή σύνδεση στο δίκτυο.

```text
Browser UI
   ↓
localStorage ── άμεση τοπική αποθήκευση και offline λειτουργία
   ↓
cloud-sync.js ── merge, revision checks και conflict retry
   ↓
Supabase ── authentication και versioned snapshot ανά χρήστη
```

Κατά την εκκίνηση:

1. Ελέγχεται η αποθηκευμένη συνεδρία.
2. Χωρίς ενεργό login εμφανίζεται μόνο το authentication gate.
3. Online, ολοκληρώνεται ο αρχικός συγχρονισμός πριν φορτωθεί το κύριο UI.
4. Offline, μια cached συνεδρία ανοίγει τα τοπικά δεδομένα και το sync επαναλαμβάνεται όταν επιστρέψει το δίκτυο.

Η τρέχουσα λειτουργική βάση περιλαμβάνει:

- Πολλαπλά ανεξάρτητα προγράμματα και μικρόκυκλους 3–10 ημερών.
- Προγραμματισμένες και ελεύθερες προπονήσεις με ασκήσεις, σετ, επαναλήψεις, βάρη, cues και σχόλια.
- Ιστορικό, προσωπικά ρεκόρ, στατιστικά, γραφήματα προόδου και rewards συνέπειας.
- Προφίλ αθλητή και ελληνικό, αγγλικό, γαλλικό και γερμανικό interface.
- Supabase Auth με email/κωδικό ή Google και συγχρονισμό πολλών συσκευών.
- Αυτόματη μεταφορά παλιότερων τοπικών δεδομένων στο τρέχον μοντέλο.
- Installable PWA με offline shell και responsive mobile UI.

### Χάρτης βασικών αρχείων

| Αρχείο/φάκελος | Ευθύνη |
|---|---|
| `index.html` | Βασικό markup, dialogs και script loading |
| `styles.css` | Design system και responsive layouts |
| `app.js` | Κύρια εφαρμογή και UI orchestration· παραμένει προσωρινά monolithic |
| `i18n.js` | Μεταφράσεις και αλλαγή γλώσσας |
| `auth.js` | Authentication gate και φόρτωση της εφαρμογής |
| `cloud-sync.js` | Local/cloud merge και versioned synchronization |
| `supabase-client.js` | Φόρτωση και αρχικοποίηση του Supabase browser client |
| `pwa.js` | Εγγραφή ή local-development cleanup του service worker |
| `service-worker.js` | Offline app shell και runtime caching |
| `tests/` | Unit και integration tests |
| `e2e/` | Playwright mobile και accessibility tests |
| `supabase/migrations/` | Schema, RLS policies και account deletion RPC |
| `.github/workflows/` | CI, Pages deployment και tagged releases |

## Supabase και authentication

Οι migrations δημιουργούν τους πίνακες `profiles`, `routines`, `sessions` και το versioned `user_sync_state`. Ενεργοποιούν Row Level Security και περιορίζουν κάθε εγγραφή στον συνδεδεμένο χρήστη.

Η πρώτη online φόρτωση απαιτεί επιβεβαιωμένη συνεδρία και επιτυχημένο αρχικό sync. Στη συνέχεια οι αλλαγές γράφονται πρώτα τοπικά. Το UI εμφανίζει την κατάσταση του συγχρονισμού και παρέχει χειροκίνητο **Συγχρονισμό τώρα**.

### Canonical URLs

Production app και Supabase Site URL:

```text
https://ddevezoglou.github.io/logbook/
```

Supabase Auth Redirect URLs:

```text
https://ddevezoglou.github.io/logbook/
http://localhost:3000/**
http://localhost:3001/**
```

Google OAuth Authorized JavaScript origins:

```text
https://ddevezoglou.github.io
http://localhost:3000
http://localhost:3001
```

Google OAuth Authorized redirect URI:

```text
https://hixnqtjsjcndeatxhpgd.supabase.co/auth/v1/callback
```

Το Google redirect οδηγεί πρώτα στο Supabase Auth callback. Έπειτα το Supabase επιστρέφει τον χρήστη σε ένα από τα επιτρεπόμενα app Redirect URLs.

## Tests και quality gate

Εγκατάσταση των Playwright browsers:

```powershell
npx.cmd playwright install chromium webkit
```

Γρήγοροι unit και integration έλεγχοι:

```powershell
npm.cmd test
```

Μόνο τα browser tests:

```powershell
npm.cmd run test:e2e
```

Πλήρες release gate:

```powershell
npm.cmd run check
```

Το `npm run check` εκτελεί διαδοχικά:

1. Έλεγχο συνέπειας release metadata.
2. Unit και integration tests.
3. Android Chromium και iOS WebKit end-to-end tests.
4. WCAG accessibility scan στα κρίσιμα mobile flows.

Το ίδιο gate εκτελείται σε pull requests, deployments του `main` και tagged releases. Το `package-lock.json` παραμένει versioned, ενώ το `node_modules/` δημιουργείται τοπικά.

### Windows troubleshooting

Αν τα Playwright tests ολοκληρωθούν αλλά η διεργασία καθυστερεί στο κλείσιμο του αυτόματου web server, άνοιξε τον server σε ξεχωριστό terminal:

```powershell
node scripts/serve-static.mjs
```

και εκτέλεσε ξανά σε δεύτερο terminal:

```powershell
npm.cmd run test:e2e
```

Το Playwright θα επαναχρησιμοποιήσει τον ενεργό server στο local environment.

## GitHub Pages και PWA

Το `.github/workflows/pages.yml` εκτελεί το πλήρες quality gate σε κάθε push στο `main` και δημιουργεί production artifact από ρητή λίστα runtime αρχείων. Tests, designs, scripts και seed εργαλεία δεν δημοσιεύονται.

Το manifest, τα app icons, οι self-hosted γραμματοσειρές και το offline shell είναι ρυθμισμένα για τη διαδρομή `/logbook/`.

Η απόφαση να παραμείνει το PWA ο canonical mobile client τεκμηριώνεται στο `docs/mobile-distribution.md`. Η επιλογή native wrapper θα επανεξεταστεί μόνο αν προκύψει πραγματική ανάγκη για app-store distribution, native APIs ή background λειτουργίες που δεν καλύπτει αξιόπιστα το PWA.

## Versioning και releases

Το project ακολουθεί Semantic Versioning σε pre-1.0 μορφή:

| Αλλαγή | Παράδειγμα | Χρήση |
|---|---|---|
| Minor | `0.6.0` → `0.7.0` | Νέα λειτουργία ή σημαντική λειτουργική ενότητα |
| Patch | `0.6.0` → `0.6.1` | Διόρθωση ή μικρή συμβατή βελτίωση |
| Prerelease | `0.7.0-alpha.1` | Draft· απαιτεί πρώτα υποστήριξη από το release verifier |
| Stable | `1.0.0` | Πρώτη επίσημη, σταθερή γραμμή προϊόντος |

Πριν από release πρέπει να συμφωνούν:

- `package.json`
- η root έκδοση του `package-lock.json`
- η εμφανιζόμενη έκδοση στο `index.html`
- το `CACHE_VERSION` στο `service-worker.js`
- τα σχετικά version assertions στα tests
- η έκδοση αυτού του οδηγού

Το τρέχον automated gate δέχεται μόνο την αριθμητική μορφή `X.Y.Z`. Prerelease labels όπως `-alpha.1` δεν πρέπει να χρησιμοποιηθούν πριν ενημερωθούν το `verify-release.mjs` και τα σχετικά tests.

Το `scripts/verify-release.mjs` ελέγχει τη συνέπεια. Tag της μορφής `v<package-version>`, για παράδειγμα `v0.6.0`, ενεργοποιεί το `.github/workflows/release.yml` και δημιουργεί GitHub Release μόνο αν περάσει ολόκληρο το quality gate.

## Γνωστοί περιορισμοί της 0.6.0

- Το sync είναι snapshot-based και όχι live collaborative editing. Υπάρχει optimistic conflict retry, αλλά όχι UI χειροκίνητης επίλυσης ταυτόχρονων αλλαγών στο ίδιο αντικείμενο.
- Δεν υπάρχει ακόμη ασφαλές export/import ή αυτόματο backup δεδομένων από το UI.
- Η PWA έχει automated Chromium/WebKit κάλυψη, αλλά χρειάζεται τελική QA σε πραγματικές συσκευές Android και iOS.
- Οι ασκήσεις αποθηκεύονται ως ελεύθερο κείμενο και δεν συνδέονται ακόμη με ενιαία προσωπική βιβλιοθήκη.

## TODO

Η σειρά δηλώνει προτεραιότητα, όχι απαραίτητα το release στο οποίο θα ολοκληρωθεί κάθε εργασία.

### P1 — Production hardening

- [ ] **Supabase dependency integrity:** αντικατάσταση του floating `@supabase/supabase-js@2` CDN URL με self-hosted αρχείο ή ακριβώς pinned έκδοση με SRI. Ενημέρωση του service-worker cache και των offline tests μαζί με την αλλαγή.
- [ ] **Ασφαλή numeric attributes:** κανονικοποίηση και escaping των `reps`, `plates`, `weight` και συναφών τιμών που γράφει η `setRows()` σε HTML attributes. Προσθήκη regression test για αλλοιωμένα local/cloud δεδομένα.
- [ ] **Debug cleanup:** έλεγχος και αφαίρεση προσωρινών `debug.log`, debug-only logging και artifacts πριν από release. Τα απαραίτητα operational errors να παραμείνουν σαφή και ελεγχόμενα.
- [ ] **Physical-device QA:** smoke test σε τουλάχιστον ένα πρόσφατο Android και ένα iPhone, με έμφαση σε εγκατάσταση PWA, offline boot, safe areas, virtual keyboard και OAuth επιστροφή.
- [ ] **Ελαφρύ error tracking:** καταγραφή αποτυχιών συγχρονισμού και πραγματικών client errors χωρίς αποθήκευση ευαίσθητων δεδομένων προπόνησης ή authentication tokens.

### P2 — Πριν από την επόμενη μεγάλη λειτουργία

- [ ] **Διάσπαση του `app.js`:** μεταφορά σε μικρά ES modules με σαφή όρια για storage/migrations, routines, sessions, progress/rewards και UI rendering. Η αλλαγή να γίνει σταδιακά, με τα υπάρχοντα tests πράσινα σε κάθε βήμα.
- [ ] **Αυτοματοποιημένο version bump:** script που ενημερώνει package metadata, UI version, service-worker cache, tests και documentation ως μία ελεγχόμενη πράξη.
- [ ] **Στοχευμένα module tests:** διατήρηση των integration tests και προσθήκη μικρότερων tests στα νέα module boundaries.
- [ ] **SVG navigation icons:** αντικατάσταση των text glyphs πλοήγησης με το υπάρχον SVG icon set χωρίς accessibility regression.

### P3 — Product roadmap

- [ ] Ολοκλήρωση της ενότητας **Επίβλεψη** με περισσότερες μετρικές και σαφέστερη σύγκριση ανά προπόνηση, άσκηση και σετ.
- [ ] Ιστορικό cloud snapshots, χειροκίνητη επαναφορά και προηγμένη επίλυση conflicts.
- [ ] Export και import προπονήσεων και προγραμμάτων σε JSON/CSV.
- [ ] Ενιαία προσωπική βιβλιοθήκη ασκήσεων αντί για αποκλειστικά ελεύθερο κείμενο.

## Definition of Done

Μια αλλαγή θεωρείται έτοιμη όταν:

- προστατεύει τα υπάρχοντα τοπικά και συγχρονισμένα δεδομένα,
- δεν εισάγει secrets, tokens ή προσωπικά δεδομένα στο repository ή στα logs,
- συνοδεύεται από migration ή backward compatibility όπου αλλάζει το data model,
- έχει τα κατάλληλα tests και περνά το `npm.cmd run check`,
- ενημερώνει την τεκμηρίωση και το release metadata όταν επηρεάζει τη λειτουργία ή τη διάθεση.

## Κατεύθυνση

Βασική αρχή του project είναι η γρήγορη και αξιόπιστη καταγραφή. Κάθε επόμενο βήμα πρέπει να προστατεύει το ιστορικό, να διατηρεί την τοπική λειτουργία και να αποφεύγει περιττή πολυπλοκότητα κατά τη διάρκεια της προπόνησης.
