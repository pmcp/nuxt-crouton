/**
 * i18n locale-switch smoke — proves crouton-i18n's locale switching still works,
 * not just that the package loads.
 *
 * crouton-i18n is bundled by core, so every fixture already *boots* it — but
 * nothing asserts it *behaves*. A broken LanguageSwitcher, a stuck locale, or
 * missing-key fallthrough would pass every other spec. This one flips locale
 * through the package-owned switcher (a Nuxt UI USelect) and asserts a known UI
 * string changes language; if locale state regresses, the target string never
 * appears and this goes red.
 *
 * Fixture-agnostic: driven entirely by the active fixture's manifest `i18n`
 * block. Fixtures with a single locale omit it and register no test here.
 * Uses the saved auth state (the switcher + the asserted string live on the
 * authenticated home page).
 */
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { surfaceUrl, fixtureManifest, TEAM_FILE, FIXTURE } from './helpers'

const i18n = fixtureManifest().i18n

test.describe(`fixture "${FIXTURE}" i18n`, () => {
  // No second locale to switch to — keep the file a no-op rather than failing.
  test.skip(!i18n, 'fixture declares no i18n locale-switch check')

  let slug: string
  test.beforeAll(() => {
    slug = JSON.parse(readFileSync(TEAM_FILE, 'utf8')).slug
  })

  test('switching locale via the crouton-i18n switcher changes the UI language', async ({ page, baseURL }) => {
    const base = baseURL || 'http://localhost:3000'
    const { path, switchTo, before, after } = i18n!

    await page.goto(surfaceUrl(base, slug, path), { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    // Default locale renders the known string in its original language.
    // Generous: the dev server compiles the route on first hit.
    await expect(page.getByText(before, { exact: false }).first()).toBeVisible({ timeout: 180000 })

    // The package-owned control: crouton-i18n's LanguageSwitcher renders as a
    // Nuxt UI USelect, whose trigger is the page's locale combobox. Open it and
    // pick the target locale by its uppercase-code label.
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: new RegExp(`^${switchTo}$`, 'i') }).click()

    // The same string now renders in the target language — proof the switcher
    // drove a real locale change, not just a cosmetic select value.
    await expect(page.getByText(after, { exact: false }).first()).toBeVisible({ timeout: 60000 })
    await expect(page.getByText(before, { exact: true })).toHaveCount(0)
  })
})
