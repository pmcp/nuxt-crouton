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
  /**
   * Field label/name -> value for the edit step. Omit to derive it: the first
   * create field gets " edited" appended (enough to prove an update persists).
   */
  update?: Record<string, string>
  /**
   * Name of a required field to clear for the invalid-submit check. Set it only
   * when the field is actually required (so validation blocks the submit);
   * omit to skip that check for this collection.
   */
  requiredField?: string
}

/**
 * A package-specific surface to smoke beyond generic collection CRUD — e.g. the
 * pages package's own `/admin/:team/workspace`. Lets a fixture assert that the
 * package it exercises actually mounts its UI, not just that the app still boots.
 */
export interface SurfaceSpec {
  /** Human label for the test title, e.g. "pages workspace". */
  name: string
  /** Route to visit. `{team}` is replaced with the active team slug. */
  path: string
  /** What must be visible for the surface to count as working. At least one. */
  expect: {
    /** CSS selector that must be visible, e.g. "#pages-sidebar". */
    visible?: string
    /** Visible heading (role=heading) name, matched case-insensitively. */
    heading?: string
  }
}

/**
 * A locale-switch check exercising the crouton-i18n LanguageSwitcher. A plain
 * `surface` can only assert a static element renders; this one *interacts* —
 * flips locale via the package-owned switcher and asserts a known UI string
 * changes language — so an i18n regression (broken switcher, stuck locale,
 * missing-key fallthrough) goes red. Needs a fixture with ≥2 configured locales.
 */
export interface I18nSpec {
  /** Page that renders the switcher + a translated string. `{team}` is substituted. */
  path: string
  /** Switcher option to pick — the uppercase locale code label, e.g. "NL". */
  switchTo: string
  /** A known translated string visible in the *default* locale (before switching). */
  before: string
  /** The same string in the *target* locale (visible after switching). */
  after: string
}

export interface FixtureManifest {
  collections: CollectionSpec[]
  /** Optional package-specific surfaces; omit for fixtures with nothing extra. */
  surfaces?: SurfaceSpec[]
  /** Optional locale-switch check; omit for fixtures with a single locale. */
  i18n?: I18nSpec
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

/**
 * The current better-auth session payload (`{ user, session }`) or null.
 *
 * crouton-auth enables better-auth's cookie cache (a signed `session_data`
 * cookie, 5-min TTL), so the default get-session can report a *stale* user for
 * up to 5 min after sign-out. We pass `disableCookieCache=true` to force a DB
 * read, so this always reflects the true session state — essential for the auth
 * smoke to observe logout.
 */
export async function getSession(page: Page, base: string): Promise<any | null> {
  const res = await page.request
    .get(`${base}/api/auth/get-session?disableCookieCache=true`)
    .catch(() => null)
  if (!res || !res.ok()) return null
  return res.json().catch(() => null)
}

/** True when a session exists for the current browser context. */
export async function isAuthenticated(page: Page, base: string): Promise<boolean> {
  const session = await getSession(page, base)
  return !!session?.user
}

/**
 * Sign the active session out. Clears the context's session cookie.
 *
 * Passes an empty JSON body so Playwright sets `Content-Type: application/json`
 * — better-auth rejects the POST with 415 otherwise (it requires that header).
 */
export async function signOut(page: Page, base: string): Promise<void> {
  await page.request.post(`${base}/api/auth/sign-out`, { headers: authHeaders(base), data: {} })
}

/** The active organization (team) id on the current session, or null. */
export async function activeTeamId(page: Page, base: string): Promise<string | null> {
  const session = await getSession(page, base)
  return session?.session?.activeOrganizationId ?? null
}

/** Create an organization (team) and return it. Needs an Origin header (CSRF). */
export async function createTeam(page: Page, base: string, name: string, slug: string): Promise<{ id: string; slug: string }> {
  const res = await page.request.post(`${base}/api/auth/organization/create`, {
    headers: authHeaders(base),
    data: { name, slug }
  })
  if (!res.ok()) throw new Error(`Failed to create team: ${res.status()} ${await res.text()}`)
  return res.json()
}

/** Make an organization (team) the active one for the session. */
export async function setActiveTeam(page: Page, base: string, organizationId: string): Promise<void> {
  await page.request.post(`${base}/api/auth/organization/set-active`, {
    headers: authHeaders(base),
    data: { organizationId }
  })
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
  const listRes = await page.request.get(`${base}/api/auth/organization/list`, { headers: authHeaders(base) })
  const orgs = listRes.ok() ? await listRes.json().catch(() => []) : []
  const org = (Array.isArray(orgs) ? orgs[0] : null)
    ?? await createTeam(page, base, config.team.name, config.team.slug)

  await setActiveTeam(page, base, org.id)
  return org.slug as string
}

/** Build the admin URL for a generated collection (key, e.g. "mainItems"). */
export function collectionUrl(base: string, teamSlug: string, collectionKey: string): string {
  return `${base}/admin/${teamSlug}/crouton/${collectionKey}`
}

/** Resolve a surface path against the base URL, substituting `{team}`. */
export function surfaceUrl(base: string, teamSlug: string, path: string): string {
  return `${base}${path.replace('{team}', teamSlug)}`
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
