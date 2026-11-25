import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SITE_URL || 'https://novanod6.github.io/NOVANOD/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['json', { outputFile: 'artifacts/playwright-results.json' }],
    ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'chromium-tablet', use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium', browserName: 'chromium' } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  outputDir: 'artifacts/test-results',
  timeout: 45000,
});
