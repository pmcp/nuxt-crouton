#!/usr/bin/env tsx
/**
 * Sync Stub Script
 *
 * Compares stub fallback keys with locale files to detect drift.
 * Run with --fix to auto-generate missing stub entries.
 *
 * Usage:
 *   pnpm sync-stub        # Check for drift
 *   pnpm sync-stub --fix  # Auto-update stub (outputs to stdout)
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Paths
const STUB_PATH = resolve(__dirname, '../app/composables/useT.ts')
const I18N_LOCALE_PATH = resolve(__dirname, '../../nuxt-crouton-i18n/locales/en.json')

interface DriftReport {
  inStubOnly: string[]
  inLocaleOnly: string[]
  inBoth: string[]
}

/**
 * Extract fallback keys from stub file
 */
function extractStubKeys(content: string): Set<string> {
  const keys = new Set<string>()
  // Match lines like: 'some.key': 'Value',
  const regex = /'([a-zA-Z0-9_.]+)':\s*['"`]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1])
  }
  return keys
}

/**
 * Flatten nested JSON object to dot-notation keys
 */
function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

/**
 * Compare stub keys with locale keys
 */
function compareKeys(stubKeys: Set<string>, localeKeys: Set<string>): DriftReport {
  const inStubOnly: string[] = []
  const inLocaleOnly: string[] = []
  const inBoth: string[] = []

  for (const key of stubKeys) {
    if (localeKeys.has(key)) {
      inBoth.push(key)
    } else {
      inStubOnly.push(key)
    }
  }

  for (const key of localeKeys) {
    if (!stubKeys.has(key)) {
      inLocaleOnly.push(key)
    }
  }

  return {
    inStubOnly: inStubOnly.sort(),
    inLocaleOnly: inLocaleOnly.sort(),
    inBoth: inBoth.sort()
  }
}

/**
 * Generate stub entries for missing keys
 */
function generateStubEntries(keys: string[], localeData: Record<string, any>): string {
  const getValue = (key: string): string => {
    const parts = key.split('.')
    let value: any = localeData
    for (const part of parts) {
      value = value?.[part]
    }
    return typeof value === 'string' ? value : key
  }

  return keys.map(key => {
    const value = getValue(key)
    // Escape single quotes in value
    const escapedValue = value.replace(/'/g, "\\'")
    return `    '${key}': '${escapedValue}',`
  }).join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const fix = args.includes('--fix')
  const verbose = args.includes('--verbose')

  console.log('🔍 Checking stub synchronization...\n')

  // Check files exist
  if (!existsSync(STUB_PATH)) {
    console.error(`❌ Stub file not found: ${STUB_PATH}`)
    process.exit(1)
  }

  if (!existsSync(I18N_LOCALE_PATH)) {
    console.warn(`⚠️  i18n locale file not found: ${I18N_LOCALE_PATH}`)
    console.warn('   This is expected if nuxt-crouton-i18n is not installed.\n')
  }

  // Read stub
  const stubContent = readFileSync(STUB_PATH, 'utf-8')
  const stubKeys = extractStubKeys(stubContent)

  console.log(`📄 Stub keys: ${stubKeys.size}`)

  // Read locale file if exists
  let localeKeys = new Set<string>()
  let localeData: Record<string, any> = {}

  if (existsSync(I18N_LOCALE_PATH)) {
    const localeContent = readFileSync(I18N_LOCALE_PATH, 'utf-8')
    localeData = JSON.parse(localeContent)
    localeKeys = new Set(flattenKeys(localeData))
    console.log(`📄 Locale keys: ${localeKeys.size}`)
  }

  // Compare
  const report = compareKeys(stubKeys, localeKeys)

  console.log(`\n📊 Comparison Results:`)
  console.log(`   ✅ In both: ${report.inBoth.length}`)
  console.log(`   📦 Stub only (extras): ${report.inStubOnly.length}`)
  console.log(`   📝 Locale only (missing from stub): ${report.inLocaleOnly.length}`)

  // Report details
  if (report.inStubOnly.length > 0 && verbose) {
    console.log(`\n📦 Keys in stub but not in locale (these are extras, possibly for other packages):`)
    report.inStubOnly.forEach(key => console.log(`   - ${key}`))
  }

  if (report.inLocaleOnly.length > 0) {
    console.log(`\n📝 Keys in locale but not in stub (add to stub for progressive enhancement):`)
    report.inLocaleOnly.forEach(key => console.log(`   - ${key}`))

    if (fix) {
      console.log(`\n🔧 Generated stub entries (add these to useT.ts):\n`)
      console.log(generateStubEntries(report.inLocaleOnly, localeData))
    }
  }

  // Exit code
  if (report.inLocaleOnly.length > 0) {
    console.log(`\n⚠️  Stub is missing ${report.inLocaleOnly.length} keys from locale file.`)
    if (!fix) {
      console.log('   Run with --fix to generate entries.\n')
    }
    process.exit(1)
  }

  console.log(`\n✅ Stub is in sync!\n`)
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
