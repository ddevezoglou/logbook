import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualConsole } from 'jsdom';
import { loadApp, click } from './helpers.mjs';

// The cloud-data-applied handler must only reload on a clean screen; with
// unsaved work it defers until the next navigation with nothing at risk.
// jsdom's location.reload is unpatchable (non-writable own property), but every
// call surfaces as a "Not implemented: navigation" jsdomError — count those.

function loadAppWithReloadSpy(seed = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  const reloads = { count: 0 };
  virtualConsole.on('jsdomError', error => {
    if (String(error.message).includes('navigation')) reloads.count += 1;
  });
  return { ...loadApp(seed, { virtualConsole }), reloads };
}

test('cloud data applied on a clean screen reloads immediately', () => {
  const { window, reloads } = loadAppWithReloadSpy();

  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));

  assert.equal(reloads.count, 1);
});

test('cloud data applied with unsaved work defers the reload and informs the user', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();

  document.querySelector('#session-comments').value = 'Μισογραμμένη προπόνηση';
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));

  assert.equal(reloads.count, 0);
  const toast = document.querySelector('#toast');
  assert.ok(toast.classList.contains('show'));
  assert.equal(toast.textContent, 'Ήρθαν αλλαγές από άλλη συσκευή. Θα εφαρμοστούν μόλις αποθηκεύσετε.');

  // Once the field is cleared, the deferred reload fires on the next navigation.
  document.querySelector('#session-comments').value = '';
  click(document, '.nav-button[data-view="plan"]');
  assert.equal(reloads.count, 1);
});

test('a routine draft in the plan form also blocks the cloud reload', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();

  document.querySelector('#workout-name').value = 'Push A';
  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(reloads.count, 0);
});

test('a dirty profile form blocks the cloud reload until it is saved', () => {
  const { window, document, reloads } = loadAppWithReloadSpy();

  const nameInput = document.querySelector('#profile-name');
  nameInput.value = 'Δημήτρης';
  nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#profile-form').dataset.dirty, 'true');

  window.dispatchEvent(new window.CustomEvent('logbook:cloud-data-applied'));
  assert.equal(reloads.count, 0);
});
