/**
 * Gallery Block TipTap Extension
 *
 * Custom node for expandable image galleries.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { GalleryBlockAttrs } from '../../types/blocks'
import { galleryBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import GalleryBlockView from '../../components/Blocks/Views/GalleryBlockView.vue'

export interface GalleryBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    galleryBlock: {
      insertGalleryBlock: (attrs?: Partial<GalleryBlockAttrs>) => ReturnType
      updateGalleryBlock: (attrs: Partial<GalleryBlockAttrs>) => ReturnType
    }
  }
}

export const GalleryBlock = Node.create<GalleryBlockOptions>({
  name: 'galleryBlock',

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
        default: galleryBlockDefinition.defaultAttrs.headline
      },
      title: {
        default: galleryBlockDefinition.defaultAttrs.title
      },
      description: {
        default: galleryBlockDefinition.defaultAttrs.description
      },
      height: {
        default: galleryBlockDefinition.defaultAttrs.height
      },
      images: {
        default: galleryBlockDefinition.defaultAttrs.images,
        parseHTML: element => {
          const data = element.getAttribute('data-images')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => {
          return {
            'data-images': JSON.stringify(attributes.images || [])
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="gallery-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'gallery-block' }
    )]
  },

  addCommands() {
    return {
      insertGalleryBlock: (attrs?: Partial<GalleryBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...galleryBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateGalleryBlock: (attrs: Partial<GalleryBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(GalleryBlockView as any)
  }
})

export default GalleryBlock
