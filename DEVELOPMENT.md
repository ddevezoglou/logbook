Π# Logbook — Development Guide

Το `DEVELOPMENT.md` είναι ο τεχνικός οδηγός του Logbook: περιγράφει την αρχιτεκτονική, την τοπική εκτέλεση, το quality gate, τη διαδικασία release και την τρέχουσα τεχνική κατάσταση.

| Στοιχείο | Τρέχουσα κατάσταση |
|---|---|
| Έκδοση | **0.9.7** |
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
npm.cmd run version:bump -- 0.9.7 --dry-run
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

## Γνωστοί περιορισμοί της 0.9.7

- Το sync είναι snapshot-based και όχι live collaborative editing. Υπάρχει optimistic conflict retry και αυτόματο merge. Η σχεδιαστική παραδοχή είναι ότι η καταγραφή γίνεται από μία ενεργή συσκευή κάθε φορά, επομένως δεν προβλέπεται UI χειροκίνητης επίλυσης conflicts.
- Η PWA έχει automated Chromium/WebKit κάλυψη, αλλά χρειάζεται τελική QA σε πραγματικές συσκευές Android και iOS.
- Οι ασκήσεις αποθηκεύονται ως ελεύθερο κείμενο και δεν συνδέονται ακόμη με ενιαία προσωπική βιβλιοθήκη.

## Αξιολόγηση 0.9.7 — Ιούλιος 2026

Πλήρες review της εφαρμογής (κώδικας, ασφάλεια, design, tests, εμπορική ετοιμότητα) με τη μεθοδολογία των code-review, security-review και frontend-design plugins σε ολόκληρο το codebase. Κατά το review τα 207/207 unit/integration tests πέρασαν πράσινα. Οι ολοκληρωμένες εργασίες του review έχουν ενσωματωθεί στην τρέχουσα λειτουργική βάση παραπάνω· τα υπόλοιπα σημεία διατηρούνται ως τεχνικές και προϊοντικές παρατηρήσεις.

| Τομέας | Βαθμός | Σχόλιο |
|---|---|---|
| Ασφάλεια & data layer | 8.5/10 | Υποδειγματικό RLS, κανένα ευρεθέν vulnerability· λείπει CSP και όριο μεγέθους payload |
| Testing & CI/CD | 9/10 | Πλήρες gate, e2e+a11y, allowlisted deploy artifact |
| UI/UX & Design | 9/10 | Αυθεντική, αναγνωρίσιμη ταυτότητα· λείπει dark mode |
| PWA & offline | 8.5/10 | Σωστό offline-first, καθαρό service worker lifecycle |
| Αρχιτεκτονική κώδικα | 8.5/10 | Σαφή domain modules και ανεξάρτητα tests, με το `app.js` να παραμένει ο κεντρικός orchestrator |
| Εμπορική ετοιμότητα | 5/10 | Auth-gate friction, χωρίς monetization, νομικά έγγραφα ή product analytics |

**Συνολικά: 8/10 ως engineering, 5/10 ως εμπορικό προϊόν σήμερα.**

### Ευρήματα ασφάλειας (hardening, όχι ευπάθειες)

Δεν βρέθηκε καμία HIGH ή MEDIUM ευπάθεια. Δυνατά σημεία: πλήρες RLS με revoke από `anon`, `security definer` RPCs με έλεγχο `auth.uid()` και καθαρό `search_path`, συνεπές HTML escaping με `esc()` παντού, προστασία από CSV injection στο export, self-hosted pinned Supabase bundle.

1. **CSP meta tag:** στο GitHub Pages δεν ελέγχουμε headers, αλλά ένα `<meta http-equiv="Content-Security-Policy">` (`default-src 'self'; connect-src 'self' https://hixnqtjsjcndeatxhpgd.supabase.co; img-src 'self' data:`) δίνει δεύτερη γραμμή άμυνας πάνω από το escaping.
2. **Όριο μεγέθους στο `user_sync_state.payload`:** δεν υπάρχει server-side CHECK στο μέγεθος του jsonb· ένα `check (pg_column_size(payload) < 2*1024*1024)` κλείνει το θέμα.
3. **Νεκρό attack surface:** οι πίνακες `profiles`, `routines`, `sessions` έχουν πλήρη CRUD grants αλλά ο client δεν τους χρησιμοποιεί — όλο το sync περνά από το `user_sync_state`. Είτε να αξιοποιηθούν είτε να αφαιρεθούν.
4. **Cache άλλου χρήστη σε κοινή συσκευή:** το `logbookCloudCache:<userId>` του προηγούμενου χρήστη παραμένει στο localStorage μετά από εναλλαγή λογαριασμού. Συνειδητό local-first trade-off, αλλά αξίζει είτε καθάρισμα στο sign-out είτε ρητή τεκμηρίωση.
5. **Χαμένα error events:** στο `error-tracking.js`, αν το RPC αποτύχει, το event χάνεται αντί να επιστρέφει στην ουρά.

### Ευρήματα κώδικα

1. **Avatars ως base64 μέσα στο sync payload:** έως 6 εικόνες 480px αποθηκεύονται ως data-URLs στο `userProfile` και ταξιδεύουν με κάθε snapshot. Φουσκώνουν το localStorage (όριο ~5MB μαζί με sessions ετών), κάθε sync και το jsonb στη βάση. Το schema έχει ήδη `avatar_path` στο `profiles` — μεταφορά σε Supabase Storage ή τουλάχιστον εξαίρεση του gallery από το snapshot. Η πιο σημαντική τεχνική σύσταση του review.
2. **Το Ιστορικό δεν κάνει pagination:** το `renderOverview` χτίζει innerHTML για όλες τις sessions κάθε φορά· με 2–3 χρόνια δεδομένων θα πονέσει σε mid-range κινητό. Windowing ή «φόρτωση παλαιότερων».
3. **Μία προπόνηση ανά ημέρα:** επιβάλλεται client-side και με unique index. Πραγματικός περιορισμός προϊόντος για two-a-days· αν είναι συνειδητή απόφαση να καταγραφεί, αλλιώς θα χρειαστεί migration αργότερα.
4. **Hardcoded ελληνικά default ονόματα ως λογική:** τα «Το πρόγραμμά μου»/«Πρόγραμμα 1» λειτουργούν ως σήμα placeholder σε app.js και cloud-sync.js. Αν το default όνομα γίνει ποτέ localized, η προστασία από empty snapshot σπάει σιωπηλά· ένα boolean flag `isPlaceholder` είναι ανθεκτικότερο.
5. **`store.read` επιστρέφει `[]` ως fallback για τα πάντα**, και για objects — παγίδα για κάθε νέο module στο επερχόμενο split του app.js.

### Ευρήματα design/UX

Η μεταφορά «χάρτινο ημερολόγιο» διατρέχει συνεπώς όλη την εφαρμογή (βιβλίο-auth gate, ribbon μενού, σελίδες sessions, απόδειξη-export, σφραγίδες rewards) με επιλεγμένη τυπογραφία και σωστά empty states και reduced-motion. Το design είναι asset με εμπορική αξία και διαφοροποιεί από Strong/Hevy/Jefit.

1. **Dark mode / «νυχτερινή σελίδα»:** η paper αισθητική είναι αμιγώς φωτεινή, ενώ το gym use-case είναι συχνά βραδινό. Ένα «blackout page» theme πάνω στο υπάρχον `--ink`/`--paper` token system κρατά την ταυτότητα και λύνει πραγματικό πρόβλημα χρήσης.
2. **Print stylesheet:** η σελίδα προπόνησης και το πλάνο τυπώνονται φυσικά στη μεταφορά του προϊόντος· φθηνό feature με «wow».
3. **Το auth gate ως πρώτη εμπειρία είναι friction:** ο νέος επισκέπτης βλέπει υποχρεωτικό login πριν δει την εφαρμογή. Guest/demo mode (local-only, με προτροπή sync αργότερα) είναι ο μεγαλύτερος μοχλός conversion που λείπει — και η local-first αρχιτεκτονική το υποστηρίζει σχεδόν δωρεάν.

### Ετυμηγορία για official release με στόχο κέρδος

Όχι ακόμα — και το 0.9.x το αποτυπώνει σωστά. Ό,τι λείπει δεν είναι τεχνικό:

1. **Μοντέλο εσόδων:** καμία υποδομή πληρωμών ή απόφαση free/premium. Το πιθανότερο βιώσιμο μοντέλο στην αγορά (Strong, Hevy με ισχυρά free tiers) είναι freemium με premium analytics/ιστορικό — πρέπει να σχεδιαστεί πριν το 1.0 γιατί καθορίζει τι κλειδώνεται.
2. **Νομική ετοιμότητα:** αποθηκεύονται email, ημερομηνία γέννησης και φωτογραφίες χρηστών στην ΕΕ — απαιτούνται privacy policy και όροι χρήσης πριν από εμπορικό launch (το Google OAuth verification θα τα ζητήσει ούτως ή άλλως). Τα θεμέλια GDPR υπάρχουν (CSV export, πλήρης διαγραφή λογαριασμού)· λείπουν μόνο τα έγγραφα.
3. **Conversion funnel:** guest mode και στοιχειώδη product analytics — το υπάρχον error tracking είναι privacy-υποδειγματικό αλλά δεν μετρά χρήση.
4. Το P1 physical-device QA παραμένει προαπαιτούμενο.

Ρεαλιστική εκτίμηση: με guest mode, νομικά έγγραφα, το P1 QA και απόφαση monetization, βάσιμο 1.0 σε 2–3 κύκλους δουλειάς. Δυνατά χαρτιά το τεχνικό προϊόν και το design· το δύσκολο είναι η απόκτηση χρηστών απέναντι σε δωρεάν εδραιωμένους ανταγωνιστές, όπου η χειροποίητη ταυτότητα και η ελληνική/ευρωπαϊκή τοπικοποίηση είναι η πιο πιστευτή διαφοροποίηση.

## Σε εξέλιξη αυτή την περίοδο

Roadmap με άξονα το εμπορικό μοντέλο: **φάση 1 δωρεάν προϊόν (όχι open source), τελικός στόχος κέρδος**. Επικαιροποιήθηκε στο review της 23ης Ιουλίου 2026 (223/223 unit/integration tests πράσινα).

### P1 — Launch blockers για το δωρεάν προϊόν

- [ ] **Physical-device QA:** smoke test σε τουλάχιστον ένα πρόσφατο Android και ένα iPhone, με έμφαση σε εγκατάσταση PWA, offline boot, safe areas, virtual keyboard και OAuth επιστροφή.
- [ ] **Guest/demo mode:** local-only χρήση χωρίς λογαριασμό, με προτροπή δημιουργίας λογαριασμού για sync. Ο μεγαλύτερος μοχλός conversion που λείπει· η local-first αρχιτεκτονική το υποστηρίζει σχεδόν δωρεάν.
- [ ] **Privacy policy & Όροι χρήσης:** αποθηκεύονται email, ημερομηνία γέννησης και φωτογραφίες χρηστών στην ΕΕ. Απαιτούνται πριν από δημόσια διάθεση και θα ζητηθούν από το Google OAuth verification. Τα GDPR θεμέλια (CSV export, διαγραφή λογαριασμού) υπάρχουν ήδη.
- [ ] **Καθεστώς «δωρεάν αλλά όχι open source»:** το repo σήμερα είναι δημόσιο για το GitHub Pages. Χρειάζεται είτε ρητό LICENSE «All rights reserved» με όρους χρήσης, είτε μεταφορά σε private repo με hosting που υποστηρίζει private πηγή (π.χ. Cloudflare Pages) — απόφαση πριν το launch.
- [ ] **CSP meta tag:** `<meta http-equiv="Content-Security-Policy">` με `default-src 'self'; connect-src 'self' https://hixnqtjsjcndeatxhpgd.supabase.co; img-src 'self' data:` — δεύτερη γραμμή άμυνας πάνω από το escaping.
- [ ] **Όριο μεγέθους payload στη βάση:** `check (pg_column_size(payload) < 2*1024*1024)` στο `user_sync_state` (και στα snapshots μέσω trigger).
- [ ] **Avatars εκτός sync payload:** μεταφορά του gallery σε Supabase Storage (το schema έχει ήδη `avatar_path`) ή τουλάχιστον εξαίρεσή του από το snapshot. Σήμερα έως 6 εικόνες base64 ταξιδεύουν με κάθε sync και πιέζουν το όριο του localStorage.

### P2 — Conversion & retention (αμέσως μετά το launch)

- [ ] **Product analytics με σεβασμό στο privacy:** ελάχιστα allowlisted usage events (activation, retention, feature use) πάνω στο υπάρχον privacy-safe RPC pattern ή με self-hosted Plausible/Umami. Χωρίς μέτρηση δεν σχεδιάζεται freemium.
- [ ] **Δημόσια landing εμπειρία:** ο νέος επισκέπτης σήμερα βλέπει μόνο login. Μία σελίδα με screenshots/επίδειξη της χάρτινης ταυτότητας πριν (ή δίπλα από) το auth gate — δουλεύει μαζί με το guest mode.
- [ ] **Dark mode «νυχτερινή σελίδα»:** blackout theme πάνω στο υπάρχον `--ink`/`--paper` token system. Το gym use-case είναι συχνά βραδινό· κρατά την ταυτότητα και λύνει πραγματικό πρόβλημα.
- [ ] **Print stylesheet:** η σελίδα προπόνησης και το πλάνο τυπώνονται φυσικά στη μεταφορά του προϊόντος· φθηνό feature με «wow».
- [ ] **Pagination/windowing στο Ιστορικό:** το `renderOverview` χτίζει innerHTML για όλες τις sessions· με 2–3 χρόνια δεδομένων θα πονέσει σε mid-range κινητό.
- [ ] **Απόφαση για «μία προπόνηση ανά ημέρα»:** πραγματικός περιορισμός για two-a-days· είτε καταγράφεται ως συνειδητή απόφαση είτε σχεδιάζεται migration πριν αποκτήσει μεγάλο ιστορικό χρηστών.

### P3 — Προετοιμασία monetization (πριν το 1.0)

- [ ] **Σχεδιασμός freemium ορίων:** τι μένει δωρεάν (γρήγορη καταγραφή, βασικό ιστορικό — το core promise) και τι γίνεται premium (προχωρημένα analytics, απεριόριστα προγράμματα, βιβλιοθήκη ασκήσεων, themes/print). Καθορίζει τι χτίζεται κλειδώσιμο από τώρα.
- [ ] **Ενιαία βιβλιοθήκη ασκήσεων:** οι ασκήσεις είναι ελεύθερο κείμενο· χωρίς κανονικοποίηση δεν στέκονται αξιόπιστα premium analytics ανά άσκηση. Προαπαιτούμενο του premium tier.
- [ ] **Υποδομή entitlements & πληρωμών:** πίνακας entitlements με RLS στο Supabase και πάροχος πληρωμών φιλικός σε EU sole trader (Stripe ή Lemon Squeezy/Paddle ως merchant of record για ΦΠΑ). Πρώτο βήμα χαμηλού ρίσκου: προαιρετικό «supporter» tier.
- [ ] **Εμφάνιση billing κατάστασης** στο account dialog όταν ενεργοποιηθεί το premium.

### Τεχνικό backlog (hardening, όχι blockers)

- [ ] **Χαμένα error events:** στο `error-tracking.js`, αποτυχία του RPC πετά το event αντί να το επιστρέφει στην ουρά `pending`.
- [ ] **Καθάρισμα `logbookCloudCache:<userId>` στο sign-out** ή ρητή τεκμηρίωση του trade-off για κοινές συσκευές.
- [ ] **`isPlaceholder` flag αντί για hardcoded ονόματα:** τα «Το πρόγραμμά μου»/«Πρόγραμμα 1» λειτουργούν ως λογική σε `cloud-sync.js` και `modules/storage-migrations.js`· αν το default όνομα γίνει localized, η προστασία από empty snapshot σπάει σιωπηλά.
- [ ] **Νεκρό attack surface:** οι πίνακες `profiles`, `routines`, `sessions` έχουν CRUD grants αλλά δεν χρησιμοποιούνται από τον client — αξιοποίηση (avatars/exercise library) ή αφαίρεση grants.

## Definition of Done

Μια αλλαγή θεωρείται έτοιμη όταν:

- προστατεύει τα υπάρχοντα τοπικά και συγχρονισμένα δεδομένα,
- δεν εισάγει secrets, tokens ή προσωπικά δεδομένα στο repository ή στα logs,
- συνοδεύεται από migration ή backward compatibility όπου αλλάζει το data model,
- έχει τα κατάλληλα tests και περνά το `npm.cmd run check`,
- ενημερώνει την τεκμηρίωση και το release metadata όταν επηρεάζει τη λειτουργία ή τη διάθεση.

## Κατεύθυνση

Βασική αρχή του project είναι η γρήγορη και αξιόπιστη καταγραφή. Κάθε επόμενο βήμα πρέπει να προστατεύει το ιστορικό, να διατηρεί την τοπική λειτουργία και να αποφεύγει περιττή πολυπλοκότητα κατά τη διάρκεια της προπόνησης.
