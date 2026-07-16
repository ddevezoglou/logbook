-- Logbook cloud schema, phase 1.
-- The browser keeps using localStorage until account and sync flows are added.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  birthdate date,
  weight numeric check (weight is null or weight >= 0),
  weight_unit text check (weight_unit is null or weight_unit in ('kg', 'lb')),
  avatar text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routines (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  is_active boolean not null default false,
  cycle_length smallint not null check (cycle_length between 3 and 10),
  cycle_anchor_date date not null,
  uses_weekdays boolean not null default true,
  plan jsonb not null default '[]'::jsonb check (jsonb_typeof(plan) = 'array'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  type text not null check (type in ('scheduled', 'free')),
  routine_id text,
  cycle_day smallint check (cycle_day is null or cycle_day between 1 and 10),
  workout_day text,
  workout_name text,
  comments text not null default '',
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, routine_id)
    references public.routines (user_id, id)
    on delete set null (routine_id)
);

create unique index routines_one_active_per_user
  on public.routines (user_id)
  where is_active and deleted_at is null;

create index routines_user_updated_idx
  on public.routines (user_id, updated_at desc);

create index sessions_user_date_idx
  on public.sessions (user_id, date desc);

create index sessions_user_updated_idx
  on public.sessions (user_id, updated_at desc);

create unique index sessions_one_active_per_date
  on public.sessions (user_id, date)
  where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.sessions enable row level security;

revoke all on public.profiles from anon;
revoke all on public.routines from anon;
revoke all on public.sessions from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

create policy "routines_select_own"
on public.routines
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "routines_insert_own"
on public.routines
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "routines_update_own"
on public.routines
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "routines_delete_own"
on public.routines
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "sessions_select_own"
on public.sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "sessions_insert_own"
on public.sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "sessions_update_own"
on public.sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "sessions_delete_own"
on public.sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);
