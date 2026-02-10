/**
 * Crouton E2E Auth Setup
 *
 * Handles user registration/login and saves auth state for other tests.
 * Works with any app using @crouton/auth.
 */
import { test as setup, expect } from '@playwright/test'
import { defaultConfig, waitForReady } from './helpers'

// Try to load app-specific config
let config = defaultConfig
try {
  const appConfig = require('./config')
  config = { ...defaultConfig, ...appConfig.e2eConfig }
} catch {
  // Use defaults
}

const AUTH_FILE = './e2e/.auth/user.json'
const TEST_USER = config.testUser

setup('authenticate', async ({ page }) => {
  console.log('Starting authentication setup...')

  // Go to login page
  await page.goto('/auth/login')
  await waitForReady(page)
  await page.waitForSelector('form', { timeout: 15000 })

  // Fill login form
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await expect(emailInput).toBeVisible({ timeout: 5000 })
  await emailInput.fill(TEST_USER.email)

  await expect(passwordInput).toBeVisible({ timeout: 5000 })
  await passwordInput.fill(TEST_USER.password)

  // Submit login
  const submitButton = page.getByRole('button', { name: /sign in/i })
  await submitButton.click()

  // Wait for result
  try {
    await page.waitForURL(url => !url.pathname.startsWith('/auth/'), { timeout: 15000 })
    console.log('Login successful')
  } catch {
    // Check for error - user might not exist
    const hasError = await page.locator('text=/invalid|error/i').isVisible({ timeout: 2000 }).catch(() => false)

    if (hasError) {
      console.log('User not found, registering...')
      await registerUser(page)
    } else {
      throw new Error('Login failed without clear error')
    }
  }

  // Handle onboarding (team creation) if needed
  if (page.url().includes('/onboarding') && config.multiTenant) {
    console.log('Creating team...')
    await createTeam(page)
  }

  // Verify we've left auth pages
  expect(page.url()).not.toContain('/auth/')
  console.log('Authentication complete!')

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE })
})

async function registerUser(page: any) {
  await page.goto('/auth/register')
  await waitForReady(page)
  await page.waitForSelector('form', { timeout: 15000 })

  // Fill registration form
  const nameInput = page.locator('input[type="text"], input[name="name"]').first()
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill(TEST_USER.name)
  }

  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill(TEST_USER.email)

  // Password fields (might have confirmation)
  const passwordInputs = page.locator('input[type="password"]')
  const count = await passwordInputs.count()

  if (count >= 2) {
    await passwordInputs.nth(0).fill(TEST_USER.password)
    await passwordInputs.nth(1).fill(TEST_USER.password)
  } else {
    await passwordInputs.first().fill(TEST_USER.password)
  }

  // Submit
  const registerButton = page.getByRole('button', { name: /sign up|register|create/i })
  await registerButton.click()

  // Wait for redirect
  await page.waitForURL(url => !url.pathname.startsWith('/auth/'), { timeout: 15000 })
}

async function createTeam(page: any) {
  await waitForReady(page)

  // Fill team name
  const teamInput = page.locator('input').first()
  if (await teamInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await teamInput.fill('E2E Test Team')

    const createButton = page.getByRole('button', { name: /create|continue|next/i })
    await createButton.click()

    await page.waitForURL(url => !url.pathname.startsWith('/onboarding'), { timeout: 15000 })
  }
}