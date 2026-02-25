<script setup lang="ts">
/**
 * Block Editor Toolbar
 *
 * Provides quick actions for inserting blocks and managing the editor.
 */
import type { Editor } from '@tiptap/vue-3'
import { getBlockMenuItems, getBlocksByCategory } from '../../utils/block-registry'
import type { BlockMenuItem } from '../../types/blocks'

interface Props {
  editor: Editor
}

const props = defineProps<Props>()

const { t } = useT()

// Get block items grouped by category
const blocksByCategory = computed(() => getBlocksByCategory())

// Category labels
const categoryLabels: Record<string, string> = {
  hero: t('pages.blocks.categories.hero'),
  content: t('pages.blocks.categories.content'),
  cta: t('pages.blocks.categories.cta'),
  layout: t('pages.blocks.categories.layout')
}

// Insert a block
function insertBlock(item: BlockMenuItem) {
  const { editor } = props

  switch (item.type) {
    case 'heroBlock':
      editor.chain().focus().insertHeroBlock().run()
      break
    case 'sectionBlock':
      editor.chain().focus().insertSectionBlock().run()
      break
    case 'ctaBlock':
      editor.chain().focus().insertCTABlock().run()
      break
    case 'cardGridBlock':
      editor.chain().focus().insertCardGridBlock().run()
      break
    case 'separatorBlock':
      editor.chain().focus().insertSeparatorBlock().run()
      break
  }
}

// Dropdown items for the insert menu
const insertMenuItems = computed(() => {
  const items: any[] = []

  Object.entries(blocksByCategory.value).forEach(([category, blocks]) => {
    // Add category label
    items.push({
      type: 'label',
      label: categoryLabels[category] || category
    })

    // Add block items
    blocks.forEach(block => {
      items.push({
        label: block.name,
        icon: block.icon,
        description: block.description,
        onSelect: () => insertBlock(block)
      })
    })
  })

  return items
})
</script>

<template>
  <div class="block-toolbar flex items-center gap-2">
    <!-- Insert Block Dropdown -->
    <UDropdownMenu :items="insertMenuItems">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-plus"
        size="sm"
      >
        {{ t('pages.editor.insertBlock') }}
      </UButton>
    </UDropdownMenu>

    <USeparator orientation="vertical" class="h-6" />

    <!-- Undo/Redo -->
    <UTooltip :text="t('common.undo')">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-undo"
        size="sm"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      />
    </UTooltip>

    <UTooltip :text="t('common.redo')">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-redo"
        size="sm"
        :disabled="!editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      />
    </UTooltip>

    <div class="flex-1" />

    <!-- Help text -->
    <span class="text-xs text-muted hidden sm:inline">
      {{ t('pages.editor.slashHint') }}
    </span>
  </div>
</template>
