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

export const peopleContacts = sqliteTable('people_contacts', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  website: text('website'),
  bio: text('bio'),
  avatar: text('avatar'),
  resume: text('resume'),
  active: integer('active', { mode: 'boolean' }).$default(() => true),
  birthday: integer('birthday', { mode: 'timestamp' }).$default(() => new Date()),
  socialLinks: jsonColumn('socialLinks').$default(() => ({})),
  skills: jsonColumn('skills').$default(() => (null)),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})