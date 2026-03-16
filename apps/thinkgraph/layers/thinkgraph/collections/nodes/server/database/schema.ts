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

export const thinkgraphNodes = sqliteTable('thinkgraph_nodes', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  // Hierarchy fields for tree structure
  parentId: text('parentId'),
  path: text('path').notNull().$default(() => '/'),
  depth: integer('depth').notNull().$default(() => 0),
  order: integer('order').notNull().$default(() => 0),
  canvasId: text('canvasId').notNull(),
  nodeType: text('nodeType').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  brief: text('brief'),
  output: text('output'),
  handoffType: text('handoffType'),
  handoffMeta: jsonColumn('handoffMeta').$default(() => ({})),
  contextScope: text('contextScope'),
  contextNodeIds: jsonColumn('contextNodeIds').$default(() => ({})),
  notionTaskId: text('notionTaskId'),
  worktree: text('worktree'),
  sendTarget: text('sendTarget'),
  sendMode: text('sendMode'),
  injectMode: text('injectMode'),
  origin: text('origin'),
  stepIndex: text('stepIndex'),
  skillVersion: text('skillVersion'),
  tokenCount: text('tokenCount'),
  userId: text('userId')
})