/**
 * Mailing Block TipTap Extension
 *
 * Custom node for email subscription forms (Mailchimp, etc.).
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { MailingBlockAttrs } from '../../types/blocks'
import { mailingBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import MailingBlockView from '../../components/Blocks/Views/MailingBlockView.vue'

export interface MailingBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mailingBlock: {
      insertMailingBlock: (attrs?: Partial<MailingBlockAttrs>) => ReturnType
      updateMailingBlock: (attrs: Partial<MailingBlockAttrs>) => ReturnType
    }
  }
}

export const MailingBlock = Node.create<MailingBlockOptions>({
  name: 'mailingBlock',

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
      actionUrl: {
        default: mailingBlockDefinition.defaultAttrs.actionUrl
      },
      provider: {
        default: mailingBlockDefinition.defaultAttrs.provider
      },
      emailFieldName: {
        default: mailingBlockDefinition.defaultAttrs.emailFieldName
      },
      honeypotFieldName: {
        default: undefined
      },
      title: {
        default: mailingBlockDefinition.defaultAttrs.title
      },
      description: {
        default: undefined
      },
      buttonLabel: {
        default: mailingBlockDefinition.defaultAttrs.buttonLabel
      },
      placeholder: {
        default: mailingBlockDefinition.defaultAttrs.placeholder
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mailing-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'mailing-block' }
    )]
  },

  addCommands() {
    return {
      insertMailingBlock: (attrs?: Partial<MailingBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...mailingBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateMailingBlock: (attrs: Partial<MailingBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(MailingBlockView)
  }
})

export default MailingBlock
