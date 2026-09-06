import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let server;
let serverClosed;
try {
  const alreadyRunning = await fetch('http://127.0.0.1:4173/', { signal:AbortSignal.timeout(1000) }).then(response => response.ok, () => false);
  if (alreadyRunning && process.env.CI) throw new Error('Test port 4173 is already in use in CI.');
  if (!alreadyRunning) {
    // Own the Node child directly. Playwright's Windows shell/process-tree
    // teardown can hang after every test has already finished.
    server = spawn(process.execPath, ['scripts/serve-static.mjs'], { cwd:root, stdio:['ignore', 'pipe', 'inherit'] });
    serverClosed = once(server, 'close');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test server did not start.')), 15000);
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Test server exited: ${code}`)); });
      server.stdout.on('data', chunk => {
        if (String(chunk).includes('listening')) { clearTimeout(timer); resolve(); }
      });
    });
  }
  const runner = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    cwd:root, stdio:'inherit', env:{ ...process.env, LOGBOOK_MANAGED_TEST_SERVER:'1' },
  });
  const [code] = await once(runner, 'close');
  process.exitCode = code ?? 1;
} finally {
  if (server && server.exitCode === null) server.kill();
  if (serverClosed) await serverClosed;
}
