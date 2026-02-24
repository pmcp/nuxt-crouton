/**
 * Logo Block TipTap Extension
 *
 * Custom node for displaying a row of logos/brand icons.
 * Uses UPageLogos from Nuxt UI for rendering.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { LogoBlockAttrs } from '../../types/blocks'
import { logoBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import LogoBlockView from '../../components/Blocks/Views/LogoBlockView.vue'

export interface LogoBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    logoBlock: {
      /**
       * Insert a logo block
       */
      insertLogoBlock: (attrs?: Partial<LogoBlockAttrs>) => ReturnType
      /**
       * Update logo block attributes
       */
      updateLogoBlock: (attrs: Partial<LogoBlockAttrs>) => ReturnType
    }
  }
}

export const LogoBlock = Node.create<LogoBlockOptions>({
  name: 'logoBlock',

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
        default: logoBlockDefinition.defaultAttrs.title
      },
      marquee: {
        default: logoBlockDefinition.defaultAttrs.marquee
      },
      items: {
        default: logoBlockDefinition.defaultAttrs.items,
        parseHTML: (el) => {
          const raw = JSON.parse(el.getAttribute('data-items') || '[]')
          // Ensure backward compat: items without type get inferred
          return raw.map((item: any) => ({
            ...item,
            type: item.type || (item.value?.startsWith('i-') ? 'icon' : 'image')
          }))
        },
        renderHTML: attrs => ({ 'data-items': JSON.stringify(attrs.items) })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="logo-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'logo-block' }
    )]
  },

  addCommands() {
    return {
      insertLogoBlock: (attrs?: Partial<LogoBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...logoBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateLogoBlock: (attrs: Partial<LogoBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(LogoBlockView)
  }
})

export default LogoBlock
