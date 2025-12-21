/**
 * GET /api/crouton/setup/stats
 *
 * Returns item counts for each registered collection.
 * Used by the SetupDashboard to show live database stats.
 */

// Declare hubDatabase as available from NuxtHub
declare const hubDatabase: () => { prepare: (sql: string) => { first: () => Promise<unknown> } }

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
      // Try to get count from database
      const db = hubDatabase()
      const result = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first()
      stats[collectionKey] = { count: (result as { count: number } | null)?.count || 0 }
    } catch {
      // Database not available or table doesn't exist - return 0
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
