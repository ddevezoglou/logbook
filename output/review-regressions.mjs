// The original diagnostic asserted the bugs. These regression tests assert
// their fixes and are also part of the regular unit gate.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.execPath, ['--test', 'tests/deferred-saves.test.mjs', 'tests/sync-races.test.mjs'], {
  cwd:fileURLToPath(new URL('../', import.meta.url)), stdio:'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
