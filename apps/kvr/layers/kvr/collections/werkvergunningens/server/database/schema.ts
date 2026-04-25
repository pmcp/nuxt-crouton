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

export const kvrWerkvergunningens = sqliteTable('kvr_werkvergunningens', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  order: integer('order').notNull().$default(() => 0),
  sblNumber: text('sblNumber').notNull(),
  datum: integer('datum', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  workType: text('workType').notNull(),
  cables: jsonColumn('cables').$default(() => (null)),
  straat: text('straat').notNull(),
  huisnummer: text('huisnummer').notNull(),
  postcode: text('postcode').notNull(),
  gemeente: text('gemeente').notNull(),
  lng: real('lng'),
  lat: real('lat'),
  ploegLeden: text('ploegLeden'),
  plaats: text('plaats'),
  opgemaaktOp: integer('opgemaaktOp', { mode: 'timestamp' }).$default(() => new Date()),
  werkverantwoordelijkeNaam: text('werkverantwoordelijkeNaam'),
  werkverantwoordelijkeVoornaam: text('werkverantwoordelijkeVoornaam'),
  werkverantwoordelijkeHoedanigheid: text('werkverantwoordelijkeHoedanigheid'),
  werkverantwoordelijkeAannemer: text('werkverantwoordelijkeAannemer'),
  werkverantwoordelijkeHandtekening: jsonColumn('werkverantwoordelijkeHandtekening').$default(() => ({})),
  schakelbevoegdeNaam: text('schakelbevoegdeNaam'),
  schakelbevoegdeVoornaam: text('schakelbevoegdeVoornaam'),
  schakelbevoegdeHandtekening: jsonColumn('schakelbevoegdeHandtekening').$default(() => ({})),
  photos: jsonColumn('photos').$default(() => (null)),
  recipientEmail: text('recipientEmail').notNull(),
  emailStatus: text('emailStatus'),
  formPdfPath: text('formPdfPath'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
})