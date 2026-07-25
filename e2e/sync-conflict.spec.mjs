import { expect, test } from '@playwright/test';

const session = {
  access_token:'e2e-sync-access-token',
  refresh_token:'e2e-sync-refresh-token',
  expires_at:4_102_444_800,
  user:{ id:'e2e-sync-user', email:'sync@example.com' },
};

const clone = value => value === null || value === undefined ? value : structuredClone(value);

async function installSharedCloud(page, transact) {
  await page.exposeFunction('e2eSyncTransaction', transact);
  await page.addInitScript(cachedSession => {
    localStorage.setItem('sb-hixnqtjsjcndeatxhpgd-auth-token', JSON.stringify(cachedSession));
    window.supabase = {
      createClient() {
        return {
          auth:{
            async getSession() { return { data:{ session:cachedSession }, error:null }; },
            onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
            async signOut() { return { error:null }; },
          },
          from() {
            let operation = 'select';
            let values = null;
            const filters = {};
            const chain = {
              select() { return chain; },
              insert(next) { operation = 'insert'; values = next; return chain; },
              update(next) { operation = 'update'; values = next; return chain; },
              eq(column, value) { filters[column] = value; return chain; },
              async maybeSingle() {
                return window.e2eSyncTransaction({ operation, values, filters });
              },
              async single() {
                return window.e2eSyncTransaction({ operation, values, filters });
              },
            };
            return chain;
          },
          async rpc() { return { data:null, error:null }; },
        };
      },
    };
  }, session);
}

test('simultaneous sync in two browser contexts keeps both workouts after a revision conflict', async ({ browser }) => {
  test.setTimeout(60_000);
  let remote = {
    user_id:session.user.id,
    revision:1,
    updated_at:'2026-07-25T08:00:00.000Z',
    payload:{
      trainingRoutines:[{
        id:'shared-routine',
        name:'Shared plan',
        isActive:true,
        isPlaceholder:false,
        cycleLength:7,
        cycleAnchorDate:'2026-07-20',
        usesWeekdays:false,
        plan:[],
      }],
      trainingSessions:[],
      userProfile:null,
      routineRewardTracking:null,
      homeProfileCardPosition:null,
      homeRoutineCardPosition:null,
      logbookLanguage:'el',
    },
  };
  const transact = async ({ operation, values, filters }) => {
    if (operation === 'select') return { data:clone(remote), error:null };
    if (operation === 'insert') {
      if (remote) return { data:null, error:{ code:'23505' } };
      remote = { user_id:values.user_id, revision:1, payload:clone(values.payload), updated_at:new Date().toISOString() };
      return { data:clone(remote), error:null };
    }
    if (
      !remote
      || String(filters.user_id) !== String(remote.user_id)
      || Number(filters.revision) !== Number(remote.revision)
    ) {
      return { data:null, error:null };
    }
    await new Promise(resolve => setTimeout(resolve, 20));
    if (Number(filters.revision) !== Number(remote.revision)) return { data:null, error:null };
    remote = {
      ...remote,
      revision:remote.revision + 1,
      payload:clone(values.payload),
      updated_at:new Date().toISOString(),
    };
    return { data:clone(remote), error:null };
  };

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  await installSharedCloud(firstPage, transact);
  await installSharedCloud(secondPage, transact);

  await Promise.all([firstPage.goto('/'), secondPage.goto('/')]);
  await Promise.all([
    expect(firstPage.locator('body')).toHaveClass(/app-ready/),
    expect(secondPage.locator('body')).toHaveClass(/app-ready/),
  ]);

  const workout = (id, date, exercise) => ({
    id,
    date,
    type:'free',
    comments:'',
    exercises:[{ exercise, comments:'', sets:[{ reps:5, weight:50, plates:null, weightMode:'kg' }] }],
  });
  await firstPage.evaluate(entry => localStorage.setItem('trainingSessions', JSON.stringify([entry])), workout('device-a', '2026-07-24', 'Squat'));
  await secondPage.evaluate(entry => localStorage.setItem('trainingSessions', JSON.stringify([entry])), workout('device-b', '2026-07-25', 'Bench Press'));

  await Promise.all([
    firstPage.evaluate(() => window.LogbookCloudSync.sync()),
    secondPage.evaluate(() => window.LogbookCloudSync.sync()),
  ]);

  expect(remote.payload.trainingSessions.map(item => item.id).sort()).toEqual(['device-a', 'device-b']);
  await Promise.all([firstPage.waitForTimeout(300), secondPage.waitForTimeout(300)]);
  await Promise.all([
    expect(firstPage.locator('body')).toHaveClass(/app-ready/),
    expect(secondPage.locator('body')).toHaveClass(/app-ready/),
  ]);
  for (const page of [firstPage, secondPage]) {
    const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id));
    if (ids.length < 2) {
      await page.evaluate(() => window.LogbookCloudSync.sync()).catch(error => {
        if (!/Execution context was destroyed|navigation/i.test(error.message)) throw error;
      });
      await expect(page.locator('body')).toHaveClass(/app-ready/);
    }
  }
  const [firstLocal, secondLocal] = await Promise.all([
    firstPage.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id).sort()),
    secondPage.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id).sort()),
  ]);
  expect(firstLocal).toEqual(['device-a', 'device-b']);
  expect(secondLocal).toEqual(['device-a', 'device-b']);
  expect(remote.payload.trainingSessions.map(item => item.id).sort()).toEqual(['device-a', 'device-b']);

  await Promise.all([firstContext.close(), secondContext.close()]);
});
