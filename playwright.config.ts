import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build (`pnpm test` builds first), so they
// check exactly what would be deployed. The build gets a placeholder Mapbox
// token, so the click-to-load street map is always tested; its requests are mocked.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    // --ignore-lock keeps the server in the foreground. Astro otherwise
    // backgrounds it when it detects a coding agent, and Playwright then sees
    // the command exit and aborts.
    command: 'pnpm exec astro preview --ignore-lock --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
  // System Chrome: present on dev machines and GitHub runners, no browser download.
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
