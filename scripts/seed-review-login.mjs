#!/usr/bin/env node
/**
 * seed-review-login.mjs — seed a throwaway, loginable test account on a fresh
 * preview deploy so a reviewer can open the URL and be inside the app in one step
 * (#608). Drives the app's OWN HTTP auth on the deployed Worker — no raw SQL, so
 * the password is hashed by better-auth exactly like a real signup.
 *
 *   node scripts/seed-review-login.mjs --url https://app-staging.workers.dev \
 *     --email review+app-pr12@example.com --password <pw> [--team "Review Team"]
 *
 * Flow (all via the public auth routes the browser uses):
 *   1. POST /api/auth/sign-up/email   (autoSignIn → session cookie). An existing
 *      user (redeploy) returns USER_ALREADY_EXISTS → treated as already-seeded.
 *   2. GET  /api/auth/get-session     → if there's no active organization (the
 *      allowCreate pattern that otherwise drops you at a "create team" wall),
 *   3. POST /api/auth/organization/create + /set-active so the reviewer lands
 *      INSIDE the app. Apps with autoCreateOnSignup / defaultTeamSlug already
 *      have an active org from the signup hooks → this is skipped.
 *
 * Best-effort by contract: this NEVER throws a non-zero exit for an auth-level
 * problem (it prints a warning and exits 0) so a seed hiccup can't fail a deploy.
 * Only a usage error (missing --url/--email/--password) exits non-zero.
 *
 * Staging only — the caller (deploy-app.yml) gates this to environment != production.
 */

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--url') out.url = argv[++i]
    else if (a === '--email') out.email = argv[++i]
    else if (a === '--password') out.password = argv[++i]
    else if (a === '--name') out.name = argv[++i]
    else if (a === '--team') out.team = argv[++i]
  }
  return out
}

function warn(msg) {
  console.warn(`[seed-review-login] ⚠ ${msg}`)
}
function info(msg) {
  console.log(`[seed-review-login] ${msg}`)
}

/** Collect Set-Cookie headers into a single Cookie request header value. */
function mergeCookies(existing, res) {
  const jar = new Map()
  for (const [k, v] of existing) jar.set(k, v)
  // Node's fetch exposes multiple Set-Cookie via getSetCookie() (undici).
  const setCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  for (const sc of setCookies) {
    const pair = sc.split(';')[0]
    const eq = pair.indexOf('=')
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
  }
  return jar
}

function cookieHeader(jar) {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { url, email, password } = args
  if (!url || !email || !password) {
    console.error('Usage: seed-review-login.mjs --url <deployedUrl> --email <e> --password <p> [--name <n>] [--team <t>]')
    process.exit(2)
  }

  let origin
  try {
    origin = new URL(url).origin
  } catch {
    warn(`invalid --url "${url}" — skipping seed.`)
    process.exit(0)
  }
  const base = origin
  const name = args.name || 'Review Tester'
  const teamName = args.team || 'Review Team'

  // better-auth checks the Origin header against trusted origins for state-changing
  // requests; the deployed origin is always trusted (createAuth trusts the request's
  // own origin), so set it explicitly for these server-to-server calls.
  const headers = { 'content-type': 'application/json', origin }
  let jar = new Map()

  async function post(path, body) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { ...headers, ...(jar.size ? { cookie: cookieHeader(jar) } : {}) },
      body: JSON.stringify(body),
      redirect: 'manual'
    })
    jar = mergeCookies(jar, res)
    let json = null
    try { json = await res.json() } catch { /* non-JSON body */ }
    return { res, json }
  }

  async function get(path) {
    const res = await fetch(`${base}${path}`, {
      headers: { origin, ...(jar.size ? { cookie: cookieHeader(jar) } : {}) }
    })
    jar = mergeCookies(jar, res)
    let json = null
    try { json = await res.json() } catch { /* non-JSON body */ }
    return { res, json }
  }

  // 1. Sign up (autoSignIn returns a session cookie on success).
  let signedUp = false
  try {
    const { res, json } = await post('/api/auth/sign-up/email', { name, email, password })
    if (res.ok) {
      signedUp = true
      info(`signed up ${email}`)
    } else {
      const code = json?.code || json?.message || `HTTP ${res.status}`
      if (res.status === 422 || /USER_ALREADY_EXISTS|already exists/i.test(String(code))) {
        info(`user ${email} already exists — already seeded, reusing.`)
        // Re-establish a session for the org check below.
        const { res: si } = await post('/api/auth/sign-in/email', { email, password })
        if (!si.ok) {
          info('existing user present; could not re-sign-in (password may differ) — login still works for the reviewer.')
          process.exit(0)
        }
      } else {
        warn(`sign-up failed (${code}) — skipping. The reviewer can still register manually.`)
        process.exit(0)
      }
    }
  } catch (e) {
    warn(`sign-up request error: ${e?.message || e} — skipping.`)
    process.exit(0)
  }

  // 2. Does the session already have an active organization? (autoCreateOnSignup /
  //    defaultTeamSlug apps do; the allowCreate pattern does not.)
  let hasActiveOrg = false
  try {
    const { json } = await get('/api/auth/get-session')
    hasActiveOrg = !!json?.session?.activeOrganizationId
    if (hasActiveOrg) info('session already has an active team — no team creation needed.')
  } catch (e) {
    warn(`get-session error: ${e?.message || e}`)
  }

  // 3. No active org → create one so the reviewer lands inside the app, not at a wall.
  if (signedUp && !hasActiveOrg) {
    const slug = `review-${Math.random().toString(36).slice(2, 8)}`
    try {
      const { res, json } = await post('/api/auth/organization/create', { name: teamName, slug })
      if (res.ok) {
        const orgId = json?.id || json?.organization?.id
        info(`created team "${teamName}" (${slug})`)
        if (orgId) {
          const { res: sa } = await post('/api/auth/organization/set-active', { organizationId: orgId })
          if (sa.ok) info('set new team active for the session.')
        }
      } else {
        // 403 = app forbids user-created orgs (default-team pattern); the user is
        // already attached to the default org, so this is harmless.
        info(`team auto-create skipped (HTTP ${res.status}) — app likely uses a default/auto team.`)
      }
    } catch (e) {
      warn(`team create error: ${e?.message || e} — login still works; reviewer may need to pick a team.`)
    }
  }

  info('done.')
  process.exit(0)
}

main()
