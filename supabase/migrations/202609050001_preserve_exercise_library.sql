-- Additive guard for older clients that do not know trainingExercises.
-- No existing rows are rewritten. Deploy before serving the 0.3 client.
create or replace function public.preserve_logbook_exercise_library()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.payload ? 'trainingExercises' and not (new.payload ? 'trainingExercises') then
    new.payload = pg_catalog.jsonb_set(new.payload, '{trainingExercises}', old.payload -> 'trainingExercises', true);
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_logbook_exercise_library() from public, anon, authenticated;

create trigger user_sync_state_preserve_exercise_library
before update on public.user_sync_state
for each row execute function public.preserve_logbook_exercise_library();
