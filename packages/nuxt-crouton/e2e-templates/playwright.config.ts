/**
 * Crouton E2E Playwright Configuration
 *
 * Base configuration for testing Crouton applications.
 * Copy to your app and customize as needed.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  projects: [
    // Auth setup - runs first
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    },
    // Main tests - use saved auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ],

  // Start dev server if not already running
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
})