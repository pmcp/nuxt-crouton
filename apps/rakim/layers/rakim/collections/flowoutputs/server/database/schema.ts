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
    return JSON.parse(value as string)
  },
  toDriver(value: any): string {
    return JSON.stringify(value)
  },
})

export const discubotFlowoutputs = sqliteTable('discubot_flowoutputs', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  flowId: text('flowId').notNull(),
  outputType: text('outputType').notNull(),
  name: text('name').notNull(),
  domainFilter: jsonColumn('domainFilter').$default(() => (null)),
  isDefault: integer('isDefault', { mode: 'boolean' }).$default(() => false),
  outputConfig: jsonColumn('outputConfig').$default(() => ({})),
  active: integer('active', { mode: 'boolean' }).notNull().$default(() => false),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})