-- Device sync snapshot for the local-first Logbook application.
-- Each authenticated user owns exactly one versioned payload. The revision is
-- incremented by the database so clients can detect concurrent device writes.

create table public.user_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.advance_user_sync_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_sync_state_advance_revision
before update on public.user_sync_state
for each row execute function public.advance_user_sync_revision();

alter table public.user_sync_state enable row level security;

revoke all on public.user_sync_state from anon;
grant select, insert, update, delete on public.user_sync_state to authenticated;

create policy "user_sync_state_select_own"
on public.user_sync_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_sync_state_insert_own"
on public.user_sync_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_sync_state_update_own"
on public.user_sync_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_sync_state_delete_own"
on public.user_sync_state
for delete
to authenticated
using ((select auth.uid()) = user_id);
