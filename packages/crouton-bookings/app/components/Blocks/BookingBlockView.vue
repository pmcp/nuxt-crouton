<script setup lang="ts">
/**
 * Booking Block Editor View
 *
 * NodeView component for rendering booking blocks in the editor.
 * Shows visual placeholder and edit controls.
 *
 * Note: Uses explicit imports because this component is loaded
 * via VueNodeViewRenderer which bypasses Nuxt auto-imports.
 */
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'

interface BookingBlockAttrs {
  title?: string
  emptyMessage?: string
}

const props = defineProps<{
  node: { attrs: BookingBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<BookingBlockAttrs>) => void
  deleteNode: () => void
  getPos: () => number
}>()

const attrs = computed(() => props.node.attrs)

const innerRef = ref<HTMLElement | null>(null)

function findEditorId(): string | undefined {
  let el: HTMLElement | null = innerRef.value
  while (el) {
    if (el.classList?.contains('crouton-editor-blocks') && el.dataset?.editorId) {
      return el.dataset.editorId
    }
    el = el.parentElement
  }
  return undefined
}

function handleOpenPanel() {
  const editorId = findEditorId()
  const event = new CustomEvent('block-edit-request', {
    bubbles: true,
    detail: { node: props.node, pos: props.getPos(), editorId }
  })
  document.dispatchEvent(event)
}
</script>

<template>
  <NodeViewWrapper
    class="block-wrapper my-1 cursor-pointer"
    :class="{ 'border-l-2 border-l-primary/50': selected }"
    data-type="booking-block"
    @dblclick="handleOpenPanel"
  >
    <div ref="innerRef" class="relative group rounded border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 transition-colors">
      <div class="p-3">
        <!-- Block Header -->
        <div class="flex items-center justify-between mb-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 2v4M16 2v4M3 10h18M21 8v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="m9 16 2 2 4-4" />
            </svg>
            Booking
          </span>
          <!-- Action buttons -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <button
              type="button"
              class="p-1 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Edit block properties"
              @click.stop="handleOpenPanel"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              class="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Delete block"
              @click.stop="deleteNode"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Preview Content -->
        <div class="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-100 dark:border-gray-700/50">
          <!-- Title if set -->
          <h3 v-if="attrs.title" class="font-semibold text-gray-900 dark:text-white mb-2">
            {{ attrs.title }}
          </h3>

          <!-- Panel preview -->
          <div class="flex gap-3">
            <!-- Mini calendar grid -->
            <div class="grid grid-cols-7 gap-px w-28 shrink-0">
              <div
                v-for="d in 14"
                :key="d"
                class="h-3 rounded-sm"
                :class="d === 5 || d === 12
                  ? 'bg-primary/30'
                  : 'bg-gray-200/60 dark:bg-gray-700/40'"
              />
            </div>
            <!-- Mini booking list lines -->
            <div class="flex-1 space-y-1.5 pt-0.5">
              <div class="h-2.5 w-full rounded bg-gray-200/60 dark:bg-gray-700/40" />
              <div class="h-2.5 w-3/4 rounded bg-gray-200/60 dark:bg-gray-700/40" />
              <div class="h-2.5 w-5/6 rounded bg-gray-200/60 dark:bg-gray-700/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
