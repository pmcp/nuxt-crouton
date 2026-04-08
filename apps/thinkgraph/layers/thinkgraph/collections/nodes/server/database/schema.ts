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

  // Structure
  projectId: text('projectId').notNull(),

  // Classification
  template: text('template').$default(() => 'idea'),
  steps: jsonColumn('steps'),
  title: text('title').notNull(),
  summary: text('summary'),
  status: text('status').notNull().$default(() => 'idle'),

  // Content
  brief: text('brief'),
  output: text('output'),
  retrospective: text('retrospective'),
  // Block editor doc (TipTap JSON) — Notion-style slideover content. PR 1 of multi-PR series.
  content: jsonColumn('content'),

  // Routing
  assignee: text('assignee').$default(() => 'human'),
  provider: text('provider'),
  skill: text('skill'),
  sessionId: text('sessionId'),

  // Pipeline
  stage: text('stage'),
  signal: text('signal'),

  // Flags
  starred: integer('starred', { mode: 'boolean' }).$default(() => false),
  pinned: integer('pinned', { mode: 'boolean' }).$default(() => false),

  // Dependencies — node IDs that must be 'done' before this node can dispatch
  dependsOn: jsonColumn('dependsOn').$default(() => []),

  // Provenance
  origin: text('origin').$default(() => 'human'),
  contextScope: text('contextScope').$default(() => 'branch'),
  contextNodeIds: jsonColumn('contextNodeIds').$default(() => []),

  // Execution
  worktree: text('worktree'),
  deployUrl: text('deployUrl'),

  // Output
  artifacts: jsonColumn('artifacts').$default(() => ({})),

  // Timestamps
  createdAt: text('createdAt').$default(() => new Date().toISOString()),
  updatedAt: text('updatedAt').$default(() => new Date().toISOString()),
})
