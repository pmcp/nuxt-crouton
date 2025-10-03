export interface AssetMetadata {
  alt?: string
  filename?: string
}

export interface UploadAssetResult {
  id: string
  pathname: string
  filename: string
  contentType: string
  size: number
  alt?: string
}

export const useAssetUpload = () => {
  const route = useRoute()
  const uploading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Upload a file to blob storage and create an asset record
   * @param file - The file to upload
   * @param metadata - Optional metadata (alt text, custom filename)
   * @param collection - Collection name (defaults to 'assets')
   * @returns The created asset record
   */
  const uploadAsset = async (
    file: File,
    metadata: AssetMetadata = {},
    collection: string = 'assets'
  ): Promise<UploadAssetResult> => {
    uploading.value = true
    error.value = null

    try {
      // Step 1: Upload file to blob storage
      const formData = new FormData()
      formData.append('image', file)

      const pathname = await $fetch<string>('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      // Step 2: Create asset record in database
      const teamId = route.params.team as string
      if (!teamId) {
        throw new Error('Team ID not found in route')
      }

      const asset = await $fetch<UploadAssetResult>(`/api/teams/${teamId}/${collection}`, {
        method: 'POST',
        body: {
          filename: metadata.filename || file.name,
          pathname,
          contentType: file.type,
          size: file.size,
          alt: metadata.alt || '',
          uploadedAt: new Date()
        }
      })

      return asset
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Upload failed')
      throw error.value
    } finally {
      uploading.value = false
    }
  }

  /**
   * Upload multiple files in parallel
   * @param files - Array of files to upload
   * @param metadata - Metadata to apply to all files
   * @param collection - Collection name (defaults to 'assets')
   * @returns Array of created asset records
   */
  const uploadAssets = async (
    files: File[],
    metadata: AssetMetadata = {},
    collection: string = 'assets'
  ): Promise<UploadAssetResult[]> => {
    const uploads = files.map(file => uploadAsset(file, metadata, collection))
    return Promise.all(uploads)
  }

  return {
    uploadAsset,
    uploadAssets,
    uploading: readonly(uploading),
    error: readonly(error)
  }
}
