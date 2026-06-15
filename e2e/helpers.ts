/**
 * Crouton E2E Helpers
 *
 * Drives current crouton-auth (modal-based) against a fixture app:
 *   - login/register happen in a RouteModal overlay (no dedicated form page)
 *   - signup does NOT auto-create a team; we create one via the better-auth org API
 *
 * Target: fixtures/minimal (pkg "e2e-fixture-minimal").
 */
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Which fixture app the run targets. Each fixture is a generated crouton app
 * under fixtures/<name> (pkg "e2e-fixture-<name>") exercising a different set
 * of packages. Defaults to the minimal fixture.
 */
export const FIXTURE = process.env.E2E_FIXTURE || 'minimal'
export const FIXTURE_PKG = `e2e-fixture-${FIXTURE}`

/** One collection the smoke should exercise on the active fixture. */
export interface CollectionSpec {
  /** Registered collection key, e.g. "mainItems" (the /admin/:team/crouton/:key segment). */
  key: string
  /** Visible list heading, e.g. "Main Items". */
  heading: string
  /** Field label/name -> value to fill when creating a row (text fields only). */
  create?: Record<string, string>
}

export interface FixtureManifest {
  collections: CollectionSpec[]
}

/** Read the active fixture's e2e manifest (what to smoke). */
export function fixtureManifest(): FixtureManifest {
  const path = join(__dirname, '..', 'fixtures', FIXTURE, 'e2e.manifest.json')
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureManifest
}

// Saved-state paths, anchored to this e2e/ dir so setup-write and spec/config-read
// always agree regardless of the cwd Playwright is invoked from.
export const AUTH_DIR = join(__dirname, '.auth')
export const AUTH_FILE = join(AUTH_DIR, 'user.json')
export const TEAM_FILE = join(AUTH_DIR, 'team.json')

export const config = {
  testUser: {
    name: 'E2E User',
    email: 'e2e-user@example.com',
    password: 'TestPassword123!'
  },
  team: {
    name: 'E2E Team',
    slug: 'e2e-team'
  }
}

/** Better-auth blocks state-changing requests without an Origin header (CSRF). */
function authHeaders(base: string) {
  return { Origin: base, Referer: `${base}/` }
}

/** True when a session exists for the current browser context. */
export async function isAuthenticated(page: Page, base: string): Promise<boolean> {
  const res = await page.request.get(`${base}/api/auth/get-session`).catch(() => null)
  if (!res || !res.ok()) return false
  const session = await res.json().catch(() => null)
  return !!session?.user
}

// Cold dev-server compiles the auth modal on first hit — be patient.
const MODAL_TIMEOUT = 30000

/** Register the test user via the auth modal. Returns true if a session results. */
async function register(page: Page, base: string): Promise<boolean> {
  await page.goto(`${base}/auth/register`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const name = page.locator('input[type="text"]').first()
  await name.waitFor({ state: 'visible', timeout: MODAL_TIMEOUT })
  await name.fill(config.testUser.name)
  await page.locator('input[type="email"]').fill(config.testUser.email)
  const pw = page.locator('input[type="password"]')
  await pw.nth(0).fill(config.testUser.password)
  await pw.nth(1).fill(config.testUser.password)
  await page.getByRole('button', { name: /create account/i }).first().click()
  await page.waitForTimeout(2500)
  return isAuthenticated(page, base)
}

/** Log the test user in via the auth modal. Returns true if a session results. */
async function login(page: Page, base: string): Promise<boolean> {
  await page.goto(`${base}/auth/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const email = page.locator('input[type="email"]')
  await email.waitFor({ state: 'visible', timeout: MODAL_TIMEOUT }).catch(() => {})
  if (!(await email.isVisible().catch(() => false))) return false
  await email.fill(config.testUser.email)
  await page.locator('input[type="password"]').first().fill(config.testUser.password)
  await page.getByRole('button', { name: /sign in/i }).first().click()
  await page.waitForTimeout(2500)
  return isAuthenticated(page, base)
}

/** Ensure the test user exists and is logged in (login first, register on miss). */
export async function loginOrRegister(page: Page, base: string): Promise<void> {
  if (await isAuthenticated(page, base)) return
  if (await login(page, base)) return
  // User may not exist yet — register. If registration is rejected (already
  // exists), fall back to one more login attempt.
  if (await register(page, base)) return
  if (await login(page, base)) return
  throw new Error('Could not authenticate test user (login and register both failed)')
}

/**
 * Ensure the active session has a team (organization) and return its slug.
 * Signup creates no team, so we create one via the better-auth org API if absent.
 */
export async function ensureTeam(page: Page, base: string): Promise<string> {
  const headers = authHeaders(base)

  const listRes = await page.request.get(`${base}/api/auth/organization/list`, { headers })
  const orgs = listRes.ok() ? await listRes.json().catch(() => []) : []
  let org = Array.isArray(orgs) ? orgs[0] : null

  if (!org) {
    const createRes = await page.request.post(`${base}/api/auth/organization/create`, {
      headers,
      data: { name: config.team.name, slug: config.team.slug }
    })
    if (!createRes.ok()) {
      throw new Error(`Failed to create team: ${createRes.status()} ${await createRes.text()}`)
    }
    org = await createRes.json()
  }

  await page.request.post(`${base}/api/auth/organization/set-active`, {
    headers,
    data: { organizationId: org.id }
  })

  return org.slug as string
}

/** Build the admin URL for a generated collection (key, e.g. "mainItems"). */
export function collectionUrl(base: string, teamSlug: string, collectionKey: string): string {
  return `${base}/admin/${teamSlug}/crouton/${collectionKey}`
}

/**
 * Fill a form field within a scope (e.g. the create dialog), trying label,
 * then name attribute, then placeholder. Used by the generic create flow.
 */
export async function fillField(scope: Page | ReturnType<Page['getByRole']>, field: string, value: string): Promise<void> {
  const byLabel = scope.getByLabel(new RegExp(`^${field}$`, 'i'))
  if (await byLabel.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await byLabel.first().fill(value)
    return
  }
  const byName = scope.locator(`input[name="${field}" i], textarea[name="${field}" i]`)
  if (await byName.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await byName.first().fill(value)
    return
  }
  const byPlaceholder = scope.locator(`input[placeholder*="${field}" i], textarea[placeholder*="${field}" i]`)
  if (await byPlaceholder.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await byPlaceholder.first().fill(value)
    return
  }
  throw new Error(`Could not find form field "${field}"`)
}
