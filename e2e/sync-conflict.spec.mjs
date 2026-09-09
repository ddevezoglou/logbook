import { expect, test } from '@playwright/test';

const session = {
  access_token:'e2e-sync-access-token',
  refresh_token:'e2e-sync-refresh-token',
  expires_at:4_102_444_800,
  user:{ id:'e2e-sync-user', email:'sync@example.com' },
};

const clone = value => value === null || value === undefined ? value : structuredClone(value);
const duringReload = error => {
  if (!/Execution context was destroyed|navigation/i.test(error.message)) throw error;
};
const requestSync = page => page.evaluate(() => window.LogbookCloudSync.sync()).catch(duringReload);

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

test('cloud responses during interaction preserve history, chart and a saved cue', async ({ page }) => {
  test.setTimeout(60_000);
  let remote = { user_id:session.user.id, revision:1, payload:{
    trainingExercises:[{ id:'row', name:'Row', cues:'Original', aliases:[], updatedAt:'2026-01-01T00:00:00.000Z' }],
    trainingRoutines:[],
    trainingSessions:Array.from({ length:13 }, (_, i) => ({ id:`race-${i}`, date:`2026-08-${String(i + 1).padStart(2, '0')}`, type:'free', comments:'', exercises:[{ exerciseId:'row', exercise:'Row', sets:[{ reps:8, weight:50 + i, weightMode:'kg' }] }] })),
    logbookLanguage:'el',
  } };
  await installSharedCloud(page, async ({ operation, values, filters }) => {
    if (operation === 'select') return { data:clone(remote), error:null };
    if (operation === 'insert') return { data:null, error:{ code:'23505' } };
    if (Number(filters.revision) !== remote.revision) return { data:null, error:null };
    remote = { ...remote, revision:remote.revision + 1, payload:clone(values.payload) };
    return { data:clone(remote), error:null };
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.addStyleTag({ url:'/e2e/fixtures/no-animations.css' });
  await requestSync(page);
  const navigate = async view => {
    await page.locator('#open-menu').click();
    await page.locator(`#side-menu [data-view="${view}"]`).click();
    await expect(page.locator(`#${view}-view`)).toHaveClass(/active/);
  };
  const applyRemote = async change => {
    change(remote.payload);
    remote.revision++;
    await page.evaluate(() => {
      window.syncInteractionApplied = false;
      window.addEventListener('logbook:cloud-data-applied', () => { window.syncInteractionApplied = true; }, { once:true });
    });
    await requestSync(page);
    await page.waitForFunction(() => window.syncInteractionApplied);
  };

  await navigate('overview');
  const selection = page.locator('[data-select-session="race-12"]');
  await selection.scrollIntoViewIfNeeded();
  await selection.evaluate(element => { window.interactionControl = element; });
  const bounds = await selection.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await applyRemote(payload => { payload.trainingSessions.find(item => item.id === 'race-12').comments = 'Remote comment'; });
  await expect(selection).toHaveJSProperty('isConnected', true);
  expect(await selection.evaluate(element => element === window.interactionControl)).toBe(true);
  await page.mouse.up();
  await expect(selection).toBeChecked();

  await navigate('progress');
  const chart = page.locator('.chart-wrap.is-scrollable');
  await expect(chart).toBeVisible();
  await chart.evaluate(element => { window.interactionChart = element; element.scrollLeft = 100; });
  // pointercancel is how the browser hands the gesture over to native scrolling.
  await chart.dispatchEvent('pointerdown', { pointerType:'touch', pointerId:1 });
  await chart.dispatchEvent('pointercancel', { pointerType:'touch', pointerId:1 });
  await applyRemote(payload => { payload.trainingSessions[0].exercises[0].sets[0].weight = 125; });
  expect(await chart.evaluate(element => element === window.interactionChart && element.scrollLeft === 100)).toBe(true);

  await navigate('plan');
  await page.locator('[aria-controls="exercise-library-body"]').click();
  await page.locator('[data-edit-exercise="row"]').click();
  const cue = page.locator('#library-exercise-notes');
  await cue.focus();
  await applyRemote(payload => { payload.trainingExercises[0].cues = 'Remote cue'; payload.trainingExercises[0].updatedAt = '2026-09-01T00:00:00.000Z'; });
  await expect(cue).toHaveValue('Original');
  await cue.fill('My saved cue');
  await page.locator('#exercise-library-form [type="submit"]').click();
  await requestSync(page);
  expect(remote.payload.trainingExercises.find(item => item.id === 'row').cues).toBe('My saved cue');
  await navigate('overview');
  await expect(page.locator('[data-select-session="race-12"]')).toBeChecked();
  await expect(page.locator('[data-session-id="race-12"] .card-comment')).toHaveText('Remote comment');
  await expect(page.locator('#toast')).not.toContainText('άλλη συσκευή');
});

for (const timing of ['deferred form', 'in-flight request']) {
  test(`saving a workout preserves cloud changes during ${timing}`, async ({ page }) => {
    let remote = { user_id:session.user.id, revision:1, payload:{
      trainingRoutines:[{ id:'r1', name:'Plan', isActive:true, isPlaceholder:false, cycleLength:7, plan:[] }],
      trainingSessions:[], logbookLanguage:'el',
    } };
    let holdRead = false, releaseRead, readArrived;
    const arrived = new Promise(resolve => { readArrived = resolve; });
    await installSharedCloud(page, async ({ operation, values, filters }) => {
      if (operation === 'select') {
        const response = { data:clone(remote), error:null };
        if (holdRead) {
          holdRead = false; readArrived();
          await new Promise(resolve => { releaseRead = resolve; });
        }
        return response;
      }
      if (operation === 'insert') return { data:null, error:{ code:'23505' } };
      if (Number(filters.revision) !== remote.revision) return { data:null, error:null };
      remote = { ...remote, revision:remote.revision + 1, payload:clone(values.payload) };
      return { data:clone(remote), error:null };
    });
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/app-ready/);
    await requestSync(page);
    await page.locator('#open-menu').click();
    await page.locator('#side-menu [data-view="log"]').click();
    await page.locator('[data-mode="free"]').click();
    await page.locator('#free-exercises .exercise-name').first().fill('Local squat');
    for (const row of await page.locator('#free-exercises [data-set]').all()) {
      await row.locator('.set-reps').fill('8');
      await row.locator('.set-weight').fill('55');
    }
    await page.locator('#log-date').fill('2026-08-03');
    remote.payload.trainingSessions.push({ id:'remote-added', date:'2026-08-02', type:'free', exercises:[] });
    remote.revision++;
    if (timing === 'deferred form') {
      await requestSync(page);
      await expect(page.locator('#free-exercises .exercise-name').first()).toHaveValue('Local squat');
      await expect(page.locator('#toast')).not.toContainText('Ήρθαν αλλαγές');
    } else {
      holdRead = true;
      await page.evaluate(() => { window.pendingRaceSync = window.LogbookCloudSync.sync(); });
      await arrived;
    }
    await page.locator('#save-session').click();
    if (releaseRead) releaseRead();
    await requestSync(page);
    await expect.poll(() => remote.payload.trainingSessions.map(item => item.date).sort()).toEqual(['2026-08-02', '2026-08-03']);
    const dates = await page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.date).sort());
    expect(dates).toEqual(['2026-08-02', '2026-08-03']);
  });
}

test('sign-out invalidates a pending cloud read before it can restore private history', async ({ page }) => {
  let remote = { user_id:session.user.id, revision:1, payload:{ trainingSessions:[{ id:'private', date:'2026-08-01', type:'free', exercises:[] }] } };
  let hold = false, release, arrived;
  const waiting = new Promise(resolve => { arrived = resolve; });
  await installSharedCloud(page, async ({ operation, values }) => {
    if (operation !== 'select') remote = { ...remote, revision:remote.revision + 1, payload:clone(values.payload) };
    const response = { data:clone(remote), error:null };
    if (operation === 'select' && hold) {
      hold = false; arrived();
      await new Promise(resolve => { release = resolve; });
    }
    return response;
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await requestSync(page);
  remote.payload.trainingSessions.push({ id:'private-new', date:'2026-08-02', type:'free', exercises:[] }); remote.revision++;
  hold = true;
  await page.evaluate(() => { window.pendingRaceSync = window.LogbookCloudSync.sync(); });
  await waiting;
  await page.locator('#open-menu').click();
  await page.locator('#account-open').click();
  await page.locator('#account-signout').click();
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');
  release();
  expect(await page.evaluate(() => window.pendingRaceSync)).toBe(false);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trainingSessions'))).toBe(null);
  expect(await page.evaluate(() => window.LogbookSessionMachine.state)).toBe('unknown');
});

test('background cloud updates keep the page and authenticated session open', async ({ page }) => {
  let remote = {
    user_id:session.user.id, revision:1, updated_at:'2026-09-01T08:00:00Z',
    payload:{ trainingRoutines:[{
      id:'shared', name:'Shared plan', isActive:true, isPlaceholder:false,
      cycleLength:7, cycleAnchorDate:'2026-09-01', plan:[],
    }], trainingSessions:[], logbookLanguage:'el' },
  };
  await installSharedCloud(page, async ({ operation, values, filters }) => {
    if (operation === 'select') return { data:clone(remote), error:null };
    if (operation === 'insert') return { data:null, error:{ code:'23505' } };
    if (Number(filters.revision) !== remote.revision) return { data:null, error:null };
    remote = { ...remote, revision:remote.revision + 1, payload:clone(values.payload) };
    return { data:clone(remote), error:null };
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.evaluate(() => {
    window.__cloudRefreshProbe = { gateReopened:false };
    new MutationObserver(() => {
      if (!document.body.classList.contains('app-ready')) window.__cloudRefreshProbe.gateReopened = true;
    }).observe(document.body, { attributes:true, attributeFilter:['class'] });
  });
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations += 1; });
  for (const count of [1, 2]) {
    remote = { ...remote, revision:remote.revision + 1, payload:{ ...remote.payload,
      trainingSessions:Array.from({ length:count }, (_, index) => ({
        id:`remote-${index}`, date:`2026-09-0${index + 1}`, type:'free',
        exercises:[{ exercise:'Squat', sets:[{ reps:8, weight:50 + index * 5, weightMode:'kg' }] }],
      })),
    } };
    await page.evaluate(() => window.LogbookCloudSync.sync());
    await expect(page.locator('#history-session-count')).toHaveText(String(count));
    await expect(page.locator('body')).toHaveClass(/app-ready/);
    expect(await page.evaluate(() => window.__cloudRefreshProbe)).toEqual({ gateReopened:false });
    expect(navigations).toBe(0);
    expect(await page.evaluate(() => window.LogbookSessionMachine.state)).toBe('member');
  }
});

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
  try {
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
    requestSync(firstPage),
    requestSync(secondPage),
  ]);

  await expect.poll(() => remote.payload.trainingSessions.map(item => item.id).sort()).toEqual(['device-a', 'device-b']);
  await Promise.all([
    expect(firstPage.locator('body')).toHaveClass(/app-ready/),
    expect(secondPage.locator('body')).toHaveClass(/app-ready/),
  ]);
  for (const page of [firstPage, secondPage]) {
    await requestSync(page);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trainingSessions')).map(item => item.id).sort()).catch(duringReload))
      .toEqual(['device-a', 'device-b']);
  }
  expect(remote.payload.trainingSessions.map(item => item.id).sort()).toEqual(['device-a', 'device-b']);

  } finally {
  await Promise.all([firstContext.close(), secondContext.close()]);
  }
});
