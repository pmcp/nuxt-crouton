#!/usr/bin/env node
/**
 * Seed translations from JSON locale files into the translations_ui database table
 *
 * Usage:
 *   crouton-generate seed-translations [options]
 *
 * Options:
 *   --layer <name>     Seed from specific layer (default: all layers)
 *   --team <id>        Team ID to seed to (default: system/null)
 *   --dry-run          Preview what will be seeded
 *   --force            Overwrite existing translations
 *   --api-url <url>    API base URL (default: http://localhost:3000)
 */

import fsp from 'fs/promises'
import path from 'path'
import chalk from 'chalk'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)

  const getArg = (name) => {
    const flag = args.find(a => a.startsWith(`--${name}=`))
    if (flag) return flag.split('=')[1]
    const idx = args.indexOf(`--${name}`)
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
      return args[idx + 1]
    }
    return null
  }

  return {
    layer: getArg('layer'),
    team: getArg('team') || 'system',
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    apiUrl: getArg('api-url') || 'http://localhost:3000',
    help: args.includes('--help') || args.includes('-h')
  }
}

// Find all locale files in layers
async function findLocaleFiles(specificLayer = null) {
  const layersDir = path.resolve('layers')
  const localeFiles = []

  try {
    const layers = await fsp.readdir(layersDir)

    for (const layer of layers) {
      // Skip if specific layer requested and this isn't it
      if (specificLayer && layer !== specificLayer) continue

      const localesPath = path.join(layersDir, layer, 'i18n', 'locales')

      try {
        const files = await fsp.readdir(localesPath)
        for (const file of files) {
          if (file.endsWith('.json')) {
            localeFiles.push({
              layer,
              locale: file.replace('.json', ''),
              path: path.join(localesPath, file)
            })
          }
        }
      } catch {
        // No locales directory in this layer, skip
      }
    }
  } catch {
    console.error(chalk.red('Error: layers/ directory not found'))
    process.exit(1)
  }

  return localeFiles
}

// Flatten nested JSON object into dot-notation keys
function flattenTranslations(obj, prefix = '') {
  const result = []

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
function groupTranslationsByKey(localeFiles, translations) {
  const grouped = new Map()

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
async function seedTranslations(translations, options) {
  const { team, dryRun, force, apiUrl } = options

  console.log(chalk.cyan(`\nSeeding ${translations.length} translations...`))

  if (dryRun) {
    console.log(chalk.yellow('\n[DRY RUN] Would seed the following translations:\n'))

    for (const t of translations.slice(0, 20)) {
      console.log(chalk.gray(`  ${t.keyPath}`))
      for (const [locale, value] of Object.entries(t.values)) {
        const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value
        console.log(chalk.gray(`    ${locale}: ${displayValue}`))
      }
    }

    if (translations.length > 20) {
      console.log(chalk.gray(`  ... and ${translations.length - 20} more`))
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
        process.stdout.write(chalk.green('.'))
      } else if (response.status === 409 || response.status === 400) {
        // Already exists
        if (force) {
          // Try to update instead
          // TODO: Implement PATCH for updates
          skipped++
          process.stdout.write(chalk.yellow('s'))
        } else {
          skipped++
          process.stdout.write(chalk.yellow('s'))
        }
      } else {
        errors++
        process.stdout.write(chalk.red('x'))
      }
    } catch (error) {
      errors++
      process.stdout.write(chalk.red('x'))
    }
  }

  console.log('\n')

  return { success, skipped, errors }
}

// Generate SQL INSERT statements for manual seeding
function generateSqlStatements(translations, teamId = null) {
  const statements = []

  for (const t of translations) {
    const valuesJson = JSON.stringify(t.values).replace(/'/g, "''")
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
export async function seedTranslationsFromJson(options = {}) {
  const config = { ...parseArgs(), ...options }

  if (config.help) {
    console.log(`
${chalk.bold('crouton-generate seed-translations')}

Seed translations from JSON locale files into the translations_ui database.

${chalk.bold('Usage:')}
  crouton-generate seed-translations [options]

${chalk.bold('Options:')}
  --layer <name>     Seed from specific layer only (default: all layers)
  --team <id>        Team ID/slug to seed to (default: system)
  --dry-run          Preview translations without seeding
  --force            Overwrite existing translations
  --api-url <url>    API base URL (default: http://localhost:3000)
  --sql              Output SQL statements instead of using API
  -h, --help         Show this help message

${chalk.bold('Examples:')}
  # Preview all translations
  crouton-generate seed-translations --dry-run

  # Seed from bookings layer only
  crouton-generate seed-translations --layer bookings

  # Output SQL for manual insertion
  crouton-generate seed-translations --sql > seed.sql

${chalk.bold('Note:')}
  The dev server must be running for API seeding to work.
  Use --sql flag to generate SQL statements for direct database insertion.
`)
    return
  }

  console.log(chalk.bold('\n📦 Crouton Translation Seeder\n'))
  console.log(chalk.gray(`  Layer: ${config.layer || 'all'}`))
  console.log(chalk.gray(`  Team: ${config.team}`))
  console.log(chalk.gray(`  Mode: ${config.dryRun ? 'dry-run' : 'seed'}`))

  // Find locale files
  console.log(chalk.cyan('\nScanning for locale files...'))
  const localeFiles = await findLocaleFiles(config.layer)

  if (localeFiles.length === 0) {
    console.log(chalk.yellow('\nNo locale files found in layers/*/i18n/locales/'))
    console.log(chalk.gray('Run the generator with translations enabled to create locale files.'))
    return
  }

  console.log(chalk.green(`✓ Found ${localeFiles.length} locale file(s)`))

  // Parse locale files
  console.log(chalk.cyan('\nParsing translations...'))
  const translations = []

  for (const file of localeFiles) {
    try {
      const content = await fsp.readFile(file.path, 'utf-8')
      const json = JSON.parse(content)
      const items = flattenTranslations(json)

      translations.push({
        layer: file.layer,
        locale: file.locale,
        items
      })

      console.log(chalk.gray(`  ${file.layer}/${file.locale}.json: ${items.length} keys`))
    } catch (error) {
      console.error(chalk.red(`  Error parsing ${file.path}: ${error.message}`))
    }
  }

  // Group by key
  const grouped = groupTranslationsByKey(localeFiles, translations)
  console.log(chalk.green(`✓ ${grouped.length} unique translation keys\n`))

  // Check if --sql flag is set
  if (process.argv.includes('--sql')) {
    const sql = generateSqlStatements(grouped, config.team === 'system' ? null : config.team)
    console.log(chalk.cyan('-- SQL Statements for translations_ui table'))
    console.log(chalk.cyan('-- Run these in your SQLite database\n'))
    console.log(sql.join('\n\n'))
    return
  }

  // Seed to database
  const result = await seedTranslations(grouped, config)

  // Summary
  console.log(chalk.bold('Summary:'))
  console.log(chalk.green(`  ✓ Success: ${result.success}`))
  if (result.skipped > 0) {
    console.log(chalk.yellow(`  ⊘ Skipped: ${result.skipped} (already exist)`))
  }
  if (result.errors > 0) {
    console.log(chalk.red(`  ✗ Errors: ${result.errors}`))
  }

  if (result.errors > 0) {
    console.log(chalk.yellow('\nTip: Make sure your dev server is running at ' + config.apiUrl))
    console.log(chalk.gray('Or use --sql flag to generate SQL statements for direct insertion.'))
  }
}

// Run if called directly
if (process.argv[1].includes('seed-translations')) {
  seedTranslationsFromJson()
}
