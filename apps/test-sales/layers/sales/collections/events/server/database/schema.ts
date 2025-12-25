import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, real, customType } from 'drizzle-orm/sqlite-core'

// Custom JSON column that handles NULL values gracefully during LEFT JOINs
const jsonColumn = customType<any>({
  dataType() {
    return 'text'
  },
  fromDriver(value: unknown): any {
    if (value === null || value === undefined || value === '') {
      return null
    }
    return JSON.parse(value as string)
  },
  toDriver(value: any): string {
    return JSON.stringify(value)
  },
})

export const salesEvents = sqliteTable('sales_events', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  eventType: text('eventType'),
  startDate: integer('startDate', { mode: 'timestamp' }).$default(() => new Date()),
  endDate: integer('endDate', { mode: 'timestamp' }).$default(() => new Date()),
  status: text('status').notNull(),
  isCurrent: integer('isCurrent', { mode: 'boolean' }).$default(() => false),
  helperPin: text('helperPin'),
  metadata: jsonColumn('metadata').$default(() => ({})),
  archivedAt: integer('archivedAt', { mode: 'timestamp' }).$default(() => new Date()),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})