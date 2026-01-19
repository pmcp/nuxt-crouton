/**
 * GET /api/crouton/setup/stats
 *
 * Returns item counts for each registered collection.
 * Used by the SetupDashboard to show live database stats.
 */

import { sql } from 'drizzle-orm'

interface CroutonConfig {
  collections?: Array<{ name: string }>
  targets?: Array<{ layer: string; collections: string[] }>
}

export default defineEventHandler(async () => {
  // Get collections from the build-time injected crouton config
  const runtimeConfig = useRuntimeConfig()
  const publicConfig = (runtimeConfig.public || {}) as Record<string, unknown>
  const croutonConfig = publicConfig.croutonConfig as CroutonConfig | undefined

  const stats: Record<string, { count: number }> = {}

  // If no crouton config, return empty stats
  if (!croutonConfig?.collections || !croutonConfig?.targets) {
    return { success: true, data: stats }
  }

  // Build a map of collection name -> layer from targets
  const collectionLayerMap: Record<string, string> = {}
  for (const target of croutonConfig.targets) {
    for (const collectionName of target.collections) {
      collectionLayerMap[collectionName] = target.layer
    }
  }

  // Get database instance (NuxtHub auto-import)
  let db: ReturnType<typeof useDB> | null = null
  try {
    db = useDB()
  } catch {
    // Database not available, return empty stats
    return { success: true, data: stats }
  }

  // Try to get database stats, but gracefully handle when db is unavailable
  for (const collectionDef of croutonConfig.collections) {
    const name = collectionDef.name
    const layer = collectionLayerMap[name]

    if (!layer) {
      // Collection not assigned to any target layer, skip
      continue
    }

    // Generate the collection key that matches app.config.ts
    // e.g., layer="knowledge-base", collection="notes" -> "knowledgeBaseNotes"
    const layerCamelCase = toCamelCase(layer)
    const collectionPascalCase = toPascalCase(name)
    const collectionKey = `${layerCamelCase}${collectionPascalCase}`

    // Generate the database table name
    // e.g., layer="knowledge-base", collection="notes" -> "knowledge_base_notes"
    const tableName = `${toSnakeCase(layer)}_${toSnakeCase(name)}`

    try {
      // Use Drizzle's execute() for raw SQL query
      const result = await db.execute(
        sql`SELECT COUNT(*) as count FROM ${sql.raw(tableName)}`
      )
      // Result structure varies by driver, handle both array and object formats
      const rows = Array.isArray(result) ? result : (result as any).rows || []
      stats[collectionKey] = { count: rows[0]?.count || 0 }
    } catch {
      // Table doesn't exist or query failed - return 0
      stats[collectionKey] = { count: 0 }
    }
  }

  return { success: true, data: stats }
})

/**
 * Convert kebab-case or snake_case to camelCase
 * e.g., 'knowledge-base' -> 'knowledgeBase'
 */
function toCamelCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

/**
 * Convert to PascalCase (handles plural form)
 * e.g., 'notes' -> 'Notes', 'blogPosts' -> 'BlogPosts'
 */
function toPascalCase(str: string): string {
  // Handle already camelCase strings
  const words = str.split(/[-_]/)
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')
}

/**
 * Convert to snake_case
 * e.g., 'knowledge-base' -> 'knowledge_base', 'blogPosts' -> 'blog_posts'
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/-/g, '_') // Convert kebab-case to snake_case
    .replace(/([A-Z])/g, '_$1') // Insert underscore before capitals
    .toLowerCase()
    .replace(/^_/, '') // Remove leading underscore
}
