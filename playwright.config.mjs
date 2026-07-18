import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI ? 1 : 0,
  reporter:process.env.CI ? [['line'], ['html', { open:'never' }]] : 'line',
  use:{
    baseURL:'http://127.0.0.1:4173',
    serviceWorkers:'allow',
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  webServer:{
    command:'node scripts/serve-static.mjs',
    url:'http://127.0.0.1:4173/',
    reuseExistingServer:!process.env.CI,
    timeout:15_000,
  },
  projects:[
    { name:'android-chromium', use:{ ...devices['Pixel 5'] } },
    { name:'ios-webkit', use:{ ...devices['iPhone 13'] } },
  ],
});
