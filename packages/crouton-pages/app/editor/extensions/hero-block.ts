/**
 * Hero Block TipTap Extension
 *
 * Custom node for hero sections in the block editor.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { HeroBlockAttrs } from '../../types/blocks'
import { heroBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import HeroBlockView from '../../components/Blocks/Views/HeroBlockView.vue'

export interface HeroBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    heroBlock: {
      /**
       * Insert a hero block
       */
      insertHeroBlock: (attrs?: Partial<HeroBlockAttrs>) => ReturnType
      /**
       * Update hero block attributes
       */
      updateHeroBlock: (attrs: Partial<HeroBlockAttrs>) => ReturnType
    }
  }
}

export const HeroBlock = Node.create<HeroBlockOptions>({
  name: 'heroBlock',

  group: 'block',

  atom: true, // Block is a single unit, not editable inline

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
        default: heroBlockDefinition.defaultAttrs.headline
      },
      title: {
        default: heroBlockDefinition.defaultAttrs.title
      },
      description: {
        default: heroBlockDefinition.defaultAttrs.description
      },
      orientation: {
        default: heroBlockDefinition.defaultAttrs.orientation
      },
      reverse: {
        default: heroBlockDefinition.defaultAttrs.reverse
      },
      links: {
        default: heroBlockDefinition.defaultAttrs.links,
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
      image: {
        default: heroBlockDefinition.defaultAttrs.image
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="hero-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'hero-block' }
    )]
  },

  addCommands() {
    return {
      insertHeroBlock: (attrs?: Partial<HeroBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...heroBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateHeroBlock: (attrs: Partial<HeroBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(HeroBlockView)
  }
})

export default HeroBlock
