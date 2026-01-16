/**
 * Content Format Detector
 *
 * Utilities for detecting whether page content is:
 * - Block-based JSON (new format)
 * - Legacy HTML (old format)
 * - Empty
 */

import type { PageBlockContent, PageBlock } from '../types/blocks'

export type ContentFormat = 'blocks' | 'html' | 'empty'

/**
 * Detect the format of page content
 */
export function detectContentFormat(content: string | null | undefined): ContentFormat {
  if (!content || content.trim() === '') {
    return 'empty'
  }

  const trimmed = content.trim()

  // Check if it starts with JSON object/array markers
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (isPageBlockContent(parsed)) {
        return 'blocks'
      }
    } catch {
      // Not valid JSON, treat as HTML
    }
  }

  return 'html'
}

/**
 * Type guard for PageBlockContent
 */
export function isPageBlockContent(value: unknown): value is PageBlockContent {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>

  // Check for doc type
  if (obj.type !== 'doc') {
    return false
  }

  // Check for content array
  if (!Array.isArray(obj.content)) {
    return false
  }

  // Validate each block has type (attrs is optional for simple blocks like paragraph)
  return obj.content.every((block: unknown) => {
    if (!block || typeof block !== 'object') {
      return false
    }
    const b = block as Record<string, unknown>
    // Type is required, attrs is optional (TipTap paragraphs don't have attrs)
    return typeof b.type === 'string' && (b.attrs === undefined || typeof b.attrs === 'object')
  })
}

/**
 * Parse content as blocks
 * Returns null if content is not valid block format
 */
export function parseBlockContent(content: string | null | undefined): PageBlockContent | null {
  if (!content) return null

  try {
    const parsed = JSON.parse(content.trim())
    if (isPageBlockContent(parsed)) {
      return parsed
    }
  } catch {
    // Not valid JSON
  }

  return null
}

/**
 * Serialize blocks to JSON string
 */
export function serializeBlockContent(blocks: PageBlock[]): string {
  const doc: PageBlockContent = {
    type: 'doc',
    content: blocks
  }
  return JSON.stringify(doc)
}

/**
 * Create an empty block document
 */
export function createEmptyBlockContent(): PageBlockContent {
  return {
    type: 'doc',
    content: []
  }
}

/**
 * Convert legacy HTML to a single rich text block
 * Useful for migrating old content to new format
 */
export function htmlToBlockContent(html: string): PageBlockContent {
  if (!html || html.trim() === '') {
    return createEmptyBlockContent()
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'richTextBlock',
        attrs: {
          content: html
        }
      }
    ]
  }
}

/**
 * Get content for the appropriate renderer
 * Returns { format, content } with parsed content for blocks
 */
export function getContentForRenderer(content: string | null | undefined): {
  format: ContentFormat
  blocks: PageBlockContent | null
  html: string | null
} {
  const format = detectContentFormat(content)

  if (format === 'blocks') {
    return {
      format,
      blocks: parseBlockContent(content),
      html: null
    }
  }

  if (format === 'html') {
    return {
      format,
      blocks: null,
      html: content || null
    }
  }

  return {
    format: 'empty',
    blocks: null,
    html: null
  }
}
