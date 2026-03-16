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

export const thinkgraphDecisions = sqliteTable('thinkgraph_decisions', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  graphId: text('graphId').notNull(),
  content: text('content').notNull(),
  nodeType: text('nodeType').notNull(),
  pathType: text('pathType'),
  starred: integer('starred', { mode: 'boolean' }).$default(() => false),
  pinned: integer('pinned', { mode: 'boolean' }).$default(() => false),
  branchName: text('branchName'),
  versionTag: text('versionTag'),
  parentId: text('parentId'),
  source: text('source'),
  model: text('model'),
  artifacts: jsonColumn('artifacts'),

  // Execution status for visual language
  status: text('status').$default(() => 'idle'),
  // Origin of the node
  origin: text('origin').$default(() => 'human'),
  // Notion sync fields
  notionId: text('notionId'),
  notionUrl: text('notionUrl'),
  // Execution fields
  worktreeRef: text('worktreeRef'),
  sessionId: text('sessionId'),
  // Handoff brief - the context payload that travels to child nodes
  brief: text('brief'),
  // Per-node context scope configuration
  contextScope: text('contextScope').$default(() => 'branch'),
  // Approval tracking (for draft/planning pass nodes)
  approvedAt: text('approvedAt'),
  approvedBy: text('approvedBy'),
})