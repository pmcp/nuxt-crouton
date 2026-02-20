import { useNitroApp } from 'nitropack/runtime'

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
  const startTime = Date.now()
  const blobObject = await blob.put(fileName, file, {
    addRandomSuffix: true
  }).catch((err: unknown) => {
    throw createError({
      status: 500,
      statusText: `Blob storage error: ${(err as Error).message ?? String(err)}`
    })
  })
  const duration = Date.now() - startTime

  const nitroApp = useNitroApp()
  nitroApp.hooks.callHook('crouton:operation', {
    type: 'asset:uploaded',
    source: 'crouton-assets',
    userId: session.id,
    metadata: {
      filename: fileName,
      mimeType: file.type,
      fileSize: file.size,
      pathname: blobObject.pathname,
      duration,
    },
  }).catch(() => {})

  return {
    pathname: blobObject.pathname,
    contentType: file.type,
    size: file.size,
    filename: fileName
  }
})
