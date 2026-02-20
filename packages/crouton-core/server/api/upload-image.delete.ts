import { useNitroApp } from 'nitropack/runtime'

export default defineEventHandler(async (event) => {
  // Auth check - require authenticated user
  const session = await requireAuth(event)

  const { pathname } = await readBody<{ pathname: string }>(event)

  if (!pathname || typeof pathname !== 'string') {
    throw createError({
      status: 400,
      statusText: 'pathname is required'
    })
  }

  try {
    await blob.delete(pathname)

    const nitroApp = useNitroApp()
    nitroApp.hooks.callHook('crouton:operation', {
      type: 'asset:deleted',
      source: 'crouton-assets',
      userId: session.id,
      metadata: { pathname },
    }).catch(() => {})

    return { success: true, pathname }
  } catch (error: unknown) {
    throw createError({
      status: 500,
      statusText: `Failed to delete file: ${(error as Error).message}`
    })
  }
})
