export default defineEventHandler(async (event) => {
  // Auth check - require authenticated user
  const session = await requireAuth(event)

  // Get upload constraints from runtime config
  const config = useRuntimeConfig(event)
  const uploadConfig = config.public?.croutonUpload || {}
  const maxSize = uploadConfig.maxSize || '10MB'
  const allowedTypes = uploadConfig.allowedTypes || [
    // Images
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif',
    // Documents
    'application/pdf',
    // Video
    'video/mp4', 'video/webm',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]

  const form = await readFormData(event)
  const file = form.get('image') || form.get('file')

  if (!(file instanceof Blob)) {
    throw createError({
      status: 400,
      statusText: 'File is required and must be a valid file'
    })
  }

  try {
    ensureBlob(file, {
      maxSize,
      types: allowedTypes
    })
  } catch (error: unknown) {
    throw createError({
      status: 400,
      statusText: (error as Error).message || (error as string)
    })
  }

  // File extends Blob and has a name property; use it if available, otherwise generate one
  const fileName = (file as File).name || `upload-${Date.now()}.${file.type.split('/')[1] || 'bin'}`
  const blob = await hubBlob().put(fileName, file, {
    addRandomSuffix: true
  })

  return {
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
    filename: fileName
  }
})
