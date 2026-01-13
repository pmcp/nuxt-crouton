/**
 * GET /api/schema-designer/packages
 *
 * Returns a list of available crouton packages with their summaries.
 * These packages can be added to projects in the schema designer.
 */

import { getPackageSummaries } from '../../../utils/package-registry'

export default defineEventHandler(async () => {
  try {
    const summaries = await getPackageSummaries()
    return summaries
  } catch (error) {
    console.error('Failed to load package summaries:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load package list'
    })
  }
})
