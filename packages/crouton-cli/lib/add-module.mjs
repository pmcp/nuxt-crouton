// Add crouton modules to a project
// Usage: crouton add bookings i18n --skip-migrations

import { execSync, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

import { MODULES, getModule, listModules } from './module-registry.mjs'
import { detectPackageManager, getInstallCommand } from './utils/detect-package-manager.mjs'
import { addToNuxtConfigExtends, isInNuxtConfigExtends } from './utils/update-nuxt-config.mjs'
import { addSchemaExport, getSchemaPath } from './utils/update-schema-index.mjs'

/**
 * @typedef {Object} AddModuleOptions
 * @property {boolean} [skipInstall] - Skip package installation
 * @property {boolean} [skipMigrations] - Skip running migrations
 * @property {boolean} [dryRun] - Preview what would be done
 * @property {boolean} [force] - Force reinstall even if already installed
 */

/**
 * Check if a package is installed
 * @param {string} packageName - Package name
 * @param {string} [cwd] - Working directory
 * @returns {Promise<boolean>}
 */
async function isPackageInstalled(packageName, cwd = process.cwd()) {
  try {
    const packageJson = await fs.readJson(join(cwd, 'package.json'))
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }
    return packageName in deps
  } catch {
    return false
  }
}

/**
 * Check if required dependencies are installed
 * @param {string[]} dependencies - Module aliases to check
 * @param {string} [cwd] - Working directory
 * @returns {Promise<{missing: string[], installed: string[]}>}
 */
async function checkDependencies(dependencies, cwd = process.cwd()) {
  const missing = []
  const installed = []

  for (const dep of dependencies) {
    const module = getModule(dep)
    if (!module) continue

    if (await isPackageInstalled(module.package, cwd)) {
      installed.push(dep)
    } else {
      missing.push(dep)
    }
  }

  return { missing, installed }
}

/**
 * Add a single module to the project
 * @param {string} moduleName - Module alias or package name
 * @param {AddModuleOptions} [options] - Options
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addModule(moduleName, options = {}) {
  const { skipInstall, skipMigrations, dryRun, force } = options
  const cwd = process.cwd()

  // Get module info
  const module = getModule(moduleName)
  if (!module) {
    const available = listModules().map(m => m.alias).join(', ')
    return {
      success: false,
      message: `Unknown module: ${moduleName}\nAvailable modules: ${available}`
    }
  }

  const packageName = module.package

  console.log()
  console.log(chalk.cyan(`📦 Adding ${chalk.bold(moduleName)} (${packageName})`))
  console.log(chalk.gray(`   ${module.description}`))
  console.log()

  if (dryRun) {
    console.log(chalk.yellow('   [DRY RUN] The following actions would be performed:'))
  }

  // Check if already installed
  const alreadyInstalled = await isPackageInstalled(packageName, cwd)
  if (alreadyInstalled && !force) {
    const alreadyInConfig = await isInNuxtConfigExtends(join(cwd, 'nuxt.config.ts'), packageName)
    if (alreadyInConfig) {
      console.log(chalk.yellow(`   ⚠️  ${packageName} is already installed and configured`))
      console.log(chalk.gray('   Use --force to reinstall'))
      return { success: true, message: 'Already installed' }
    }
  }

  // Check dependencies
  if (module.dependencies && module.dependencies.length > 0) {
    const { missing } = await checkDependencies(module.dependencies, cwd)
    if (missing.length > 0) {
      console.log(chalk.red(`   ❌ Missing required dependencies: ${missing.join(', ')}`))
      console.log(chalk.yellow(`   Run: crouton add ${missing.join(' ')} ${moduleName}`))
      return {
        success: false,
        message: `Missing dependencies: ${missing.join(', ')}`
      }
    }
  }

  // Step 1: Install package
  if (!skipInstall) {
    const pm = detectPackageManager(cwd)
    const installCmd = getInstallCommand(pm, packageName)

    if (dryRun) {
      console.log(chalk.gray(`   • Would run: ${installCmd}`))
    } else {
      const spinner = ora(`Installing ${packageName}...`).start()
      try {
        execSync(installCmd, { cwd, stdio: 'pipe' })
        spinner.succeed(`Installed ${packageName}`)
      } catch (error) {
        spinner.fail(`Failed to install ${packageName}`)
        console.error(chalk.red(`   ${error.message}`))
        return { success: false, message: 'Installation failed' }
      }
    }
  } else {
    console.log(chalk.gray('   • Skipping package installation'))
  }

  // Step 2: Update nuxt.config.ts
  const configPath = join(cwd, 'nuxt.config.ts')
  if (dryRun) {
    console.log(chalk.gray(`   • Would add '${packageName}' to extends in nuxt.config.ts`))
  } else {
    const spinner = ora('Updating nuxt.config.ts...').start()
    const result = await addToNuxtConfigExtends(configPath, packageName)

    if (result.added) {
      spinner.succeed('Updated nuxt.config.ts')
    } else if (result.reason === 'already in config') {
      spinner.succeed('Already in nuxt.config.ts')
    } else {
      spinner.fail(`Could not update nuxt.config.ts: ${result.reason}`)
      console.log(chalk.yellow(`   Please manually add '${packageName}' to extends array`))
    }
  }

  // Step 3: Update schema index (if module has schema)
  if (module.schemaExport) {
    const schemaPath = await getSchemaPath(cwd)

    if (dryRun) {
      console.log(chalk.gray(`   • Would add schema export to ${schemaPath}`))
    } else {
      const spinner = ora('Updating schema index...').start()
      const result = await addSchemaExport(schemaPath, module.schemaExport)

      if (result.added) {
        if (result.created) {
          spinner.succeed(`Created ${schemaPath} with schema export`)
        } else {
          spinner.succeed('Added schema export')
        }
      } else if (result.reason === 'already exported') {
        spinner.succeed('Schema already exported')
      } else {
        spinner.fail(`Could not update schema: ${result.reason}`)
      }
    }
  }

  // Step 4: Generate & apply migrations (if module has tables)
  if (!skipMigrations && module.schemaExport && module.tables && module.tables.length > 0) {
    if (dryRun) {
      console.log(chalk.gray('   • Would run: npx nuxt db:generate'))
      console.log(chalk.gray('   • Would run: npx nuxt db:migrate'))
    } else {
      // Generate migrations
      const genSpinner = ora('Generating migrations...').start()
      try {
        const genResult = spawnSync('npx', ['nuxt', 'db:generate'], {
          cwd,
          stdio: 'pipe',
          encoding: 'utf-8'
        })

        if (genResult.status !== 0) {
          genSpinner.warn('Migration generation may have issues')
          if (genResult.stderr) {
            console.log(chalk.gray(`   ${genResult.stderr.trim()}`))
          }
        } else {
          genSpinner.succeed('Generated migrations')
        }
      } catch (error) {
        genSpinner.warn('Could not generate migrations')
        console.log(chalk.gray(`   ${error.message}`))
      }

      // Apply migrations
      const migrateSpinner = ora('Applying migrations...').start()
      try {
        const migrateResult = spawnSync('npx', ['nuxt', 'db:migrate'], {
          cwd,
          stdio: 'pipe',
          encoding: 'utf-8'
        })

        if (migrateResult.status !== 0) {
          migrateSpinner.warn('Migration application may have issues')
          if (migrateResult.stderr) {
            console.log(chalk.gray(`   ${migrateResult.stderr.trim()}`))
          }
        } else {
          migrateSpinner.succeed('Applied migrations')
        }
      } catch (error) {
        migrateSpinner.warn('Could not apply migrations')
        console.log(chalk.gray(`   ${error.message}`))
      }
    }
  } else if (module.schemaExport) {
    console.log(chalk.gray('   • Skipping migrations (use npx nuxt db:generate && npx nuxt db:migrate when ready)'))
  }

  // Success message
  console.log()
  console.log(chalk.green(`✅ ${chalk.bold(moduleName)} module added successfully!`))

  if (module.tables && module.tables.length > 0) {
    console.log(chalk.gray(`   Tables: ${module.tables.join(', ')}`))
  }

  console.log()
  console.log(chalk.cyan('Next steps:'))
  console.log(chalk.gray('  1. Restart your dev server: pnpm dev'))

  // Module-specific hints
  if (moduleName === 'auth') {
    console.log(chalk.gray('  2. Set BETTER_AUTH_SECRET and BETTER_AUTH_URL in .env'))
    console.log(chalk.gray('  3. Configure OAuth providers if needed'))
  } else if (moduleName === 'i18n') {
    console.log(chalk.gray('  2. Configure locales in nuxt.config.ts'))
  } else if (moduleName === 'bookings') {
    console.log(chalk.gray('  2. Generate booking collections with crouton config'))
  } else if (moduleName === 'assets') {
    console.log(chalk.gray('  2. Enable hub.blob in nuxt.config.ts'))
    console.log(chalk.gray('  3. Generate assets collection with crouton config'))
  }

  return { success: true, message: 'Module added successfully' }
}

/**
 * Add multiple modules to the project
 * @param {string[]} moduleNames - Module aliases or package names
 * @param {AddModuleOptions} [options] - Options
 * @returns {Promise<{success: boolean, results: Array<{module: string, success: boolean, message: string}>}>}
 */
export async function addModules(moduleNames, options = {}) {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════╗'))
  console.log(chalk.bold.cyan('║          Crouton Module Installer                ║'))
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════╝'))

  const results = []
  let allSuccess = true

  for (const moduleName of moduleNames) {
    const result = await addModule(moduleName, options)
    results.push({
      module: moduleName,
      success: result.success,
      message: result.message
    })

    if (!result.success) {
      allSuccess = false
    }
  }

  // Summary
  console.log(chalk.bold.cyan('\n══════════════════════════════════════════════════'))
  console.log(chalk.bold.cyan(' Summary'))
  console.log(chalk.bold.cyan('══════════════════════════════════════════════════'))

  for (const result of results) {
    const icon = result.success ? chalk.green('✓') : chalk.red('✗')
    console.log(`  ${icon} ${result.module}: ${result.message}`)
  }

  console.log()

  return { success: allSuccess, results }
}

/**
 * List all available modules
 */
export function listAvailableModules() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════╗'))
  console.log(chalk.bold.cyan('║          Available Crouton Modules               ║'))
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════╝\n'))

  const modules = listModules()

  for (const mod of modules) {
    const schemaIcon = mod.hasSchema ? chalk.green('●') : chalk.gray('○')
    console.log(`  ${schemaIcon} ${chalk.cyan(mod.alias.padEnd(12))} ${chalk.gray(mod.description)}`)
  }

  console.log()
  console.log(chalk.gray('  ● = Has database schema'))
  console.log(chalk.gray('  ○ = No database tables'))
  console.log()
  console.log(chalk.cyan('Usage:'))
  console.log(chalk.gray('  crouton add auth'))
  console.log(chalk.gray('  crouton add bookings i18n'))
  console.log(chalk.gray('  crouton add bookings --skip-migrations'))
  console.log()
}
