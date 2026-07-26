import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildProduction } from './build-production.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = resolve(projectRoot, '_site');
const budget = JSON.parse(await readFile(resolve(projectRoot, 'performance-budget.json'), 'utf8'));
const port = 4174;

async function directoryBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    if (entry.name === '.nojekyll') continue;
    const path = resolve(directory, entry.name);
    total += entry.isDirectory() ? await directoryBytes(path) : (await stat(path)).size;
  }
  return total;
}

function waitForServer(server) {
  return new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error('Performance server did not start.')), 10_000);
    server.stdout.on('data', chunk => {
      if (!String(chunk).includes('listening')) return;
      clearTimeout(timeout);
      resolveReady();
    });
    server.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Performance server exited with code ${code}.`));
    });
  });
}

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function measureRun(browser) {
  const { viewport, cpuSlowdownMultiplier, network } = budget.profile;
  const context = await browser.newContext({
    viewport:{ width:viewport.width, height:viewport.height },
    deviceScaleFactor:viewport.deviceScaleFactor,
    isMobile:true,
    hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 13; MidRange) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36',
  });
  await context.addInitScript(() => {
    window.__logbookPerformance = { lcp:0, longTasks:[] };
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      window.__logbookPerformance.lcp = entries.at(-1)?.startTime || window.__logbookPerformance.lcp;
    }).observe({ type:'largest-contentful-paint', buffered:true });
    new PerformanceObserver(list => {
      window.__logbookPerformance.longTasks.push(...list.getEntries().map(entry => ({ startTime:entry.startTime, duration:entry.duration })));
    }).observe({ type:'longtask', buffered:true });
    window.supabase = {
      createClient:() => ({
        auth:{
          async getSession() { return { data:{ session:null }, error:null }; },
          onAuthStateChange() { return { data:{ subscription:{ unsubscribe() {} } } }; },
        },
      }),
    };
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline:false,
    latency:network.latencyMs,
    downloadThroughput:network.downloadKbps * 1024 / 8,
    uploadThroughput:network.uploadKbps * 1024 / 8,
    connectionType:'cellular3g',
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate:cpuSlowdownMultiplier });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil:'load' });
  await page.waitForFunction(() => document.querySelector('#auth-gate')?.dataset.state === 'login');
  await page.waitForTimeout(2500);
  const result = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
    const end = Math.min(performance.now(), fcp + 5000);
    const tbt = window.__logbookPerformance.longTasks
      .filter(entry => entry.startTime >= fcp && entry.startTime < end)
      .reduce((total, entry) => total + Math.max(0, entry.duration - 50), 0);
    return { lcpMs:window.__logbookPerformance.lcp, tbtMs:tbt };
  });
  await context.close();
  return result;
}

await buildProduction('_site');
const appShellBytes = await directoryBytes(artifactPath);
const server = spawn(process.execPath, ['scripts/serve-static.mjs', '--root', '_site', '--port', String(port)], {
  cwd:projectRoot,
  stdio:['ignore', 'pipe', 'pipe'],
});

let browser;
try {
  await waitForServer(server);
  browser = await chromium.launch();
  const samples = [];
  for (let run = 0; run < budget.profile.runs; run += 1) samples.push(await measureRun(browser));
  const result = {
    appShellBytes,
    lcpMs:Math.round(median(samples.map(sample => sample.lcpMs))),
    tbtMs:Math.round(median(samples.map(sample => sample.tbtMs))),
  };
  assert.ok(result.lcpMs > 0, 'LCP was not captured');
  for (const [metric, limit] of Object.entries(budget.budgets)) {
    assert.ok(result[metric] <= limit, `${metric} ${result[metric]} exceeds budget ${limit}`);
  }
  console.log(`Performance budget OK: shell ${result.appShellBytes}/${budget.budgets.appShellBytes} bytes, LCP ${result.lcpMs}/${budget.budgets.lcpMs} ms, TBT ${result.tbtMs}/${budget.budgets.tbtMs} ms`);
  console.log(`Samples: ${samples.map(sample => `LCP ${Math.round(sample.lcpMs)} ms, TBT ${Math.round(sample.tbtMs)} ms`).join(' | ')}`);
} finally {
  await browser?.close();
  server.kill();
}
