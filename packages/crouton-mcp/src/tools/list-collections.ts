/**
 * List Collections Tool
 * Scans and lists existing collections in the project
 */

import { z } from 'zod'
import { scanCollections, scanLayers, type CollectionInfo, type LayerInfo } from '../utils/fs.js'

export interface ListCollectionsInput {
  layer?: string
}

export interface ListCollectionsResult {
  collections: CollectionInfo[]
  totalCount: number
  byLayer: Record<string, CollectionInfo[]>
}

/**
 * Handle list_collections tool call
 */
export async function handleListCollections(
  input: ListCollectionsInput
): Promise<ListCollectionsResult> {
  const { layer } = input

  const projectRoot = process.cwd()
  const collections = await scanCollections(projectRoot, layer)

  // Group by layer
  const byLayer: Record<string, CollectionInfo[]> = {}
  for (const collection of collections) {
    if (!byLayer[collection.layer]) {
      byLayer[collection.layer] = []
    }
    byLayer[collection.layer]!.push(collection)
  }

  return {
    collections,
    totalCount: collections.length,
    byLayer
  }
}

export interface ListLayersResult {
  layers: LayerInfo[]
  totalCount: number
}

/**
 * Handle list_layers tool call
 */
export async function handleListLayers(): Promise<ListLayersResult> {
  const projectRoot = process.cwd()
  const layers = await scanLayers(projectRoot)

  return {
    layers,
    totalCount: layers.length
  }
}

export const listCollectionsInputSchema = {
  layer: z.string().optional().describe('Filter by specific layer (optional)')
}

export const listCollectionsToolDefinition = {
  name: 'list_collections',
  description: `List all existing collections in the project.
Returns collection details organized by layer.
Use this to understand the project structure before generating new collections.`
}

export const listLayersInputSchema = {}

export const listLayersToolDefinition = {
  name: 'list_layers',
  description: `List all available layers in the project.
Returns layer names and their collection counts.
Use this to understand the project structure.`
}
