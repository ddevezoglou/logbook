import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as StorageMigrations from '../modules/storage-migrations.js';
import * as RoutineModel from '../modules/routines.js';
import * as SessionModel from '../modules/sessions.js';
import * as ProgressRewards from '../modules/progress-rewards.js';
import * as UI from '../modules/ui.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const quotesSource = readFileSync(join(root, 'quotes.js'), 'utf8');
const i18nSource = readFileSync(join(root, 'i18n.js'), 'utf8');
const appSource = readFileSync(join(root, 'app.js'), 'utf8');
const executableAppSource = appSource.replace(
  /^import \* as (\w+) from '[^']+';$/gm,
  'const $1 = window.__LogbookModules.$1;'
);

// Loads the app inside a fresh jsdom window. `seed` pre-populates localStorage
// (values are JSON-stringified). Returns { window, document, localStorage }.
export function loadApp(seed = {}, options = {}) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    ...(options.virtualConsole ? { virtualConsole: options.virtualConsole } : {}),
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.HTMLElement.prototype.scrollIntoView = function () {}; // not implemented in jsdom
  for (const [key, value] of Object.entries(seed)) {
    window.localStorage.setItem(key, key === 'logbookLanguage' ? value : JSON.stringify(value));
  }
  options.beforeApp?.(window);
  window.eval(quotesSource);
  window.eval(i18nSource);
  window.__LogbookModules = { StorageMigrations, RoutineModel, SessionModel, ProgressRewards, UI };
  window.eval(executableAppSource);
  return { window, document: window.document, localStorage: window.localStorage };
}

export function click(document, target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  el.dispatchEvent(new el.ownerDocument.defaultView.Event('click', { bubbles: true }));
  return el;
}

export function setValue(document, selector, value, eventType = 'change') {
  const el = document.querySelector(selector);
  el.value = value;
  el.dispatchEvent(new el.ownerDocument.defaultView.Event(eventType, { bubbles: true }));
  return el;
}
