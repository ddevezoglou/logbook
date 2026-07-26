import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const themeSource = readFileSync(new URL('theme.js', root), 'utf8');

// Στήνει τη σελίδα και τρέχει το theme.js πάνω της, όπως το κάνει ο browser στο <head>.
function boot({ stored, brokenStorage = false } = {}) {
  const dom = new JSDOM(html, { url:'http://localhost/', runScripts:'outside-only' });
  const { window } = dom;
  if (brokenStorage) {
    // Private mode: το localStorage υπάρχει αλλά πετάει σε κάθε πρόσβαση.
    Object.defineProperty(window, 'localStorage', {
      configurable:true,
      get() { throw new Error('access denied'); },
    });
  } else if (stored !== undefined) {
    window.localStorage.setItem('logbookTheme', stored);
  }
  window.eval(themeSource);
  return dom;
}

const themeOf = dom => dom.window.document.documentElement.dataset.theme;
const chromeOf = dom => dom.window.document.querySelector('meta[name="theme-color"]').getAttribute('content');
const pressed = dom => Object.fromEntries(
  [...dom.window.document.querySelectorAll('[data-theme-choice]')]
    .map(button => [button.dataset.themeChoice, button.getAttribute('aria-pressed')]),
);

test('darkmode is off until somebody turns it on', () => {
  const dom = boot();
  assert.equal(themeOf(dom), 'day');
  assert.deepEqual(pressed(dom), { night:'false', day:'true' });
});

test('a stored choice is already applied by the time the page renders', () => {
  const dom = boot({ stored:'night' });
  assert.equal(themeOf(dom), 'night');
  assert.deepEqual(pressed(dom), { night:'true', day:'false' });
});

test('a damaged stored value falls back to day instead of breaking the boot', () => {
  const dom = boot({ stored:'{"theme":"night"}' });
  assert.equal(themeOf(dom), 'day');
});

test('the switch flips the page, persists, and announces itself', () => {
  const dom = boot();
  const { window } = dom;
  const events = [];
  window.document.addEventListener('logbook:themechange', event => events.push(event.detail.theme));

  window.document.querySelector('[data-theme-choice="night"]').click();

  assert.equal(themeOf(dom), 'night');
  assert.equal(window.localStorage.getItem('logbookTheme'), 'night');
  assert.deepEqual(pressed(dom), { night:'true', day:'false' });
  assert.deepEqual(events, ['night']);

  window.document.querySelector('[data-theme-choice="day"]').click();
  assert.equal(themeOf(dom), 'day');
  assert.equal(window.localStorage.getItem('logbookTheme'), 'day');
  assert.deepEqual(events, ['night', 'day']);
});

test('the browser chrome follows the page instead of staying on the day colour', () => {
  const dom = boot();
  assert.equal(chromeOf(dom), '#15130d');
  dom.window.document.querySelector('[data-theme-choice="night"]').click();
  assert.equal(chromeOf(dom), '#17140e');
});

test('a blocked localStorage costs the memory, not the feature', () => {
  const dom = boot({ brokenStorage:true });
  assert.equal(themeOf(dom), 'day');
  dom.window.document.querySelector('[data-theme-choice="night"]').click();
  assert.equal(themeOf(dom), 'night', 'the switch must still work without persistence');
});

test('the switch sits in the menu, directly under the language picker', () => {
  const dom = boot();
  // Το auth gate έχει δικό του language picker, οπότε ψάχνουμε ρητά μέσα στο μενού.
  const menu = dom.window.document.getElementById('side-menu');
  const language = menu.querySelector('.language-picker:not(.theme-picker)');
  const theme = menu.querySelector('.theme-picker');

  assert.ok(theme, 'the darkmode picker is missing from the menu');
  assert.equal(language.nextElementSibling, theme, 'darkmode must follow the language row');
  assert.equal(theme.closest('.side-menu')?.id, 'side-menu');
  assert.equal(theme.querySelector('span').textContent, 'ΣΚΟΤΕΙΝΗ ΛΕΙΤΟΥΡΓΙΑ');
  assert.deepEqual(
    [...theme.querySelectorAll('button')].map(button => button.textContent),
    ['ON', 'OFF'],
  );
  assert.equal(theme.getAttribute('role'), 'group');
});

test('the theme is applied before the first paint, so the night never flashes white', () => {
  // Ένα defer/async script θα έτρεχε μετά το πρώτο paint. Το theme.js πρέπει να
  // είναι σύγχρονο και μέσα στο <head>, πριν κλείσει.
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /<script src="theme\.js"><\/script>/);
  assert.doesNotMatch(head, /<script[^>]*theme\.js[^>]*(defer|async)/);
});

test('theme.js ships with the app shell and the release', () => {
  const serviceWorker = readFileSync(new URL('service-worker.js', root), 'utf8');
  const pages = readFileSync(new URL('.github/workflows/pages.yml', root), 'utf8');
  const builder = readFileSync(new URL('scripts/build-production.mjs', root), 'utf8');
  assert.ok(serviceWorker.includes("'./theme.js'"), 'theme.js must be cached offline');
  assert.match(pages, /npm run build:production/, 'Pages must use the production builder');
  assert.match(builder, /'theme\.js'/, 'theme.js must be copied into the published site');
});
