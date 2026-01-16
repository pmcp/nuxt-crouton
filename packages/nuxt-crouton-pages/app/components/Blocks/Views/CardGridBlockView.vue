<script setup lang="ts">
/**
 * Card Grid Block Editor View
 */
import { computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { CardGridBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: CardGridBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<CardGridBlockAttrs>) => void
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
    data-type="card-grid-block"
    @dblclick="handleOpenPanel"
  >
    <div class="relative group bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <!-- Block Label -->
      <div class="absolute top-2 left-2 z-10">
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Card Grid
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
        <p v-if="attrs.headline" class="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">
          {{ attrs.headline }}
        </p>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {{ attrs.title || 'Card Grid' }}
        </h3>
        <p v-if="attrs.description" class="text-gray-600 dark:text-gray-300 mb-4">
          {{ attrs.description }}
        </p>
        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="(card, index) in (attrs.cards || []).slice(0, 6)"
            :key="index"
            class="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
          >
            <h4 class="font-medium text-gray-900 dark:text-white text-sm">{{ card.title }}</h4>
            <p v-if="card.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ card.description }}
            </p>
          </div>
          <template v-if="!attrs.cards?.length">
            <div
              v-for="i in 3"
              :key="i"
              class="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 border-dashed"
            >
              <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
              <div class="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full mt-2" />
            </div>
          </template>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
