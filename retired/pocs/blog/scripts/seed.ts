#!/usr/bin/env node
/**
 * seed.ts — provision a known admin login for the blog POC so a freshly
 * deployed preview (or local dev DB) is immediately testable *with auth*.
 *
 * The `crouton-seed` CLI seeds package demo data behind `--with-staff`, but its
 * staff credentials aren't tunable to a per-POC admin. This standalone seeder
 * upserts the exact admin the deploy workstream documents:
 *
 *   email:    admin@blog.pmcp.dev
 *   password: Admin1234!
 *
 * It mirrors `@fyit/crouton-auth/seed` exactly — better-auth `user` + credential
 * `account` (password hashed with better-auth's own scrypt helper, so login
 * verifies) + the `blog` team `organization` + an owner `member` — then pipes
 * idempotent `INSERT … ON CONFLICT(id) DO UPDATE` SQL to `wrangler d1 execute`.
 * Stable ids make re-runs upsert in place (never duplicate).
 *
 * Usage (chained from package.json):
 *   pnpm db:seed                 # local  → wrangler d1 execute --local
 *   pnpm db:seed:remote          # remote → wrangler d1 execute --remote
 *   pnpm db:seed:staging         # staging env, remote
 *
 * Direct:
 *   tsx scripts/seed.ts --db blog-db
 *   tsx scripts/seed.ts --db blog-staging-db --remote --env staging
 *   tsx scripts/seed.ts --db blog-db --dry-run   # print SQL, don't execute
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from 'better-auth/crypto'
import { buildUpsert, seedId } from '@fyit/crouton-core/shared/seed'

// ── Args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
function flag(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  if (i === -1) return undefined
  const next = argv[i + 1]
  return next && !next.startsWith('--') ? next : 'true'
}

const db = flag('db')
const remote = argv.includes('--remote')
const env = flag('env') // e.g. 'staging' — selects the wrangler env's binding
const dryRun = argv.includes('--dry-run')

if (!db) {
  console.error('✗ --db <name> is required (e.g. --db blog-db)')
  process.exit(1)
}

// ── The admin to provision ────────────────────────────────────────────────────
const ADMIN = {
  email: 'admin@blog.pmcp.dev',
  name: 'Blog Admin',
  password: 'Admin1234!'
}
const TEAM = { slug: 'blog', name: 'Blog' } // matches croutonAuth.teams.defaultTeamSlug

// Deterministic, namespace-derived ids → idempotent upserts.
const teamId = `seed:org:${TEAM.slug}`
const userId = `seed:user:${ADMIN.email}`
const accountId = `seed:account:${ADMIN.email}`
const memberId = `seed:member:${TEAM.slug}:${ADMIN.email}`

const sqlStr = (v: string) => `'${v.replace(/'/g, "''")}'`

async function buildSql(): Promise<string> {
  // better-auth stores a scrypt envelope in account.password — hash with its own
  // helper so the seeded credential verifies on login.
  const passwordHash = await hashPassword(ADMIN.password)
  const now = Date.now() // integer timestamp columns store epoch ms

  // organization — the team every membership hangs off.
  const organization = `INSERT INTO organization (id, name, slug, isDefault, personal, createdAt)
VALUES (${sqlStr(teamId)}, ${sqlStr(TEAM.name)}, ${sqlStr(TEAM.slug)}, 0, 0, ${now})
ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug;`

  // user — the admin identity.
  const user = `INSERT INTO user (id, name, email, emailVerified, role, createdAt, updatedAt)
VALUES (${sqlStr(userId)}, ${sqlStr(ADMIN.name)}, ${sqlStr(ADMIN.email)}, 1, ${sqlStr('user')}, ${now}, ${now})
ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, emailVerified = excluded.emailVerified, updatedAt = excluded.updatedAt;`

  // account — credential (email/password). providerId 'credential', accountId
  // === userId is the better-auth convention for email/password.
  const account = `INSERT INTO account (id, userId, accountId, providerId, password, createdAt, updatedAt)
VALUES (${sqlStr(accountId)}, ${sqlStr(userId)}, ${sqlStr(userId)}, ${sqlStr('credential')}, ${sqlStr(passwordHash)}, ${now}, ${now})
ON CONFLICT(id) DO UPDATE SET password = excluded.password, updatedAt = excluded.updatedAt;`

  // member — owner membership of the blog team.
  const member = `INSERT INTO member (id, userId, organizationId, role, createdAt)
VALUES (${sqlStr(memberId)}, ${sqlStr(userId)}, ${sqlStr(teamId)}, ${sqlStr('owner')}, ${now})
ON CONFLICT(id) DO UPDATE SET role = excluded.role;`

  return [organization, user, account, member].join('\n\n')
}

/**
 * Seed the app's generated collections from their editable seed.json fixtures
 * (#298). The standard `crouton-seed` runner does this, but the blog uses this
 * bespoke admin seeder instead — and `crouton-seed` over-discovers seed
 * providers (pages/sales) the blog doesn't have. So we load this app's own
 * collection fixtures directly, scoped to its `blog` team so the rows show in
 * both /blog and the admin list. Idempotent (stable seed ids).
 */
function buildCollectionsSql(): string {
  const layersDir = 'layers'
  if (!existsSync(layersDir)) return ''

  const nowSec = Math.floor(Date.now() / 1000)
  const stmts: string[] = []

  for (const layer of readdirSync(layersDir)) {
    const collectionsDir = join(layersDir, layer, 'collections')
    if (!existsSync(collectionsDir)) continue

    for (const collection of readdirSync(collectionsDir)) {
      const fixturePath = join(collectionsDir, collection, 'seed.json')
      if (!existsSync(fixturePath)) continue

      let fixture: any
      try {
        fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
      } catch {
        continue
      }

      const { table, key, rows } = fixture ?? {}
      if (!table || !Array.isArray(rows)) continue

      rows.forEach((row: Record<string, unknown>, i: number) => {
        const keyVal = key && row[key] != null ? row[key] : i
        const id = seedId(layer, collection, String(keyVal))
        const values = {
          teamId, // the seeded `blog` org
          owner: 'seed',
          createdBy: 'seed',
          updatedBy: 'seed',
          createdAt: nowSec,
          updatedAt: nowSec,
          ...row,
        }
        stmts.push(buildUpsert(table, { id }, values, { immutable: ['createdAt'] }))
      })
    }
  }

  return stmts.join('\n')
}

const sql = [await buildSql(), buildCollectionsSql()].filter(s => s.trim()).join('\n\n')

if (dryRun) {
  console.log(sql)
  process.exit(0)
}

// ── Pipe to wrangler d1 execute --file ────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'blog-seed-'))
const file = join(dir, 'seed.sql')
writeFileSync(file, sql)

const args = ['wrangler', 'd1', 'execute', db, remote ? '--remote' : '--local', '--file', file]
if (env) args.push('--env', env)

console.log(`→ seeding admin ${ADMIN.email} into ${db} (${remote ? 'remote' : 'local'}${env ? `, env ${env}` : ''})`)
const res = spawnSync('npx', args, { stdio: 'inherit' })
rmSync(dir, { recursive: true, force: true })

if (res.status !== 0) {
  console.error('✗ seed failed')
  process.exit(res.status ?? 1)
}
console.log(`✓ seeded admin + sample posts — log in at the preview with ${ADMIN.email} / ${ADMIN.password}`)
