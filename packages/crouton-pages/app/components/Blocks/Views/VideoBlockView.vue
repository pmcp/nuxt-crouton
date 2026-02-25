<script setup lang="ts">
/**
 * Video Block Editor View
 *
 * NodeView component for rendering video blocks in the editor.
 * Shows video preview when src is set, placeholder when empty.
 *
 * Note: Uses explicit imports because this component is loaded
 * via VueNodeViewRenderer which bypasses Nuxt auto-imports.
 */
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { VideoBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: VideoBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<VideoBlockAttrs>) => void
  deleteNode: () => void
  getPos: () => number
}>()

const { t } = useT()
const attrs = computed(() => props.node.attrs)

const hasSrc = computed(() => !!attrs.value.src)

const isBunny = computed(() => {
  const src = attrs.value.src || ''
  return /iframe\.mediadelivery\.net/.test(src) || /\.b-cdn\.net/.test(src)
})

const bunnySrc = computed(() => {
  let url = attrs.value.src || ''
  url = url.replace('/play/', '/embed/')
  if (!url.includes('responsive=')) {
    url += (url.includes('?') ? '&' : '?') + 'responsive=true'
  }
  return url
})

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
    data-type="video-block"
    @dblclick="handleOpenPanel"
  >
    <div ref="innerRef" class="relative group rounded border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 transition-colors">
      <!-- Block Content -->
      <div class="p-3">
        <!-- Block Header -->
        <div class="flex items-center justify-between mb-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Video
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
        <div class="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <!-- Video preview -->
          <div v-if="hasSrc" class="relative">
            <!-- Bunny Stream iframe preview -->
            <div v-if="isBunny" class="relative w-full" style="padding-bottom: 56.25%;">
              <iframe
                :src="bunnySrc"
                class="absolute inset-0 w-full h-full pointer-events-none"
                loading="lazy"
                style="border: none;"
              />
            </div>
            <!-- Native video preview -->
            <video
              v-else
              :src="attrs.src"
              muted
              class="w-full max-h-64 object-contain"
            />
            <div v-if="attrs.caption" class="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50">
              {{ attrs.caption }}
            </div>
          </div>

          <!-- Empty placeholder -->
          <div
            v-else
            class="flex flex-col items-center justify-center gap-2 py-8 text-gray-400"
          >
            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span class="text-sm font-medium">{{ t('pages.blocks.video.noVideo') }}</span>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
