<script setup lang="ts">
/**
 * Block Content Renderer
 *
 * Renders page content that is stored in block format (JSON).
 * Routes each block type to its appropriate render component.
 */
import type { PageBlockContent, PageBlock } from '../types/blocks'
import { parseBlockContent } from '../utils/content-detector'

interface Props {
  /** Raw JSON content string or parsed PageBlockContent */
  content: string | PageBlockContent | null | undefined
}

const props = defineProps<Props>()

// Parse content if string
const blocks = computed<PageBlock[]>(() => {
  if (!props.content) return []

  if (typeof props.content === 'string') {
    const parsed = parseBlockContent(props.content)
    return parsed?.content || []
  }

  // Already parsed
  return props.content.content || []
})

// Component mapping for custom blocks
const blockComponents: Record<string, string> = {
  heroBlock: 'CroutonPagesBlocksRenderHeroBlock',
  sectionBlock: 'CroutonPagesBlocksRenderSectionBlock',
  ctaBlock: 'CroutonPagesBlocksRenderCTABlock',
  cardGridBlock: 'CroutonPagesBlocksRenderCardGridBlock',
  separatorBlock: 'CroutonPagesBlocksRenderSeparatorBlock',
  richTextBlock: 'CroutonPagesBlocksRenderRichTextBlock',
  collectionBlock: 'CroutonPagesBlocksRenderCollectionBlock'
}

// Block types to skip (empty structural blocks from TipTap)
const skipBlockTypes = ['paragraph']

// Get component name for a block type
function getBlockComponent(type: string): string | null {
  return blockComponents[type] || null
}

// Check if block should be skipped
function shouldSkipBlock(type: string): boolean {
  return skipBlockTypes.includes(type)
}

// Filter blocks to render (skip empty structural blocks)
const renderableBlocks = computed(() => {
  return blocks.value.filter(block => !shouldSkipBlock(block.type))
})
</script>

<template>
  <div class="block-content">
    <template v-if="renderableBlocks.length > 0">
      <template v-for="(block, index) in renderableBlocks" :key="index">
        <component
          :is="getBlockComponent(block.type)"
          v-if="getBlockComponent(block.type)"
          :attrs="block.attrs"
        />
        <div
          v-else
          class="p-4 bg-warning/10 text-warning rounded-lg my-4"
        >
          Unknown block type: {{ block.type }}
        </div>
      </template>
    </template>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-12 text-muted"
    >
      <UIcon name="i-lucide-file-text" class="size-12 mb-4 mx-auto" />
      <p>This page has no content yet.</p>
    </div>
  </div>
</template>

<style scoped>
.block-content > * + * {
  margin-top: 0;
}
</style>
