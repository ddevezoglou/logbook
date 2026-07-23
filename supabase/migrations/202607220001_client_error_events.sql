-- Privacy-preserving operational error events. The browser cannot read or
-- insert rows directly; authenticated clients can only call the constrained
-- RPC below, which derives user_id from auth.uid().

create table public.client_error_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('sync', 'pwa', 'window', 'promise')),
  code text not null check (code in (
    'sync_failure',
    'sync_conflict',
    'sync_network_failure',
    'service_worker_cleanup_failed',
    'service_worker_registration_failed',
    'unhandled_error',
    'unhandled_rejection'
  )),
  error_name text not null check (error_name in (
    'Error',
    'TypeError',
    'ReferenceError',
    'RangeError',
    'SyntaxError',
    'DOMException',
    'AggregateError'
  )),
  app_version text not null check (
    char_length(app_version) between 5 and 24
    and app_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  browser_family text not null check (browser_family in ('chromium', 'webkit', 'firefox', 'unknown')),
  online boolean not null,
  check (
    (source = 'sync' and code in ('sync_failure', 'sync_conflict', 'sync_network_failure'))
    or (source = 'pwa' and code in ('service_worker_cleanup_failed', 'service_worker_registration_failed'))
    or (source = 'window' and code = 'unhandled_error')
    or (source = 'promise' and code = 'unhandled_rejection')
  )
);

create index client_error_events_user_time_idx
  on public.client_error_events (user_id, occurred_at desc);

create index client_error_events_retention_idx
  on public.client_error_events (occurred_at);

alter table public.client_error_events enable row level security;

revoke all on public.client_error_events from public;
revoke all on public.client_error_events from anon;
revoke all on public.client_error_events from authenticated;

create or replace function public.report_client_error(
  event_source text,
  event_code text,
  event_error_name text,
  event_app_version text,
  event_browser_family text,
  event_online boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Serialize reports per user so concurrent tabs cannot bypass the limit.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  -- Retention is enforced opportunistically without requiring pg_cron.
  delete from public.client_error_events
  where occurred_at < now() - interval '30 days';

  if (
    select count(*)
    from public.client_error_events
    where user_id = current_user_id
      and occurred_at >= now() - interval '1 hour'
  ) >= 10 then
    return false;
  end if;

  insert into public.client_error_events (
    user_id,
    source,
    code,
    error_name,
    app_version,
    browser_family,
    online
  ) values (
    current_user_id,
    event_source,
    event_code,
    event_error_name,
    event_app_version,
    event_browser_family,
    event_online
  );

  return true;
end;
$$;

revoke all on function public.report_client_error(text, text, text, text, text, boolean) from public;
revoke all on function public.report_client_error(text, text, text, text, text, boolean) from anon;
grant execute on function public.report_client_error(text, text, text, text, text, boolean) to authenticated;
