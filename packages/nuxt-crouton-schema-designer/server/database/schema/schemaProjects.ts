import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import type { SchemaDesignerState, CollectionOptions } from '../../../app/types/schema'

/**
 * Schema projects table for storing schema designer projects
 * Each project contains a complete schema definition that can be exported
 * for use with the crouton CLI
 */
export const schemaProjects = sqliteTable('schema_projects', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),

  // Project metadata
  name: text('name').notNull(),
  layerName: text('layer_name').notNull(),
  collectionName: text('collection_name').notNull(),

  // Schema data stored as JSON
  schema: text('schema', { mode: 'json' })
    .$type<SchemaDesignerState>()
    .notNull(),

  options: text('options', { mode: 'json' })
    .$type<CollectionOptions>()
    .notNull(),

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

export type SchemaProjectRecord = typeof schemaProjects.$inferSelect
export type NewSchemaProjectRecord = typeof schemaProjects.$inferInsert
