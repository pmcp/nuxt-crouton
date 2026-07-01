/**
 * useNodeFileUpload — uploads files to crouton-core's /api/upload-image endpoint.
 *
 * The endpoint accepts images, PDFs, video, and audio up to 10MB despite its name.
 * Returns metadata callers use to (a) insert markdown into a textarea and
 * (b) record the artifact on the parent node.
 *
 * Named "NodeFileUpload" to avoid collision with Nuxt UI 4's built-in
 * `useFileUpload` composable.
 */

export interface UploadedFile {
  url: string
  pathname: string
  filename: string
  contentType: string
  size: number
}

export function useNodeFileUpload() {
  const uploading = ref(false)
  const toast = useToast()

  async function uploadFile(file: File): Promise<UploadedFile | null> {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await $fetch<{
        pathname: string
        contentType: string
        size: number
        filename: string
      }>('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      return {
        url: `/images/${result.pathname}`,
        pathname: result.pathname,
        filename: result.filename,
        contentType: result.contentType,
        size: result.size,
      }
    }
    catch (e: any) {
      toast.add({
        title: 'Upload failed',
        description: e?.statusMessage || e?.message || 'Unknown error',
        color: 'error',
      })
      return null
    }
    finally {
      uploading.value = false
    }
  }

  return { uploadFile, uploading }
}

/**
 * Build a markdown snippet for an uploaded file.
 * Images render inline; other files render as links.
 */
export function uploadedFileToMarkdown(file: UploadedFile): string {
  const isImage = file.contentType.startsWith('image/')
  const label = file.filename.replace(/\.[^.]+$/, '')
  return isImage
    ? `![${label}](${file.url})`
    : `[${file.filename}](${file.url})`
}

/**
 * Insert text at the cursor position of a textarea, returning the new value
 * and the cursor offset to set after Vue updates the model.
 */
export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  insert: string,
): { value: string, cursor: number } {
  const start = textarea.selectionStart ?? currentValue.length
  const end = textarea.selectionEnd ?? currentValue.length
  // Add surrounding newlines for block-level inserts (images on their own line)
  const before = currentValue.slice(0, start)
  const after = currentValue.slice(end)
  const needsLeadingNewline = before.length > 0 && !before.endsWith('\n')
  const needsTrailingNewline = after.length > 0 && !after.startsWith('\n')
  const padded = `${needsLeadingNewline ? '\n' : ''}${insert}${needsTrailingNewline ? '\n' : ''}`
  const value = `${before}${padded}${after}`
  return { value, cursor: start + padded.length }
}
