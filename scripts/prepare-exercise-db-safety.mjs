// Produce one reviewable, atomic SQL transaction for the two safety migrations.
// This script only writes a local file; it never connects to Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/prepare-exercise-db-safety.mjs <output.sql>');
const snapshots = readFileSync(new URL('../supabase/migrations/202607230001_user_sync_snapshots.sql', import.meta.url), 'utf8');
const library = readFileSync(new URL('../supabase/migrations/202609050001_preserve_exercise_library.sql', import.meta.url), 'utf8');
writeFileSync(output, `begin;
lock table public.user_sync_state in share row exclusive mode;
create temporary table exercise_upgrade_baseline on commit drop as
select user_id, revision, payload from public.user_sync_state;

${snapshots}

${library}

do $$
begin
  if exists (
    select 1 from exercise_upgrade_baseline before_state
    full join public.user_sync_state after_state using (user_id)
    where before_state.user_id is null or after_state.user_id is null
       or before_state.revision is distinct from after_state.revision
       or before_state.payload is distinct from after_state.payload
  ) then
    raise exception 'Account data changed: safety upgrade must be rolled back';
  end if;
  if exists (
    select 1 from exercise_upgrade_baseline baseline
    where not exists (
      select 1 from public.user_sync_snapshots snapshot
      where snapshot.user_id = baseline.user_id
        and snapshot.source_revision = baseline.revision
        and snapshot.payload = baseline.payload
    )
  ) then
    raise exception 'Missing exact recovery copy: safety upgrade must be rolled back';
  end if;
end;
$$;
insert into supabase_migrations.schema_migrations(version)
values ('202607230001'), ('202609050001')
on conflict (version) do nothing;
commit;

select
  (select count(*) from public.user_sync_state) as unchanged_account_snapshots,
  (select count(*) from public.user_sync_snapshots) as recovery_snapshots,
  exists(select 1 from pg_catalog.pg_trigger where tgname = 'user_sync_state_preserve_exercise_library') as library_guard_enabled,
  exists(select 1 from cron.job where jobname = 'logbook-prune-user-sync-snapshots' and active) as retention_job_enabled;
`);
