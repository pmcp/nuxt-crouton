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

export const discubotTasks = sqliteTable('discubot_tasks', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  discussionId: text('discussionId').notNull(),
  syncJobId: text('syncJobId').notNull(),
  notionPageId: text('notionPageId').notNull().unique(),
  notionPageUrl: text('notionPageUrl').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  priority: text('priority'),
  assignee: text('assignee'),
  summary: text('summary'),
  sourceUrl: text('sourceUrl').notNull(),
  isMultiTaskChild: integer('isMultiTaskChild', { mode: 'boolean' }).notNull().$default(() => false),
  taskIndex: integer('taskIndex'),
  metadata: jsonColumn('metadata').$default(() => ({})),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})