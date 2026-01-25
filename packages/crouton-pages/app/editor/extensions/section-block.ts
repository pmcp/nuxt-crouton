/**
 * Section Block TipTap Extension
 *
 * Custom node for page sections with features.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { SectionBlockAttrs } from '../../types/blocks'
import { sectionBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import SectionBlockView from '../../components/Blocks/Views/SectionBlockView.vue'

export interface SectionBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sectionBlock: {
      insertSectionBlock: (attrs?: Partial<SectionBlockAttrs>) => ReturnType
      updateSectionBlock: (attrs: Partial<SectionBlockAttrs>) => ReturnType
    }
  }
}

export const SectionBlock = Node.create<SectionBlockOptions>({
  name: 'sectionBlock',

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
        default: sectionBlockDefinition.defaultAttrs.headline
      },
      icon: {
        default: sectionBlockDefinition.defaultAttrs.icon
      },
      title: {
        default: sectionBlockDefinition.defaultAttrs.title
      },
      description: {
        default: sectionBlockDefinition.defaultAttrs.description
      },
      orientation: {
        default: sectionBlockDefinition.defaultAttrs.orientation
      },
      reverse: {
        default: sectionBlockDefinition.defaultAttrs.reverse
      },
      links: {
        default: sectionBlockDefinition.defaultAttrs.links,
        parseHTML: element => {
          const data = element.getAttribute('data-links')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => {
          return {
            'data-links': JSON.stringify(attributes.links || [])
          }
        }
      },
      features: {
        default: sectionBlockDefinition.defaultAttrs.features,
        parseHTML: element => {
          const data = element.getAttribute('data-features')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => {
          return {
            'data-features': JSON.stringify(attributes.features || [])
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="section-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'section-block' }
    )]
  },

  addCommands() {
    return {
      insertSectionBlock: (attrs?: Partial<SectionBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...sectionBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateSectionBlock: (attrs: Partial<SectionBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SectionBlockView)
  }
})

export default SectionBlock
