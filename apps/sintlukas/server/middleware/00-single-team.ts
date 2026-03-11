/**
 * Single-Team URL Rewriter
 *
 * For single-team sites (like Sint-Lukas), rewrites root URLs to include
 * the team slug so the crouton-pages router can handle them.
 *
 * Uses sendRedirect for the root URL and internal rewrite for other paths.
 *
 * / → 302 redirect to /sintlukas/
 * /nl/aanbod → internal rewrite to /sintlukas/nl/aanbod
 */
const TEAM_SLUG = 'sintlukas'

const SKIP_PREFIXES = [
  '/api/',
  '/api?',
  '/_nuxt/',
  '/__nuxt',
  '/auth/',
  '/admin/',
  '/super-admin/',
  '/dashboard/',
  `/${TEAM_SLUG}/`,
  `/${TEAM_SLUG}?`,
]

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Skip if path already handled or starts with team slug
  if (path === `/${TEAM_SLUG}` || SKIP_PREFIXES.some(p => path.startsWith(p))) {
    return
  }

  // Skip static files (anything with a dot in the last segment)
  const lastSegment = path.split('/').pop() || ''
  if (lastSegment.includes('.')) {
    return
  }

  // For root URL, redirect straight to the default locale homepage
  if (path === '/') {
    return sendRedirect(event, `/${TEAM_SLUG}/nl/`, 302)
  }

  // For other paths (e.g., /nl/aanbod), rewrite internally
  const newPath = `/${TEAM_SLUG}${path}`
  event.node.req.url = newPath
  event._path = newPath
})
