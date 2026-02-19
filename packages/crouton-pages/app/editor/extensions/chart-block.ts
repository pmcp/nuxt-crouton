/**
 * Chart Block TipTap Extension
 *
 * Custom node for embedding collection charts in the block editor.
 * Renders using a Vue NodeView component.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { ChartBlockAttrs } from '../../types/blocks'
import { chartBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import ChartBlockView from '../../components/Blocks/Views/ChartBlockView.vue'

export interface ChartBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chartBlock: {
      /**
       * Insert a chart block
       */
      insertChartBlock: (attrs?: Partial<ChartBlockAttrs>) => ReturnType
      /**
       * Update chart block attributes
       */
      updateChartBlock: (attrs: Partial<ChartBlockAttrs>) => ReturnType
    }
  }
}

export const ChartBlock = Node.create<ChartBlockOptions>({
  name: 'chartBlock',

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
      mode: {
        default: chartBlockDefinition.defaultAttrs.mode || 'collection'
      },
      preset: {
        default: undefined
      },
      collection: {
        default: chartBlockDefinition.defaultAttrs.collection
      },
      chartType: {
        default: chartBlockDefinition.defaultAttrs.chartType
      },
      xField: {
        default: undefined
      },
      yFields: {
        default: undefined
      },
      title: {
        default: undefined
      },
      height: {
        default: chartBlockDefinition.defaultAttrs.height,
        parseHTML: element => {
          const data = element.getAttribute('data-height')
          return data ? parseInt(data, 10) : 300
        },
        renderHTML: attributes => {
          return {
            'data-height': String(attributes.height || 300)
          }
        }
      },
      stacked: {
        default: chartBlockDefinition.defaultAttrs.stacked,
        parseHTML: element => {
          const data = element.getAttribute('data-stacked')
          return data === 'true'
        },
        renderHTML: attributes => {
          return {
            'data-stacked': String(attributes.stacked === true)
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'chart-block' }
    )]
  },

  addCommands() {
    return {
      insertChartBlock: (attrs?: Partial<ChartBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...chartBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateChartBlock: (attrs: Partial<ChartBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ChartBlockView)
  }
})

export default ChartBlock
