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

export const discubotDiscussions = sqliteTable('discubot_discussions', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  sourceType: text('sourceType').notNull(),
  sourceThreadId: text('sourceThreadId').notNull(),
  sourceUrl: text('sourceUrl').notNull(),
  sourceConfigId: text('sourceConfigId').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorHandle: text('authorHandle').notNull(),
  participants: jsonColumn('participants').$default(() => (null)),
  status: text('status').notNull(),
  threadData: jsonColumn('threadData').$default(() => ({})),
  totalMessages: integer('totalMessages'),
  aiSummary: text('aiSummary'),
  aiKeyPoints: jsonColumn('aiKeyPoints').$default(() => (null)),
  aiTasks: jsonColumn('aiTasks').$default(() => ({})),
  isMultiTask: integer('isMultiTask', { mode: 'boolean' }).$default(() => false),
  syncJobId: text('syncJobId'),
  notionTaskIds: jsonColumn('notionTaskIds').$default(() => (null)),
  rawPayload: jsonColumn('rawPayload').$default(() => ({})),
  metadata: jsonColumn('metadata').$default(() => ({})),
  processedAt: integer('processedAt', { mode: 'timestamp' }).$default(() => new Date()),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})