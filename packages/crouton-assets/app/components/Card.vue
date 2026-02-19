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

const getIconColor = (ct?: string) => {
  if (isVideo(ct)) return 'text-purple-400'
  if (isAudio(ct)) return 'text-green-400'
  if (isDocument(ct)) return 'text-orange-400'
  return 'text-blue-400'
}

const getFileExtension = (filename?: string) => {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : ''
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

const handleEdit = () => crouton?.open('update', props.collection, [props.item.id], 'modal')
const handleDelete = () => crouton?.open('delete', props.collection, [props.item.id])
</script>

<template>
  <!-- Grid layout -->
  <UCard
    v-if="layout === 'grid'"
    variant="outline"
    :ui="{ root: 'group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:ring-1 hover:ring-primary', body: 'p-0' }"
    @click="!stateless && handleEdit()"
  >
    <!-- Thumbnail area -->
    <div class="relative aspect-square bg-elevated overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.alt || item.filename"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      >
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center gap-3"
      >
        <div class="size-14 rounded-2xl bg-default flex items-center justify-center">
          <UIcon
            :name="getFileIcon(item.contentType)"
            :class="['size-7', getIconColor(item.contentType)]"
          />
        </div>
        <UBadge
          v-if="getFileExtension(item.filename)"
          variant="subtle"
          color="neutral"
          size="sm"
          :label="getFileExtension(item.filename)"
        />
      </div>

      <!-- Action overlay -->
      <div
        v-if="!stateless"
        class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"
        @click.stop
      >
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <UButton
            icon="i-lucide-pencil"
            size="xs"
            variant="solid"
            color="neutral"
            class="shadow-md"
            @click="handleEdit"
          />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            variant="solid"
            color="error"
            class="shadow-md"
            @click="handleDelete"
          />
        </div>
      </div>
    </div>

    <!-- Info strip -->
    <div class="px-3 py-2">
      <p class="text-xs font-medium truncate text-default leading-snug">
        {{ item.filename }}
      </p>
      <p class="text-[11px] text-muted mt-0.5 tabular-nums">
        {{ formatBytes(item.size) }}<span v-if="item.width && item.height"> &middot; {{ item.width }}&times;{{ item.height }}</span>
      </p>
    </div>
  </UCard>

  <!-- List layout -->
  <div
    v-else
    class="group flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
    @click="!stateless && handleEdit()"
  >
    <!-- Thumbnail -->
    <div class="size-10 rounded-lg overflow-hidden shrink-0 bg-elevated border border-default flex items-center justify-center">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.alt || item.filename"
        class="size-full object-cover"
      >
      <UIcon
        v-else
        :name="getFileIcon(item.contentType)"
        :class="['size-5', getIconColor(item.contentType)]"
      />
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate text-default leading-snug">
        {{ item.filename }}
      </p>
      <p class="text-xs text-muted truncate tabular-nums">
        {{ item.contentType }}<span v-if="item.size"> &middot; {{ formatBytes(item.size) }}</span>
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
