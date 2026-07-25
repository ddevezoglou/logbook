Π# Logbook — Development Guide

Το `DEVELOPMENT.md` είναι ο τεχνικός οδηγός του Logbook: περιγράφει την αρχιτεκτονική, την τοπική εκτέλεση, το quality gate, τη διαδικασία release και την τρέχουσα τεχνική κατάσταση.

| Στοιχείο | Τρέχουσα κατάσταση |
|---|---|
| Έκδοση | **0.2.2** |
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
- Προγραμματισμένες και ελεύθερες προπονήσεις με ασκήσεις, σετ, επαναλήψεις, βάρη, cues και σχόλια. Η αποθήκευση βάρους γίνεται σε κανονικοποιημένα kg, ενώ η καταχώριση και η εμφάνιση υποστηρίζουν συνεπή εναλλαγή kg/lb.
- Ιστορικό με ασφαλή εξαγωγή σε CSV, προσωπικά ρεκόρ, στατιστικά, γραφήματα προόδου και rewards συνέπειας.
- Προφίλ αθλητή και ελληνικό, αγγλικό, γαλλικό και γερμανικό interface, με ελεγμένη φυσική διατύπωση και πλήρη κάλυψη των translation keys.
- Supabase Auth με email/κωδικό ή Google και συγχρονισμό πολλών συσκευών, με optimistic revision checks, αυτόματο merge και conflict retry.
- Ιδιωτικό ιστορικό ημερήσιων cloud recovery snapshots, χωρίς πρόσβαση από τον client και με αυτόματο pruning μετά από 30 ημέρες.
- Αυτόματη μεταφορά παλιότερων τοπικών δεδομένων στο τρέχον μοντέλο.
- Installable PWA με offline shell και responsive mobile UI.
- Modular ES αρχιτεκτονική με σαφή όρια για storage/migrations, routines, sessions, progress/rewards και κοινά UI primitives.
- Κοινό SVG sprite για τα navigation controls και σταθερά `message.NNNN` i18n IDs για DOM, ARIA και σύνθετα labels.
- Self-hosted και pinned Supabase browser bundle `2.110.7`, με καταγεγραμμένο SHA-256, άδεια MIT και offline/integrity tests.
- Κανονικοποίηση των αριθμητικών τιμών και escaping του περιεχομένου χρήστη πριν από απόδοση σε HTML, μαζί με βαθύ validation των local/cloud payloads.
- Ελεγχόμενο version bump που ενημερώνει μαζί package metadata, UI version, service-worker cache, tests και documentation.
- Release hygiene και ενιαίο quality gate που αποκλείουν debug logging και test artifacts από τον production κώδικα και τα releases.
- Privacy-safe error tracking για sync, PWA και πραγματικά unhandled client failures, μόνο με allowlisted τεχνικά metadata, rate limit 10 συμβάντων ανά ώρα και διατήρηση 30 ημερών.

### Χάρτης βασικών αρχείων

| Αρχείο/φάκελος | Ευθύνη |
|---|---|
| `index.html` | Βασικό markup, dialogs και script loading |
| `styles.css` | Design system και responsive layouts |
| `app.js` | Κύρια εφαρμογή και UI orchestration πάνω από τα domain modules |
| `modules/storage-migrations.js` | Typed local storage, ασφαλείς εγγραφές και migrations παλιών δεδομένων |
| `modules/routines.js` | Μοντέλο προγραμμάτων, μικρόκυκλοι και αντιστοίχιση ημερών |
| `modules/sessions.js` | Ημερομηνίες, μονάδες βάρους, validation και ασφαλής CSV μορφοποίηση |
| `modules/progress-rewards.js` | Συγκρίσεις επιδόσεων, καμπύλες γραφημάτων και rewards |
| `modules/ui.js` | Κοινά UI primitives για escaping, navigation και menu state |
| `i18n.js` | Μεταφράσεις και αλλαγή γλώσσας |
| `auth.js` | Authentication gate και φόρτωση της εφαρμογής |
| `cloud-sync.js` | Local/cloud merge και versioned synchronization |
| `supabase-client.js` | Φόρτωση και αρχικοποίηση του Supabase browser client |
| `pwa.js` | Εγγραφή ή local-development cleanup του service worker |
| `service-worker.js` | Offline app shell και runtime caching |
| `tests/` | Unit και integration tests |
| `e2e/` | Playwright mobile και accessibility tests |
| `supabase/migrations/` | Schema, RLS policies, ημερήσια cloud snapshots, retention και account deletion RPC |
| `.github/workflows/` | CI, Pages deployment και tagged releases |

## Supabase και authentication

Οι migrations δημιουργούν τους πίνακες `profiles`, `routines`, `sessions`, το versioned `user_sync_state` και το ιδιωτικό `user_sync_snapshots`. Ενεργοποιούν Row Level Security και περιορίζουν κάθε εγγραφή στον συνδεδεμένο χρήστη. Το snapshot trigger κρατά το πολύ ένα recovery point ανά χρήστη και UTC ημέρα, ενώ καθημερινό Supabase Cron job αφαιρεί όσα είναι παλαιότερα από 30 ημέρες. Τα snapshots δεν εκτίθενται στον client και δεν υπάρχει user-facing επαναφορά.

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

Ελεγχόμενο version bump χωρίς εγγραφή αρχείων:

```powershell
npm.cmd run version:bump -- 0.2.2 --dry-run
```

Αφαίρεσε το `--dry-run` μόνο όταν θέλεις να ενημερωθούν μαζί package metadata, UI version, service-worker cache, tests και ο παρών οδηγός.

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
| Minor | `0.2.0` → `0.3.0` | Νέα λειτουργία ή σημαντική λειτουργική ενότητα |
| Patch | `0.2.0` → `0.2.1` | Διόρθωση ή μικρή συμβατή βελτίωση |
| Prerelease | `0.3.0-alpha.1` | Draft· απαιτεί πρώτα υποστήριξη από το release verifier |
| Stable | `1.0.0` | Πρώτη επίσημη, σταθερή γραμμή προϊόντος |

Πριν από release πρέπει να συμφωνούν:

- `package.json`
- η root έκδοση του `package-lock.json`
- η εμφανιζόμενη έκδοση στο `index.html`
- το `CACHE_VERSION` στο `service-worker.js`
- τα σχετικά version assertions στα tests
- η έκδοση αυτού του οδηγού

Το τρέχον automated gate δέχεται μόνο την αριθμητική μορφή `X.Y.Z`. Prerelease labels όπως `-alpha.1` δεν πρέπει να χρησιμοποιηθούν πριν ενημερωθούν το `verify-release.mjs` και τα σχετικά tests.

Το `scripts/verify-release.mjs` ελέγχει τη συνέπεια. Tag της μορφής `v<package-version>`, για παράδειγμα `v0.2.1`, ενεργοποιεί το `.github/workflows/release.yml` και δημιουργεί GitHub Release μόνο αν περάσει ολόκληρο το quality gate.

## Γνωστοί περιορισμοί της 0.2.2

- Το sync είναι snapshot-based και όχι live collaborative editing. Υπάρχει optimistic conflict retry και αυτόματο merge. Η σχεδιαστική παραδοχή είναι ότι η καταγραφή γίνεται από μία ενεργή συσκευή κάθε φορά, επομένως δεν προβλέπεται UI χειροκίνητης επίλυσης conflicts.
- Η PWA έχει automated Chromium/WebKit κάλυψη, αλλά χρειάζεται τελική QA σε πραγματικές συσκευές Android και iOS.
- Οι ασκήσεις αποθηκεύονται ως ελεύθερο κείμενο και δεν συνδέονται ακόμη με ενιαία προσωπική βιβλιοθήκη.

## Αξιολόγηση 0.2.2 — 25 Ιουλίου 2026

Δεύτερο πλήρες review ολόκληρου του codebase με τη μεθοδολογία των security-review, code-review και frontend-design, αυτή τη φορά με ρητό κριτήριο **το κέρδος από το mobile app**. Κατά το review τα **224/224** unit/integration tests πέρασαν πράσινα. Το review δεν στηρίχθηκε σε diff — σαρώθηκαν τα SQL migrations, ο client (`app.js`, `auth.js`, `cloud-sync.js`, `error-tracking.js`, `supabase-client.js`, `service-worker.js`, `modules/`), το `styles.css` και τα CI workflows.

| Τομέας | Βαθμός | Μεταβολή | Σχόλιο |
|---|---|---|---|
| Ασφάλεια | 8/10 | → | Καμία ευπάθεια· λείπει CSP, το sign-out είναι μόνο τοπικό, χωρίς όριο payload |
| Κώδικας | 7.5/10 | ↓ 1 | Καθαρά modules και δυνατά tests, αλλά το `app.js` παραμένει μονόλιθος και το validation του payload είναι ασύμμετρο |
| Design | 8/10 | ↓ 1 | Ισχυρή, μη αντιγράψιμη ταυτότητα· 92 σκόρπια hex μπλοκάρουν κάθε theming |
| Testing & CI/CD | 9/10 | → | Πλήρες gate, allowlisted artifact· η e2e κάλυψη είναι λεπτή (9 tests) |
| Εμπορική ετοιμότητα | 4/10 | ↓ 1 | Τίποτα δεν κινήθηκε· κανένα νομικό αρχείο, κανένα μοντέλο εσόδων, κανένα κανάλι διανομής |

**Συνολικά: 7.5/10 ως engineering προϊόν, 4.5/10 ως εμπορικό mobile προϊόν σήμερα.**

Η βαθμολογία κώδικα και design πέφτει όχι επειδή κάτι χάλασε, αλλά επειδή αυτό το review μέτρησε πράγματα που το προηγούμενο δεν είχε μετρήσει: το μέγεθος των αρχείων, τη διαρροή των design tokens και την ασυμμετρία του validation. Η εμπορική βαθμολογία πέφτει επειδή πέρασε ένας κύκλος χωρίς να κλείσει κανένα από τα P1.

### 1. Ασφάλεια

Δεν βρέθηκε καμία HIGH ή MEDIUM ευπάθεια. Το data layer παραμένει το ισχυρότερο κομμάτι του project: RLS σε κάθε πίνακα με `revoke` από `anon`, `security definer` συναρτήσεις με έλεγχο `auth.uid()` και `search_path = ''`, snapshots εντελώς αόρατα από το Data API, `report_client_error` με allowlist σε κάθε στήλη και advisory lock ανά χρήστη. Το escaping με `esc()` εφαρμόζεται με συνέπεια και στα 41 σημεία `innerHTML` του `app.js`· οι avatar εικόνες γράφονται ως `.src` property και όχι μέσα σε markup· το CSV export προστατεύει από formula injection.

Τα ανοιχτά σημεία είναι hardening και session hygiene, με ένα νέο εύρημα:

1. **`signOut({ scope:'local' })` — το sign-out δεν ακυρώνει τη συνεδρία στον server.** Και στις δύο κλήσεις ([auth.js:395](auth.js#L395) και [auth.js:424](auth.js#L424)) το scope είναι `local`: καθαρίζεται μόνο το `sb-<ref>-auth-token` του browser, ενώ το refresh token παραμένει έγκυρο στο Supabase μέχρι να λήξει. Σε χαμένο ή κοινόχρηστο κινητό —το κύριο use-case ενός gym app— η «αποσύνδεση» είναι κοσμητική για όποιον έχει ήδη αντιγράψει το token. Νέο εύρημα, το σοβαρότερο των τριών τομέων.
2. **Καμία CSP.** Το `index.html` δεν έχει `<meta http-equiv="Content-Security-Policy">`. Δεν είναι απλό «nice to have»: το refresh token ζει στο `localStorage` και ο client παράγει HTML σε 41 σημεία. Μία μόνο μελλοντική παράλειψη `esc()` μετατρέπεται σε πλήρη κατάληψη λογαριασμού. Η CSP είναι το δίχτυ κάτω από τον σχοινοβάτη.
3. **Χωρίς όριο μεγέθους στο `user_sync_state.payload`.** Δεν υπάρχει server-side `CHECK` στο jsonb. Με τα base64 avatars μέσα στο payload (βλ. Κώδικας #1) το όριο δεν είναι θεωρητικό.
4. **`logbookCloudCache:<userId>` επιβιώνει του sign-out.** Το πλήρες ιστορικό του προηγούμενου χρήστη μένει στο localStorage της συσκευής. Συνειδητό local-first trade-off, αλλά σε συνδυασμό με το #1 συνθέτει μια πραγματική εικόνα κινδύνου για κοινόχρηστη συσκευή.
5. **Νεκρό attack surface.** Οι `profiles`, `routines`, `sessions` έχουν πλήρη CRUD grants στο `authenticated` αλλά ο client δεν τους αγγίζει· όλο το sync περνά από το `user_sync_state`.
6. **Χαμένα error events.** Στο [error-tracking.js:73](error-tracking.js#L73) η αποτυχία του RPC επιστρέφει `false` και το event χάνεται αντί να επιστρέψει στην ουρά.
7. **Τα snapshots δεν καλύπτονται από καμία δήλωση απορρήτου.** Ο πίνακας `user_sync_snapshots` κρατά πλήρη αντίγραφα δεδομένων χρήστη έως 30 ημέρες. Τεχνικά είναι σωστά κλειδωμένος και σβήνει με `on delete cascade`, αλλά όταν γραφτεί η privacy policy πρέπει να αναφερθεί ρητά — αλλιώς η πολιτική θα είναι ανακριβής από την πρώτη μέρα.

### 2. Κώδικας

Τα `modules/` είναι καθαρά, καθαρά testable και χωρίς εξάρτηση από DOM. Το `cloud-sync.js` λύνει ένα πραγματικά δύσκολο πρόβλημα (merge, revisions, εναλλαγή χρήστη, ανάκτηση από κενό snapshot) με σχόλια που εξηγούν το *γιατί*. Τα 224 tests καλύπτουν migrations, sync, auth και release metadata.

1. **Avatars ως base64 μέσα στο sync payload.** Έως 6 εικόνες 480px JPEG ζουν ως data-URLs στο `userProfile` και ταξιδεύουν με κάθε snapshot — στο localStorage (όριο ~5MB μαζί με χρόνια sessions), σε κάθε sync request, στο jsonb και σε κάθε ημερήσιο snapshot. Το schema έχει ήδη αχρησιμοποίητο `avatar_path` στο `profiles`. Παραμένει η σημαντικότερη τεχνική σύσταση, αμετάβλητη από το προηγούμενο review.
2. **Ασύμμετρο validation στο `normalizePayload`.** Στο [cloud-sync.js:96-107](cloud-sync.js#L96-L107) τα `trainingRoutines` και `trainingSessions` περνούν από βαθύ, per-field normalization, ενώ τα `userProfile` και `routineRewardTracking` περνούν μόνο έλεγχο «είναι object». Δηλαδή η μοναδική διαδρομή που δέχεται αυθαίρετο μέγεθος και σχήμα είναι ακριβώς εκείνη όπου ζουν τα base64 avatars. Νέο εύρημα, και είναι το ίδιο εύρημα με το #1 από την άλλη πλευρά.
3. **Το `app.js` παραμένει μονόλιθος 2.252 γραμμών / 135KB**, με 117 top-level συναρτήσεις και 76 `addEventListener`. Πιο συγκεκριμένα: η μεγαλύτερη γραμμή του αρχείου είναι **2.235 χαρακτήρες** — ολόκληρο το rendering του γραφήματος προόδου ([app.js:1182](app.js#L1182)) σε μία γραμμή. Αυτή η γραμμή δεν διαβάζεται σε review, δεν παράγει χρήσιμο diff και δεν τεστάρεται μεμονωμένα. Είναι ο πιο συγκεκριμένος στόχος διάσπασης που υπάρχει στο repo.
4. **Το Ιστορικό δεν κάνει pagination.** Το `renderOverview` χτίζει innerHTML για όλες τις sessions σε κάθε render· με 2–3 χρόνια δεδομένων θα πονέσει σε mid-range Android.
5. **Hardcoded ελληνικά ονόματα ως λογική.** Τα «Το πρόγραμμά μου»/«Πρόγραμμα 1» λειτουργούν ως σήμα placeholder σε [cloud-sync.js:144](cloud-sync.js#L144), [cloud-sync.js:171](cloud-sync.js#L171) και [modules/storage-migrations.js:96](modules/storage-migrations.js#L96). Αν το default όνομα γίνει ποτέ localized —και θα γίνει, αφού υπάρχουν ήδη 4 γλώσσες— η προστασία από κενό snapshot σπάει σιωπηλά, χωρίς test να κοκκινίσει.
6. **`store.read` επιστρέφει το fallback για τα πάντα**, και για objects· παγίδα για κάθε νέο module.
7. **Μία προπόνηση ανά ημέρα**, επιβεβλημένη και client-side και με unique index στη βάση. Πραγματικός περιορισμός για two-a-days.
8. **Η e2e κάλυψη είναι λεπτή σε σχέση με το ρίσκο: 9 tests συνολικά** (7 mobile + 2 plan/deck). Δεν καλύπτεται καθόλου end-to-end το πιο επικίνδυνο μονοπάτι του προϊόντος — sync σε δύο συσκευές με conflict. Η λογική αυτή έχει unit κάλυψη, αλλά ποτέ δεν έχει τρέξει σε πραγματικό browser.

### 3. Design

Η μεταφορά «χάρτινο ημερολόγιο» διατρέχει με συνέπεια όλη την εφαρμογή — βιβλίο-auth gate με typewriter, ribbon μενού, σελίδες sessions με βιβλιοδεσία, απόδειξη-export, σφραγίδες rewards. Η τυπογραφία είναι πραγματική επιλογή και όχι default: Roboto Slab για display, Alegreya Sans για σώμα κειμένου, Playpen Sans για τη χειρόγραφη φωνή, όλες self-hosted με ελληνικά subsets. Το quality floor είναι μετρήσιμα πάνω από τον μέσο όρο: **37** χρήσεις `env(safe-area-inset-*)`, **27** κανόνες `:focus-visible`, **13** blocks `prefers-reduced-motion`. Αυτό είναι asset με εμπορική αξία και είναι ο μοναδικός πραγματικός διαφοροποιητής απέναντι σε Strong/Hevy/Jefit.

Τα ευρήματα αφορούν τη *δομή* του design system, όχι το γούστο:

1. **92 διαφορετικά hex literals διάσπαρτα στο `styles.css`, απέναντι σε ~18 tokens στο `:root`.** Αυτό είναι το πραγματικό εμπόδιο: το dark mode δεν μπλοκάρεται από σχεδιαστική απόφαση, μπλοκάρεται από το ότι τα 92 αυτά χρώματα δεν περνούν από μεταβλητή. Όσο μένουν σκόρπια, *κάθε* theming —dark mode, high contrast, μελλοντικά premium themes— είναι χειροκίνητο search & replace. Πρώτα tokenization, μετά theme.
2. **Καμία υποστήριξη `prefers-color-scheme`.** Η paper αισθητική είναι αμιγώς φωτεινή ενώ το gym use-case είναι συχνά βραδινό, συχνά με το κινητό σε system dark mode. Το «blackout page» κρατά την ταυτότητα και λύνει πραγματικό πρόβλημα χρήσης.
3. **Κανένα `@media print`.** Η σελίδα προπόνησης και το πλάνο τυπώνονται φυσικά μέσα στη μεταφορά του προϊόντος. Το φθηνότερο «wow» που υπάρχει στο backlog.
4. **10 ασύνδετα breakpoints:** 380, 430, 600, 650, 700, 760, 850, 900, 950, 1000px. Δεν υπάρχει κλίμακα — υπάρχουν δέκα σημεία όπου κάποτε κάτι έσπασε. Κάθε νέο component πρέπει να δοκιμαστεί σε δέκα πλάτη αντί για τρία.
5. **Το `styles.css` είναι ένα αρχείο 167KB / 1.386 γραμμών με μέγιστο μήκος γραμμής 2.661 χαρακτήρες.** Ίδιο πρόβλημα αναγνωσιμότητας με το `app.js`, ίδια λύση.
6. **Το auth gate ως πρώτη εμπειρία παραμένει το μεγαλύτερο εμπόδιο conversion.** Ο νέος επισκέπτης βλέπει υποχρεωτικό login πριν δει οτιδήποτε. Η local-first αρχιτεκτονική υποστηρίζει guest mode σχεδόν δωρεάν.
7. **Καμία υποστήριξη `prefers-contrast`**, σε ένα UI που στηρίζεται σε χαμηλής αντίθεσης παλέτα χαρτιού.

### 4. Ετυμηγορία με κριτήριο το κέρδος από mobile app

Το τεχνικό προϊόν είναι έτοιμο για χρήστες. Το εμπορικό προϊόν δεν έχει ξεκινήσει, και σε αυτόν τον κύκλο δεν κουνήθηκε καθόλου:

- **Κανένα νομικό αρχείο στο repo.** Ούτε LICENSE, ούτε privacy policy, ούτε όροι χρήσης. Αποθηκεύονται email, ημερομηνία γέννησης και φωτογραφίες χρηστών στην ΕΕ, και το repo είναι δημόσιο χωρίς άδεια — δηλαδή σήμερα ούτε προστατεύεται ο κώδικας ούτε καλύπτεται ο χρήστης. Το Google OAuth verification θα το ζητήσει έτσι κι αλλιώς.
- **Καμία υποδομή εσόδων και καμία απόφαση free/premium.** Αυτό δεν είναι απλώς λειτουργία που λείπει — καθορίζει τι χτίζεται κλειδώσιμο από τώρα. Κάθε εβδομάδα που περνά χωρίς την απόφαση, χτίζονται features στη λάθος πλευρά της γραμμής.
- **Κανένα product analytics.** Το error tracking είναι υποδειγματικό ως προς το privacy αλλά δεν μετρά χρήση. Freemium χωρίς μέτρηση activation/retention είναι μαντεψιά.
- **Το κρίσιμο σημείο για «κέρδος από mobile app»: το PWA δεν έχει κανάλι διανομής.** Το `docs/mobile-distribution.md` τεκμηριώνει σωστά *γιατί* το PWA είναι επαρκές τεχνικά, αλλά η απόφαση αυτή αξιολογήθηκε ως τεχνική, όχι ως εμπορική. Ένα PWA δεν εμφανίζεται σε App Store ή Play Store, δεν έχει store reviews, δεν έχει in-app purchases και στο iOS η εγκατάσταση απαιτεί τριών βημάτων χειροκίνητη ενέργεια από το Safari. Αν ο στόχος είναι έσοδα από κινητό, το bottleneck δεν είναι η τεχνολογία — είναι η **ανακάλυψη**. Αυτή η απόφαση πρέπει να ξαναγίνει με εμπορικά κριτήρια πριν επενδυθεί χρόνος σε payments.
- Το physical-device QA παραμένει ανοιχτό προαπαιτούμενο.

Ρεαλιστική εκτίμηση: με guest mode, νομικά έγγραφα, το device QA και απόφαση διανομής + monetization, βάσιμο 1.0 σε 2–3 κύκλους δουλειάς. Τα δυνατά χαρτιά είναι το data layer, τα tests και η χειροποίητη ταυτότητα. Το δύσκολο δεν είναι να χτιστεί το προϊόν — είναι να το δει κάποιος.

## Σε εξέλιξη αυτή την περίοδο

Roadmap με άξονα το εμπορικό μοντέλο: **φάση 1 δωρεάν προϊόν (όχι open source), τελικός στόχος κέρδος από κινητό.** Τα TODO είναι οργανωμένα ανά παράγοντα, με ρητό κριτήριο ολοκλήρωσης το καθένα.

### Α. Ασφάλεια

- [X] **Global sign-out.** Αλλαγή σε `signOut({ scope:'global' })` στο [auth.js](auth.js), και fallback σε `local` όταν η κλήση αποτύχει offline ώστε να μη «κολλάει» ο χρήστης συνδεδεμένος.
- [X] **CSP meta tag.** `default-src 'self'; connect-src 'self' https://hixnqtjsjcndeatxhpgd.supabase.co; img-src 'self' data:; object-src 'none'; base-uri 'self'`. Καλύπτεται από e2e με έλεγχο μηδενικών CSP violations και data-URL avatar.
- [X] **Καθάρισμα `logbookCloudCache:<userId>` και `logbookCloudMeta:<userId>` στο sign-out.** Καθαρίζονται όλα τα cloud cache/meta keys και το owner marker, με unit κάλυψη.
- [X] **Όριο μεγέθους payload στη βάση.** Το append-only security migration αφαιρεί πρώτα τα gallery δεδομένα και προσθέτει `check (pg_column_size(payload) < 2*1024*1024)`, με φιλικό μήνυμα στον client όταν απορριφθεί.
- [X] **Επιστροφή χαμένων error events στην ουρά** στο [error-tracking.js](error-tracking.js), με cap 10 συμβάντων και retry μετά την αποκατάσταση.
- [X] **Απόφαση για τα νεκρά grants** σε `profiles`/`routines`/`sessions`: έγινε `revoke all` από το role `authenticated`.
- [X] **Καταγραφή του `user_sync_snapshots` στην privacy policy** ως 30ήμερη λειτουργική διατήρηση, στη δημόσια [privacy policy](privacy.html).

### Β. Κώδικας

- [X] **Avatars εκτός sync payload.** Το `imageGallery` παραμένει local-only και το snapshot κρατά μόνο το ενεργό, συμπιεσμένο avatar. Το αντιπροσωπευτικό payload με avatar ελέγχεται κάτω από 100KB.
- [X] **Βαθύ validation του `userProfile` στο `normalizePayload`:** allowlist πεδίων, τύποι και όριο 512KB στο ενεργό image data URL για συμβατότητα με παλιά avatars· οι νέες εικόνες παράγονται κάτω από 90KB.
- [X] **Εξαγωγή του progress chart σε `modules/progress-chart.js`.** Η παραγωγή του SVG/markup είναι πλέον καθαρή, DOM-free συνάρτηση με αυτόνομα unit tests.
- [X] **`isPlaceholder` boolean flag** αντί για runtime ταύτιση ελληνικών ονομάτων. Η migration αναγνωρίζει τα παλιά default προγράμματα μία φορά και όλες οι επόμενες αποφάσεις sync/storage βασίζονται στο flag.
- [X] **Pagination/windowing στο Ιστορικό.** Το πρώτο render περιορίζεται σε 30 sessions και το υπόλοιπο Ιστορικό αποκαλύπτεται ανά 30 καταγραφές.
- [X] **`store.read` με ρητό fallback ανά τύπο.** Κάθε read δηλώνει `array` ή `object` και απορρίπτει έγκυρο JSON με λάθος σχήμα.
- [X] **E2E test για sync conflict σε δύο contexts.** Δύο πραγματικά browser contexts γράφουν ταυτόχρονα στην ίδια revision και επαληθεύουν ότι cloud και συσκευές κρατούν και τις δύο προπονήσεις.
- [X] **Προσθήκη άσκησης σε προγραμματισμένη ή αντιγραμμένη προπόνηση.** Ο περιορισμός μίας ολοκληρωμένης προπόνησης ανά ημέρα διατηρείται· στη θέση της αλλαγής του, η Καταγραφή Προγράμματος και η Αντιγραφή από το Ιστορικό δέχονται επιπλέον άσκηση με ακριβώς την κάρτα και τη λογική της Ελεύθερης Προπόνησης.

### Γ. Design

- [ ] **Tokenization των 92 hex literals** σε επέκταση του `:root`. Καθαρά μηχανικό βήμα, μηδενική οπτική αλλαγή, και **προαπαιτούμενο κάθε επόμενου item αυτής της ενότητας**. *Done όταν:* το `grep -oE "#[0-9a-fA-F]{3,8}" styles.css` επιστρέφει μόνο τους ορισμούς του `:root`.
- [ ] **Dark mode «νυχτερινή σελίδα»** ως override του token layer, με `prefers-color-scheme` και ρητό χειροκίνητο toggle στο προφίλ. Η ταυτότητα του χαρτιού διατηρείται — αλλάζει η νύχτα, όχι η μεταφορά.
- [ ] **Print stylesheet** για τη σελίδα προπόνησης και το πλάνο. Μία σελίδα ανά προπόνηση, χωρίς chrome, με τα ίδια tokens.
- [ ] **Συμπύκνωση σε 3 breakpoints** (~600 / 850 / 1000px) από τα σημερινά 10, με ρητή τεκμηρίωση σε σχόλιο του `:root` για ποιον λόγο υπάρχει ο καθένας.
- [ ] **Διάσπαση του `styles.css`** σε `tokens.css` / `base.css` / `components.css` / `views.css`, με ενημέρωση του `APP_SHELL` στο `service-worker.js` και της λίστας artifact στο `pages.yml`.
- [ ] **Guest/demo mode.** Local-only χρήση χωρίς λογαριασμό, με προτροπή δημιουργίας λογαριασμού τη στιγμή που ο χρήστης έχει κάτι να χάσει (πρώτη ολοκληρωμένη προπόνηση). Ταυτόχρονα design και conversion item — ο μεγαλύτερος μοχλός που λείπει.
- [ ] **Δημόσια landing εμπειρία** πριν ή δίπλα από το auth gate, με screenshots της χάρτινης ταυτότητας. Δουλεύει μαζί με το guest mode, όχι αντί για αυτό.
- [ ] **Υποστήριξη `prefers-contrast: more`** πάνω στο νέο token layer.

### Δ. Εμπορικά — προαπαιτούμενα του 1.0

- [ ] **Απόφαση διανομής με εμπορικά κριτήρια.** Επανεξέταση του `docs/mobile-distribution.md` με ερώτημα «από πού έρχεται ο πρώτος πληρώνων χρήστης». Επιλογές: PWA + web διανομή, ή wrapper (Capacitor/TWA) για παρουσία σε Play Store και App Store. *Done όταν:* η απόφαση είναι γραμμένη με ρητό κόστος και ρητό κανάλι απόκτησης χρηστών.
- [ ] **Privacy policy & Όροι χρήσης**, με ρητή αναφορά σε email, ημερομηνία γέννησης, φωτογραφίες, error events και snapshots 30 ημερών.
- [ ] **LICENSE «All rights reserved»** ή μεταφορά σε private repo με hosting που υποστηρίζει ιδιωτική πηγή. Σήμερα ο κώδικας είναι δημόσιος χωρίς καμία άδεια.
- [ ] **Physical-device QA** σε ένα πρόσφατο Android και ένα iPhone: εγκατάσταση PWA, offline boot, safe areas, virtual keyboard, επιστροφή OAuth.
- [ ] **Product analytics με σεβασμό στο privacy:** ελάχιστα allowlisted events (activation, retention, feature use) πάνω στο υπάρχον privacy-safe RPC pattern ή self-hosted Plausible/Umami.
- [ ] **Σχεδιασμός freemium ορίων.** Δωρεάν: γρήγορη καταγραφή και βασικό ιστορικό — το core promise. Premium: προχωρημένα analytics, απεριόριστα προγράμματα, βιβλιοθήκη ασκήσεων, themes και print.
- [ ] **Ενιαία βιβλιοθήκη ασκήσεων.** Οι ασκήσεις είναι ελεύθερο κείμενο· χωρίς κανονικοποίηση δεν στέκονται premium analytics ανά άσκηση. Προαπαιτούμενο του premium tier.
- [ ] **Υποδομή entitlements & πληρωμών:** πίνακας entitlements με RLS και πάροχος φιλικός σε EU sole trader (Lemon Squeezy/Paddle ως merchant of record για ΦΠΑ). Πρώτο βήμα χαμηλού ρίσκου: προαιρετικό «supporter» tier.
- [ ] **Εμφάνιση billing κατάστασης** στο account dialog όταν ενεργοποιηθεί το premium.

## Definition of Done

Μια αλλαγή θεωρείται έτοιμη όταν:

- προστατεύει τα υπάρχοντα τοπικά και συγχρονισμένα δεδομένα,
- δεν εισάγει secrets, tokens ή προσωπικά δεδομένα στο repository ή στα logs,
- συνοδεύεται από migration ή backward compatibility όπου αλλάζει το data model,
- έχει τα κατάλληλα tests και περνά το `npm.cmd run check`,
- ενημερώνει την τεκμηρίωση και το release metadata όταν επηρεάζει τη λειτουργία ή τη διάθεση.

## Κατεύθυνση

Βασική αρχή του project είναι η γρήγορη και αξιόπιστη καταγραφή. Κάθε επόμενο βήμα πρέπει να προστατεύει το ιστορικό, να διατηρεί την τοπική λειτουργία και να αποφεύγει περιττή πολυπλοκότητα κατά τη διάρκεια της προπόνησης.
