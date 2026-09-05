-- Read-only inventory; no account identifiers or profile data in output.
select
  count(*) as account_snapshots,
  sum(jsonb_array_length(coalesce(payload -> 'trainingRoutines', '[]'::jsonb))) as routines,
  sum(jsonb_array_length(coalesce(payload -> 'trainingSessions', '[]'::jsonb))) as sessions,
  sum(jsonb_array_length(coalesce(payload -> 'trainingExercises', '[]'::jsonb))) as library_definitions
from public.user_sync_state;
