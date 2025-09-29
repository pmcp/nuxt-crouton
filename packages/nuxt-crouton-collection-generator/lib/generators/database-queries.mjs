// Generator for database queries
import { getImportPath } from '../utils/paths.mjs'

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

  const typesPath = getImportPath('fromQueriesToTypes', { layerName: layer, collectionName: plural })

  return `import { eq, and, desc, inArray } from 'drizzle-orm'
import * as tables from '#${layer}/server/database/schema'
import type { ${prefixedPascalCase}, New${prefixedPascalCase} } from '${typesPath}'

export async function getAll${prefixedPascalCasePlural}(teamId: string) {
  const db = useDB()

  const ${plural} = await db
    .select()
    .from(tables.${tableName})
    .where(eq(tables.${tableName}.teamId, teamId))
    .orderBy(desc(tables.${tableName}.createdAt))

  return ${plural}
}

export async function get${prefixedPascalCasePlural}ByIds(teamId: string, ${singular}Ids: string[]) {
  const db = useDB()

  const ${plural} = await db
    .select()
    .from(tables.${tableName})
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
  ${singular}Id: string,
  teamId: string,
  userId: string,
  updates: Partial<${prefixedPascalCase}>
) {
  const db = useDB()

  const [${singular}] = await db
    .update(tables.${tableName})
    .set(updates)
    .where(
      and(
        eq(tables.${tableName}.id, ${singular}Id),
        eq(tables.${tableName}.teamId, teamId),
        eq(tables.${tableName}.userId, userId)
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
  ${singular}Id: string,
  teamId: string,
  userId: string
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.${tableName})
    .where(
      and(
        eq(tables.${tableName}.id, ${singular}Id),
        eq(tables.${tableName}.teamId, teamId),
        eq(tables.${tableName}.userId, userId)
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