<script setup lang="ts">
/**
 * Block Content Renderer
 *
 * Renders page content that is stored in block format (JSON).
 * Routes each block type to its appropriate render component.
 */
import type { PageBlockContent, PageBlock } from '../types/blocks'
import { parseBlockContent } from '../utils/content-detector'

/**
 * Minimal XSS sanitizer — strips <script> tags and on* event handler attributes.
 * SSR-safe: returns the original string unchanged when running server-side.
 */
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('script').forEach(el => el.remove())
  div.querySelectorAll('*').forEach(el => {
    ;[...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name)
    })
  })
  return div.innerHTML
}

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
  collectionBlock: 'CroutonPagesBlocksRenderCollectionBlock',
  faqBlock: 'CroutonPagesBlocksRenderFaqBlock',
  twoColumnBlock: 'CroutonPagesBlocksRenderTwoColumnBlock',
  chartBlock: 'CroutonPagesBlocksRenderChartBlock',
  mapBlock: 'CroutonPagesBlocksRenderMapBlock',
  collectionMapBlock: 'CroutonPagesBlocksRenderCollectionMapBlock',
  embedBlock: 'CroutonPagesBlocksRenderEmbedBlock'
}

// Get component name for a block type
function getBlockComponent(type: string): string | null {
  return blockComponents[type] || null
}

/**
 * Check if a block is an empty paragraph (no text content)
 * TipTap creates empty paragraphs as structural elements - we skip those
 * But paragraphs with text content should be rendered
 */
function isEmptyParagraph(block: PageBlock): boolean {
  if (block.type !== 'paragraph') return false
  // Check if paragraph has any text content
  const content = (block as any).content
  if (!content || !Array.isArray(content) || content.length === 0) {
    return true
  }
  // Check if content has any text
  return !content.some((node: any) => node.type === 'text' && node.text?.trim())
}

/**
 * Convert paragraph block to HTML for rendering
 */
function paragraphToHtml(block: PageBlock): string {
  const content = (block as any).content
  if (!content || !Array.isArray(content)) return ''

  const textParts = content.map((node: any) => {
    if (node.type === 'text') {
      let text = node.text || ''
      // Apply marks (bold, italic, etc.)
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `<strong>${text}</strong>`
          else if (mark.type === 'italic') text = `<em>${text}</em>`
          else if (mark.type === 'underline') text = `<u>${text}</u>`
          else if (mark.type === 'strike') text = `<s>${text}</s>`
          else if (mark.type === 'code') text = `<code>${text}</code>`
          else if (mark.type === 'link' && mark.attrs?.href) {
            text = `<a href="${mark.attrs.href}"${mark.attrs.target ? ` target="${mark.attrs.target}"` : ''}>${text}</a>`
          }
        }
      }
      return text
    }
    return ''
  })

  return sanitizeHtml(textParts.join(''))
}

// Filter blocks to render (skip only truly empty structural blocks)
const renderableBlocks = computed(() => {
  return blocks.value.filter(block => !isEmptyParagraph(block))
})

// Check if block is a paragraph (for special rendering)
function isParagraph(type: string): boolean {
  return type === 'paragraph'
}
</script>

<template>
  <div class="block-content">

    <template v-if="renderableBlocks.length > 0">
      <template v-for="(block, index) in renderableBlocks" :key="(block as any).attrs?.blockId || `${block.type}-${index}`">
        <!-- Dynamic blocks: fetch runtime data, must render client-side only -->
        <ClientOnly
          v-if="block.type === 'collectionBlock' || block.type === 'chartBlock' || block.type === 'mapBlock' || block.type === 'collectionMapBlock' || block.type === 'embedBlock'"
        >
          <component
            :is="getBlockComponent(block.type)"
            :attrs="block.attrs"
          />
          <template #fallback>
            <div class="animate-pulse rounded-xl bg-muted h-40 my-8" />
          </template>
        </ClientOnly>

        <!-- Static blocks: SSR/prerender safe, render as-is -->
        <component
          v-else-if="getBlockComponent(block.type)"
          :is="getBlockComponent(block.type)"
          :attrs="block.attrs"
        />

        <!-- Paragraph blocks (rendered as prose) -->
        <p
          v-else-if="isParagraph(block.type)"
          class="prose prose-lg dark:prose-invert max-w-none"
          v-html="paragraphToHtml(block)"
        />

        <!-- Unknown block type warning -->
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
