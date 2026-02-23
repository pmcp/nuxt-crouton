import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, customType } from 'drizzle-orm/sqlite-core'

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
  }
})

export const atelierProjects = sqliteTable('atelier_projects', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  name: text('name').notNull(),
  description: text('description'),

  // Composition state is synced via Yjs — this is metadata only
  status: text('status').notNull().$default(() => 'draft'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})

export type AtelierProject = typeof atelierProjects.$inferSelect
export type NewAtelierProject = typeof atelierProjects.$inferInsert
