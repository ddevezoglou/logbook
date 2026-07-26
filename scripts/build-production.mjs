import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FILES = [
  'index.html',
  'privacy.html',
  'manifest.webmanifest',
  'favicon.svg',
  'fonts.css',
  'tokens.css',
  'base.css',
  'components.css',
  'dialogs.css',
  'views.css',
  'legal.css',
  'quotes.js',
  'theme.js',
  'i18n.js',
  'supabase-config.js',
  'supabase-client.js',
  'error-tracking.js',
  'session-state.js',
  'auth.js',
  'cloud-sync.js',
  'app.js',
  'pwa.js',
  'service-worker.js',
];
const MODULE_FILES = [
  'modules/storage-migrations.js',
  'modules/routines.js',
  'modules/sessions.js',
  'modules/progress-chart.js',
  'modules/progress-rewards.js',
  'modules/history.js',
  'modules/ui.js',
];

function safeOutputPath(value) {
  const output = resolve(projectRoot, value || '_site');
  if (output !== resolve(projectRoot, '_site') || output === projectRoot || !output.startsWith(`${projectRoot}${sep}`)) {
    throw new Error('Production output must be the project _site directory.');
  }
  return output;
}

async function writeAsset(path, output) {
  const sourcePath = resolve(projectRoot, path);
  const outputPath = resolve(output, path);
  await mkdir(dirname(outputPath), { recursive:true });
  const extension = extname(path);
  if (extension !== '.js' && extension !== '.css') {
    await cp(sourcePath, outputPath);
    return;
  }
  const source = await readFile(sourcePath, 'utf8');
  const result = await transform(source, {
    loader:extension === '.css' ? 'css' : 'js',
    minify:true,
    target:extension === '.css' ? undefined : 'es2020',
    legalComments:'inline',
  });
  await writeFile(outputPath, result.code, 'utf8');
}

export async function buildProduction(outputValue = '_site') {
  const output = safeOutputPath(outputValue);
  await rm(output, { recursive:true, force:true });
  await mkdir(output, { recursive:true });
  await Promise.all([...ROOT_FILES, ...MODULE_FILES].map(path => writeAsset(path, output)));
  await cp(resolve(projectRoot, 'assets'), resolve(output, 'assets'), { recursive:true });
  await writeFile(resolve(output, '.nojekyll'), '', 'utf8');
  return { output, files:[...ROOT_FILES, ...MODULE_FILES] };
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const outputIndex = process.argv.indexOf('--output');
  const outputValue = outputIndex >= 0 ? process.argv[outputIndex + 1] : '_site';
  const result = await buildProduction(outputValue);
  console.log(`Production artifact ready: ${relative(projectRoot, result.output)} (${result.files.length} allowlisted files; JS/CSS minified + assets/)`);
}
