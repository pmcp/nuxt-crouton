<script setup lang="ts">
/**
 * Image property editor for block editor.
 * Three modes: browse assets (if crouton-assets installed), upload new, paste URL.
 * Follows LinksEditor.vue pattern with modelValue + update:modelValue.
 * Emits update:alt when an asset with alt text is picked from the library.
 */
interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:alt': [value: string]
}>()

// Detect if crouton-assets is installed via the croutonApps registry
const { hasApp } = useCroutonApps()
const hasAssetsPicker = hasApp('assets')

type Mode = 'preview' | 'url' | 'upload' | 'browse'
const mode = ref<Mode>(hasAssetsPicker && !props.modelValue ? 'browse' : 'preview')
const urlInput = ref(props.modelValue || '')

// Sync local URL with props
watch(() => props.modelValue, (val) => {
  urlInput.value = val || ''
})

const hasImage = computed(() => !!props.modelValue)

function setUrl() {
  emit('update:modelValue', urlInput.value)
  mode.value = 'preview'
}

function removeImage() {
  emit('update:modelValue', '')
  urlInput.value = ''
  mode.value = hasAssetsPicker ? 'browse' : 'preview'
}

function handleFileSelected(file: File | null) {
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  $fetch<{ pathname: string }>('/api/upload-image', {
    method: 'POST',
    body: formData
  }).then((result) => {
    const imageUrl = `/images/${result.pathname}`
    emit('update:modelValue', imageUrl)
    urlInput.value = imageUrl
    mode.value = 'preview'
  }).catch((err) => {
    console.error('Image upload failed:', err)
  })
}

function handleAssetSelected(asset: Record<string, any>) {
  const url = `/images/${asset.pathname}`
  emit('update:modelValue', url)
  urlInput.value = url
  if (asset.alt) {
    emit('update:alt', asset.alt)
  }
  mode.value = 'preview'
}
</script>

<template>
  <div class="space-y-3">
    <!-- Image Preview -->
    <div v-if="hasImage && mode === 'preview'" class="space-y-2">
      <div class="relative rounded-lg overflow-hidden border border-default">
        <img
          :src="modelValue"
          alt="Preview"
          class="w-full max-h-48 object-cover"
        >
        <div class="absolute top-2 right-2 flex gap-1">
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="solid"
            size="xs"
            @click="mode = 'url'"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="solid"
            size="xs"
            @click="removeImage"
          />
        </div>
      </div>
    </div>

    <!-- No Image State — Browse tab shown first if available -->
    <div v-if="!hasImage && mode === 'preview'" class="flex flex-col gap-2">
      <div class="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-default bg-neutral-50 dark:bg-neutral-900">
        <div class="text-center">
          <UIcon name="i-lucide-image" class="size-8 text-neutral-400 mb-2" />
          <p class="text-sm text-neutral-500">
            No image set
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="hasAssetsPicker"
          icon="i-lucide-folder-open"
          label="Browse"
          variant="soft"
          color="neutral"
          size="xs"
          class="flex-1"
          @click="mode = 'browse'"
        />
        <UButton
          icon="i-lucide-link"
          label="Paste URL"
          variant="soft"
          color="neutral"
          size="xs"
          class="flex-1"
          @click="mode = 'url'"
        />
        <UButton
          icon="i-lucide-upload"
          label="Upload"
          variant="soft"
          color="neutral"
          size="xs"
          class="flex-1"
          @click="mode = 'upload'"
        />
      </div>
    </div>

    <!-- Browse Library Mode -->
    <div v-if="mode === 'browse' && hasAssetsPicker" class="space-y-2">
      <Suspense>
        <CroutonAssetsPicker
          @select="handleAssetSelected"
        />
        <template #fallback>
          <div class="h-32 flex items-center justify-center text-sm text-muted">
            Loading library...
          </div>
        </template>
      </Suspense>
      <div class="flex gap-2 pt-1">
        <UButton
          icon="i-lucide-upload"
          label="Upload instead"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = 'upload'"
        />
        <UButton
          icon="i-lucide-link"
          label="Paste URL"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = 'url'"
        />
        <UButton
          v-if="hasImage"
          label="Cancel"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = 'preview'"
        />
      </div>
    </div>

    <!-- URL Input Mode -->
    <div v-if="mode === 'url'" class="space-y-2">
      <UInput
        v-model="urlInput"
        placeholder="https://example.com/image.jpg or /images/..."
        size="sm"
        class="w-full"
      >
        <template #leading>
          <UIcon name="i-lucide-link" class="size-4" />
        </template>
      </UInput>
      <div class="flex gap-2">
        <UButton
          label="Apply"
          color="primary"
          size="xs"
          @click="setUrl"
        />
        <UButton
          label="Cancel"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = hasImage ? 'preview' : (hasAssetsPicker ? 'browse' : 'preview')"
        />
        <UButton
          v-if="hasAssetsPicker"
          icon="i-lucide-folder-open"
          label="Browse library"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = 'browse'"
        />
        <UButton
          v-else
          icon="i-lucide-upload"
          label="Upload instead"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = 'upload'"
        />
      </div>
    </div>

    <!-- Upload Mode -->
    <div v-if="mode === 'upload'" class="space-y-2">
      <CroutonImageUpload
        @file-selected="handleFileSelected"
      />
      <div class="flex gap-2">
        <UButton
          label="Cancel"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = hasImage ? 'preview' : (hasAssetsPicker ? 'browse' : 'preview')"
        />
        <UButton
          v-if="hasAssetsPicker"
          icon="i-lucide-folder-open"
          label="Browse library"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="mode = 'browse'"
        />
      </div>
    </div>
  </div>
</template>
