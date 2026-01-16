<script setup lang="ts">
/**
 * Separator Block Editor View
 */
import { computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { SeparatorBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: SeparatorBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<SeparatorBlockAttrs>) => void
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
    data-type="separator-block"
    @dblclick="handleOpenPanel"
  >
    <div class="relative group py-4">
      <!-- Action buttons (visible on hover) -->
      <div class="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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

      <!-- Separator -->
      <div class="flex items-center gap-4">
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span v-if="attrs.label" class="text-sm text-gray-500 dark:text-gray-400">
          {{ attrs.label }}
        </span>
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  </NodeViewWrapper>
</template>
