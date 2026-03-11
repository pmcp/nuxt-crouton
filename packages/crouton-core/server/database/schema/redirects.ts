import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const croutonRedirects = sqliteTable('crouton_redirects', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  fromPath: text('fromPath').notNull(),
  toPath: text('toPath').notNull(),
  statusCode: text('statusCode').notNull().$default(() => '301'),
  isActive: integer('isActive', { mode: 'boolean' }).notNull().$default(() => true),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
}, (table) => [
  uniqueIndex('crouton_redirects_team_from_path_idx').on(table.teamId, table.fromPath)
])
