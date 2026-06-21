#!/usr/bin/env node
/**
 * reset-staging-db.mjs — TEMPORARY one-shot reset of the library-catalog STAGING D1.
 *
 * Why this exists: an earlier deploy provisioned `library-catalog-staging-db` and applied
 * the auth/app schema, then the migration files were regenerated (new single
 * `0000_plain_ultragirl.sql`). The remote `d1_migrations` no longer matches, so
 * `wrangler d1 migrations apply --remote` tries to re-`CREATE TABLE account` and aborts
 * (`SQLITE_ERROR table 'account' already exists`). It's a dirty THROWAWAY staging DB.
 *
 * This drops every user table (including `d1_migrations`) so the chained
 * `wrangler d1 migrations apply` re-applies the single migration cleanly. Staging only;
 * never wire this into `cf:deploy` (prod). It is removed once the deploy is green.
 *
 * Usage (chained inside cf:staging, after sync:ids, before migrate):
 *   node scripts/reset-staging-db.mjs
 */
import { execFileSync } from 'node:child_process'

const DB = 'library-catalog-staging-db'
const ENV = 'staging'

function wrangler(args) {
  return execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
}

function listTables() {
  const out = wrangler([
    'd1', 'execute', DB, '--env', ENV, '--remote', '--json', '--command',
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  ])
  const start = out.indexOf('[')
  if (start === -1) throw new Error(`[reset-staging-db] no JSON in d1 execute output:\n${out}`)
  const parsed = JSON.parse(out.slice(start))
  const block = Array.isArray(parsed) ? parsed[0] : parsed
  const rows = block?.results ?? []
  return rows.map((r) => r.name).filter(Boolean)
}

const tables = listTables()
if (tables.length === 0) {
  console.log('[reset-staging-db] no tables to drop — nothing to do.')
  process.exit(0)
}
console.log(`[reset-staging-db] dropping ${tables.length} table(s): ${tables.join(', ')}`)
const command = ['PRAGMA foreign_keys=OFF;', ...tables.map((t) => `DROP TABLE IF EXISTS \`${t}\`;`)].join('\n')
wrangler(['d1', 'execute', DB, '--env', ENV, '--remote', '--command', command])
console.log('[reset-staging-db] done — staging D1 cleared; migrations will re-apply clean.')
