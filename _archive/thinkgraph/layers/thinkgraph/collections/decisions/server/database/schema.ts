import { nanoid } from 'nanoid'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const thinkgraphDecisions = sqliteTable('thinkgraph_decisions', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  content: text('content').notNull(),
  type: text('type').$default(() => 'insight'),
  pathType: text('pathType'),
  starred: integer('starred', { mode: 'boolean' }).$default(() => false),
  branchName: text('branchName').$default(() => 'main'),
  versionTag: text('versionTag').$default(() => 'v1'),
  source: text('source'),
  model: text('model'),
  parentId: text('parentId'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})
