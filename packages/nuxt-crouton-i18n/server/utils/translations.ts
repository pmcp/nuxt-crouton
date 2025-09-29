import { sql } from 'drizzle-orm'

/**
 * Get a translated field with fallback to the main field
 * @param table - The database table
 * @param field - The field name to translate
 * @param locale - The locale to get translation for
 * @param fallbackToDefault - Whether to fallback to main field if translation doesn't exist
 */
export function getTranslatedField(
  table: any,
  field: string,
  locale: string,
  fallbackToDefault = true
) {
  if (fallbackToDefault) {
    return sql<string>`
      COALESCE(
        json_extract(${table.translations}, '$.' || ${locale} || '.' || ${field}),
        ${table[field]}
      )
    `.as(field)
  }
  
  return sql<string>`
    json_extract(${table.translations}, '$.' || ${locale} || '.' || ${field})
  `.as(field)
}

/**
 * Get multiple translated fields at once
 * @param table - The database table
 * @param fields - Array of field names to translate
 * @param locale - The locale to get translations for
 */
export function getTranslatedFields(
  table: any,
  fields: string[],
  locale: string
) {
  return fields.reduce((acc, field) => {
    acc[field] = getTranslatedField(table, field, locale)
    return acc
  }, {} as Record<string, any>)
}