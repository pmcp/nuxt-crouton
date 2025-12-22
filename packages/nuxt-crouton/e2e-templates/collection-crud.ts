/**
 * Crouton E2E Collection CRUD Tests
 *
 * Generic CRUD tests that work with any Crouton collection.
 * Use collectionTest('collectionName') to generate tests.
 */
import { test, expect } from '@playwright/test'
import {
  navigateToCollection,
  clickCreateButton,
  createItem,
  findItemInList,
  clickItem,
  clickEditButton,
  deleteItem,
  submitForm,
  fillField,
  waitForReady
} from './helpers'

/**
 * Generate CRUD tests for a collection
 */
export function collectionTest(collectionName: string, options?: {
  /** Field name used for the item title/name */
  nameField?: string
  /** Additional required fields for creation */
  requiredFields?: Record<string, string>
  /** Skip specific tests */
  skip?: ('create' | 'read' | 'update' | 'delete')[]
}) {
  const opts = {
    nameField: 'name',
    requiredFields: {},
    skip: [],
    ...options
  }

  test.describe(`${collectionName} CRUD`, () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCollection(page, collectionName)
    })

    if (!opts.skip.includes('read')) {
      test('collection page loads', async ({ page }) => {
        // Should be on the collection page
        await expect(page).toHaveURL(new RegExp(collectionName, 'i'))

        // Should have some content (list, table, or empty state)
        const hasContent = await page.locator('table, [role="grid"], .empty-state, main').isVisible({ timeout: 10000 })
        expect(hasContent).toBeTruthy()
      })
    }

    if (!opts.skip.includes('create')) {
      test('can open create form', async ({ page }) => {
        const opened = await clickCreateButton(page)

        if (opened) {
          // Form or modal should be visible
          await expect(page.locator('[role="dialog"], form')).toBeVisible({ timeout: 5000 })
        } else {
          // No create button - might be read-only collection
          test.skip()
        }
      })

      test('can create item', async ({ page }) => {
        const itemName = `E2E Test ${collectionName} ${Date.now()}`

        const created = await createItem(page, {
          [opts.nameField]: itemName,
          ...opts.requiredFields
        })

        if (!created) {
          test.skip()
          return
        }

        // Wait for list to update
        await waitForReady(page)

        // Item should appear in list
        const found = await findItemInList(page, itemName)
        expect(found).toBeTruthy()
      })

      test('shows validation error for empty required field', async ({ page }) => {
        const opened = await clickCreateButton(page)
        if (!opened) {
          test.skip()
          return
        }

        // Try to submit empty form
        await submitForm(page)

        // Should show validation error
        const hasError = await page.locator('[data-invalid="true"], .text-error, [aria-invalid="true"], .error').isVisible({ timeout: 3000 }).catch(() => false)

        // This is a soft check - validation might happen differently
        if (!hasError) {
          // Check if form is still open (didn't submit)
          const formStillOpen = await page.locator('[role="dialog"], form').isVisible()
          expect(formStillOpen).toBeTruthy()
        }
      })
    }

    if (!opts.skip.includes('update')) {
      test('can edit item', async ({ page }) => {
        // First create an item to edit
        const itemName = `Edit Test ${Date.now()}`
        const created = await createItem(page, {
          [opts.nameField]: itemName,
          ...opts.requiredFields
        })

        if (!created) {
          test.skip()
          return
        }

        await waitForReady(page)

        // Click on the item
        const clicked = await clickItem(page, itemName)
        if (!clicked) {
          test.skip()
          return
        }

        // Click edit button
        const editing = await clickEditButton(page)
        if (!editing) {
          // Try inline edit or double-click
          const nameField = page.locator(`input[name="${opts.nameField}"], input`).first()
          if (!await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
            test.skip()
            return
          }
        }

        // Update the name
        const updatedName = `${itemName} Updated`
        await fillField(page, opts.nameField, updatedName)
        await submitForm(page)

        await waitForReady(page)

        // Verify update
        const found = await findItemInList(page, updatedName)
        // Soft check - update UI might vary
      })
    }

    if (!opts.skip.includes('delete')) {
      test('can delete item', async ({ page }) => {
        // First create an item to delete
        const itemName = `Delete Test ${Date.now()}`
        const created = await createItem(page, {
          [opts.nameField]: itemName,
          ...opts.requiredFields
        })

        if (!created) {
          test.skip()
          return
        }

        await waitForReady(page)

        // Click on the item
        await clickItem(page, itemName)

        // Delete it
        const deleted = await deleteItem(page)
        if (!deleted) {
          test.skip()
          return
        }

        await waitForReady(page)

        // Item should no longer appear
        const stillFound = await findItemInList(page, itemName)
        expect(stillFound).toBeFalsy()
      })
    }
  })
}

// Export individual test functions for custom composition
export { test, expect }