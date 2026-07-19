import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const html = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const fonts = read('fonts.css');
const serviceWorker = read('service-worker.js');
const pwa = read('pwa.js');
const workflow = read('.github/workflows/pages.yml');
const ciWorkflow = read('.github/workflows/ci.yml');
const releaseWorkflow = read('.github/workflows/release.yml');

function pngSize(path) {
  const buffer = readFileSync(new URL(path, root));
  assert.deepEqual([...buffer.subarray(1, 4)], [80, 78, 71], `${path} is a PNG file`);
  return { width:buffer.readUInt32BE(16), height:buffer.readUInt32BE(20) };
}

test('manifest is relative-path safe for the GitHub Pages /logbook/ scope', () => {
  assert.equal(manifest.id, './');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#15130d');
  assert.equal(manifest.background_color, '#efe8d8');
});

test('manifest provides standard and maskable PNG icons at their declared sizes', () => {
  const expected = new Map([
    ['assets/icons/icon-192.png', { width:192, height:192 }],
    ['assets/icons/icon-512.png', { width:512, height:512 }],
    ['assets/icons/icon-maskable-512.png', { width:512, height:512 }],
  ]);

  assert.deepEqual(new Set(manifest.icons.map(icon => icon.purpose)), new Set(['any', 'maskable']));
  for (const icon of manifest.icons) {
    assert.deepEqual(pngSize(icon.src), expected.get(icon.src));
    assert.equal(icon.type, 'image/png');
  }
  assert.deepEqual(pngSize('assets/icons/apple-touch-icon.png'), { width:180, height:180 });
});

test('the page uses only local fonts and declares its install metadata', () => {
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="assets\/icons\/apple-touch-icon\.png"/);
  assert.match(html, /href="fonts\.css"/);
  assert.match(html, /src="pwa\.js"/);
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);

  for (const family of ['Alegreya Sans', 'Roboto Slab', 'Playpen Sans']) {
    assert.match(fonts, new RegExp(`font-family:"${family}"`));
  }
  for (const path of fonts.matchAll(/url\("([^"]+\.woff2)"\)/g)) {
    assert.equal(existsSync(fileURLToPath(new URL(path[1], root))), true, `${path[1]} exists`);
  }
});

test('service worker precaches the complete local shell without development seed tools', () => {
  for (const path of [
    './index.html',
    './manifest.webmanifest',
    './fonts.css',
    './styles.css',
    './app.js',
    './auth.js',
    './cloud-sync.js',
    './pwa.js',
    './assets/icons/icon-512.png',
    './assets/fonts/alegreya-sans-greek-800-normal.woff2',
  ]) {
    assert.ok(serviceWorker.includes(`'${path}'`), `${path} is in the app shell`);
  }
  assert.match(serviceWorker, /CACHE_VERSION = 'logbook-0\.7\.0'/);
  assert.match(serviceWorker, /SUPABASE_LIBRARY = 'https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2'/);
  assert.doesNotMatch(serviceWorker, /seed(-week)?\.html|seed-week\.js/);
  assert.doesNotMatch(serviceWorker, /event\.waitUntil\(refresh\)/, 'navigation must not refresh index.html independently from the cached JS shell');
  assert.match(pwa, /new URL\('\.\/service-worker\.js', document\.baseURI\)/);
  assert.match(pwa, /scope:'\.\/'/);
  assert.match(pwa, /\['localhost', '127\.0\.0\.1', '\[::1\]'\]/);
  assert.match(pwa, /registration\.unregister\(\)/, 'local development removes stale workers');
  assert.match(pwa, /name\.startsWith\('logbook-'\)/, 'local development removes stale Logbook shell caches');
});

test('GitHub Pages workflow publishes a production-only artifact', () => {
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /npx playwright install --with-deps chromium webkit/);
  assert.match(workflow, /run: npm run check/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /path: _site/);
  assert.doesNotMatch(workflow, /cp .*seed/);
  assert.doesNotMatch(workflow, /cp .*tests/);
  assert.doesNotMatch(workflow, /cp .*designs/);
});

test('pull requests, deployment and tagged releases share the full quality gate', () => {
  assert.match(ciWorkflow, /pull_request:/);
  assert.match(ciWorkflow, /run: npm run check/);
  assert.match(releaseWorkflow, /tags: \['v\*\.\*\.\*'\]/);
  assert.match(releaseWorkflow, /run: npm run check/);
  assert.match(releaseWorkflow, /gh release create/);
});
