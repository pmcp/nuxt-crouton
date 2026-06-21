// generate-migrations.ts — build-first Drizzle migration generation.
//
// Why "build-first": drizzle-kit reads the *bundled* schema at
// `.nuxt/hub/db/schema.mjs`, which NuxtHub only writes during `nuxt build`
// (`nuxt prepare` emits `schema.entry.ts`, NOT the `.mjs`). So running
// `db:generate` on a freshly scaffolded/added tree finds no schema and emits
// ZERO migrations — the first deploy then fails the remote-migrate step with
// "No migrations present" (hit on library-catalog, #457/#523).
//
// The fix mirrors the `db-migrations` skill: start `NITRO_PRESET=node-server
// nuxt build` (the bundle is written early, before the slow Nitro stage), wait
// for the bundle file to appear, stop the build, then run the app's own
// `db:generate` script (which respects its drizzle.config.ts).

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import consola from 'consola'

import { detectPackageManager } from './detect-package-manager.ts'

// The two locations NuxtHub may write the bundled schema to (mirrors the
// candidates in the generated drizzle.config.ts).
const BUNDLE_PATHS = [
  '.nuxt/hub/db/schema.mjs',
  'node_modules/.cache/nuxt/.nuxt/hub/db/schema.mjs',
]

export type GenerateMigrationsResult =
  | { generated: true }
  | { generated: false; reason: 'deps-missing' | 'build-timeout' | 'generate-failed'; detail?: string }

interface GenerateMigrationsOptions {
  /** Max seconds to wait for the schema bundle to appear during build. */
  buildTimeoutSec?: number
  /** Skip the build if a bundle is already present (e.g. a prior build). */
  reuseExistingBundle?: boolean
}

function bundleExists(cwd: string): boolean {
  return BUNDLE_PATHS.some(p => existsSync(join(cwd, p)))
}

function runScriptCommand(pm: 'pnpm' | 'yarn' | 'npm', script: string): [string, string[]] {
  // yarn runs scripts directly; pnpm/npm use `run`
  if (pm === 'yarn') return ['yarn', [script]]
  return [pm, ['run', script]]
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Build the app just far enough to emit the bundled Drizzle schema, then run
 * its `db:generate` script so committed migrations land in
 * `server/db/migrations/**`.
 *
 * Requires the app's dependencies to be installed (it runs `nuxt build`). On a
 * bare scaffold with no `node_modules`, returns `{ generated: false,
 * reason: 'deps-missing' }` so the caller can print the manual next-step rather
 * than silently shipping zero migrations.
 */
export async function generateMigrations(
  cwd: string = process.cwd(),
  options: GenerateMigrationsOptions = {},
): Promise<GenerateMigrationsResult> {
  const { buildTimeoutSec = 180, reuseExistingBundle = true } = options

  // Build (and the build-first dance) needs installed deps.
  if (!existsSync(join(cwd, 'node_modules'))) {
    return { generated: false, reason: 'deps-missing' }
  }

  const pm = detectPackageManager(cwd)

  // 1) Ensure the bundled schema exists (build-first), unless already present.
  if (!(reuseExistingBundle && bundleExists(cwd))) {
    consola.start('Building schema bundle (one-time, needed to generate migrations)...')

    const build = spawn('npx', ['nuxt', 'build'], {
      cwd,
      stdio: 'ignore',
      env: { ...process.env, NITRO_PRESET: 'node-server' },
    })

    let buildExited = false
    build.on('exit', () => { buildExited = true })

    const deadline = Date.now() + buildTimeoutSec * 1000
    while (!bundleExists(cwd) && !buildExited && Date.now() < deadline) {
      await sleep(1500)
    }

    // Stop the build — we only needed the early-emitted schema bundle.
    if (!buildExited) {
      build.kill('SIGTERM')
      // Give it a moment, then force-kill if still alive.
      await sleep(1000)
      if (!buildExited) build.kill('SIGKILL')
    }

    if (!bundleExists(cwd)) {
      return {
        generated: false,
        reason: 'build-timeout',
        detail: `schema bundle did not appear within ${buildTimeoutSec}s`,
      }
    }
    consola.success('Schema bundle ready')
  }

  // 2) Generate migrations via the app's own db:generate script.
  consola.start('Generating migrations...')
  const [cmd, args] = runScriptCommand(pm, 'db:generate')
  const gen = spawnSync(cmd, args, { cwd, stdio: 'pipe', encoding: 'utf-8' })

  if (gen.status !== 0) {
    return {
      generated: false,
      reason: 'generate-failed',
      detail: (gen.stderr || gen.stdout || '').trim().split('\n').slice(-5).join('\n'),
    }
  }

  consola.success('Generated migrations')
  return { generated: true }
}

/**
 * The exact manual sequence a human/agent should run when automatic generation
 * was skipped (e.g. a fresh scaffold with no installed deps). Printed by callers.
 */
export function manualMigrationSteps(appDir?: string): string[] {
  const cd = appDir ? `cd ${appDir} && ` : ''
  return [
    `${cd}pnpm install`,
    'NITRO_PRESET=node-server nuxt build   # stop once .nuxt/hub/db/schema.mjs exists',
    'pnpm db:generate                       # writes server/db/migrations/**',
  ]
}
