/**
 * CTA Block TipTap Extension
 *
 * Custom node for call-to-action sections.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { CTABlockAttrs } from '../../types/blocks'
import { ctaBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import CTABlockView from '../../components/Blocks/Views/CTABlockView.vue'

export interface CTABlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaBlock: {
      insertCTABlock: (attrs?: Partial<CTABlockAttrs>) => ReturnType
      updateCTABlock: (attrs: Partial<CTABlockAttrs>) => ReturnType
    }
  }
}

export const CTABlock = Node.create<CTABlockOptions>({
  name: 'ctaBlock',

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
      title: {
        default: ctaBlockDefinition.defaultAttrs.title
      },
      description: {
        default: ctaBlockDefinition.defaultAttrs.description
      },
      orientation: {
        default: ctaBlockDefinition.defaultAttrs.orientation
      },
      reverse: {
        default: ctaBlockDefinition.defaultAttrs.reverse
      },
      variant: {
        default: ctaBlockDefinition.defaultAttrs.variant
      },
      links: {
        default: ctaBlockDefinition.defaultAttrs.links,
        parseHTML: element => {
          const data = element.getAttribute('data-links')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => {
          return {
            'data-links': JSON.stringify(attributes.links || [])
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="cta-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'cta-block' }
    )]
  },

  addCommands() {
    return {
      insertCTABlock: (attrs?: Partial<CTABlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...ctaBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateCTABlock: (attrs: Partial<CTABlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(CTABlockView)
  }
})

export default CTABlock
