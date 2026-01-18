<script setup lang="ts">
/**
 * Hero Block Editor View
 *
 * NodeView component for rendering hero blocks in the editor.
 * Shows a preview of the block with edit controls.
 *
 * Note: Uses explicit imports because this component is loaded
 * via VueNodeViewRenderer which bypasses Nuxt auto-imports.
 */
import { computed, ref, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { HeroBlockAttrs } from '../../../types/blocks'

const props = defineProps<{
  node: { attrs: HeroBlockAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<HeroBlockAttrs>) => void
  deleteNode: () => void
  getPos: () => number
}>()

// Shorthand for attrs
const attrs = computed(() => props.node.attrs)

// Reference to this component's root element for finding parent editor
const wrapperRef = ref<InstanceType<typeof NodeViewWrapper> | null>(null)

// Cache the editor ID once mounted (traverse up from this element to find parent editor)
const cachedEditorId = ref<string | undefined>(undefined)

onMounted(() => {
  // wrapperRef.value is the component instance, .$el is the DOM element
  let el: HTMLElement | null = wrapperRef.value?.$el as HTMLElement | null
  while (el) {
    if (el.classList?.contains('crouton-editor-blocks') && el.dataset?.editorId) {
      cachedEditorId.value = el.dataset.editorId
      break
    }
    el = el.parentElement
  }
})

// Handler that opens property panel by dispatching a custom event
function handleOpenPanel() {
  const event = new CustomEvent('block-edit-request', {
    bubbles: true,
    detail: { node: props.node, pos: props.getPos(), editorId: cachedEditorId.value }
  })
  document.dispatchEvent(event)
}
</script>

<template>
  <NodeViewWrapper
    ref="wrapperRef"
    class="block-wrapper my-1 cursor-pointer"
    :class="{ 'border-l-2 border-l-primary/50': selected }"
    data-type="hero-block"
    @dblclick="handleOpenPanel"
  >
    <div class="relative group rounded border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 transition-colors">
      <!-- Block Content -->
      <div class="p-3">
        <!-- Block Header -->
        <div class="flex items-center justify-between mb-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Hero
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
        <div class="flex items-center gap-4">
          <!-- Image thumbnail -->
          <div v-if="attrs.image" class="flex-shrink-0">
            <img
              :src="attrs.image"
              :alt="attrs.title || 'Hero image'"
              class="w-16 h-16 object-cover rounded"
            />
          </div>

          <!-- Text content -->
          <div class="flex-1 min-w-0" :class="{ 'text-center': !attrs.image }">
            <p v-if="attrs.headline" class="text-xs font-medium text-primary mb-1">
              {{ attrs.headline }}
            </p>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
              {{ attrs.title || 'Hero Title' }}
            </h2>
            <p v-if="attrs.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {{ attrs.description }}
            </p>
            <div v-if="attrs.links?.length" class="mt-2 flex gap-1.5" :class="{ 'justify-center': !attrs.image }">
              <span
                v-for="(link, index) in attrs.links"
                :key="index"
                class="px-2.5 py-1 bg-primary/10 text-primary rounded text-xs"
              >
                {{ link.label }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
