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
import { fileExists } from '@fyit/crouton-core/shared/utils/fs'

export { fileExists }

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

