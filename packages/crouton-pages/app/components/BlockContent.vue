<script setup lang="ts">
/**
 * Block Content Renderer
 *
 * Renders page content that is stored in block format (JSON).
 * Routes each block type to its appropriate render component.
 */
import type { PageBlockContent, PageBlock } from '../types/blocks'
import { parseBlockContent } from '../utils/content-detector'

// Addon blocks from croutonBlocks registry
const { getBlock: getAddonBlock } = useCroutonBlocks()

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

// Component mapping for core blocks
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
  embedBlock: 'CroutonPagesBlocksRenderEmbedBlock',
  imageBlock: 'CroutonPagesBlocksRenderImageBlock',
  logoBlock: 'CroutonPagesBlocksRenderLogoBlock',
  videoBlock: 'CroutonPagesBlocksRenderVideoBlock',
  fileBlock: 'CroutonPagesBlocksRenderFileBlock'
}

// Get component name for a block type — checks core blocks then addon blocks
function getBlockComponent(type: string): string | null {
  if (blockComponents[type]) return blockComponents[type]
  // Fall back to addon block renderer
  const addonDef = getAddonBlock(type)
  return addonDef?.components?.renderer || null
}

// Check if a block requires client-only rendering
function isClientOnlyBlock(type: string): boolean {
  // Core blocks that need ClientOnly
  if (type === 'collectionBlock' || type === 'embedBlock') return true
  // Addon blocks with clientOnly flag
  const addonDef = getAddonBlock(type)
  return addonDef?.clientOnly === true
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
          else if (mark.type === 'highlight') text = `<mark>${text}</mark>`
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

// Check if block is a heading (native TipTap node)
function isHeading(type: string): boolean {
  return type === 'heading'
}

/**
 * Convert heading block to HTML for rendering
 */
function headingToHtml(block: PageBlock): string {
  const content = (block as any).content
  if (!content || !Array.isArray(content)) return ''

  const textParts = content.map((node: any) => {
    if (node.type === 'text') {
      let text = node.text || ''
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `<strong>${text}</strong>`
          else if (mark.type === 'italic') text = `<em>${text}</em>`
          else if (mark.type === 'underline') text = `<u>${text}</u>`
          else if (mark.type === 'strike') text = `<s>${text}</s>`
          else if (mark.type === 'code') text = `<code>${text}</code>`
          else if (mark.type === 'highlight') text = `<mark>${text}</mark>`
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

/**
 * Get the heading level (1-6) from block attrs, defaulting to 2
 */
function getHeadingLevel(block: PageBlock): number {
  const level = (block as any).attrs?.level
  return typeof level === 'number' && level >= 1 && level <= 6 ? level : 2
}

/** Tailwind classes per heading level */
const headingClasses: Record<number, string> = {
  1: 'text-4xl font-bold tracking-tight text-[var(--ui-text-highlighted)] mt-8 mb-4',
  2: 'text-3xl font-bold tracking-tight text-[var(--ui-text-highlighted)] mt-8 mb-3',
  3: 'text-2xl font-semibold text-[var(--ui-text-highlighted)] mt-6 mb-3',
  4: 'text-xl font-semibold text-[var(--ui-text-highlighted)] mt-6 mb-2',
  5: 'text-lg font-medium text-[var(--ui-text-highlighted)] mt-4 mb-2',
  6: 'text-base font-medium text-[var(--ui-text-muted)] mt-4 mb-2'
}
</script>

<template>
  <div class="block-content">

    <template v-if="renderableBlocks.length > 0">
      <template v-for="(block, index) in renderableBlocks" :key="(block as any).attrs?.blockId || `${block.type}-${index}`">
        <!-- Dynamic blocks: fetch runtime data, must render client-side only -->
        <ClientOnly
          v-if="isClientOnlyBlock(block.type)"
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

        <!-- Native TipTap image node fallback (legacy content) -->
        <figure
          v-else-if="block.type === 'image'"
          class="my-8"
        >
          <img
            :src="(block as any).attrs?.src"
            :alt="(block as any).attrs?.alt || ''"
            class="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-full mx-auto"
          >
        </figure>

        <!-- Heading blocks (native TipTap heading nodes) -->
        <component
          v-else-if="isHeading(block.type)"
          :is="`h${getHeadingLevel(block)}`"
          :class="headingClasses[getHeadingLevel(block)]"
          v-html="headingToHtml(block)"
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
