#!/usr/bin/env node
// rollback-collection.ts — Safely rollback generated collections

import fsp from 'node:fs/promises'
import path from 'node:path'
import consola from 'consola'

// Import utilities
import { toCase } from './utils/helpers.ts'
import { removeFromNuxtConfigExtends } from './utils/update-nuxt-config.ts'
import { removeSchemaExport } from './utils/update-schema-index.ts'
import { removeFromAppConfig } from './utils/update-app-config.ts'

export async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fsp.access(filepath)
    return true
  } catch {
    return false
  }
}

export async function removeDirectory(dirPath: string, dryRun: boolean): Promise<boolean> {
  if (await fileExists(dirPath)) {
    if (dryRun) {
      consola.warn(`  [DRY RUN] Would remove: ${dirPath}`)
      return true
    }
    await fsp.rm(dirPath, { recursive: true, force: true })
    consola.success(`  Removed: ${dirPath}`)
    return true
  }
  return false
}

export async function removeFile(filePath: string, dryRun: boolean): Promise<boolean> {
  if (await fileExists(filePath)) {
    if (dryRun) {
      consola.warn(`  [DRY RUN] Would remove: ${filePath}`)
      return true
    }
    await fsp.unlink(filePath)
    consola.success(`  Removed: ${filePath}`)
    return true
  }
  return false
}

export async function cleanSchemaIndex(collectionName: string, layer: string, dryRun: boolean): Promise<boolean> {
  const schemaIndexPath = path.resolve('server', 'database', 'schema', 'index.ts')

  if (!await fileExists(schemaIndexPath)) {
    console.log('  ! Schema index not found, skipping')
    return false
  }

  try {
    const cases = toCase(collectionName)
    const layerCamelCase = layer
      .split(/[-_]/)
      .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    const exportName = `${layerCamelCase}${cases.pascalCasePlural}`
    const pattern = `${layer}/collections/${cases.plural}`

    const content = await fsp.readFile(schemaIndexPath, 'utf-8')
    if (!content.includes(pattern)) {
      console.log(`  ! Export "${exportName}" not found in schema index`)
      return false
    }

    if (dryRun) {
      consola.warn(`  [DRY RUN] Would remove export "${exportName}" from schema index`)
      return true
    }

    const result = await removeSchemaExport(schemaIndexPath, pattern)
    if (result.removed) {
      consola.success(`  Removed export "${exportName}" from schema index`)
      return true
    }

    console.log(`  ! Export "${exportName}" not found: ${result.reason}`)
    return false
  } catch (error) {
    consola.error(`  ✗ Error cleaning schema index: ${error.message}`)
    return false
  }
}

export async function cleanAppConfig(collectionName: string, layer: string, dryRun: boolean): Promise<boolean> {
  const cases = toCase(collectionName)

  // Check both possible locations for app.config.ts
  const appDirExists = await fileExists(path.resolve('app'))
  const registryPath = appDirExists
    ? path.resolve('app/app.config.ts')
    : path.resolve('app.config.ts')

  if (!await fileExists(registryPath)) {
    console.log('  ! app.config.ts not found, skipping')
    return false
  }

  try {
    const layerCamelCase = layer
      .split(/[-_]/)
      .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('')

    const collectionKey = `${layerCamelCase}${cases.pascalCasePlural}`
    const configExportName = `${layerCamelCase}${cases.pascalCasePlural}Config`

    const content = await fsp.readFile(registryPath, 'utf-8')
    if (!content.includes(collectionKey)) {
      console.log(`  ! Collection "${collectionKey}" not found in app.config.ts`)
      return false
    }

    if (dryRun) {
      consola.warn(`  [DRY RUN] Would remove "${collectionKey}" from app.config.ts`)
      consola.warn(`  [DRY RUN] Would remove import for "${configExportName}"`)
      return true
    }

    const result = await removeFromAppConfig(registryPath, collectionKey, configExportName)
    if (result.removed) {
      consola.success(`  Removed "${collectionKey}" from app.config.ts`)
      return true
    }

    console.log(`  ! Could not remove "${collectionKey}": ${result.reason}`)
    return false
  } catch (error) {
    consola.error(`  ✗ Error cleaning app.config.ts: ${error.message}`)
    return false
  }
}

export async function cleanLayerRootConfig(layer: string, collectionName: string, dryRun: boolean): Promise<boolean> {
  const cases = toCase(collectionName)
  const configPath = path.resolve('layers', layer, 'nuxt.config.ts')

  if (!await fileExists(configPath)) {
    console.log(`  ! Layer config not found at ${configPath}`)
    return false
  }

  try {
    const content = await fsp.readFile(configPath, 'utf-8')
    const collectionPath = `./collections/${cases.plural}`

    if (!content.includes(collectionPath)) {
      console.log(`  ! Collection not found in layer config`)
      return false
    }

    if (dryRun) {
      consola.warn(`  [DRY RUN] Would remove "'${collectionPath}'" from layer config`)
      return true
    }

    const result = await removeFromNuxtConfigExtends(configPath, collectionPath)
    if (result.removed) {
      consola.success(`  Removed collection from layer config`)
      return true
    }

    console.log(`  ! Could not remove from layer config: ${result.reason}`)
    return false
  } catch (error) {
    consola.error(`  ✗ Error cleaning layer config: ${error.message}`)
    return false
  }
}

export async function cleanRootNuxtConfig(layer: string, dryRun: boolean, forceRemove: boolean = false): Promise<boolean> {
  const rootConfigPath = path.resolve('nuxt.config.ts')

  if (!await fileExists(rootConfigPath)) {
    console.log('  ! Root nuxt.config.ts not found')
    return false
  }

  try {
    const content = await fsp.readFile(rootConfigPath, 'utf-8')
    const layerPath = `./layers/${layer}`

    if (!content.includes(layerPath)) {
      console.log(`  ! Layer "${layer}" not in root config`)
      return false
    }

    // Check if other collections in this layer exist (unless forced)
    if (!forceRemove) {
      const layerDir = path.resolve('layers', layer, 'collections')
      const collectionsExist = await fileExists(layerDir)
      let hasOtherCollections = false

      if (collectionsExist) {
        const collections = await fsp.readdir(layerDir)
        hasOtherCollections = collections.length > 0
      }

      if (hasOtherCollections) {
        consola.warn(`  ! Layer "${layer}" has other collections, keeping in root config`)
        return false
      }
    }

    if (dryRun) {
      consola.warn(`  [DRY RUN] Would remove layer "${layer}" from root config`)
      return true
    }

    const result = await removeFromNuxtConfigExtends(rootConfigPath, layerPath)
    if (result.removed) {
      consola.success(`  Removed layer "${layer}" from root config`)
      return true
    }

    console.log(`  ! Could not remove layer: ${result.reason}`)
    return false
  } catch (error) {
    consola.error(`  ✗ Error cleaning root config: ${error.message}`)
    return false
  }
}

export async function checkForCollectionFiles(layer: string, collection: string): Promise<{ exists: boolean; files: string[] }> {
  const cases = toCase(collection)
  const base = path.resolve('layers', layer, 'collections', cases.plural)

  const exists = await fileExists(base)
  if (!exists) {
    return { exists: false, files: [] }
  }

  const files: string[] = []

  // Check for key files
  const keyPaths = [
    path.join(base, 'app', 'components', '_Form.vue'),
    path.join(base, 'app', 'components', 'List.vue'),
    path.join(base, 'server', 'database', 'schema.ts'),
    path.join(base, 'server', 'database', 'queries.ts')
  ]

  for (const filePath of keyPaths) {
    if (await fileExists(filePath)) {
      files.push(filePath)
    }
  }

  return { exists: true, files }
}

export async function rollbackCollection({ layer, collection, dryRun = false, keepFiles = false, silent = false }: { layer: string; collection: string; dryRun?: boolean; keepFiles?: boolean; silent?: boolean }): Promise<boolean> {
  const cases = toCase(collection)
  let changesMade = false

  if (!silent) {
    console.log('\n' + '─'.repeat(60))
    console.log(`  Rolling back ${layer}/${collection}`)
    console.log('─'.repeat(60) + '\n')
  }

  // Step 1: Remove files (unless --keep-files)
  if (!keepFiles) {
    if (!silent) console.log('1. Removing collection files...')
    const base = path.resolve('layers', layer, 'collections', cases.plural)
    if (await removeDirectory(base, dryRun)) {
      changesMade = true
    }
  } else {
    if (!silent) console.log('1. Keeping collection files (--keep-files)')
  }

  // Step 2: Clean schema index
  if (!silent) console.log('\n2. Cleaning schema index...')
  if (await cleanSchemaIndex(collection, layer, dryRun)) {
    changesMade = true
  }

  // Step 3: Clean app.config.ts
  if (!silent) console.log('\n3. Cleaning app.config.ts...')
  if (await cleanAppConfig(collection, layer, dryRun)) {
    changesMade = true
  }

  // Step 4: Clean layer root config
  if (!silent) console.log('\n4. Cleaning layer root config...')
  if (await cleanLayerRootConfig(layer, collection, dryRun)) {
    changesMade = true
  }

  // Step 5: Check root config (only if no other collections remain)
  if (!silent) console.log('\n5. Checking root nuxt.config.ts...')
  const layerDir = path.resolve('layers', layer, 'collections')
  const collectionsExist = await fileExists(layerDir)

  if (!collectionsExist || !keepFiles) {
    if (await cleanRootNuxtConfig(layer, dryRun)) {
      changesMade = true
    }
  } else {
    if (!silent) console.log('  ! Other collections exist, keeping layer in root config')
  }

  return changesMade
}

function parseArgs(): { layer: string; collection: string; dryRun: boolean; keepFiles: boolean; force: boolean } {
  const a = process.argv.slice(2)
  const pos = a.filter(x => !x.startsWith('--'))

  let layer: string | null, collection: string | undefined
  if (pos.length >= 2) {
    layer = pos[0]
    collection = pos[1]
  } else {
    collection = pos[0]
    const layerFlag = a.find(x => x.startsWith('--layer='))
    layer = layerFlag ? layerFlag.split('=')[1] : null
  }

  const dryRun = a.includes('--dry-run')
  const keepFiles = a.includes('--keep-files')
  const force = a.includes('--force')

  if (!layer || !collection) {
    console.log('Usage: crouton-rollback <layer> <collection> [options]')
    console.log('\nOptions:')
    console.log('  --dry-run      Preview what will be removed')
    console.log('  --keep-files   Keep generated files, only clean configs')
    console.log('  --force        Skip confirmation prompts')
    process.exit(1)
  }

  return { layer, collection, dryRun, keepFiles, force }
}

async function main(): Promise<void> {
  const args = parseArgs()
  const cases = toCase(args.collection)

  console.log('\n' + '═'.repeat(60))
  console.log('  COLLECTION ROLLBACK')
  console.log('═'.repeat(60) + '\n')

  consola.info(`Layer:      ${args.layer}`)
  consola.info(`Collection: ${args.collection}`)
  consola.info(`Dry Run:    ${args.dryRun ? 'Yes' : 'No'}`)
  consola.info(`Keep Files: ${args.keepFiles ? 'Yes' : 'No'}`)

  // Check if collection exists
  const { exists, files } = await checkForCollectionFiles(args.layer, args.collection)

  if (!exists) {
    consola.error(`\n✗ Collection not found at layers/${args.layer}/collections/${cases.plural}`)
    process.exit(1)
  }

  consola.success(`\nFound collection with ${files.length} key files`)

  // Show what will be removed
  console.log('\n' + '─'.repeat(60))
  console.log('  CHANGES TO BE MADE')
  console.log('─'.repeat(60) + '\n')

  if (!args.keepFiles) {
    consola.warn(`• Remove collection directory`)
    console.log(`  layers/${args.layer}/collections/${cases.plural}/`)
  }

  consola.warn(`• Clean schema index exports`)
  console.log(`  server/database/schema/index.ts`)

  consola.warn(`• Remove from app.config.ts`)
  console.log(`  app.config.ts or app/app.config.ts`)

  consola.warn(`• Clean layer root config`)
  console.log(`  layers/${args.layer}/nuxt.config.ts`)

  consola.warn(`• Check root nuxt.config.ts`)
  console.log(`  nuxt.config.ts (if no other collections remain)`)

  // Confirmation prompt (unless force or dry-run)
  if (!args.force && !args.dryRun) {
    consola.error('⚠️  WARNING: This action cannot be undone!')
    consola.warn('Run with --dry-run to preview changes first')
    console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...')

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n' + '─'.repeat(60))
  console.log('  EXECUTING ROLLBACK')
  console.log('─'.repeat(60) + '\n')

  const changesMade = await rollbackCollection(args)

  // Summary
  console.log('\n' + '═'.repeat(60))
  if (args.dryRun) {
    console.log('  DRY RUN COMPLETE')
    console.log('═'.repeat(60) + '\n')
    consola.warn('No changes were made. Run without --dry-run to execute.')
  } else {
    console.log('  ROLLBACK COMPLETE')
    console.log('═'.repeat(60) + '\n')

    if (changesMade) {
      consola.success('Collection successfully rolled back')
      consola.warn('\n⚠️  Next steps:')
      console.log('  1. Run: pnpm db:generate (to remove database migration)')
      console.log('  2. Restart your Nuxt dev server')
    } else {
      consola.warn('! No changes were made (collection may not exist)')
    }
  }

  console.log()
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    consola.error('\n✗ Fatal error:', error.message)
    process.exit(1)
  })
}
