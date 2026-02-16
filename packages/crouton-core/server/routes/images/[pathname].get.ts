export default eventHandler(async (event) => {
  const { pathname } = event.context.params || {}
  if (!pathname) {
    throw createError({ status: 400, statusText: 'Pathname is required' })
  }

  // Set cache headers for edge caching (1 year, immutable since filenames have random suffixes)
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000, immutable'
  })

  return hubBlob().serve(event, pathname)
})
