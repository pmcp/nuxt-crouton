/**
 * Two Column Block TipTap Extension
 *
 * Custom node for side-by-side two-column layouts.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { TwoColumnBlockAttrs } from '../../types/blocks'
import { twoColumnBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import TwoColumnBlockView from '../../components/Blocks/Views/TwoColumnBlockView.vue'

export interface TwoColumnBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    twoColumnBlock: {
      insertTwoColumnBlock: (attrs?: Partial<TwoColumnBlockAttrs>) => ReturnType
      updateTwoColumnBlock: (attrs: Partial<TwoColumnBlockAttrs>) => ReturnType
    }
  }
}

export const TwoColumnBlock = Node.create<TwoColumnBlockOptions>({
  name: 'twoColumnBlock',

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
      split: { default: twoColumnBlockDefinition.defaultAttrs.split },
      leftTitle: { default: twoColumnBlockDefinition.defaultAttrs.leftTitle },
      leftDescription: { default: twoColumnBlockDefinition.defaultAttrs.leftDescription },
      leftImage: { default: undefined },
      leftLinks: {
        default: [],
        parseHTML: element => {
          const data = element.getAttribute('data-left-links')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => ({
          'data-left-links': JSON.stringify(attributes.leftLinks || [])
        })
      },
      rightTitle: { default: twoColumnBlockDefinition.defaultAttrs.rightTitle },
      rightDescription: { default: twoColumnBlockDefinition.defaultAttrs.rightDescription },
      rightImage: { default: undefined },
      rightLinks: {
        default: [],
        parseHTML: element => {
          const data = element.getAttribute('data-right-links')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => ({
          'data-right-links': JSON.stringify(attributes.rightLinks || [])
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="two-column-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'two-column-block' }
    )]
  },

  addCommands() {
    return {
      insertTwoColumnBlock: (attrs?: Partial<TwoColumnBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...twoColumnBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateTwoColumnBlock: (attrs: Partial<TwoColumnBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TwoColumnBlockView)
  }
})

export default TwoColumnBlock
