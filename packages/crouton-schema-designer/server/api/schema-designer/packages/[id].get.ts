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
      status: 400,
      statusText: 'Package ID is required'
    })
  }

  try {
    const manifest = await loadPackageManifest(id)

    if (!manifest) {
      throw createError({
        status: 404,
        statusText: `Package "${id}" not found`
      })
    }

    return manifest
  } catch (error) {
    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'status' in error) {
      throw error
    }

    console.error(`Failed to load manifest for ${id}:`, error)
    throw createError({
      status: 500,
      statusText: 'Failed to load package manifest'
    })
  }
})
