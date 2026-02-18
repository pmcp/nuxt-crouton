<script setup lang="ts">
const props = defineProps<{
  asset: Record<string, any>
  selected?: boolean
  selectable?: boolean
}>()

const emit = defineEmits<{
  click: [asset: Record<string, any>]
}>()

const isImage = (contentType?: string) => contentType?.startsWith('image/')
const isVideo = (contentType?: string) => contentType?.startsWith('video/')
const isAudio = (contentType?: string) => contentType?.startsWith('audio/')
const isDocument = (contentType?: string) =>
  contentType === 'application/pdf'
  || contentType?.includes('word')
  || contentType?.includes('spreadsheet')
  || contentType?.includes('presentation')

const getFileIcon = (contentType?: string): string => {
  if (isImage(contentType)) return 'i-lucide-image'
  if (isVideo(contentType)) return 'i-lucide-video'
  if (isAudio(contentType)) return 'i-lucide-music'
  if (contentType === 'application/pdf') return 'i-lucide-file-text'
  if (isDocument(contentType)) return 'i-lucide-file-text'
  return 'i-lucide-file'
}

const getFileExtension = (filename?: string): string => {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}
</script>

<template>
  <button
    type="button"
    class="relative group rounded-lg overflow-hidden border-2 transition-all w-full"
    :class="selected
      ? 'border-primary-500 ring-2 ring-primary-500'
      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'"
    @click="emit('click', asset)"
  >
    <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <img
        v-if="isImage(asset.contentType) && asset.pathname"
        :src="`/images/${asset.pathname}`"
        :alt="asset.alt || asset.filename"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="flex flex-col items-center gap-1"
      >
        <UIcon
          :name="getFileIcon(asset.contentType)"
          class="w-8 h-8 text-gray-400"
        />
        <span class="text-xs text-gray-400 uppercase">
          {{ getFileExtension(asset.filename) }}
        </span>
      </div>
    </div>

    <!-- Filename overlay on hover -->
    <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
      {{ asset.filename }}
    </div>

    <!-- Selected checkmark -->
    <div
      v-if="selectable && selected"
      class="absolute top-2 right-2"
    >
      <div class="bg-primary-500 rounded-full p-1">
        <UIcon
          name="i-lucide-check"
          class="w-4 h-4 text-white"
        />
      </div>
    </div>
  </button>
</template>
