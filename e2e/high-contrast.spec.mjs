import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { goToView, installAuthenticatedStub, VIEWS } from './fixtures/authenticated-app.mjs';

// Το `prefers-contrast: more` δεν είναι διακόπτης της εφαρμογής αλλά δήλωση του
// λειτουργικού. Το ζητούμενο δεν είναι να «φαίνεται πιο έντονο» — είναι να περνά το
// AAA (7:1), γιατί αυτός είναι ο λόγος που ο χρήστης το άναψε. Ό,τι δεν μετριέται
// εδώ, θα ξαναγίνει γκρι στην επόμενη αλλαγή.
for (const theme of ['day', 'night']) {
  test(`the ${theme} page answers prefers-contrast: more with AAA text`, async ({ page }) => {
    test.setTimeout(180_000);

    await page.emulateMedia({ contrast:'more' });
    await installAuthenticatedStub(page, { theme });
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/app-ready/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.addStyleTag({ url:'/e2e/fixtures/no-animations.css' });

    const failures = [];
    for (const [label, size] of [['mobile', { width:390, height:844 }], ['desktop', { width:1366, height:900 }]]) {
      await page.setViewportSize(size);
      for (const view of VIEWS) {
        await goToView(page, view);

        const results = await new AxeBuilder({ page })
          .withRules(['color-contrast-enhanced'])
          .analyze();
        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            const measured = [...node.any, ...node.all].map(check => check.data).find(Boolean) ?? {};
            failures.push(`${label}/${view} · ${node.target.join(' ')} · ${measured.fgColor} σε ${measured.bgColor} = ${measured.contrastRatio}:1`);
          }
        }
      }
    }

    await page.goto('/privacy.html');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('main')).toBeVisible();
    const privacyResults = await new AxeBuilder({ page })
      .withRules(['color-contrast-enhanced'])
      .analyze();
    for (const violation of privacyResults.violations) {
      for (const node of violation.nodes) {
        const measured = [...node.any, ...node.all].map(check => check.data).find(Boolean) ?? {};
        failures.push(`privacy · ${node.target.join(' ')} · ${measured.fgColor} σε ${measured.bgColor} = ${measured.contrastRatio}:1`);
      }
    }

    expect(failures, `το ${theme} δεν φτάνει το AAA με αυξημένη αντίθεση:\n${failures.join('\n')}`).toEqual([]);
  });
}

test('increased contrast is a token override, not a second identity', async ({ page }) => {
  await installAuthenticatedStub(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);

  const surfaces = () => page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      paper:style.getPropertyValue('--paper').trim(),
      inkSurface:style.getPropertyValue('--ink-surface').trim(),
      muted:style.getPropertyValue('--muted').trim(),
    };
  });

  const normal = await surfaces();
  await page.emulateMedia({ contrast:'more' });
  const raised = await surfaces();

  // Κανόνας 1: οι επιφάνειες δεν κουνιούνται...
  expect(raised.paper).toBe(normal.paper);
  expect(raised.inkSurface).toBe(normal.inkSurface);
  // ...κανόνας 2: ό,τι γράφεται πάνω τους, κουνιέται.
  expect(raised.muted).not.toBe(normal.muted);
});
