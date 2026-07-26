import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/202607260001_validate_user_sync_payload_size.sql', import.meta.url),
  'utf8',
);

test('payload size validation checks legacy rows before validating the constraint', () => {
  assert.match(migration, /if exists[\s\S]*from public\.user_sync_state[\s\S]*pg_column_size\(payload\) >= 2 \* 1024 \* 1024/i);
  assert.match(migration, /raise exception 'user_sync_state contains payloads at or above the 2 MiB limit'/i);
  assert.match(migration, /alter table public\.user_sync_state\s+validate constraint user_sync_state_payload_size_check/i);
});
