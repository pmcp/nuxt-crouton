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

export const thinkgraphWorkItems = sqliteTable('thinkgraph_workitems', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  // Hierarchy fields for tree structure
  parentId: text('parentId'),
  path: text('path').notNull().$default(() => '/'),
  depth: integer('depth').notNull().$default(() => 0),
  order: integer('order').notNull().$default(() => 0),
  projectId: text('projectId').notNull(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  brief: text('brief'),
  output: text('output'),
  assignee: text('assignee'),
  provider: text('provider'),
  sessionId: text('sessionId'),
  worktree: text('worktree'),
  deployUrl: text('deployUrl'),
  skill: text('skill'),
  artifacts: jsonColumn('artifacts').$default(() => ({}))
})