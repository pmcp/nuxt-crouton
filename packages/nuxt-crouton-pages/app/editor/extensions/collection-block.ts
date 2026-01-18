/**
 * Collection Block TipTap Extension
 *
 * Custom node for embedding collections in the block editor.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { CollectionBlockAttrs } from '../../types/blocks'
import { collectionBlockDefinition } from '../../utils/block-registry'
import CollectionBlockView from '../../components/Blocks/Views/CollectionBlockView.vue'

export interface CollectionBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collectionBlock: {
      /**
       * Insert a collection block
       */
      insertCollectionBlock: (attrs?: Partial<CollectionBlockAttrs>) => ReturnType
      /**
       * Update collection block attributes
       */
      updateCollectionBlock: (attrs: Partial<CollectionBlockAttrs>) => ReturnType
    }
  }
}

export const CollectionBlock = Node.create<CollectionBlockOptions>({
  name: 'collectionBlock',

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
      collection: {
        default: collectionBlockDefinition.defaultAttrs.collection
      },
      title: {
        default: collectionBlockDefinition.defaultAttrs.title
      },
      layout: {
        default: collectionBlockDefinition.defaultAttrs.layout
      },
      pageSize: {
        default: collectionBlockDefinition.defaultAttrs.pageSize,
        parseHTML: element => {
          const data = element.getAttribute('data-page-size')
          return data ? parseInt(data, 10) : 10
        },
        renderHTML: attributes => {
          return {
            'data-page-size': String(attributes.pageSize || 10)
          }
        }
      },
      showPagination: {
        default: collectionBlockDefinition.defaultAttrs.showPagination,
        parseHTML: element => {
          const data = element.getAttribute('data-show-pagination')
          return data !== 'false'
        },
        renderHTML: attributes => {
          return {
            'data-show-pagination': String(attributes.showPagination !== false)
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="collection-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'collection-block' }
    )]
  },

  addCommands() {
    return {
      insertCollectionBlock: (attrs?: Partial<CollectionBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            ...collectionBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateCollectionBlock: (attrs: Partial<CollectionBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(CollectionBlockView)
  }
})

export default CollectionBlock
