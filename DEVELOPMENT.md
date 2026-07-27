# Logbook — Development Guide

Ο τεχνικός οδηγός του Logbook: αρχιτεκτονική, τοπική εκτέλεση, quality gate, διαδικασία release και η τρέχουσα τεχνική κατάσταση. Περιγράφει το προϊόν όπως είναι σήμερα — όχι το ιστορικό του.

| Στοιχείο | Τρέχουσα κατάσταση |
|---|---|
| Έκδοση | **0.2.5** |
| Runtime | Node.js 22 |
| Client | HTML, CSS και JavaScript χωρίς build step στην ανάπτυξη |
| Αποθήκευση | Local-first με `localStorage` και Supabase sync |
| Tests | 284 unit/integration, 60 e2e εκτελέσεις σε 9 αρχεία |
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

Η ταυτότητα περνά από μηχανή τεσσάρων καταστάσεων — `unknown`, `member`, `offline-member`, `guest` — στο `session-state.js`, και κάθε αλλαγή ταυτότητας περνά από ένα και μόνο σημείο μετάβασης στο `auth.js`. Storage, UI και ο παρατηρήσιμος κύκλος ζωής δεν μπορούν επομένως να διαφωνήσουν για την ενεργή κατάσταση.

## Τι κάνει η εφαρμογή

- Πολλαπλά ανεξάρτητα προγράμματα και μικρόκυκλοι 3–10 ημερών.
- Προγραμματισμένες και ελεύθερες προπονήσεις με ασκήσεις, σετ, επαναλήψεις, βάρη, cues και σχόλια. Η αποθήκευση γίνεται σε κανονικοποιημένα kg, ενώ η καταχώριση και η εμφάνιση υποστηρίζουν συνεπή εναλλαγή kg/lb.
- Ιστορικό με σελιδοποίηση ανά 30, ασφαλή εξαγωγή σε CSV, προσωπικά ρεκόρ, στατιστικά, γραφήματα προόδου και rewards συνέπειας.
- Προφίλ αθλητή και ελληνικό, αγγλικό, γαλλικό και γερμανικό interface, με ελεγμένη φυσική διατύπωση και πλήρη κάλυψη των translation keys.
- Supabase Auth με email/κωδικό ή Google, και συγχρονισμός πολλών συσκευών με optimistic revision checks, αυτόματο merge και conflict retry.
- **Λειτουργία επισκέπτη** ως απόφαση της συσκευής και όχι λογαριασμός: δύο τοπικά κλειδιά (`logbookGuest`, `logbookGuestReminderAt`), καμία κλήση στο cloud, καμία κλειδωμένη λειτουργία, και μια non-blocking `aria-live="polite"` λωρίδα υπενθύμισης που επανέρχεται κάθε επτά ημέρες.
- Επιβεβαίωση πριν από τη συγχώνευση δεδομένων επισκέπτη με υπάρχοντα cloud δεδομένα: ο χρήστης μπορεί να τα συγχωνεύσει, να κρατήσει μόνο το cloud ή να ακυρώσει.
- Installable PWA με offline shell και responsive mobile UI.
- Εκτυπώσιμη σελίδα προπόνησης και πλάνου, μία προπόνηση ανά φύλλο, με `body:has(dialog[open])` ώστε να τυπώνεται ό,τι είναι ανοιχτό.
- Νυχτερινή εμφάνιση με ρητό διακόπτη στο μενού, προεπιλογή OFF και εφαρμογή πριν το πρώτο paint.
- Δημόσια [πολιτική απορρήτου](privacy.html) που καλύπτει ρητά τα ημερήσια snapshots ως 30ήμερη λειτουργική διατήρηση.
- Αυτόματη μεταφορά παλιότερων τοπικών δεδομένων στο τρέχον μοντέλο.

## Πώς είναι φτιαγμένο

Οι μηχανικές αρχές που πρέπει να επιβιώσουν κάθε επόμενη αλλαγή.

**Απομόνωση δεδομένων ανά λογαριασμό.** Στο επιτυχές sign-out καθαρίζονται τα κοινά domain keys, ενώ διατηρούνται ο owner marker και το user-scoped recovery cache. Ο `owner ≠ id` έλεγχος στο `performSync` αναγνωρίζει την εναλλαγή χρήστη και δεν αφήνει τοπικά δεδομένα να μεταναστεύσουν σε άλλον λογαριασμό. E2E σενάρια ελέγχουν την εναλλαγή χρήστη και την είσοδο επισκέπτη μετά από αποσύνδεση.

**Ένα token layer, τέσσερα overrides — όχι τέσσερα θέματα.** Η ημέρα ορίζεται στο `:root` του `tokens.css`· η νύχτα, το `prefers-contrast: more` με στόχο AAA (7:1) και το `@media print` είναι overrides του ίδιου layer. Ρόλοι που κρύβονταν κάτω από κοινό χρώμα είναι χωριστά tokens: μελάνι έναντι μελανί επιφάνειας (`--ink` / `--ink-surface` / `--on-ink`), κείμενο πάνω σε accent και σε χρυσό (`--on-accent` / `--on-gold`), και βάθος έναντι χρώματος στις ημιδιαφανείς χρήσεις (`--ink-rgb` / `--shadow-rgb` / `--veil-rgb`). Το invariant φυλάσσεται μηχανικά από το `tests/design-tokens.test.mjs`: κάθε hex έξω από `:root` block αποτυγχάνει το build.

**Τρία breakpoints.** `≤600px` «ένα χέρι», `≤850px` «χωρίς δεύτερη στήλη», `≤1000px` «χωρίς περιθώριο», με μία ρητή εξαίρεση περιεχομένου στα `≤380px` για τη γραμμή σετ. Κάθε νέο breakpoint χρειάζεται γραμμένη αιτιολόγηση ή δεν μπαίνει.

**Modular ES αρχιτεκτονική** με σαφή όρια για storage/migrations, routines, sessions, progress/rewards, DOM-free παραγωγή του Ιστορικού και του γραφήματος, και κοινά UI primitives. Κοινό SVG sprite για τα navigation controls και σταθερά `message.NNNN` i18n IDs για DOM, ARIA και σύνθετα labels.

**Cascade με μηχανικό όριο.** Η κάρτα λογαριασμού, τα dialogs και το interaction-hardening layer ζουν στο `dialogs.css`· το print override μένει τελευταίο στο `views.css`.

**Ασφάλεια στα δεδομένα.** Row Level Security σε κάθε πίνακα, `revoke all` στα αδρανή phase-1 tables, `security definer` με `set search_path = ''` σε κάθε function, επικυρωμένο (`validate constraint`) όριο payload κάτω από 2 MiB, και snapshots αόρατα από το Data API. Στον client: κανονικοποίηση αριθμητικών τιμών, escaping του περιεχομένου χρήστη πριν από κάθε απόδοση σε HTML, βαθύ validation των local/cloud payloads, και allowlist των data URLs του avatar.

**CSP** με `default-src 'self'`, `object-src 'none'`, `base-uri 'self'` και `form-action 'self'`. Κανένα `script-src 'unsafe-inline'`.

**Προσβασιμότητα ως συμβόλαιο.** `inert`/`aria-hidden` στο κρυμμένο auth gate, focus και live-region contracts, axe έλεγχοι στα κρίσιμα mobile flows, και τεκμηριωμένο [keyboard-only και screen-reader walkthrough](docs/accessibility-walkthrough.md).

**Privacy-safe error tracking** για sync, PWA και πραγματικά unhandled client failures, μόνο με allowlisted τεχνικά metadata, rate limit 10 συμβάντων ανά ώρα στη βάση και διατήρηση 30 ημερών. Στη λειτουργία επισκέπτη έως 10 αποστειρωμένα events μένουν σε τοπική ουρά και αποστέλλονται μετά την πρώτη επιτυχημένη σύνδεση.

**Self-hosted και pinned** Supabase browser bundle `2.110.7`, με καταγεγραμμένο SHA-256, άδεια MIT και offline/integrity tests.

**Release hygiene.** Ενιαίο quality gate που αποκλείει debug logging και test artifacts από τον production κώδικα και τα releases. Ελεγχόμενο version bump που ενημερώνει μαζί package metadata, UI version, service-worker cache, tests και τεκμηρίωση.

## Χάρτης βασικών αρχείων

| Αρχείο/φάκελος | Ευθύνη |
|---|---|
| `index.html` | Βασικό markup, dialogs και script loading |
| `tokens.css` | Το token layer: η ημέρα στο `:root` και τα overrides της για νύχτα και `prefers-contrast: more` |
| `base.css` | Reset, τυπογραφία, auth gate και τα πλέγματα που κρατούν κάθε view |
| `components.css` | Κάρτες, controls, μενού, σφραγίδες και προφίλ |
| `dialogs.css` | Κάρτα λογαριασμού, account/confirmation surfaces και το τελικό interaction-hardening layer |
| `views.css` | Προσαρμογές ανά view και ανά συσκευή, και το print override που πρέπει να μένει τελευταίο |
| `app.js` | Κύρια εφαρμογή και UI orchestration πάνω από τα domain modules |
| `modules/storage-migrations.js` | Typed local storage, ασφαλείς εγγραφές και migrations παλιών δεδομένων |
| `modules/routines.js` | Μοντέλο προγραμμάτων, μικρόκυκλοι και αντιστοίχιση ημερών |
| `modules/sessions.js` | Ημερομηνίες, μονάδες βάρους, validation και ασφαλής CSV μορφοποίηση |
| `modules/progress-chart.js` | Καθαρή, DOM-free παραγωγή του SVG του γραφήματος προόδου |
| `modules/progress-rewards.js` | Συγκρίσεις επιδόσεων, καμπύλες γραφημάτων και rewards |
| `modules/history.js` | DOM-free παραγωγή του Ιστορικού και των καρτών προπόνησης |
| `modules/session-templates.js` | DOM-free παραγωγή καρτών άσκησης, γραμμών σετ και εκτυπώσιμης σελίδας προπόνησης |
| `modules/ui.js` | Κοινά UI primitives για escaping, navigation και menu state |
| `i18n.js` | Μεταφράσεις και αλλαγή γλώσσας |
| `theme.js` | Ημέρα ή νύχτα: ανάγνωση της επιλογής πριν το πρώτο paint, διακόπτης και `theme-color` |
| `auth.js` | Authentication gate, λειτουργία επισκέπτη και φόρτωση της εφαρμογής |
| `session-state.js` | Μηχανή των τεσσάρων καταστάσεων συνεδρίας και μοναδικό σημείο μετάβασης ταυτότητας |
| `cloud-sync.js` | Local/cloud merge και versioned synchronization |
| `supabase-client.js` | Φόρτωση και αρχικοποίηση του Supabase browser client |
| `error-tracking.js` | Allowlisted, privacy-safe αναφορά σφαλμάτων μέσω RPC |
| `pwa.js` | Εγγραφή ή local-development cleanup του service worker |
| `service-worker.js` | Offline app shell και runtime caching |
| `privacy.html` / `legal.css` | Δημόσια πολιτική απορρήτου και το ελάχιστο stylesheet της |
| `tests/` | Unit και integration tests |
| `e2e/` | Playwright mobile και accessibility tests· το `e2e/fixtures/authenticated-app.mjs` στήνει συνδεδεμένο χρήστη με πρόγραμμα, προπονήσεις και προφίλ, ώστε κάθε view να χτίζεται πραγματικά κατά τον έλεγχο |
| `supabase/migrations/` | Schema, RLS policies, ημερήσια cloud snapshots, retention και account deletion RPC |
| `.github/workflows/` | CI, Pages deployment και tagged releases |
| `scripts/build-production.mjs` | Ρητό production artifact με minification JS/CSS, χωρίς αλλαγή του development runtime |
| `scripts/check-performance.mjs` / `performance-budget.json` | Mid-range mobile LCP/TBT και όριο μεγέθους app shell με καταγεγραμμένο baseline |

## Supabase και authentication

Οι migrations δημιουργούν τους πίνακες `profiles`, `routines`, `sessions`, το versioned `user_sync_state` και το ιδιωτικό `user_sync_snapshots`. Ενεργοποιούν Row Level Security και περιορίζουν κάθε εγγραφή στον συνδεδεμένο χρήστη. Το snapshot trigger κρατά το πολύ ένα recovery point ανά χρήστη και UTC ημέρα, ενώ καθημερινό Supabase Cron job αφαιρεί όσα είναι παλαιότερα από 30 ημέρες. Τα snapshots δεν εκτίθενται στον client και δεν υπάρχει user-facing επαναφορά.

Οι `profiles`, `routines` και `sessions` είναι phase-one σχήμα που ο σημερινός snapshot client δεν χρησιμοποιεί. Το σχήμα διατηρείται για μελλοντική ρητή migration, αλλά τα Data API privileges έχουν αφαιρεθεί ώστε η αδρανής CRUD επιφάνειά τους να μην είναι προσβάσιμη.

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
5. Production build και performance budget σε emulated mid-range mobile: app shell ≤ 1.300.000 bytes, LCP ≤ 3.500 ms και TBT ≤ 500 ms.

Το axe συμπληρώνεται από το χειροκίνητο [keyboard-only και screen-reader walkthrough](docs/accessibility-walkthrough.md), επειδή η πρόθεση μιας ανακοίνωσης, η χρησιμότητα της σειράς ανάγνωσης και η επιστροφή του focus δεν αποδεικνύονται μόνο από κανόνες DOM.

Το baseline της 27ης Ιουλίου 2026 είναι 1.206.923 bytes production app shell, 1.428 ms LCP και 43 ms TBT (διάμεσος τριών εκτελέσεων, 4× CPU slowdown, 1.600 Kbps download και 150 ms latency). Τα όρια και το προφίλ βρίσκονται στο `performance-budget.json` και η υπέρβασή τους αποτυγχάνει το `npm run check`.

Το ίδιο gate εκτελείται σε pull requests, deployments του `main` και tagged releases. Το `package-lock.json` παραμένει versioned, ενώ το `node_modules/` δημιουργείται τοπικά.

### Τι μένει χειροκίνητο στον service worker

Το `tests/service-worker.test.mjs` φορτώνει τον `service-worker.js` σε ελεγχόμενο worker scope και **εκτελεί** τους `install`, `activate` και `fetch` handlers: precache του shell, network-first πλοήγηση, cache fallback ανά διαδρομή, cache-first assets και καθαρισμό παλιών shell caches. Το `tests/pwa.test.mjs` συνεχίζει να ελέγχει τη σύνθεση του app shell ως κείμενο.

Ο πραγματικός worker ενεργοποιείται σε δύο Chromium e2e σενάρια — το offline boot της ρίζας και η φόρτωση της `privacy.html` υπό ενεργό worker, online και offline. Το `pwa.js` ξεγράφει τον worker στο `localhost`, οπότε και τα δύο τον δηλώνουν ρητά μέσω του `logbookLocalWorkerEnabled`.

Ό,τι δεν αποδεικνύεται ακόμη αυτόματα: η πραγματική συμπεριφορά του Cache API κάτω από αναβάθμιση έκδοσης σε production origin. Μετά από αλλαγή στο `CACHE_VERSION` ή στο `APP_SHELL`, η πρώτη φόρτωση σε εγκατεστημένη PWA ελέγχεται χειροκίνητα.

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

Το `.github/workflows/pages.yml` εκτελεί το πλήρες quality gate σε κάθε push στο `main` και δημιουργεί μέσω του `scripts/build-production.mjs` production artifact από ρητή λίστα runtime αρχείων. Τα JavaScript και CSS assets γίνονται minify με esbuild μόνο για το artifact· η ανάπτυξη συνεχίζει να σερβίρει απευθείας τα αναγνώσιμα source files. Tests, designs, scripts και seed εργαλεία δεν δημοσιεύονται.

Στο baseline της 26ης Ιουλίου το ίδιο allowlisted shell είναι 1.265.953 bytes από τα source files και 1.205.623 bytes στο production artifact: 60.330 bytes ή 4,8% μικρότερο συνολικά, παρότι τα ήδη συμπιεσμένα fonts, icons και το vendored Supabase bundle αποτελούν 675.774 bytes και αντιγράφονται αυτούσια. Ενδεικτικά, μόνο το `app.js` πέφτει από 125.860 σε 98.379 bytes.

Το manifest, τα app icons, οι self-hosted γραμματοσειρές και το offline shell είναι ρυθμισμένα για τη διαδρομή `/logbook/`.

Η πλοήγηση είναι **network-first ανά διαδρομή**: κάθε document ζητείται από το δίκτυο και μόνο σε αποτυχία πέφτει στο cached αντίγραφο *της ίδιας διαδρομής*, με τελευταίο καταφύγιο το `index.html`. Έτσι η `privacy.html` ανοίγει ως δική της σελίδα αντί να αντικαθίσταται από την εφαρμογή, ενώ το offline boot της ρίζας παραμένει. Η απόκριση δικτύου δεν γράφεται στην cache: το shell ανανεώνεται μόνο ολόκληρο στο `install`, ώστε το HTML να μη συνδυαστεί ποτέ με JavaScript άλλης έκδοσης. Τα assets μένουν cache-first.

Η απόφαση να παραμείνει το PWA ο canonical mobile client τεκμηριώνεται στο `docs/mobile-distribution.md`. Η επιλογή native wrapper θα επανεξεταστεί μόνο αν προκύψει πραγματική ανάγκη για app-store distribution, native APIs ή background λειτουργίες που δεν καλύπτει αξιόπιστα το PWA.

Το CSP παραμένει σε `<meta>` επειδή το GitHub Pages δεν επιτρέπει custom HTTP response headers. Περιλαμβάνει `form-action 'self'`, αλλά δεν μπορεί να επιβάλει `frame-ancestors 'none'` από meta policy. Αυτό καταγράφεται ως αποδεκτό χαμηλό ρίσκο όσο το προϊόν μένει στο GitHub Pages: οι ευαίσθητες ενέργειες απαιτούν authentication και ρητή επιβεβαίωση, και δεν υπάρχει καταστροφική one-click διαδρομή. Αν αλλάξει ο host, το CSP μεταφέρεται υποχρεωτικά σε HTTP header και προστίθεται `frame-ancestors 'none'` πριν από τη διανομή.

## Versioning και releases

Το project ακολουθεί Semantic Versioning σε pre-1.0 μορφή:

| Αλλαγή | Παράδειγμα | Χρήση |
|---|---|---|
| Minor | `0.2.0` → `0.3.0` | Νέα λειτουργία ή σημαντική λειτουργική ενότητα |
| Patch | `0.2.0` → `0.2.1` | Διόρθωση ή μικρή συμβατή βελτίωση |
| Prerelease | `0.3.0-alpha.1` | Draft· απαιτεί πρώτα υποστήριξη από το release verifier |
| Stable | `1.0.0` | Πρώτη επίσημη, σταθερή γραμμή προϊόντος |

Ελεγχόμενο version bump χωρίς εγγραφή αρχείων:

```powershell
npm.cmd run version:bump -- <X.Y.Z> --dry-run
```

Αφαίρεσε το `--dry-run` μόνο όταν θέλεις να ενημερωθούν μαζί package metadata, UI version, service-worker cache, tests και ο παρών οδηγός.

Πριν από release πρέπει να συμφωνούν:

- `package.json`
- η root έκδοση του `package-lock.json`
- η εμφανιζόμενη έκδοση στο `index.html`
- το `CACHE_VERSION` στο `service-worker.js`
- τα σχετικά version assertions στα tests
- η έκδοση αυτού του οδηγού

Το τρέχον automated gate δέχεται μόνο την αριθμητική μορφή `X.Y.Z`. Prerelease labels όπως `-alpha.1` δεν πρέπει να χρησιμοποιηθούν πριν ενημερωθούν το `verify-release.mjs` και τα σχετικά tests.

Το `scripts/verify-release.mjs` ελέγχει τη συνέπεια. Tag της μορφής `v<package-version>` ενεργοποιεί το `.github/workflows/release.yml` και δημιουργεί GitHub Release μόνο αν περάσει ολόκληρο το quality gate.

## Ανοιχτά τεχνικά ευρήματα

Επαληθευμένα στο review της 27ης Ιουλίου 2026. Κάθε ένα έχει σημείο στον κώδικα και κριτήριο ολοκλήρωσης.

### Μεσαία προτεραιότητα

- [x] **Άδειος πίνακας σετ αντί για τρία προεπιλεγμένα.** Το fallback του `modules/session-templates.js` ελέγχει πλέον και το μήκος του πίνακα, ώστε legacy `sets: []` να αποδίδει τρεις έγκυρες, επεξεργάσιμες γραμμές. Unit test στο `tests/modules.test.mjs` κλειδώνει το `free-set-count="3"` και τις τρεις γραμμές σετ.
- [x] **Το TBT επέστρεψε σε ασφαλή απόσταση από το όριό του.** Οι μεταφραστικές regular expressions του `i18n.js` συντάσσονται πλέον μόνο όταν ζητηθεί μη ελληνική γλώσσα και η ήδη ελληνική πηγή δεν ξανασαρώνεται άσκοπα στο boot. Η τελική μέτρηση έδωσε 42/43/46 ms και διάμεσο `43/500 ms`, καταγεγραμμένο στο `performance-budget.json`.

### Χαμηλή προτεραιότητα

- [x] **Η `privacy.html` περνά από τους ελέγχους χρώματος.** Τα υπάρχοντα loops των `e2e/high-contrast.spec.mjs` και `e2e/dark-mode.spec.mjs` επισκέπτονται πλέον και το `/privacy.html`, σε ημέρα και νύχτα, με WCAG AA και ενισχυμένο AAA contrast αντίστοιχα.
- [x] **Η ουρά σφαλμάτων του επισκέπτη καθαρίζεται στο sign-out.** Το `logbookGuestErrorQueue` ανήκει στα `LOCAL_USER_DATA_KEYS`, οπότε κανένα pending event προηγούμενης ταυτότητας δεν αποστέλλεται ως συμβάν του επόμενου χρήστη.
- [x] **Το CSP δεν επιτρέπει inline styles.** Τα SVG sprite containers χρησιμοποιούν την κοινή `.svg-sprite` και το `style-src` δηλώνει μόνο `'self'`. Τα browser tests φορτώνουν και το test-only stylesheet από την ίδια προέλευση, χωρίς χαλάρωση της production policy.
- [x] **Το `legal.css` ανήκει στο κοινό token layer.** Η πολιτική απορρήτου φορτώνει `tokens.css` και `theme.js`, ακολουθεί τη νυχτερινή εμφάνιση και την υψηλή αντίθεση, και το stylesheet συμμετέχει στο μηχανικό invariant του `tests/design-tokens.test.mjs`.
- [x] **Τα DOM-free session templates εξήχθησαν από το `app.js`.** Τα `setRows`, `exerciseCard` και `sessionPage` παράγονται πλέον στο ανεξάρτητο `modules/session-templates.js`, με το `app.js` να κρατά μόνο τους λεπτούς adapters προς το ενεργό unit, τα ids και τα session labels. Το module ελέγχεται απευθείας χωρίς DOM και αποστέλλεται ως μέρος του offline/production shell.

## Γνωστοί περιορισμοί

- Το sync είναι snapshot-based και όχι live collaborative editing. Υπάρχει optimistic conflict retry και αυτόματο merge. Η σχεδιαστική παραδοχή είναι ότι η καταγραφή γίνεται από μία ενεργή συσκευή κάθε φορά, επομένως δεν προβλέπεται UI χειροκίνητης επίλυσης conflicts.
- Μία προπόνηση ανά ημέρα, επιβεβλημένη client-side και με unique index. Ο περιορισμός καταπολεμήθηκε με την προσθήκη άσκησης σε υπάρχουσα προπόνηση, παραμένει όμως πραγματικός για two-a-days με χωριστά μετρήσιμα σετ.
- Οι ασκήσεις αποθηκεύονται ως ελεύθερο κείμενο και δεν συνδέονται ακόμη με ενιαία προσωπική βιβλιοθήκη.
- Δεν υπάρχει user-facing πλήρες backup/restore. Το CSV export καλύπτει μόνο το ιστορικό προπονήσεων, όχι τα προγράμματα και το προφίλ.
- Μετά το sign-out το user-scoped recovery cache (`logbookCloudCache:<userId>`) παραμένει στο `localStorage` χωρίς λήξη. Δεν είναι προσβάσιμο από το UI και εξυπηρετεί την επαναφορά του ίδιου λογαριασμού, αλλά σε κοινόχρηστη συσκευή είναι αναγνώσιμο από τα devtools. Αποδεκτό local-first trade-off, καταγεγραμμένο ρητά.
- Η PWA έχει automated Chromium/WebKit κάλυψη, αλλά χρειάζεται τελική QA σε πραγματικές συσκευές Android και iOS.
- Το performance gate χρησιμοποιεί επαναλήψιμη browser emulation και όχι εργαστηριακή συσκευή· τα όρια προστατεύουν από regressions, αλλά δεν αντικαθιστούν το physical-device QA.
- Στο iOS Safari, μια μη εγκατεστημένη σελίδα υπόκειται σε eviction του `localStorage` μετά από επτά ημέρες χωρίς αλληλεπίδραση. Η λωρίδα του επισκέπτη λέει «τα δεδομένα μένουν σε αυτή τη συσκευή»· χωρίς `Προσθήκη στην αρχική οθόνη` αυτό δεν είναι εγγυημένο.

## Roadmap

Άξονας: **φάση 1 δωρεάν προϊόν (όχι open source), τελικός στόχος κέρδος από κινητό.** Εδώ καταγράφονται μόνο ανοιχτά σημεία. Οι ολοκληρωμένες δυνατότητες περιγράφονται παραπάνω.

### Design & προσβασιμότητα

- [ ] **Πρώτη οθόνη με περιεχόμενο για τον επισκέπτη.** Το guest mode έλυσε την πόρτα, όχι το άδειο δωμάτιο: ο νέος χρήστης προσγειώνεται σε εφαρμογή χωρίς πρόγραμμα και χωρίς ιστορικό, οπότε ό,τι κάνει αυτό το προϊόν αναγνωρίσιμο — οι σφραγίδες, οι σελίδες με βιβλιοδεσία, η καμπύλη προόδου — είναι αόρατο. Επιλογή σχεδιαστικού γύρου: προτεινόμενο πρόγραμμα-εκκίνησης, ή μια «γεμάτη» σελίδα-δείγμα που σβήνει με την πρώτη πραγματική καταγραφή. *Done όταν:* ο νέος χρήστης βλέπει τη μεταφορά του προϊόντος πριν καταγράψει οτιδήποτε.

### Εμπορικά — προαπαιτούμενα του 1.0

- [ ] **Απόφαση διανομής με εμπορικά κριτήρια.** Επανεξέταση του `docs/mobile-distribution.md` με ερώτημα «από πού έρχεται ο πρώτος πληρώνων χρήστης». Επιλογές: PWA + web διανομή, ή wrapper (Capacitor/TWA) για παρουσία σε Play Store και App Store. *Done όταν:* η απόφαση είναι γραμμένη με ρητό κόστος και ρητό κανάλι απόκτησης χρηστών. **Μπλοκάρει** κάθε επένδυση σε πληρωμές.
- [ ] **Όροι χρήσης**, στο ύφος και τη διαδρομή της υπάρχουσας [πολιτικής απορρήτου](privacy.html).
- [ ] **LICENSE «All rights reserved»** ή μεταφορά σε private repo με hosting που υποστηρίζει ιδιωτική πηγή. Σήμερα ο κώδικας είναι δημόσιος χωρίς καμία άδεια.
- [ ] **Εξαγωγή όλων των δεδομένων του χρήστη** σε ένα μηχαναγνώσιμο αρχείο, με δυνατότητα επαναφοράς. Καλύπτει ταυτόχρονα το GDPR άρθρο 20, την ανάγκη backup του επισκέπτη και τη μετακίνηση μεταξύ συσκευών χωρίς λογαριασμό. Σήμερα υπάρχει `delete_own_account` (άρθρο 17) χωρίς το αντίστοιχο export.
- [ ] **Κανάλι υποστήριξης:** διεύθυνση επικοινωνίας στην πολιτική απορρήτου και στο μενού, και ένα in-app «αναφορά προβλήματος». Απαιτείται από το Google OAuth verification και από κάθε store.
- [ ] **Physical-device QA** σε ένα πρόσφατο Android και ένα iPhone: εγκατάσταση PWA, offline boot, safe areas, virtual keyboard, επιστροφή OAuth, και ολόκληρος ο κύκλος ζωής του επισκέπτη — συμπεριλαμβανομένης της συμπεριφοράς του `localStorage` στο iOS Safari χωρίς εγκατάσταση.
- [ ] **Product analytics με σεβασμό στο privacy:** ελάχιστα allowlisted events (activation, retention, feature use) πάνω στο υπάρχον privacy-safe RPC pattern ή self-hosted Plausible/Umami. Να καλύπτει και τον επισκέπτη, αλλιώς η μέτρηση χάνει ακριβώς το κοινό που πρέπει να μετρηθεί.
- [ ] **Σχεδιασμός freemium ορίων.** Το guest mode όρισε σιωπηλά ένα δωρεάν tier με μηδέν κλειδωμένες λειτουργίες. Δωρεάν: γρήγορη καταγραφή και βασικό ιστορικό — το core promise. Premium: προχωρημένα analytics, απεριόριστα προγράμματα, βιβλιοθήκη ασκήσεων, themes και print.
- [ ] **Επιλογή αγοράς.** Ποια από τις τέσσερις γλώσσες στοχεύεται πρώτη και γιατί. Χωρίς γραμμένη απάντηση, οι τέσσερις γλώσσες είναι κόστος συντήρησης αντί για πλεονέκτημα.
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
