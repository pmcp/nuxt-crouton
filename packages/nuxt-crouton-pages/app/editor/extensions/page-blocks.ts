/**
 * Page Blocks Extension Bundle
 *
 * Combines all block extensions into a single configurable extension.
 * Use this to add block editing capabilities to any TipTap editor.
 */

import { Extension } from '@tiptap/core'
import { HeroBlock } from './hero-block'
import { SectionBlock } from './section-block'
import { CTABlock } from './cta-block'
import { CardGridBlock } from './card-grid-block'
import { SeparatorBlock } from './separator-block'
import { BlockCommands } from './block-commands'

export interface PageBlocksOptions {
  /**
   * Enable specific block types (all enabled by default)
   */
  blocks?: {
    hero?: boolean
    section?: boolean
    cta?: boolean
    cardGrid?: boolean
    separator?: boolean
  }
  /**
   * Enable slash commands for block insertion
   */
  enableSlashCommands?: boolean
  /**
   * Custom suggestion options for slash commands
   */
  suggestionOptions?: Record<string, unknown>
}

export const PageBlocks = Extension.create<PageBlocksOptions>({
  name: 'pageBlocks',

  addOptions() {
    return {
      blocks: {
        hero: true,
        section: true,
        cta: true,
        cardGrid: true,
        separator: true
      },
      enableSlashCommands: true,
      suggestionOptions: {}
    }
  },

  addExtensions() {
    const extensions: Extension[] = []
    const { blocks, enableSlashCommands, suggestionOptions } = this.options

    // Add enabled block extensions
    if (blocks?.hero !== false) {
      extensions.push(HeroBlock)
    }
    if (blocks?.section !== false) {
      extensions.push(SectionBlock)
    }
    if (blocks?.cta !== false) {
      extensions.push(CTABlock)
    }
    if (blocks?.cardGrid !== false) {
      extensions.push(CardGridBlock)
    }
    if (blocks?.separator !== false) {
      extensions.push(SeparatorBlock)
    }

    // Add slash commands if enabled
    if (enableSlashCommands) {
      extensions.push(BlockCommands.configure({
        suggestion: suggestionOptions
      }))
    }

    return extensions
  }
})

// Re-export individual extensions for granular use
export { HeroBlock } from './hero-block'
export { SectionBlock } from './section-block'
export { CTABlock } from './cta-block'
export { CardGridBlock } from './card-grid-block'
export { SeparatorBlock } from './separator-block'
export { BlockCommands, getBlockCommandItems, getBlockCommandsByCategory } from './block-commands'

// Export types
export type { HeroBlockOptions } from './hero-block'
export type { SectionBlockOptions } from './section-block'
export type { CTABlockOptions } from './cta-block'
export type { CardGridBlockOptions } from './card-grid-block'
export type { SeparatorBlockOptions } from './separator-block'
export type { BlockCommandsOptions, BlockCommandItem } from './block-commands'

export default PageBlocks
