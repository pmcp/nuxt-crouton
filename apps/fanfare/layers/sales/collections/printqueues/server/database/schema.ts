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

export const salesPrintqueues = sqliteTable('sales_printqueues', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  eventId: text('eventId').notNull(),
  orderId: text('orderId').notNull(),
  printerId: text('printerId').notNull(),
  locationId: text('locationId'),
  // Hotfix: JSON schema declares these as integer but the cli generated text
  // columns. Corrected here; cli regression tracked separately.
  status: integer('status').notNull(),
  printData: text('printData').notNull(),
  printMode: text('printMode'),
  errorMessage: text('errorMessage'),
  retryCount: integer('retryCount'),
  completedAt: integer('completedAt', { mode: 'timestamp' }),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})