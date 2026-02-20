/**
 * Map Block TipTap Extension
 *
 * Custom node for embedding interactive maps in the block editor.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { MapBlockAttrs } from '../../types/blocks'
import { mapBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import MapBlockView from '../../components/Blocks/Views/MapBlockView.vue'

export interface MapBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mapBlock: {
      /**
       * Insert a map block
       */
      insertMapBlock: (attrs?: Partial<MapBlockAttrs>) => ReturnType
      /**
       * Update map block attributes
       */
      updateMapBlock: (attrs: Partial<MapBlockAttrs>) => ReturnType
    }
  }
}

export const MapBlock = Node.create<MapBlockOptions>({
  name: 'mapBlock',

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
      address: {
        default: undefined
      },
      lat: {
        default: mapBlockDefinition.defaultAttrs.lat,
        parseHTML: element => {
          const data = element.getAttribute('data-lat')
          return data ? parseFloat(data) : 0
        },
        renderHTML: attributes => ({
          'data-lat': String(attributes.lat ?? 0)
        })
      },
      lng: {
        default: mapBlockDefinition.defaultAttrs.lng,
        parseHTML: element => {
          const data = element.getAttribute('data-lng')
          return data ? parseFloat(data) : 0
        },
        renderHTML: attributes => ({
          'data-lng': String(attributes.lng ?? 0)
        })
      },
      zoom: {
        default: mapBlockDefinition.defaultAttrs.zoom,
        parseHTML: element => {
          const data = element.getAttribute('data-zoom')
          return data ? parseInt(data, 10) : 12
        },
        renderHTML: attributes => ({
          'data-zoom': String(attributes.zoom ?? 12)
        })
      },
      style: {
        default: mapBlockDefinition.defaultAttrs.style
      },
      height: {
        default: mapBlockDefinition.defaultAttrs.height,
        parseHTML: element => {
          const data = element.getAttribute('data-height')
          return data ? parseInt(data, 10) : 400
        },
        renderHTML: attributes => ({
          'data-height': String(attributes.height ?? 400)
        })
      },
      markerLabel: {
        default: undefined
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="map-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'map-block' }
    )]
  },

  addCommands() {
    return {
      insertMapBlock: (attrs?: Partial<MapBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...mapBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateMapBlock: (attrs: Partial<MapBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(MapBlockView)
  }
})

export default MapBlock
