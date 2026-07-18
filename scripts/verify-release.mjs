import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const html = read('index.html');
const serviceWorker = read('service-worker.js');
const development = read('DEVELOPMENT.md');
const version = pkg.version;

assert.match(version, /^\d+\.\d+\.\d+$/, 'package version must use semantic versioning');
assert.equal(lock.version, version, 'package-lock root version must match package.json');
assert.equal(lock.packages[''].version, version, 'package-lock package version must match package.json');
assert.ok(html.includes(`Application version ${version}`), 'menu accessibility version must match package.json');
assert.ok(html.includes(`<b>${version}</b>`), 'visible menu version must match package.json');
assert.ok(serviceWorker.includes(`CACHE_VERSION = 'logbook-${version}'`), 'service-worker cache must match package.json');
assert.ok(development.includes(`**${version}**`), 'DEVELOPMENT.md current version must match package.json');

const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : '';
if (tag) assert.equal(tag, `v${version}`, `release tag must be v${version}`);

console.log(`Release metadata OK: v${version}`);
