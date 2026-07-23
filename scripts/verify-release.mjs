import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const html = read('index.html');
const serviceWorker = read('service-worker.js');
const development = read('DEVELOPMENT.md');
const gitignore = read('.gitignore');
const version = pkg.version;
const productionScripts = [
  'app.js',
  'auth.js',
  'cloud-sync.js',
  'error-tracking.js',
  'i18n.js',
  'modules/progress-rewards.js',
  'modules/routines.js',
  'modules/sessions.js',
  'modules/storage-migrations.js',
  'modules/ui.js',
  'pwa.js',
  'quotes.js',
  'service-worker.js',
  'supabase-client.js',
  'supabase-config.js',
];

assert.match(version, /^\d+\.\d+\.\d+$/, 'package version must use semantic versioning');
assert.equal(lock.version, version, 'package-lock root version must match package.json');
assert.equal(lock.packages[''].version, version, 'package-lock package version must match package.json');
assert.ok(html.includes(`Application version ${version}`), 'menu accessibility version must match package.json');
assert.ok(html.includes(`<b>${version}</b>`), 'visible menu version must match package.json');
assert.ok(serviceWorker.includes(`CACHE_VERSION = 'logbook-${version}'`), 'service-worker cache must match package.json');
assert.ok(development.includes(`**${version}**`), 'DEVELOPMENT.md current version must match package.json');

for (const pattern of ['*.log', '/playwright-report/', '/test-results/', '/coverage/']) {
  assert.ok(gitignore.split(/\r?\n/).includes(pattern), `.gitignore must keep ${pattern} out of releases`);
}

for (const path of productionScripts) {
  const source = read(path);
  assert.doesNotMatch(source, /console\.(?:log|debug|info|trace)\s*\(/, `${path} must not contain debug-only console logging`);
  assert.doesNotMatch(source, /\bdebugger\s*;/, `${path} must not contain debugger statements`);
}

const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : '';
if (tag) assert.equal(tag, `v${version}`, `release tag must be v${version}`);

console.log(`Release checks OK: v${version}`);
