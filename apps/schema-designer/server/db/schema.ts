/**
 * Database schema for schema-designer app
 * Defines the schema_projects table for storing schema designer projects
 *
 * Migration note: Projects can have either:
 * - Legacy: single schema/collectionName (for backwards compatibility)
 * - New: collections array (for multi-collection projects)
 * When reading, check collections first; if null, use legacy schema
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const schemaProjects = sqliteTable('schema_projects', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),

  // Project metadata
  name: text('name').notNull(),
  layerName: text('layer_name').notNull(),

  // Legacy single-collection fields (for backwards compatibility)
  // @deprecated Use collections array instead
  collectionName: text('collection_name').notNull(),

  // Legacy schema data stored as JSON (for backwards compatibility)
  // @deprecated Use collections array instead
  schema: text('schema', { mode: 'json' }).notNull(),
  options: text('options', { mode: 'json' }).notNull(),

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
