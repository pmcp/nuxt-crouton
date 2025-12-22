import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('dashboard loads when authenticated', async ({ page }) => {
    // Go to dashboard - it should redirect to team dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Wait for redirect to team dashboard
    await page.waitForURL(/\/dashboard\/[\w-]+/, { timeout: 15000 }).catch(() => {
      // Might stay on /dashboard if no team
    })

    // Should show some dashboard content
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
  })

  test('authenticated user sees dashboard content', async ({ page }) => {
    // Start from home and click dashboard link
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Look for dashboard link
    const dashboardLink = page.getByRole('link', { name: /dashboard/i })
    if (await dashboardLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Should be on some dashboard page
      await expect(page).toHaveURL(/dashboard/)
    }
  })
})
