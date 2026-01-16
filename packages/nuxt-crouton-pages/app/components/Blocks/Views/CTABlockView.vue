<script setup lang="ts">
/**
 * CTA Block Editor View
 */
import { computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { CTABlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: CTABlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<CTABlockAttrs>) => void
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
    data-type="cta-block"
    @dblclick="handleOpenPanel"
  >
    <div class="relative group bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6">
      <!-- Block Label -->
      <div class="absolute top-2 left-2 z-10">
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          CTA
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
      <div class="pt-8 text-center">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {{ attrs.title || 'Call to Action' }}
        </h3>
        <p v-if="attrs.description" class="text-gray-600 dark:text-gray-300 mb-4">
          {{ attrs.description }}
        </p>
        <div v-if="attrs.links?.length" class="flex justify-center gap-2">
          <span
            v-for="(link, index) in attrs.links"
            :key="index"
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            {{ link.label }}
          </span>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
