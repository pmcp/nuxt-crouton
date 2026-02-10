// Generator for database queries
import { toKebabCase, pascal } from '../utils/helpers.mjs'

// Helper to generate tree-specific queries when hierarchy is enabled
function generateTreeQueries(data, tableName, prefixedPascalCase, prefixedPascalCasePlural, camelCasePlural, singular) {
  const hierarchy = data.hierarchy
  if (!hierarchy || !hierarchy.enabled) {
    return ''
  }

  // Get field names with defaults
  const parentField = hierarchy.parentField || 'parentId'
  const pathField = hierarchy.pathField || 'path'
  const depthField = hierarchy.depthField || 'depth'
  const orderField = hierarchy.orderField || 'order'

  // Note: Type assertions (as any) are used throughout to handle drizzle-orm version mismatches
  // that can occur in monorepo setups. This is a pragmatic solution that allows the generated
  // code to work across different drizzle-orm versions.

  return `

// Tree hierarchy queries (auto-generated when hierarchy: true)
// Type: ${prefixedPascalCase} with hierarchy fields

interface TreeItem {
  id: string
  ${pathField}: string
  ${depthField}: number
  ${orderField}: number
  [key: string]: any
}

export async function getTreeData${prefixedPascalCasePlural}(teamId: string) {
  const db = useDB()

  const ${camelCasePlural} = await (db as any)
    .select()
    .from(tables.${tableName})
    .where(eq(tables.${tableName}.teamId, teamId))
    .orderBy(tables.${tableName}.${pathField}, tables.${tableName}.${orderField})

  return ${camelCasePlural} as TreeItem[]
}

export async function updatePosition${prefixedPascalCase}(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await (db as any)
    .select()
    .from(tables.${tableName})
    .where(
      and(
        eq(tables.${tableName}.id, id),
        eq(tables.${tableName}.teamId, teamId)
      )
    ) as TreeItem[]

  if (!current) {
    throw createError({
      status: 404,
      statusText: '${prefixedPascalCase} not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await (db as any)
      .select()
      .from(tables.${tableName})
      .where(
        and(
          eq(tables.${tableName}.id, newParentId),
          eq(tables.${tableName}.teamId, teamId)
        )
      ) as TreeItem[]

    if (!parent) {
      throw createError({
        status: 400,
        statusText: 'Parent ${prefixedPascalCase} not found'
      })
    }

    // Prevent moving item to its own descendant
    if (parent.${pathField}.startsWith(current.${pathField})) {
      throw createError({
        status: 400,
        statusText: 'Cannot move item to its own descendant'
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
  const [updated] = await (db as any)
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
    const descendants = await (db as any)
      .select()
      .from(tables.${tableName})
      .where(
        and(
          eq(tables.${tableName}.teamId, teamId),
          sql\`\${tables.${tableName}.${pathField}} LIKE \${oldPath + '%'} AND \${tables.${tableName}.id} != \${id}\`
        )
      ) as TreeItem[]

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.${pathField}.replace(oldPath, newPath)
      const depthDiff = newDepth - current.${depthField}

      await (db as any)
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
    const [updated] = await (db as any)
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
      (db as any)
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

// Helper to detect JSON/repeater fields that need post-query parsing
// These fields are stored as JSON strings in SQLite but need to be parsed arrays/objects
function detectJsonFields(data) {
  const jsonFields = []

  if (data.fields) {
    data.fields.forEach((field) => {
      if (field.type === 'repeater' || field.type === 'json') {
        jsonFields.push({
          fieldName: field.name,
          fieldType: field.type,
          // repeater fields should default to [], json fields to null
          defaultValue: field.type === 'repeater' ? '[]' : 'null'
        })
      }
    })
  }

  return jsonFields
}

// Helper to detect reference fields that need LEFT JOINs or post-query processing
function detectReferenceFields(data, config) {
  const singleReferences = [] // For leftJoin
  const arrayReferences = [] // For post-query processing

  // Check custom fields for refTarget
  if (data.fields) {
    data.fields.forEach((field) => {
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

  // Add standard team/metadata user references
  // These are always single references
  // Team fields are always required (all generated endpoints use @crouton/auth)
  const useMetadata = config?.flags?.useMetadata ?? true

  // owner is always included (required for @crouton/auth)
  singleReferences.push({
    fieldName: 'owner',
    targetCollection: 'users',
    isExternal: true,
    isUserReference: true
  })

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
  const { singular, camelCase, camelCasePlural, plural, pascalCase, pascalCasePlural, layer, layerPascalCase } = data
  // Use layer-prefixed table name to match schema export
  // Convert layer to camelCase to ensure valid JavaScript identifier
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  // Use pascalCasePlural which properly handles hyphens (e.g., email-templates -> EmailTemplates)
  const tableName = `${layerCamelCase}${pascalCasePlural}`
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const typesPath = '../../types'

  // Detect reference fields for LEFT JOINs and post-query processing
  const { singleReferences, arrayReferences } = detectReferenceFields(data, config)

  // Generate imports for referenced schemas
  let schemaImports = ''
  const allReferences = [...singleReferences, ...arrayReferences]
  const uniqueCollections = [...new Set(allReferences.map(r => r.targetCollection))]

  uniqueCollections.forEach((collection) => {
    // Get any reference to this collection to check if external
    const ref = allReferences.find(r => r.targetCollection === collection)

    if (ref && ref.isExternal) {
      // External reference - import from main project schema
      // Note: Better Auth exports 'user' (singular), so map 'users' -> 'user'
      // NuxtHub v0.10+ expects schema at server/db/schema.ts
      const schemaExportName = collection === 'users' ? 'user' : collection
      schemaImports += `import { ${schemaExportName} } from '~~/server/db/schema'
`
    } else {
      // Local layer collection - import from sibling directory
      // Folder names are lowercased plural (e.g., flowInputs -> flowinputs)
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

    singleReferences.forEach((ref) => {
      const collectionIdentifier = ref.targetCollection

      // For external refs, use table name as-is (no layer prefix)
      // For local refs, add the layer prefix with PascalCase collection name
      // e.g., app + emailTemplates -> appEmailTemplates
      const refTableName = ref.isExternal
        ? collectionIdentifier
        : `${layerCamelCase}${pascal(collectionIdentifier)}`

      if (ref.isUserReference) {
        // Special user reference handling
        const aliasName = `${ref.fieldName}User`
        userAliases.push({ fieldName: ref.fieldName, aliasName })

        // Note: Better Auth user table uses 'image' not 'avatarUrl'
        selectFields.push(`${ref.fieldName}User: {
        id: ${aliasName}.id,
        name: ${aliasName}.name,
        email: ${aliasName}.email,
        image: ${aliasName}.image
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
    // Note: Better Auth exports 'user' (singular), not 'users'
    // Type assertion needed due to drizzle-orm type strictness with re-exported tables
    if (userAliases.length > 0) {
      const aliasDefs = userAliases.map(({ aliasName }) =>
        `  const ${aliasName} = alias(user as any, '${aliasName}')`
      ).join('\n')
      aliasDefinitions = `\n${aliasDefs}\n`
    }

    selectClause = `{
      ${selectFields.join(',\n      ')}
    }`
  }

  // Detect JSON/repeater fields that need parsing
  const jsonFields = detectJsonFields(data)

  // Generate post-query processing code for JSON fields (repeater, json types)
  // These fields come back as strings from SQLite and need to be parsed
  let jsonFieldProcessing = ''
  if (jsonFields.length > 0) {
    const fieldParsers = jsonFields.map(field => `
      // Parse ${field.fieldName} from JSON string
      if (typeof item.${field.fieldName} === 'string') {
        try {
          item.${field.fieldName} = JSON.parse(item.${field.fieldName})
        } catch (e) {
          console.error('Error parsing ${field.fieldName}:', e)
          item.${field.fieldName} = ${field.defaultValue}
        }
      }
      if (item.${field.fieldName} === null || item.${field.fieldName} === undefined) {
        item.${field.fieldName} = ${field.defaultValue}
      }`).join('')

    jsonFieldProcessing = `
  // Post-query processing for JSON fields (repeater/json types)
  ${camelCasePlural}.forEach((item: any) => {${fieldParsers}
  })
`
  }

  // Generate post-query processing code for array references
  let postQueryProcessing = ''
  if (arrayReferences.length > 0) {
    // Group array references by target collection for efficient querying
    const refsByCollection = {}
    arrayReferences.forEach((ref) => {
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
      const tableReference = ref.isExternal
        ? collectionIdentifier
        : `${collectionIdentifier}Schema.${layerCamelCase}${pascal(collectionIdentifier)}`

      // Use consistent PascalCase variable naming
      const collectionVarName = pascal(collectionIdentifier)

      // Build the ID collection logic for all fields referencing this collection
      const idCollectionCode = refs.map(ref => `
    ${camelCasePlural}.forEach(item => {
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

      ${camelCasePlural}.forEach(item => {${mappingCode}
      })
    }`)
    })

    postQueryProcessing = `
  // Post-query processing for array references
  if (${camelCasePlural}.length > 0) {${processingBlocks.join('')}
  }
`
  }

  // Check if hierarchy or sortable is enabled for import modifications
  const hasHierarchy = data.hierarchy && data.hierarchy.enabled
  const hasSortable = data.sortable && data.sortable.enabled
  const sqlImport = hasHierarchy ? ', sql' : ''
  const ascImport = (hasHierarchy || hasSortable) ? ', asc' : ''
  const orderField = hasSortable ? (data.sortable.orderField || 'order') : 'order'
  const orderByClause = hasSortable
    ? `asc(tables.${tableName}.${orderField}), desc(tables.${tableName}.createdAt)`
    : `desc(tables.${tableName}.createdAt)`

  // Generate tree queries if hierarchy is enabled
  const treeQueries = generateTreeQueries(data, tableName, prefixedPascalCase, prefixedPascalCasePlural, camelCasePlural)

  // Generate sortable queries if sortable is enabled but hierarchy is not
  // (hierarchy already includes reorderSiblings, so we skip to avoid duplicate exports)
  const sortableQueries = hasHierarchy ? '' : generateSortableQueries(data, tableName, prefixedPascalCasePlural)

  return `// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc${ascImport}, inArray${sqlImport} } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ${prefixedPascalCase}, New${prefixedPascalCase} } from '${typesPath}'
${schemaImports}
export async function getAll${prefixedPascalCasePlural}(teamId: string) {
  const db = useDB()
${aliasDefinitions}
  const ${camelCasePlural} = await (db as any)
    .select(${selectClause ? `${selectClause} as any` : '()'})
    .from(tables.${tableName})${leftJoins}
    .where(eq(tables.${tableName}.teamId, teamId))
    .orderBy(${orderByClause})
${jsonFieldProcessing}${postQueryProcessing}
  return ${camelCasePlural}
}

export async function get${prefixedPascalCasePlural}ByIds(teamId: string, ${camelCase}Ids: string[]) {
  const db = useDB()
${aliasDefinitions}
  const ${camelCasePlural} = await (db as any)
    .select(${selectClause ? `${selectClause} as any` : '()'})
    .from(tables.${tableName})${leftJoins}
    .where(
      and(
        eq(tables.${tableName}.teamId, teamId),
        inArray(tables.${tableName}.id, ${camelCase}Ids)
      )
    )
    .orderBy(${orderByClause})
${jsonFieldProcessing}${postQueryProcessing}
  return ${camelCasePlural}
}

export async function create${prefixedPascalCase}(data: New${prefixedPascalCase}) {
  const db = useDB()

  const [${camelCase}] = await (db as any)
    .insert(tables.${tableName})
    .values(data)
    .returning()

  return ${camelCase}
}

export async function update${prefixedPascalCase}(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<${prefixedPascalCase}>
) {
  const db = useDB()

  const [${camelCase}] = await (db as any)
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

  if (!${camelCase}) {
    throw createError({
      status: 404,
      statusText: '${prefixedPascalCase} not found or unauthorized'
    })
  }

  return ${camelCase}
}

export async function delete${prefixedPascalCase}(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
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
      status: 404,
      statusText: '${prefixedPascalCase} not found or unauthorized'
    })
  }

  return { success: true }
}${treeQueries}${sortableQueries}`
}
