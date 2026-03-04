/**
 * Contact Block TipTap Extension
 *
 * Custom node for contact cards with manual or team member mode.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { ContactBlockAttrs } from '../../types/blocks'
import { contactBlockDefinition } from '../../utils/block-registry'
import { generateBlockId, blockIdAttribute } from './block-utils'
import ContactBlockView from '../../components/Blocks/Views/ContactBlockView.vue'

export interface ContactBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    contactBlock: {
      insertContactBlock: (attrs?: Partial<ContactBlockAttrs>) => ReturnType
      updateContactBlock: (attrs: Partial<ContactBlockAttrs>) => ReturnType
    }
  }
}

export const ContactBlock = Node.create<ContactBlockOptions>({
  name: 'contactBlock',

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
        default: contactBlockDefinition.defaultAttrs.mode
      },
      memberId: {
        default: undefined
      },
      firstName: {
        default: undefined
      },
      lastName: {
        default: undefined
      },
      email: {
        default: undefined
      },
      phone: {
        default: undefined
      },
      role: {
        default: undefined
      },
      company: {
        default: undefined
      },
      website: {
        default: undefined
      },
      avatar: {
        default: undefined
      },
      showAvatar: {
        default: true
      },
      layout: {
        default: 'vertical'
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="contact-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'contact-block' }
    )]
  },

  addCommands() {
    return {
      insertContactBlock: (attrs?: Partial<ContactBlockAttrs>) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            blockId: generateBlockId(),
            ...contactBlockDefinition.defaultAttrs,
            ...attrs
          }
        })
      },
      updateContactBlock: (attrs: Partial<ContactBlockAttrs>) => ({ commands }) => {
        return commands.updateAttributes(this.name, attrs)
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ContactBlockView)
  }
})

export default ContactBlock
