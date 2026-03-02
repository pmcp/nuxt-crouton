/**
 * Stats Block TipTap Extension
 *
 * Custom node for animated number counters.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { StatsBlockAttrs } from '../../types/blocks'
import { statsBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import StatsBlockView from '../../components/Blocks/Views/StatsBlockView.vue'

export interface StatsBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    statsBlock: {
      insertStatsBlock: (attrs?: Partial<StatsBlockAttrs>) => ReturnType
      updateStatsBlock: (attrs: Partial<StatsBlockAttrs>) => ReturnType
    }
  }
}

export const StatsBlock = Node.create<StatsBlockOptions>({
  name: 'statsBlock',

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
        default: statsBlockDefinition.defaultAttrs.headline
      },
      title: {
        default: statsBlockDefinition.defaultAttrs.title
      },
      description: {
        default: statsBlockDefinition.defaultAttrs.description
      },
      columns: {
        default: statsBlockDefinition.defaultAttrs.columns
      },
      stats: {
        default: statsBlockDefinition.defaultAttrs.stats,
        parseHTML: element => {
          const data = element.getAttribute('data-stats')
          return data ? JSON.parse(data) : []
        },
        renderHTML: attributes => {
          return {
            'data-stats': JSON.stringify(attributes.stats || [])
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="stats-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'stats-block' }
    )]
  },

  addCommands() {
    return {
      insertStatsBlock: (attrs?: Partial<StatsBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...statsBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateStatsBlock: (attrs: Partial<StatsBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(StatsBlockView)
  }
})

export default StatsBlock
