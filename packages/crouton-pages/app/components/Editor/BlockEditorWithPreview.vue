<script setup lang="ts">
import { markRaw } from 'vue'
import { PageBlocks } from '../../editor/extensions/page-blocks'
/**
 * Page Block Editor with Preview
 *
 * Block editor with live preview panel showing rendered Nuxt UI Page components.
 * Uses tabs to switch between editor and preview.
 * Supports real-time collaboration via Yjs when yxmlFragment is provided.
 *
 * IMPORTANT: Extensions are created per-component-instance to avoid TipTap's
 * "Adding different instances of a keyed plugin" error that occurs when
 * module-level extensions are reused across editor remounts or HMR reloads.
 */
import { getBlockMenuItems } from '../../utils/block-registry'

// Create extensions once per component instance, wrapped in markRaw to prevent
// Vue's reactivity system from proxying TipTap internals
// Note: enableSlashCommands is false because we use UEditorSuggestionMenu instead
const pageBlockExtensions = markRaw([
  PageBlocks.configure({
    enableSlashCommands: false
  })
])

/** TipTap JSON document structure */
type TipTapDoc = { type: 'doc'; content: unknown[] }

interface BlockSuggestionItem {
  type: string
  label: string
  description?: string
  icon?: string
  category?: string
  command: string
}

interface Props {
  modelValue?: string | TipTapDoc | null
  placeholder?: string
  editable?: boolean
  /** Preview panel title */
  previewTitle?: string
  /** Default active tab */
  defaultTab?: 'editor' | 'preview'
  /**
   * Y.XmlFragment for real-time collaboration.
   * When provided, editor syncs to Yjs instead of using modelValue.
   */
  yxmlFragment?: unknown
  /**
   * Collab provider for cursor awareness (optional).
   */
  collabProvider?: { awareness: any }
  /**
   * User info for collaboration cursors.
   */
  collabUser?: { name: string; color?: string }
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type / to insert a block...',
  editable: true,
  previewTitle: 'Page Preview',
  defaultTab: 'editor'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | TipTapDoc]
}>()

// Empty TipTap document - must have at least one paragraph node
const emptyDoc: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

// Two-way binding
const content = computed({
  get: () => {
    if (props.modelValue) {
      // Ensure JSON docs have at least one node (TipTap requirement)
      if (typeof props.modelValue === 'object') {
        const doc = props.modelValue as TipTapDoc
        if (!doc.content || doc.content.length === 0) {
          return emptyDoc
        }
      }
      return props.modelValue
    }
    return emptyDoc
  },
  set: (value) => emit('update:modelValue', value)
})

// Tab state
const activeTab = ref(props.defaultTab)
const tabItems = [
  { label: 'Editor', value: 'editor', icon: 'i-lucide-edit-3' },
  { label: 'Preview', value: 'preview', icon: 'i-lucide-eye' }
]

// Block suggestion items
const blockSuggestionItems = computed<BlockSuggestionItem[]>(() => {
  const items = getBlockMenuItems()
  return items
    .filter(item => item.type !== 'richTextBlock')
    .map(item => ({
      type: item.type,
      label: item.name,
      description: item.description,
      icon: item.icon,
      category: getCategoryLabel(item.category),
      command: getInsertCommand(item.type)
    }))
})

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    hero: 'Hero',
    content: 'Content',
    cta: 'Call to Action',
    layout: 'Layout'
  }
  return labels[category] || category
}

function getInsertCommand(type: string): string {
  const commands: Record<string, string> = {
    heroBlock: 'insertHeroBlock',
    sectionBlock: 'insertSectionBlock',
    ctaBlock: 'insertCTABlock',
    cardGridBlock: 'insertCardGridBlock',
    separatorBlock: 'insertSeparatorBlock',
    collectionBlock: 'insertCollectionBlock'
  }
  return commands[type] || type
}

// Editor ref
const editorBlocksRef = ref()

// Property panel state (managed here, not in CroutonEditorBlocks)
const selectedNode = ref<{ pos: number; node: any } | null>(null)
const isPropertyPanelOpen = ref(false)

function closePropertyPanel() {
  isPropertyPanelOpen.value = false
}

function updateBlockAttrs(attrs: Record<string, unknown>) {
  editorBlocksRef.value?.updateBlockAttrs(attrs)
}

function deleteBlock() {
  editorBlocksRef.value?.deleteSelectedBlock()
  closePropertyPanel()
}

// Expose editor utilities
defineExpose({
  get editor() {
    return editorBlocksRef.value?.editor
  },
  get selectedNode() {
    return selectedNode.value
  },
  openPropertyPanel() {
    if (selectedNode.value) {
      isPropertyPanelOpen.value = true
    }
  },
  updateBlockAttrs,
  deleteSelectedBlock() {
    return editorBlocksRef.value?.deleteSelectedBlock()
  },
  showEditor() {
    activeTab.value = 'editor'
  },
  showPreview() {
    activeTab.value = 'preview'
  }
})
</script>

<template>
  <div class="block-editor-with-preview w-full h-full flex flex-col">
    <!-- Tab buttons only -->
    <UTabs v-model="activeTab" :items="tabItems" :content="false" />

    <!-- Editor Tab -->
    <div
      v-show="activeTab === 'editor'"
      class="flex-1 min-h-0 pt-2"
    >
      <CroutonEditorBlocks
        ref="editorBlocksRef"
        v-model="content"
        :placeholder="placeholder"
        :editable="editable"
        :extensions="pageBlockExtensions"
        :suggestion-items="blockSuggestionItems"
        :yxml-fragment="yxmlFragment"
        :collab-provider="collabProvider"
        :collab-user="collabUser"
        content-type="json"
        class="h-full border border-default rounded-lg"
        @block:select="(node) => selectedNode = node"
        @block:edit="(node) => { selectedNode = node; isPropertyPanelOpen = true }"
      />
    </div>

    <!-- Preview Tab -->
    <div
      v-show="activeTab === 'preview'"
      class="flex-1 min-h-0 pt-2"
    >
      <div class="border border-default rounded-lg overflow-hidden h-full flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-default bg-muted/30 flex-shrink-0">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-eye" class="size-4 text-muted" />
            <span class="text-sm font-medium">{{ previewTitle }}</span>
          </div>
        </div>

        <!-- Preview content -->
        <div class="flex-1 overflow-auto">
          <CroutonPagesBlockContent
            :content="content"
            class="p-4"
          />
        </div>
      </div>
    </div>

    <!-- Property Panel - Rendered at root level for proper z-index/overlay -->
    <USlideover
      v-model:open="isPropertyPanelOpen"
      title="Edit Block"
      :ui="{ content: 'max-w-sm' }"
    >
      <template #body>
        <CroutonPagesEditorBlockPropertyPanel
          v-if="selectedNode"
          :node="selectedNode.node"
          @update="updateBlockAttrs"
          @delete="deleteBlock"
          @close="closePropertyPanel"
        />
      </template>
    </USlideover>
  </div>
</template>


