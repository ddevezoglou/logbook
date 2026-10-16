import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadApp, click } from './helpers.mjs';
import { GUIDE_TEXT, renderGuideScenesForTest } from '../modules/guide-tour.js';

const GREEK = /[Ͱ-Ͽἀ-῿]/u;
const flush = async (times = 3) => { for (let index = 0; index < times; index++) await new Promise(resolve => setTimeout(resolve, 0)); };
const guides = { log:'log-guide', plan:'plan-guide', progress:'progress-guide', profile:'profile-guide' };

test('every ( i ) opens the guided tour instead of the text panel, with the existing guide line as caption', async () => {
  const { document } = loadApp();
  const tour = document.getElementById('guide-tour');
  assert.ok(tour, 'the tour overlay is created at start-up');
  assert.equal(tour.hidden, true);

  for (const [key, panelId] of Object.entries(guides)) {
    const button = document.querySelector(`.info-stamp[data-guide="${key}"]`);
    assert.equal(button.getAttribute('aria-controls'), 'guide-tour');
    click(document, button);
    await flush();

    assert.equal(tour.hidden, false, `${key} tour opens`);
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.ok(document.documentElement.classList.contains('guide-tour-open'), 'page scroll is locked');
    assert.ok(document.getElementById(panelId).classList.contains('hidden'), 'the text panel stays hidden');

    const firstLine = document.querySelector(`#${panelId} li span`).textContent.trim();
    assert.equal(document.querySelector('.gt-coach-text').textContent, firstLine);
    assert.equal(document.querySelector('.gt-coach-title').textContent, GUIDE_TEXT[`${key}.t1`][0]);
    assert.equal(document.querySelectorAll('.gt-coach-steps i').length, 5);
    assert.equal(document.querySelector('.gt-coach-prev').disabled, true);
    assert.ok(document.querySelector('.gt-view .gt-scene'), 'the miniature is rendered');
    assert.equal(document.querySelector('.gt-view').getAttribute('aria-hidden'), 'true');
    assert.equal(document.querySelectorAll('.gt-view input, .gt-view select, .gt-view textarea').length, 0, 'the miniature has no real form fields');

    click(document, '.gt-coach-next');
    await flush();
    assert.equal(document.querySelector('.gt-coach-title').textContent, GUIDE_TEXT[`${key}.t2`][0]);
    assert.equal(document.querySelector('.gt-coach-text').textContent, document.querySelectorAll(`#${panelId} li span`)[1].textContent.trim());
    assert.equal(document.querySelector('.gt-coach-prev').disabled, false);

    tour.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    assert.equal(tour.hidden, true, `${key} tour closes with Escape`);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, button, 'focus returns to the ( i ) button');
    assert.ok(!document.documentElement.classList.contains('guide-tour-open'));
  }
});

test('the last step turns the next button into done, and done closes the tour', async () => {
  const { document } = loadApp();
  click(document, '.info-stamp[data-guide="profile"]');
  await flush();
  for (let step = 1; step < 5; step++) { click(document, '.gt-coach-next'); await flush(); }
  const next = document.querySelector('.gt-coach-next');
  assert.equal(next.textContent, '✓');
  assert.equal(next.getAttribute('aria-label'), 'Τέλος');
  click(document, next);
  assert.equal(document.getElementById('guide-tour').hidden, true);
});

test('the tour runs without touching stored data', async () => {
  const { document, localStorage } = loadApp();
  const before = JSON.stringify({ ...localStorage });
  for (const key of Object.keys(guides)) {
    click(document, `.info-stamp[data-guide="${key}"]`);
    await flush();
    for (let step = 1; step < 5; step++) { click(document, '.gt-coach-next'); await flush(); }
    click(document, '.gt-coach-next');
  }
  assert.equal(JSON.stringify({ ...localStorage }), before);
});

test('coach card and controls follow the interface language', async () => {
  for (const language of ['en', 'fr', 'de']) {
    const { document } = loadApp({ logbookLanguage:language });
    for (const key of Object.keys(guides)) {
      click(document, `.info-stamp[data-guide="${key}"]`);
      await flush();
      const coach = document.querySelector('.gt-coach');
      const labels = [...coach.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' ');
      assert.doesNotMatch(`${coach.textContent} ${labels}`, GREEK, `${language} ${key} coach`);
      assert.doesNotMatch(document.querySelector('.gt-view').textContent, GREEK, `${language} ${key} miniature`);
      document.getElementById('guide-tour').dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    }
  }
});

test('every step of every miniature runs to the end, in all four languages, with no Greek left outside Greek', async () => {
  const locales = { el:'el-GR', en:'en-GB', fr:'fr-FR', de:'de-DE' };
  for (const [language, locale] of Object.entries(locales)) {
    const { window } = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual:true });
    const scenes = await renderGuideScenesForTest({ document:window.document, window, language, locale });
    assert.deepEqual(Object.keys(scenes), ['log', 'plan', 'progress', 'profile']);
    for (const [key, steps] of Object.entries(scenes)) {
      assert.equal(steps.length, 5, `${key} has five steps`);
      for (const step of steps) {
        assert.ok(step.html.includes('gt-scene'), `${key} renders`);
        if (language !== 'el') {
          const text = new window.DOMParser().parseFromString(step.html, 'text/html').body.textContent;
          assert.doesNotMatch(`${step.title} ${text}`, GREEK, `${language} ${key}: ${step.title}`);
        }
      }
    }
  }
});

test('the tour text table is complete in all four languages', () => {
  for (const [key, values] of Object.entries(GUIDE_TEXT)) {
    assert.equal(values.length, 4, key);
    values.forEach((value, index) => assert.ok(value.trim(), `${key}[${index}]`));
    values.slice(1).forEach(value => assert.doesNotMatch(value, GREEK, key));
  }
});
