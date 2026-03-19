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
    try {
      return JSON.parse(value as string)
    } catch {
      return null
    }
  },
  toDriver(value: any): string {
    return JSON.stringify(value)
  },
})

export const thinkgraphChatConversations = sqliteTable('thinkgraph_chatconversations', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  nodeId: text('nodeId'),
  title: text('title'),
  messages: jsonColumn('messages').notNull().$default(() => ({})),
  provider: text('provider'),
  model: text('model'),
  systemPrompt: text('systemPrompt'),
  metadata: jsonColumn('metadata').$default(() => ({})),
  messageCount: integer('messageCount'),
  lastMessageAt: integer('lastMessageAt', { mode: 'timestamp' }).$default(() => new Date()),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
})