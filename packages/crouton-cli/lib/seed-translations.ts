#!/usr/bin/env node
/**
 * Seed translations from JSON locale files into the translations_ui database table
 *
 * Usage:
 *   crouton-generate seed-translations [options]
 *
 * Options:
 *   --app <path>       App directory to read nuxt.config.ts from (auto-detects packages)
 *   --layer <name>     Seed from specific layer/package only (default: all)
 *   --team <id>        Team ID to seed to (default: system/null)
 *   --dry-run          Preview what will be seeded
 *   --force            Overwrite existing translations
 *   --api-url <url>    API base URL (default: http://localhost:3000)
 */

import fsp from 'node:fs/promises'
import path from 'node:path'
import consola from 'consola'

interface SeedTranslationsConfig {
  app: string | null
  layer: string | null
  team: string
  dryRun: boolean
  force: boolean
  apiUrl: string
  help: boolean
  sql?: boolean
}

interface LocaleFile {
  layer: string
  type: string
  locale: string
  path: string
}

interface TranslationItem {
  keyPath: string
  value: string
}

interface ParsedTranslation {
  layer: string
  type: string
  locale: string
  items: TranslationItem[]
}

interface GroupedTranslation {
  layer: string
  keyPath: string
  category: string
  values: Record<string, string>
}

interface SeedResult {
  success: number
  skipped: number
  errors: number
}

// Packages that are auto-included when extending nuxt-crouton
const AUTO_INCLUDES: Record<string, string[]> = {
  'nuxt-crouton': ['nuxt-crouton-i18n', 'nuxt-crouton-auth', 'nuxt-crouton-admin']
}

// Parse command line arguments
function parseArgs(): SeedTranslationsConfig {
  const args = process.argv.slice(2)

  const getArg = (name: string): string | null => {
    const flag = args.find(a => a.startsWith(`--${name}=`))
    if (flag) return flag.split('=')[1]
    const idx = args.indexOf(`--${name}`)
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
      return args[idx + 1]
    }
    return null
  }

  return {
    app: getArg('app'),
    layer: getArg('layer'),
    team: getArg('team') || 'system',
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    apiUrl: getArg('api-url') || 'http://localhost:3000',
    help: args.includes('--help') || args.includes('-h')
  }
}

/**
 * Parse nuxt.config.ts to extract the extends array
 * Uses simple regex parsing to avoid requiring TypeScript compilation
 */
async function parseNuxtConfigExtends(appDir: string): Promise<string[]> {
  const configPath = path.join(appDir, 'nuxt.config.ts')

  try {
    const content = await fsp.readFile(configPath, 'utf-8')

    // Match extends array - handles multi-line arrays
    const extendsMatch = content.match(/extends\s*:\s*\[([\s\S]*?)\]/)
    if (!extendsMatch) {
      consola.warn(`  No extends array found in ${configPath}`)
      return []
    }

    // Extract string values from the array
    const arrayContent = extendsMatch[1]
    const packages: string[] = []

    // Match quoted strings (both single and double quotes)
    const stringMatches = arrayContent.matchAll(/['"]([^'"]+)['"]/g)
    for (const match of stringMatches) {
      packages.push(match[1])
    }

    return packages
  } catch (error) {
    if (error.code === 'ENOENT') {
      consola.warn(`  No nuxt.config.ts found in ${appDir}`)
    } else {
      consola.error(`  Error reading config: ${error.message}`)
    }
    return []
  }
}

/**
 * Map npm package name to local package directory name
 * @fyit/crouton -> crouton
 * @fyit/crouton-bookings -> crouton-bookings
 */
function packageNameToDir(packageName: string): string | null {
  // Handle scoped packages: @scope/name -> name
  if (packageName.startsWith('@')) {
    const parts = packageName.split('/')
    return parts[parts.length - 1]
  }
  // Handle relative paths: ./layers/bookings -> null (skip, it's local)
  if (packageName.startsWith('.')) {
    return null
  }
  return packageName
}

/**
 * Get all package directories that should be included based on app config
 */
async function getPackagesFromAppConfig(appDir: string): Promise<Set<string> | null> {
  consola.info(`\nReading app config from ${appDir}...`)

  const extends_ = await parseNuxtConfigExtends(appDir)
  if (extends_.length === 0) {
    return null // Fall back to scanning all packages
  }

  const packageDirs = new Set<string>()

  for (const pkg of extends_) {
    const dirName = packageNameToDir(pkg)
    if (dirName) {
      packageDirs.add(dirName)

      // Add auto-included packages
      if (AUTO_INCLUDES[dirName]) {
        for (const included of AUTO_INCLUDES[dirName]) {
          packageDirs.add(included)
        }
      }
    }
  }

  consola.success(`Found ${packageDirs.size} packages to seed from:`)
  for (const dir of packageDirs) {
    console.log(`    ${dir}`)
  }

  return packageDirs
}

// Find all locale files in layers and packages
async function findLocaleFiles(specificLayer: string | null = null, allowedPackages: Set<string> | null = null): Promise<LocaleFile[]> {
  const localeFiles: LocaleFile[] = []

  // Search paths: layers/ (app-specific) and packages/ (monorepo)
  const searchRoots = [
    { dir: path.resolve('layers'), type: 'layer' },
    { dir: path.resolve('packages'), type: 'package' }
  ]

  // Possible locale subdirectories within each layer/package
  const localePaths = ['i18n/locales', 'locales']

  for (const { dir, type } of searchRoots) {
    try {
      const entries = await fsp.readdir(dir)

      for (const entry of entries) {
        // Skip if specific layer/package requested and this isn't it
        if (specificLayer && entry !== specificLayer) continue

        // Skip if we have an allowed list and this package isn't in it
        if (allowedPackages && type === 'package' && !allowedPackages.has(entry)) {
          continue
        }

        const entryPath = path.join(dir, entry)

        // Check if it's a directory
        try {
          const stat = await fsp.stat(entryPath)
          if (!stat.isDirectory()) continue
        } catch {
          continue
        }

        // Try each possible locale path
        for (const localePath of localePaths) {
          const localesDir = path.join(entryPath, localePath)

          try {
            const files = await fsp.readdir(localesDir)
            for (const file of files) {
              if (file.endsWith('.json')) {
                localeFiles.push({
                  layer: entry,
                  type,
                  locale: file.replace('.json', ''),
                  path: path.join(localesDir, file)
                })
              }
            }
          } catch {
            // No locales directory at this path, skip
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  if (localeFiles.length === 0) {
    consola.warn('No locale files found in layers/ or packages/')
  }

  return localeFiles
}

// Flatten nested JSON object into dot-notation keys
function flattenTranslations(obj: Record<string, any>, prefix: string = ''): TranslationItem[] {
  const result: TranslationItem[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse into nested objects
      result.push(...flattenTranslations(value, fullKey))
    } else if (typeof value === 'string') {
      result.push({ keyPath: fullKey, value })
    }
  }

  return result
}

// Group translations by key across locales
function groupTranslationsByKey(localeFiles: LocaleFile[], translations: ParsedTranslation[]): GroupedTranslation[] {
  const grouped = new Map<string, GroupedTranslation>()

  for (const { layer, locale, items } of translations) {
    for (const { keyPath, value } of items) {
      const key = `${layer}:${keyPath}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          layer,
          keyPath,
          category: keyPath.split('.')[0] || 'general',
          values: {}
        })
      }

      grouped.get(key).values[locale] = value
    }
  }

  return Array.from(grouped.values())
}

// Seed translations to database via API
async function seedTranslations(translations: GroupedTranslation[], options: { team: string; dryRun: boolean; force: boolean; apiUrl: string }): Promise<SeedResult> {
  const { team, dryRun, force, apiUrl } = options

  consola.info(`\nSeeding ${translations.length} translations...`)

  if (dryRun) {
    consola.warn('\n[DRY RUN] Would seed the following translations:\n')

    for (const t of translations.slice(0, 20)) {
      console.log(`  ${t.keyPath}`)
      for (const [locale, value] of Object.entries(t.values)) {
        const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value
        console.log(`    ${locale}: ${displayValue}`)
      }
    }

    if (translations.length > 20) {
      console.log(`  ... and ${translations.length - 20} more`)
    }

    return { success: 0, skipped: 0, errors: 0 }
  }

  let success = 0
  let skipped = 0
  let errors = 0

  // Determine the API endpoint
  // For system translations, use the dev-only seed endpoint (no auth required)
  // For team-specific translations, use the authenticated team endpoint
  const endpoint = team === 'system'
    ? `${apiUrl}/api/seed/translations-ui`
    : `${apiUrl}/api/teams/${team}/translations-ui`

  for (const translation of translations) {
    try {
      const payload = {
        keyPath: translation.keyPath,
        category: translation.category,
        namespace: 'ui',
        values: translation.values,
        description: `Seeded from ${translation.layer} layer`,
        isOverrideable: true
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        success++
        process.stdout.write('.')
      } else if (response.status === 409 || response.status === 400) {
        // Already exists
        if (force) {
          // Try to update instead
          // TODO: Implement PATCH for updates
          skipped++
          process.stdout.write('.')
        } else {
          skipped++
          process.stdout.write('.')
        }
      } else {
        errors++
        process.stdout.write('.')
      }
    } catch (error) {
      errors++
      process.stdout.write('.')
    }
  }

  console.log('\n')

  return { success, skipped, errors }
}

// Generate SQL INSERT statements for manual seeding
function generateSqlStatements(translations: GroupedTranslation[], teamId: string | null = null): string[] {
  const statements: string[] = []

  for (const t of translations) {
    const valuesJson = JSON.stringify(t.values).replace(/'/g, '\'\'')
    const teamValue = teamId ? `'${teamId}'` : 'NULL'

    statements.push(
      `INSERT INTO translations_ui (id, user_id, team_id, namespace, key_path, category, values, description, is_overrideable, created_at, updated_at)
VALUES (
  lower(hex(randomblob(10))),
  'seed-script',
  ${teamValue},
  'ui',
  '${t.keyPath}',
  '${t.category}',
  '${valuesJson}',
  'Seeded from ${t.layer} layer',
  1,
  unixepoch(),
  unixepoch()
) ON CONFLICT (team_id, namespace, key_path) DO UPDATE SET
  values = excluded.values,
  updated_at = unixepoch();`
    )
  }

  return statements
}

// Main function
export async function seedTranslationsFromJson(options: Partial<SeedTranslationsConfig> = {}): Promise<void> {
  const config: SeedTranslationsConfig = { ...parseArgs(), ...options }

  if (config.help) {
    console.log(`
crouton-generate seed-translations

Seed translations from JSON locale files into the translations_ui database.

Usage:
  crouton-generate seed-translations [options]

Options:
  --app <path>       App directory to read nuxt.config.ts from (recommended)
  --layer <name>     Seed from specific layer/package only (default: all)
  --team <id>        Team ID/slug to seed to (default: system)
  --dry-run          Preview translations without seeding
  --force            Overwrite existing translations
  --api-url <url>    API base URL (default: http://localhost:3000)
  --sql              Output SQL statements instead of using API
  -h, --help         Show this help message

Search Paths:
  - layers/*/i18n/locales/*.json
  - layers/*/locales/*.json
  - packages/*/i18n/locales/*.json
  - packages/*/locales/*.json

Examples:
  # Seed only packages used by your app (recommended)
  crouton-generate seed-translations --app apps/test-bookings

  # Preview what would be seeded
  crouton-generate seed-translations --app apps/test-bookings --dry-run

  # Seed from specific package only
  crouton-generate seed-translations --layer nuxt-crouton-i18n

  # Output SQL for manual insertion
  crouton-generate seed-translations --sql > seed.sql

Note:
  The dev server must be running for API seeding to work.
  Use --app to only seed translations from packages your app actually uses.
`)
    return
  }

  console.log('\n📦 Crouton Translation Seeder\n')
  console.log(`  App: ${config.app || '(all packages)'}`)
  console.log(`  Layer: ${config.layer || 'all'}`)
  console.log(`  Team: ${config.team}`)
  console.log(`  Mode: ${config.dryRun ? 'dry-run' : 'seed'}`)

  // Get allowed packages from app config (if --app specified)
  let allowedPackages: Set<string> | null = null
  if (config.app) {
    allowedPackages = await getPackagesFromAppConfig(config.app)
    if (!allowedPackages || allowedPackages.size === 0) {
      consola.warn('\nCould not determine packages from app config, falling back to all packages')
      allowedPackages = null
    }
  }

  // Find locale files
  consola.info('\nScanning for locale files...')
  const localeFiles = await findLocaleFiles(config.layer, allowedPackages)

  if (localeFiles.length === 0) {
    consola.warn('\nNo locale files found')
    console.log('Searched: layers/*/i18n/locales/, layers/*/locales/')
    console.log('          packages/*/i18n/locales/, packages/*/locales/')
    return
  }

  consola.success(`Found ${localeFiles.length} locale file(s)`)

  // Parse locale files
  consola.info('\nParsing translations...')
  const translations: ParsedTranslation[] = []

  for (const file of localeFiles) {
    try {
      const content = await fsp.readFile(file.path, 'utf-8')
      const json = JSON.parse(content)
      const items = flattenTranslations(json)

      translations.push({
        layer: file.layer,
        type: file.type,
        locale: file.locale,
        items
      })

      const prefix = file.type === 'package' ? 'pkg:' : ''
      console.log(`  ${prefix}${file.layer}/${file.locale}.json: ${items.length} keys`)
    } catch (error) {
      consola.error(`  Error parsing ${file.path}: ${error.message}`)
    }
  }

  // Group by key
  const grouped = groupTranslationsByKey(localeFiles, translations)
  consola.success(`${grouped.length} unique translation keys\n`)

  // Check if --sql flag is set
  if (config.sql || process.argv.includes('--sql')) {
    const sql = generateSqlStatements(grouped, config.team === 'system' ? null : config.team)
    consola.info('-- SQL Statements for translations_ui table')
    consola.info('-- Run these in your SQLite database\n')
    console.log(sql.join('\n\n'))
    return
  }

  // Seed to database
  const result = await seedTranslations(grouped, config)

  // Summary
  console.log('Summary:')
  consola.success(`  Success: ${result.success}`)
  if (result.skipped > 0) {
    consola.warn(`  Skipped: ${result.skipped} (already exist)`)
  }
  if (result.errors > 0) {
    consola.error(`  Errors: ${result.errors}`)
  }

  if (result.errors > 0) {
    consola.warn('\nTip: Make sure your dev server is running at ' + config.apiUrl)
    console.log('Or use --sql flag to generate SQL statements for direct insertion.')
  }
}

// Run if called directly
if (process.argv[1].includes('seed-translations')) {
  seedTranslationsFromJson()
}
