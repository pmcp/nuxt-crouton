/**
 * Database schema for schema-designer app
 * Defines the schema_projects table for storing schema designer projects
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
  collectionName: text('collection_name').notNull(),

  // Schema data stored as JSON
  schema: text('schema', { mode: 'json' }).notNull(),
  options: text('options', { mode: 'json' }).notNull(),

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
