/**
 * useNodeComments — browser-side comment thread state for a single ThinkGraph node.
 *
 * PR 3 of the notion-slideover series. Pairs with the worker-side
 * `comment-tools.ts` and the `commentAnchor` TipTap mark. Owns three jobs:
 *
 *   1. Reactive thread list — exposes `threads` for the CommentSlideout
 *      component to render. Driven by a Y.Map observer so changes from any
 *      source (Pi, another tab, the local user) propagate.
 *
 *   2. Editor mark sync — keeps the visual highlights in the editor in sync
 *      with the thread store. Open threads get a `commentAnchor` mark applied
 *      to their quoted range; resolved threads have their mark removed. Pi
 *      never writes marks directly — it writes thread records, this composable
 *      is the loop that turns them into marks.
 *
 *   3. Human actions — exposes `openComment` / `replyToComment` /
 *      `resolveComment` for UI-initiated mutations (e.g. text-selection
 *      "Comment" affordance, slideout reply form, resolve button). These
 *      mirror the worker tool surface so human-driven and Pi-driven threads
 *      land in the same Y.Map under the same schema.
 *
 * Wiring: NodeBlockEditor.vue calls `provideNodeComments({ editor, ydoc })`
 * once the TipTap editor and Y.Doc are both ready. Child components call
 * `useNodeComments()` to read state and dispatch actions.
 *
 * Thread store schema is duplicated from the worker side because the
 * thinkgraph app does not import worker types. Keep these in sync with
 * `apps/thinkgraph-worker/src/yjs-page-client.ts` if either side changes.
 */
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { computed, inject, isRef, onScopeDispose, provide, ref, shallowRef, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type * as Y from 'yjs'

export type CommentAuthor = 'human' | 'pi'

export interface CommentMessage {
  id: string
  author: CommentAuthor
  authorLabel?: string
  body: string
  createdAt: number
}

export interface CommentAnchor {
  quote: string
  occurrence?: number
}

export interface CommentThread {
  id: string
  anchor: CommentAnchor
  status: 'open' | 'resolved'
  createdAt: number
  createdBy: CommentAuthor
  messages: CommentMessage[]
}

interface NodeCommentsContext {
  threads: ComputedRef<CommentThread[]>
  openThreads: ComputedRef<CommentThread[]>
  resolvedThreads: ComputedRef<CommentThread[]>
  focusedThreadId: Ref<string | null>
  focusThread: (threadId: string | null) => void
  openComment: (params: { quote: string; body: string; authorLabel?: string; occurrence?: number }) => string | null
  /**
   * Open a comment from a captured editor selection. Used by the toolbar
   * "Comment" composer — accepts the selection range explicitly because the
   * editor's live selection collapses the moment a modal/popover takes focus.
   * Applies the highlight mark immediately, then writes the thread, so the
   * commentsMap observer sees an existing mark and skips its quote-finding
   * step. Returns null if the range is empty, the body is blank, or the
   * selection spans multiple blocks (inline-only in v1).
   */
  openCommentOnSelection: (params: {
    range: { from: number; to: number }
    body: string
    authorLabel?: string
  }) => string | null
  replyToComment: (threadId: string, params: { body: string; authorLabel?: string }) => boolean
  resolveComment: (threadId: string) => boolean
  /**
   * PR 5 — set of thread ids currently waiting on a Pi reply dispatch.
   * Local UI state only (never written to Yjs). Threads are added via
   * `markPendingPi` when the slideout fires a comment-reply dispatch, and
   * cleared automatically by the commentsMap observer the moment a new
   * `pi`-authored message lands on the thread.
   */
  pendingPiThreads: ComputedRef<Set<string>>
  markPendingPi: (threadId: string) => void
  clearPendingPi: (threadId: string) => void
}

const KEY: InjectionKey<NodeCommentsContext> = Symbol('NodeCommentsContext')

const COMMENTS_MAP_NAME = 'comments'

interface ProvideOptions {
  editor: Ref<Editor | null>
  ydoc: Ref<Y.Doc | null> | Y.Doc | null
  /** Optional human label, e.g. session user name. Defaults to "You". */
  humanLabel?: () => string
}

/**
 * Walk the editor doc text nodes and locate the Nth occurrence of `quote`.
 * Returns ProseMirror positions or null if not found / editor empty.
 *
 * Why a custom walk: ProseMirror's `doc.textBetween` inserts block separators
 * which corrupt the position math. Walking text nodes individually and
 * recording each text node's start position gives us a clean abs-to-pos map.
 */
function findQuoteRange(
  editor: Editor,
  quote: string,
  occurrence: number,
): { from: number; to: number } | null {
  if (!quote) return null
  const offsets: Array<{ absStart: number; pos: number; len: number }> = []
  let absText = ''
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      offsets.push({ absStart: absText.length, pos, len: node.text.length })
      absText += node.text
    }
  })
  if (!offsets.length) return null

  // Locate the Nth occurrence (0-indexed) in the concatenated text.
  let from = -1
  let searchStart = 0
  for (let i = 0; i <= occurrence; i++) {
    from = absText.indexOf(quote, searchStart)
    if (from === -1) return null
    searchStart = from + 1
  }
  const to = from + quote.length

  // Map abs offsets back to ProseMirror positions. The from/to may fall in
  // different text nodes — both ends are translated independently.
  function absToPos(abs: number): number {
    for (const o of offsets) {
      if (abs >= o.absStart && abs <= o.absStart + o.len) {
        return o.pos + (abs - o.absStart)
      }
    }
    return -1
  }
  const docFrom = absToPos(from)
  const docTo = absToPos(to)
  if (docFrom < 0 || docTo < 0) return null
  return { from: docFrom, to: docTo }
}

/**
 * Find the existing range of a `commentAnchor` mark whose threadId matches.
 * Used when removing the highlight on resolve. Returns the outermost extent
 * of the mark in the doc — comment anchors are not split by typical edits,
 * but be defensive about a thread span across multiple text nodes.
 */
function findMarkRange(editor: Editor, threadId: string): { from: number; to: number } | null {
  let from = -1
  let to = -1
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const mark = node.marks.find(
      m => m.type.name === 'commentAnchor' && m.attrs.threadId === threadId,
    )
    if (!mark) return
    if (from === -1) from = pos
    to = pos + node.text.length
  })
  if (from === -1) return null
  return { from, to }
}

export function provideNodeComments(options: ProvideOptions): NodeCommentsContext {
  const editorRef = options.editor
  // shallowRef — never deep-proxy a Y.Doc. Vue's reactive() wraps every
  // nested Yjs type in a Proxy, which breaks Y.Map.observe callbacks and
  // prevents the comment thread snapshot from updating reactively.
  const docRef: Ref<Y.Doc | null> = isRef(options.ydoc)
    ? options.ydoc
    : (shallowRef(options.ydoc) as Ref<Y.Doc | null>)
  const humanLabel = options.humanLabel ?? (() => 'You')

  // Reactive snapshot of all threads in the Y.Map. Rebuilt on every change
  // because Y.Map mutations land as whole-entry replacements (the worker
  // serializes the thread object on each set). Cheap because thread counts
  // per node are small (handful at most in v1).
  const threadSnapshot = ref<CommentThread[]>([])

  function snapshotThreads(map: Y.Map<CommentThread>): CommentThread[] {
    const list: CommentThread[] = []
    map.forEach((value) => {
      if (value && typeof value === 'object' && 'id' in value) {
        list.push(value as CommentThread)
      }
    })
    list.sort((a, b) => a.createdAt - b.createdAt)
    return list
  }

  // Apply / remove marks based on current thread state. Re-runs on every
  // commentsMap event to catch threads whose previous apply failed (e.g.
  // because the editor wasn't synced yet when Pi wrote the thread).
  function syncMarks(threads: CommentThread[]) {
    const editor = editorRef.value
    if (!editor) return
    for (const thread of threads) {
      const existingRange = findMarkRange(editor, thread.id)
      if (thread.status === 'resolved') {
        if (existingRange) {
          editor
            .chain()
            .setTextSelection(existingRange)
            .unsetMark('commentAnchor')
            .setTextSelection(existingRange.from)
            .run()
        }
        continue
      }
      // Open thread — ensure mark is present.
      if (existingRange) continue
      const range = findQuoteRange(
        editor,
        thread.anchor.quote,
        thread.anchor.occurrence ?? 0,
      )
      if (!range) {
        // Quote not currently in the doc. Could be an edited-away quote, or
        // the doc isn't synced yet. Either way, leave the thread record alone
        // — the slideout still shows it in the list, just without a highlight.
        continue
      }
      editor
        .chain()
        .setTextSelection(range)
        .setMark('commentAnchor', { threadId: thread.id })
        .setTextSelection(range.from)
        .run()
    }
  }

  // PR 5 — local-only pending-Pi-reply set. We re-assign the ref to a fresh
  // Set on every mutation so Vue's reactivity picks up the change (matching
  // the same "rebuild snapshot on change" shape used by threadSnapshot).
  const pendingPiThreadsRef = ref<Set<string>>(new Set())

  function markPendingPi(threadId: string) {
    if (pendingPiThreadsRef.value.has(threadId)) return
    const next = new Set(pendingPiThreadsRef.value)
    next.add(threadId)
    pendingPiThreadsRef.value = next
  }

  function clearPendingPi(threadId: string) {
    if (!pendingPiThreadsRef.value.has(threadId)) return
    const next = new Set(pendingPiThreadsRef.value)
    next.delete(threadId)
    pendingPiThreadsRef.value = next
  }

  let observer: ((event: Y.YMapEvent<CommentThread>) => void) | null = null
  let observedMap: Y.Map<CommentThread> | null = null

  function attach() {
    const doc = docRef.value
    if (!doc) return
    if (observedMap) return
    const map = doc.getMap<CommentThread>(COMMENTS_MAP_NAME)
    observedMap = map
    threadSnapshot.value = snapshotThreads(map)
    syncMarks(threadSnapshot.value)
    observer = () => {
      const next = snapshotThreads(map)
      threadSnapshot.value = next
      syncMarks(next)
      // PR 5 — observer-driven clear of pending-Pi flags. The moment a
      // `pi`-authored message lands on a thread we were waiting on, drop
      // the pending flag so the "Pi is thinking…" placeholder disappears.
      // Ground truth is "a Pi reply arrived", not a timeout — if the
      // worker dies mid-session, the placeholder sticks until the user
      // retries (or clears via the error-path toast), which is the
      // correct failure mode.
      if (pendingPiThreadsRef.value.size > 0) {
        let mutated = false
        let nextPending = pendingPiThreadsRef.value
        for (const thread of next) {
          if (!nextPending.has(thread.id)) continue
          const last = thread.messages[thread.messages.length - 1]
          if (last && last.author === 'pi') {
            if (!mutated) {
              nextPending = new Set(nextPending)
              mutated = true
            }
            nextPending.delete(thread.id)
          }
        }
        if (mutated) pendingPiThreadsRef.value = nextPending
      }
    }
    map.observe(observer)
  }

  function detach() {
    if (observedMap && observer) {
      observedMap.unobserve(observer)
    }
    observedMap = null
    observer = null
  }

  // Re-attach whenever the doc reference flips (e.g. component remount on
  // node switch). Editor changes are handled by the same trigger via the
  // observer's syncMarks pass.
  watch(
    [docRef, editorRef],
    () => {
      detach()
      attach()
    },
    { immediate: true },
  )

  onScopeDispose(detach)

  const threads = computed(() => threadSnapshot.value)
  const openThreads = computed(() => threadSnapshot.value.filter(t => t.status === 'open'))
  const resolvedThreads = computed(() => threadSnapshot.value.filter(t => t.status === 'resolved'))

  const focusedThreadId = ref<string | null>(null)
  function focusThread(threadId: string | null) {
    focusedThreadId.value = threadId
  }

  // Human-initiated actions. These write directly into the same Y.Map the
  // worker uses, so the schema MUST match. Mirror the worker's openComment /
  // replyToComment / resolveComment field-for-field.
  function openComment(params: {
    quote: string
    body: string
    authorLabel?: string
    occurrence?: number
  }): string | null {
    const doc = docRef.value
    if (!doc) return null
    if (!params.quote || !params.body) return null
    const map = doc.getMap<CommentThread>(COMMENTS_MAP_NAME)
    const threadId = `comment-${crypto.randomUUID()}`
    const now = Date.now()
    const thread: CommentThread = {
      id: threadId,
      anchor: {
        quote: params.quote,
        occurrence: params.occurrence ?? 0,
      },
      status: 'open',
      createdAt: now,
      createdBy: 'human',
      messages: [
        {
          id: `${threadId}-m0`,
          author: 'human',
          authorLabel: params.authorLabel ?? humanLabel(),
          body: params.body,
          createdAt: now,
        },
      ],
    }
    map.set(threadId, thread)
    return threadId
  }

  /**
   * Compute the occurrence index for a quote at a given doc position. Walks
   * the same text-node table as findQuoteRange so the index matches the
   * observer's quote-search math. Used so cross-tab observers anchor a
   * human-created thread to the right occurrence when the selected text is
   * not unique in the doc.
   */
  function computeOccurrence(editor: Editor, quote: string, fromPos: number): number {
    let absText = ''
    const offsets: Array<{ absStart: number; pos: number; len: number }> = []
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        offsets.push({ absStart: absText.length, pos, len: node.text.length })
        absText += node.text
      }
    })
    let absFrom = -1
    for (const o of offsets) {
      if (fromPos >= o.pos && fromPos <= o.pos + o.len) {
        absFrom = o.absStart + (fromPos - o.pos)
        break
      }
    }
    if (absFrom < 0) return 0
    let count = 0
    let idx = 0
    while (true) {
      const found = absText.indexOf(quote, idx)
      if (found === -1 || found >= absFrom) break
      count++
      idx = found + 1
    }
    return count
  }

  function openCommentOnSelection(params: {
    range: { from: number; to: number }
    body: string
    authorLabel?: string
  }): string | null {
    const editor = editorRef.value
    const doc = docRef.value
    if (!editor || !doc) return null
    if (!params.body.trim()) return null
    const { from, to } = params.range
    if (from === to) return null
    // Use a space joiner so the quote doesn't accidentally contain block
    // separators that won't appear in the observer's text-node walk.
    const quote = editor.state.doc.textBetween(from, to, '\n', ' ').trim()
    if (!quote) return null
    // v1: inline-only selections. Multi-block selections would produce a
    // quote with newlines that the observer's findQuoteRange can't match
    // (it concatenates text nodes without separators). Reject upfront so
    // the cross-tab anchor works reliably.
    if (quote.includes('\n')) return null

    const occurrence = computeOccurrence(editor, quote, from)
    const threadId = `comment-${crypto.randomUUID()}`

    // Apply the mark FIRST. The next line's commentsMap.set fires the
    // observer synchronously; with the mark already on the doc the observer
    // takes its `existingRange` short-circuit and skips findQuoteRange,
    // avoiding any wrong-occurrence races for ambiguous quotes.
    editor
      .chain()
      .setTextSelection({ from, to })
      .setMark('commentAnchor', { threadId })
      .setTextSelection(from)
      .run()

    const map = doc.getMap<CommentThread>(COMMENTS_MAP_NAME)
    const now = Date.now()
    const thread: CommentThread = {
      id: threadId,
      anchor: { quote, occurrence },
      status: 'open',
      createdAt: now,
      createdBy: 'human',
      messages: [
        {
          id: `${threadId}-m0`,
          author: 'human',
          authorLabel: params.authorLabel ?? humanLabel(),
          body: params.body.trim(),
          createdAt: now,
        },
      ],
    }
    map.set(threadId, thread)
    return threadId
  }

  function replyToComment(
    threadId: string,
    params: { body: string; authorLabel?: string },
  ): boolean {
    const doc = docRef.value
    if (!doc) return false
    if (!params.body) return false
    const map = doc.getMap<CommentThread>(COMMENTS_MAP_NAME)
    const existing = map.get(threadId)
    if (!existing) return false
    const next: CommentThread = {
      ...existing,
      messages: [
        ...existing.messages,
        {
          id: `${threadId}-m${existing.messages.length}`,
          author: 'human',
          authorLabel: params.authorLabel ?? humanLabel(),
          body: params.body,
          createdAt: Date.now(),
        },
      ],
    }
    map.set(threadId, next)
    return true
  }

  function resolveComment(threadId: string): boolean {
    const doc = docRef.value
    if (!doc) return false
    const map = doc.getMap<CommentThread>(COMMENTS_MAP_NAME)
    const existing = map.get(threadId)
    if (!existing) return false
    if (existing.status === 'resolved') return true
    map.set(threadId, { ...existing, status: 'resolved' })
    return true
  }

  const pendingPiThreads = computed(() => pendingPiThreadsRef.value)

  const ctx: NodeCommentsContext = {
    threads,
    openThreads,
    resolvedThreads,
    focusedThreadId,
    focusThread,
    openComment,
    openCommentOnSelection,
    replyToComment,
    resolveComment,
    pendingPiThreads,
    markPendingPi,
    clearPendingPi,
  }
  provide(KEY, ctx)
  return ctx
}

export function useNodeComments(): NodeCommentsContext {
  const ctx = inject(KEY, null)
  if (!ctx) {
    throw new Error(
      '[useNodeComments] No NodeCommentsContext provided. Wrap the consuming component in a NodeBlockEditor that calls provideNodeComments().',
    )
  }
  return ctx
}
