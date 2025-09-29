import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

/**
 * Team settings table for translation overrides
 * This table stores team-specific translation overrides that take precedence over system translations
 */
export const teamSettings = sqliteTable('team_settings', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),
  teamId: text('team_id')
    .notNull()
    .unique(),
  translations: text('translations', { mode: 'json' }).$type<{
    [locale: string]: {
      [key: string]: string
    }
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$default(
    () => new Date(),
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(
    () => new Date(),
  ),
})