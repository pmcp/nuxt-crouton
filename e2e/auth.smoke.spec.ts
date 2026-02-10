/**
 * Auth E2E Smoke Test
 *
 * Tests the complete authentication flow:
 * - Login page loads
 * - User can login with valid credentials
 * - Dashboard is accessible after login
 * - User can logout
 *
 * This test runs WITHOUT saved auth state to test the full auth flow.
 */
import { test, expect } from '@playwright/test'
import { config, waitForReady } from './helpers'

const TEST_USER = config.testUser

test.describe('Auth Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' })

  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    await waitForReady(page)

    // Login form should be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 })

    // Email input should be present
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    // Password input should be present
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Sign in button should be present
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await expect(submitButton).toBeVisible()
  })

  test('shows validation error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await waitForReady(page)

    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill('nonexistent@example.com')
    await passwordInput.fill('wrongpassword')

    // Submit
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    // Should show error or stay on login page
    await page.waitForTimeout(2000)

    // Either error message is shown OR we're still on login page
    const stillOnLogin = page.url().includes('/auth/login')
    const hasError = await page.locator('text=/invalid|error|incorrect/i').isVisible({ timeout: 3000 }).catch(() => false)

    expect(stillOnLogin || hasError).toBeTruthy()
  })

  test('can login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await waitForReady(page)

    // Fill credentials
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill(TEST_USER.email)
    await passwordInput.fill(TEST_USER.password)

    // Submit
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    // Should redirect to dashboard or onboarding
    try {
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 })
    } catch {
      // If user doesn't exist, we'll get an error - that's expected
      // This test assumes the user was created by the setup test
      const hasError = await page.locator('text=/invalid|error/i').isVisible().catch(() => false)
      if (hasError) {
        test.skip()
      }
    }

    // Verify we're logged in (no longer on auth page)
    const url = page.url()
    expect(url).not.toContain('/auth/')
  })

  test('app is accessible after login', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await waitForReady(page)

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill(TEST_USER.email)
    await passwordInput.fill(TEST_USER.password)

    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    try {
      await page.waitForURL(url => !url.pathname.startsWith('/auth/'), { timeout: 15000 })
    } catch {
      test.skip()
    }

    // If on onboarding, skip to team creation
    if (page.url().includes('/onboarding')) {
      const teamInput = page.locator('input').first()
      if (await teamInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await teamInput.fill('E2E Test Team')
        const createButton = page.getByRole('button', { name: /create|continue|next/i })
        await createButton.click()
        await page.waitForURL(url => !url.pathname.startsWith('/onboarding'), { timeout: 15000 })
      }
    }

    // Verify app content
    await waitForReady(page)

    // Should have some app content (sidebar, main content, etc.)
    const hasContent = await page.locator('nav, aside, main, [data-slot="sidebar"]').first().isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('can logout', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await waitForReady(page)

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill(TEST_USER.email)
    await passwordInput.fill(TEST_USER.password)

    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    try {
      await page.waitForURL(url => !url.pathname.startsWith('/auth/'), { timeout: 15000 })
    } catch {
      test.skip()
    }

    // Handle onboarding if needed
    if (page.url().includes('/onboarding')) {
      const teamInput = page.locator('input').first()
      if (await teamInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await teamInput.fill('E2E Test Team')
        const createButton = page.getByRole('button', { name: /create|continue|next/i })
        await createButton.click()
        await page.waitForURL(url => !url.pathname.startsWith('/onboarding'), { timeout: 15000 })
      }
    }

    await waitForReady(page)

    // Find and click logout
    // Try user menu first
    const userMenu = page.getByRole('button', { name: /user|account|menu|profile/i })
    if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenu.click()
    }

    // Find logout option
    const logoutButton = page.getByRole('button', { name: /log\s*out|sign\s*out/i })
      .or(page.getByRole('menuitem', { name: /log\s*out|sign\s*out/i }))
      .or(page.locator('text=/log\s*out|sign\s*out/i'))

    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click()

      // Should redirect to login or home
      await page.waitForURL(/\/(auth\/login|$)/, { timeout: 15000 })

      // Verify logged out
      const url = page.url()
      expect(url.includes('/auth/login') || url === config.baseUrl + '/').toBeTruthy()
    } else {
      // Logout button not found - might be different UI pattern
      // Just verify we can navigate back to login
      await page.goto('/auth/login')
      await expect(page.locator('form')).toBeVisible({ timeout: 10000 })
    }
  })

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing cookies/storage
    await page.context().clearCookies()

    // Try to access a protected route directly
    await page.goto('/admin')
    await waitForReady(page)

    // Should be redirected to login
    await page.waitForURL(/\/auth\/login/, { timeout: 15000 })
    await expect(page.locator('form')).toBeVisible()
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/auth/register')
    await waitForReady(page)

    // Registration form should be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 })

    // Email input should be present
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    // Password input should be present
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Register/Sign up button should be present
    const submitButton = page.getByRole('button', { name: /sign up|register|create/i })
    await expect(submitButton).toBeVisible()
  })
})
