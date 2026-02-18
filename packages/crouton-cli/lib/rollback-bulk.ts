#!/usr/bin/env node
// rollback-bulk.mjs — Bulk rollback operations for layers and config files

import fsp from 'node:fs/promises'
import path from 'node:path'
import consola from 'consola'

// Import utilities
import { toCase } from './utils/helpers.ts'
import { rollbackCollection, fileExists, cleanRootNuxtConfig } from './rollback-collection.mjs'

async function getAllCollectionsInLayer(layer) {
  const layerCollectionsPath = path.resolve('layers', layer, 'collections')

  if (!await fileExists(layerCollectionsPath)) {
    return []
  }

  try {
    const entries = await fsp.readdir(layerCollectionsPath, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch (error) {
    consola.error(`Error reading layer collections: ${error.message}`)
    return []
  }
}

async function getAllLayers() {
  const layersPath = path.resolve('layers')

  if (!await fileExists(layersPath)) {
    return []
  }

  try {
    const entries = await fsp.readdir(layersPath, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch (error) {
    consola.error(`Error reading layers: ${error.message}`)
    return []
  }
}

export async function rollbackLayer({ layer, dryRun = false, keepFiles = false, force = false }) {
  console.log('\n' + '═'.repeat(60))
  console.log(`  LAYER ROLLBACK: ${layer}`)
  console.log('═'.repeat(60) + '\n')

  // Get all collections in this layer
  const collections = await getAllCollectionsInLayer(layer)

  if (collections.length === 0) {
    consola.error(`No collections found in layer "${layer}"`)
    return false
  }

  consola.info(`Found ${collections.length} collections in layer "${layer}":`)
  collections.forEach(col => console.log(`  • ${col}`))

  // Show what will be removed
  console.log('\n' + '─'.repeat(60))
  console.log('  IMPACT ASSESSMENT')
  console.log('─'.repeat(60) + '\n')

  consola.warn(`This will remove:`)
  console.log(`  • ${collections.length} collections`)
  if (!keepFiles) {
    console.log(`  • All collection files in layers/${layer}/collections/`)
  }
  console.log(`  • Schema index exports for all collections`)
  console.log(`  • app.config.ts entries for all collections`)
  console.log(`  • Layer "${layer}" from root nuxt.config.ts`)

  // Confirmation prompt (unless force or dry-run)
  if (!force && !dryRun) {
    consola.error('⚠️  WARNING: This will remove ALL collections in this layer!')
    consola.warn('Run with --dry-run to preview changes first')
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...')

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('\n' + '─'.repeat(60))
  console.log('  EXECUTING BULK ROLLBACK')
  console.log('─'.repeat(60) + '\n')

  let totalChangesMade = false

  // Rollback each collection
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i]
    console.log(`\n[${i + 1}/${collections.length}] ${collection}`)

    const changesMade = await rollbackCollection({
      layer,
      collection,
      dryRun,
      keepFiles,
      silent: true
    })

    if (changesMade) {
      totalChangesMade = true
      consola.success(`Rolled back ${collection}`)
    } else {
      console.log(`  ! No changes for ${collection}`)
    }
  }

  // Remove layer from root config
  console.log('\n' + '─'.repeat(60))
  console.log('  CLEANING ROOT CONFIG')
  console.log('─'.repeat(60) + '\n')

  if (await cleanRootNuxtConfig(layer, dryRun, true)) {
    totalChangesMade = true
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  if (dryRun) {
    console.log('  DRY RUN COMPLETE')
    console.log('═'.repeat(60) + '\n')
    consola.warn('No changes were made. Run without --dry-run to execute.')
  } else {
    console.log('  BULK ROLLBACK COMPLETE')
    console.log('═'.repeat(60) + '\n')

    if (totalChangesMade) {
      consola.success(`Successfully rolled back ${collections.length} collections from layer "${layer}"`)
      consola.warn('\n⚠️  Next steps:')
      console.log('  1. Run: pnpm db:generate (to update database schema)')
      console.log('  2. Restart your Nuxt dev server')
    } else {
      consola.warn('No changes were made')
    }
  }

  console.log()
  return totalChangesMade
}

export async function rollbackFromConfig({ configPath, dryRun = false, keepFiles = false, force = false }) {
  console.log('\n' + '═'.repeat(60))
  console.log('  CONFIG-BASED ROLLBACK')
  console.log('═'.repeat(60) + '\n')

  consola.info(`Config file: ${configPath}`)

  // Load config file
  const resolvedPath = path.resolve(configPath)

  if (!await fileExists(resolvedPath)) {
    consola.error(`\nConfig file not found: ${configPath}`)
    process.exit(1)
  }

  let config
  try {
    config = (await import(resolvedPath)).default
  } catch (error) {
    consola.error(`\nError loading config: ${error.message}`)
    process.exit(1)
  }

  if (!config || !config.targets) {
    consola.error(`\nInvalid config: missing targets`)
    process.exit(1)
  }

  // Count total collections
  let totalCollections = 0
  const layerCollectionMap = {}

  for (const target of config.targets) {
    if (!target.layer || !target.collections) continue

    layerCollectionMap[target.layer] = target.collections
    totalCollections += target.collections.length
  }

  consola.success(`Found ${config.targets.length} layers, ${totalCollections} collections`)

  // Show what will be removed
  console.log('\n' + '─'.repeat(60))
  console.log('  COLLECTIONS TO ROLLBACK')
  console.log('─'.repeat(60) + '\n')

  for (const [layer, collections] of Object.entries(layerCollectionMap)) {
    consola.info(`${layer}:`)
    collections.forEach(col => console.log(`  • ${col}`))
  }

  console.log('\n' + '─'.repeat(60))
  console.log('  IMPACT ASSESSMENT')
  console.log('─'.repeat(60) + '\n')

  consola.warn(`This will remove:`)
  console.log(`  • ${totalCollections} collections across ${config.targets.length} layers`)
  if (!keepFiles) {
    console.log(`  • All collection files`)
  }
  console.log(`  • All schema index exports`)
  console.log(`  • All app.config.ts entries`)
  console.log(`  • All affected layers from root nuxt.config.ts`)

  // Confirmation prompt (unless force or dry-run)
  if (!force && !dryRun) {
    consola.error('⚠️  WARNING: This will remove ALL collections defined in this config!')
    consola.warn('Run with --dry-run to preview changes first')
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...')

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('\n' + '─'.repeat(60))
  console.log('  EXECUTING CONFIG-BASED ROLLBACK')
  console.log('─'.repeat(60) + '\n')

  let totalChangesMade = false
  let processedCount = 0

  // Process each target
  for (const target of config.targets) {
    if (!target.layer || !target.collections) continue

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  LAYER: ${target.layer}`)
    console.log('═'.repeat(60))

    for (const collection of target.collections) {
      processedCount++
      console.log(`\n[${processedCount}/${totalCollections}] ${target.layer}/${collection}`)

      const changesMade = await rollbackCollection({
        layer: target.layer,
        collection,
        dryRun,
        keepFiles,
        silent: true
      })

      if (changesMade) {
        totalChangesMade = true
        consola.success(`Rolled back ${collection}`)
      } else {
        console.log(`  ! No changes for ${collection}`)
      }
    }

    // Clean up layer from root config
    console.log('\n  Checking root config...')
    await cleanRootNuxtConfig(target.layer, dryRun, true)
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  if (dryRun) {
    console.log('  DRY RUN COMPLETE')
    console.log('═'.repeat(60) + '\n')
    consola.warn('No changes were made. Run without --dry-run to execute.')
  } else {
    console.log('  CONFIG-BASED ROLLBACK COMPLETE')
    console.log('═'.repeat(60) + '\n')

    if (totalChangesMade) {
      consola.success(`Successfully rolled back ${totalCollections} collections`)
      consola.warn('\n⚠️  Next steps:')
      console.log('  1. Run: pnpm db:generate (to update database schema)')
      console.log('  2. Restart your Nuxt dev server')
    } else {
      consola.warn('No changes were made')
    }
  }

  console.log()
  return totalChangesMade
}

export async function rollbackMultiple({ layer, collections, dryRun = false, keepFiles = false, force = false }) {
  console.log('\n' + '═'.repeat(60))
  console.log('  MULTIPLE COLLECTION ROLLBACK')
  console.log('═'.repeat(60) + '\n')

  consola.info(`Layer: ${layer}`)
  consola.info(`Collections: ${collections.join(', ')}`)

  // Show what will be removed
  console.log('\n' + '─'.repeat(60))
  console.log('  IMPACT ASSESSMENT')
  console.log('─'.repeat(60) + '\n')

  consola.warn(`This will remove ${collections.length} collections:`)
  collections.forEach(col => console.log(`  • ${col}`))

  // Confirmation prompt (unless force or dry-run)
  if (!force && !dryRun) {
    consola.error('⚠️  WARNING: This will remove multiple collections!')
    consola.warn('Run with --dry-run to preview changes first')
    console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...')

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n' + '─'.repeat(60))
  console.log('  EXECUTING ROLLBACK')
  console.log('─'.repeat(60) + '\n')

  let totalChangesMade = false

  // Rollback each collection
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i]
    console.log(`\n[${i + 1}/${collections.length}] ${collection}`)

    const changesMade = await rollbackCollection({
      layer,
      collection,
      dryRun,
      keepFiles,
      silent: true
    })

    if (changesMade) {
      totalChangesMade = true
      consola.success(`Rolled back ${collection}`)
    } else {
      console.log(`  ! No changes for ${collection}`)
    }
  }

  // Check if layer should be removed from root config
  const layerCollectionsPath = path.resolve('layers', layer, 'collections')
  if (await fileExists(layerCollectionsPath)) {
    const remainingCollections = await getAllCollectionsInLayer(layer)
    if (remainingCollections.length === 0) {
      console.log('\n' + '─'.repeat(60))
      console.log('  CLEANING ROOT CONFIG')
      console.log('─'.repeat(60) + '\n')
      await cleanRootNuxtConfig(layer, dryRun, true)
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  if (dryRun) {
    console.log('  DRY RUN COMPLETE')
    console.log('═'.repeat(60) + '\n')
    consola.warn('No changes were made. Run without --dry-run to execute.')
  } else {
    console.log('  ROLLBACK COMPLETE')
    console.log('═'.repeat(60) + '\n')

    if (totalChangesMade) {
      consola.success(`Successfully rolled back ${collections.length} collections`)
      consola.warn('\n⚠️  Next steps:')
      console.log('  1. Run: pnpm db:generate (to update database schema)')
      console.log('  2. Restart your Nuxt dev server')
    } else {
      consola.warn('No changes were made')
    }
  }

  console.log()
  return totalChangesMade
}

function parseArgs() {
  const a = process.argv.slice(2)

  const dryRun = a.includes('--dry-run')
  const keepFiles = a.includes('--keep-files')
  const force = a.includes('--force')

  // Check for config mode
  const configFlag = a.find(x => x.startsWith('--config='))
  if (configFlag) {
    return {
      mode: 'config',
      configPath: configFlag.split('=')[1],
      dryRun,
      keepFiles,
      force
    }
  }

  // Check for layer mode
  const layerFlag = a.find(x => x.startsWith('--layer='))
  if (layerFlag) {
    return {
      mode: 'layer',
      layer: layerFlag.split('=')[1],
      dryRun,
      keepFiles,
      force
    }
  }

  // Multiple collections mode
  const pos = a.filter(x => !x.startsWith('--'))
  if (pos.length >= 2) {
    return {
      mode: 'multiple',
      layer: pos[0],
      collections: pos.slice(1),
      dryRun,
      keepFiles,
      force
    }
  }

  console.log('Usage:')
  console.log('  crouton-rollback-bulk --layer=<layer> [options]')
  console.log('  crouton-rollback-bulk --config=<path> [options]')
  console.log('  crouton-rollback-bulk <layer> <collection1> <collection2> ... [options]')
  console.log('\nOptions:')
  console.log('  --dry-run      Preview what will be removed')
  console.log('  --keep-files   Keep generated files, only clean configs')
  console.log('  --force        Skip confirmation prompts')
  process.exit(1)
}

async function main() {
  const args = parseArgs()

  switch (args.mode) {
    case 'layer':
      await rollbackLayer(args)
      break

    case 'config':
      await rollbackFromConfig(args)
      break

    case 'multiple':
      await rollbackMultiple(args)
      break

    default:
      consola.error('Invalid mode')
      process.exit(1)
  }
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    consola.error(`\nFatal error: ${error.message}`)
    process.exit(1)
  })
}
