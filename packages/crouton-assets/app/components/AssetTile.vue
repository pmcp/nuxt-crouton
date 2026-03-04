<script setup lang="ts">
const props = defineProps<{
  asset: Record<string, any>
  selected?: boolean
  selectable?: boolean
}>()

const emit = defineEmits<{
  click: [asset: Record<string, any>]
  edit: [asset: Record<string, any>]
  delete: [asset: Record<string, any>]
}>()

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

    <!-- Action buttons overlay -->
    <div
      v-if="selectable"
      class="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      @click.stop
    >
      <UButton
        icon="i-lucide-pencil"
        size="xs"
        variant="solid"
        color="neutral"
        class="shadow"
        @click="emit('edit', asset)"
      />
      <UButton
        icon="i-lucide-trash-2"
        size="xs"
        variant="solid"
        color="error"
        class="shadow"
        @click="emit('delete', asset)"
      />
    </div>

    <!-- Filename + size overlay on hover -->
    <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
      <p class="truncate">{{ asset.filename }}</p>
      <p v-if="asset.size" class="text-[10px] text-white/70">{{ formatFileSize(asset.size) }}</p>
    </div>

    <!-- Selected checkmark -->
    <div
      v-if="selectable && selected"
      class="absolute top-2 left-2"
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
