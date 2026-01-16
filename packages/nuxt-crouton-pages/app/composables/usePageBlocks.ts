/**
 * Page Blocks Composable
 *
 * Utilities for working with page block content.
 */
import type { PageBlockContent, PageBlock, BlockType } from '../types/blocks'
import {
  parseBlockContent,
  serializeBlockContent,
  detectContentFormat,
  createEmptyBlockContent,
  htmlToBlockContent
} from '../utils/content-detector'
import {
  getBlockDefinition,
  getBlockDefaultAttrs,
  getAllBlockTypes,
  getBlockMenuItems,
  getBlocksByCategory,
  createBlock
} from '../utils/block-registry'

export function usePageBlocks() {
  /**
   * Parse JSON content string to PageBlockContent
   */
  function parse(content: string | null | undefined): PageBlockContent | null {
    return parseBlockContent(content)
  }

  /**
   * Serialize blocks to JSON string
   */
  function serialize(blocks: PageBlock[]): string {
    return serializeBlockContent(blocks)
  }

  /**
   * Detect content format (blocks, html, empty)
   */
  function detectFormat(content: string | null | undefined) {
    return detectContentFormat(content)
  }

  /**
   * Create an empty block document
   */
  function createEmpty(): PageBlockContent {
    return createEmptyBlockContent()
  }

  /**
   * Convert legacy HTML to block format
   */
  function fromHtml(html: string): PageBlockContent {
    return htmlToBlockContent(html)
  }

  /**
   * Add a block to existing content
   */
  function addBlock(
    content: PageBlockContent | string | null,
    blockType: BlockType,
    attrs?: Record<string, unknown>,
    position?: number
  ): PageBlockContent {
    const doc = typeof content === 'string'
      ? parse(content) || createEmpty()
      : content || createEmpty()

    const block = createBlock(blockType, attrs)

    if (position !== undefined && position >= 0 && position < doc.content.length) {
      doc.content.splice(position, 0, block)
    } else {
      doc.content.push(block)
    }

    return doc
  }

  /**
   * Remove a block by index
   */
  function removeBlock(
    content: PageBlockContent | string | null,
    index: number
  ): PageBlockContent {
    const doc = typeof content === 'string'
      ? parse(content) || createEmpty()
      : content || createEmpty()

    if (index >= 0 && index < doc.content.length) {
      doc.content.splice(index, 1)
    }

    return doc
  }

  /**
   * Update a block's attributes
   */
  function updateBlock(
    content: PageBlockContent | string | null,
    index: number,
    attrs: Partial<Record<string, unknown>>
  ): PageBlockContent {
    const doc = typeof content === 'string'
      ? parse(content) || createEmpty()
      : content || createEmpty()

    if (index >= 0 && index < doc.content.length) {
      doc.content[index] = {
        ...doc.content[index],
        attrs: {
          ...doc.content[index].attrs,
          ...attrs
        }
      }
    }

    return doc
  }

  /**
   * Move a block to a new position
   */
  function moveBlock(
    content: PageBlockContent | string | null,
    fromIndex: number,
    toIndex: number
  ): PageBlockContent {
    const doc = typeof content === 'string'
      ? parse(content) || createEmpty()
      : content || createEmpty()

    if (
      fromIndex >= 0 &&
      fromIndex < doc.content.length &&
      toIndex >= 0 &&
      toIndex < doc.content.length
    ) {
      const [block] = doc.content.splice(fromIndex, 1)
      doc.content.splice(toIndex, 0, block)
    }

    return doc
  }

  /**
   * Get available block types
   */
  function getAvailableBlocks() {
    return getBlockMenuItems()
  }

  /**
   * Get block types grouped by category
   */
  function getBlockCategories() {
    return getBlocksByCategory()
  }

  /**
   * Get definition for a block type
   */
  function getDefinition(type: BlockType) {
    return getBlockDefinition(type)
  }

  /**
   * Get default attributes for a block type
   */
  function getDefaults(type: BlockType) {
    return getBlockDefaultAttrs(type)
  }

  return {
    // Parsing
    parse,
    serialize,
    detectFormat,

    // Creation
    createEmpty,
    fromHtml,
    createBlock,

    // Manipulation
    addBlock,
    removeBlock,
    updateBlock,
    moveBlock,

    // Registry
    getAvailableBlocks,
    getBlockCategories,
    getDefinition,
    getDefaults,
    getAllBlockTypes
  }
}
