#!/usr/bin/env npx tsx
/**
 * Seed CLI for nuxt-crouton-i18n
 *
 * Reads locale files from multiple sources and seeds the translationsUi table
 * with system-level translations (teamId: null, isOverrideable: true)
 *
 * Usage:
 *   pnpm crouton:i18n:seed [options]
 *
 * Options:
 *   --dry-run     Preview what will be seeded without making changes
 *   --sql         Output SQL statements instead of using API
 *   --api-url     API URL for seeding (default: http://localhost:3000)
 *   --team-id     Team ID to seed to (default: null for system)
 *   --force       Overwrite existing translations
 *   --source      Specific source directory to seed from
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface TranslationEntry {
  keyPath: string
  category: string
  values: Record<string, string>
  source: string
}

interface CliOptions {
  dryRun: boolean
  sql: boolean
  apiUrl: string
  teamId: string | null
  force: boolean
  source: string | null
}

// Simple nanoid-like ID generator (11 chars, alphanumeric + _-)
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  return Array.from(
    { length: 21 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    sql: false,
    apiUrl: 'http://localhost:3000',
    teamId: null,
    force: false,
    source: null
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--dry-run':
        options.dryRun = true
        break
      case '--sql':
        options.sql = true
        break
      case '--force':
        options.force = true
        break
      case '--api-url':
        options.apiUrl = args[++i] || options.apiUrl
        break
      case '--team-id':
        options.teamId = args[++i] || null
        break
      case '--source':
        options.source = args[++i] || null
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
nuxt-crouton-i18n Seed CLI

Seeds translationsUi table with translations from locale JSON files.

USAGE:
  pnpm crouton:i18n:seed [options]

OPTIONS:
  --dry-run     Preview translations without seeding
  --sql         Output SQL statements (for direct database use)
  --api-url     API endpoint URL (default: http://localhost:3000)
  --team-id     Seed to specific team (default: null = system)
  --force       Overwrite existing translations
  --source      Seed from specific directory only
  -h, --help    Show this help message

EXAMPLES:
  # Preview what will be seeded
  pnpm crouton:i18n:seed --dry-run

  # Generate SQL for manual insertion
  pnpm crouton:i18n:seed --sql > seed.sql

  # Seed using local API
  pnpm crouton:i18n:seed --api-url http://localhost:3000

  # Seed from specific source only
  pnpm crouton:i18n:seed --source ./layers/bookings/i18n/locales

LOCALE SOURCES (in order, later sources can override):
  1. nuxt-crouton-i18n/locales/         (i18n layer UI strings)
  2. nuxt-crouton-supersaas/i18n/locales/ (app-level strings)
  3. [app]/layers/*/i18n/locales/       (domain layer strings)
  4. [app]/i18n/locales/                (app-level overrides)
`)
}

/**
 * Flatten nested object to dot-notation paths
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
    } else if (typeof value === 'string') {
      result[newKey] = value
    }
    // Skip non-string primitives (numbers, booleans, null, arrays)
  }

  return result
}

/**
 * Read and parse a JSON locale file
 */
function readLocaleFile(filePath: string): Record<string, string> | null {
  try {
    if (!existsSync(filePath)) return null
    const content = readFileSync(filePath, 'utf-8')
    const json = JSON.parse(content)
    return flattenObject(json)
  } catch (error) {
    console.warn(`Warning: Failed to read ${filePath}:`, error)
    return null
  }
}

/**
 * Discover locale directories to process
 */
function discoverLocaleSources(options: CliOptions): string[] {
  const sources: string[] = []

  // If specific source is provided, use only that
  if (options.source) {
    const resolvedSource = resolve(options.source)
    if (existsSync(resolvedSource)) {
      return [resolvedSource]
    }
    console.error(`Error: Source directory not found: ${resolvedSource}`)
    process.exit(1)
  }

  // Get the packages directory (parent of nuxt-crouton-i18n)
  const packagesDir = resolve(__dirname, '..', '..')

  // 1. nuxt-crouton-i18n/locales
  const i18nLocales = resolve(packagesDir, 'nuxt-crouton-i18n', 'locales')
  if (existsSync(i18nLocales)) {
    sources.push(i18nLocales)
  }

  // 2. nuxt-crouton-supersaas/i18n/locales
  const supersaasLocales = resolve(packagesDir, 'nuxt-crouton-supersaas', 'i18n', 'locales')
  if (existsSync(supersaasLocales)) {
    sources.push(supersaasLocales)
  }

  // 3. Look for layers in CWD (when running from an app)
  const cwd = process.cwd()
  const layersDir = resolve(cwd, 'layers')
  if (existsSync(layersDir) && statSync(layersDir).isDirectory()) {
    const layers = readdirSync(layersDir)
    for (const layer of layers) {
      const layerLocales = resolve(layersDir, layer, 'i18n', 'locales')
      if (existsSync(layerLocales) && statSync(layerLocales).isDirectory()) {
        sources.push(layerLocales)
      }
    }
  }

  // 4. App-level i18n/locales
  const appLocales = resolve(cwd, 'i18n', 'locales')
  if (existsSync(appLocales) && statSync(appLocales).isDirectory()) {
    sources.push(appLocales)
  }

  return sources
}

/**
 * Get available locale codes from a directory
 */
function getAvailableLocales(dir: string): string[] {
  try {
    const files = readdirSync(dir)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => basename(f, '.json'))
  } catch {
    return []
  }
}

/**
 * Collect all translations from discovered sources
 */
function collectTranslations(sources: string[]): TranslationEntry[] {
  // Track translations by keyPath for merging
  const translationsMap = new Map<string, TranslationEntry>()

  for (const source of sources) {
    const locales = getAvailableLocales(source)
    console.log(`\nReading from: ${source}`)
    console.log(`  Locales: ${locales.join(', ')}`)

    // Read each locale file and merge
    for (const locale of locales) {
      const filePath = join(source, `${locale}.json`)
      const flattened = readLocaleFile(filePath)

      if (!flattened) continue

      for (const [keyPath, value] of Object.entries(flattened)) {
        const category = keyPath.split('.')[0]

        if (translationsMap.has(keyPath)) {
          // Merge with existing entry
          const existing = translationsMap.get(keyPath)!
          existing.values[locale] = value
          existing.source = source // Track last source
        } else {
          // Create new entry
          translationsMap.set(keyPath, {
            keyPath,
            category,
            values: { [locale]: value },
            source
          })
        }
      }
    }
  }

  return Array.from(translationsMap.values())
}

/**
 * Generate SQL statements for translations
 */
function generateSql(translations: TranslationEntry[], options: CliOptions): string {
  const statements: string[] = []
  const timestamp = Math.floor(Date.now() / 1000)
  const teamIdSql = options.teamId ? `'${options.teamId}'` : 'NULL'

  statements.push('-- Generated by nuxt-crouton-i18n seed CLI')
  statements.push(`-- Generated at: ${new Date().toISOString()}`)
  statements.push(`-- Total translations: ${translations.length}`)
  statements.push('')

  for (const t of translations) {
    const id = generateId()
    const valuesJson = JSON.stringify(t.values).replace(/'/g, '\'\'')

    if (options.force) {
      // Use INSERT OR REPLACE for force mode
      statements.push(
        `INSERT OR REPLACE INTO translations_ui (id, user_id, team_id, namespace, key_path, category, "values", description, is_overrideable, created_at, updated_at) `
        + `VALUES ('${id}', 'system', ${teamIdSql}, 'ui', '${t.keyPath}', '${t.category}', '${valuesJson}', NULL, 1, ${timestamp}, ${timestamp});`
      )
    } else {
      // Use INSERT OR IGNORE to skip existing
      statements.push(
        `INSERT OR IGNORE INTO translations_ui (id, user_id, team_id, namespace, key_path, category, "values", description, is_overrideable, created_at, updated_at) `
        + `VALUES ('${id}', 'system', ${teamIdSql}, 'ui', '${t.keyPath}', '${t.category}', '${valuesJson}', NULL, 1, ${timestamp}, ${timestamp});`
      )
    }
  }

  return statements.join('\n')
}

/**
 * Seed translations via API
 */
async function seedViaApi(
  translations: TranslationEntry[],
  options: CliOptions
): Promise<{ success: number, skipped: number, failed: number }> {
  const results = { success: 0, skipped: 0, failed: 0 }

  // Build the API endpoint
  const teamPath = options.teamId || '_system'
  const baseUrl = `${options.apiUrl}/api/teams/${teamPath}/translations-ui`

  for (const t of translations) {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyPath: t.keyPath,
          category: t.category,
          values: t.values,
          namespace: 'ui',
          isOverrideable: true,
          skipIfExists: !options.force
        })
      })

      if (response.ok) {
        results.success++
      } else if (response.status === 409) {
        // Conflict - translation already exists
        results.skipped++
      } else {
        results.failed++
        console.warn(`Failed to seed ${t.keyPath}: ${response.status}`)
      }
    } catch (error) {
      results.failed++
      console.error(`Error seeding ${t.keyPath}:`, error)
    }
  }

  return results
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  console.log('🌱 nuxt-crouton-i18n Seed CLI')
  console.log('━'.repeat(40))

  // Discover sources
  const sources = discoverLocaleSources(options)

  if (sources.length === 0) {
    console.log('No locale sources found.')
    process.exit(0)
  }

  console.log(`\nDiscovered ${sources.length} locale source(s):`)
  sources.forEach(s => console.log(`  - ${s}`))

  // Collect translations
  const translations = collectTranslations(sources)

  console.log(`\n📊 Summary:`)
  console.log(`   Total translations: ${translations.length}`)

  // Group by category for display
  const byCategory = translations.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('   By category:')
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`     - ${cat}: ${count}`)
    })

  if (options.dryRun) {
    console.log('\n🔍 Dry run mode - no changes will be made')
    console.log('\nSample translations:')
    translations.slice(0, 10).forEach((t) => {
      console.log(`  ${t.keyPath}: ${JSON.stringify(t.values)}`)
    })
    if (translations.length > 10) {
      console.log(`  ... and ${translations.length - 10} more`)
    }
    process.exit(0)
  }

  if (options.sql) {
    console.log('\n📝 Generating SQL...\n')
    const sql = generateSql(translations, options)
    console.log(sql)
    process.exit(0)
  }

  // Seed via API
  console.log(`\n🚀 Seeding to ${options.apiUrl}...`)
  console.log(`   Team: ${options.teamId || 'system (null)'}`)
  console.log(`   Mode: ${options.force ? 'force (overwrite)' : 'skip existing'}`)

  const results = await seedViaApi(translations, options)

  console.log('\n✅ Seeding complete:')
  console.log(`   Success: ${results.success}`)
  console.log(`   Skipped: ${results.skipped}`)
  console.log(`   Failed:  ${results.failed}`)

  if (results.failed > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
