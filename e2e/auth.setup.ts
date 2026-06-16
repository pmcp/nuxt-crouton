/**
 * Auth setup — runs before the authed specs.
 *
 * Logs in (or registers) the test user, ensures a team exists, and saves both
 * the browser storage state and the team slug for the smoke specs to reuse.
 */
import { test as setup, expect } from '@playwright/test'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { loginOrRegister, ensureTeam, isAuthenticated, AUTH_DIR, AUTH_FILE, TEAM_FILE } from './helpers'

setup('authenticate', async ({ page, baseURL }) => {
  const base = baseURL || 'http://localhost:3000'

  await loginOrRegister(page, base)
  expect(await isAuthenticated(page, base)).toBe(true)

  const slug = await ensureTeam(page, base)
  expect(slug).toBeTruthy()

  mkdirSync(AUTH_DIR, { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })

  // Drop better-auth's cookie-cache cookie from the saved state. crouton-auth
  // enables the cache (a signed `session_data` cookie, 5-min TTL); storageState
  // freezes that snapshot, but the authed specs run long after setup — the cold
  // `nuxt dev` route compile plus the auth specs easily exceed 5 min — so the
  // frozen cache goes stale and SSR resolves the reused session as logged-out
  // (the home page shows "Sign in", protected admin routes 500). With only the
  // long-lived `session_token` persisted, every spec re-validates against the DB
  // and renders authenticated regardless of how slow the run is.
  const state = JSON.parse(readFileSync(AUTH_FILE, 'utf8'))
  state.cookies = (state.cookies ?? []).filter(
    (c: { name: string }) => c.name !== 'better-auth.session_data'
  )
  writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2))

  writeFileSync(TEAM_FILE, JSON.stringify({ slug }, null, 2))
})
