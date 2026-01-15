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

export const discubotJobs = sqliteTable('discubot_jobs', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  discussionId: text('discussionId').notNull(),
  sourceConfigId: text('sourceConfigId').notNull(),
  status: text('status').notNull(),
  stage: text('stage'),
  attempts: integer('attempts').notNull(),
  maxAttempts: integer('maxAttempts').notNull(),
  error: text('error'),
  errorStack: text('errorStack'),
  startedAt: integer('startedAt', { mode: 'timestamp' }).$default(() => new Date()),
  completedAt: integer('completedAt', { mode: 'timestamp' }).$default(() => new Date()),
  processingTime: integer('processingTime'),
  taskIds: jsonColumn('taskIds').$default(() => (null)),
  metadata: jsonColumn('metadata').$default(() => ({})),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})