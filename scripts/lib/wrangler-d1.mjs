/**
 * wrangler-d1.mjs — shared helpers for the D1 tooling scripts (db-clone, db-counts).
 *
 * Discovers a Cloudflare D1 database NAME from an app's wrangler.jsonc and wraps
 * `npx wrangler d1` calls. D1 databases are resolved by NAME at the account level,
 * so callers run from the repo root and don't need a wrangler config in cwd.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const PROD_ENVS = new Set(['prod', 'production'])
export const APP_ROOTS = ['apps', 'pocs', 'workers']

/** Minimal JSONC → JSON (strips // and block comments + trailing commas, keeps strings). */
export function parseJsonc(text) {
  const noComments = text.replace(
    /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (_m, str) => str ?? ''
  )
  return JSON.parse(noComments.replace(/,(\s*[}\]])/g, '$1'))
}

/** Locate an app's wrangler.jsonc under apps/, pocs/, or workers/. */
export function findWranglerConfig(app, repoRoot) {
  for (const root of APP_ROOTS) {
    const p = join(repoRoot, root, app, 'wrangler.jsonc')
    if (existsSync(p)) return p
  }
  return null
}

/** Resolve the D1 database name for an app + env from its parsed wrangler.jsonc. */
export function resolveDb(config, app, env) {
  const isProd = PROD_ENVS.has(env)
  const scope = isProd ? config : config.env?.[env]
  if (!scope) {
    const envs = ['prod', ...Object.keys(config.env ?? {})]
    throw new Error(`App "${app}" has no environment "${env}". Available: ${envs.join(', ')}`)
  }
  const db = scope.d1_databases?.[0]
  if (!db?.database_name) {
    throw new Error(`App "${app}" env "${env}" has no d1_databases[0].database_name in wrangler.jsonc`)
  }
  return { name: db.database_name, isProd }
}

/** Load + resolve in one step: returns { name, isProd, configPath }. Throws on unknown app/env. */
export function resolveAppDb(app, env, repoRoot) {
  const configPath = findWranglerConfig(app, repoRoot)
  if (!configPath) {
    throw new Error(`Unknown app "${app}": no wrangler.jsonc under ${APP_ROOTS.map(r => `${r}/${app}`).join(', ')}`)
  }
  return { ...resolveDb(parseJsonc(readFileSync(configPath, 'utf8')), app, env), configPath }
}

/** Run `npx wrangler …` from repoRoot. Returns stdout when capture is set; throws on non-zero. */
export function runWrangler(args, { cwd, capture = false } = {}) {
  const full = ['wrangler', ...args]
  const res = spawnSync('npx', full, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit'
  })
  if (res.status !== 0) {
    throw new Error(`wrangler exited with code ${res.status}: npx ${full.join(' ')}`)
  }
  return res.stdout ?? ''
}

/** Run a remote SELECT and return the first result set's rows (wrangler --json shape). */
export function queryD1Json(dbName, sql, { cwd } = {}) {
  const out = runWrangler(['d1', 'execute', dbName, '--remote', '--json', '--command', sql], { cwd, capture: true })
  const parsed = JSON.parse(out)
  return Array.isArray(parsed) ? (parsed[0]?.results ?? []) : (parsed.results ?? [])
}
