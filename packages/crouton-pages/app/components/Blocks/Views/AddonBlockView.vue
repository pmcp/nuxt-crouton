<script setup lang="ts">
/**
 * Addon Block Editor View
 *
 * Generic NodeView wrapper for addon blocks (chart, map, etc.).
 * Reads the block definition from TipTap extension storage (set by addon-block-factory)
 * and renders the addon package's editor view component.
 *
 * Falls back to a placeholder if the definition or component is not found.
 *
 * Note: Uses explicit imports because this component is loaded
 * via VueNodeViewRenderer which bypasses Nuxt auto-imports.
 */
import { computed, ref, resolveComponent } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'

const props = defineProps<{
  node: { type: { name: string; storage?: { blockDefinition?: CroutonBlockDefinition } }; attrs: Record<string, unknown> }
  editor: any
  selected: boolean
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  getPos: () => number
}>()

// Read block definition from TipTap extension storage (set by addon-block-factory)
const blockDef = computed(() => {
  // Try extension storage first (set by createAddonBlockExtension)
  const storageDef = props.editor?.extensionManager?.extensions
    ?.find((ext: any) => ext.name === props.node.type.name)?.storage?.blockDefinition
  if (storageDef) return storageDef as CroutonBlockDefinition
  // Fallback: read from node type storage
  return props.node.type.storage?.blockDefinition || null
})

// Resolve the editor view component from the addon package
const editorViewComponent = computed(() => {
  if (!blockDef.value?.components.editorView) return null
  return resolveComponent(blockDef.value.components.editorView)
})

const { t } = useT()
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
    :data-type="node.type.name"
    @dblclick="handleOpenPanel"
  >
    <div ref="innerRef">
      <!-- Render the addon package's editor view component if available -->
      <component
        :is="editorViewComponent"
        v-if="editorViewComponent && typeof editorViewComponent !== 'string'"
        :node="node"
        :selected="selected"
        :update-attributes="updateAttributes"
        :delete-node="deleteNode"
        :get-pos="getPos"
      />

      <!-- Fallback: block definition found but component not resolved -->
      <div
        v-else-if="blockDef"
        class="relative group rounded border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 transition-colors"
      >
        <div class="p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              {{ blockDef.name }}
            </span>
            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
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
          <div class="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-100 dark:border-gray-700/50">
            <p class="text-sm text-muted">{{ blockDef.description }}</p>
          </div>
        </div>
      </div>

      <!-- Unknown block type -->
      <div
        v-else
        class="p-3 rounded bg-warning/10 border border-warning/20"
      >
        <p class="text-sm text-warning">Unknown addon block: {{ node.type.name }}</p>
      </div>
    </div>
  </NodeViewWrapper>
</template>
