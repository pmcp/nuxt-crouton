/**
 * actionButton — TipTap leaf node extension for Pi-proposed action buttons.
 *
 * PR 2 of the notion-slideover series. Pi appends `actionButton` blocks into
 * the per-node Y.XmlFragment via the worker-side `pi.appendActionButton` tool;
 * this extension is what turns those Y.XmlElements into a clickable Vue
 * NodeView in the slideover editor.
 *
 * Schema notes:
 *   - Atom (no inner content) — buttons are pure attribute payloads.
 *   - Block group — buttons sit at the top level of the doc, like paragraphs.
 *   - Attributes are stored as strings on the underlying Y.XmlElement (yjs
 *     attribute storage is string-only). `payload` is JSON-encoded; `consumed`
 *     is encoded as 'true'/'false'. parseHTML/renderHTML reverse the encoding
 *     so the NodeView always sees real types.
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ActionButtonBlock from '../components/Blocks/ActionButtonBlock.vue'

export interface ActionButtonAttrs {
  label: string
  icon: string
  kind: string
  /** null = no payload (NodeView handlers must treat null as `{}`) */
  payload: Record<string, unknown> | null
  consumed: boolean
  /** Optional metadata set after a successful click — e.g. createdNodeId */
  result: Record<string, unknown> | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    actionButton: {
      /** Insert an action button at the current selection. */
      insertActionButton: (attrs: Partial<ActionButtonAttrs>) => ReturnType
      /**
       * Insert a hard-coded debug action button. Zero-arg variant used by the
       * dev-only slash menu entry in NodeBlockEditor — the slash menu in
       * CroutonEditorBlocks only invokes commands as `editor.commands[name]()`,
       * so a parameterised insert can't be wired through it directly.
       */
      insertActionButtonDebug: () => ReturnType
      /** Mark a button as consumed (used by the click handler). */
      consumeActionButton: (extra?: Record<string, unknown>) => ReturnType
    }
  }
}

function parseJsonAttr<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return (raw as T) ?? fallback
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const ActionButton = Node.create({
  name: 'actionButton',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: el => el.getAttribute('data-label') ?? '',
        renderHTML: attrs => ({ 'data-label': String(attrs.label ?? '') }),
      },
      icon: {
        default: 'i-lucide-plus',
        parseHTML: el => el.getAttribute('data-icon') ?? 'i-lucide-plus',
        renderHTML: attrs => ({ 'data-icon': String(attrs.icon ?? 'i-lucide-plus') }),
      },
      kind: {
        default: '',
        parseHTML: el => el.getAttribute('data-kind') ?? '',
        renderHTML: attrs => ({ 'data-kind': String(attrs.kind ?? '') }),
      },
      payload: {
        // TipTap stores `default` as-is, so a function default would be stored
        // as the literal function value. Use null for "no payload" — the
        // NodeView treats null and missing keys as an empty object.
        default: null,
        // y-prosemirror feeds attribute values back as the raw string from the
        // Y.XmlElement. Parse the JSON envelope so the NodeView gets a real object.
        parseHTML: el => parseJsonAttr<Record<string, unknown> | null>(el.getAttribute('data-payload'), null),
        renderHTML: (attrs) => {
          const payload = attrs.payload
          if (payload == null) return {}
          return { 'data-payload': typeof payload === 'string' ? payload : JSON.stringify(payload) }
        },
      },
      consumed: {
        default: false,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-consumed')
          if (raw === null) return false
          return raw === 'true' || raw === '1'
        },
        renderHTML: attrs => ({ 'data-consumed': attrs.consumed ? 'true' : 'false' }),
      },
      result: {
        default: null,
        parseHTML: el => parseJsonAttr<Record<string, unknown> | null>(el.getAttribute('data-result'), null),
        renderHTML: (attrs) => {
          if (attrs.result == null) return {}
          const value = typeof attrs.result === 'string' ? attrs.result : JSON.stringify(attrs.result)
          return { 'data-result': value }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="action-button"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'action-button' })]
  },

  addCommands() {
    return {
      insertActionButton:
        (attrs: Partial<ActionButtonAttrs>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'actionButton',
            attrs: {
              label: 'Action',
              icon: 'i-lucide-plus',
              kind: '',
              payload: null,
              consumed: false,
              result: null,
              ...attrs,
            },
          })
        },
      insertActionButtonDebug:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'actionButton',
            attrs: {
              label: 'Create child: Debug button',
              icon: 'i-lucide-plus',
              kind: 'create-child',
              payload: {
                title: 'Debug child node',
                brief: 'Inserted via the dev-only slash menu for PR 2 testing.',
              },
              consumed: false,
              result: null,
            },
          })
        },
      consumeActionButton:
        (extra?: Record<string, unknown>) =>
        ({ commands }) => {
          return commands.updateAttributes('actionButton', {
            consumed: true,
            result: extra ?? null,
          })
        },
    }
  },

  addNodeView() {
    // Cast matches the codebase pattern in crouton-pages/AddonBlockView and
    // crouton-charts — TipTap's `Component<NodeViewProps>` is too strict for
    // `defineProps<{...}>()`-style SFCs.
    return VueNodeViewRenderer(ActionButtonBlock as unknown as Parameters<typeof VueNodeViewRenderer>[0])
  },
})

export default ActionButton
