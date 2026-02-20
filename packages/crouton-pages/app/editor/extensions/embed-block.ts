/**
 * Embed Block TipTap Extension
 *
 * Custom node for embedding YouTube videos, Figma files, or any URL
 * in the block editor. Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { EmbedBlockAttrs } from '../../types/blocks'
import { embedBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import EmbedBlockView from '../../components/Blocks/Views/EmbedBlockView.vue'

export interface EmbedBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedBlock: {
      /**
       * Insert an embed block
       */
      insertEmbedBlock: (attrs?: Partial<EmbedBlockAttrs>) => ReturnType
      /**
       * Update embed block attributes
       */
      updateEmbedBlock: (attrs: Partial<EmbedBlockAttrs>) => ReturnType
    }
  }
}

export const EmbedBlock = Node.create<EmbedBlockOptions>({
  name: 'embedBlock',

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
      url: {
        default: embedBlockDefinition.defaultAttrs.url
      },
      provider: {
        default: embedBlockDefinition.defaultAttrs.provider
      },
      height: {
        default: embedBlockDefinition.defaultAttrs.height,
        parseHTML: element => {
          const data = element.getAttribute('data-height')
          return data ? parseInt(data, 10) : 400
        },
        renderHTML: attributes => ({
          'data-height': String(attributes.height ?? 400)
        })
      },
      caption: {
        default: embedBlockDefinition.defaultAttrs.caption
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'embed-block' }
    )]
  },

  addCommands() {
    return {
      insertEmbedBlock: (attrs?: Partial<EmbedBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...embedBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateEmbedBlock: (attrs: Partial<EmbedBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(EmbedBlockView)
  }
})

export default EmbedBlock
