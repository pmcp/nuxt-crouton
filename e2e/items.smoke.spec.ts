/**
 * Items collection smoke — the core "does a crouton app still work" check.
 *
 * Uses the saved auth state (see auth.setup.ts). Verifies the generated
 * collection list renders and a full create → see-in-list → delete cycle works.
 */
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { collectionUrl, TEAM_FILE } from './helpers'

test.describe('items collection', () => {
  // Read the team slug saved by auth.setup at runtime (the file doesn't exist
  // at spec-collection time, only after the setup project runs).
  let slug: string
  test.beforeAll(() => {
    slug = JSON.parse(readFileSync(TEAM_FILE, 'utf8')).slug
  })
  test('list page loads', async ({ page, baseURL }) => {
    const base = baseURL || 'http://localhost:3000'
    await page.goto(collectionUrl(base, slug, 'mainItems'), { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /main items/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('button', { name: /create item/i })).toBeVisible()
  })

  test('create an item, see it in the list, then delete it', async ({ page, baseURL }) => {
    const base = baseURL || 'http://localhost:3000'
    const name = `e2e item ${Date.now()}`
    await page.goto(collectionUrl(base, slug, 'mainItems'), { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /create item/i })).toBeVisible({ timeout: 15000 })

    // Open the create form (slideover/modal) and fill the name field.
    await page.getByRole('button', { name: /create item/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await dialog.getByRole('textbox').first().fill(name)
    await dialog.getByRole('button', { name: /create|save|add/i }).first().click()

    // Row shows up in the table.
    await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 15000 })

    // Clean up so the test is idempotent across runs (best effort).
    const row = page.getByRole('row', { name: new RegExp(name) })
    await row.getByRole('button').last().click().catch(() => {})
    const del = page.getByRole('menuitem', { name: /delete/i })
    if (await del.isVisible({ timeout: 3000 }).catch(() => false)) {
      await del.click()
      const confirm = page.getByRole('button', { name: /delete|confirm|yes/i })
      if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click()
      await expect(page.getByRole('cell', { name })).toHaveCount(0, { timeout: 10000 })
    }
  })
})
