<script setup lang="ts">
/**
 * Image property editor for block editor.
 * Three modes: browse assets, upload new, paste URL.
 * Follows LinksEditor.vue pattern with modelValue + update:modelValue.
 */

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const mode = ref<'preview' | 'url' | 'upload'>('preview')
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
  mode.value = 'preview'
}

function handleFileSelected(file: File | null) {
  if (!file) return

  // Upload via the upload endpoint
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

    <!-- No Image State -->
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
          @click="mode = 'preview'"
        />
        <UButton
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
      <UButton
        label="Cancel"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="mode = 'preview'"
      />
    </div>
  </div>
</template>
