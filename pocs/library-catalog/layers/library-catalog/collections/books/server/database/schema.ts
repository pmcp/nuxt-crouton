import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, real, customType, uniqueIndex } from 'drizzle-orm/sqlite-core'

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

export const libraryCatalogBooks = sqliteTable('library_catalog_books', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  title: text('title').notNull(),
  isbn: text('isbn'),
  publishedYear: integer('publishedYear'),
  coverImage: text('coverImage'),
  description: text('description'),
  authorId: text('authorId').notNull(),
  genreId: text('genreId'),
  copiesTotal: integer('copiesTotal'),
  copiesAvailable: integer('copiesAvailable'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
}, (table) => [
  uniqueIndex('library_catalog_books_team_isbn_idx').on(table.teamId, table.isbn)
])