/**
 * Collection Map Block TipTap Extension
 *
 * Custom node for embedding a collection's items as map markers.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { CollectionMapBlockAttrs } from '../../types/blocks'
import { collectionMapBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import CollectionMapBlockView from '../../components/Blocks/Views/CollectionMapBlockView.vue'

export interface CollectionMapBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collectionMapBlock: {
      /**
       * Insert a collection map block
       */
      insertCollectionMapBlock: (attrs?: Partial<CollectionMapBlockAttrs>) => ReturnType
      /**
       * Update collection map block attributes
       */
      updateCollectionMapBlock: (attrs: Partial<CollectionMapBlockAttrs>) => ReturnType
    }
  }
}

export const CollectionMapBlock = Node.create<CollectionMapBlockOptions>({
  name: 'collectionMapBlock',

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
      collection: {
        default: collectionMapBlockDefinition.defaultAttrs.collection
      },
      title: {
        default: undefined
      },
      height: {
        default: collectionMapBlockDefinition.defaultAttrs.height,
        parseHTML: element => {
          const data = element.getAttribute('data-height')
          return data ? parseInt(data, 10) : 400
        },
        renderHTML: attributes => ({
          'data-height': String(attributes.height ?? 400)
        })
      },
      zoom: {
        default: collectionMapBlockDefinition.defaultAttrs.zoom,
        parseHTML: element => {
          const data = element.getAttribute('data-zoom')
          return data ? parseInt(data, 10) : 12
        },
        renderHTML: attributes => ({
          'data-zoom': String(attributes.zoom ?? 12)
        })
      },
      style: {
        default: collectionMapBlockDefinition.defaultAttrs.style
      },
      coordinateField: {
        default: undefined
      },
      labelField: {
        default: undefined
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="collection-map-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'collection-map-block' }
    )]
  },

  addCommands() {
    return {
      insertCollectionMapBlock: (attrs?: Partial<CollectionMapBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...collectionMapBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateCollectionMapBlock: (attrs: Partial<CollectionMapBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(CollectionMapBlockView)
  }
})

export default CollectionMapBlock
