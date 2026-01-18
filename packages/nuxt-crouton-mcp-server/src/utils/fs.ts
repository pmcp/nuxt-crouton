/**
 * Filesystem utilities for scanning collections and layers
 */

import { readdir, stat, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface CollectionInfo {
  name: string
  layer: string
  path: string
  hasForm: boolean
  hasList: boolean
  hasApi: boolean
  hasSchema: boolean
}

export interface LayerInfo {
  name: string
  path: string
  collections: string[]
}

/**
 * Scan for existing collections in the project
 */
export async function scanCollections(
  projectRoot: string,
  layerFilter?: string
): Promise<CollectionInfo[]> {
  const collections: CollectionInfo[] = []
  const layersPath = join(projectRoot, 'layers')

  try {
    const layerDirs = await readdir(layersPath)

    for (const layerName of layerDirs) {
      if (layerFilter && layerName !== layerFilter) {
        continue
      }

      const layerPath = join(layersPath, layerName)
      const layerStat = await stat(layerPath)

      if (!layerStat.isDirectory()) {
        continue
      }

      const collectionsPath = join(layerPath, 'collections')

      try {
        const collectionDirs = await readdir(collectionsPath)

        for (const collectionName of collectionDirs) {
          const collectionPath = join(collectionsPath, collectionName)
          const collectionStat = await stat(collectionPath)

          if (!collectionStat.isDirectory()) {
            continue
          }

          const info = await getCollectionInfo(layerName, collectionName, collectionPath)
          collections.push(info)
        }
      } catch {
        // No collections directory - skip
      }
    }
  } catch {
    // No layers directory - return empty
  }

  return collections
}

/**
 * Get detailed info about a collection
 */
async function getCollectionInfo(
  layer: string,
  name: string,
  path: string
): Promise<CollectionInfo> {
  const hasForm = await fileExists(join(path, 'app', 'components', '_Form.vue'))
  const hasList = await fileExists(join(path, 'app', 'components', 'List.vue'))
  const hasApi = await fileExists(join(path, 'server', 'api'))
  const hasSchema = await fileExists(join(path, 'server', 'database', 'schema.ts'))

  return {
    name,
    layer,
    path,
    hasForm,
    hasList,
    hasApi,
    hasSchema
  }
}

/**
 * Scan for available layers
 */
export async function scanLayers(projectRoot: string): Promise<LayerInfo[]> {
  const layers: LayerInfo[] = []
  const layersPath = join(projectRoot, 'layers')

  try {
    const layerDirs = await readdir(layersPath)

    for (const layerName of layerDirs) {
      const layerPath = join(layersPath, layerName)
      const layerStat = await stat(layerPath)

      if (!layerStat.isDirectory()) {
        continue
      }

      const collections: string[] = []
      const collectionsPath = join(layerPath, 'collections')

      try {
        const collectionDirs = await readdir(collectionsPath)
        for (const dir of collectionDirs) {
          const dirPath = join(collectionsPath, dir)
          const dirStat = await stat(dirPath)
          if (dirStat.isDirectory()) {
            collections.push(dir)
          }
        }
      } catch {
        // No collections directory
      }

      layers.push({
        name: layerName,
        path: layerPath,
        collections
      })
    }
  } catch {
    // No layers directory
  }

  return layers
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Read a JSON file safely
 */
export async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}
