#!/usr/bin/env node
// rollback-bulk.mjs — Bulk rollback operations for layers and config files

import fsp from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'

// Import utilities
import { toCase } from './utils/helpers.mjs'
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
    console.error(chalk.red(`Error reading layer collections: ${error.message}`))
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
    console.error(chalk.red(`Error reading layers: ${error.message}`))
    return []
  }
}

export async function rollbackLayer({ layer, dryRun = false, keepFiles = false, force = false }) {
  console.log(chalk.bold('\n═'.repeat(60)))
  console.log(chalk.bold(`  LAYER ROLLBACK: ${layer}`))
  console.log(chalk.bold('═'.repeat(60)) + '\n')

  // Get all collections in this layer
  const collections = await getAllCollectionsInLayer(layer)

  if (collections.length === 0) {
    console.log(chalk.red(`✗ No collections found in layer "${layer}"`))
    return false
  }

  console.log(chalk.cyan(`Found ${collections.length} collections in layer "${layer}":`))
  collections.forEach(col => console.log(chalk.gray(`  • ${col}`)))

  // Show what will be removed
  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  IMPACT ASSESSMENT'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  console.log(chalk.yellow(`This will remove:`))
  console.log(chalk.gray(`  • ${collections.length} collections`))
  if (!keepFiles) {
    console.log(chalk.gray(`  • All collection files in layers/${layer}/collections/`))
  }
  console.log(chalk.gray(`  • Schema index exports for all collections`))
  console.log(chalk.gray(`  • app.config.ts entries for all collections`))
  console.log(chalk.gray(`  • Layer "${layer}" from root nuxt.config.ts`))

  // Confirmation prompt (unless force or dry-run)
  if (!force && !dryRun) {
    console.log('\n' + chalk.red(chalk.bold('⚠️  WARNING: This will remove ALL collections in this layer!')))
    console.log(chalk.yellow('Run with --dry-run to preview changes first'))
    console.log(chalk.gray('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...'))

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  EXECUTING BULK ROLLBACK'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  let totalChangesMade = false

  // Rollback each collection
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i]
    console.log(chalk.bold(`\n[${i + 1}/${collections.length}] ${collection}`))

    const changesMade = await rollbackCollection({
      layer,
      collection,
      dryRun,
      keepFiles,
      silent: true
    })

    if (changesMade) {
      totalChangesMade = true
      console.log(chalk.green(`  ✓ Rolled back ${collection}`))
    } else {
      console.log(chalk.gray(`  ! No changes for ${collection}`))
    }
  }

  // Remove layer from root config
  console.log(chalk.bold('\n─'.repeat(60)))
  console.log(chalk.bold('  CLEANING ROOT CONFIG'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  if (await cleanRootNuxtConfig(layer, dryRun, true)) {
    totalChangesMade = true
  }

  // Summary
  console.log('\n' + chalk.bold('═'.repeat(60)))
  if (dryRun) {
    console.log(chalk.bold('  DRY RUN COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')
    console.log(chalk.yellow('No changes were made. Run without --dry-run to execute.'))
  } else {
    console.log(chalk.bold('  BULK ROLLBACK COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')

    if (totalChangesMade) {
      console.log(chalk.green(`✓ Successfully rolled back ${collections.length} collections from layer "${layer}"`))
      console.log(chalk.yellow('\n⚠️  Next steps:'))
      console.log(chalk.gray('  1. Run: pnpm db:generate (to update database schema)'))
      console.log(chalk.gray('  2. Restart your Nuxt dev server'))
    } else {
      console.log(chalk.yellow('! No changes were made'))
    }
  }

  console.log()
  return totalChangesMade
}

export async function rollbackFromConfig({ configPath, dryRun = false, keepFiles = false, force = false }) {
  console.log(chalk.bold('\n═'.repeat(60)))
  console.log(chalk.bold('  CONFIG-BASED ROLLBACK'))
  console.log(chalk.bold('═'.repeat(60)) + '\n')

  console.log(chalk.cyan(`Config file: ${configPath}`))

  // Load config file
  const resolvedPath = path.resolve(configPath)

  if (!await fileExists(resolvedPath)) {
    console.log(chalk.red(`\n✗ Config file not found: ${configPath}`))
    process.exit(1)
  }

  let config
  try {
    config = (await import(resolvedPath)).default
  } catch (error) {
    console.log(chalk.red(`\n✗ Error loading config: ${error.message}`))
    process.exit(1)
  }

  if (!config || !config.targets) {
    console.log(chalk.red(`\n✗ Invalid config: missing targets`))
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

  console.log(chalk.green(`\n✓ Found ${config.targets.length} layers, ${totalCollections} collections`))

  // Show what will be removed
  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  COLLECTIONS TO ROLLBACK'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  for (const [layer, collections] of Object.entries(layerCollectionMap)) {
    console.log(chalk.cyan(`${layer}:`))
    collections.forEach(col => console.log(chalk.gray(`  • ${col}`)))
  }

  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  IMPACT ASSESSMENT'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  console.log(chalk.yellow(`This will remove:`))
  console.log(chalk.gray(`  • ${totalCollections} collections across ${config.targets.length} layers`))
  if (!keepFiles) {
    console.log(chalk.gray(`  • All collection files`))
  }
  console.log(chalk.gray(`  • All schema index exports`))
  console.log(chalk.gray(`  • All app.config.ts entries`))
  console.log(chalk.gray(`  • All affected layers from root nuxt.config.ts`))

  // Confirmation prompt (unless force or dry-run)
  if (!force && !dryRun) {
    console.log('\n' + chalk.red(chalk.bold('⚠️  WARNING: This will remove ALL collections defined in this config!')))
    console.log(chalk.yellow('Run with --dry-run to preview changes first'))
    console.log(chalk.gray('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...'))

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  EXECUTING CONFIG-BASED ROLLBACK'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  let totalChangesMade = false
  let processedCount = 0

  // Process each target
  for (const target of config.targets) {
    if (!target.layer || !target.collections) continue

    console.log(chalk.bold(`\n${'═'.repeat(60)}`))
    console.log(chalk.bold(`  LAYER: ${target.layer}`))
    console.log(chalk.bold('═'.repeat(60)))

    for (const collection of target.collections) {
      processedCount++
      console.log(chalk.bold(`\n[${processedCount}/${totalCollections}] ${target.layer}/${collection}`))

      const changesMade = await rollbackCollection({
        layer: target.layer,
        collection,
        dryRun,
        keepFiles,
        silent: true
      })

      if (changesMade) {
        totalChangesMade = true
        console.log(chalk.green(`  ✓ Rolled back ${collection}`))
      } else {
        console.log(chalk.gray(`  ! No changes for ${collection}`))
      }
    }

    // Clean up layer from root config
    console.log(chalk.bold('\n  Checking root config...'))
    await cleanRootNuxtConfig(target.layer, dryRun, true)
  }

  // Summary
  console.log('\n' + chalk.bold('═'.repeat(60)))
  if (dryRun) {
    console.log(chalk.bold('  DRY RUN COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')
    console.log(chalk.yellow('No changes were made. Run without --dry-run to execute.'))
  } else {
    console.log(chalk.bold('  CONFIG-BASED ROLLBACK COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')

    if (totalChangesMade) {
      console.log(chalk.green(`✓ Successfully rolled back ${totalCollections} collections`))
      console.log(chalk.yellow('\n⚠️  Next steps:'))
      console.log(chalk.gray('  1. Run: pnpm db:generate (to update database schema)'))
      console.log(chalk.gray('  2. Restart your Nuxt dev server'))
    } else {
      console.log(chalk.yellow('! No changes were made'))
    }
  }

  console.log()
  return totalChangesMade
}

export async function rollbackMultiple({ layer, collections, dryRun = false, keepFiles = false, force = false }) {
  console.log(chalk.bold('\n═'.repeat(60)))
  console.log(chalk.bold(`  MULTIPLE COLLECTION ROLLBACK`))
  console.log(chalk.bold('═'.repeat(60)) + '\n')

  console.log(chalk.cyan(`Layer: ${layer}`))
  console.log(chalk.cyan(`Collections: ${collections.join(', ')}`))

  // Show what will be removed
  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  IMPACT ASSESSMENT'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  console.log(chalk.yellow(`This will remove ${collections.length} collections:`))
  collections.forEach(col => console.log(chalk.gray(`  • ${col}`)))

  // Confirmation prompt (unless force or dry-run)
  if (!force && !dryRun) {
    console.log('\n' + chalk.red(chalk.bold('⚠️  WARNING: This will remove multiple collections!')))
    console.log(chalk.yellow('Run with --dry-run to preview changes first'))
    console.log(chalk.gray('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...'))

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n' + chalk.bold('─'.repeat(60)))
  console.log(chalk.bold('  EXECUTING ROLLBACK'))
  console.log(chalk.bold('─'.repeat(60)) + '\n')

  let totalChangesMade = false

  // Rollback each collection
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i]
    console.log(chalk.bold(`\n[${i + 1}/${collections.length}] ${collection}`))

    const changesMade = await rollbackCollection({
      layer,
      collection,
      dryRun,
      keepFiles,
      silent: true
    })

    if (changesMade) {
      totalChangesMade = true
      console.log(chalk.green(`  ✓ Rolled back ${collection}`))
    } else {
      console.log(chalk.gray(`  ! No changes for ${collection}`))
    }
  }

  // Check if layer should be removed from root config
  const layerCollectionsPath = path.resolve('layers', layer, 'collections')
  if (await fileExists(layerCollectionsPath)) {
    const remainingCollections = await getAllCollectionsInLayer(layer)
    if (remainingCollections.length === 0) {
      console.log(chalk.bold('\n─'.repeat(60)))
      console.log(chalk.bold('  CLEANING ROOT CONFIG'))
      console.log(chalk.bold('─'.repeat(60)) + '\n')
      await cleanRootNuxtConfig(layer, dryRun, true)
    }
  }

  // Summary
  console.log('\n' + chalk.bold('═'.repeat(60)))
  if (dryRun) {
    console.log(chalk.bold('  DRY RUN COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')
    console.log(chalk.yellow('No changes were made. Run without --dry-run to execute.'))
  } else {
    console.log(chalk.bold('  ROLLBACK COMPLETE'))
    console.log(chalk.bold('═'.repeat(60)) + '\n')

    if (totalChangesMade) {
      console.log(chalk.green(`✓ Successfully rolled back ${collections.length} collections`))
      console.log(chalk.yellow('\n⚠️  Next steps:'))
      console.log(chalk.gray('  1. Run: pnpm db:generate (to update database schema)'))
      console.log(chalk.gray('  2. Restart your Nuxt dev server'))
    } else {
      console.log(chalk.yellow('! No changes were made'))
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
      console.log(chalk.red('Invalid mode'))
      process.exit(1)
  }
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('\n✗ Fatal error:'), error.message)
    process.exit(1)
  })
}
