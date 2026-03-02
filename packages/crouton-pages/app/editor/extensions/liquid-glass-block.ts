/**
 * Liquid Glass Block TipTap Extension
 *
 * Custom node for Apple-style liquid glass cards.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { LiquidGlassBlockAttrs } from '../../types/blocks'
import { liquidGlassBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import LiquidGlassBlockView from '../../components/Blocks/Views/LiquidGlassBlockView.vue'

export interface LiquidGlassBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    liquidGlassBlock: {
      insertLiquidGlassBlock: (attrs?: Partial<LiquidGlassBlockAttrs>) => ReturnType
      updateLiquidGlassBlock: (attrs: Partial<LiquidGlassBlockAttrs>) => ReturnType
    }
  }
}

export const LiquidGlassBlock = Node.create<LiquidGlassBlockOptions>({
  name: 'liquidGlassBlock',

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
        default: liquidGlassBlockDefinition.defaultAttrs.title
      },
      description: {
        default: liquidGlassBlockDefinition.defaultAttrs.description
      },
      icon: {
        default: liquidGlassBlockDefinition.defaultAttrs.icon
      },
      frost: {
        default: liquidGlassBlockDefinition.defaultAttrs.frost
      },
      radius: {
        default: liquidGlassBlockDefinition.defaultAttrs.radius
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="liquid-glass-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'liquid-glass-block' }
    )]
  },

  addCommands() {
    return {
      insertLiquidGlassBlock: (attrs?: Partial<LiquidGlassBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...liquidGlassBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateLiquidGlassBlock: (attrs: Partial<LiquidGlassBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(LiquidGlassBlockView)
  }
})

export default LiquidGlassBlock
