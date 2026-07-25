-- Security hardening for session hygiene and bounded sync storage.
-- The avatar gallery is device-local; only the active customImage remains in
-- the normalized cloud profile.

update public.user_sync_state
set payload = jsonb_set(
  payload,
  '{userProfile}',
  (payload -> 'userProfile') - 'imageGallery',
  false
)
where jsonb_typeof(payload -> 'userProfile') = 'object'
  and (payload -> 'userProfile') ? 'imageGallery';

alter table public.user_sync_state
add constraint user_sync_state_payload_size_check
check (pg_column_size(payload) < 2 * 1024 * 1024)
not valid;

-- These phase-one tables are not used by the current snapshot sync client.
-- Keep their schema for a future explicit migration, but remove Data API
-- privileges now so their dormant CRUD surface cannot be reached.
revoke all on public.profiles from authenticated;
revoke all on public.routines from authenticated;
revoke all on public.sessions from authenticated;
