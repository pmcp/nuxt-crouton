<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: Record<string, any>
  layout: 'list' | 'grid'
  collection: string
  size?: 'compact' | 'comfortable' | 'spacious'
  stateless?: boolean
}>()

const crouton = useCrouton()

const isImage = (ct?: string) => ct?.startsWith('image/')
const isVideo = (ct?: string) => ct?.startsWith('video/')
const isAudio = (ct?: string) => ct?.startsWith('audio/')
const isDocument = (ct?: string) =>
  ct === 'application/pdf'
  || ct?.includes('word')
  || ct?.includes('spreadsheet')
  || ct?.includes('presentation')

const getFileIcon = (ct?: string) => {
  if (isImage(ct)) return 'i-lucide-image'
  if (isVideo(ct)) return 'i-lucide-video'
  if (isAudio(ct)) return 'i-lucide-music'
  if (ct === 'application/pdf') return 'i-lucide-file-text'
  if (isDocument(ct)) return 'i-lucide-file-text'
  return 'i-lucide-file'
}

const getFileExtension = (filename?: string) => {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const imageUrl = computed(() =>
  isImage(props.item.contentType) && props.item.pathname
    ? `/images/${props.item.pathname}`
    : null
)

const handleEdit = () => crouton?.open('update', props.collection, [props.item.id])
const handleDelete = () => crouton?.open('delete', props.collection, [props.item.id])
</script>

<template>
  <!-- Grid layout -->
  <div
    v-if="layout === 'grid'"
    class="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-all hover:shadow-md bg-white dark:bg-gray-900 cursor-pointer"
    @click="!stateless && handleEdit()"
  >
    <!-- Thumbnail area -->
    <div class="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.alt || item.filename"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      >
      <div
        v-else
        class="flex flex-col items-center gap-2"
      >
        <UIcon
          :name="getFileIcon(item.contentType)"
          class="w-10 h-10 text-gray-400"
        />
        <span class="text-xs font-mono text-gray-400 uppercase">
          {{ getFileExtension(item.filename) }}
        </span>
      </div>
    </div>

    <!-- Filename + size -->
    <div class="px-2 py-1.5 flex items-center justify-between gap-1 min-w-0">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium truncate text-gray-700 dark:text-gray-300">
          {{ item.filename }}
        </p>
        <p
          v-if="item.size"
          class="text-[10px] text-gray-400"
        >
          {{ formatBytes(item.size) }}
        </p>
      </div>

      <!-- Action buttons (on hover) -->
      <div
        v-if="!stateless"
        class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop
      >
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="handleEdit"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="ghost"
          color="error"
          @click="handleDelete"
        />
      </div>
    </div>
  </div>

  <!-- List layout -->
  <div
    v-else
    class="group flex items-center gap-3"
  >
    <!-- Thumbnail -->
    <div class="size-10 rounded overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.alt || item.filename"
        class="size-full object-cover"
      >
      <UIcon
        v-else
        :name="getFileIcon(item.contentType)"
        class="w-5 h-5 text-gray-400"
      />
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
        {{ item.filename }}
      </p>
      <p class="text-xs text-gray-500 truncate">
        {{ item.contentType }}
        <span v-if="item.size"> · {{ formatBytes(item.size) }}</span>
      </p>
    </div>

    <CroutonItemButtonsMini
      v-if="!stateless"
      delete
      update
      class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      @delete="handleDelete"
      @update="handleEdit"
    />
  </div>
</template>
