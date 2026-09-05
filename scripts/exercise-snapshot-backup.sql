-- Read-only full recovery export before auditing the additive client migration.
select user_id, revision, payload, created_at, updated_at
from public.user_sync_state
order by user_id;
