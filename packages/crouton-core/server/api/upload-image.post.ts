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

  // File extends Blob and has a name property; use it if available, otherwise generate one
  const fileName = (image as File).name || `upload-${Date.now()}.${image.type.split('/')[1] || 'bin'}`
  const file = await hubBlob().put(fileName, image, {
    addRandomSuffix: true
  })

  return file.pathname
})
