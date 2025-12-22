import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = './e2e/.auth/user.json'

// Test user credentials
const TEST_USER = {
  name: 'E2E Test User',
  email: 'e2e-test@example.com',
  password: 'TestPassword123!'
}

setup('authenticate', async ({ page }) => {
  // Go directly to login page
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  // Wait for form to be visible
  await page.waitForSelector('form', { timeout: 10000 })

  // Get email input - UAuthForm uses input with type="email"
  const emailInput = page.locator('input[type="email"]')
  await expect(emailInput).toBeVisible({ timeout: 5000 })
  await emailInput.fill(TEST_USER.email)

  // Get password input
  const passwordInput = page.locator('input[type="password"]')
  await expect(passwordInput).toBeVisible({ timeout: 5000 })
  await passwordInput.fill(TEST_USER.password)

  // Click the submit button
  const submitButton = page.getByRole('button', { name: /sign in/i })
  await expect(submitButton).toBeVisible({ timeout: 5000 })
  await submitButton.click()

  // Wait for either redirect or error message
  try {
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 })
  } catch {
    // Check if we got an error (user doesn't exist)
    const hasError = await page.locator('text=/invalid|error/i').isVisible({ timeout: 1000 }).catch(() => false)

    if (hasError) {
      // User doesn't exist, register first
      console.log('User not found, registering...')
      await page.goto('/auth/register')
      await page.waitForLoadState('networkidle')

      // Fill registration form
      const nameInput = page.locator('input[type="text"], input[name="name"]').first()
      await nameInput.fill(TEST_USER.name)

      const regEmailInput = page.locator('input[type="email"]')
      await regEmailInput.fill(TEST_USER.email)

      // Password field (first one) and confirm password (second one)
      const passwordInputs = page.locator('input[type="password"]')
      await passwordInputs.nth(0).fill(TEST_USER.password)
      await passwordInputs.nth(1).fill(TEST_USER.password)

      // Submit registration
      const registerButton = page.getByRole('button', { name: /sign up|register|create/i })
      await registerButton.click()

      // Wait for redirect
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 })
    } else {
      throw new Error('Login failed without clear error')
    }
  }

  // If we're on onboarding, create a team
  if (page.url().includes('/onboarding')) {
    console.log('Creating team...')
    await page.waitForLoadState('networkidle')

    // Fill team name
    const teamInput = page.locator('input').first()
    await teamInput.fill('E2E Test Team')

    // Submit
    const createButton = page.getByRole('button', { name: /create|continue|next/i })
    await createButton.click()

    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  }

  // Verify we're authenticated and on dashboard
  await expect(page).toHaveURL(/\/dashboard/)
  console.log('Authentication successful!')

  // Save authentication state
  await page.context().storageState({ path: AUTH_FILE })
})
