import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const deleteMigration = readFileSync(new URL('../supabase/migrations/202607180001_delete_own_account.sql', import.meta.url), 'utf8');
const initialSchema = readFileSync(new URL('../supabase/migrations/202607160001_initial_logbook_schema.sql', import.meta.url), 'utf8');
const syncSchema = readFileSync(new URL('../supabase/migrations/202607170001_user_sync_state.sql', import.meta.url), 'utf8');

test('delete_own_account is restricted to the authenticated user', () => {
  assert.match(deleteMigration, /create or replace function public\.delete_own_account\(\)/i);
  assert.match(deleteMigration, /security definer/i);
  assert.match(deleteMigration, /set search_path = ''/i);
  assert.match(deleteMigration, /current_user_id uuid := \(select auth\.uid\(\)\)/i);
  assert.match(deleteMigration, /delete from auth\.users\s+where id = current_user_id/i);
  assert.match(deleteMigration, /revoke all on function public\.delete_own_account\(\) from public/i);
  assert.match(deleteMigration, /revoke all on function public\.delete_own_account\(\) from anon/i);
  assert.match(deleteMigration, /grant execute on function public\.delete_own_account\(\) to authenticated/i);
});

test('deleting an auth user cascades through every Logbook cloud data table', () => {
  assert.match(initialSchema, /public\.profiles[\s\S]*references auth\.users \(id\) on delete cascade/i);
  assert.match(initialSchema, /public\.routines[\s\S]*references auth\.users \(id\) on delete cascade/i);
  assert.match(initialSchema, /public\.sessions[\s\S]*references auth\.users \(id\) on delete cascade/i);
  assert.match(syncSchema, /public\.user_sync_state[\s\S]*references auth\.users \(id\) on delete cascade/i);
});
