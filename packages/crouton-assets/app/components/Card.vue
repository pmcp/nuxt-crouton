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
    :ui="{ root: 'group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/60', body: 'p-0!' }"
    @click="!stateless && handleEdit()"
  >
    <!-- Thumbnail -->
    <div class="relative aspect-square bg-elevated overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="item.alt || item.filename"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      >
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center gap-2"
      >
        <UIcon
          :name="getFileIcon(item.contentType)"
          :class="['size-8 opacity-60', getIconColor(item.contentType)]"
        />
        <span
          v-if="getFileExtension(item.filename)"
          class="text-[10px] font-mono font-semibold text-muted uppercase tracking-wider"
        >{{ getFileExtension(item.filename) }}</span>
      </div>

      <!-- Action buttons overlay -->
      <div
        v-if="!stateless"
        class="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        @click.stop
      >
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          variant="solid"
          color="neutral"
          class="shadow"
          @click="handleEdit"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="solid"
          color="error"
          class="shadow"
          @click="handleDelete"
        />
      </div>
    </div>

    <!-- Info strip -->
    <div class="px-2 py-1.5 border-t border-default">
      <p class="text-[11px] font-medium truncate text-default leading-tight">
        {{ item.filename }}
      </p>
      <p class="text-[10px] text-muted tabular-nums leading-tight mt-0.5">
        {{ formatFileSize(item.size) }}<span v-if="item.width && item.height"> &middot; {{ item.width }}&times;{{ item.height }}</span>
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
        {{ item.contentType }}<span v-if="item.size"> &middot; {{ formatFileSize(item.size) }}</span>
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
