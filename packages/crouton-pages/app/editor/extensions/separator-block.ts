/**
 * Separator Block TipTap Extension
 *
 * Custom node for visual dividers between sections.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { SeparatorBlockAttrs } from '../../types/blocks'
import { separatorBlockDefinition } from '../../utils/block-registry'
import SeparatorBlockView from '../../components/Blocks/Views/SeparatorBlockView.vue'

export interface SeparatorBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    separatorBlock: {
      insertSeparatorBlock: (attrs?: Partial<SeparatorBlockAttrs>) => ReturnType
      updateSeparatorBlock: (attrs: Partial<SeparatorBlockAttrs>) => ReturnType
    }
  }
}

export const SeparatorBlock = Node.create<SeparatorBlockOptions>({
  name: 'separatorBlock',

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
      label: {
        default: separatorBlockDefinition.defaultAttrs.label
      },
      icon: {
        default: separatorBlockDefinition.defaultAttrs.icon
      },
      type: {
        default: separatorBlockDefinition.defaultAttrs.type
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="separator-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'separator-block' }
    )]
  },

  addCommands() {
    return {
      insertSeparatorBlock: (attrs?: Partial<SeparatorBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            ...separatorBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateSeparatorBlock: (attrs: Partial<SeparatorBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SeparatorBlockView)
  }
})

export default SeparatorBlock
