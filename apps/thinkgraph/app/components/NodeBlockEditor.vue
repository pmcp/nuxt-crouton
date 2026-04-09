<script setup lang="ts">
/**
 * NodeBlockEditor — Notion-style block editor for a single ThinkGraph node.
 *
 * Each node gets its own crouton-collab room, so the Y.Doc only contains the
 * active node's content (bandwidth bounded by node, not by project). Switching
 * nodes remounts this component (parent uses :key=nodeId), giving us a clean
 * room teardown for free.
 *
 * Persistence is dual:
 *  - Yjs blob in CollabRoom DO — live multi-tab sync, source of truth at runtime
 *  - thinkgraph_nodes.content row column — mirrored via debounced PATCH on local
 *    edits, so server-side consumers (Pi in PR 2+, MCP, etc.) can read content
 *    without joining Yjs state
 *
 * Cold-start seeding: when the room's Yjs fragment is empty AND the row already
 * has content (e.g. local dev with no collab worker, or a stale DO), we seed
 * the editor from the row content on first sync. After seeding, edits flow
 * back to the row via the debounced save below.
 *
 * Multi-tab write avoidance: only the focused tab persists to the row. Other
 * tabs receive remote updates via Yjs and would otherwise duplicate writes.
 */
import type { Editor } from '@tiptap/vue-3'
import ActionButton from '../extensions/action-button'
import CommentAnchor from '../extensions/comment-anchor'
import FileDiff from '../extensions/file-diff'
import { provideNodeActionHandlers } from '../composables/useNodeActionHandlers'
import { provideNodeComments } from '../composables/useNodeComments'
import CommentSlideout from './CommentSlideout.vue'

interface Props {
  nodeId: string
  teamId: string
  initialContent?: unknown | null
}

const props = defineProps<Props>()

const collab = useCollabEditor({
  roomId: `thinkgraph-node-${props.teamId}-${props.nodeId}`,
  roomType: 'page',
  field: 'content'
})

// PR 2: register the action-handler registry for this slideover instance.
// Vue's provide/inject carries this scope into the TipTap NodeView so the
// ActionButtonBlock click handlers see the right (nodeId, teamId) without
// any global state. Multiple slideovers in different tabs each get their
// own registry — clicks never cross-fire.
provideNodeActionHandlers({
  nodeId: props.nodeId,
  teamId: props.teamId,
})

// PR 2: action button TipTap extension. Plain TipTap Node — no markRaw,
// because the underlying class instance isn't reactive Vue state and TipTap
// already handles its own extension lifecycle.
// PR 3: commentAnchor mark — inline highlight for anchored comment threads.
// The visual binding loop lives in `useNodeComments`, which observes the
// shared Y.Map<CommentThread> and applies/removes this mark to keep
// highlights in sync with the source-of-truth thread store.
// PR 4: fileDiff leaf node — inline read-only file diff panels. Pi appends
// these via `pi.appendFileDiff`; the NodeView renders the unified diff text
// with +/− coloring and a collapse toggle.
const editorExtensions = [ActionButton, CommentAnchor, FileDiff]

// Slash menu items. Each `command` must be a zero-arg method on editor.commands
// (CroutonEditorBlocks invokes them as `editor.commands[command]()`). For
// headings, users get markdown shortcuts from TipTap StarterKit: typing `# `,
// `## `, `### ` at line start creates H1/H2/H3 — so we don't need to register
// custom no-arg heading commands here.
const suggestionItems = [
  { type: 'bulletList', label: 'Bullet list', icon: 'i-lucide-list', category: 'Lists', command: 'toggleBulletList' },
  { type: 'orderedList', label: 'Numbered list', icon: 'i-lucide-list-ordered', category: 'Lists', command: 'toggleOrderedList' },
  { type: 'blockquote', label: 'Quote', icon: 'i-lucide-quote', category: 'Basic', command: 'toggleBlockquote' },
  { type: 'codeBlock', label: 'Code block', icon: 'i-lucide-code', category: 'Basic', command: 'toggleCodeBlock' },
  { type: 'horizontalRule', label: 'Divider', icon: 'i-lucide-minus', category: 'Basic', command: 'setHorizontalRule' },
  // PR 2 dev affordance: lets you exercise the action-button NodeView, click
  // handler, and create-child action without running the worker. Stripped from
  // production builds via the import.meta.dev guard below.
  // PR 4 dev affordance: same idea — inserts a hard-coded sample diff so the
  // FileDiffBlock NodeView can be exercised without dispatching Pi.
  ...(import.meta.dev
    ? [
        { type: 'actionButton', label: 'Action button (dev)', icon: 'i-lucide-mouse-pointer-click', category: 'Debug', command: 'insertActionButtonDebug' },
        { type: 'fileDiff', label: 'File diff (dev)', icon: 'i-lucide-file-diff', category: 'Debug', command: 'insertFileDiffDebug' },
      ]
    : [])
]

// Top-level destructure so the template can access reactive values directly
const yxmlFragment = collab.yxmlFragment
const provider = collab.provider
const collabUser = computed(() => collab.user.value ?? undefined)
const connected = collab.connected
const synced = collab.synced
const error = collab.error
const otherUsers = collab.otherUsers
const ydoc = collab.ydoc

const editorInstance = ref<Editor | null>(null)
const seeded = ref(false)

// PR 3: provide the comment store + mark sync loop. Uses the same Y.Doc as
// the editor (so commentsMap rides on the same page room as the content
// fragment). Children — primarily CommentSlideout — read state and dispatch
// actions via `useNodeComments()`.
const comments = provideNodeComments({
  editor: editorInstance,
  ydoc,
  humanLabel: () => collab.user.value?.name ?? 'You',
})

// PR 3 polish: text-selection composer state. The header "Comment" button
// captures the current editor selection (range + verbatim quote) into these
// refs and opens a modal — capturing matters because the modal grabs focus
// the moment it mounts, collapsing the editor's live selection. Submit
// hands the captured range to `openCommentOnSelection`.
const hasSelection = ref(false)
const composerOpen = ref(false)
const capturedRange = ref<{ from: number; to: number } | null>(null)
const capturedQuote = ref('')
const composerBody = ref('')

function handleCreate({ editor }: { editor: Editor }) {
  editorInstance.value = editor
  // Reactive selection tracking — the Comment button is disabled until the
  // user has at least a single non-empty inline selection. We use TipTap's
  // selectionUpdate event because the editor itself is not Vue-reactive.
  editor.on('selectionUpdate', ({ editor }) => {
    hasSelection.value = !editor.state.selection.empty
  })
}

function startCommentCompose() {
  const editor = editorInstance.value
  if (!editor) return
  const { from, to } = editor.state.selection
  if (from === to) return
  const quote = editor.state.doc.textBetween(from, to, '\n', ' ').trim()
  if (!quote || quote.includes('\n')) return
  capturedRange.value = { from, to }
  capturedQuote.value = quote
  composerBody.value = ''
  composerOpen.value = true
}

function submitCompose(close: () => void) {
  if (!capturedRange.value) return
  if (!composerBody.value.trim()) return
  const id = comments.openCommentOnSelection({
    range: capturedRange.value,
    body: composerBody.value,
  })
  if (id) comments.focusThread(id)
  capturedRange.value = null
  capturedQuote.value = ''
  composerBody.value = ''
  close()
}

// PR 3: DOM delegation — when the user clicks anywhere inside the editor
// surface, check if the click landed on a `commentAnchor` mark span and
// focus the corresponding thread in the slideout. Going through the DOM
// instead of a TipTap plugin keeps the mark itself passive and lets us
// handle clicks without ProseMirror plugin lifecycle juggling.
function handleEditorClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const span = target.closest('[data-comment-thread-id]') as HTMLElement | null
  if (!span) return
  const threadId = span.getAttribute('data-comment-thread-id')
  if (!threadId) return
  comments.focusThread(threadId)
}

// Cold-start seed: when the room is fresh but the row has content, import the
// row content into the editor. setContent writes through to the Y.XmlFragment.
watch(
  () => ({ synced: collab.synced.value, editor: editorInstance.value }),
  ({ synced, editor }) => {
    if (seeded.value || !synced || !editor) return

    const fragmentEmpty = !yxmlFragment || yxmlFragment.length === 0
    const initial = props.initialContent

    if (fragmentEmpty && initial && typeof initial === 'object') {
      try {
        editor.commands.setContent(initial as Parameters<typeof editor.commands.setContent>[0], { emitUpdate: false })
      } catch (err) {
        console.warn('[NodeBlockEditor] Seed from initialContent failed', err)
      }
    }
    seeded.value = true
  },
  { immediate: true }
)

const persistContent = useDebounceFn(async (content: unknown) => {
  try {
    await $fetch(`/api/teams/${props.teamId}/thinkgraph-nodes/${props.nodeId}`, {
      method: 'PATCH',
      body: { content }
    })
  } catch (err) {
    console.error('[NodeBlockEditor] Failed to persist content', err)
  }
}, 1000)

function handleUpdate({ editor }: { editor: Editor }) {
  if (!seeded.value) return
  if (!editor.isFocused) return
  persistContent(editor.getJSON())
}
</script>

<template>
  <div class="rounded-lg border border-default overflow-hidden bg-default">
    <div class="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-default bg-muted/30">
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-message-square-plus"
        :disabled="!hasSelection"
        @click="startCommentCompose"
      >
        Comment
      </UButton>
      <CollabIndicator
        :connected="connected"
        :synced="synced"
        :error="error"
        :users="otherUsers"
      />
    </div>
    <div @click="handleEditorClick">
      <CroutonEditorBlocks
        :yxml-fragment="yxmlFragment"
        :collab-provider="provider"
        :collab-user="collabUser"
        :suggestion-items="suggestionItems"
        :extensions="editorExtensions"
        placeholder="Type / for blocks, or # ## ### for headings..."
        content-type="json"
        class="min-h-[12rem]"
        @create="handleCreate"
        @update="handleUpdate"
      />
    </div>
    <CommentSlideout />

    <UModal v-model:open="composerOpen">
      <template #content="{ close }">
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-default">Add comment</h3>
          <div class="text-sm text-muted italic border-l-2 border-primary-500 pl-3 py-1">
            "{{ capturedQuote }}"
          </div>
          <UTextarea
            v-model="composerBody"
            :rows="4"
            placeholder="Write your comment…"
            class="w-full"
            @keydown.enter.meta.prevent="submitCompose(close)"
            @keydown.enter.ctrl.prevent="submitCompose(close)"
          />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
            <UButton
              color="primary"
              :disabled="!composerBody.trim()"
              @click="submitCompose(close)"
            >
              Comment
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
