import { expect, test } from '@playwright/test';

async function installGuestStub(page) {
  await page.addInitScript(() => {
    window.__logbookCspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__logbookCspViolations.push({
        directive:event.effectiveDirective,
        blockedURI:event.blockedURI,
      });
    });
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

test('CSP produces no violations and allows data URL avatars', async ({ page }) => {
  test.setTimeout(15_000);
  const cspConsoleErrors = [];
  page.on('console', message => {
    if (/content security policy/i.test(message.text())) cspConsoleErrors.push(message.text());
  });
  await installGuestStub(page);
  await page.goto('/');
  await expect(page.locator('#auth-gate')).toHaveAttribute('data-state', 'login');

  const avatarLoaded = await page.evaluate(() => new Promise(resolve => {
    const image = new Image();
    const timeout = setTimeout(() => resolve(false), 1_000);
    image.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve(image.naturalWidth === 1 && image.naturalHeight === 1);
    }, { once:true });
    image.addEventListener('error', () => {
      clearTimeout(timeout);
      resolve(false);
    }, { once:true });
    image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  }));
  await page.waitForTimeout(50);

  expect(avatarLoaded).toBe(true);
  expect(await page.evaluate(() => window.__logbookCspViolations)).toEqual([]);
  expect(cspConsoleErrors).toEqual([]);
});
