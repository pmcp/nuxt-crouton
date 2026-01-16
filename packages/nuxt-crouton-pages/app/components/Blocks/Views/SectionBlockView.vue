<script setup lang="ts">
/**
 * Section Block Editor View
 */
import { computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { SectionBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: SectionBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<SectionBlockAttrs>) => void
  deleteNode: () => void
  getPos: () => number
}>()

const attrs = computed(() => props.node.attrs)

// Handler that opens property panel by dispatching a custom event
function handleOpenPanel() {
  const event = new CustomEvent('block-edit-request', {
    bubbles: true,
    detail: { node: props.node, pos: props.getPos() }
  })
  document.dispatchEvent(event)
}
</script>

<template>
  <NodeViewWrapper
    class="block-wrapper my-4 cursor-pointer"
    :class="{ 'ring-2 ring-primary ring-offset-2 rounded-lg': selected }"
    data-type="section-block"
    @dblclick="handleOpenPanel"
  >
    <div class="relative group bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <!-- Block Label -->
      <div class="absolute top-2 left-2 z-10">
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Section
        </span>
      </div>

      <!-- Action buttons -->
      <div class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button
          type="button"
          class="p-1.5 text-primary hover:bg-primary/10 rounded"
          title="Edit block properties"
          @click.stop="handleOpenPanel"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          class="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          title="Delete block"
          @click.stop="deleteNode"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <!-- Preview Content -->
      <div class="pt-8">
        <p v-if="attrs.headline" class="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
          {{ attrs.headline }}
        </p>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {{ attrs.title || 'Section Title' }}
        </h3>
        <p v-if="attrs.description" class="text-gray-600 dark:text-gray-300 mb-4">
          {{ attrs.description }}
        </p>
        <div v-if="attrs.features?.length" class="grid grid-cols-2 gap-2 mt-4">
          <div
            v-for="(feature, index) in attrs.features.slice(0, 4)"
            :key="index"
            class="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded"
          >
            <span class="text-sm text-gray-700 dark:text-gray-200">{{ feature.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
