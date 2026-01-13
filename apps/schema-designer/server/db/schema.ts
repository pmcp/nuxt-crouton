/**
 * Database schema for schema-designer app
 * Defines the schema_projects table for storing schema designer projects
 *
 * Migration note: Projects can have either:
 * - Legacy: single schema/collectionName/layerName (for backwards compatibility)
 * - New: packages array + collections array + baseLayerName (for package-aware projects)
 *
 * When reading:
 * 1. Check if packages is present → new format
 * 2. Otherwise, check collections → multi-collection format
 * 3. Fall back to legacy schema/collectionName
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const schemaProjects = sqliteTable('schema_projects', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),

  // Project metadata
  name: text('name').notNull(),

  // Base layer name for custom collections (new format)
  // Falls back to layerName for legacy projects
  baseLayerName: text('base_layer_name'),

  // Legacy layer name (for backwards compatibility)
  // @deprecated Use baseLayerName instead
  layerName: text('layer_name').notNull(),

  // Legacy single-collection fields (for backwards compatibility)
  // @deprecated Use collections array instead
  collectionName: text('collection_name').notNull(),

  // Legacy schema data stored as JSON (for backwards compatibility)
  // @deprecated Use collections array instead
  schema: text('schema', { mode: 'json' }).notNull(),
  options: text('options', { mode: 'json' }).notNull(),

  // Package support (nullable for migration)
  // When present, this project uses the package-aware format
  packages: text('packages', { mode: 'json' }),

  // Multi-collection support (nullable for migration)
  // When this is present, it takes precedence over legacy schema/collectionName
  collections: text('collections', { mode: 'json' }),

  // Optional team/user scope
  teamId: text('team_id'),
  userId: text('user_id'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$default(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(
    () => new Date()
  )
})
