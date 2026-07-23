import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER = /^\d+\.\d+\.\d+$/;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  {
    file:'package.json',
    update(source, current, next) {
      const data = JSON.parse(source);
      if (data.version !== current) throw new Error(`package.json version is ${data.version}, expected ${current}`);
      data.version = next;
      return `${JSON.stringify(data, null, 2)}\n`;
    },
  },
  {
    file:'package-lock.json',
    update(source, current, next) {
      const data = JSON.parse(source);
      if (data.version !== current || data.packages?.['']?.version !== current) {
        throw new Error('package-lock.json root versions do not match package.json');
      }
      data.version = next;
      data.packages[''].version = next;
      return `${JSON.stringify(data, null, 2)}\n`;
    },
  },
  {
    file:'index.html',
    update:replaceVersionReferences([
      current => `Application version ${current}`,
      current => `<b>${current}</b>`,
    ]),
  },
  {
    file:'service-worker.js',
    update:replaceVersionReferences([current => `CACHE_VERSION = 'logbook-${current}'`]),
  },
  {
    file:'tests/app.test.mjs',
    update:replaceVersionReferences([current => `textContent, '${current}'`]),
  },
  {
    file:'tests/error-tracking.test.mjs',
    update:replaceVersionReferences([current => `event_app_version, '${current}'`]),
  },
  {
    file:'DEVELOPMENT.md',
    update:replaceVersionReferences([
      current => `**${current}**`,
      current => `της ${current}`,
      current => `περιορισμοί της ${current}`,
      current => `Αξιολόγηση ${current}`,
    ], { optional:true }),
  },
];

function replaceVersionReferences(patterns, { optional = false } = {}) {
  return (source, current, next) => {
    let updated = source;
    let replacements = 0;
    for (const pattern of patterns) {
      const before = pattern(current);
      const after = pattern(next);
      const matches = updated.split(before).length - 1;
      if (!matches && !optional) throw new Error(`Expected version reference not found: ${before}`);
      if (matches) {
        updated = updated.split(before).join(after);
        replacements += matches;
      }
    }
    if (!replacements) throw new Error('No version references were updated');
    return updated;
  };
}

export async function prepareVersionBump(nextVersion, { root = DEFAULT_ROOT } = {}) {
  if (!SEMVER.test(nextVersion)) throw new Error('Version must use numeric semantic versioning (X.Y.Z)');

  const packagePath = join(root, 'package.json');
  const packageData = JSON.parse(await readFile(packagePath, 'utf8'));
  const currentVersion = packageData.version;
  if (!SEMVER.test(currentVersion)) throw new Error(`Current package version is invalid: ${currentVersion}`);
  if (currentVersion === nextVersion) throw new Error(`Version is already ${nextVersion}`);

  const changes = [];
  for (const target of targets) {
    const path = join(root, target.file);
    const source = await readFile(path, 'utf8');
    const updated = target.update(source, currentVersion, nextVersion);
    changes.push({ ...target, path, source, updated });
  }
  return { currentVersion, nextVersion, changes };
}

export async function bumpVersion(nextVersion, options = {}) {
  const prepared = await prepareVersionBump(nextVersion, options);
  if (!options.dryRun) {
    for (const change of prepared.changes) await writeFile(change.path, change.updated, 'utf8');
  }
  return prepared;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const nextVersion = args.find(arg => !arg.startsWith('--'));
  if (!nextVersion || args.some(arg => arg.startsWith('--') && arg !== '--dry-run')) {
    throw new Error('Usage: npm run version:bump -- <X.Y.Z> [--dry-run]');
  }
  const result = await bumpVersion(nextVersion, { dryRun });
  const action = dryRun ? 'Would update' : 'Updated';
  console.log(`${action} ${result.currentVersion} → ${result.nextVersion}`);
  result.changes.forEach(change => console.log(`- ${change.file}`));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
