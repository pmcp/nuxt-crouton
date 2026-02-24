/**
 * File Block TipTap Extension
 *
 * Custom node for displaying a file download button in the block editor.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { FileBlockAttrs } from '../../types/blocks'
import { fileBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import FileBlockView from '../../components/Blocks/Views/FileBlockView.vue'

export interface FileBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileBlock: {
      /**
       * Insert a file block
       */
      insertFileBlock: (attrs?: Partial<FileBlockAttrs>) => ReturnType
      /**
       * Update file block attributes
       */
      updateFileBlock: (attrs: Partial<FileBlockAttrs>) => ReturnType
    }
  }
}

export const FileBlock = Node.create<FileBlockOptions>({
  name: 'fileBlock',

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
      label: {
        default: fileBlockDefinition.defaultAttrs.label
      },
      file: {
        default: fileBlockDefinition.defaultAttrs.file
      },
      fileName: {
        default: fileBlockDefinition.defaultAttrs.fileName
      },
      icon: {
        default: fileBlockDefinition.defaultAttrs.icon
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'file-block' }
    )]
  },

  addCommands() {
    return {
      insertFileBlock: (attrs?: Partial<FileBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...fileBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateFileBlock: (attrs: Partial<FileBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(FileBlockView)
  }
})

export default FileBlock
