/**
 * Block Commands Extension
 *
 * Provides slash command suggestions for inserting page blocks.
 * Integrates with UEditor's suggestion system.
 */

import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { BlockMenuItem } from '../../types/blocks'
import { getBlockMenuItems, getBlocksByCategory } from '../../utils/block-registry'

export interface BlockCommandsOptions {
  suggestion: Partial<typeof Suggestion['options']>
}

export interface BlockCommandItem extends BlockMenuItem {
  command: (params: { editor: any; range: any }) => void
}

/**
 * Get command items for the suggestion menu
 */
export function getBlockCommandItems(query: string): BlockCommandItem[] {
  const items = getBlockMenuItems()

  // Filter by query
  const filtered = query
    ? items.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    )
    : items

  // Map to command items
  return filtered.map(item => ({
    ...item,
    command: ({ editor, range }) => {
      // Delete the slash command text
      editor.chain().focus().deleteRange(range).run()

      // Insert the appropriate block
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
        default:
          console.warn(`Unknown block type: ${item.type}`)
      }
    }
  }))
}

/**
 * Get command items grouped by category
 */
export function getBlockCommandsByCategory(query: string): Record<string, BlockCommandItem[]> {
  const items = getBlockCommandItems(query)

  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, BlockCommandItem[]>)
}

export const BlockCommands = Extension.create<BlockCommandsOptions>({
  name: 'blockCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: true,
        items: ({ query }) => getBlockCommandItems(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        }
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})

export default BlockCommands
