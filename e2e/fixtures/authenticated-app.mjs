import { expect } from '@playwright/test';

// Ένας συνδεδεμένος χρήστης με αρκετά δεδομένα ώστε να χτίζεται κάθε view: ενεργό
// πρόγραμμα για την Καταγραφή και το Πρόγραμμα, καταγεγραμμένες προπονήσεις για το
// Ιστορικό και την Επίβλεψη, προφίλ για το Προφίλ. Τα κενά views είναι ο εύκολος
// τρόπος να περάσει ένας οπτικός έλεγχος χωρίς να έχει δει τίποτα.
const session = {
  access_token:'e2e-access-token',
  refresh_token:'e2e-refresh-token',
  expires_at:4_102_444_800,
  user:{ id:'e2e-user', email:'night@example.com' },
};

export const VIEWS = ['home', 'log', 'plan', 'overview', 'progress', 'profile'];

export async function installAuthenticatedStub(page, { theme } = {}) {
  await page.addInitScript(({ cachedSession, storedTheme }) => {
    localStorage.setItem('sb-hixnqtjsjcndeatxhpgd-auth-token', JSON.stringify(cachedSession));
    if (storedTheme) localStorage.setItem('logbookTheme', storedTheme);
    const today = new Date();
    const stamp = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    localStorage.setItem('trainingRoutines', JSON.stringify([{
      id:'night-routine', name:'Night Strength', isActive:true, cycleLength:7, cycleAnchorDate:stamp(today), usesWeekdays:false,
      plan:[
        { id:'night-squat', day:null, cycleDay:1, workoutName:'Legs', exercise:'Back Squat', workSets:3, cues:'Βάθος' },
        { id:'night-curl', day:null, cycleDay:1, workoutName:'Legs', exercise:'Hamstring Curl', workSets:3, cues:'Αργή επιστροφή' },
      ],
    }]));
    localStorage.setItem('userProfile', JSON.stringify({ name:'Night Athlete', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' }));
    // Χωρίς καταγεγραμμένες προπονήσεις το Ιστορικό δεν χτίζει ούτε μία κάρτα, οπότε
    // ο έλεγχος αντίθεσης δεν έβλεπε ποτέ το `.card-date` — εκεί ακριβώς κρυβόταν το
    // μόνο χρέος που η νύχτα είχε δικό της.
    localStorage.setItem('trainingSessions', JSON.stringify([1, 3, 5, 8].map((offset, index) => ({
      id:`night-session-${index}`,
      date:stamp(new Date(today.getTime() - offset * 86_400_000)),
      type:index % 2 ? 'free' : 'scheduled',
      comments:'Καλή μέρα',
      exercises:[
        { exercise:'Back Squat', comments:'', sets:[
          { reps:5, weight:100, plates:null, weightMode:'kg' },
          { reps:5, weight:102.5, plates:null, weightMode:'kg' },
          { reps:5, weight:105, plates:null, weightMode:'kg' },
        ] },
        { exercise:'Hamstring Curl', comments:'Αργή επιστροφή', sets:[
          { reps:10, weight:40, plates:null, weightMode:'kg' },
          { reps:10, weight:40, plates:null, weightMode:'kg' },
        ] },
      ],
    }))));
    window.supabase = {
      createClient() {
        let row = null;
        return {
          auth:{
            async getSession() { return { data:{ session:cachedSession }, error:null }; },
            onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
            async signOut() { return { error:null }; },
          },
          from() {
            let values = null;
            const chain = {
              select() { return chain; },
              eq() { return chain; },
              insert(next) { values = next; return chain; },
              update(next) { values = next; return chain; },
              async maybeSingle() { return { data:row, error:null }; },
              async single() {
                row = { user_id:values.user_id, revision:(row?.revision || 0) + 1, payload:values.payload, updated_at:new Date().toISOString() };
                return { data:row, error:null };
              },
            };
            return chain;
          },
          async rpc() { return { data:null, error:null }; },
        };
      },
    };
  }, { cachedSession:session, storedTheme:theme });
}

export async function openMenu(page) {
  // Το webkit δεν κλείνει πάντα το μενού μετά την πλοήγηση, οπότε το άνοιγμα
  // πρέπει να είναι idempotent — αλλιώς το κλικ πέφτει πάνω στο ίδιο το μενού.
  const menu = page.locator('#side-menu');
  if (!(await menu.evaluate(element => element.classList.contains('open')))) {
    await page.locator('#open-menu').click();
  }
  await expect(menu).toHaveClass(/open/);
  // Το `inert` φεύγει μαζί με την κλάση· όσο υπάρχει, κανένα κλικ μέσα στο μενού
  // δεν φτάνει στον στόχο του.
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
}

// Πλοήγηση για τα tests που έχουν ήδη σβήσει animations και transitions. Η αναμονή
// για τα animations ΔΕΝ μπαίνει στο openMenu: η σελίδα έχει διαρκή animations, οπότε
// εκεί θα κρεμόταν για πάντα σε κάθε test που δεν τα έχει σβήσει.
export async function goToView(page, view) {
  await openMenu(page);
  const button = page.locator(`.nav-button[data-view="${view}"]`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator(`#${view}-view`)).toHaveClass(/active/);
  await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'));
}
