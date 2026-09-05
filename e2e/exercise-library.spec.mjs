import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function navigate(page, view) {
  await page.locator('#open-menu').click();
  await page.locator(`#side-menu [data-view="${view}"]`).click();
}
async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('logbookGuest', '1');
    localStorage.setItem('logbookGuestReminderAt', String(Date.now()));
    window.supabase = { createClient:() => ({ auth:{
      async getSession() { return { data:{ session:null }, error:null }; },
      onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
    } }) };
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.addStyleTag({ url:'/e2e/fixtures/no-animations.css' });
  await navigate(page, 'plan');
  await page.locator('#library-editor > summary').click();
}

test('exercise → routine → two days → offline logging → rename keeps history and progress', async ({ page, context }) => {
  test.setTimeout(60_000);
  await boot(page);
  await page.locator('#library-exercise-name').fill('Row');
  await page.locator('#library-exercise-notes').fill('Cable station');
  await page.locator('#exercise-library-form [type="submit"]').click();
  await expect(page.locator('#exercise-library-list li')).toHaveCount(1);
  const exerciseId = await page.evaluate(() => JSON.parse(localStorage.getItem('trainingExercises'))[0].id);
  await page.locator('#routine-creator > summary').click();
  await page.locator('#routine-name').fill('Strength');
  await page.locator('#routine-form [type="submit"]').click();
  const routineCard = page.locator('.routine-card').filter({ has:page.locator('.routine-select', { hasText:'Strength' }) });
  await routineCard.locator('[data-activate-routine]').click();
  const routineId = await routineCard.getAttribute('data-routine-id');
  for (const name of ['Upper A', 'Upper B']) {
    await routineCard.locator('[data-add-routine-workout]').click();
    await page.locator('#workout-name').fill(name);
    await page.locator('#exercise-count').fill('1');
    await page.locator('.builder-name').selectOption(exerciseId);
    await page.locator('.builder-sets').fill('1');
    await page.locator('#plan-submit').click();
    await expect(page.locator('#plan-workout-dialog')).not.toBeVisible();
  }
  await context.setOffline(true);
  await navigate(page, 'log');
  for (const [day, date] of [['1', '2026-07-06'], ['2', '2026-07-07']]) {
    await page.locator('#log-date').fill(date);
    await page.locator('#workout-day-select').selectOption(day);
    await page.locator('#scheduled-session .set-reps').fill('8');
    await page.locator('#scheduled-session .set-weight').fill(day === '1' ? '40' : '45');
    await page.locator('#save-session').click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions') || '[]').length)).toBe(Number(day));
  }
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')));
  expect(history).toHaveLength(2);
  expect(history.every(session => session.exercises[0].exerciseId === exerciseId)).toBe(true);
  expect(new Set(history.map(session => session.exercises[0].planExerciseId)).size).toBe(2);
  await navigate(page, 'plan');
  await page.locator('[data-edit-exercise]').click();
  await page.locator('#library-exercise-name').fill('Seated Cable Row');
  await page.locator('#exercise-library-form [type="submit"]').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')))).toEqual(history);
  await navigate(page, 'progress');
  await page.locator('#progress-workout').selectOption(routineId);
  await expect(page.locator('#progress-exercise option')).toHaveCount(1);
  await expect(page.locator('#progress-exercise option')).toHaveText('Seated Cable Row');
  await expect(page.locator('#progress-panel .chart-point')).toHaveCount(2);
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')))).toEqual(history);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trainingExercises')).length)).toBe(1);
});

test('library form supports keyboard, homonyms, long names and accessible mobile/desktop layout', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page);
  for (const notes of ['Cable', 'Dumbbell']) {
    await page.locator('#library-exercise-name').focus();
    await page.keyboard.type('Row');
    await page.keyboard.press('Tab');
    await page.keyboard.type(notes);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#exercise-library-list li')).toHaveCount(2);
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('trainingExercises')));
  expect(records[0].id).not.toBe(records[1].id);
  await page.locator('#library-exercise-name').fill('A'.repeat(200));
  await page.locator('#exercise-library-form [type="submit"]').click();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height:900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const theme of ['day', 'night']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const results = await new AxeBuilder({ page }).include('#plan-view').analyze();
      expect(results.violations).toEqual([]);
    }
  }
});
