import { expect, test } from '@playwright/test';

// Ο επισκέπτης είναι η μόνη διαδρομή του προϊόντος που φτάνει στο UI χωρίς συνεδρία.
// Ό,τι υποσχέθηκε ο σχεδιασμός μετριέται εδώ στον πραγματικό browser: μπαίνει χωρίς
// λογαριασμό, γράφει τοπικά, επιστρέφει μετά από reload, και δεν αγγίζει το cloud.

async function installSignedOutStub(page) {
  await page.addInitScript(() => {
    window.supabase = {
      createClient() {
        return {
          auth:{
            async getSession() { return { data:{ session:null }, error:null }; },
            onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
            async signOut() { return { error:null }; },
          },
          from() { throw new Error('A guest must never reach the data API.'); },
          rpc() { throw new Error('A guest must never reach the data API.'); },
        };
      },
    };
  });
}

async function enterAsGuest(page) {
  await installSignedOutStub(page);
  await page.goto('/');
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');
  await page.locator('#account-guest-start').click();
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.addStyleTag({ content:'*,*::before,*::after{animation:none !important;transition:none !important;}' });
}

test('a guest enters without an account and the reminder explains why to make one', async ({ page }) => {
  await enterAsGuest(page);

  const reminder = page.locator('#guest-reminder');
  await expect(reminder).toBeVisible();
  await expect(reminder.locator('#guest-reminder-title')).toHaveText('Τα δεδομένα αποθηκεύονται μόνο σε αυτή τη συσκευή');
  // Η λωρίδα δεν είναι πόρτα: η εφαρμογή από κάτω παραμένει ενεργή.
  await expect(page.locator('#account-dialog')).not.toHaveAttribute('open', '');
  await expect(page.locator('#open-menu')).toBeVisible();

  await page.locator('#guest-reminder-dismiss').click();
  await expect(reminder).toBeHidden();
  await expect(page.locator('#auth-gate')).toHaveAttribute('aria-hidden', 'true');
});

test('a guest keeps the workout locally and returns to it after a reload', async ({ page }) => {
  await enterAsGuest(page);
  await page.locator('#guest-reminder-dismiss').click();

  await page.evaluate(() => {
    localStorage.setItem('trainingSessions', JSON.stringify([{
      id:'guest-session', date:new Date().toISOString().slice(0, 10), type:'free', comments:'',
      exercises:[{ exercise:'Back Squat', comments:'', sets:[{ reps:5, weight:100, plates:null, weightMode:'kg' }] }],
    }]));
  });

  await page.reload();

  // Καμία πύλη, καμία δεύτερη προτροπή: ο επισκέπτης επιστρέφει στην εφαρμογή του.
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await expect(page.locator('#guest-reminder')).toBeHidden();
  await expect(page.locator('#account-menu-status')).toHaveText('ΧΩΡΙΣ ΣΥΝΔΕΣΗ');
  await expect(page.locator('#account-menu-email')).toBeHidden();

  const stored = await page.evaluate(() => ({
    sessions:JSON.parse(localStorage.getItem('trainingSessions') || '[]').length,
    cloudKeys:Object.keys(localStorage).filter(key => key.startsWith('logbookCloud')),
  }));
  expect(stored.sessions).toBe(1);
  expect(stored.cloudKeys).toEqual([]);
});

test('the account card takes a guest back to the gate, not to an empty sheet', async ({ page }) => {
  await enterAsGuest(page);
  await page.locator('#guest-reminder-dismiss').click();

  await page.locator('#open-menu').click();
  const menu = page.locator('#side-menu');
  await expect(menu).toHaveClass(/open/);
  // Όσο υπάρχει το `inert`, κανένα κλικ μέσα στο μενού δεν φτάνει στον στόχο του.
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#account-open').click();

  await expect(page.locator('#account-dialog')).not.toHaveAttribute('open', '');
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');
  await expect(page.locator('[data-account-mode="signin"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#account-guest-start')).toBeVisible();
});

test('the reminder takes a guest to the gate with the signup tab open', async ({ page }) => {
  await enterAsGuest(page);

  await page.locator('#guest-reminder-signup').click();

  await expect(page.locator('#guest-reminder')).toBeHidden();
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');
  await expect(page.locator('[data-account-mode="signup"]')).toHaveAttribute('aria-pressed', 'true');
});
