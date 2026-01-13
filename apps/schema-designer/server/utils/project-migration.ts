/**
 * Project Migration Utility
 *
 * Converts legacy schema project formats to the new package-aware format.
 *
 * Migration path:
 * 1. Legacy (schema/collectionName/layerName) → collections array + baseLayerName
 * 2. Multi-collection (collections + layerName) → collections + baseLayerName
 * 3. Both → Package-aware format with packages array
 */

import type { CollectionSchema, CollectionOptions, SchemaDesignerState } from '@friendlyinternet/nuxt-crouton-schema-designer/types'
import type { PackageInstance } from '@friendlyinternet/nuxt-crouton-schema-designer/types'

/**
 * Raw database record structure
 */
export interface SchemaProjectRecord {
  id: string
  name: string
  baseLayerName: string | null
  layerName: string
  collectionName: string
  schema: SchemaDesignerState | Record<string, unknown>
  options: CollectionOptions | Record<string, unknown>
  packages: PackageInstance[] | null
  collections: CollectionSchema[] | null
  teamId: string | null
  userId: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * Normalized project structure after migration
 * This is what the API returns to clients
 */
export interface NormalizedProject {
  id: string
  name: string
  baseLayerName: string
  // Legacy fields preserved for backwards compatibility
  layerName: string
  collectionName: string
  schema: SchemaDesignerState | Record<string, unknown>
  options: CollectionOptions | Record<string, unknown>
  // New fields
  packages: PackageInstance[]
  collections: CollectionSchema[]
  teamId: string | null
  userId: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * Check if a project is in the new package-aware format
 */
export function isPackageAwareProject(project: SchemaProjectRecord): boolean {
  return project.packages !== null && Array.isArray(project.packages)
}

/**
 * Check if a project has multi-collection format (but not package-aware)
 */
export function isMultiCollectionProject(project: SchemaProjectRecord): boolean {
  return !isPackageAwareProject(project) &&
    project.collections !== null &&
    Array.isArray(project.collections) &&
    project.collections.length > 0
}

/**
 * Check if a project is a legacy single-collection format
 */
export function isLegacyProject(project: SchemaProjectRecord): boolean {
  return !isPackageAwareProject(project) && !isMultiCollectionProject(project)
}

/**
 * Convert legacy schema to a CollectionSchema entry
 */
function legacySchemaToCollection(
  projectId: string,
  collectionName: string,
  schema: SchemaDesignerState | Record<string, unknown>,
  options: CollectionOptions | Record<string, unknown>
): CollectionSchema {
  const typedSchema = schema as SchemaDesignerState

  return {
    id: `collection-legacy-${projectId}`,
    collectionName,
    fields: typedSchema?.fields || [],
    options: (options as CollectionOptions) || {
      hierarchy: false,
      sortable: false,
      translatable: false,
      seed: false,
      seedCount: 10
    },
    cardTemplate: typedSchema?.cardTemplate
  }
}

/**
 * Migrate a project record to the normalized format
 *
 * This function:
 * 1. Preserves all original fields for backwards compatibility
 * 2. Ensures collections array is populated (from legacy schema if needed)
 * 3. Sets baseLayerName (from baseLayerName or layerName)
 * 4. Initializes packages as empty array if not present
 */
export function migrateProject(project: SchemaProjectRecord): NormalizedProject {
  // Determine baseLayerName
  const baseLayerName = project.baseLayerName || project.layerName

  // Determine collections array
  let collections: CollectionSchema[]

  if (isPackageAwareProject(project) || isMultiCollectionProject(project)) {
    // Already has collections array
    collections = project.collections || []
  } else {
    // Legacy project - convert schema to collections
    collections = project.schema
      ? [legacySchemaToCollection(
          project.id,
          project.collectionName,
          project.schema,
          project.options
        )]
      : []
  }

  // Determine packages array
  const packages: PackageInstance[] = project.packages || []

  return {
    ...project,
    baseLayerName,
    packages,
    collections
  }
}

/**
 * Prepare project data for database update after migration
 * Returns only the fields that should be updated in the database
 */
export function getMigrationUpdates(project: SchemaProjectRecord): Partial<SchemaProjectRecord> | null {
  // Only migrate legacy projects
  if (isPackageAwareProject(project)) {
    return null // Already migrated
  }

  const updates: Partial<SchemaProjectRecord> = {}

  // Set baseLayerName if not already set
  if (!project.baseLayerName) {
    updates.baseLayerName = project.layerName
  }

  // Initialize packages array if not present
  if (project.packages === null) {
    updates.packages = []
  }

  // Convert legacy schema to collections if needed
  if (isLegacyProject(project) && project.schema) {
    updates.collections = [
      legacySchemaToCollection(
        project.id,
        project.collectionName,
        project.schema,
        project.options
      )
    ]
  }

  // Only return updates if there are changes
  return Object.keys(updates).length > 0 ? updates : null
}

/**
 * Create a collection from request data (for new projects)
 */
export function createCollectionFromRequest(
  projectId: string,
  collectionName: string,
  fields: unknown[],
  options: Record<string, unknown>,
  cardTemplate?: string
): CollectionSchema {
  return {
    id: `collection-${projectId}-${Date.now()}`,
    collectionName,
    fields: fields as CollectionSchema['fields'],
    options: options as unknown as CollectionOptions,
    cardTemplate
  }
}
