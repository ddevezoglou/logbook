import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, click } from './helpers.mjs';

test('history pagination translates dynamic counts through language changes and new pages', () => {
  const trainingSessions = Array.from({ length:65 }, (_, index) => ({
    id:`history-${index}`, date:'2026-09-01', type:'free', comments:'', exercises:[],
  }));
  const { window, document } = loadApp({ trainingSessions });
  const labels = {
    el:['ΕΜΦΑΝΙΣΗ ΑΚΟΜΗ', 'ΑΠΟΜΕΝΟΥΝ'],
    en:['SHOW NEXT', 'REMAINING'],
    fr:['AFFICHER LA SUITE :', 'RESTANTES :'],
    de:['WEITERE ANZEIGEN:', 'VERBLEIBEND:'],
  };
  const check = (language, count, remaining) => {
    const [more, rest] = labels[language];
    assert.equal(document.querySelector('[data-load-more-history]').textContent,
      `${more} ${count} · ${rest} ${remaining}`);
  };
  for (const language of ['en', 'fr', 'de', 'el', 'en']) {
    window.LogbookI18n.setLanguage(language);
    check(language, 30, 35);
  }
  click(document, '[data-load-more-history]');
  window.LogbookI18n.translate(document);
  check('en', 5, 5);
  window.LogbookI18n.setLanguage('de');
  check('de', 5, 5);
  click(document, '[data-load-more-history]');
  assert.equal(document.querySelectorAll('.session-card').length, 65);
  assert.equal(document.querySelector('[data-load-more-history]'), null);
});

test('privacy menu follows stored and changed language, and all four guides translate completely', () => {
  for (const language of ['el', 'en', 'fr', 'de']) {
    const { window, document } = loadApp({ logbookLanguage:language });
    const checkLink = lang => assert.equal(document.querySelector('.side-menu-privacy').getAttribute('href'),
      lang === 'el' ? 'privacy.html' : `privacy.${lang}.html`);
    checkLink(language);
    assert.deepEqual([...document.querySelectorAll('.info-panel')].map(panel => panel.id),
      ['log-guide', 'plan-guide', 'progress-guide', 'profile-guide']);
    for (const next of ['en', 'fr', 'de', 'el']) {
      window.LogbookI18n.setLanguage(next);
      checkLink(next);
      for (const panel of document.querySelectorAll('.info-panel')) {
        assert.equal(panel.querySelectorAll('li').length, 5);
        if (next !== 'el') assert.doesNotMatch(panel.textContent, /[\u0370-\u03ff\u1f00-\u1fff]/u);
      }
    }
  }
});
