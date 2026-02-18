export default defineEventHandler(async (event) => {
  // Auth check - require authenticated user
  await requireAuth(event)

  const { pathname } = await readBody<{ pathname: string }>(event)

  if (!pathname || typeof pathname !== 'string') {
    throw createError({
      status: 400,
      statusText: 'pathname is required'
    })
  }

  try {
    await blob.delete(pathname)
    return { success: true, pathname }
  } catch (error: unknown) {
    throw createError({
      status: 500,
      statusText: `Failed to delete file: ${(error as Error).message}`
    })
  }
})
