import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const flowConfigs = sqliteTable('flow_configs', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  collection: text('collection').notNull(),
  labelField: text('label_field').default('title'),
  parentField: text('parent_field').default('parentId'),
  positionField: text('position_field').default('position'),
  syncEnabled: integer('sync_enabled', { mode: 'boolean' }).default(false),
  nodePositions: text('node_positions', { mode: 'json' }).$type<Record<string, { x: number; y: number }>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$default(() => new Date()).$onUpdate(() => new Date()),
}, (table) => [
  index('idx_flow_configs_team_id').on(table.teamId),
])
