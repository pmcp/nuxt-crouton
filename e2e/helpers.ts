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
import { join } from 'node:path'

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

/** Register the test user via the auth modal. Returns true if a session results. */
async function register(page: Page, base: string): Promise<boolean> {
  await page.goto(`${base}/auth/register`, { waitUntil: 'domcontentloaded' })
  const name = page.locator('input[type="text"]').first()
  await name.waitFor({ state: 'visible', timeout: 15000 })
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
  const email = page.locator('input[type="email"]')
  await email.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
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
  if (await register(page, base)) return
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
