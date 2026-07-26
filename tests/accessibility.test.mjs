import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const document = new JSDOM(html).window.document;
const applicationStyles = ['base.css', 'components.css', 'dialogs.css', 'views.css'];
const css = applicationStyles.map(read).join('\n');

test('the guest reminder is an atomic polite live region without modal semantics', () => {
  const reminder = document.querySelector('#guest-reminder');
  const title = document.querySelector('#guest-reminder-title');

  assert.equal(reminder.getAttribute('role'), 'region');
  assert.equal(reminder.getAttribute('aria-labelledby'), title.id);
  assert.equal(reminder.getAttribute('aria-live'), 'polite');
  assert.equal(reminder.getAttribute('aria-atomic'), 'true');
  assert.equal(reminder.hasAttribute('aria-modal'), false);
  assert.equal(reminder.querySelectorAll('button').length, 2);
});

test('the stylesheet split preserves its explicit cascade order', () => {
  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => link.getAttribute('href'));

  assert.deepEqual(stylesheets, [
    'fonts.css',
    'tokens.css',
    'base.css',
    'components.css',
    'dialogs.css',
    'views.css',
  ]);
  assert.doesNotMatch(read('components.css'), /\.account-menu-card\b/);
  assert.match(read('dialogs.css'), /\.account-menu-card\b/);
  assert.match(read('dialogs.css'), /\.account-dialog\b/);
});

test('responsive layout uses only the three system breakpoints and the 380px content exception', () => {
  const mediaWidths = [...css.matchAll(/@media[^\{\n]*max-width\s*:\s*(\d+)px/g)]
    .map(match => Number(match[1]));

  assert.deepEqual([...new Set(mediaWidths)].sort((a, b) => a - b), [380, 600, 850, 1000]);
  assert.equal(mediaWidths.includes(520), false);
  assert.match(read('dialogs.css'), /\.guest-reminder-actions\s*\{[^}]*flex-wrap\s*:\s*wrap/s);
});

test('the manual assistive-technology walkthrough covers every critical flow', () => {
  const walkthrough = read('docs/accessibility-walkthrough.md');

  for (const contract of [
    'Keyboard-only',
    'Screen reader',
    'Authentication gate',
    'Guest reminder',
    'Workout logging',
    'History dialog',
    'Account and destructive confirmation',
    'axe',
  ]) {
    assert.ok(walkthrough.includes(contract), 'missing walkthrough contract: ' + contract);
  }
});
