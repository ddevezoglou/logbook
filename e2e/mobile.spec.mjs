import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const session = {
  access_token:'e2e-access-token',
  refresh_token:'e2e-refresh-token',
  expires_at:4_102_444_800,
  user:{ id:'e2e-user', email:'mobile@example.com' },
};

async function installAuthenticatedStub(page, { onlineOnly = false, withWorkout = false } = {}) {
  await page.addInitScript(({ cachedSession, onlyOnline, seedWorkout }) => {
    localStorage.setItem('sb-hixnqtjsjcndeatxhpgd-auth-token', JSON.stringify(cachedSession));
    if (seedWorkout) {
      const today = new Date();
      const anchor = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      localStorage.setItem('trainingRoutines', JSON.stringify([{
        id:'mobile-routine', name:'Mobile Strength', isActive:true, cycleLength:7, cycleAnchorDate:anchor, usesWeekdays:false,
        plan:[
          { id:'mobile-legs', day:null, cycleDay:1, workoutName:'Legs', exercise:'Leg Extensions', workSets:3, cues:'Θέση στο 7' },
          { id:'mobile-curls', day:null, cycleDay:1, workoutName:'Legs', exercise:'Hamstring Curl', workSets:3, cues:'Αργή επιστροφή' },
        ],
      }]));
      localStorage.setItem('userProfile', JSON.stringify({ name:'Mobile Athlete', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' }));
    }
    if (onlyOnline && !navigator.onLine) return;
    window.supabase = {
      createClient() {
        let row = null;
        const listeners = [];
        return {
          auth:{
            async getSession() { return { data:{ session:cachedSession }, error:null }; },
            onAuthStateChange(callback) { listeners.push(callback); return { data:{ subscription:{ unsubscribe() {} } } }; },
            async signOut() { listeners.forEach(callback => callback('SIGNED_OUT', null)); return { error:null }; },
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
  }, { cachedSession:session, onlyOnline:onlineOnly, seedWorkout:withWorkout });
}

async function installGuestStub(page) {
  await page.addInitScript(() => {
    window.supabase = {
      createClient:() => ({
        auth:{
          async getSession() { return { data:{ session:null }, error:null }; },
          onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
        },
      }),
    };
  });
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    width:innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
    bodyMargin:getComputedStyle(document.body).margin,
    bodyClasses:document.body.className,
    outliers:[...document.querySelectorAll('body *')].flatMap(element => {
      const rect = element.getBoundingClientRect();
      return rect.right > innerWidth + 1 || rect.left < -1
        ? [{ element:`${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length ? `.${[...element.classList].join('.')}` : ''}`, left:Math.round(rect.left), right:Math.round(rect.right), width:Math.round(rect.width) }]
        : [];
    }).slice(0, 8),
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 1);
}

async function expectNoSeriousAxeViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
  expect(serious, serious.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
}

test('login gate fits mobile viewports and exposes touch-sized controls', async ({ page }) => {
  await installGuestStub(page);
  await page.goto('/');
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');
  await expectNoHorizontalOverflow(page);

  for (const selector of ['[data-account-mode="signin"]', '[data-account-mode="signup"]', '#account-google']) {
    const box = await page.locator(selector).boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
  expect(await page.locator('#account-signin-email').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);

  await page.locator('[data-account-mode="signup"]').click();
  const layout = await page.evaluate(() => {
    const submit = document.querySelector('#account-signup-form .primary-button').getBoundingClientRect();
    const languages = document.querySelector('.auth-gate-languages').getBoundingClientRect();
    return { submitBottom:submit.bottom, languagesTop:languages.top, languagePosition:getComputedStyle(document.querySelector('.auth-gate-languages')).position };
  });
  expect(layout.languagePosition).toBe('static');
  expect(layout.languagesTop).toBeGreaterThanOrEqual(layout.submitBottom);
  await expectNoSeriousAxeViolations(page);
});

test('mobile uses the web ribbon menu and keeps every section reachable', async ({ page }) => {
  await installAuthenticatedStub(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await expectNoHorizontalOverflow(page);

  const menuButton = page.locator('#open-menu');
  await expect(menuButton).toBeVisible();
  const menuButtonBox = await menuButton.boundingBox();
  expect(menuButtonBox?.width || 0).toBeGreaterThanOrEqual(44);
  expect(menuButtonBox?.height || 0).toBeGreaterThanOrEqual(44);

  await menuButton.click();
  await expect(page.locator('#side-menu')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#close-menu')).toBeFocused();
  await expect(page.locator('#side-menu [data-view="home"]')).toBeVisible();
  await expect(page.locator('#side-menu [data-view="log"]')).toBeVisible();
  await expect(page.locator('#side-menu [data-view="plan"]')).toBeVisible();
  await expect(page.locator('#side-menu [data-view="overview"]')).toBeVisible();
  await expect(page.locator('#side-menu [data-view="progress"]')).toBeVisible();
  await page.locator('#side-menu [data-view="log"]').click();
  await expect(page.locator('#log-view')).toHaveClass(/active/);
  await expect(page.locator('#save-session')).toBeVisible();
  expect((await page.locator('#save-session').boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);

  await menuButton.click();
  await page.locator('#close-menu').click();
  await expect(menuButton).toBeFocused();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAxeViolations(page);
});

test('mobile home stacks the web cards and contains no section navigation buttons', async ({ page }) => {
  await installAuthenticatedStub(page, { withWorkout:true });
  await page.goto('/');

  const routine = page.locator('#home-routine-card');
  const quote = page.locator('.daily-quote');
  const profile = page.locator('#home-profile-card');
  await expect(routine).toBeVisible();
  await expect(quote).toBeVisible();
  await expect(profile).toBeVisible();
  await expect(page.locator('.home-intro')).toBeHidden();
  await expect(page.locator('.home-routine-open')).toBeHidden();
  const routineBox = await routine.boundingBox();
  const quoteBox = await quote.boundingBox();
  const profileBox = await profile.boundingBox();
  expect((routineBox?.y || 0) + (routineBox?.height || 0)).toBeLessThanOrEqual(quoteBox?.y || 0);
  expect((quoteBox?.y || 0) + (quoteBox?.height || 0)).toBeLessThanOrEqual(profileBox?.y || 0);
  await expectNoHorizontalOverflow(page);
});

test('desktop navigation remains available above the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width:1280, height:800 });
  await installAuthenticatedStub(page, { withWorkout:true });
  await page.goto('/');

  await expect(page.locator('#open-menu')).toBeVisible();
  await expect(page.locator('.home-quick')).toBeVisible();
  await expect(page.locator('#home-routine-card')).toBeVisible();
  await expect(page.locator('#home-profile-card')).toBeVisible();
  await page.locator('#open-menu').click();
  await expect(page.locator('#side-menu')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#side-menu [data-view="log"]')).toBeVisible();
  await page.locator('#close-menu').click();
  await expect(page.locator('#open-menu')).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('workout deck keeps compact set lines, dynamic weight fields and completion reachable', async ({ page }) => {
  await installAuthenticatedStub(page, { withWorkout:true });
  await page.goto('/');
  await page.locator('#open-menu').click();
  await page.locator('#side-menu [data-view="log"]').click();

  const deck = page.locator('#scheduled-session .exercise-deck-shell');
  const exercise = deck.locator('.workout-exercise').first();
  await expect(exercise.getByRole('heading', { name:'Leg Extensions' })).toBeVisible();
  await expect(exercise.locator('.set-row')).toHaveCount(3);
  await expect(deck.locator('.deck-stamp')).toHaveText('ΑΣΚΗΣΗ 01 / 02');
  await expect(exercise.locator('.sets-header')).toBeVisible();
  expect((await exercise.locator('.set-reps').first().boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);

  const firstRow = exercise.locator('.set-row').first();
  await firstRow.locator('.weight-mode').selectOption('mixed');
  await expect(firstRow.locator('.set-plates')).toBeVisible();
  await expect(firstRow.locator('.set-weight')).toBeVisible();
  expect((await firstRow.boundingBox())?.height || 0).toBeLessThanOrEqual(60);
  const mixedModeBox = await firstRow.locator('.weight-mode').boundingBox();
  const mixedPlatesBox = await firstRow.locator('.set-plates').boundingBox();
  expect(Math.abs((mixedModeBox?.y || 0) - (mixedPlatesBox?.y || 0))).toBeLessThanOrEqual(2);
  await firstRow.locator('.weight-mode').selectOption('bodyweight');
  await expect(firstRow.locator('.weight-entry')).toBeHidden();
  await firstRow.locator('.weight-mode').selectOption('bodyweight_extra');
  const compactModeStyle = await firstRow.locator('.weight-mode').evaluate(element => ({
    fontSize:parseFloat(getComputedStyle(element).fontSize),
    whiteSpace:getComputedStyle(element).whiteSpace,
  }));
  expect(compactModeStyle.fontSize).toBeLessThanOrEqual(10);
  expect(compactModeStyle.whiteSpace).toBe('nowrap');
  const extraModeBox = await firstRow.locator('.weight-mode').boundingBox();
  const extraWeightBox = await firstRow.locator('.set-weight').boundingBox();
  expect(Math.abs((extraModeBox?.y || 0) - (extraWeightBox?.y || 0))).toBeLessThanOrEqual(2);

  const cardBox = await exercise.boundingBox();
  const previousArrowBox = await deck.locator('.deck-arrow-prev').boundingBox();
  const nextArrowBox = await deck.locator('.deck-arrow-next').boundingBox();
  const cardCenter = (cardBox?.y || 0) + (cardBox?.height || 0) / 2;
  expect(Math.abs(cardCenter - ((previousArrowBox?.y || 0) + (previousArrowBox?.height || 0) / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs(cardCenter - ((nextArrowBox?.y || 0) + (nextArrowBox?.height || 0) / 2))).toBeLessThanOrEqual(1);

  await deck.locator('.deck-arrow-next').click();
  await expect(deck.locator('.deck-stamp')).toHaveText('ΑΣΚΗΣΗ 02 / 02');
  await expect(deck.getByRole('heading', { name:'Hamstring Curl' })).toBeVisible();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight);
  const saveBox = await page.locator('.session-save-actions').boundingBox();
  expect((saveBox?.y || 0) + (saveBox?.height || 0)).toBeLessThanOrEqual((page.viewportSize()?.height || 0) + 1);
  await expect(page.locator('.session-save-actions .motto-stamp')).toBeVisible();
  const earnItBox = await page.locator('.session-save-actions .motto-stamp').boundingBox();
  const completeBox = await page.locator('#save-session').boundingBox();
  expect((earnItBox?.y || 0) + (earnItBox?.height || 0)).toBeLessThanOrEqual(completeBox?.y || 0);
  await expectNoHorizontalOverflow(page);
});

test('an installed PWA boots from its cached session without a network', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'The offline service-worker boot is exercised once in Chromium.');
  await page.addInitScript(() => sessionStorage.setItem('logbookLocalWorkerEnabled', 'true'));
  await installAuthenticatedStub(page, { onlineOnly:true });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/service-worker.js', { scope:'/' });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once:true }));
    for (const key of await caches.keys()) await (await caches.open(key)).delete('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  });

  await context.setOffline(true);
  await page.reload({ waitUntil:'domcontentloaded' });

  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout:10_000 });
  await page.locator('#open-menu').click();
  await expect(page.locator('#side-menu')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#close-menu')).toBeFocused();
  await page.locator('#account-open').click();
  await expect(page.locator('#account-sync-state')).toHaveCount(0);
  await expect(page.locator('#account-member-email')).toHaveText('mobile@example.com');
});
