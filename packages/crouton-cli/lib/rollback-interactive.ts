#!/usr/bin/env node
// rollback-interactive.ts — Interactive UI for selecting collections to rollback

import fsp from 'node:fs/promises'
import path from 'node:path'
import * as p from '@clack/prompts'
import consola from 'consola'

// Import utilities
import { fileExists } from './rollback-collection.ts'
import { rollbackLayer, rollbackMultiple } from './rollback-bulk.ts'

async function getAllCollectionsInLayer(layer: string): Promise<string[]> {
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

async function getAllLayers(): Promise<string[]> {
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
    consola.error(`Error reading layers: ${error.message}`)
    return []
  }
}

interface LayerStats {
  layer: string
  collectionsCount: number
  collections: string[]
}

async function getLayerStats(layer: string): Promise<LayerStats> {
  const collections = await getAllCollectionsInLayer(layer)
  return {
    layer,
    collectionsCount: collections.length,
    collections
  }
}

function handleCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Rollback cancelled.')
    process.exit(0)
  }
  return value as T
}

export async function interactiveRollback({ dryRun = false, keepFiles = false }: { dryRun?: boolean; keepFiles?: boolean }): Promise<void> {
  p.intro('Interactive Rollback')

  // Get all layers
  const layers = await getAllLayers()

  if (layers.length === 0) {
    consola.error('No layers with collections found')
    process.exit(1)
  }

  // Get stats for each layer
  const layerStats = await Promise.all(layers.map(getLayerStats))

  consola.info(`Found ${layers.length} layers:`)
  layerStats.forEach((stat) => {
    console.log(`  - ${stat.layer} (${stat.collectionsCount} collections)`)
  })

  // Ask user to select rollback mode
  const mode = handleCancel(await p.select({
    message: 'What would you like to rollback?',
    options: [
      { label: 'Entire layer (all collections)', value: 'layer' },
      { label: 'Specific collections', value: 'collections' },
      { label: 'Cancel', value: 'cancel' }
    ]
  }))

  if (mode === 'cancel') {
    p.cancel('Rollback cancelled.')
    process.exit(0)
  }

  if (mode === 'layer') {
    // Layer mode: Select which layer
    const selectedLayer = handleCancel(await p.select({
      message: 'Which layer would you like to rollback?',
      options: layerStats.map(stat => ({
        label: `${stat.layer} (${stat.collectionsCount} collections)`,
        value: stat.layer
      }))
    }))

    const stat = layerStats.find(s => s.layer === selectedLayer)

    // Show collections in this layer
    consola.info(`Collections in "${selectedLayer}":`)
    stat.collections.forEach(col => console.log(`  - ${col}`))

    // Confirm
    const confirm = handleCancel(await p.confirm({
      message: `Remove ALL ${stat.collectionsCount} collections from layer "${selectedLayer}"?`,
      initialValue: false
    }))

    if (!confirm) {
      p.cancel('Rollback cancelled.')
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
    const selectedLayer = handleCancel(await p.select({
      message: 'Which layer contains the collections?',
      options: layerStats.map(stat => ({
        label: `${stat.layer} (${stat.collectionsCount} collections)`,
        value: stat.layer
      }))
    }))

    const stat = layerStats.find(s => s.layer === selectedLayer)

    if (stat.collections.length === 0) {
      consola.error('No collections found in this layer')
      process.exit(1)
    }

    // Select collections (multiselect)
    const selectedCollections = handleCancel(await p.multiselect({
      message: 'Select collections to rollback:',
      options: stat.collections.map(col => ({
        label: col,
        value: col
      })),
      required: true
    }))

    if (selectedCollections.length === 0) {
      p.cancel('Rollback cancelled.')
      process.exit(0)
    }

    // Show impact
    consola.info(`Selected ${selectedCollections.length} collections:`)
    selectedCollections.forEach(col => console.log(`  - ${col}`))

    // Confirm
    const confirm = handleCancel(await p.confirm({
      message: `Remove these ${selectedCollections.length} collections?`,
      initialValue: false
    }))

    if (!confirm) {
      p.cancel('Rollback cancelled.')
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

  p.outro('Done.')
}

function parseArgs(): { dryRun: boolean; keepFiles: boolean } {
  const a = process.argv.slice(2)

  const dryRun = a.includes('--dry-run')
  const keepFiles = a.includes('--keep-files')

  return { dryRun, keepFiles }
}

async function main(): Promise<void> {
  const args = parseArgs()

  await interactiveRollback(args)
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    consola.error('Fatal error:', error.message)
    process.exit(1)
  })
}
