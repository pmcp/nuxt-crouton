// Generator for database queries

// Helper to generate tree-specific queries when hierarchy is enabled
function generateTreeQueries(data, tableName, prefixedPascalCase, prefixedPascalCasePlural, plural) {
  const hierarchy = data.hierarchy
  if (!hierarchy || !hierarchy.enabled) {
    return ''
  }

  // Get field names with defaults
  const parentField = hierarchy.parentField || 'parentId'
  const pathField = hierarchy.pathField || 'path'
  const depthField = hierarchy.depthField || 'depth'
  const orderField = hierarchy.orderField || 'order'

  return `

// Tree hierarchy queries (auto-generated when hierarchy: true)

export async function getTreeData${prefixedPascalCasePlural}(teamId: string) {
  const db = useDB()

  const ${plural} = await db
    .select()
    .from(tables.${tableName})
    .where(eq(tables.${tableName}.teamId, teamId))
    .orderBy(tables.${tableName}.${pathField}, tables.${tableName}.${orderField})

  return ${plural}
}

export async function updatePosition${prefixedPascalCase}(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await db
    .select()
    .from(tables.${tableName})
    .where(
      and(
        eq(tables.${tableName}.id, id),
        eq(tables.${tableName}.teamId, teamId)
      )
    )

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: '${prefixedPascalCase} not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await db
      .select()
      .from(tables.${tableName})
      .where(
        and(
          eq(tables.${tableName}.id, newParentId),
          eq(tables.${tableName}.teamId, teamId)
        )
      )

    if (!parent) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Parent ${prefixedPascalCase} not found'
      })
    }

    // Prevent moving item to its own descendant
    if (parent.${pathField}.startsWith(current.${pathField})) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot move item to its own descendant'
      })
    }

    newPath = \`\${parent.${pathField}}\${id}/\`
    newDepth = parent.${depthField} + 1
  } else {
    newPath = \`/\${id}/\`
    newDepth = 0
  }

  const oldPath = current.${pathField}

  // Update the item itself
  const [updated] = await db
    .update(tables.${tableName})
    .set({
      ${parentField}: newParentId,
      ${pathField}: newPath,
      ${depthField}: newDepth,
      ${orderField}: newOrder
    })
    .where(
      and(
        eq(tables.${tableName}.id, id),
        eq(tables.${tableName}.teamId, teamId)
      )
    )
    .returning()

  // Update all descendants' paths if the path changed
  if (oldPath !== newPath) {
    // Get all descendants
    const descendants = await db
      .select()
      .from(tables.${tableName})
      .where(
        and(
          eq(tables.${tableName}.teamId, teamId),
          sql\`\${tables.${tableName}.${pathField}} LIKE \${oldPath + '%'} AND \${tables.${tableName}.id} != \${id}\`
        )
      )

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.${pathField}.replace(oldPath, newPath)
      const depthDiff = newDepth - current.${depthField}

      await db
        .update(tables.${tableName})
        .set({
          ${pathField}: descendantNewPath,
          ${depthField}: descendant.${depthField} + depthDiff
        })
        .where(eq(tables.${tableName}.id, descendant.id))
    }
  }

  return updated
}

export async function reorderSiblings${prefixedPascalCasePlural}(
  teamId: string,
  updates: { id: string; ${orderField}: number }[]
) {
  const db = useDB()

  const results = []

  for (const update of updates) {
    const [updated] = await db
      .update(tables.${tableName})
      .set({ ${orderField}: update.${orderField} })
      .where(
        and(
          eq(tables.${tableName}.id, update.id),
          eq(tables.${tableName}.teamId, teamId)
        )
      )
      .returning()

    if (updated) {
      results.push(updated)
    }
  }

  return results
}`
}

// Helper to generate reorder-only queries when sortable is enabled (without full hierarchy)
function generateSortableQueries(data, tableName, prefixedPascalCasePlural) {
  const sortable = data.sortable
  if (!sortable || !sortable.enabled) {
    return ''
  }

  const orderField = sortable.orderField || 'order'

  return `

// Sortable reorder queries (auto-generated when sortable: true)

export async function reorderSiblings${prefixedPascalCasePlural}(
  teamId: string,
  updates: { id: string; ${orderField}: number }[]
) {
  const db = useDB()

  const results = await Promise.all(
    updates.map(({ id, ${orderField} }) =>
      db
        .update(tables.${tableName})
        .set({ ${orderField} })
        .where(
          and(
            eq(tables.${tableName}.id, id),
            eq(tables.${tableName}.teamId, teamId)
          )
        )
        .returning()
    )
  )

  return { success: true, updated: results.flat().length }
}`
}

// Helper to detect reference fields that need LEFT JOINs or post-query processing
function detectReferenceFields(data, config) {
  const singleReferences = []  // For leftJoin
  const arrayReferences = []   // For post-query processing

  // Check custom fields for refTarget
  if (data.fields) {
    data.fields.forEach(field => {
      if (field.refTarget) {
        const isExternal = field.refScope === 'external' || field.refScope === 'adapter'
        const refData = {
          fieldName: field.name,
          targetCollection: field.refTarget,
          isExternal: isExternal,
          isUserReference: isExternal && field.refTarget === 'users'
        }

        // Separate single references from array references
        if (field.type === 'array') {
          arrayReferences.push(refData)
        } else {
          singleReferences.push(refData)
        }
      }
    })
  }

  // Add standard team/metadata user references if enabled
  // These are always single references
  const useTeamUtility = config?.flags?.useTeamUtility ?? false
  const useMetadata = config?.flags?.useMetadata ?? true

  if (useTeamUtility) {
    // owner is the team-based user reference
    singleReferences.push({
      fieldName: 'owner',
      targetCollection: 'users',
      isExternal: true,
      isUserReference: true
    })
  }

  if (useMetadata) {
    singleReferences.push({
      fieldName: 'createdBy',
      targetCollection: 'users',
      isExternal: true,
      isUserReference: true
    })
    singleReferences.push({
      fieldName: 'updatedBy',
      targetCollection: 'users',
      isExternal: true,
      isUserReference: true
    })
  }

  return { singleReferences, arrayReferences }
}

export function generateQueries(data, config = null) {
  console.log('[database-queries.mjs] Running LATEST VERSION with array reference post-processing support')
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
  const typesPath = '../../types'

  // Detect reference fields for LEFT JOINs and post-query processing
  const { singleReferences, arrayReferences } = detectReferenceFields(data, config)

  // Generate imports for referenced schemas
  let schemaImports = ''
  const allReferences = [...singleReferences, ...arrayReferences]
  const uniqueCollections = [...new Set(allReferences.map(r => r.targetCollection))]

  uniqueCollections.forEach(collection => {
    // Get any reference to this collection to check if external
    const ref = allReferences.find(r => r.targetCollection === collection)

    if (ref && ref.isExternal) {
      // External reference - import from main project schema
      schemaImports += `import { ${collection} } from '~~/server/database/schema'
`
    } else {
      // Local layer collection - import from sibling directory
      // Use lowercase for folder path (folders are created as lowercase plural)
      schemaImports += `import * as ${collection}Schema from '../../../${collection.toLowerCase()}/server/database/schema'
`
    }
  })

  // Build SELECT clause with joins (only for single references)
  let selectClause = ''
  let leftJoins = ''
  let aliasDefinitions = ''

  if (singleReferences.length > 0) {
    // Build select fields
    const selectFields = [`...tables.${tableName}`]

    // Track how many times we join each table to create unique aliases
    const tableJoinCounts = {}
    const userAliases = []

    singleReferences.forEach(ref => {
      const collectionIdentifier = ref.targetCollection

      // For external refs, use table name as-is (no layer prefix)
      // For local refs, add the layer prefix
      // Convert collection to lowercase first to match folder/export naming
      const lowercaseCollection = collectionIdentifier.toLowerCase()
      const refTableName = ref.isExternal
        ? collectionIdentifier
        : `${layerCamelCase}${lowercaseCollection.charAt(0).toUpperCase() + lowercaseCollection.slice(1)}`

      if (ref.isUserReference) {
        // Special user reference handling
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
      } else if (ref.isExternal) {
        // External non-user reference - direct table import
        selectFields.push(`${ref.fieldName}Data: ${collectionIdentifier}`)
        leftJoins += `
    .leftJoin(${collectionIdentifier}, eq(tables.${tableName}.${ref.fieldName}, ${collectionIdentifier}.id))`
      } else {
        // Local layer reference - namespaced import
        selectFields.push(`${ref.fieldName}Data: ${collectionIdentifier}Schema.${refTableName}`)
        leftJoins += `
    .leftJoin(${collectionIdentifier}Schema.${refTableName}, eq(tables.${tableName}.${ref.fieldName}, ${collectionIdentifier}Schema.${refTableName}.id))`
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

  // Generate post-query processing code for array references
  let postQueryProcessing = ''
  if (arrayReferences.length > 0) {
    // Group array references by target collection for efficient querying
    const refsByCollection = {}
    arrayReferences.forEach(ref => {
      const collection = ref.targetCollection
      if (!refsByCollection[collection]) {
        refsByCollection[collection] = []
      }
      refsByCollection[collection].push(ref)
    })

    // Generate processing code for each target collection
    const processingBlocks = []
    Object.entries(refsByCollection).forEach(([collection, refs]) => {
      const ref = refsByCollection[collection][0] // Get reference metadata
      const collectionIdentifier = collection
      // Convert collection to lowercase first to match folder/export naming
      const lowercaseCollection = collectionIdentifier.toLowerCase()
      const tableReference = ref.isExternal
        ? collectionIdentifier
        : `${collectionIdentifier}Schema.${layerCamelCase}${lowercaseCollection.charAt(0).toUpperCase() + lowercaseCollection.slice(1)}`

      // Use consistent PascalCase variable naming based on lowercase collection
      const collectionVarName = lowercaseCollection.charAt(0).toUpperCase() + lowercaseCollection.slice(1)

      // Build the ID collection logic for all fields referencing this collection
      const idCollectionCode = refs.map(ref => `
    ${plural}.forEach(item => {
        if (item.${ref.fieldName}) {
          try {
            const ids = typeof item.${ref.fieldName} === 'string'
              ? JSON.parse(item.${ref.fieldName})
              : item.${ref.fieldName}
            if (Array.isArray(ids)) {
              ids.forEach(id => all${collectionVarName}Ids.add(id))
            }
          } catch (e) {
            // Handle parsing errors gracefully
            console.error('Error parsing ${ref.fieldName}:', e)
          }
        }
      })`).join('')

      // Build the mapping logic for all fields
      const mappingCode = refs.map(ref => `
        item.${ref.fieldName}Data = []
        if (item.${ref.fieldName}) {
          try {
            const ids = typeof item.${ref.fieldName} === 'string'
              ? JSON.parse(item.${ref.fieldName})
              : item.${ref.fieldName}
            if (Array.isArray(ids)) {
              item.${ref.fieldName}Data = related${collectionVarName}.filter(r => ids.includes(r.id))
            }
          } catch (e) {
            console.error('Error mapping ${ref.fieldName}:', e)
          }
        }`).join('')

      processingBlocks.push(`
    // Post-process array references to ${collection}
    const all${collectionVarName}Ids = new Set()${idCollectionCode}

    if (all${collectionVarName}Ids.size > 0) {
      const related${collectionVarName} = await db
        .select()
        .from(${tableReference})
        .where(inArray(${tableReference}.id, Array.from(all${collectionVarName}Ids)))

      ${plural}.forEach(item => {${mappingCode}
      })
    }`)
    })

    postQueryProcessing = `
  // Post-query processing for array references
  if (${plural}.length > 0) {${processingBlocks.join('')}
  }
`
  }

  // Check if hierarchy is enabled to add sql import
  const hasHierarchy = data.hierarchy && data.hierarchy.enabled
  const sqlImport = hasHierarchy ? ', sql' : ''

  // Generate tree queries if hierarchy is enabled
  const treeQueries = generateTreeQueries(data, tableName, prefixedPascalCase, prefixedPascalCasePlural, plural)

  // Generate sortable queries if sortable is enabled (but hierarchy is not)
  const sortableQueries = generateSortableQueries(data, tableName, prefixedPascalCasePlural)

  return `// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray${sqlImport} } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ${prefixedPascalCase}, New${prefixedPascalCase} } from '${typesPath}'
${schemaImports}
export async function getAll${prefixedPascalCasePlural}(teamId: string) {
  const db = useDB()
${aliasDefinitions}
  // @ts-expect-error Complex select with joins requires type assertion
  const ${plural} = await db
    .select(${selectClause || '()'})
    .from(tables.${tableName})${leftJoins}
    .where(eq(tables.${tableName}.teamId, teamId))
    .orderBy(desc(tables.${tableName}.createdAt))
${postQueryProcessing}
  return ${plural}
}

export async function get${prefixedPascalCasePlural}ByIds(teamId: string, ${singular}Ids: string[]) {
  const db = useDB()
${aliasDefinitions}
  // @ts-expect-error Complex select with joins requires type assertion
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
${postQueryProcessing}
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
}${treeQueries}${sortableQueries}`
}
