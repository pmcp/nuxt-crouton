/**
 * Generic collection smoke — the core "does a crouton app still work" check.
 *
 * Fixture-agnostic: it reads the active fixture's e2e.manifest.json (set via
 * E2E_FIXTURE, default "minimal") and runs the same list + CRUD checks for
 * every collection the fixture declares. Adding a new fixture means adding a
 * manifest, not test code.
 *
 * Uses the saved auth state (see auth.setup.ts).
 */
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { collectionUrl, fixtureManifest, fillField, TEAM_FILE, FIXTURE } from './helpers'

const manifest = fixtureManifest()

test.describe(`fixture "${FIXTURE}"`, () => {
  let slug: string
  test.beforeAll(() => {
    slug = JSON.parse(readFileSync(TEAM_FILE, 'utf8')).slug
  })

  for (const collection of manifest.collections) {
    test.describe(collection.key, () => {
      test('list page loads', async ({ page, baseURL }) => {
        const base = baseURL || 'http://localhost:3000'
        await page.goto(collectionUrl(base, slug, collection.key), { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})

        // Generous timeout: the dev server compiles the route on first hit.
        await expect(page.getByRole('heading', { name: new RegExp(collection.heading, 'i') }))
          .toBeVisible({ timeout: 30000 })
        await expect(page.getByRole('table')).toBeVisible()
      })

      // Only collections that declare a `create` payload get the CRUD cycle.
      const create = collection.create
      if (create && Object.keys(create).length) {
        test('create a row, see it in the list, then delete it', async ({ page, baseURL }) => {
          const base = baseURL || 'http://localhost:3000'
          const stamp = Date.now()
          // Stamp the first text field so the row is uniquely findable.
          const fields = Object.fromEntries(
            Object.entries(create).map(([k, v], i) => [k, i === 0 ? `${v} ${stamp}` : v])
          )
          const marker = Object.values(fields)[0]

          await page.goto(collectionUrl(base, slug, collection.key), { waitUntil: 'domcontentloaded' })
          await page.waitForLoadState('networkidle').catch(() => {})
          await expect(page.getByRole('button', { name: /create|add|new/i }).first())
            .toBeVisible({ timeout: 30000 })
          await page.getByRole('button', { name: /create|add|new/i }).first().click()

          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible({ timeout: 15000 })
          // Wait for the form to actually render before filling (cold compile).
          await dialog.getByRole('textbox').first().waitFor({ state: 'visible', timeout: 15000 })
          for (const [field, value] of Object.entries(fields)) {
            await fillField(dialog, field, value)
          }
          await dialog.getByRole('button', { name: /create|save|add/i }).first().click()

          await expect(page.getByRole('cell', { name: marker })).toBeVisible({ timeout: 15000 })

          // Clean up so the run is idempotent (best effort).
          const row = page.getByRole('row', { name: new RegExp(marker) })
          await row.getByRole('button').last().click().catch(() => {})
          const del = page.getByRole('menuitem', { name: /delete/i })
          if (await del.isVisible({ timeout: 3000 }).catch(() => false)) {
            await del.click()
            const confirm = page.getByRole('button', { name: /delete|confirm|yes/i })
            if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click()
            await expect(page.getByRole('cell', { name: marker })).toHaveCount(0, { timeout: 10000 })
          }
        })
      }
    })
  }
})
