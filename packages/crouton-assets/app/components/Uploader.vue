<template>
  <div class="space-y-4">
    <!-- File Upload -->
    <CroutonImageUpload
      v-model="previewUrl"
      @file-selected="handleFileSelected"
    />

    <!-- Metadata Form -->
    <div
      v-if="selectedFile"
      class="space-y-3"
    >
      <UFormField
        label="Alt Text"
        name="alt"
      >
        <UInput
          v-model="metadata.alt"
          placeholder="Describe the image for accessibility"
          size="lg"
        />
      </UFormField>

      <div class="text-sm text-gray-500 space-y-1">
        <p><strong>Filename:</strong> {{ selectedFile.name }}</p>
        <p><strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        <p><strong>Type:</strong> {{ selectedFile.type }}</p>
      </div>

      <UButton
        :loading="uploading"
        :disabled="!selectedFile || uploading"
        block
        @click="handleUpload"
      >
        {{ uploading ? 'Uploading...' : 'Upload Asset' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  collection?: string
}>()

const emit = defineEmits<{
  uploaded: [assetId: string]
}>()

const { getTeamId } = useTeamContext()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>()
const uploading = ref(false)
const metadata = ref({
  alt: ''
})

const collectionName = props.collection || 'assets'

const handleFileSelected = (file: File | null) => {
  selectedFile.value = file
  if (file) {
    metadata.value.alt = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const handleUpload = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    // Step 1: Upload file to blob storage
    const formData = new FormData()
    formData.append('image', selectedFile.value)

    const pathname = await $fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    })

    // Step 2: Create asset record in database
    const teamId = getTeamId()
    if (!teamId) {
      throw new Error('Team context not available')
    }
    const asset = await $fetch(`/api/teams/${teamId}/${collectionName}`, {
      method: 'POST',
      body: {
        filename: selectedFile.value.name,
        pathname,
        contentType: selectedFile.value.type,
        size: selectedFile.value.size,
        alt: metadata.value.alt || '',
        uploadedAt: new Date()
      }
    })

    // Reset and emit success
    selectedFile.value = null
    previewUrl.value = undefined
    metadata.value.alt = ''

    emit('uploaded', asset.id)
  } catch (error) {
    console.error('Upload failed:', error)
    // TODO: Show toast notification
  } finally {
    uploading.value = false
  }
}
</script>
