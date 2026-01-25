/**
 * @crouton-studio
 * Scan endpoint - discovers the host app's structure
 *
 * GET /api/_studio/scan
 *
 * Returns AppContext with:
 * - layers: All extended layers (local and packages)
 * - collections: Discovered collections with fields
 * - components: App-level components
 * - pages: App-level pages
 */

import { scanApp } from '../../utils/scanner'

export default defineEventHandler(async () => {
  const appRoot = process.cwd()

  try {
    const context = await scanApp(appRoot)

    return {
      success: true,
      data: context
    }
  }
  catch (error) {
    console.error('Error scanning app:', error)
    throw createError({
      status: 500,
      statusText: 'Failed to scan app',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
})
