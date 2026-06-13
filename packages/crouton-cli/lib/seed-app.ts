/**
 * App-level seed runner (#83).
 *
 * Discovers the seed providers of an app's extended `@fyit/crouton-*` packages,
 * orders them by `dependsOn`, turns their declarative upserts into idempotent
 * SQL, and executes it against the app's D1 — local or remote — via
 * `wrangler d1 execute` (mirroring the `db:migrate` local/remote split).
 *
 * Providers are pure TS modules exported at `<pkg>/seed`; they're loaded with
 * jiti so no build step is required.
 */
import { createJiti } from 'jiti'
import consola from 'consola'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface SeedAppOptions {
  /** App directory (defaults to cwd). */
  dir?: string
  /** D1 database name/binding (e.g. `fanfare-db`). */
  db: string
  /** Target the remote D1 instead of the local one. */
  remote?: boolean
  /** Team slug to seed (defaults to `test1`). */
  team?: string
  /** Locale demo content is authored in (defaults to `nl`). */
  locale?: string
  /** Also seed optional staff/login accounts. */
  withStaff?: boolean
  /** Print the SQL instead of executing it (no wrangler call). */
  dryRun?: boolean
}

interface LoadedProviders {
  providers: Array<{ id: string, dependsOn?: string[], seed: Function }>
  createPageWithBlocks?: Function
}

/**
 * Import a module via jiti, unwrapping a lone CJS `default` export (same
 * interop the main CLI bin uses).
 */
async function tsImport(jiti: ReturnType<typeof createJiti>, specifier: string): Promise<any> {
  const mod: any = await jiti.import(specifier)
  if (mod && typeof mod === 'object' && 'default' in mod && Object.keys(mod).length === 1) {
    return mod.default
  }
  return mod
}

/** The `@fyit/crouton-*` dependency names declared in a package.json object. */
function croutonDepNames(pkg: any): string[] {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies, ...pkg?.peerDependencies }
  return Object.keys(deps).filter(name => name.startsWith('@fyit/crouton'))
}

/**
 * Locate a package's directory by walking the node_modules chain up from
 * `fromDir`. Reads package.json directly (not via the exports map), so it works
 * for packages that don't export `./package.json`.
 */
function findPackageDir(name: string, fromDir: string): string | null {
  let dir = fromDir
  for (;;) {
    const candidate = join(dir, 'node_modules', name, 'package.json')
    if (existsSync(candidate)) return dirname(candidate)
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Discover every `@fyit/crouton-*` package reachable from the app — its direct
 * deps plus the packages those pull in (e.g. crouton-auth is bundled via
 * crouton-core, so it isn't a direct app dependency). BFS over deps + peerDeps.
 */
function discoverCroutonPackageNames(appDir: string): string[] {
  const appPkgPath = join(appDir, 'package.json')
  if (!existsSync(appPkgPath)) {
    throw new Error(`No package.json found in ${appDir}`)
  }
  const appPkg = JSON.parse(readFileSync(appPkgPath, 'utf8'))

  const seen = new Set<string>()
  const queue = croutonDepNames(appPkg)

  while (queue.length > 0) {
    const name = queue.shift()!
    if (seen.has(name)) continue
    seen.add(name)

    const pkgDir = findPackageDir(name, appDir)
    if (!pkgDir) continue
    try {
      const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
      for (const dep of croutonDepNames(pkg)) {
        if (!seen.has(dep)) queue.push(dep)
      }
    } catch {
      // Unreadable package.json — skip; it just won't contribute providers.
    }
  }

  return [...seen]
}

/** Discover seed providers (and the page helper) from the app's packages. */
async function discoverProviders(
  jiti: ReturnType<typeof createJiti>,
  croutonDeps: string[]
): Promise<LoadedProviders> {
  const providers: LoadedProviders['providers'] = []
  let createPageWithBlocks: Function | undefined

  for (const name of croutonDeps) {
    let mod: any
    try {
      mod = await tsImport(jiti, `${name}/seed`)
    } catch {
      // No `./seed` export → this package ships no demo data. Skip quietly.
      continue
    }
    const provider = mod?.provider ?? mod?.default
    if (provider && typeof provider.id === 'string' && typeof provider.seed === 'function') {
      providers.push(provider)
      consola.info(`Discovered seed provider: ${provider.id} (${name})`)
    }
    if (typeof mod?.createPageWithBlocks === 'function') {
      createPageWithBlocks = mod.createPageWithBlocks
    }
  }

  return { providers, createPageWithBlocks }
}

/**
 * Run the seed: discover → order → collect SQL → execute via wrangler.
 * Returns the generated SQL (handy for tests / dry runs).
 */
export async function seedApp(options: SeedAppOptions): Promise<string> {
  const appDir = resolve(options.dir ?? process.cwd())
  const teamSlug = options.team ?? 'test1'
  const locale = options.locale ?? 'nl'

  consola.start(`Seeding ${options.db} (${options.remote ? 'remote' : 'local'}) — team "${teamSlug}", locale "${locale}"`)

  // jiti resolves bare specifiers from the app dir (where the @fyit packages
  // are installed), so providers and crouton-core resolve correctly.
  const jiti = createJiti(pathToFileURL(join(appDir, '_seed-runner.mjs')).href, {
    interopDefault: true
  })

  const croutonDeps = discoverCroutonPackageNames(appDir)
  const { providers, createPageWithBlocks } = await discoverProviders(jiti, croutonDeps)

  if (providers.length === 0) {
    consola.warn('No seed providers found among the app\'s @fyit/crouton-* packages — nothing to seed.')
    return ''
  }

  const core: any = await tsImport(jiti, '@fyit/crouton-core/shared/seed')
  const teamId = core.seedOrgId(teamSlug)

  const sql: string = await core.collectSeedSql({
    providers,
    teamSlug,
    teamId,
    locale,
    withStaff: options.withStaff,
    createPageWithBlocks
  })

  if (!sql.trim()) {
    consola.warn('Providers produced no statements — nothing to seed.')
    return sql
  }

  if (options.dryRun) {
    consola.info('Dry run — generated SQL:')
    process.stdout.write(`${sql}\n`)
    return sql
  }

  // Write to a temp file and hand it to wrangler — the same transport the
  // migration scripts use, so it works identically local and remote.
  const dir = mkdtempSync(join(tmpdir(), 'crouton-seed-'))
  const sqlFile = join(dir, 'seed.sql')
  writeFileSync(sqlFile, `${sql}\n`)

  const wranglerArgs = [
    'wrangler',
    'd1',
    'execute',
    options.db,
    options.remote ? '--remote' : '--local',
    `--file=${sqlFile}`,
    '--yes'
  ]

  consola.info(`Running: npx ${wranglerArgs.join(' ')}`)
  execFileSync('npx', wranglerArgs, { cwd: appDir, stdio: 'inherit', env: process.env })

  consola.success(`Seeded ${providers.length} provider(s) into ${options.db} (${options.remote ? 'remote' : 'local'}).`)
  return sql
}
