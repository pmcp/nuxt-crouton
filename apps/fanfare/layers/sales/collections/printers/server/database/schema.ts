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

export const salesPrinters = sqliteTable('sales_printers', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  eventId: text('eventId').notNull(),
  // Nullable: receipt printers carry no location (kitchen routing key only)
  locationId: text('locationId'),
  title: text('title').notNull(),
  ipAddress: text('ipAddress').notNull(),
  port: text('port'),
  // kitchen = per-location tickets (default, also for NULL); receipt = combined customer receipt
  type: text('type'),
  status: text('status'),
  showPrices: integer('showPrices', { mode: 'boolean' }).$default(() => true),
  isActive: integer('isActive', { mode: 'boolean' }).$default(() => true),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})