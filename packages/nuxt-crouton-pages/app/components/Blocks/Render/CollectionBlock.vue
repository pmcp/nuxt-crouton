<script setup lang="ts">
/**
 * Collection Block Public Renderer
 *
 * Renders an embedded collection in read-only mode using CroutonCollection.
 * Uses :create="false" to hide the create button and :hide-default-columns="{ actions: true }"
 * to hide action buttons, giving a clean public view.
 * Supports table, list, grid, and cards layouts.
 */
import type { CollectionBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: CollectionBlockAttrs
}

const props = defineProps<Props>()

// Get collection config to verify it exists
const { getConfig } = useCollections()
const collectionConfig = computed(() => {
  if (!props.attrs.collection) return null
  return getConfig(props.attrs.collection)
})

// Parse pageSize to number (it comes as string from select)
const pageSize = computed(() => {
  const size = props.attrs.pageSize
  if (typeof size === 'number') return size
  if (typeof size === 'string') return parseInt(size, 10)
  return 10
})

// Map layout value
const layout = computed(() => props.attrs.layout || 'table')
</script>

<template>
  <div class="collection-block my-8">
    <!-- Title if set -->
    <h2
      v-if="attrs.title"
      class="text-2xl font-bold mb-4"
    >
      {{ attrs.title }}
    </h2>

    <!-- Error: No collection selected -->
    <div
      v-if="!attrs.collection"
      class="p-8 text-center text-muted bg-gray-50 dark:bg-gray-800/50 rounded-lg"
    >
      <UIcon name="i-lucide-alert-circle" class="size-8 mb-2 mx-auto" />
      <p>No collection selected</p>
    </div>

    <!-- Error: Collection not found -->
    <div
      v-else-if="!collectionConfig"
      class="p-8 text-center text-warning bg-warning/10 rounded-lg"
    >
      <UIcon name="i-lucide-alert-triangle" class="size-8 mb-2 mx-auto" />
      <p>Collection "{{ attrs.collection }}" not found</p>
    </div>

    <!-- Render collection -->
    <CroutonCollection
      v-else
      :collection="attrs.collection"
      :layout="layout"
      :create="false"
      :hide-default-columns="{ actions: true }"
      :initial-pagination="{
        currentPage: 1,
        pageSize: pageSize,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      }"
      :show-pagination="attrs.showPagination !== false"
      class="collection-block-content"
    />
  </div>
</template>

<style scoped>
.collection-block-content :deep(.crouton-collection) {
  /* Remove any admin-specific styling */
}
</style>
