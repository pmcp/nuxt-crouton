// NuxtHub blob utilities - auto-imported when using @nuxthub/core
declare function hubBlob(): { serve: (event: any, pathname: string) => any }

export default eventHandler(async (event) => {
  const { pathname } = event.context.params || {}
  if (!pathname) {
    throw createError({ statusCode: 400, statusMessage: 'Pathname is required' })
  }
  return hubBlob().serve(event, pathname)
})
