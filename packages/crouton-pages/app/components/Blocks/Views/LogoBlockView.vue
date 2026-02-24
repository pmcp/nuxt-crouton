<script setup lang="ts">
/**
 * Logo Block Editor View
 *
 * NodeView component for rendering logo blocks in the editor.
 * Shows logo icon previews with the title.
 *
 * Note: Uses explicit imports because this component is loaded
 * via VueNodeViewRenderer which bypasses Nuxt auto-imports.
 */
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { LogoBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: LogoBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<LogoBlockAttrs>) => void
  deleteNode: () => void
  getPos: () => number
}>()

const attrs = computed(() => props.node.attrs)
const itemCount = computed(() => attrs.value.items?.length || 0)

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
    data-type="logo-block"
    @dblclick="handleOpenPanel"
  >
    <div ref="innerRef" class="relative group rounded border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 transition-colors">
      <!-- Block Content -->
      <div class="p-3">
        <!-- Block Header -->
        <div class="flex items-center justify-between mb-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="5" />
              <path d="M3 21l3.5-7h11L21 21" />
            </svg>
            Logos
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
        <div class="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700/50 p-4">
          <p v-if="attrs.title" class="text-sm font-semibold text-center text-gray-600 dark:text-gray-300 mb-3">
            {{ attrs.title }}
          </p>
          <div v-if="itemCount > 0" class="flex items-center justify-center gap-4 flex-wrap">
            <template v-for="(item, i) in attrs.items" :key="i">
              <!-- Icon-based logo -->
              <span
                v-if="item.type === 'icon' || (!item.type && item.value?.startsWith('i-'))"
                class="text-gray-400 text-2xl relative"
                :title="item.link ? `${item.value} → ${item.link}` : item.value"
              >
                {{ item.value.replace('i-simple-icons-', '').replace('i-lucide-', '') }}
                <span v-if="item.link" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              </span>
              <!-- Image-based logo -->
              <span
                v-else-if="item.value"
                class="relative"
                :title="item.link || ''"
              >
                <img
                  :src="item.value"
                  :alt="item.alt || ''"
                  class="h-6 object-contain opacity-60"
                >
                <span v-if="item.link" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              </span>
            </template>
          </div>
          <div v-else class="text-center text-gray-400 text-sm py-2">
            No logos — double-click to add
          </div>
          <div v-if="attrs.marquee || (attrs.align && attrs.align !== 'center') || (attrs.size && attrs.size !== 'md')" class="flex items-center justify-center gap-1 mt-2">
            <span v-if="attrs.marquee" class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">marquee</span>
            <span v-if="attrs.align === 'between'" class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">space-between</span>
            <span v-if="attrs.size && attrs.size !== 'md'" class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{{ attrs.size }}</span>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
