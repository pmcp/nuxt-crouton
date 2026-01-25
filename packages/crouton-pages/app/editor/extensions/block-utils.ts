/**
 * Block Editor Utilities
 *
 * Shared utilities for block extensions.
 */

/**
 * Generate a unique block ID
 * Uses a timestamp prefix + random suffix for uniqueness
 */
export function generateBlockId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `block-${timestamp}-${random}`
}

/**
 * Block ID attribute definition for TipTap extensions
 * Add this to addAttributes() in each block extension
 */
export const blockIdAttribute = {
  blockId: {
    default: null,
    parseHTML: (element: Element) => element.getAttribute('data-block-id'),
    renderHTML: (attributes: { blockId?: string }) => {
      if (!attributes.blockId) return {}
      return { 'data-block-id': attributes.blockId }
    }
  }
}
