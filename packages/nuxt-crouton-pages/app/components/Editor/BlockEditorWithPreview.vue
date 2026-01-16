<script setup lang="ts">
/**
 * Page Block Editor with Preview
 *
 * Block editor with live preview panel showing rendered Nuxt UI Page components.
 * Uses tabs to switch between editor and preview.
 */
import { PageBlocks } from '../../editor/extensions/page-blocks'
import { getBlockMenuItems } from '../../utils/block-registry'

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

// Two-way binding
const content = computed({
  get: () => props.modelValue || { type: 'doc', content: [] },
  set: (value) => emit('update:modelValue', value)
})

// Tab state
const activeTab = ref(props.defaultTab)
const tabItems = [
  { label: 'Editor', value: 'editor', icon: 'i-lucide-edit-3' },
  { label: 'Preview', value: 'preview', icon: 'i-lucide-eye' }
]

// Page block extensions
const pageBlockExtensions = [
  PageBlocks.configure({
    enableSlashCommands: false
  })
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
    separatorBlock: 'insertSeparatorBlock'
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

