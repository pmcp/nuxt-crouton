<script setup lang="ts">
/**
 * QR Code Block Editor View
 *
 * Compact in-editor representation: a QR glyph plus the linked page/URL label,
 * with edit/delete actions. The real scannable code renders on the public page.
 */
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { QrCodeBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: QrCodeBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<QrCodeBlockAttrs>) => void
  deleteNode: () => void
  getPos: () => number
}>()

const { t } = useT()
const { items } = usePageLink()

const attrs = computed(() => props.node.attrs)

// Human label for the chosen destination.
const targetLabel = computed(() => {
  if (attrs.value.pageId) {
    const page = items.value.find(p => p.id === attrs.value.pageId)
    if (page) return page.title
  }
  if (attrs.value.url) return attrs.value.url
  return t('pages.blockLibrary.qrCode.noTarget', 'No page selected')
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
    data-type="qr-code-block"
    @dblclick="handleOpenPanel"
  >
    <div ref="innerRef" class="relative group rounded border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 transition-colors">
      <div class="py-2 px-3 flex items-center gap-3">
        <div class="flex items-center justify-center size-12 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0">
          <UIcon name="i-lucide-qr-code" class="size-7" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {{ t('pages.blockLibrary.qrCode.name', 'QR Code') }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 truncate">
            {{ targetLabel }}
          </p>
        </div>
        <!-- Action buttons -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            :title="t('pages.blocks.editBlock')"
            @click.stop="handleOpenPanel"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            :title="t('pages.blocks.deleteBlock')"
            @click.stop="deleteNode"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
