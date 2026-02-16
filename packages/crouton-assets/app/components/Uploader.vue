<template>
  <div class="space-y-4">
    <!-- Step 1: File Upload -->
    <CroutonImageUpload
      v-if="!showCropStep"
      v-model="previewUrl"
      :crop="false"
      @file-selected="handleFileSelected"
    />

    <!-- Step 2: Optional Crop -->
    <div v-if="showCropStep && pendingFile">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium">
          Crop Image
        </h4>
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          label="Skip crop"
          @click="skipCrop"
        />
      </div>
      <CroutonImageCropper
        :file="pendingFile"
        :aspect-ratio="cropAspectRatio"
        @confirm="handleCropConfirm"
        @cancel="handleCropCancel"
      />
    </div>

    <!-- Step 3: Metadata Form -->
    <div
      v-if="selectedFile && !showCropStep"
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
type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2'

const props = defineProps<{
  collection?: string
  crop?: boolean | { aspectRatio?: number | AspectRatioPreset }
}>()

const emit = defineEmits<{
  uploaded: [assetId: string]
}>()

const { uploadAsset, uploading } = useAssetUpload()

const selectedFile = ref<File | null>(null)
const pendingFile = ref<File | null>(null)
const previewUrl = ref<string>()
const showCropStep = ref(false)
const metadata = ref({ alt: '' })

const cropEnabled = computed(() => {
  if (!props.crop) return false
  return true
})

const cropAspectRatio = computed(() => {
  if (typeof props.crop === 'object' && props.crop.aspectRatio) {
    return props.crop.aspectRatio
  }
  return undefined
})

const isImageFile = (file: File) => file.type.startsWith('image/')

const handleFileSelected = (file: File | null) => {
  if (!file) {
    selectedFile.value = null
    pendingFile.value = null
    return
  }

  if (cropEnabled.value && isImageFile(file)) {
    pendingFile.value = file
    showCropStep.value = true
  } else {
    selectedFile.value = file
    metadata.value.alt = ''
  }
}

const handleCropConfirm = (croppedFile: File) => {
  selectedFile.value = croppedFile
  pendingFile.value = null
  showCropStep.value = false
  metadata.value.alt = ''
}

const handleCropCancel = () => {
  pendingFile.value = null
  showCropStep.value = false
  previewUrl.value = undefined
}

const skipCrop = () => {
  if (pendingFile.value) {
    selectedFile.value = pendingFile.value
  }
  pendingFile.value = null
  showCropStep.value = false
  metadata.value.alt = ''
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

  try {
    const asset = await uploadAsset(
      selectedFile.value,
      { alt: metadata.value.alt },
      props.collection || 'assets'
    )

    // Reset state
    selectedFile.value = null
    previewUrl.value = undefined
    metadata.value.alt = ''

    emit('uploaded', asset.id)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
</script>
