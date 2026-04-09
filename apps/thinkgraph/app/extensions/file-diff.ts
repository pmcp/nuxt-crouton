/**
 * fileDiff — TipTap leaf node extension for Pi-proposed inline file diffs.
 *
 * PR 4 of the notion-slideover series. Pi appends `fileDiff` blocks into
 * the per-node Y.XmlFragment via the worker-side `pi.appendFileDiff` tool;
 * this extension turns those Y.XmlElements into a collapsible Vue NodeView
 * that renders the unified diff with +/− line coloring.
 *
 * Read-only by design: the block has no apply / reject affordance. If Pi
 * wants the human to act on a diff, it can append a separate actionButton
 * block next to it via PR 2's surface.
 *
 * Schema notes:
 *   - Atom (no inner content) — diffs are pure attribute payloads.
 *   - Block group — diffs sit at the top level of the doc, like paragraphs.
 *   - All attributes are plain strings (no JSON envelope like actionButton's
 *     `payload` — the diff is already a string, and collapsed is encoded as
 *     'true'/'false' per Yjs attribute-storage rules).
 *   - The `diff` attribute can hold kilobytes of text. y-prosemirror round-trips
 *     long attribute strings fine — they live inside the Yjs update stream
 *     alongside any other XmlElement attribute, no chunking needed.
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FileDiffBlock from '../components/Blocks/FileDiffBlock.vue'

export interface FileDiffAttrs {
  filePath: string
  /** Empty string = unset; the NodeView auto-detects from the file extension. */
  language: string
  /** Unified diff text, verbatim. */
  diff: string
  collapsed: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileDiff: {
      /** Insert a file diff at the current selection. */
      insertFileDiff: (attrs: Partial<FileDiffAttrs>) => ReturnType
      /**
       * Insert a hard-coded debug file diff. Zero-arg variant used by the
       * dev-only slash menu entry in NodeBlockEditor — the slash menu in
       * CroutonEditorBlocks only invokes commands as `editor.commands[name]()`,
       * so a parameterised insert can't be wired through it directly.
       */
      insertFileDiffDebug: () => ReturnType
    }
  }
}

const DEBUG_DIFF = `@@ -1,5 +1,7 @@
 import { computed } from 'vue'
-import { useOldThing } from './old-thing'
+import { useNewThing } from './new-thing'
+import { useExtraThing } from './extra-thing'

 export function useExample() {
-  return useOldThing()
+  const extra = useExtraThing()
+  return useNewThing(extra)
 }
`

export const FileDiff = Node.create({
  name: 'fileDiff',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      filePath: {
        default: '',
        parseHTML: el => el.getAttribute('data-file-path') ?? '',
        renderHTML: attrs => ({ 'data-file-path': String(attrs.filePath ?? '') }),
      },
      language: {
        default: '',
        parseHTML: el => el.getAttribute('data-language') ?? '',
        renderHTML: attrs => ({ 'data-language': String(attrs.language ?? '') }),
      },
      diff: {
        default: '',
        parseHTML: el => el.getAttribute('data-diff') ?? '',
        renderHTML: attrs => ({ 'data-diff': String(attrs.diff ?? '') }),
      },
      collapsed: {
        default: false,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-collapsed')
          if (raw === null) return false
          return raw === 'true' || raw === '1'
        },
        renderHTML: attrs => ({ 'data-collapsed': attrs.collapsed ? 'true' : 'false' }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file-diff"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-diff' })]
  },

  addCommands() {
    return {
      insertFileDiff:
        (attrs: Partial<FileDiffAttrs>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'fileDiff',
            attrs: {
              filePath: '',
              language: '',
              diff: '',
              collapsed: false,
              ...attrs,
            },
          })
        },
      insertFileDiffDebug:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'fileDiff',
            attrs: {
              filePath: 'app/composables/useExample.ts',
              language: 'typescript',
              diff: DEBUG_DIFF,
              collapsed: false,
            },
          })
        },
    }
  },

  addNodeView() {
    // Cast matches the codebase pattern in ActionButton / crouton-pages —
    // TipTap's `Component<NodeViewProps>` is too strict for
    // `defineProps<{...}>()`-style SFCs.
    return VueNodeViewRenderer(FileDiffBlock as unknown as Parameters<typeof VueNodeViewRenderer>[0])
  },
})

export default FileDiff
