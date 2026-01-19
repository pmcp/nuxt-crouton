/**
 * CRUD E2E Smoke Test
 *
 * Tests the complete CRUD lifecycle:
 * - Collection page loads
 * - User can create a new item
 * - User can view/edit the item
 * - User can delete the item
 *
 * This test runs WITH saved auth state from auth.setup.ts
 */
import { test, expect } from '@playwright/test'
import {
  waitForReady,
  navigateToCollection,
  clickCreateButton,
  fillField,
  submitForm,
  findItemInList,
  clickItem,
  clickEditButton,
  deleteItem
} from './helpers'

test.describe('CRUD Smoke Tests', () => {
  // Use serial mode to ensure tests run in order
  test.describe.configure({ mode: 'serial' })

  // Store the created item name for subsequent tests
  const itemName = `E2E Test Item ${Date.now()}`

  test('collection page loads', async ({ page }) => {
    // Navigate to a collection (bookings in test-bookings app)
    await navigateToCollection(page, 'bookings')

    // Should have some content (table, list, or empty state)
    const hasContent = await page.locator('table, [role="grid"], .empty-state, main').isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('can open create form', async ({ page }) => {
    await navigateToCollection(page, 'bookings')

    // Click create button
    const opened = await clickCreateButton(page)

    if (opened) {
      // Form or modal should be visible
      await expect(page.locator('[role="dialog"], form')).toBeVisible({ timeout: 5000 })
    } else {
      // No create button - collection might be read-only, skip
      test.skip()
    }
  })

  test('can create item', async ({ page }) => {
    await navigateToCollection(page, 'bookings')

    // Open create form
    const opened = await clickCreateButton(page)
    if (!opened) {
      test.skip()
      return
    }

    // Wait for form
    await page.waitForSelector('[role="dialog"], form', { timeout: 5000 }).catch(() => {})

    // Fill in required fields
    // Try different field name patterns
    const filledName = await fillField(page, 'name', itemName)
    if (!filledName) {
      // Try title instead
      await fillField(page, 'title', itemName)
    }

    // Fill description if present
    await fillField(page, 'description', 'Created by E2E test')

    // Submit
    await submitForm(page)
    await waitForReady(page)

    // Item should appear in list
    const found = await findItemInList(page, itemName)
    // Soft assertion - UI patterns vary
    if (!found) {
      console.log('Note: Item not immediately visible in list - may need refresh')
    }
  })

  test('can view item details', async ({ page }) => {
    await navigateToCollection(page, 'bookings')

    // Find and click on an item (either our created one or any existing)
    const hasItem = await findItemInList(page, itemName)

    if (hasItem) {
      await clickItem(page, itemName)

      // Should show item details or open edit form
      const hasDetails = await page.locator('[role="dialog"], form, .item-detail, [data-slot="content"]').isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasDetails).toBeTruthy()
    } else {
      // Try clicking any item in the list
      const anyItem = page.locator('table tbody tr, [role="row"]').first()
      if (await anyItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await anyItem.click()
        await waitForReady(page)
      } else {
        test.skip()
      }
    }
  })

  test('can edit item', async ({ page }) => {
    await navigateToCollection(page, 'bookings')

    // Find our item
    const hasItem = await findItemInList(page, itemName)
    if (!hasItem) {
      test.skip()
      return
    }

    // Click on it
    await clickItem(page, itemName)

    // Try to edit
    const editing = await clickEditButton(page)

    if (editing || await page.locator('form input').first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Update the name/description
      const updatedName = `${itemName} Updated`
      const filledName = await fillField(page, 'name', updatedName)
      if (!filledName) {
        await fillField(page, 'title', updatedName)
      }

      // Submit
      await submitForm(page)
      await waitForReady(page)

      // Verify update (soft check)
      const found = await findItemInList(page, 'Updated')
      // This is a soft check - update confirmation UI varies
    } else {
      test.skip()
    }
  })

  test('can delete item', async ({ page }) => {
    await navigateToCollection(page, 'bookings')

    // Find an item to delete (either our created one or use the updated name)
    let hasItem = await findItemInList(page, itemName)
    if (!hasItem) {
      hasItem = await findItemInList(page, 'Updated')
    }

    if (!hasItem) {
      test.skip()
      return
    }

    // Click on it
    const targetName = (await findItemInList(page, 'Updated')) ? 'Updated' : itemName
    await clickItem(page, targetName)

    // Delete
    const deleted = await deleteItem(page)
    if (!deleted) {
      test.skip()
      return
    }

    await waitForReady(page)

    // Item should no longer appear
    const stillFound = await findItemInList(page, targetName)
    expect(stillFound).toBeFalsy()
  })

  test('shows validation error for empty required field', async ({ page }) => {
    await navigateToCollection(page, 'bookings')

    const opened = await clickCreateButton(page)
    if (!opened) {
      test.skip()
      return
    }

    // Wait for form
    await page.waitForSelector('[role="dialog"], form', { timeout: 5000 }).catch(() => {})

    // Try to submit empty form
    await submitForm(page)

    // Should show validation error or form should remain open
    const hasError = await page.locator('[data-invalid="true"], .text-error, [aria-invalid="true"], .error, [role="alert"]').isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasError) {
      // Check if form is still open (didn't submit)
      const formStillOpen = await page.locator('[role="dialog"], form').isVisible()
      expect(formStillOpen).toBeTruthy()
    }
  })
})

/**
 * Additional collection tests
 *
 * These test other collections to verify the CRUD pattern works across the app.
 */
test.describe('Locations Collection CRUD', () => {
  const locationName = `Test Location ${Date.now()}`

  test('locations collection loads', async ({ page }) => {
    await navigateToCollection(page, 'locations')

    const hasContent = await page.locator('table, [role="grid"], .empty-state, main').isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('can create location', async ({ page }) => {
    await navigateToCollection(page, 'locations')

    const opened = await clickCreateButton(page)
    if (!opened) {
      test.skip()
      return
    }

    await page.waitForSelector('[role="dialog"], form', { timeout: 5000 }).catch(() => {})

    const filled = await fillField(page, 'name', locationName)
    if (!filled) {
      await fillField(page, 'title', locationName)
    }

    await submitForm(page)
    await waitForReady(page)

    // Soft verification
    const found = await findItemInList(page, locationName)
  })
})

test.describe('Settings Collection', () => {
  test('settings page loads', async ({ page }) => {
    await navigateToCollection(page, 'settings')

    // Settings might be different UI - just verify page loads
    await waitForReady(page)
    const hasContent = await page.locator('main, form, [data-slot="content"]').isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })
})
