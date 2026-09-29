// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The gym has plenty of 1-3 second delays. Keep this generous while learning.
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    // Accepted downloads land in test-results by default.
    acceptDownloads: true
  },

  expect: {
    timeout: 10_000
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],

  // Starts server.js before the run and shuts it down afterwards.
  webServer: {
    command: `node server.js ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000
  }
});
