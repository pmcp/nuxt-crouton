// init-app.mjs — Orchestrate the full app creation pipeline:
// scaffold-app → generate → doctor → summary
import { join } from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

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

  console.log(chalk.cyan(`\n  🚀 crouton init — creating ${chalk.bold(name)}\n`))

  // ── Step 1: scaffold-app ──────────────────────────────────────────────
  console.log(chalk.gray('  Step 1/3 — Scaffolding app...\n'))
  let appDir
  try {
    const { scaffoldApp } = await import('./scaffold-app.mjs')
    // scaffoldApp prints its own file list — let it flow
    const result = await scaffoldApp(name, { features, theme, dialect, cf, dryRun })
    appDir = result.appDir
  } catch (error) {
    console.error(chalk.red('  Step 1/3 — Scaffold failed'))
    throw error
  }

  if (dryRun) {
    console.log(chalk.yellow('\n  Dry run — skipping generate and doctor.\n'))
    return
  }

  // ── Step 2: generate (config-based) ───────────────────────────────────
  const configPath = join(appDir, 'crouton.config.js')
  const hasConfig = await fs.pathExists(configPath)

  if (hasConfig) {
    const spinner2 = ora('Step 2/3 — Generating collections from config...').start()
    try {
      // The generator reads process.argv — snapshot and restore
      const savedArgv = process.argv
      process.argv = ['node', 'generate-collection.mjs', '--config', configPath]
      await import('./generate-collection.mjs')
      process.argv = savedArgv
      spinner2.succeed('Step 2/3 — Collections generated')
    } catch (error) {
      spinner2.warn('Step 2/3 — Generate skipped (no collections in config yet)')
    }
  } else {
    console.log(chalk.gray('  ⏭  Step 2/3 — No crouton.config.js found, skipping generate'))
  }

  // ── Step 3: doctor ────────────────────────────────────────────────────
  const spinner3 = ora('Step 3/3 — Running doctor checks...').start()
  try {
    const { doctor, printReport } = await import('./doctor.mjs')
    const result = await doctor(appDir)
    spinner3.succeed('Step 3/3 — Doctor complete')
    printReport(result)
  } catch (error) {
    spinner3.warn('Step 3/3 — Doctor skipped (could not validate)')
  }

  // ── Summary ───────────────────────────────────────────────────────────
  printSummary(name, appDir, cf)
}

function printSummary(name, appDir, cf) {
  console.log(chalk.cyan('  ─────────────────────────────────────'))
  console.log(chalk.cyan(`  ✅ ${chalk.bold(name)} is ready!\n`))
  console.log(chalk.yellow('  Next steps:\n'))
  console.log(chalk.white(`  1.  cd ${appDir}`))
  console.log(chalk.white('  2.  pnpm install'))
  console.log(chalk.white('  3.  pnpm dev'))
  console.log()
  console.log(chalk.gray('  Deploy:'))
  console.log(chalk.white('       nuxthub deploy'))
  if (cf) {
    console.log()
    console.log(chalk.gray('  Remember to update wrangler.toml with real D1/KV IDs'))
  }
  console.log()
}
