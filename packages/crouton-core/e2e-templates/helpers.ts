/**
 * Crouton E2E Test Helpers
 *
 * Reusable utilities for testing any Crouton application.
 */
import { Page, expect } from '@playwright/test'

// Default config - override with e2e/config.ts in your app
export const defaultConfig = {
  testUser: {
    name: 'E2E Test User',
    email: 'e2e-test@example.com',
    password: 'TestPassword123!'
  },
  multiTenant: true,
  baseUrl: 'http://localhost:3000'
}

/**
 * Wait for page to be ready (no pending requests)
 */
export async function waitForReady(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle').catch(() => {
    // Network idle can timeout, that's ok
  })
}

/**
 * Navigate to a collection page
 */
export async function navigateToCollection(page: Page, collectionName: string) {
  await page.goto('/')
  await waitForReady(page)

  // Try to find collection in sidebar
  const collectionLink = page.getByRole('link', { name: new RegExp(collectionName, 'i') })

  if (await collectionLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await collectionLink.click()
    await waitForReady(page)
    return true
  }

  // Try direct URL navigation
  const currentUrl = page.url()
  const teamMatch = currentUrl.match(/\/dashboard\/([^/]+)/)
  const teamSlug = teamMatch?.[1] || ''

  if (teamSlug) {
    await page.goto(`/dashboard/${teamSlug}/${collectionName}`)
  } else {
    await page.goto(`/dashboard/${collectionName}`)
  }

  await waitForReady(page)
  return true
}

/**
 * Click the create/add button to open form
 */
export async function clickCreateButton(page: Page): Promise<boolean> {
  const createButton = page.getByRole('button', { name: /create|add|new/i })

  if (await createButton.isVisible({ timeout: 10000 }).catch(() => false)) {
    await createButton.click()
    return true
  }
  return false
}

/**
 * Fill a form field by label or name
 */
export async function fillField(page: Page, fieldName: string, value: string) {
  // Try by label first
  const byLabel = page.getByLabel(new RegExp(fieldName, 'i'))
  if (await byLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await byLabel.fill(value)
    return true
  }

  // Try by name attribute
  const byName = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"]`)
  if (await byName.isVisible({ timeout: 2000 }).catch(() => false)) {
    await byName.fill(value)
    return true
  }

  // Try by placeholder
  const byPlaceholder = page.locator(`input[placeholder*="${fieldName}" i], textarea[placeholder*="${fieldName}" i]`)
  if (await byPlaceholder.isVisible({ timeout: 2000 }).catch(() => false)) {
    await byPlaceholder.fill(value)
    return true
  }

  return false
}

/**
 * Submit the current form
 */
export async function submitForm(page: Page): Promise<boolean> {
  const submitButton = page.getByRole('button', { name: /save|create|submit|add/i })

  if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitButton.click()
    await page.waitForTimeout(1000) // Wait for submission
    return true
  }
  return false
}

/**
 * Create an item in a collection
 */
export async function createItem(page: Page, fields: Record<string, string>): Promise<boolean> {
  // Open create form
  if (!await clickCreateButton(page)) {
    return false
  }

  // Wait for form/modal
  await page.waitForSelector('[role="dialog"], form', { timeout: 5000 }).catch(() => {})

  // Fill fields
  for (const [name, value] of Object.entries(fields)) {
    await fillField(page, name, value)
  }

  // Submit
  return await submitForm(page)
}

/**
 * Find an item in the list by text
 */
export async function findItemInList(page: Page, text: string): Promise<boolean> {
  const item = page.locator(`text=${text}`)
  return await item.isVisible({ timeout: 5000 }).catch(() => false)
}

/**
 * Click an item in the list to open it
 */
export async function clickItem(page: Page, text: string): Promise<boolean> {
  const item = page.locator(`text=${text}`).first()

  if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
    await item.click()
    await waitForReady(page)
    return true
  }
  return false
}

/**
 * Click the edit button for the current item
 */
export async function clickEditButton(page: Page): Promise<boolean> {
  const editButton = page.getByRole('button', { name: /edit/i })

  if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await editButton.click()
    return true
  }
  return false
}

/**
 * Click the delete button and confirm
 */
export async function deleteItem(page: Page): Promise<boolean> {
  const deleteButton = page.getByRole('button', { name: /delete|remove/i })

  if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await deleteButton.click()

    // Look for confirmation dialog
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i })
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click()
    }

    await page.waitForTimeout(1000)
    return true
  }
  return false
}

/**
 * Get the current team slug from URL
 */
export function getTeamSlug(page: Page): string | null {
  const url = page.url()
  const match = url.match(/\/dashboard\/([^/]+)/)
  return match?.[1] || null
}

/**
 * Check if we're on a specific page type
 */
export async function isOnPage(page: Page, pageType: 'list' | 'detail' | 'form'): Promise<boolean> {
  switch (pageType) {
    case 'list':
      return await page.locator('table, [role="grid"], .collection-list').isVisible({ timeout: 3000 }).catch(() => false)
    case 'detail':
      return await page.locator('[data-slot="content"], .item-detail').isVisible({ timeout: 3000 }).catch(() => false)
    case 'form':
      return await page.locator('form, [role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false)
    default:
      return false
  }
}
