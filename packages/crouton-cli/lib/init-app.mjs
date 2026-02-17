// init-app.mjs — Orchestrate the full app creation pipeline:
// scaffold-app → generate → doctor → summary
import { join } from 'node:path'
import { access } from 'node:fs/promises'
import consola from 'consola'

/**
 * Run the full init pipeline: scaffold → generate → doctor → summary.
 * @param {string} name - App name (lowercase, hyphens allowed)
 * @param {object} options
 * @param {string[]} [options.features] - Feature names (e.g., ['bookings', 'pages'])
 * @param {string} [options.theme] - Theme name (e.g., 'ko')
 * @param {string} [options.dialect] - 'sqlite' or 'pg' (default: 'sqlite')
 * @param {boolean} [options.cf] - Include Cloudflare config (default: true)
 * @param {boolean} [options.dryRun] - Preview without writing files
 */
export async function initApp(name, options = {}) {
  const { features = [], theme, dialect = 'sqlite', cf = true, dryRun = false } = options

  console.log(`\n  crouton init — creating ${name}\n`)

  // ── Step 1: scaffold-app ──────────────────────────────────────────────
  console.log('  Step 1/3 — Scaffolding app...\n')
  let appDir
  try {
    const { scaffoldApp } = await import('./scaffold-app.mjs')
    const result = await scaffoldApp(name, { features, theme, dialect, cf, dryRun })
    appDir = result.appDir
  } catch (error) {
    consola.error('Step 1/3 — Scaffold failed')
    throw error
  }

  if (dryRun) {
    consola.warn('Dry run — skipping generate and doctor.\n')
    return
  }

  // ── Step 2: generate (config-based) ───────────────────────────────────
  const configPath = join(appDir, 'crouton.config.js')
  const hasConfig = await access(configPath).then(() => true).catch(() => false)

  if (hasConfig) {
    consola.start('Step 2/3 — Generating collections from config...')
    try {
      const { runConfig } = await import('./generate-collection.mjs')
      await runConfig({ configPath })
      consola.success('Step 2/3 — Collections generated')
    } catch (error) {
      consola.warn('Step 2/3 — Generate skipped (no collections in config yet)')
    }
  } else {
    console.log('  Step 2/3 — No crouton.config.js found, skipping generate')
  }

  // ── Step 3: doctor ────────────────────────────────────────────────────
  consola.start('Step 3/3 — Running doctor checks...')
  try {
    const { doctor, printReport } = await import('./doctor.mjs')
    const result = await doctor(appDir)
    consola.success('Step 3/3 — Doctor complete')
    printReport(result)
  } catch (error) {
    consola.warn('Step 3/3 — Doctor skipped (could not validate)')
  }

  // ── Summary ───────────────────────────────────────────────────────────
  printSummary(name, appDir, cf)
}

function printSummary(name, appDir, cf) {
  console.log('  ─────────────────────────────────────')
  console.log(`  ${name} is ready!\n`)
  console.log('  Next steps:\n')
  console.log(`  1.  cd ${appDir}`)
  console.log('  2.  pnpm install')
  console.log('  3.  pnpm dev')
  console.log()
  console.log('  Deploy:')
  console.log('       nuxthub deploy')
  if (cf) {
    console.log()
    console.log('  Remember to update wrangler.toml with real D1/KV IDs')
  }
  console.log()
}
