import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { goToView, installAuthenticatedStub, openMenu, VIEWS } from './fixtures/authenticated-app.mjs';

test('the darkmode switch lives under the language row and turns the page over', async ({ page }) => {
  await installAuthenticatedStub(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);

  // Προεπιλογή: κλειστό.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');

  await openMenu(page);
  const picker = page.locator('#side-menu .theme-picker');
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-theme-choice="day"]')).toHaveAttribute('aria-pressed', 'true');

  // Ο διακόπτης κάθεται αμέσως κάτω από τη γλώσσα, όχι κάπου αλλού στο μενού.
  const order = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#side-menu .language-picker')];
    return rows.map(row => row.querySelector('span').textContent.trim());
  });
  expect(order).toEqual(['ΓΛΩΣΣΑ', 'ΣΚΟΤΕΙΝΗ ΛΕΙΤΟΥΡΓΙΑ']);

  await picker.locator('[data-theme-choice="night"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(picker.locator('[data-theme-choice="night"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#17140e');
});

test('the night survives a reload without a white flash', async ({ page }) => {
  await installAuthenticatedStub(page, { theme:'night' });

  // Δειγματοληψία του χρώματος της σελίδας από το πρώτο δυνατό σημείο: αν το theme
  // εφαρμοζόταν μετά το paint, εδώ θα βλέπαμε ακόμη το χαρτί της ημέρας.
  await page.goto('/');
  const earliest = await page.evaluate(() => ({
    attr:document.documentElement.dataset.theme,
    paper:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
  }));
  expect(earliest.attr).toBe('night');
  expect(earliest.paper).toBe('#17140e');

  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
});

test('neither page has serious or critical accessibility debt left', async ({ page }) => {
  // Δύο πλήρη boot και εικοσιτέσσερα περάσματα του axe δεν χωρούν στο προεπιλεγμένο όριο.
  test.setTimeout(240_000);

  // Η μέρα και η νύχτα έχουν το ίδιο απόλυτο όριο: κανένα serious/critical εύρημα
  // σε κανένα view, ούτε από χρώμα ούτε από markup.
  async function violationsFor(theme) {
    await installAuthenticatedStub(page, { theme });
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/app-ready/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    // Κάθε view ξεκινά με fade-in. Μετρημένο στη μέση του, το axe βλέπει ημιδιάφανο
    // κείμενο και αναφέρει αντίθεση που δεν υπάρχει στην τελική κατάσταση.
    await page.addStyleTag({ url:'/e2e/fixtures/no-animations.css' });

    const found = new Set();
    // Το κινητό και η οθόνη δεν βάφουν τα ίδια πράγματα: το `.mode-button` παίρνει
    // --muted-strong μόνο κάτω από τα 700px, οπότε το χρέος του φαινόταν μόνο σε πλάτος.
    for (const [label, size] of [['mobile', { width:390, height:844 }], ['desktop', { width:1366, height:900 }]]) {
      await page.setViewportSize(size);
      for (const view of VIEWS) {
        await goToView(page, view);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        for (const violation of results.violations) {
          if (!['serious', 'critical'].includes(violation.impact)) continue;
          for (const node of violation.nodes) {
            found.add(`${label}/${view} · ${violation.id} · ${node.target.join(' ')}`);
          }
        }
      }
    }

    await page.goto('/privacy.html');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('main')).toBeVisible();
    const privacyResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    for (const violation of privacyResults.violations) {
      if (!['serious', 'critical'].includes(violation.impact)) continue;
      for (const node of violation.nodes) {
        found.add(`privacy · ${violation.id} · ${node.target.join(' ')}`);
      }
    }
    return [...found];
  }

  const day = await violationsFor('day');
  expect(day, `serious/critical ευρήματα στη μέρα:\n${day.join('\n')}`).toEqual([]);

  const night = await violationsFor('night');
  expect(night, `serious/critical ευρήματα στη νύχτα:\n${night.join('\n')}`).toEqual([]);
});

test('the day is still the day for anyone who never touches the switch', async ({ page }) => {
  await installAuthenticatedStub(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);

  const day = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      paper:style.getPropertyValue('--paper').trim(),
      ink:style.getPropertyValue('--ink').trim(),
      scheme:style.colorScheme,
    };
  });
  expect(day).toEqual({ paper:'#efe8d8', ink:'#15130d', scheme:'light' });
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#15130d');
});
