/**
 * commentAnchor — TipTap mark extension for inline comment-thread highlights.
 *
 * PR 3 of the notion-slideover series. Comment threads are stored in a
 * `Y.Map<CommentThread>` (`commentsMap`) on the same Y.Doc as the editor's
 * `Y.XmlFragment('content')`. The visual highlight on the editor side is
 * this `commentAnchor` mark — a single attribute (`threadId`) that links a
 * decorated range back to its thread record.
 *
 * Mark vs node — comments anchor to text spans, not block-level inserts, so
 * they're a Mark, not a Node. The browser-side `useNodeComments` composable
 * (PR 3 task #6) is the loop that watches `commentsMap`, finds each thread's
 * `quote` in the editor doc, and applies/removes this mark to keep the
 * highlight in sync with the source-of-truth thread store.
 *
 * Pi never writes marks directly. Pi writes thread records into `commentsMap`
 * via the worker-side `open_comment` tool; the mark is derived state owned by
 * the browser. This keeps the worker side simple (no editor-aware quote
 * matching) and means Yjs handles concurrent mark applications across tabs
 * idempotently.
 *
 * Schema notes:
 *   - `inclusive: false` — typing at the mark boundary should NOT extend the
 *     highlight. A comment is anchored to its original quote; growing it would
 *     desync from the thread record.
 *   - `excludes: ''` — multiple comment marks may overlap on the same text
 *     (two threads anchored to overlapping spans is legal).
 *   - The mark renders as a `<span data-comment-thread-id="...">` so the
 *     browser composables / slideout can attach click handlers via DOM
 *     delegation without needing TipTap-internal APIs.
 */
import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentAnchorAttrs {
  threadId: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentAnchor: {
      /** Apply the comment-anchor mark to the current selection. */
      setCommentAnchor: (attrs: CommentAnchorAttrs) => ReturnType
      /** Remove the comment-anchor mark from the current selection. */
      unsetCommentAnchor: () => ReturnType
    }
  }
}

export const CommentAnchor = Mark.create({
  name: 'commentAnchor',
  inclusive: false,
  excludes: '',
  // Marks default to allowing other marks alongside them; explicit for clarity.
  spanning: true,

  addAttributes() {
    return {
      threadId: {
        default: '',
        parseHTML: el => el.getAttribute('data-comment-thread-id') ?? '',
        renderHTML: attrs => ({
          'data-comment-thread-id': String(attrs.threadId ?? ''),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-thread-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'comment-anchor',
        // Tailwind utility classes — soft yellow highlight, cursor hint.
        // The slideout owns the click handler via DOM delegation on
        // [data-comment-thread-id], so the mark itself stays passive.
        class: 'bg-yellow-200/60 dark:bg-yellow-500/25 cursor-pointer rounded-sm px-0.5',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setCommentAnchor:
        (attrs: CommentAnchorAttrs) =>
        ({ commands }) => {
          if (!attrs.threadId) return false
          return commands.setMark(this.name, attrs)
        },
      unsetCommentAnchor:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})

export default CommentAnchor
