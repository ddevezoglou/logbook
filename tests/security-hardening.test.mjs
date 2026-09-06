import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const privacy = read('privacy.html');
const migration = read('supabase/migrations/202607250001_security_hardening.sql');

test('the application CSP restricts executable resources and permits data URL avatars', () => {
  const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';

  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /connect-src 'self' https:\/\/hixnqtjsjcndeatxhpgd\.supabase\.co/);
  assert.match(policy, /img-src 'self' data:/);
  assert.match(policy, /style-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /form-action 'self'/);
  assert.doesNotMatch(policy, /style-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(html, /\sstyle=/, 'CSP-safe markup must not rely on inline styles');
});

test('security migration bounds cloud payloads and removes dormant Data API grants', () => {
  assert.match(migration, /\(payload -> 'userProfile'\) - 'imageGallery'/);
  assert.match(migration, /constraint user_sync_state_payload_size_check/i);
  assert.match(migration, /pg_column_size\(payload\) < 2 \* 1024 \* 1024/i);
  assert.match(migration, /not valid/i);
  for (const table of ['profiles', 'routines', 'sessions']) {
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from authenticated`, 'i'));
  }
});

test('published privacy policy documents private 30-day recovery snapshots', () => {
  assert.match(html, /href="privacy\.html"/);
  assert.match(privacy, /user_sync_snapshots/);
  assert.match(privacy, /30 ημέρες/);
  assert.match(privacy, /Δεν είναι προσβάσιμο από τον browser client/);
  assert.match(privacy, /error events διατηρούνται έως 30 ημέρες/);
});

test('the privacy policy describes the exercise library, guest mode and the sign-out recovery copy', () => {
  assert.match(privacy, /βιβλιοθήκη ασκήσεών σου/, 'the exercise entity of 0.3.0 is named');
  assert.match(privacy, /λειτουργία επισκέπτη/, 'guest mode has its own section');
  assert.match(privacy, /δεν αποστέλλεται κανένα δεδομένο προπόνησης σε διακομιστή/);
  assert.match(privacy, /αντίγραφο επαναφοράς γράφεται στο localStorage/, 'sign-out leaves a recovery copy behind');
  assert.match(privacy, /δεν έχει προθεσμία λήξης/, 'and that copy is documented as having no expiry');
  assert.match(privacy, /Δεν περιλαμβάνει τα προγράμματα, τη βιβλιοθήκη ασκήσεων ή το προφίλ/, 'the CSV export states what it leaves out');
});

test('the privacy policy is published in all four languages and links them to each other', () => {
  const pages = { el:'privacy.html', en:'privacy.en.html', fr:'privacy.fr.html', de:'privacy.de.html' };
  const guestHeadings = {
    el:/<h2>5\. Χρήση χωρίς λογαριασμό \(λειτουργία επισκέπτη\)<\/h2>/,
    en:/<h2>5\. Using Logbook without an account \(guest mode\)<\/h2>/,
    fr:/<h2>5\. Utilisation sans compte \(mode invité\)<\/h2>/,
    de:/<h2>5\. Nutzung ohne Konto \(Gastmodus\)<\/h2>/,
  };

  Object.entries(pages).forEach(([language, path]) => {
    const page = read(path);
    assert.match(page, new RegExp(`<html lang="${language}">`), `${path} declares its language`);
    assert.match(page, guestHeadings[language], `${path} carries the guest mode section`);
    assert.equal((page.match(/<section>/g) || []).length, 9, `${path} has the nine documented sections`);
    assert.match(page, /user_sync_snapshots/, `${path} keeps the retention detail`);
    assert.doesNotMatch(page, /\sstyle=/, `${path} stays CSP-safe`);
    Object.entries(pages).forEach(([target, targetPath]) => {
      const escaped = targetPath.replace(/\./g, '\\.');
      assert.match(page, new RegExp(`hreflang="${target}" href="${escaped}"`), `${path} declares the ${target} alternate`);
      if (target !== language) assert.match(page, new RegExp(`<a lang="${target}" hreflang="${target}" href="${escaped}">`), `${path} offers the ${target} page to the reader`);
    });
  });

  const i18n = read('i18n.js');
  assert.match(i18n, /const privacyPages = \{ el:'privacy\.html', en:'privacy\.en\.html', fr:'privacy\.fr\.html', de:'privacy\.de\.html' \}/);
  assert.match(i18n, /\.side-menu-privacy'\)\.forEach\(link => link\.setAttribute\('href', privacyPages\[language\]\)\)/);
});
