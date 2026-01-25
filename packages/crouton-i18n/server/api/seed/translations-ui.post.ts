/**
 * POST /api/seed/translations-ui
 * Development-only endpoint for seeding system translations
 *
 * Body:
 * - keyPath: string (required)
 * - category: string (required)
 * - values: Record<string, string> (required)
 * - description: string (optional)
 * - namespace: string (optional, default 'ui')
 * - isOverrideable: boolean (optional, default true)
 */
import { createTranslation } from '../../utils/translationsQueries'

export default defineEventHandler(async (event) => {
  // Only allow in development mode
  if (!import.meta.dev) {
    throw createError({
      status: 403,
      statusText: 'Seed endpoint only available in development mode'
    })
  }

  const body = await readBody(event)

  // Validate required fields
  if (!body.keyPath || !body.category || !body.values) {
    throw createError({
      status: 400,
      statusText: 'Missing required fields: keyPath, category, values'
    })
  }

  try {
    // Create system translation (teamId = null)
    return await createTranslation({
      userId: 'seed-script',
      teamId: null, // System translation
      namespace: body.namespace || 'ui',
      keyPath: body.keyPath,
      category: body.category,
      values: body.values,
      description: body.description || null,
      isOverrideable: body.isOverrideable ?? true
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('UNIQUE constraint failed')) {
      throw createError({
        status: 409,
        statusText: 'A translation with this keyPath already exists'
      })
    }
    throw error
  }
})
