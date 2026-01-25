/**
 * Card Grid Block TipTap Extension
 *
 * Custom node for grid layouts of cards.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { CardGridBlockAttrs } from '../../types/blocks'
import { cardGridBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import CardGridBlockView from '../../components/Blocks/Views/CardGridBlockView.vue'

export interface CardGridBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardGridBlock: {
      insertCardGridBlock: (attrs?: Partial<CardGridBlockAttrs>) => ReturnType
      updateCardGridBlock: (attrs: Partial<CardGridBlockAttrs>) => ReturnType
    }
  }
}

export const CardGridBlock = Node.create<CardGridBlockOptions>({
  name: 'cardGridBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      ...blockIdAttribute,
      headline: {
        default: cardGridBlockDefinition.defaultAttrs.headline
      },
      title: {
        default: cardGridBlockDefinition.defaultAttrs.title
      },
      description: {
        default: cardGridBlockDefinition.defaultAttrs.description
      },
      columns: {
        default: cardGridBlockDefinition.defaultAttrs.columns
      },
      cards: {
        default: cardGridBlockDefinition.defaultAttrs.cards,
        parseHTML: element => {
          const data = element.getAttribute('data-cards')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => {
          return {
            'data-cards': JSON.stringify(attributes.cards || [])
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="card-grid-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'card-grid-block' }
    )]
  },

  addCommands() {
    return {
      insertCardGridBlock: (attrs?: Partial<CardGridBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...cardGridBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateCardGridBlock: (attrs: Partial<CardGridBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(CardGridBlockView)
  }
})

export default CardGridBlock
