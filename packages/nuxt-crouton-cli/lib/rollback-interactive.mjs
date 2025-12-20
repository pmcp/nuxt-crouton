#!/usr/bin/env node
// rollback-interactive.mjs — Interactive UI for selecting collections to rollback

import fsp from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import inquirer from 'inquirer'

// Import utilities
import { fileExists } from './rollback-collection.mjs'
import { rollbackLayer, rollbackMultiple } from './rollback-bulk.mjs'

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
    const layers = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const collectionsPath = path.join(layersPath, entry.name, 'collections')
      if (await fileExists(collectionsPath)) {
        layers.push(entry.name)
      }
    }

    return layers
  } catch (error) {
    console.error(chalk.red(`Error reading layers: ${error.message}`))
    return []
  }
}

async function getLayerStats(layer) {
  const collections = await getAllCollectionsInLayer(layer)
  return {
    layer,
    collectionsCount: collections.length,
    collections
  }
}

export async function interactiveRollback({ dryRun = false, keepFiles = false }) {
  console.log(chalk.bold('\n═'.repeat(60)))
  console.log(chalk.bold('  INTERACTIVE ROLLBACK'))
  console.log(chalk.bold('═'.repeat(60)) + '\n')

  // Get all layers
  const layers = await getAllLayers()

  if (layers.length === 0) {
    console.log(chalk.red('✗ No layers with collections found'))
    process.exit(1)
  }

  // Get stats for each layer
  const layerStats = await Promise.all(layers.map(getLayerStats))

  console.log(chalk.cyan(`Found ${layers.length} layers:\n`))
  layerStats.forEach((stat) => {
    console.log(chalk.gray(`  • ${stat.layer} (${stat.collectionsCount} collections)`))
  })

  console.log()

  // Ask user to select rollback mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to rollback?',
      choices: [
        { name: 'Entire layer (all collections)', value: 'layer' },
        { name: 'Specific collections', value: 'collections' },
        { name: 'Cancel', value: 'cancel' }
      ]
    }
  ])

  if (mode === 'cancel') {
    console.log(chalk.yellow('\n✓ Cancelled'))
    process.exit(0)
  }

  if (mode === 'layer') {
    // Layer mode: Select which layer
    const { selectedLayer } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedLayer',
        message: 'Which layer would you like to rollback?',
        choices: layerStats.map(stat => ({
          name: `${stat.layer} (${stat.collectionsCount} collections)`,
          value: stat.layer
        }))
      }
    ])

    const stat = layerStats.find(s => s.layer === selectedLayer)

    // Show collections in this layer
    console.log(chalk.cyan(`\nCollections in "${selectedLayer}":`))
    stat.collections.forEach(col => console.log(chalk.gray(`  • ${col}`)))

    // Confirm
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red(`Are you sure you want to remove ALL ${stat.collectionsCount} collections from layer "${selectedLayer}"?`),
        default: false
      }
    ])

    if (!confirm) {
      console.log(chalk.yellow('\n✓ Cancelled'))
      process.exit(0)
    }

    // Execute rollback
    await rollbackLayer({
      layer: selectedLayer,
      dryRun,
      keepFiles,
      force: true // Skip additional confirmation since we already confirmed
    })
  } else if (mode === 'collections') {
    // Collections mode: Select layer first
    const { selectedLayer } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedLayer',
        message: 'Which layer contains the collections?',
        choices: layerStats.map(stat => ({
          name: `${stat.layer} (${stat.collectionsCount} collections)`,
          value: stat.layer
        }))
      }
    ])

    const stat = layerStats.find(s => s.layer === selectedLayer)

    if (stat.collections.length === 0) {
      console.log(chalk.red('\n✗ No collections found in this layer'))
      process.exit(1)
    }

    // Select collections
    const { selectedCollections } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedCollections',
        message: 'Select collections to rollback (space to select, enter to confirm):',
        choices: stat.collections.map(col => ({
          name: col,
          value: col
        })),
        validate: (answer) => {
          if (answer.length === 0) {
            return 'You must select at least one collection'
          }
          return true
        }
      }
    ])

    if (selectedCollections.length === 0) {
      console.log(chalk.yellow('\n✓ Cancelled'))
      process.exit(0)
    }

    // Show impact
    console.log(chalk.cyan(`\nSelected ${selectedCollections.length} collections:`))
    selectedCollections.forEach(col => console.log(chalk.gray(`  • ${col}`)))

    // Confirm
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red(`Are you sure you want to remove these ${selectedCollections.length} collections?`),
        default: false
      }
    ])

    if (!confirm) {
      console.log(chalk.yellow('\n✓ Cancelled'))
      process.exit(0)
    }

    // Execute rollback
    await rollbackMultiple({
      layer: selectedLayer,
      collections: selectedCollections,
      dryRun,
      keepFiles,
      force: true // Skip additional confirmation since we already confirmed
    })
  }
}

function parseArgs() {
  const a = process.argv.slice(2)

  const dryRun = a.includes('--dry-run')
  const keepFiles = a.includes('--keep-files')

  return { dryRun, keepFiles }
}

async function main() {
  const args = parseArgs()

  await interactiveRollback(args)
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('\n✗ Fatal error:'), error.message)
    process.exit(1)
  })
}
