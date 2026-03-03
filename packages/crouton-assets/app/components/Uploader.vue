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
          {{ t('assets.uploader.cropImage') }}
        </h4>
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          :label="t('assets.uploader.skipCrop')"
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
      <!-- Multi-language alt text -->
      <template v-if="hasMultipleLocales">
        <UFormField
          :label="t('assets.uploader.altText')"
          name="alt"
        >
          <div class="flex items-start gap-2">
            <div class="flex-1">
              <CroutonI18nInput
                v-model="metadata.translations"
                :fields="['alt']"
                :default-values="{ alt: metadata.alt }"
                show-ai-translate
                field-type="alt-text"
                @update:english="({ value }: { field: string, value: string }) => { metadata.alt = value }"
              />
            </div>
            <UTooltip
              v-if="hasAI && isImageFile(selectedFile!)"
              :text="t('assets.uploader.generateAltText')"
              :delay-duration="0"
            >
              <UButton
                :loading="generatingAlt"
                :disabled="generatingAlt"
                variant="ghost"
                color="primary"
                icon="i-lucide-sparkles"
                size="lg"
                class="mt-1"
                @click="generateAltText"
              />
            </UTooltip>
          </div>
        </UFormField>
      </template>

      <!-- Single-language alt text -->
      <UFormField
        v-else
        :label="t('assets.uploader.altText')"
        name="alt"
      >
        <div class="flex gap-2">
          <UInput
            v-model="metadata.alt"
            :placeholder="t('assets.uploader.altTextPlaceholder')"
            size="lg"
            class="flex-1"
          />
          <UTooltip
            v-if="hasAI && isImageFile(selectedFile!)"
            :text="t('assets.uploader.generateAltText')"
            :delay-duration="0"
          >
            <UButton
              :loading="generatingAlt"
              :disabled="generatingAlt"
              variant="ghost"
              color="primary"
              icon="i-lucide-sparkles"
              size="lg"
              @click="generateAltText"
            />
          </UTooltip>
        </div>
      </UFormField>

      <div class="text-sm text-gray-500 space-y-1">
        <p><strong>{{ t('assets.uploader.filename') }}</strong> {{ selectedFile.name }}</p>
        <p><strong>{{ t('assets.uploader.size') }}</strong> {{ formatFileSize(selectedFile.size) }}</p>
        <p><strong>{{ t('assets.uploader.type') }}</strong> {{ selectedFile.type }}</p>
      </div>

      <UButton
        :loading="uploading"
        :disabled="!selectedFile || uploading"
        block
        @click="handleUpload"
      >
        {{ uploading ? t('assets.uploader.uploading') : t('assets.uploader.upload') }}
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

const { t } = useT()
const { uploadAsset, uploading } = useAssetUpload()
const { hasApp } = useCroutonApps()
const hasAI = hasApp('ai')

const { locales } = useI18n()
const hasMultipleLocales = computed(() => locales.value.length > 1)

const selectedFile = ref<File | null>(null)
const pendingFile = ref<File | null>(null)
const previewUrl = ref<string>()
const showCropStep = ref(false)
const metadata = ref<{ alt: string, translations: Record<string, { alt?: string }> }>({ alt: '', translations: {} })
const generatingAlt = ref(false)

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const generateAltText = async () => {
  if (!selectedFile.value || !isImageFile(selectedFile.value)) return

  generatingAlt.value = true
  try {
    const image = await fileToBase64(selectedFile.value)
    const { alt } = await $fetch<{ alt: string }>('/api/assets/generate-alt-text', {
      method: 'POST',
      body: { image, mimeType: selectedFile.value.type }
    })
    metadata.value.alt = alt
    // Also set the English translation so CroutonI18nInput picks it up
    if (hasMultipleLocales.value) {
      metadata.value.translations = {
        ...metadata.value.translations,
        en: { ...metadata.value.translations?.en, alt },
      }
    }
  }
  catch (error) {
    console.error('Failed to generate alt text:', error)
  }
  finally {
    generatingAlt.value = false
  }
}

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
    metadata.value = { alt: '', translations: {} }
  }
}

const handleCropConfirm = (croppedFile: File) => {
  selectedFile.value = croppedFile
  pendingFile.value = null
  showCropStep.value = false
  metadata.value = { alt: '', translations: {} }
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
  metadata.value = { alt: '', translations: {} }
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
      {
        alt: metadata.value.alt,
        ...(hasMultipleLocales.value && { translations: metadata.value.translations }),
      },
      props.collection
    )

    // Reset state
    selectedFile.value = null
    previewUrl.value = undefined
    metadata.value = { alt: '', translations: {} }

    emit('uploaded', asset.id)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
</script>
