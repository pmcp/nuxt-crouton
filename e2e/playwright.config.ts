/**
 * Crouton E2E Playwright Configuration
 *
 * Target: the fixture app fixtures/minimal (pkg "e2e-fixture-minimal"),
 * a dedicated minimal crouton app used to verify a generated app still
 * boots + authenticates + does CRUD (e.g. after dependency bumps).
 */
import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'

const storageState = join(__dirname, '.auth', 'user.json')

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : 'html',
  timeout: 60000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    },
    {
      name: 'chromium',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState
      },
      dependencies: ['setup']
    }
  ],

  // Boots the fixture app if it isn't already running on :3000.
  webServer: {
    command: 'pnpm --filter e2e-fixture-minimal dev',
    cwd: '..',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
})
