/**
 * Server middleware that handles URL redirects.
 *
 * - Runs on every request
 * - Skips /api/, /admin/, /_nuxt/, /auth/ paths for performance
 * - Checks incoming path against active redirects
 * - Performs redirect with configured status code (301/302)
 * - Redirects are cached in memory and refreshed on CRUD operations
 */
import { getRedirectMap } from '../utils/redirectCache'

const SKIP_PREFIXES = ['/api/', '/admin/', '/_nuxt/', '/auth/', '/__nuxt']

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Skip internal paths for performance
  for (const prefix of SKIP_PREFIXES) {
    if (path.startsWith(prefix)) {
      return
    }
  }

  // Strip query string for matching (redirects are path-only)
  const pathWithoutQuery = path.split('?')[0]

  const redirectMap = await getRedirectMap()
  const redirect = redirectMap.get(pathWithoutQuery)

  if (redirect) {
    // Preserve query string on redirect
    const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
    return sendRedirect(event, redirect.toPath + query, Number(redirect.statusCode))
  }
})
