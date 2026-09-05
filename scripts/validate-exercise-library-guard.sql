-- Run after the library-guard migration inside BEGIN ... ROLLBACK.
-- Only the temporary test table is mutated; no account snapshots are touched.
create temporary table exercise_library_guard_test (payload jsonb not null);
create trigger exercise_library_guard_test_trigger
before update on exercise_library_guard_test
for each row execute function public.preserve_logbook_exercise_library();

insert into exercise_library_guard_test(payload)
values ('{"trainingExercises":[{"id":"fixture","name":"Row"}],"trainingSessions":[]}'::jsonb);

update exercise_library_guard_test
set payload = '{"trainingSessions":[{"id":"new-session"}]}'::jsonb;

do $$
begin
  if not exists (
    select 1 from exercise_library_guard_test
    where payload -> 'trainingExercises' = '[{"id":"fixture","name":"Row"}]'::jsonb
      and payload -> 'trainingSessions' = '[{"id":"new-session"}]'::jsonb
  ) then
    raise exception 'Old-client update lost a library definition or session';
  end if;
end;
$$;

update exercise_library_guard_test
set payload = '{"trainingExercises":[{"id":"fixture","name":"Cable Row"}],"trainingSessions":[]}'::jsonb;

do $$
begin
  if not exists (
    select 1 from exercise_library_guard_test
    where payload -> 'trainingExercises' -> 0 ->> 'name' = 'Cable Row'
  ) then
    raise exception 'A new-client exercise edit was incorrectly blocked';
  end if;
end;
$$;
