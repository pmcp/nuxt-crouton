// Generator for Drizzle schema
import { toSnakeCase } from '../utils/helpers.mjs'

export function generateSchema(data, dialect, config = null) {
  const { plural, layer, layerPascalCase, singular } = data
  // Use layer-prefixed name for the export to avoid conflicts
  // Convert layer to camelCase to ensure valid JavaScript identifier
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const exportName = `${layerCamelCase}${plural.charAt(0).toUpperCase() + plural.slice(1)}`
  
  // Check if this collection needs translations
  const needsTranslations = config?.translations?.collections?.[plural] || config?.translations?.collections?.[singular]
  const translatableFields = needsTranslations || []
  
  // Build translations field if needed
  let translationsField = ''
  let translationsImport = ''
  let translationsComment = ''
  
  if (needsTranslations && dialect === 'sqlite') {
    // Build TypeScript type for translations
    const typeFields = translatableFields.map(f => `      ${f}?: string`).join('\n')
    translationsField = `,\n  // Note: No indexes on translations - measure performance first\n  // Add indexes only if queries exceed 50ms with real data\n  translations: text('translations', { mode: 'json' }).$type<{\n    [locale: string]: {\n${typeFields}\n    }\n  }>()`
    
    translationsComment = `\n// Note: This collection has translatable fields: ${translatableFields.join(', ')}\n// Translations are stored in a JSON field without indexes for performance baseline`
  }
  
  const schemaFields = data.fields
    .filter(field => field.name !== 'id') // Filter out id field to avoid duplicates
    .map(field => {
    const nullable = field.meta?.required ? '.notNull()' : ''
    const unique = field.meta?.unique ? '.unique()' : ''
    
    if (dialect === 'sqlite') {
      // SQLite specific schema
      if (field.type === 'boolean') {
        return `  ${field.name}: integer('${field.name}', { mode: 'boolean' })${nullable}${unique}.$default(() => false)`
      } else if (field.type === 'number' || field.type === 'decimal') {
        return `  ${field.name}: ${field.type === 'decimal' ? 'real' : 'integer'}('${field.name}')${nullable}${unique}`
      } else if (field.type === 'date') {
        return `  ${field.name}: integer('${field.name}', { mode: 'timestamp' })${nullable}${unique}.$default(() => new Date())`
      } else if (field.type === 'json') {
        return `  ${field.name}: text('${field.name}', { mode: 'json' })${nullable}${unique}`
      } else {
        return `  ${field.name}: text('${field.name}')${nullable}${unique}`
      }
    } else {
      // PostgreSQL specific schema
      if (field.type === 'boolean') {
        return `  ${field.name}: boolean('${field.name}')${nullable}${unique}.$default(() => false)`
      } else if (field.type === 'number') {
        return `  ${field.name}: integer('${field.name}')${nullable}${unique}`
      } else if (field.type === 'decimal') {
        return `  ${field.name}: numeric('${field.name}')${nullable}${unique}`
      } else if (field.type === 'date') {
        return `  ${field.name}: timestamp('${field.name}', { withTimezone: true })${nullable}${unique}.$default(() => new Date())`
      } else if (field.type === 'json') {
        return `  ${field.name}: jsonb('${field.name}')${nullable}${unique}`
      } else if (field.type === 'text') {
        return `  ${field.name}: text('${field.name}')${nullable}${unique}`
      } else {
        const maxLength = field.meta?.maxLength
        if (maxLength) {
          return `  ${field.name}: varchar('${field.name}', { length: ${maxLength} })${nullable}${unique}`
        }
        return `  ${field.name}: text('${field.name}')${nullable}${unique}`
      }
    }
  }).join(',\n')

  const imports = dialect === 'sqlite' 
    ? `import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'`
    : `import { pgTable, varchar, text, integer, numeric, boolean, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core'`

  const tableFn = dialect === 'sqlite' ? 'sqliteTable' : 'pgTable'
  
  const idField = dialect === 'sqlite' 
    ? `  id: text('id').primaryKey().$default(() => nanoid())`
    : `  id: uuid('id').primaryKey().defaultRandom()`

  // Convert table name to snake_case for database
  const snakeCaseTableName = toSnakeCase(`${layer}_${plural}`)

  return `${imports}${translationsComment}

export const ${exportName} = ${tableFn}('${snakeCaseTableName}', {
${idField},
  teamId: text('teamId').notNull(),
  userId: text('userId').notNull(),
${schemaFields}${translationsField},
  createdAt: ${dialect === 'sqlite' ? "integer('createdAt', { mode: 'timestamp' })" : "timestamp('createdAt', { withTimezone: true })"}.notNull().$default(() => new Date()),
  updatedAt: ${dialect === 'sqlite' ? "integer('updatedAt', { mode: 'timestamp' })" : "timestamp('updatedAt', { withTimezone: true })"}.notNull().$onUpdate(() => new Date())
})`
}