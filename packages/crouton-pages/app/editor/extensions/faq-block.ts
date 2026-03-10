/**
 * FAQ Block TipTap Extension
 *
 * Custom node for FAQ accordions.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { FaqBlockAttrs } from '../../types/blocks'
import { faqBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import FaqBlockView from '../../components/Blocks/Views/FaqBlockView.vue'

export interface FaqBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    faqBlock: {
      insertFaqBlock: (attrs?: Partial<FaqBlockAttrs>) => ReturnType
      updateFaqBlock: (attrs: Partial<FaqBlockAttrs>) => ReturnType
    }
  }
}

export const FaqBlock = Node.create<FaqBlockOptions>({
  name: 'faqBlock',

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
      headline: { default: undefined },
      title: { default: faqBlockDefinition.defaultAttrs.title },
      description: { default: undefined },
      allowMultiple: { default: faqBlockDefinition.defaultAttrs.allowMultiple },
      items: {
        default: faqBlockDefinition.defaultAttrs.items,
        parseHTML: element => {
          const data = element.getAttribute('data-items')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => ({
          'data-items': JSON.stringify(attributes.items || [])
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="faq-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'faq-block' }
    )]
  },

  addCommands() {
    return {
      insertFaqBlock: (attrs?: Partial<FaqBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...faqBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateFaqBlock: (attrs: Partial<FaqBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(FaqBlockView as any)
  }
})

export default FaqBlock
