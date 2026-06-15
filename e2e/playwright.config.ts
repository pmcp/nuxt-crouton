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

// Which fixture app to boot/test (default: minimal). See e2e/helpers.ts.
const fixture = process.env.E2E_FIXTURE || 'minimal'

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

  // Boots the active fixture app if it isn't already running on :3000.
  webServer: {
    command: `pnpm --filter e2e-fixture-${fixture} dev`,
    cwd: '..',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    // Generous: a cold `nuxt dev` first build in CI can take a while.
    timeout: 180000
  }
})
