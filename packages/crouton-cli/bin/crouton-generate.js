#!/usr/bin/env node

import { program } from 'commander'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import the main generator script
const generatorPath = join(__dirname, '..', 'lib', 'generate-collection.mjs')

// Check if generator exists
if (!fs.existsSync(generatorPath)) {
  console.error(chalk.red('Error: Generator script not found. Please ensure the package is properly installed.'))
  process.exit(1)
}

// Setup CLI
program
  .name('crouton-generate')
  .description('Generate CRUD collections for Nuxt Crouton')
  .version('1.0.0')
  .option('-c, --config <path>', 'Use config file (works without other args)')

// Handle global --config flag before any subcommand
// This allows: crouton-generate --config ./my-config.js
program.hook('preAction', async (thisCommand, actionCommand) => {
  const globalOpts = thisCommand.opts()
  if (globalOpts.config && actionCommand.name() !== 'config') {
    const spinner = ora('Loading config...').start()
    try {
      const args = ['--config', globalOpts.config]
      spinner.stop()
      process.argv = ['node', 'generate-collection.mjs', ...args]
      await import(generatorPath)
      process.exit(0)
    } catch (error) {
      spinner.fail('Generation failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  }
})

// Config command (still available for explicit use)
program
  .command('config [configPath]')
  .description('Generate collections using a config file')
  .option('--only <name>', 'Generate only a specific collection')
  .action(async (configPath, options) => {
    const spinner = ora('Loading config...').start()

    try {
      // Auto-detect config file if not specified
      if (!configPath) {
        const extensions = ['.js', '.mjs', '.cjs', '.ts']
        const baseName = './crouton.config'
        for (const ext of extensions) {
          const testPath = `${baseName}${ext}`
          if (fs.existsSync(testPath)) {
            configPath = testPath
            break
          }
        }
        // Fallback to default if no config file found
        if (!configPath) {
          configPath = './crouton.config.js'
        }
      }

      // Pass config as the first argument to the generator
      const args = ['--config', configPath]

      // Add --only flag if specified
      if (options.only) {
        args.push(`--only=${options.only}`)
      }

      spinner.stop()

      // Import and execute the generator script directly
      process.argv = ['node', 'generate-collection.mjs', ...args]
      await import(generatorPath)
    } catch (error) {
      spinner.fail('Generation failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })

// Main generate command
program
  .command('generate [layer] [collection]', { isDefault: true })
  .description('Generate collections (auto-detects crouton.config.js if no args)')
  .option('-f, --fields-file <path>', 'Path to JSON schema file')
  .option('-d, --dialect <type>', 'Database dialect (pg or sqlite)', 'sqlite')
  .option('--auto-relations', 'Add relation stubs in comments')
  .option('--dry-run', 'Preview what will be generated')
  .option('--no-translations', 'Skip translation fields')
  .option('--force', 'Force generation despite missing dependencies')
  .option('--no-db', 'Skip database table creation')
  .option('--hierarchy', 'Enable hierarchy support (parentId, path, depth, order)')
  .option('--seed', 'Generate seed data file using drizzle-seed')
  .option('--count <number>', 'Number of seed records (default: 25)', '25')
  .option('-c, --config <path>', 'Use config file instead of CLI args')
  .action(async (layer, collection, options) => {
    // If no layer/collection provided, auto-detect config file
    if (!layer && !collection && !options.config) {
      const extensions = ['.js', '.mjs', '.cjs', '.ts']
      const baseName = './crouton.config'
      let configPath = null

      for (const ext of extensions) {
        const testPath = `${baseName}${ext}`
        if (fs.existsSync(testPath)) {
          configPath = testPath
          break
        }
      }

      if (!configPath) {
        console.error(chalk.red('Error: No crouton.config.js found in current directory'))
        console.log(chalk.yellow('\nTo generate collections, either:'))
        console.log(chalk.cyan('  1. Create a crouton.config.js file in this directory'))
        console.log(chalk.cyan('  2. Use explicit arguments: crouton generate <layer> <collection> --fields-file=schema.json'))
        process.exit(1)
      }

      // Use config mode
      const spinner = ora('Loading config...').start()
      try {
        const args = ['--config', configPath]
        spinner.stop()
        process.argv = ['node', 'generate-collection.mjs', ...args]
        await import(generatorPath)
        return
      } catch (error) {
        spinner.fail('Generation failed')
        console.error(chalk.red(error.message))
        process.exit(1)
      }
    }

    // Validate that both layer AND collection are provided for explicit mode
    if ((!layer || !collection) && !options.config) {
      console.error(chalk.red('Error: Both layer and collection are required'))
      console.log(chalk.yellow('\nUsage: crouton generate <layer> <collection> --fields-file=schema.json'))
      console.log(chalk.yellow('   Or: crouton generate (auto-detects crouton.config.js)'))
      process.exit(1)
    }

    const spinner = ora('Generating collection...').start()

    try {
      // If config is provided, use config mode
      if (options.config) {
        const args = ['--config', options.config]

        spinner.stop()

        // Import and execute the generator script directly
        process.argv = ['node', 'generate-collection.mjs', ...args]
        await import(generatorPath)
        return
      }

      // Build args for the generator script (normal CLI mode)
      const args = [layer, collection]

      if (options.fieldsFile) {
        args.push(`--fields-file=${options.fieldsFile}`)
      }
      if (options.dialect) {
        args.push(`--dialect=${options.dialect}`)
      }
      if (options.autoRelations) {
        args.push('--auto-relations')
      }
      if (options.dryRun) {
        args.push('--dry-run')
      }
      // Commander.js sets --no-* flags to false when used
      if (options.translations === false) {
        args.push('--no-translations')
      }
      if (options.force) {
        args.push('--force')
      }
      if (options.db === false) {
        args.push('--no-db')
      }
      if (options.hierarchy) {
        args.push('--hierarchy')
      }
      if (options.seed) {
        args.push('--seed')
        args.push(`--count=${options.count || '25'}`)
      }

      spinner.stop()

      // Import and execute the generator script directly
      process.argv = ['node', 'generate-collection.mjs', ...args]
      await import(generatorPath)
    } catch (error) {
      spinner.fail('Generation failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })

// Install command
program
  .command('install')
  .description('Install required Nuxt modules')
  .action(async () => {
    const spinner = ora('Checking modules...').start()

    try {
      const installModulesPath = join(__dirname, '..', 'lib', 'install-modules.mjs')

      if (!fs.existsSync(installModulesPath)) {
        spinner.fail('Install script not found')
        console.log(chalk.yellow('Please install modules manually:'))
        console.log(chalk.cyan('  pnpm add @fyit/crouton'))
        process.exit(1)
      }

      spinner.stop()

      const { install } = await import(installModulesPath)
      await install()
    } catch (error) {
      spinner.fail('Installation failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })

// Init command - creates example schema
program
  .command('init')
  .description('Create an example schema file')
  .option('-o, --output <path>', 'Output path for schema', './crouton-schema.json')
  .action(async (options) => {
    const exampleSchema = {
      id: {
        type: 'string',
        meta: {
          primaryKey: true
        }
      },
      name: {
        type: 'string',
        meta: {
          required: true,
          maxLength: 255
        }
      },
      description: {
        type: 'text'
      },
      price: {
        type: 'decimal',
        meta: {
          precision: 10,
          scale: 2
        }
      },
      inStock: {
        type: 'boolean'
      },
      createdAt: {
        type: 'date'
      }
    }

    try {
      await fs.writeJSON(options.output, exampleSchema, { spaces: 2 })
      console.log(chalk.green(`✓ Created example schema at ${options.output}`))
      console.log(chalk.gray('\nNow you can generate a collection:'))
      console.log(chalk.cyan(`  crouton-generate shop products --fields-file=${options.output}`))
    } catch (error) {
      console.error(chalk.red('Failed to create schema file:'), error.message)
      process.exit(1)
    }
  })

// Add command - adds modules or features to existing projects
program
  .command('add [items...]')
  .description('Add Crouton modules or features to your project')
  .option('--skip-migrations', 'Skip migration generation and application')
  .option('--skip-install', 'Skip package installation (assume already installed)')
  .option('--dry-run', 'Preview what will be done without making changes')
  .option('--force', 'Force reinstall even if already installed')
  .option('--list', 'List all available modules')
  .action(async (items, options) => {
    try {
      // Handle --list flag or no items
      if (options.list || !items || items.length === 0) {
        const addModulePath = join(__dirname, '..', 'lib', 'add-module.mjs')
        const { listAvailableModules } = await import(addModulePath)
        listAvailableModules()
        return
      }

      // Import module registry to check if items are modules
      const registryPath = join(__dirname, '..', 'lib', 'module-registry.mjs')
      const { getModule } = await import(registryPath)

      // Separate modules from features
      const modules = []
      const features = []

      for (const item of items) {
        if (getModule(item)) {
          modules.push(item)
        } else if (item === 'events') {
          features.push(item)
        } else {
          // Unknown - try as module first (will show helpful error)
          modules.push(item)
        }
      }

      // Add modules if any
      if (modules.length > 0) {
        const addModulePath = join(__dirname, '..', 'lib', 'add-module.mjs')
        const { addModules } = await import(addModulePath)

        const result = await addModules(modules, {
          skipInstall: options.skipInstall,
          skipMigrations: options.skipMigrations,
          dryRun: options.dryRun,
          force: options.force
        })

        if (!result.success) {
          process.exit(1)
        }
      }

      // Add features if any
      for (const feature of features) {
        if (feature === 'events') {
          const addEventsPath = join(__dirname, '..', 'lib', 'add-events.mjs')

          if (!fs.existsSync(addEventsPath)) {
            console.error(chalk.red('Error: add-events script not found. Please ensure the package is properly installed.'))
            process.exit(1)
          }

          const { addEvents } = await import(addEventsPath)
          await addEvents({
            dryRun: options.dryRun,
            force: options.force
          })
        }
      }
    } catch (error) {
      console.error(chalk.red('Add failed:'), error.message)
      if (process.env.DEBUG) {
        console.error(error.stack)
      }
      process.exit(1)
    }
  })

// Rollback command - removes a single collection
program
  .command('rollback <layer> <collection>')
  .description('Rollback/remove a generated collection')
  .option('--dry-run', 'Preview what will be removed')
  .option('--keep-files', 'Keep generated files, only clean configs')
  .option('--force', 'Skip confirmation prompts')
  .action(async (layer, collection, options) => {
    try {
      const rollbackPath = join(__dirname, '..', 'lib', 'rollback-collection.mjs')

      if (!fs.existsSync(rollbackPath)) {
        console.error(chalk.red('Error: Rollback script not found. Please ensure the package is properly installed.'))
        process.exit(1)
      }

      // Build args for the rollback script
      const args = [layer, collection]

      if (options.dryRun) {
        args.push('--dry-run')
      }
      if (options.keepFiles) {
        args.push('--keep-files')
      }
      if (options.force) {
        args.push('--force')
      }

      // Import and execute the rollback script directly
      process.argv = ['node', 'rollback-collection.mjs', ...args]
      await import(rollbackPath)
    } catch (error) {
      console.error(chalk.red('Rollback failed:'), error.message)
      process.exit(1)
    }
  })

// Rollback bulk command - removes multiple collections, entire layer, or from config
program
  .command('rollback-bulk')
  .description('Bulk rollback operations (layer, config, or multiple collections)')
  .option('--layer <name>', 'Rollback entire layer')
  .option('--config <path>', 'Rollback using config file')
  .option('--dry-run', 'Preview what will be removed')
  .option('--keep-files', 'Keep generated files, only clean configs')
  .option('--force', 'Skip confirmation prompts')
  .action(async (options) => {
    try {
      const rollbackBulkPath = join(__dirname, '..', 'lib', 'rollback-bulk.mjs')

      if (!fs.existsSync(rollbackBulkPath)) {
        console.error(chalk.red('Error: Rollback bulk script not found. Please ensure the package is properly installed.'))
        process.exit(1)
      }

      // Build args for the rollback bulk script
      const args = []

      if (options.layer) {
        args.push(`--layer=${options.layer}`)
      } else if (options.config) {
        args.push(`--config=${options.config}`)
      } else {
        console.error(chalk.red('Error: Must specify either --layer or --config'))
        console.log(chalk.yellow('\nExamples:'))
        console.log(chalk.cyan('  crouton-generate rollback-bulk --layer=shop'))
        console.log(chalk.cyan('  crouton-generate rollback-bulk --config=./crouton.config.js'))
        process.exit(1)
      }

      if (options.dryRun) {
        args.push('--dry-run')
      }
      if (options.keepFiles) {
        args.push('--keep-files')
      }
      if (options.force) {
        args.push('--force')
      }

      // Import and execute the rollback bulk script directly
      process.argv = ['node', 'rollback-bulk.mjs', ...args]
      await import(rollbackBulkPath)
    } catch (error) {
      console.error(chalk.red('Bulk rollback failed:'), error.message)
      process.exit(1)
    }
  })

// Rollback interactive command - UI-based selection
program
  .command('rollback-interactive')
  .description('Interactive rollback with selection UI')
  .option('--dry-run', 'Preview what will be removed')
  .option('--keep-files', 'Keep generated files, only clean configs')
  .action(async (options) => {
    try {
      const rollbackInteractivePath = join(__dirname, '..', 'lib', 'rollback-interactive.mjs')

      if (!fs.existsSync(rollbackInteractivePath)) {
        console.error(chalk.red('Error: Rollback interactive script not found. Please ensure the package is properly installed.'))
        process.exit(1)
      }

      // Build args for the rollback interactive script
      const args = []

      if (options.dryRun) {
        args.push('--dry-run')
      }
      if (options.keepFiles) {
        args.push('--keep-files')
      }

      // Import and execute the rollback interactive script directly
      process.argv = ['node', 'rollback-interactive.mjs', ...args]
      await import(rollbackInteractivePath)
    } catch (error) {
      console.error(chalk.red('Interactive rollback failed:'), error.message)
      process.exit(1)
    }
  })

// Seed translations command - import JSON locale files to database
program
  .command('seed-translations')
  .description('Seed translations from JSON locale files to database')
  .option('--layer <name>', 'Seed from specific layer only')
  .option('--team <id>', 'Team ID/slug to seed to (default: system)')
  .option('--dry-run', 'Preview translations without seeding')
  .option('--force', 'Overwrite existing translations')
  .option('--api-url <url>', 'API base URL (default: http://localhost:3000)')
  .option('--sql', 'Output SQL statements instead of using API')
  .action(async (options) => {
    try {
      const seedPath = join(__dirname, '..', 'lib', 'seed-translations.mjs')

      if (!fs.existsSync(seedPath)) {
        console.error(chalk.red('Error: Seed translations script not found. Please ensure the package is properly installed.'))
        process.exit(1)
      }

      // Build args for the seed script
      const args = []

      if (options.layer) {
        args.push(`--layer=${options.layer}`)
      }
      if (options.team) {
        args.push(`--team=${options.team}`)
      }
      if (options.dryRun) {
        args.push('--dry-run')
      }
      if (options.force) {
        args.push('--force')
      }
      if (options.apiUrl) {
        args.push(`--api-url=${options.apiUrl}`)
      }
      if (options.sql) {
        args.push('--sql')
      }

      // Import and execute the seed script
      process.argv = ['node', 'seed-translations.mjs', ...args]
      const { seedTranslationsFromJson } = await import(seedPath)
      await seedTranslationsFromJson()
    } catch (error) {
      console.error(chalk.red('Seed translations failed:'), error.message)
      process.exit(1)
    }
  })

// Parse CLI arguments
program.parse(process.argv)

// Handle --config flag without any subcommand
// e.g.: crouton-generate --config ./my-config.js
const opts = program.opts()
if (opts.config && !program.args.length) {
  (async () => {
    const spinner = ora('Loading config...').start()
    try {
      const args = ['--config', opts.config]
      spinner.stop()
      process.argv = ['node', 'generate-collection.mjs', ...args]
      await import(generatorPath)
    } catch (error) {
      spinner.fail('Generation failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })()
} else if (!process.argv.slice(2).length) {
  // Show help if no arguments
  program.outputHelp()
}
