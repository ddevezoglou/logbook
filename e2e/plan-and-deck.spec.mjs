import { expect, test } from '@playwright/test';

const session = {
  access_token:'e2e-access-token',
  refresh_token:'e2e-refresh-token',
  expires_at:4_102_444_800,
  user:{ id:'e2e-user', email:'mobile@example.com' },
};

async function boot(page, sets = [3, 3, 3, 3]) {
  await page.addInitScript(({ cachedSession, workSets }) => {
    localStorage.setItem('sb-hixnqtjsjcndeatxhpgd-auth-token', JSON.stringify(cachedSession));
    const today = new Date();
    const anchor = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    localStorage.setItem('trainingRoutines', JSON.stringify([{
      id:'r1', name:'Repro', isActive:true, cycleLength:7, cycleAnchorDate:anchor, usesWeekdays:false,
      plan:workSets.map((count, index) => ({
        id:`p${index + 1}`, day:null, cycleDay:1, workoutName:'Push', exercise:`Exercise ${index + 1}`, workSets:count, cues:'',
      })),
    }]));
    localStorage.setItem('userProfile', JSON.stringify({ name:'A', birthdate:'1990-01-01', weight:80, weightUnit:'kg', avatar:'male', customImage:'' }));
    window.supabase = { createClient:() => ({
      auth:{
        async getSession() { return { data:{ session:cachedSession }, error:null }; },
        onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
        async signOut() { return { error:null }; },
      },
      from() {
        let row = null;
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
    }) };
  }, { cachedSession:session, workSets:sets });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
}

test('the exercise counter keeps existing exercises while it grows and shrinks', async ({ page }) => {
  await boot(page);
  await page.locator('#open-menu').click();
  await page.locator('#side-menu [data-view="plan"]').click();
  await page.locator('[data-view-routine]').first().click();
  await page.locator('[data-edit-day="1"]').first().click();
  const counter = page.locator('#exercise-count');
  await expect(counter).toHaveValue('4');
  await expect(page.locator('.plan-exercise-fields')).toHaveCount(4);
  const names = () => page.locator('.builder-name').evaluateAll(list => list.map(input => input.value));

  await counter.click();
  await counter.press('ControlOrMeta+a');
  await counter.press('Backspace');
  await counter.press('5');
  await page.waitForTimeout(100);
  expect((await names()).slice(0, 4)).toEqual(['Exercise 1', 'Exercise 2', 'Exercise 3', 'Exercise 4']);

  await counter.press('ControlOrMeta+a');
  await counter.press('2');
  await page.waitForTimeout(100);
  expect(await names()).toEqual(['Exercise 1', 'Exercise 2']);

  await counter.press('ControlOrMeta+a');
  await counter.press('4');
  await page.waitForTimeout(100);
  expect(await names()).toEqual(['Exercise 1', 'Exercise 2', 'Exercise 3', 'Exercise 4']);

  // typing 12 digit by digit must survive the intermediate "1"
  await counter.press('ControlOrMeta+a');
  await counter.press('1');
  await counter.press('2');
  await page.waitForTimeout(100);
  expect((await names()).slice(0, 4)).toEqual(['Exercise 1', 'Exercise 2', 'Exercise 3', 'Exercise 4']);
  await expect(page.locator('.plan-exercise-fields')).toHaveCount(12);
});

test('cards behind the active one only peek out of the deck', async ({ page }) => {
  await boot(page, [2, 5, 3]);
  await page.locator('#open-menu').click();
  await page.locator('#side-menu [data-view="log"]').click();
  const deck = page.locator('#scheduled-session .exercise-deck');
  await expect(deck.locator('.workout-exercise')).toHaveCount(3);
  await page.waitForTimeout(600);

  const boxes = await deck.locator('.workout-exercise').evaluateAll(list => list.map(card => {
    const rect = card.getBoundingClientRect();
    return { top:Math.round(rect.top), bottom:Math.round(rect.bottom) };
  }));
  const deckBottom = await deck.evaluate(element => Math.round(element.getBoundingClientRect().bottom));
  const detail = JSON.stringify({ boxes, deckBottom });
  expect(boxes[1].bottom, detail).toBeLessThanOrEqual(boxes[0].bottom);
  expect(boxes[2].bottom, detail).toBeLessThanOrEqual(boxes[0].bottom);
  expect(deckBottom - boxes[0].bottom, detail).toBeLessThanOrEqual(20);
  expect(boxes[0].top - boxes[1].top, detail).toBeGreaterThanOrEqual(6);
});
