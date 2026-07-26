-- Complete the two-phase payload limit rollout. Abort with a useful error if
-- legacy data still exceeds the bound; only a clean table may validate it.

do $$
begin
  if exists (
    select 1
    from public.user_sync_state
    where pg_column_size(payload) >= 2 * 1024 * 1024
  ) then
    raise exception 'user_sync_state contains payloads at or above the 2 MiB limit';
  end if;
end;
$$;

alter table public.user_sync_state
validate constraint user_sync_state_payload_size_check;
