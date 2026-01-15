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

export const discubotInboxmessages = sqliteTable('discubot_inboxmessages', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  configId: text('configId').notNull(),
  messageType: text('messageType').notNull(),
  from: text('from').notNull(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  htmlBody: text('htmlBody'),
  textBody: text('textBody'),
  receivedAt: integer('receivedAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  read: integer('read', { mode: 'boolean' }).$default(() => false),
  forwardedTo: text('forwardedTo'),
  forwardedAt: integer('forwardedAt', { mode: 'timestamp' }).$default(() => new Date()),
  resendEmailId: text('resendEmailId'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})