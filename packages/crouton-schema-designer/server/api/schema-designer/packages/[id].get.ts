/**
 * GET /api/schema-designer/packages/[id]
 *
 * Returns the full manifest for a single crouton package.
 * Includes collections, configuration options, extension points, and provided resources.
 */

import { loadPackageManifest } from '../../../utils/package-registry'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Package ID is required'
    })
  }

  try {
    const manifest = await loadPackageManifest(id)

    if (!manifest) {
      throw createError({
        statusCode: 404,
        statusMessage: `Package "${id}" not found`
      })
    }

    return manifest
  } catch (error) {
    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error(`Failed to load manifest for ${id}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load package manifest'
    })
  }
})
