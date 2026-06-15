/**
 * Auth setup — runs before the authed specs.
 *
 * Logs in (or registers) the test user, ensures a team exists, and saves both
 * the browser storage state and the team slug for the smoke specs to reuse.
 */
import { test as setup, expect } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { loginOrRegister, ensureTeam, isAuthenticated, AUTH_DIR, AUTH_FILE, TEAM_FILE } from './helpers'

setup('authenticate', async ({ page, baseURL }) => {
  const base = baseURL || 'http://localhost:3000'

  await loginOrRegister(page, base)
  expect(await isAuthenticated(page, base)).toBe(true)

  const slug = await ensureTeam(page, base)
  expect(slug).toBeTruthy()

  mkdirSync(AUTH_DIR, { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
  writeFileSync(TEAM_FILE, JSON.stringify({ slug }, null, 2))
})
