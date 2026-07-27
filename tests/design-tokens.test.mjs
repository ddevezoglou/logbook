import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = ['tokens.css', 'base.css', 'components.css', 'dialogs.css', 'views.css', 'legal.css']
  .map(file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
  .join('\n');

// Το token layer είναι κάθε block που ορίζει tokens πάνω στο ίδιο το :root — και
// η ημέρα, και κάθε θεματικό override της. Κανόνες σαν το
// `:root[data-theme="night"] .info-stamp` δεν είναι token blocks: έχουν descendant.
const tokenBlocks = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
  .map(match => ({
    // Ο selector είναι ό,τι μένει μετά το τελευταίο σχόλιο ή την τελευταία δήλωση.
    selector:match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().split('\n').pop().trim(),
    body:match[2],
  }))
  .filter(block => /^:root(\[[^\]]*\])?$/.test(block.selector));
const dayBlock = tokenBlocks.find(block => block.selector === ':root');
const nightBlock = tokenBlocks.find(block => block.selector === ':root[data-theme="night"]');

const outsideTokenLayer = tokenBlocks.reduce((rest, block) => rest.replace(block.body, ''), css);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const namesIn = body => [...body.matchAll(/--([\w-]+)\s*:/g)].map(match => match[1]);

test('every colour of the design system is defined once, inside the :root token layer', () => {
  assert.ok(dayBlock, ':root token layer is missing');
  assert.deepEqual(outsideTokenLayer.match(HEX) ?? [], []);
});

test('the token layer stays self-consistent: no duplicate names, no dangling references', () => {
  for (const block of tokenBlocks) {
    const names = namesIn(block.body);
    assert.equal(names.length, new Set(names).size, `duplicate token definition in ${block.selector}`);
  }

  // Tokens the client sets at runtime through element.style, so they are referenced but never declared.
  const runtimeTokens = new Set(['deck-arrow-y', 'routine-list-height']);
  const declared = new Set([...css.matchAll(/--([\w-]+)\s*:/g)].map(match => match[1]));
  const referenced = new Set([...css.matchAll(/var\(--([\w-]+)/g)].map(match => match[1]));

  const dangling = [...referenced].filter(name => !declared.has(name) && !runtimeTokens.has(name));
  assert.deepEqual(dangling, []);
});

test('theming overrides only ever need to touch the token layer', () => {
  const colourTokens = [...dayBlock.body.matchAll(/--([\w-]+)\s*:\s*#[0-9a-fA-F]{3,8}/g)].map(match => match[1]);

  // The paper identity, its dark counterpart and every status colour must be tokenised,
  // otherwise dark mode, prefers-contrast and print cannot be expressed as a token override.
  for (const token of ['ink', 'paper', 'gold', 'orange', 'danger', 'on-accent', 'surface-white']) {
    assert.ok(colourTokens.includes(token), `missing colour token --${token}`);
  }
  assert.ok(colourTokens.length >= 90, `expected a full token layer, found ${colourTokens.length}`);
});

test('the night page is expressed purely as an override of the day token layer', () => {
  assert.ok(nightBlock, 'the night token block is missing');

  const dayNames = new Set(namesIn(dayBlock.body));
  const orphans = namesIn(nightBlock.body).filter(name => !dayNames.has(name));
  assert.deepEqual(orphans, [], 'night defines tokens that day never declares');
});

test('the night page keeps the roles that would otherwise collapse in the dark', () => {
  const nightTokens = Object.fromEntries(
    [...nightBlock.body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]),
  );

  // Ο κανόνας 1: η μελανί επιφάνεια ανοίγει αντί να βαθαίνει, αλλιώς το μενού και
  // τα κουμπιά εξαφανίζονται μέσα στη νυχτερινή σελίδα.
  assert.ok(nightTokens['ink-surface'], 'night must redefine --ink-surface');
  assert.notEqual(nightTokens['ink-surface'], nightTokens.paper, 'the raised surface must not equal the page');

  // Κείμενο πάνω σε accent και πάνω σε μελανί επιφάνεια: αν δεν αντιστραφούν, το
  // λευκό κάθεται πάνω σε ανοιχτή ώχρα και το σκοτεινό πάνω σε γραφίτη.
  assert.ok(nightTokens['on-accent'], 'night must redefine --on-accent');
  assert.ok(nightTokens['on-ink'], 'night must redefine --on-ink');

  // Σκιά και πέπλο δεν ακολουθούν το μελάνι: πάνω σε σκοτεινή σελίδα μόνο το μαύρο
  // δίνει ακόμη βάθος.
  assert.equal(nightTokens['shadow-rgb'], '0,0,0');
  assert.equal(nightTokens['veil-rgb'], '0,0,0');
  assert.notEqual(nightTokens['ink-rgb'], nightTokens['shadow-rgb']);

  // Τα native controls του browser δεν διαβάζουν tokens.
  assert.match(nightBlock.body, /color-scheme\s*:\s*dark/);
  assert.match(dayBlock.body, /color-scheme\s*:\s*light/);
});

test('stamps stop multiplying into the page once the page is dark', () => {
  // Το mix-blend-mode:multiply σβήνει κάθε σφραγίδα πάνω σε σκοτεινό φόντο.
  const multiplied = [...css.matchAll(/([^{}]+)\{[^}]*mix-blend-mode:multiply[^}]*\}/g)]
    .map(match => match[1])
    .filter(selector => !selector.includes('[data-theme="night"]'));
  const neutralised = css.match(/:root\[data-theme="night"\][^{]*\{[^}]*mix-blend-mode:normal[^}]*\}/s)?.[0] ?? '';

  for (const selector of multiplied) {
    const leaf = selector.trim().split(',').pop().trim().split(/\s+/).pop();
    assert.ok(neutralised.includes(leaf), `${leaf} keeps multiplying at night and will disappear`);
  }
});
