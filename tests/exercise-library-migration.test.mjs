import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the server guard preserves omitted libraries without rewriting existing data or widening permissions', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202609050001_preserve_exercise_library.sql', import.meta.url), 'utf8');
  assert.match(sql, /old\.payload \? 'trainingExercises' and not \(new\.payload \? 'trainingExercises'\)/);
  assert.match(sql, /pg_catalog\.jsonb_set\(new\.payload, '\{trainingExercises\}', old\.payload -> 'trainingExercises', true\)/);
  assert.match(sql, /before update on public\.user_sync_state/i);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function.*from public, anon, authenticated/);
  assert.doesNotMatch(sql, /\b(?:delete from|truncate|drop table|update public\.|grant)\b/i);
});
