// Generator for database queries

// Helper to detect reference fields that need LEFT JOINs
function detectReferenceFields(data, config) {
  const references = []

  // Check custom fields for refTarget
  if (data.fields) {
    data.fields.forEach(field => {
      if (field.refTarget) {
        references.push({
          fieldName: field.name,
          targetCollection: field.refTarget,
          isUserReference: field.refTarget === 'users'
        })
      }
    })
  }

  // Add standard team/metadata user references if enabled
  const useTeamUtility = config?.flags?.useTeamUtility ?? false
  const useMetadata = config?.flags?.useMetadata ?? true

  if (useTeamUtility) {
    // owner is the team-based user reference
    references.push({
      fieldName: 'owner',
      targetCollection: 'users',
      isUserReference: true
    })
  }

  if (useMetadata) {
    references.push({
      fieldName: 'createdBy',
      targetCollection: 'users',
      isUserReference: true
    })
    references.push({
      fieldName: 'updatedBy',
      targetCollection: 'users',
      isUserReference: true
    })
  }

  return references
}

export function generateQueries(data, config = null) {
  const { singular, plural, pascalCase, pascalCasePlural, layer, layerPascalCase } = data
  // Use layer-prefixed table name to match schema export
  // Convert layer to camelCase to ensure valid JavaScript identifier
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const tableName = `${layerCamelCase}${plural.charAt(0).toUpperCase() + plural.slice(1)}`
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const typesPath = './types'

  // Detect reference fields for LEFT JOINs
  const references = detectReferenceFields(data, config)

  // Generate imports for referenced schemas
  let schemaImports = ''
  const uniqueCollections = [...new Set(references.map(r => r.targetCollection))]

  uniqueCollections.forEach(collection => {
    if (collection === 'users') {
      // Users schema is in the main project - use Nuxt root alias
      schemaImports += `import { users } from '~~/server/database/schema'
`
    } else {
      // Other collections are in sibling directories within the same layer
      // Path: from collections/[current]/server/database/ up to collections/, then to [target]/server/database/
      schemaImports += `import * as ${collection}Schema from '../../../${collection}/server/database/schema'
`
    }
  })

  // Build SELECT clause with joins
  let selectClause = ''
  let leftJoins = ''
  let aliasDefinitions = ''

  if (references.length > 0) {
    // Build select fields
    const selectFields = [`...tables.${tableName}`]

    // Track how many times we join each table to create unique aliases
    const tableJoinCounts = {}
    const userAliases = []

    references.forEach(ref => {
      const refTableName = `${layerCamelCase}${ref.targetCollection.charAt(0).toUpperCase() + ref.targetCollection.slice(1)}`

      if (ref.isUserReference) {
        // Create unique alias for each user reference
        const aliasName = `${ref.fieldName}Users`
        userAliases.push({ fieldName: ref.fieldName, aliasName })

        selectFields.push(`${ref.fieldName}User: {
        id: ${aliasName}.id,
        name: ${aliasName}.name,
        email: ${aliasName}.email,
        avatarUrl: ${aliasName}.avatarUrl
      }`)
        leftJoins += `
    .leftJoin(${aliasName}, eq(tables.${tableName}.${ref.fieldName}, ${aliasName}.id))`
      } else {
        selectFields.push(`${ref.fieldName}Data: ${ref.targetCollection}Schema.${refTableName}`)
        leftJoins += `
    .leftJoin(${ref.targetCollection}Schema.${refTableName}, eq(tables.${tableName}.${ref.fieldName}, ${ref.targetCollection}Schema.${refTableName}.id))`
      }
    })

    // Generate alias definitions for user references
    if (userAliases.length > 0) {
      const aliasDefs = userAliases.map(({ aliasName }) =>
        `  const ${aliasName} = alias(users, '${aliasName}')`
      ).join('\n')
      aliasDefinitions = `\n${aliasDefs}\n`
    }

    selectClause = `{
      ${selectFields.join(',\n      ')}
    }`
  }

  return `import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ${prefixedPascalCase}, New${prefixedPascalCase} } from '${typesPath}'
${schemaImports}
export async function getAll${prefixedPascalCasePlural}(teamId: string) {
  const db = useDB()
${aliasDefinitions}
  const ${plural} = await db
    .select(${selectClause || '()'})
    .from(tables.${tableName})${leftJoins}
    .where(eq(tables.${tableName}.teamId, teamId))
    .orderBy(desc(tables.${tableName}.createdAt))

  return ${plural}
}

export async function get${prefixedPascalCasePlural}ByIds(teamId: string, ${singular}Ids: string[]) {
  const db = useDB()
${aliasDefinitions}
  const ${plural} = await db
    .select(${selectClause || '()'})
    .from(tables.${tableName})${leftJoins}
    .where(
      and(
        eq(tables.${tableName}.teamId, teamId),
        inArray(tables.${tableName}.id, ${singular}Ids)
      )
    )
    .orderBy(desc(tables.${tableName}.createdAt))

  return ${plural}
}

export async function create${prefixedPascalCase}(data: New${prefixedPascalCase}) {
  const db = useDB()

  const [${singular}] = await db
    .insert(tables.${tableName})
    .values(data)
    .returning()

  return ${singular}
}

export async function update${prefixedPascalCase}(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<${prefixedPascalCase}>
) {
  const db = useDB()

  const [${singular}] = await db
    .update(tables.${tableName})
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.${tableName}.id, recordId),
        eq(tables.${tableName}.teamId, teamId),
        eq(tables.${tableName}.owner, ownerId)
      )
    )
    .returning()

  if (!${singular}) {
    throw createError({
      statusCode: 404,
      statusMessage: '${prefixedPascalCase} not found or unauthorized'
    })
  }

  return ${singular}
}

export async function delete${prefixedPascalCase}(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.${tableName})
    .where(
      and(
        eq(tables.${tableName}.id, recordId),
        eq(tables.${tableName}.teamId, teamId),
        eq(tables.${tableName}.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: '${prefixedPascalCase} not found or unauthorized'
    })
  }

  return { success: true }
}`
}
