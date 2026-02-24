/**
 * Video Block TipTap Extension
 *
 * Custom node for displaying standalone videos in the block editor.
 * Supports paste/drop upload via /api/upload-image (accepts video MIME types).
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { VideoBlockAttrs } from '../../types/blocks'
import { videoBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import VideoBlockView from '../../components/Blocks/Views/VideoBlockView.vue'

export interface VideoBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoBlock: {
      /**
       * Insert a video block
       */
      insertVideoBlock: (attrs?: Partial<VideoBlockAttrs>) => ReturnType
      /**
       * Update video block attributes
       */
      updateVideoBlock: (attrs: Partial<VideoBlockAttrs>) => ReturnType
    }
  }
}

const videoUploadPluginKey = new PluginKey('videoBlockUpload')

async function uploadVideoFile(file: File): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await globalThis.$fetch<{ pathname: string }>('/api/upload-image', {
      method: 'POST',
      body: formData
    })
    return `/images/${result.pathname}`
  }
  catch (err) {
    console.error('Video upload failed:', err)
    return null
  }
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

export const VideoBlock = Node.create<VideoBlockOptions>({
  name: 'videoBlock',

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
      src: {
        default: videoBlockDefinition.defaultAttrs.src
      },
      caption: {
        default: videoBlockDefinition.defaultAttrs.caption
      },
      width: {
        default: videoBlockDefinition.defaultAttrs.width
      },
      autoplay: {
        default: videoBlockDefinition.defaultAttrs.autoplay
      },
      loop: {
        default: videoBlockDefinition.defaultAttrs.loop
      },
      muted: {
        default: videoBlockDefinition.defaultAttrs.muted
      },
      controls: {
        default: videoBlockDefinition.defaultAttrs.controls
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'video-block' }
    )]
  },

  addCommands() {
    return {
      insertVideoBlock: (attrs?: Partial<VideoBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...videoBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateVideoBlock: (attrs: Partial<VideoBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(VideoBlockView)
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: videoUploadPluginKey,
        props: {
          handlePaste(_view, event) {
            const items = event.clipboardData?.items
            if (!items) return false

            const videoFiles: File[] = []
            for (const item of items) {
              if (item.kind === 'file' && item.type.startsWith('video/')) {
                const file = item.getAsFile()
                if (file) videoFiles.push(file)
              }
            }

            if (videoFiles.length === 0) return false

            event.preventDefault()
            for (const file of videoFiles) {
              uploadVideoFile(file).then((src) => {
                if (src) {
                  editor.chain().focus().insertVideoBlock({ src }).run()
                }
              })
            }
            return true
          },

          handleDrop(_view, event) {
            const files = event.dataTransfer?.files
            if (!files || files.length === 0) return false

            const videoFiles = Array.from(files).filter(isVideoFile)
            if (videoFiles.length === 0) return false

            event.preventDefault()
            for (const file of videoFiles) {
              uploadVideoFile(file).then((src) => {
                if (src) {
                  editor.chain().focus().insertVideoBlock({ src }).run()
                }
              })
            }
            return true
          }
        }
      })
    ]
  }
})

export default VideoBlock
