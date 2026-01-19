/**
 * Crouton E2E Playwright Configuration
 *
 * Configuration for testing Crouton applications.
 * Uses apps/test-bookings as the test target.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
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
    // Smoke tests without auth (for auth flow testing)
    {
      name: 'chromium-no-auth',
      testMatch: /auth\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome']
      }
    },
    // Main tests - use saved auth state
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /auth\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: './.auth/user.json'
      },
      dependencies: ['setup']
    }
  ],

  // Start dev server if not already running
  webServer: {
    command: 'pnpm --filter test-bookings dev',
    cwd: '..',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
})
