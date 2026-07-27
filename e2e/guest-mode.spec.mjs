import AxeBuilder from '@axe-core/playwright';
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
  await page.addStyleTag({ url:'/e2e/fixtures/no-animations.css' });
}

async function tabTo(page, selector, limit = 250) {
  for (let index = 0; index < limit; index += 1) {
    const reached = await page.evaluate(target => document.activeElement?.matches(target), selector);
    if (reached) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard focus did not reach ' + selector);
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

test('the guest entry and primary navigation work keyboard-only with a polite reminder', async ({ page }) => {
  await installSignedOutStub(page);
  await page.goto('/');
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');

  await tabTo(page, '#account-guest-start');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/app-ready/);

  const reminder = page.getByRole('region', { name:'Τα δεδομένα αποθηκεύονται μόνο σε αυτή τη συσκευή' });
  await expect(reminder).toBeVisible();
  await expect(reminder).toHaveAttribute('aria-live', 'polite');
  await expect(reminder).toHaveAttribute('aria-atomic', 'true');
  await expect(reminder).not.toBeFocused();

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
  expect(serious, serious.map(item => item.id + ': ' + item.help).join('\n')).toEqual([]);

  await tabTo(page, '#open-menu');
  await page.keyboard.press('Enter');
  await expect(page.locator('#close-menu')).toBeFocused();
  await tabTo(page, '#side-menu [data-view="log"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('#log-view')).toHaveClass(/active/);

  await tabTo(page, '#guest-reminder-dismiss');
  await page.keyboard.press('Enter');
  await expect(reminder).toBeHidden();
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

test('the save confirmation stays visible above the guest reminder on mobile', async ({ page }) => {
  await enterAsGuest(page);
  await page.locator('#open-menu').click();
  await page.locator('#side-menu [data-view="log"]').click();
  await page.locator('[data-mode="free"]').click();

  const card = page.locator('#free-exercises [data-exercise]').first();
  await card.locator('.free-set-count').fill('1');
  await card.locator('.free-set-count').dispatchEvent('input');
  await card.locator('.exercise-name').fill('Goblet Squat');
  await card.locator('.set-reps').fill('10');
  await card.locator('.set-weight').fill('20');
  // Keyboard activation isolates the toast stacking contract: the fixed reminder
  // intentionally occupies the bottom touch area while it is open.
  await page.locator('#save-session').focus();
  await page.locator('#save-session').press('Enter');

  const toast = page.locator('#toast');
  const reminder = page.locator('#guest-reminder');
  await expect(reminder).toBeVisible();
  await expect(toast).toBeVisible();
  await expect(toast).toHaveText('Η προπόνηση καταγράφηκε.');
  const layers = await page.evaluate(() => ({
    toast:Number(getComputedStyle(document.querySelector('#toast')).zIndex),
    reminder:Number(getComputedStyle(document.querySelector('#guest-reminder')).zIndex),
    toastBottom:document.querySelector('#toast').getBoundingClientRect().bottom,
    viewportBottom:innerHeight,
  }));
  expect(layers.toast).toBeGreaterThan(layers.reminder);
  expect(layers.toastBottom).toBeLessThanOrEqual(layers.viewportBottom);
});
