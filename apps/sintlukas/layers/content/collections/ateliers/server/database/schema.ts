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
// Note: This collection has translatable fields: title, age, content, sidebarContent
// Translations are stored in a JSON field without indexes for performance baseline

export const contentAteliers = sqliteTable('content_ateliers', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  title: text('title').notNull(),
  category: text('category').notNull(),
  age: text('age'),
  mainImage: text('mainImage'),
  cardImage: text('cardImage'),
  content: text('content'),
  sidebarContent: text('sidebarContent'),
  persons: jsonColumn('persons').$default(() => (null)),
  images: jsonColumn('images').$default(() => (null)),
  status: text('status').notNull(),
  // Note: No indexes on translations - measure performance first
  // Add indexes only if queries exceed 50ms with real data
  translations: jsonColumn('translations').$type<{
    [locale: string]: {
      title?: string
      age?: string
      content?: string
      sidebarContent?: string
    }
  }>(),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})