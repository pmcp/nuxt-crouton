#!/usr/bin/env node
/**
 * teardown-app.mjs — delete a crouton app's Cloudflare resources (Worker + D1 + KV).
 *
 * The inverse of a `/deploy` bootstrap: where deploy auto-provisions a Worker and
 * its D1 + KV, this removes them. It's the destructive half of the `/remove-app`
 * skill — the part the interactive agent CANNOT do (no Cloudflare creds), so it
 * runs in CI via teardown-app.yml (same pattern as db-clone.yml).
 *
 *   node scripts/teardown-app.mjs --app library-catalog --scope staging --dry-run
 *   node scripts/teardown-app.mjs --app library-catalog --scope staging
 *   node scripts/teardown-app.mjs --app velo --scope both --confirm velo   # prod guarded
 *
 * Scope → which env's resources to remove:
 *   staging  → Worker <name>-staging, D1 <name>-staging-db, KV <name>-staging-kv
 *   prod     → Worker <name>,         D1 <name>-db,         KV <name>-kv
 *   both     → both of the above (prod half is guarded — see below)
 *
 * Resource names come from the app's wrangler.jsonc when it still exists; once the
 * code is deleted they fall back to the crouton naming CONVENTION above (so the
 * reference dogfood — library-catalog, whose code is already gone — still works).
 *
 * Guardrails (mirror db-clone's prod guard):
 *   - `--dry-run` prints the planned wrangler commands and exits WITHOUT invoking
 *     wrangler (needs no Cloudflare credentials) — always run this first.
 *   - Deleting a PROD scope requires a typed confirmation: pass --confirm <name>
 *     (must equal the prod worker name) or the prod half aborts. `pocs/` apps have
 *     no prod scope by convention, so staging teardown is the safe default.
 *
 * A real run needs CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in the env (the
 * same token the deploy workflows use — Workers Scripts/D1/KV Edit).
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { findWranglerConfig, isAlreadyGone, parseJsonc, runWrangler } from './lib/wrangler-d1.mjs'
import { readFileSync } from 'node:fs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { dryRun: false, yes: false, scope: 'staging' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--yes' || a === '-y') out.yes = true
    else if (a === '--help' || a === '-h') out.help = true
    else if (a === '--app') out.app = argv[++i]
    else if (a === '--scope') out.scope = argv[++i]
    else if (a === '--confirm') out.confirm = argv[++i]
    else if (a.startsWith('--app=')) out.app = a.slice(6)
    else if (a.startsWith('--scope=')) out.scope = a.slice(8)
    else if (a.startsWith('--confirm=')) out.confirm = a.slice(10)
    else {
      console.error(`Unknown argument: ${a}`)
      out.help = true
    }
  }
  return out
}

const HELP = `teardown-app — delete a crouton app's Cloudflare resources (Worker + D1 + KV)

Usage:
  node scripts/teardown-app.mjs --app <name> --scope <staging|prod|both> [--dry-run] [--confirm <name>]

Options:
  --app <name>      App to tear down (matches its wrangler.jsonc name / crouton naming convention)
  --scope <scope>   Which env's resources to delete: staging (default) | prod | both
  --dry-run         Print the planned wrangler deletes and exit; touches nothing, needs no creds
  --confirm <name>  Required to delete a PROD scope: must equal the prod worker name
  --yes, -y         Skip the typed prod confirmation (still only for explicit prod teardown)
  -h, --help        Show this help

Examples:
  node scripts/teardown-app.mjs --app library-catalog --scope staging --dry-run
  node scripts/teardown-app.mjs --app library-catalog --scope staging
  node scripts/teardown-app.mjs --app velo --scope both --confirm velo
`

const SCOPES = new Set(['staging', 'prod', 'both'])

// ---------------------------------------------------------------------------
// resolve resources
// ---------------------------------------------------------------------------

/** Read an app's parsed wrangler.jsonc, or null if its code is already gone. */
function loadWrangler(app) {
  const p = findWranglerConfig(app, repoRoot)
  if (!p) return null
  try {
    return parseJsonc(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Resolve the { worker, d1, kvTitle, kvId } for one env scope. Prefers the real
 * names/ids from wrangler.jsonc; falls back to the crouton naming convention so a
 * teardown still works after the app's code has been deleted.
 */
function resolveScope(app, env, config) {
  const isProd = env === 'prod'
  const worker = isProd ? app : `${app}-staging`
  // KV auto-provisions under the title "<worker>-<binding>" (binding is KV) → lowercased.
  const kvTitle = `${worker}-kv`
  let d1 = `${worker}-db`
  let kvId = null

  const block = isProd ? config : config?.env?.staging
  if (block) {
    const dbName = block.d1_databases?.[0]?.database_name
    if (dbName) d1 = dbName
    kvId = block.kv_namespaces?.[0]?.id ?? null
  }
  return { env, isProd, worker, d1, kvTitle, kvId }
}

// ---------------------------------------------------------------------------
// wrangler wrappers (tolerant — a missing resource is reported, not fatal)
// ---------------------------------------------------------------------------

const wrangler = (args, opts) => runWrangler(args, { cwd: repoRoot, ...opts })

function printCmd(args) {
  console.log(`    $ npx wrangler ${args.join(' ')}`)
}

/** Run a delete, treating "doesn't exist" as a no-op so reruns are idempotent. */
function tryDelete(label, args) {
  try {
    wrangler(args)
    console.log(`    ✓ deleted ${label}`)
    return 'deleted'
  } catch (err) {
    const msg = String(err.message || '')
    if (isAlreadyGone(msg)) {
      console.log(`    – ${label} not found (already gone)`)
      return 'absent'
    }
    console.error(`    ✗ failed to delete ${label}: ${msg}`)
    return 'failed'
  }
}

/** Look up a KV namespace id by its title (the convention is "<worker>-kv"). */
function findKvId(kvTitle) {
  try {
    const out = wrangler(['kv', 'namespace', 'list'], { capture: true })
    const list = JSON.parse(out)
    const hit = list.find(n => String(n.title).toLowerCase() === kvTitle.toLowerCase())
    return hit?.id ?? null
  } catch (err) {
    console.error(`    ! could not list KV namespaces: ${err.message}`)
    return null
  }
}

function confirmTyped(expected) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`  Type the prod worker name to confirm teardown ("${expected}"): `, (answer) => {
      rl.close()
      resolve(answer.trim() === expected)
    })
  })
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.app || !SCOPES.has(args.scope)) {
    if (args.scope && !SCOPES.has(args.scope)) console.error(`Invalid --scope "${args.scope}" (use staging | prod | both)\n`)
    console.log(HELP)
    process.exit(args.help ? 0 : 1)
  }

  const config = loadWrangler(args.app)
  const envs = args.scope === 'both' ? ['staging', 'prod'] : [args.scope]
  const scopes = envs.map(env => resolveScope(args.app, env, config))
  const hasProd = scopes.some(s => s.isProd)

  console.log(`\n  teardown-app: ${args.app}`)
  console.log(`    source : ${config ? findWranglerConfig(args.app, repoRoot) : 'wrangler.jsonc gone — using crouton naming convention'}`)
  console.log(`    scope  : ${args.scope}\n`)

  console.log('  Plan (delete these Cloudflare resources):')
  for (const s of scopes) {
    console.log(`  • ${s.env}${s.isProd ? ' (PROD ⚠)' : ''}:`)
    printCmd(['delete', '--name', s.worker])
    printCmd(['d1', 'delete', s.d1, '-y'])
    printCmd(['kv', 'namespace', 'delete', s.kvId ? `--namespace-id ${s.kvId}` : `(by title "${s.kvTitle}")`])
  }
  console.log('')

  if (args.dryRun) {
    console.log('  --dry-run: no changes made.\n')
    return
  }

  // Prod guard — mirror db-clone: typed confirmation (or --confirm in CI / --yes).
  if (hasProd && !args.yes) {
    const prodWorker = scopes.find(s => s.isProd).worker
    let ok
    if (args.confirm !== undefined) {
      ok = args.confirm.trim() === prodWorker
      if (!ok) console.error(`  --confirm "${args.confirm}" does not match prod worker "${prodWorker}" — aborting.`)
    } else if (process.stdin.isTTY) {
      ok = await confirmTyped(prodWorker)
      if (!ok) console.error('  Confirmation did not match — aborting.')
    } else {
      ok = false
      console.error(`  Scope includes PROD. In a non-interactive run, pass --confirm "${prodWorker}" (or --yes) to proceed.`)
    }
    if (!ok) process.exit(1)
  }

  const results = []
  for (const s of scopes) {
    console.log(`  Tearing down ${s.env} …`)
    results.push(['worker', s.worker, tryDelete(`worker ${s.worker}`, ['delete', '--name', s.worker])])
    results.push(['d1', s.d1, tryDelete(`D1 ${s.d1}`, ['d1', 'delete', s.d1, '-y'])])

    const kvId = s.kvId ?? findKvId(s.kvTitle)
    if (kvId) {
      results.push(['kv', kvId, tryDelete(`KV ${s.kvTitle} (${kvId})`, ['kv', 'namespace', 'delete', '--namespace-id', kvId])])
    } else {
      console.log(`    – KV "${s.kvTitle}" not found (already gone)`)
      results.push(['kv', s.kvTitle, 'absent'])
    }
  }

  const failed = results.filter(r => r[2] === 'failed')
  const deleted = results.filter(r => r[2] === 'deleted')
  console.log(`\n  ${failed.length ? '⚠' : '✅'} Done. ${deleted.length} deleted, ${results.length - deleted.length - failed.length} already gone, ${failed.length} failed.\n`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(`\n  teardown-app failed: ${err.message}\n`)
  process.exit(1)
})
