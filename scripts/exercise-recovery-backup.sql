-- Read-only historical recovery points for comparison with the current state.
select user_id, source_revision, payload, captured_at, captured_on
from public.user_sync_snapshots
order by user_id, captured_at desc;
