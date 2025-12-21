/**
 * GET /api/crouton/setup/stats
 *
 * Returns item counts for each registered collection.
 * Used by the SetupDashboard to show live database stats.
 */

// Declare hubDatabase as available from NuxtHub
declare const hubDatabase: () => { prepare: (sql: string) => { first: () => Promise<unknown> } }

export default defineEventHandler(async () => {
  // Get collections from the build-time injected crouton config
  const runtimeConfig = useRuntimeConfig()
  const publicConfig = (runtimeConfig.public || {}) as Record<string, unknown>
  const croutonConfig = publicConfig.croutonConfig as { collections?: Array<{ name: string }> } | undefined

  const stats: Record<string, { count: number }> = {}

  // If no crouton config, return empty stats
  if (!croutonConfig?.collections) {
    return { success: true, data: stats }
  }

  // Try to get database stats, but gracefully handle when db is unavailable
  for (const collectionDef of croutonConfig.collections) {
    const name = collectionDef.name
    try {
      // Derive table name from collection name (camelCase to snake_case)
      const tableName = camelToSnakeCase(name)

      // Try to get count from database
      const db = hubDatabase()
      const result = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first()
      stats[name] = { count: (result as { count: number } | null)?.count || 0 }
    } catch {
      // Database not available or table doesn't exist - return 0
      stats[name] = { count: 0 }
    }
  }

  return { success: true, data: stats }
})

/**
 * Convert camelCase to snake_case
 * e.g., 'blogPosts' -> 'blog_posts'
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}
