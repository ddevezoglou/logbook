import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprintDirectory } from '../scripts/build-production.mjs';

test('shell identity changes for quotes, scripts and nested assets without a version bump', async t => {
  const root = await mkdtemp(join(tmpdir(), 'logbook-shell-'));
  t.after(() => rm(root, { recursive:true, force:true }));
  await mkdir(join(root, 'modules'));
  await writeFile(join(root, 'index.html'), 'version 0.3.3');
  await writeFile(join(root, 'quotes.js'), 'old quotes');
  await writeFile(join(root, 'modules', 'history.js'), 'old history');
  const first = await fingerprintDirectory(root);
  assert.equal(await fingerprintDirectory(root), first, 'the same artifact has a stable identity');
  await writeFile(join(root, 'quotes.js'), 'new quotes');
  const quotesChanged = await fingerprintDirectory(root);
  assert.notEqual(quotesChanged, first);
  await writeFile(join(root, 'modules', 'history.js'), 'fixed history');
  assert.notEqual(await fingerprintDirectory(root), quotesChanged);
});
