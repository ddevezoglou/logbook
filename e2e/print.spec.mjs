import { expect, test } from '@playwright/test';
import { goToView, installAuthenticatedStub } from './fixtures/authenticated-app.mjs';

// Ένα print stylesheet δεν φαίνεται πουθενά μέχρι να το ζητήσει κάποιος, οπότε είναι
// ακριβώς το είδος του CSS που σαπίζει αθόρυβα. Ό,τι υπόσχεται το σχόλιο στο
// styles.css μετριέται εδώ με emulateMedia, στην πραγματική σελίδα.

async function bootWithHistory(page, { theme } = {}) {
  await installAuthenticatedStub(page, { theme });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/);
  await page.addStyleTag({ content:'*,*::before,*::after{animation:none !important;transition:none !important;}' });
}

async function openFirstWorkoutPage(page) {
  await goToView(page, 'overview');
  await page.locator('.session-summary[data-view-session]').first().click();
  await expect(page.locator('#session-detail-dialog')).toHaveAttribute('open', '');
  await expect(page.locator('#session-detail-dialog .session-page')).toBeVisible();
}

test('the workout page prints as paper, without the room around it', async ({ page }) => {
  await bootWithHistory(page);
  await openFirstWorkoutPage(page);

  await page.emulateMedia({ media:'print' });

  // Κανόνας 1: το χαρτί γίνεται πραγματικό χαρτί και το μελάνι μαύρο.
  const paper = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      paper:style.getPropertyValue('--paper').trim(),
      ink:style.getPropertyValue('--ink').trim(),
      inkSurface:style.getPropertyValue('--ink-surface').trim(),
      onInk:style.getPropertyValue('--on-ink').trim(),
    };
  });
  // Η μελανί επιφάνεια αντιστρέφεται: αλλιώς κάθε κεφαλίδα βγαίνει μαύρο πλακάτο.
  expect(paper).toEqual({ paper:'#fff', ink:'#000', inkSurface:'#fff', onInk:'#000' });

  // Κανόνας 2: φεύγει το δωμάτιο.
  for (const chrome of ['.menu-ribbon', '#side-menu', '#menu-backdrop', '#toast', '#session-detail-close']) {
    await expect(page.locator(chrome), `${chrome} τυπώνεται ενώ δεν πατιέται`).toBeHidden();
  }

  // ...αλλά μένει η σελίδα, με το περιεχόμενό της ολόκληρο.
  const sheet = page.locator('#session-detail-dialog .session-page');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.page-exercise-title').first()).toBeVisible();
  await expect(sheet.locator('.page-set-row').first()).toBeVisible();

  // Μία προπόνηση ανά φύλλο — αλλά η τελευταία δεν σπάει, αλλιώς κάθε εκτύπωση
  // τελειώνει με ένα λευκό φύλλο.
  await expect(sheet).toHaveCSS('break-after', 'auto');
  await page.locator('#session-detail-content').evaluate(container => {
    container.append(container.firstElementChild.cloneNode(true));
  });
  const sheets = page.locator('#session-detail-dialog .session-page');
  await expect(sheets).toHaveCount(2);
  await expect(sheets.first()).toHaveCSS('break-after', 'page');
  await expect(sheets.last()).toHaveCSS('break-after', 'auto');

  // Κανόνας 3: η σελίδα από πίσω δεν τυπώνεται μαζί.
  await expect(page.locator('main')).toBeHidden();
});

test('the night prints on white paper like everybody else', async ({ page }) => {
  await bootWithHistory(page, { theme:'night' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await openFirstWorkoutPage(page);

  await page.emulateMedia({ media:'print' });

  // Η νύχτα είναι λιγότερο φως στο δωμάτιο, όχι μαύρο μελάνι στο χαρτί: ένας χρήστης
  // με ανοιχτό dark mode δεν πρέπει να στείλει μια μαύρη σελίδα στον εκτυπωτή.
  const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  expect(paper).toBe('#fff');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('the plan prints whole, with no day cut in half', async ({ page }) => {
  await bootWithHistory(page);
  await goToView(page, 'plan');

  await page.locator('.routine-card [data-view-routine]').first().click();
  await expect(page.locator('#plan-overview-dialog')).toHaveAttribute('open', '');

  await page.emulateMedia({ media:'print' });

  const day = page.locator('#plan-list .day-card').first();
  await expect(day).toBeVisible();
  await expect(day).toHaveCSS('break-inside', 'avoid');
  // Οι ανενεργές ημέρες είναι ξεθωριασμένες στην οθόνη γιατί υπάρχει ενεργή· σε
  // χαρτί το ξεθώριασμα δεν λέει τίποτα, απλώς δυσκολεύει το διάβασμα.
  await expect(day).toHaveCSS('opacity', '1');
  await expect(page.locator('#plan-overview-dialog .plan-dialog-close')).toBeHidden();
  await expect(page.locator('main')).toBeHidden();
});
