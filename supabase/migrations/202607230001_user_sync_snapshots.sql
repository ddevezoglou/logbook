-- Daily operational recovery points for the local-first sync payload.
-- Snapshots are intentionally not exposed through the Data API: they are
-- written only by the trigger below and retained for 30 days by Supabase Cron.

create table public.user_sync_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_revision bigint not null check (source_revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  captured_at timestamptz not null default now(),
  captured_on date not null default ((now() at time zone 'UTC')::date),
  unique (user_id, captured_on)
);

create index user_sync_snapshots_captured_at_idx
on public.user_sync_snapshots (captured_at);

alter table public.user_sync_snapshots enable row level security;

revoke all on public.user_sync_snapshots from anon;
revoke all on public.user_sync_snapshots from authenticated;
revoke all on sequence public.user_sync_snapshots_id_seq from anon;
revoke all on sequence public.user_sync_snapshots_id_seq from authenticated;

create or replace function public.capture_daily_user_sync_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_revision bigint;
  snapshot_payload jsonb;
begin
  if tg_op = 'INSERT' then
    snapshot_revision := new.revision;
    snapshot_payload := new.payload;
  else
    snapshot_revision := old.revision;
    snapshot_payload := old.payload;
  end if;

  insert into public.user_sync_snapshots (
    user_id,
    source_revision,
    payload,
    captured_at,
    captured_on
  )
  values (
    new.user_id,
    snapshot_revision,
    snapshot_payload,
    now(),
    (now() at time zone 'UTC')::date
  )
  on conflict (user_id, captured_on) do nothing;

  return new;
end;
$$;

revoke all on function public.capture_daily_user_sync_snapshot() from public;
revoke all on function public.capture_daily_user_sync_snapshot() from anon;
revoke all on function public.capture_daily_user_sync_snapshot() from authenticated;

create trigger user_sync_state_capture_initial_snapshot
after insert on public.user_sync_state
for each row execute function public.capture_daily_user_sync_snapshot();

create trigger user_sync_state_capture_daily_snapshot
after update of payload on public.user_sync_state
for each row
when (old.payload is distinct from new.payload)
execute function public.capture_daily_user_sync_snapshot();

-- Give existing accounts a recovery point immediately when this migration is
-- applied. Later writes on the same UTC day keep this baseline immutable.
insert into public.user_sync_snapshots (
  user_id,
  source_revision,
  payload,
  captured_at,
  captured_on
)
select
  user_id,
  revision,
  payload,
  now(),
  (now() at time zone 'UTC')::date
from public.user_sync_state
on conflict (user_id, captured_on) do nothing;

create or replace function public.prune_user_sync_snapshots()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.user_sync_snapshots
  where captured_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.prune_user_sync_snapshots() from public;
revoke all on function public.prune_user_sync_snapshots() from anon;
revoke all on function public.prune_user_sync_snapshots() from authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'logbook-prune-user-sync-snapshots',
  '17 3 * * *',
  $$select public.prune_user_sync_snapshots();$$
);
