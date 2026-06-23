/**
 * Pane Block TipTap Extension (#706 / #716)
 *
 * Custom atom node that hosts a *pane layout* inside the document flow. Its
 * `layout` attribute is a `LayoutTree` (the "layout is data" shape) edited inline
 * by the PaneBlockView composer (CroutonLayout). This is what lets a `paneBlock`
 * round-trip through an editor save: the layout tree serializes into the page's
 * `content` JSON like any other block. The `layout` attr (de)serializes to a
 * `data-layout` JSON attribute so HTML clipboard round-trips don't drop it.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { PaneBlockAttrs } from '../../types/blocks'
import { paneBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import PaneBlockView from '../../components/Blocks/Views/PaneBlockView.vue'

export interface PaneBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paneBlock: {
      insertPaneBlock: (attrs?: Partial<PaneBlockAttrs>) => ReturnType
      updatePaneBlock: (attrs: Partial<PaneBlockAttrs>) => ReturnType
    }
  }
}

export const PaneBlock = Node.create<PaneBlockOptions>({
  name: 'paneBlock',

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
      layout: {
        default: paneBlockDefinition.defaultAttrs.layout,
        // Survive an HTML round-trip (JSON storage keeps the object directly).
        parseHTML: (el) => {
          const raw = el.getAttribute('data-layout')
          if (!raw) return null
          try {
            return JSON.parse(raw)
          }
          catch {
            return null
          }
        },
        renderHTML: (attrs) =>
          attrs.layout ? { 'data-layout': JSON.stringify(attrs.layout) } : {}
      },
      height: {
        default: paneBlockDefinition.defaultAttrs.height
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pane-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'pane-block' }
    )]
  },

  addCommands() {
    return {
      insertPaneBlock: (attrs?: Partial<PaneBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...paneBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updatePaneBlock: (attrs: Partial<PaneBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(PaneBlockView as any)
  }
})

export default PaneBlock
