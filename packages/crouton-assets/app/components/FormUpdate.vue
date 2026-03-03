<script setup lang="ts">
const props = defineProps<{
  item: Record<string, any>
  collection?: string
}>()

const emit = defineEmits<{ saved: [] }>()

const { update } = useCollectionMutation(props.collection || 'assets')
const { uploading } = useAssetUpload()
const saving = ref(false)
const state = ref({ alt: props.item.alt || '' })

const isImage = props.item.contentType?.startsWith('image/')
const generatingAlt = ref(false)
const { hasApp } = useCroutonApps()
const hasAI = hasApp('ai')

// Crop state
const cropMode = ref(false)
const cropFile = ref<File | null>(null)
const loadingCrop = ref(false)

// Track original pathname so user can revert after cropping
const originalPathname = ref<string>(props.item.pathname)
const currentPathname = ref<string>(props.item.pathname)
const isCropped = computed(() => currentPathname.value !== originalPathname.value)

const formatFileSize = (bytes: number): string => {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const fileToBase64 = (url: string): Promise<string> =>
  fetch(url).then(r => r.blob()).then(b => new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(b)
  }))

const generateAltText = async () => {
  if (!isImage || !props.item.pathname) return
  generatingAlt.value = true
  try {
    const image = await fileToBase64(`/images/${props.item.pathname}`)
    const { alt } = await $fetch<{ alt: string }>('/api/assets/generate-alt-text', {
      method: 'POST',
      body: { image, mimeType: props.item.contentType }
    })
    state.value.alt = alt
  }
  catch { /* ignore */ }
  finally { generatingAlt.value = false }
}

const startCrop = async () => {
  if (!props.item.pathname) return
  loadingCrop.value = true
  try {
    const res = await fetch(`/images/${currentPathname.value}`)
    const blob = await res.blob()
    const ext = props.item.filename?.split('.').pop() || 'jpg'
    cropFile.value = new File([blob], props.item.filename || `image.${ext}`, { type: props.item.contentType })
    cropMode.value = true
  }
  catch (e) {
    console.error('Failed to load image for crop', e)
  }
  finally {
    loadingCrop.value = false
  }
}

const handleCropConfirm = async (croppedFile: File) => {
  cropMode.value = false
  cropFile.value = null
  try {
    const formData = new FormData()
    formData.append('file', croppedFile)
    const uploadResult = await $fetch<{ pathname: string, size: number }>('/api/upload-image', {
      method: 'POST',
      body: formData
    })
    await update(props.item.id, {
      pathname: uploadResult.pathname,
      size: uploadResult.size
    })
    currentPathname.value = uploadResult.pathname
  }
  catch (e) {
    console.error('Crop upload failed', e)
  }
}

const handleCropCancel = () => {
  cropMode.value = false
  cropFile.value = null
}

const handleRevert = async () => {
  saving.value = true
  try {
    await update(props.item.id, { pathname: originalPathname.value })
    currentPathname.value = originalPathname.value
    emit('saved')
  }
  finally {
    saving.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await update(props.item.id, { alt: state.value.alt })
    emit('saved')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Inline crop view -->
    <div
      v-if="cropMode && cropFile"
      class="p-4"
    >
      <CroutonImageCropper
        :file="cropFile"
        @confirm="handleCropConfirm"
        @cancel="handleCropCancel"
      />
    </div>

    <!-- Normal view -->
    <template v-else>
      <!-- Image hero -->
      <div
        v-if="isImage && item.pathname"
        class="relative w-full bg-neutral-950 overflow-hidden group"
        style="max-height: 280px;"
      >
        <img
          :src="`/images/${currentPathname}`"
          :alt="item.alt || item.filename"
          class="w-full object-contain"
          style="max-height: 280px;"
        >
        <!-- Action buttons -->
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton
            v-if="isCropped"
            :loading="saving"
            icon="i-lucide-undo-2"
            size="xs"
            color="neutral"
            variant="solid"
            @click="handleRevert"
          />
          <UButton
            :loading="loadingCrop"
            icon="i-lucide-crop"
            size="xs"
            color="neutral"
            variant="solid"
            @click="startCrop"
          />
        </div>
        <!-- Gradient overlay with file info -->
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
          <p class="text-sm font-medium text-white truncate leading-tight">
            {{ item.filename }}
          </p>
          <p class="text-xs text-white/60 mt-0.5">
            {{ item.contentType }}
            <template v-if="item.size">· {{ formatFileSize(item.size) }}</template>
            <template v-if="item.width && item.height">· {{ item.width }}×{{ item.height }}</template>
          </p>
        </div>
      </div>

      <!-- Non-image file header -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-2 py-8 bg-neutral-50 dark:bg-neutral-900"
      >
        <UIcon name="i-lucide-file" class="size-10 text-neutral-400" />
        <div class="text-center">
          <p class="text-sm font-medium truncate max-w-xs">{{ item.filename }}</p>
          <p class="text-xs text-neutral-500 mt-0.5">
            {{ item.contentType }}
            <template v-if="item.size">· {{ formatFileSize(item.size) }}</template>
          </p>
        </div>
      </div>

      <!-- Form -->
      <div class="p-4 space-y-4">
        <UFormField
          v-if="isImage"
          label="Alt Text"
          name="alt"
          description="Describe the image for screen readers and SEO"
        >
          <div class="flex gap-2 mt-1">
            <UInput
              v-model="state.alt"
              placeholder="A person riding a bicycle on a city street…"
              class="flex-1"
            />
            <UTooltip v-if="hasAI" text="Generate with AI" :delay-duration="0">
              <UButton
                :loading="generatingAlt"
                variant="ghost"
                color="primary"
                icon="i-lucide-sparkles"
                @click="generateAltText"
              />
            </UTooltip>
          </div>
        </UFormField>

        <UButton :loading="saving || uploading" block @click="handleSave">
          Save
        </UButton>
      </div>
    </template>
  </div>
</template>
