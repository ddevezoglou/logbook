-- Allow an authenticated Logbook member to permanently delete only their own
-- auth user. All public Logbook rows reference auth.users with ON DELETE
-- CASCADE, so the account and its synced data are removed atomically.

create or replace function public.delete_own_account()
returns void
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

  delete from auth.users
  where id = current_user_id;

  if not found then
    raise exception 'Authenticated user not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
