import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders form correctly', async ({ browser }) => {
    // Create fresh context without stored auth
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    await page.goto('/auth/login')
    await page.waitForLoadState('domcontentloaded')

    // Wait for form to be ready
    await page.waitForSelector('form', { timeout: 15000 })

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test('register page renders form correctly', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    await page.goto('/auth/register')
    await page.waitForLoadState('domcontentloaded')

    // Wait for form to be ready
    await page.waitForSelector('form', { timeout: 15000 })

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /sign up|create|register/i })).toBeVisible({ timeout: 10000 })

    await context.close()
  })
})
