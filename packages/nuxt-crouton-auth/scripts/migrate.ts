#!/usr/bin/env node
/**
 * @crouton/auth Migration Helper Script
 *
 * Provides CLI commands for managing database migrations with @crouton/auth.
 * Uses Drizzle Kit under the hood for SQLite (D1) migrations.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts [command]
 *
 * Commands:
 *   status   - Check current migration status
 *   generate - Generate new migration files
 *   push     - Apply migrations to local database
 *   check    - Verify schema matches database
 *   reset    - Reset database (development only!)
 *   help     - Show this help message
 *
 * @example
 * ```bash
 * # Check current status
 * npx tsx packages/crouton-auth/scripts/migrate.ts status
 *
 * # Generate migrations after schema changes
 * npx tsx packages/crouton-auth/scripts/migrate.ts generate
 * ```
 */

import { execSync, spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(title: string): void {
  console.log()
  log(`┌─ ${title}`, 'cyan')
  log('│', 'cyan')
}

function logItem(label: string, value: string): void {
  log(`│  ${colors.dim}${label}:${colors.reset} ${value}`, 'cyan')
}

function logFooter(): void {
  log('└─', 'cyan')
  console.log()
}

function logError(message: string): void {
  console.error(`${colors.red}Error: ${message}${colors.reset}`)
}

function logSuccess(message: string): void {
  log(`✓ ${message}`, 'green')
}

function logWarning(message: string): void {
  log(`⚠ ${message}`, 'yellow')
}

/**
 * Find the project root directory (where package.json is)
 */
function findProjectRoot(): string {
  let dir = process.cwd()
  while (dir !== '/') {
    if (existsSync(join(dir, 'package.json'))) {
      return dir
    }
    dir = resolve(dir, '..')
  }
  throw new Error('Could not find project root (no package.json found)')
}

/**
 * Find the drizzle config file
 */
function findDrizzleConfig(projectRoot: string): string | null {
  const configNames = ['drizzle.config.ts', 'drizzle.config.js', 'drizzle.config.mjs']
  for (const name of configNames) {
    const configPath = join(projectRoot, name)
    if (existsSync(configPath)) {
      return configPath
    }
  }
  return null
}

/**
 * Get migration files from the migrations directory
 */
function getMigrationFiles(projectRoot: string): string[] {
  const migrationsDir = join(projectRoot, 'server', 'database', 'migrations')
  if (!existsSync(migrationsDir)) {
    return []
  }
  return readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
}

/**
 * Run a command and return the output
 */
function runCommand(command: string, cwd: string): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error: any) {
    throw new Error(error.stderr || error.message)
  }
}

/**
 * Run a command interactively (showing output in real-time)
 */
function runInteractive(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    })

    child.on('close', (code) => {
      resolve(code ?? 0)
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

// ============================================================================
// Commands
// ============================================================================

async function commandStatus(): Promise<void> {
  const projectRoot = findProjectRoot()
  const configPath = findDrizzleConfig(projectRoot)
  const migrations = getMigrationFiles(projectRoot)

  logHeader('@crouton/auth Migration Status')

  logItem('Project Root', projectRoot)
  logItem('Drizzle Config', configPath || 'Not found')
  logItem('Migrations Dir', join(projectRoot, 'server', 'database', 'migrations'))

  log('│', 'cyan')
  logItem('Total Migrations', String(migrations.length))

  if (migrations.length > 0) {
    log('│', 'cyan')
    log('│  Recent migrations:', 'cyan')
    const recent = migrations.slice(-5)
    for (const file of recent) {
      log(`│    ${colors.dim}→${colors.reset} ${file}`, 'cyan')
    }
  }

  logFooter()

  // Check for auth schema
  const authSchemaPath = join(projectRoot, 'packages', 'crouton-auth', 'server', 'database', 'schema', 'auth.ts')
  if (existsSync(authSchemaPath)) {
    logSuccess('Auth schema found')
  } else {
    logWarning('Auth schema not found at expected location')
  }

  // Check if schema is exported from main schema
  const mainSchemaPath = join(projectRoot, 'server', 'database', 'schema', 'index.ts')
  if (existsSync(mainSchemaPath)) {
    const schemaContent = require('fs').readFileSync(mainSchemaPath, 'utf-8')
    if (schemaContent.includes('@crouton/auth') || schemaContent.includes('crouton-auth')) {
      logSuccess('Auth schema is exported from main schema')
    } else {
      logWarning('Auth schema may not be exported from main schema')
      log(`  Add: export * from '@crouton/auth/server/database/schema/auth'`, 'dim')
    }
  }
}

async function commandGenerate(): Promise<void> {
  const projectRoot = findProjectRoot()
  const configPath = findDrizzleConfig(projectRoot)

  if (!configPath) {
    logError('No drizzle.config.ts found. Please create one in the project root.')
    process.exit(1)
  }

  logHeader('Generating Migrations')
  logItem('Config', configPath)
  logFooter()

  const code = await runInteractive('npx', ['drizzle-kit', 'generate'], projectRoot)

  if (code === 0) {
    logSuccess('Migrations generated successfully')
  } else {
    logError('Migration generation failed')
    process.exit(code)
  }
}

async function commandPush(): Promise<void> {
  const projectRoot = findProjectRoot()
  const configPath = findDrizzleConfig(projectRoot)

  if (!configPath) {
    logError('No drizzle.config.ts found. Please create one in the project root.')
    process.exit(1)
  }

  logHeader('Pushing Schema to Database')
  logItem('Config', configPath)
  logFooter()

  const code = await runInteractive('npx', ['drizzle-kit', 'push'], projectRoot)

  if (code === 0) {
    logSuccess('Schema pushed successfully')
  } else {
    logError('Schema push failed')
    process.exit(code)
  }
}

async function commandCheck(): Promise<void> {
  const projectRoot = findProjectRoot()
  const configPath = findDrizzleConfig(projectRoot)

  if (!configPath) {
    logError('No drizzle.config.ts found. Please create one in the project root.')
    process.exit(1)
  }

  logHeader('Checking Schema')
  logItem('Config', configPath)
  logFooter()

  const code = await runInteractive('npx', ['drizzle-kit', 'check'], projectRoot)

  if (code === 0) {
    logSuccess('Schema check passed')
  } else {
    logError('Schema check failed')
    process.exit(code)
  }
}

async function commandReset(): Promise<void> {
  const projectRoot = findProjectRoot()

  logWarning('This will RESET your local database!')
  logWarning('All data will be lost. This should only be used in development.')
  console.log()

  // Check if we're in a production-like environment
  if (process.env.NODE_ENV === 'production') {
    logError('Cannot reset database in production environment')
    process.exit(1)
  }

  logHeader('Resetting Local Database')
  logFooter()

  // Remove local D1 database files
  const d1Path = join(projectRoot, '.wrangler', 'd1')
  if (existsSync(d1Path)) {
    try {
      require('fs').rmSync(d1Path, { recursive: true, force: true })
      logSuccess('Removed local D1 database')
    } catch (error: any) {
      logError(`Failed to remove D1 database: ${error.message}`)
    }
  } else {
    log('No local D1 database found', 'dim')
  }

  // Also remove .nuxt cache for good measure
  const nuxtPath = join(projectRoot, '.nuxt')
  if (existsSync(nuxtPath)) {
    try {
      require('fs').rmSync(nuxtPath, { recursive: true, force: true })
      logSuccess('Removed .nuxt cache')
    } catch (error: any) {
      logWarning(`Failed to remove .nuxt cache: ${error.message}`)
    }
  }

  console.log()
  log('Database reset complete. Run `npx nuxt dev` to recreate with fresh schema.', 'green')
}

function commandHelp(): void {
  console.log(`
${colors.bold}@crouton/auth Migration Helper${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npx tsx packages/crouton-auth/scripts/migrate.ts <command>

${colors.cyan}Commands:${colors.reset}
  ${colors.green}status${colors.reset}    Check current migration status
  ${colors.green}generate${colors.reset}  Generate new migration files from schema changes
  ${colors.green}push${colors.reset}      Apply migrations to local database directly
  ${colors.green}check${colors.reset}     Verify schema consistency
  ${colors.green}reset${colors.reset}     Reset local database (development only!)
  ${colors.green}help${colors.reset}      Show this help message

${colors.cyan}Examples:${colors.reset}
  ${colors.dim}# Check current status${colors.reset}
  npx tsx packages/crouton-auth/scripts/migrate.ts status

  ${colors.dim}# After changing schema, generate migration${colors.reset}
  npx tsx packages/crouton-auth/scripts/migrate.ts generate

  ${colors.dim}# Apply changes to local DB${colors.reset}
  npx tsx packages/crouton-auth/scripts/migrate.ts push

${colors.cyan}Notes:${colors.reset}
  - Uses Drizzle Kit for SQLite (D1) migrations
  - For NuxtHub deployments, migrations are auto-applied on deploy
  - See docs/MIGRATION.md for detailed documentation
`)
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2]

  switch (command) {
    case 'status':
      await commandStatus()
      break
    case 'generate':
      await commandGenerate()
      break
    case 'push':
      await commandPush()
      break
    case 'check':
      await commandCheck()
      break
    case 'reset':
      await commandReset()
      break
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      commandHelp()
      break
    default:
      logError(`Unknown command: ${command}`)
      commandHelp()
      process.exit(1)
  }
}

main().catch((error) => {
  logError(error.message)
  process.exit(1)
})
