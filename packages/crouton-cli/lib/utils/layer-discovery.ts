/**
 * Layer and collection discovery utilities.
 *
 * Shared by rollback commands and the types registry generator.
 */

import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileExists } from '@fyit/crouton-core/shared/utils/fs'

/**
 * Get all layers that have a `collections/` subdirectory.
 */
export async function getAllLayers(basePath: string = '.'): Promise<string[]> {
  const layersPath = path.resolve(basePath, 'layers')

  if (!await fileExists(layersPath)) {
    return []
  }

  const entries = await fsp.readdir(layersPath, { withFileTypes: true })
  const layers: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const collectionsPath = path.join(layersPath, entry.name, 'collections')
    if (await fileExists(collectionsPath)) {
      layers.push(entry.name)
    }
  }

  return layers
}

/**
 * Get all collection directory names within a layer.
 */
export async function getAllCollectionsInLayer(layer: string, basePath: string = '.'): Promise<string[]> {
  const collectionsPath = path.resolve(basePath, 'layers', layer, 'collections')

  if (!await fileExists(collectionsPath)) {
    return []
  }

  const entries = await fsp.readdir(collectionsPath, { withFileTypes: true })
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
}
