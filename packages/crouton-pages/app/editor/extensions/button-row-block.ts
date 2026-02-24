/**
 * Button Row Block TipTap Extension
 *
 * Custom node for displaying a row of link/download buttons in the block editor.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { ButtonRowBlockAttrs } from '../../types/blocks'
import { buttonRowBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import ButtonRowBlockView from '../../components/Blocks/Views/ButtonRowBlockView.vue'

export interface ButtonRowBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    buttonRowBlock: {
      /**
       * Insert a button row block
       */
      insertButtonRowBlock: (attrs?: Partial<ButtonRowBlockAttrs>) => ReturnType
      /**
       * Update button row block attributes
       */
      updateButtonRowBlock: (attrs: Partial<ButtonRowBlockAttrs>) => ReturnType
    }
  }
}

export const ButtonRowBlock = Node.create<ButtonRowBlockOptions>({
  name: 'buttonRowBlock',

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
      buttons: {
        default: buttonRowBlockDefinition.defaultAttrs.buttons,
        parseHTML: (element: Element) => {
          const raw = element.getAttribute('data-buttons')
          if (!raw) return []
          try { return JSON.parse(raw) }
          catch { return [] }
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          return { 'data-buttons': JSON.stringify(attributes.buttons || []) }
        }
      },
      align: {
        default: buttonRowBlockDefinition.defaultAttrs.align
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="button-row-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'button-row-block' }
    )]
  },

  addCommands() {
    return {
      insertButtonRowBlock: (attrs?: Partial<ButtonRowBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...buttonRowBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateButtonRowBlock: (attrs: Partial<ButtonRowBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ButtonRowBlockView)
  }
})

export default ButtonRowBlock
