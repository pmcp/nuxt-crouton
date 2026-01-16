<script setup lang="ts">
/**
 * Page Block Editor
 *
 * Uses CroutonEditorBlocks with page-specific block extensions
 * (Hero, Section, CTA, CardGrid, Separator).
 */
import { PageBlocks } from '../../editor/extensions/page-blocks'
import { getBlockMenuItems } from '../../utils/block-registry'

// Block suggestion item interface (matches CroutonEditorBlocks prop)
interface BlockSuggestionItem {
  type: string
  label: string
  description?: string
  icon?: string
  category?: string
  command: string
}

/** TipTap JSON document structure */
type TipTapDoc = { type: 'doc'; content: unknown[] }

interface Props {
  modelValue?: string | TipTapDoc | null
  placeholder?: string
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type / to insert a block...',
  editable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string | TipTapDoc]
}>()

// Two-way binding - pass through to CroutonEditorBlocks
const content = computed({
  get: () => props.modelValue || { type: 'doc', content: [] },
  set: (value) => emit('update:modelValue', value)
})

// Page block extensions
const pageBlockExtensions = [
  PageBlocks.configure({
    enableSlashCommands: false // We use UEditorSuggestionMenu instead
  })
]

// Convert block menu items to suggestion items for CroutonEditorBlocks
const blockSuggestionItems = computed<BlockSuggestionItem[]>(() => {
  const items = getBlockMenuItems()

  return items
    .filter(item => item.type !== 'richTextBlock') // Exclude rich text (it's just regular text)
    .map(item => ({
      type: item.type,
      label: item.name,
      description: item.description,
      icon: item.icon,
      category: getCategoryLabel(item.category),
      // Map block type to TipTap command name
      command: getInsertCommand(item.type)
    }))
})

// Map category keys to display labels
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    hero: 'Hero',
    content: 'Content',
    cta: 'Call to Action',
    layout: 'Layout'
  }
  return labels[category] || category
}

// Map block type to insert command
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

// Editor ref for external access
const editorBlocksRef = ref()

// Expose editor utilities
defineExpose({
  get editor() {
    return editorBlocksRef.value?.editor
  },
  get selectedNode() {
    return editorBlocksRef.value?.selectedNode
  },
  openPropertyPanel() {
    return editorBlocksRef.value?.openPropertyPanel()
  },
  updateBlockAttrs(attrs: Record<string, unknown>) {
    return editorBlocksRef.value?.updateBlockAttrs(attrs)
  },
  deleteSelectedBlock() {
    return editorBlocksRef.value?.deleteSelectedBlock()
  }
})
</script>

<template>
  <CroutonEditorBlocks
    ref="editorBlocksRef"
    v-model="content"
    :placeholder="placeholder"
    :editable="editable"
    :extensions="pageBlockExtensions"
    :suggestion-items="blockSuggestionItems"
    content-type="json"
    class="h-full"
  >
    <!-- Property Panel -->
    <template #property-panel="{ selectedNode, isOpen, close, updateAttrs, deleteBlock }">
      <USlideover
        :open="isOpen"
        title="Edit Block"
        :ui="{ content: 'max-w-sm' }"
        @update:open="!$event && close()"
      >
        <template #body>
          <CroutonPagesEditorBlockPropertyPanel
            v-if="selectedNode"
            :node="selectedNode.node"
            @update="updateAttrs"
            @delete="deleteBlock"
            @close="close"
          />
        </template>
      </USlideover>
    </template>
  </CroutonEditorBlocks>
</template>
