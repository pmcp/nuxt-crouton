// Content type checkers
export const isImage = (ct?: string) => ct?.startsWith('image/')
export const isVideo = (ct?: string) => ct?.startsWith('video/')
export const isAudio = (ct?: string) => ct?.startsWith('audio/')
export const isDocument = (ct?: string) =>
  ct === 'application/pdf'
  || ct?.includes('word')
  || ct?.includes('spreadsheet')
  || ct?.includes('presentation')

// File category (for filtering)
export const getFileCategory = (ct?: string): string => {
  if (isImage(ct)) return 'image'
  if (isVideo(ct)) return 'video'
  if (isAudio(ct)) return 'audio'
  if (isDocument(ct)) return 'document'
  return 'other'
}

// Icon mapping
export const getFileIcon = (ct?: string) => {
  if (isImage(ct)) return 'i-lucide-image'
  if (isVideo(ct)) return 'i-lucide-video'
  if (isAudio(ct)) return 'i-lucide-music'
  if (ct === 'application/pdf') return 'i-lucide-file-text'
  if (isDocument(ct)) return 'i-lucide-file-text'
  return 'i-lucide-file'
}

export const getIconColor = (ct?: string) => {
  if (isVideo(ct)) return 'text-purple-400'
  if (isAudio(ct)) return 'text-green-400'
  if (isDocument(ct)) return 'text-orange-400'
  return 'text-blue-400'
}

// File metadata helpers
export const getFileExtension = (filename?: string) => {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Base64 conversion
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const urlToBase64 = (url: string): Promise<string> =>
  fetch(url).then(r => r.blob()).then(b => new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(b)
  }))
