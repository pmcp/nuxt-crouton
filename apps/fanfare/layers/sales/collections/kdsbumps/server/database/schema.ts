import { nanoid } from 'nanoid'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// KDS bump state (#61, decoupled KDS). A row records that one order's items at
// one location have been cleared ("bumped") off a kitchen display. Granularity
// is (order × location) so a kitchen screen and a bar screen clear the same
// order independently — the order's own status can't hold two separate "done"s.
//
// The KDS reads orders live and treats an (order, location) with a row here as
// done; the bump endpoint inserts one. No link to salesPrintqueues — printers
// and screens are independent consumers of the same per-location order stream.
export const salesKdsbumps = sqliteTable('sales_kdsbumps', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  eventId: text('eventId').notNull(),
  orderId: text('orderId').notNull(),
  locationId: text('locationId').notNull(),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull(),
})
