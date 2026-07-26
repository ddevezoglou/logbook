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
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /form-action 'self'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
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
