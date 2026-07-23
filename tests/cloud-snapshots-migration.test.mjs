import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/202607230001_user_sync_snapshots.sql', import.meta.url),
  'utf8',
);

test('cloud snapshots are daily, private, and tied to the owning account', () => {
  assert.match(migration, /create table public\.user_sync_snapshots/i);
  assert.match(migration, /references auth\.users \(id\) on delete cascade/i);
  assert.match(migration, /unique \(user_id, captured_on\)/i);
  assert.match(migration, /alter table public\.user_sync_snapshots enable row level security/i);
  assert.match(migration, /revoke all on public\.user_sync_snapshots from anon/i);
  assert.match(migration, /revoke all on public\.user_sync_snapshots from authenticated/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*user_sync_snapshots/i);
});

test('snapshot trigger captures an immutable baseline once per UTC day', () => {
  assert.match(migration, /create or replace function public\.capture_daily_user_sync_snapshot\(\)/i);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /if tg_op = 'INSERT'[\s\S]*new\.revision[\s\S]*new\.payload/i);
  assert.match(migration, /else[\s\S]*old\.revision[\s\S]*old\.payload/i);
  assert.match(migration, /\(now\(\) at time zone 'UTC'\)::date/i);
  assert.match(migration, /on conflict \(user_id, captured_on\) do nothing/i);
  assert.match(migration, /after insert on public\.user_sync_state/i);
  assert.match(migration, /after update of payload on public\.user_sync_state/i);
  assert.match(migration, /when \(old\.payload is distinct from new\.payload\)/i);
});

test('existing users receive a baseline snapshot during migration', () => {
  assert.match(
    migration,
    /insert into public\.user_sync_snapshots[\s\S]*select[\s\S]*user_id,[\s\S]*revision,[\s\S]*payload,[\s\S]*from public\.user_sync_state/i,
  );
});

test('snapshots older than 30 days are pruned by a daily Supabase Cron job', () => {
  assert.match(migration, /create or replace function public\.prune_user_sync_snapshots\(\)/i);
  assert.match(migration, /captured_at < now\(\) - interval '30 days'/i);
  assert.match(migration, /revoke all on function public\.prune_user_sync_snapshots\(\) from public/i);
  assert.match(migration, /create extension if not exists pg_cron/i);
  assert.match(migration, /cron\.schedule\([\s\S]*'logbook-prune-user-sync-snapshots'[\s\S]*'17 3 \* \* \*'/i);
  assert.match(migration, /select public\.prune_user_sync_snapshots\(\)/i);
});
