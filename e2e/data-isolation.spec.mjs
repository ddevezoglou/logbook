import { test, expect } from '@playwright/test';

const USERS = {
  a:{ id:'user-a', email:'first@example.com' },
  b:{ id:'user-b', email:'second@example.com' },
};

async function installIsolationStub(page) {
  await page.addInitScript(({ users }) => {
    const sessionFor = user => ({
      access_token:`token-${user.id}`,
      refresh_token:`refresh-${user.id}`,
      expires_at:4_102_444_800,
      user,
    });
    const readRows = () => JSON.parse(localStorage.getItem('e2eIsolationRows') || '{}');
    const writeRows = rows => localStorage.setItem('e2eIsolationRows', JSON.stringify(rows));

    if (!localStorage.getItem('e2eIsolationSeeded')) {
      const payloadA = {
        trainingRoutines:[],
        trainingSessions:[{ id:'private-a', date:'2026-07-20', type:'free', comments:'', exercises:[] }],
        userProfile:{ name:'First athlete' },
        logbookLanguage:'el',
      };
      const payloadB = {
        trainingRoutines:[],
        trainingSessions:[{ id:'private-b', date:'2026-07-21', type:'free', comments:'', exercises:[] }],
        userProfile:{ name:'Second athlete' },
        logbookLanguage:'el',
      };
      localStorage.setItem('e2eIsolationSeeded', '1');
      localStorage.setItem('e2eIsolationSession', JSON.stringify(sessionFor(users.a)));
      localStorage.setItem('trainingRoutines', '[]');
      localStorage.setItem('trainingSessions', JSON.stringify(payloadA.trainingSessions));
      localStorage.setItem('userProfile', JSON.stringify(payloadA.userProfile));
      writeRows({
        [users.a.id]:{ user_id:users.a.id, revision:1, payload:payloadA, updated_at:new Date().toISOString() },
        [users.b.id]:{ user_id:users.b.id, revision:1, payload:payloadB, updated_at:new Date().toISOString() },
      });
    }

    const listeners = [];
    const currentSession = () => JSON.parse(localStorage.getItem('e2eIsolationSession') || 'null');
    const setSession = (event, session) => {
      if (session) localStorage.setItem('e2eIsolationSession', JSON.stringify(session));
      else localStorage.removeItem('e2eIsolationSession');
      listeners.forEach(listener => listener(event, session));
    };

    window.supabase = {
      createClient() {
        return {
          auth:{
            async getSession() { return { data:{ session:currentSession() }, error:null }; },
            onAuthStateChange(callback) {
              listeners.push(callback);
              return { data:{ subscription:{ unsubscribe() {} } } };
            },
            async signInWithPassword({ email }) {
              const user = email === users.b.email ? users.b : users.a;
              const session = sessionFor(user);
              setSession('SIGNED_IN', session);
              return { data:{ session }, error:null };
            },
            async signOut() {
              setSession('SIGNED_OUT', null);
              return { error:null };
            },
          },
          from(table) {
            if (table !== 'user_sync_state') throw new Error(`Unexpected table: ${table}`);
            let operation = 'select';
            let values = null;
            const filters = {};
            const chain = {
              select() { return chain; },
              insert(next) { operation = 'insert'; values = next; return chain; },
              update(next) { operation = 'update'; values = next; return chain; },
              eq(column, value) { filters[column] = value; return chain; },
              async maybeSingle() {
                const rows = readRows();
                const existing = rows[filters.user_id] || null;
                if (operation === 'select') return { data:existing, error:null };
                if (!existing || Number(existing.revision) !== Number(filters.revision)) return { data:null, error:null };
                const updated = { ...existing, payload:values.payload, revision:existing.revision + 1, updated_at:new Date().toISOString() };
                rows[filters.user_id] = updated;
                writeRows(rows);
                return { data:updated, error:null };
              },
              async single() {
                const rows = readRows();
                if (rows[values.user_id]) return { data:null, error:{ code:'23505' } };
                const inserted = { user_id:values.user_id, payload:values.payload, revision:1, updated_at:new Date().toISOString() };
                rows[values.user_id] = inserted;
                writeRows(rows);
                return { data:inserted, error:null };
              },
            };
            return chain;
          },
          async rpc() { return { data:true, error:null }; },
        };
      },
    };
  }, { users:USERS });
}

async function signOutFirstUser(page) {
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.locator('#open-menu').click();
  await expect(page.locator('#side-menu')).toHaveClass(/open/);
  await page.locator('#account-open').click();
  await expect(page.locator('#account-dialog')).toHaveAttribute('open', '');
  await page.locator('#account-signout').click();
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');
}

test.beforeEach(async ({ page }) => {
  await installIsolationStub(page);
  await page.goto('/');
});

test('switching from user A to user B never exposes or uploads A workouts', async ({ page }) => {
  await signOutFirstUser(page);

  await page.locator('#account-signin-email').fill(USERS.b.email);
  await page.locator('#account-signin-password').fill('password123');
  await page.locator('#account-signin-form button[type="submit"]').click();
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout:10_000 });

  const state = await page.evaluate(() => ({
    visible:JSON.parse(localStorage.getItem('trainingSessions') || '[]').map(item => item.id),
    owner:localStorage.getItem('logbookCloudOwner'),
    cloudB:JSON.parse(localStorage.getItem('e2eIsolationRows'))['user-b'],
  }));
  expect(state.visible).toEqual(['private-b']);
  expect(state.owner).toBe('user-b');
  expect(state.cloudB.payload.trainingSessions.map(item => item.id)).toEqual(['private-b']);
});

test('entering guest mode after user A signs out starts with no A workouts', async ({ page }) => {
  await signOutFirstUser(page);

  await page.locator('#account-guest-start').click();
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout:10_000 });

  const state = await page.evaluate(() => ({
    visible:JSON.parse(localStorage.getItem('trainingSessions') || '[]').map(item => item.id),
    guest:localStorage.getItem('logbookGuest'),
    owner:localStorage.getItem('logbookCloudOwner'),
  }));
  expect(state.visible).toEqual([]);
  expect(state.guest).toBe('1');
  expect(state.owner).toBe('user-a');
});
