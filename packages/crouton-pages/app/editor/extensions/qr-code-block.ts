/**
 * QR Code Block TipTap Extension
 *
 * Custom node for a scannable QR code linking to a CMS page (or custom URL).
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { QrCodeBlockAttrs } from '../../types/blocks'
import { qrCodeBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import QrCodeBlockView from '../../components/Blocks/Views/QrCodeBlockView.vue'

export interface QrCodeBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    qrCodeBlock: {
      insertQrCodeBlock: (attrs?: Partial<QrCodeBlockAttrs>) => ReturnType
      updateQrCodeBlock: (attrs: Partial<QrCodeBlockAttrs>) => ReturnType
    }
  }
}

export const QrCodeBlock = Node.create<QrCodeBlockOptions>({
  name: 'qrCodeBlock',

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
      pageId: {
        default: qrCodeBlockDefinition.defaultAttrs.pageId
      },
      url: {
        default: qrCodeBlockDefinition.defaultAttrs.url
      },
      caption: {
        default: qrCodeBlockDefinition.defaultAttrs.caption
      },
      size: {
        default: qrCodeBlockDefinition.defaultAttrs.size
      },
      align: {
        default: qrCodeBlockDefinition.defaultAttrs.align
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="qr-code-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'qr-code-block' }
    )]
  },

  addCommands() {
    return {
      insertQrCodeBlock: (attrs?: Partial<QrCodeBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...qrCodeBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateQrCodeBlock: (attrs: Partial<QrCodeBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(QrCodeBlockView as any)
  }
})

export default QrCodeBlock