// NuxtHub blob utilities - auto-imported when using @nuxthub/core
declare function ensureBlob(blob: Blob, options: { maxSize: string, types: string[] }): void
declare function hubBlob(): { put: (name: string, blob: Blob, options?: { addRandomSuffix?: boolean }) => Promise<{ pathname: string }> }

export default defineEventHandler(async (event) => {
  const form = await readFormData(event)
  const image = form.get('image')

  if (!(image instanceof Blob)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image is required and must be a valid file'
    })
  }

  try {
    ensureBlob(image, {
      maxSize: '1MB',
      types: ['image/png', 'image/jpeg', 'image/webp']
    })
  } catch (error: unknown) {
    throw createError({
      statusCode: 400,
      statusMessage: (error as Error).message || (error as string)
    })
  }

  const file = await hubBlob().put(image.name, image, {
    addRandomSuffix: true
  })

  return file.pathname
})
