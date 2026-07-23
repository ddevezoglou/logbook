import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { bumpVersion, prepareVersionBump } from '../scripts/bump-version.mjs';

const root = new URL('..', import.meta.url);
const rootPath = fileURLToPath(root);
const currentVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
const [major, minor, patch] = currentVersion.split('.').map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;
const escapedNextVersion = nextVersion.replaceAll('.', '\\.');
const files = [
  'package.json',
  'package-lock.json',
  'index.html',
  'service-worker.js',
  'DEVELOPMENT.md',
  'tests/app.test.mjs',
  'tests/error-tracking.test.mjs',
];

async function withFixture(run) {
  const fixture = await mkdtemp(join(tmpdir(), 'logbook-version-'));
  try {
    for (const file of files) {
      await mkdir(join(fixture, file, '..'), { recursive:true });
      await cp(new URL(`../${file}`, import.meta.url), join(fixture, file), { recursive:true });
    }
    await run(fixture);
  } finally {
    await rm(fixture, { recursive:true, force:true });
  }
}

test('version bump updates every release reference as one validated change', async () => {
  await withFixture(async fixture => {
    const result = await bumpVersion(nextVersion, { root:fixture });
    assert.equal(result.currentVersion, currentVersion);
    assert.deepEqual(new Set(result.changes.map(change => change.file)), new Set(files));
    assert.equal(JSON.parse(await readFile(join(fixture, 'package.json'), 'utf8')).version, nextVersion);
    assert.equal(JSON.parse(await readFile(join(fixture, 'package-lock.json'), 'utf8')).packages[''].version, nextVersion);
    assert.match(await readFile(join(fixture, 'index.html'), 'utf8'), new RegExp(`Application version ${escapedNextVersion}`));
    assert.match(await readFile(join(fixture, 'service-worker.js'), 'utf8'), new RegExp(`logbook-${escapedNextVersion}`));
    assert.match(await readFile(join(fixture, 'DEVELOPMENT.md'), 'utf8'), new RegExp(`\\*\\*${escapedNextVersion}\\*\\*`));
  });
});

test('dry run validates the complete bump without writing files', async () => {
  await withFixture(async fixture => {
    const before = await readFile(join(fixture, 'package.json'), 'utf8');
    const result = await bumpVersion(nextVersion, { root:fixture, dryRun:true });
    assert.equal(result.changes.length, files.length);
    assert.equal(await readFile(join(fixture, 'package.json'), 'utf8'), before);
  });
});

test('version bump rejects invalid or unchanged versions before writing', async () => {
  await assert.rejects(() => prepareVersionBump('0.9', { root:rootPath }), /X\.Y\.Z/);
  await assert.rejects(() => prepareVersionBump(currentVersion, { root:rootPath }), /already/);
});
