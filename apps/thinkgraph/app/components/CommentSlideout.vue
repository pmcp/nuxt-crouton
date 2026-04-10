<script setup lang="ts">
/**
 * CommentSlideout — inline comment-thread panel for the per-node block editor.
 *
 * PR 3 of the notion-slideover series. Pairs with `useNodeComments` (the
 * Y.Map-backed thread store + mark sync loop) and the `commentAnchor` TipTap
 * mark (the inline highlight). This component is the human-facing surface:
 * lists open threads, shows the focused thread's full message history,
 * accepts replies, and exposes the resolve action.
 *
 * Why a panel and not a `USlideover`: the parent project page already wraps
 * each node in a `USlideover` (`apps/thinkgraph/app/pages/admin/[team]/project/[projectId].vue`).
 * Stacking a second slideover from the right would overlap the parent
 * surface and bury the editor — defeating the purpose of seeing a comment
 * next to the text it anchors to. Instead this renders as a collapsible
 * section beneath the editor, so the user keeps the doc and the discussion
 * in view simultaneously.
 *
 * Click-to-focus: the wrapper component (`NodeBlockEditor`) installs a DOM
 * delegation listener on the editor surface that watches for clicks on
 * `[data-comment-thread-id]` spans (the rendered output of the
 * `commentAnchor` mark) and calls `focusThread(threadId)`. From this
 * component's POV, focus state is reactive via `focusedThreadId`.
 */
import { computed, ref } from 'vue'
import { useNodeComments } from '../composables/useNodeComments'
import { useNodeActionHandlers } from '../composables/useNodeActionHandlers'

const {
  openThreads,
  resolvedThreads,
  focusedThreadId,
  focusThread,
  replyToComment,
  resolveComment,
  pendingPiThreads,
  markPendingPi,
  clearPendingPi,
} = useNodeComments()

// PR 5 — reuse the action-handler registry from NodeBlockEditor so the
// slideout knows which (nodeId, teamId) scope it lives in. We don't add a
// new provide; provideNodeActionHandlers is already called one level up for
// every slideover instance.
const actionRegistry = useNodeActionHandlers()
const toast = useToast()

// Per-thread reply input state. Keyed by threadId so unrelated reply drafts
// don't collide when the user toggles between threads. Cleared on submit.
const replyBodies = ref<Record<string, string>>({})

const collapsed = ref(false)
const showResolved = ref(false)

const focusedThread = computed(() => {
  const id = focusedThreadId.value
  if (!id) return null
  return (
    openThreads.value.find(t => t.id === id) ??
    resolvedThreads.value.find(t => t.id === id) ??
    null
  )
})

const totalCount = computed(() => openThreads.value.length + resolvedThreads.value.length)

function handleReply(threadId: string) {
  const body = (replyBodies.value[threadId] ?? '').trim()
  if (!body) return
  const ok = replyToComment(threadId, { body })
  if (ok) replyBodies.value[threadId] = ''
}

/**
 * PR 5 — "Ask Pi" click handler.
 *
 * Order matters:
 *   1. Post the human's reply locally via the existing replyToComment path
 *      so it lands in the Y.Map immediately (and syncs to other tabs).
 *   2. Read the updated thread state AFTER step 1 so the history we send
 *      to Pi includes the just-typed message.
 *   3. Mark the thread pending so the button disables + the "Pi is thinking"
 *      row appears.
 *   4. POST the focused dispatch to the Nitro endpoint. On network/worker
 *      failure, clear pending and toast the error — but do NOT roll back
 *      the human's reply (it's already in the thread; the user can retry).
 */
async function handleAskPi(threadId: string) {
  const body = (replyBodies.value[threadId] ?? '').trim()
  if (!body) return
  if (!actionRegistry) {
    console.error('[CommentSlideout] Ask Pi: no NodeActionContext available')
    return
  }
  if (pendingPiThreads.value.has(threadId)) return

  const ok = replyToComment(threadId, { body })
  if (!ok) return
  replyBodies.value[threadId] = ''

  // Re-read the focused thread after the local reply so `history` includes
  // the human's just-typed message. The computed `focusedThread` is reactive
  // to the Y.Map observer, so we grab it from `openThreads` here directly
  // to avoid any template-only reactivity gap.
  const updated = openThreads.value.find(t => t.id === threadId)
  const history = (updated?.messages ?? []).map(m => ({
    author: m.author,
    body: m.body,
    authorLabel: m.authorLabel,
    createdAt: m.createdAt,
  }))

  markPendingPi(threadId)

  try {
    await $fetch(`/api/teams/${actionRegistry.ctx.teamId}/dispatch/comment-reply`, {
      method: 'POST',
      body: {
        nodeId: actionRegistry.ctx.nodeId,
        threadId,
        history,
      },
    })
  } catch (err: any) {
    clearPendingPi(threadId)
    console.error('[CommentSlideout] Ask Pi dispatch failed', err)
    toast.add({
      title: 'Ask Pi failed',
      description: err?.data?.statusMessage || err?.message || 'Could not reach the Pi worker. Try again.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  }
}

function handleResolve(threadId: string) {
  resolveComment(threadId)
  if (focusedThreadId.value === threadId) focusThread(null)
}

/**
 * Promote a comment thread to a child node on the canvas.
 *
 * Concatenates all messages in the thread into a brief, derives a title
 * from the first ~60 characters, POSTs to the existing thinkgraph-nodes
 * endpoint, resolves the thread, and fires crouton:mutation so the
 * project page's auto-refresh picks up the new node.
 */
const creatingNodeForThread = ref<Set<string>>(new Set())

async function handleCreateNode(threadId: string) {
  if (!actionRegistry) {
    console.error('[CommentSlideout] Create node: no NodeActionContext available')
    return
  }
  if (creatingNodeForThread.value.has(threadId)) return

  const thread = openThreads.value.find(t => t.id === threadId)
    ?? resolvedThreads.value.find(t => t.id === threadId)
  if (!thread || thread.messages.length === 0) return

  // Build brief from all messages in the thread
  const brief = thread.messages
    .map(m => `**${m.authorLabel ?? (m.author === 'pi' ? 'Pi' : 'You')}:** ${m.body}`)
    .join('\n\n')

  // Title: first ~60 chars of the first message body
  const firstBody = thread.messages[0]!.body
  const title = firstBody.length > 60 ? `${firstBody.slice(0, 57)}...` : firstBody

  creatingNodeForThread.value.add(threadId)

  try {
    await $fetch(`/api/teams/${actionRegistry.ctx.teamId}/thinkgraph-nodes`, {
      method: 'POST',
      body: {
        parentId: actionRegistry.ctx.nodeId,
        title,
        brief,
      },
    })

    // Resolve the thread now that it's been promoted
    resolveComment(threadId)
    if (focusedThreadId.value === threadId) focusThread(null)

    // Trigger canvas refresh
    useNuxtApp().callHook('crouton:mutation', { collection: 'thinkgraphNodes' })

    toast.add({
      title: 'Node created',
      description: `"${title}" added as a child node.`,
      color: 'success',
      icon: 'i-lucide-git-branch-plus',
    })
  } catch (err: any) {
    console.error('[CommentSlideout] Create node failed', err)
    toast.add({
      title: 'Create node failed',
      description: err?.data?.statusMessage || err?.message || 'Could not create child node.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    creatingNodeForThread.value.delete(threadId)
  }
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="border-t border-default bg-muted/30">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      @click="collapsed = !collapsed"
    >
      <div class="flex items-center gap-2 text-sm font-medium text-default">
        <UIcon name="i-lucide-message-square" class="w-4 h-4" />
        <span>Comments</span>
        <UBadge v-if="openThreads.length > 0" color="primary" variant="subtle" size="xs">
          {{ openThreads.length }}
        </UBadge>
        <span v-if="totalCount === 0" class="text-xs text-muted font-normal">— none yet</span>
      </div>
      <UIcon
        :name="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
        class="w-4 h-4 text-muted"
      />
    </button>

    <div v-if="!collapsed" class="px-3 pb-3 space-y-2">
      <p v-if="totalCount === 0" class="text-xs text-muted py-3 text-center">
        Pi can leave anchored comments here, or you can select text in the editor and add your own.
      </p>

      <div
        v-for="thread in openThreads"
        :key="thread.id"
        class="rounded-md border border-default bg-default overflow-hidden transition-colors"
        :class="{ 'ring-2 ring-primary-500/40': focusedThreadId === thread.id }"
      >
        <button
          type="button"
          class="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors"
          @click="focusThread(focusedThreadId === thread.id ? null : thread.id)"
        >
          <div class="text-xs text-muted italic line-clamp-2 mb-1">
            "{{ thread.anchor.quote }}"
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="text-xs text-default truncate">
              <span class="font-medium">{{ thread.messages[0]?.authorLabel ?? (thread.messages[0]?.author === 'pi' ? 'Pi' : 'You') }}:</span>
              {{ thread.messages[0]?.body }}
            </div>
            <span v-if="thread.messages.length > 1" class="text-xs text-muted shrink-0">
              {{ thread.messages.length }} msgs
            </span>
          </div>
        </button>

        <div v-if="focusedThreadId === thread.id" class="border-t border-default px-3 py-2 space-y-2 bg-muted/20">
          <div
            v-for="msg in thread.messages"
            :key="msg.id"
            class="text-sm"
          >
            <div class="flex items-baseline gap-2">
              <span class="font-medium text-default">
                {{ msg.authorLabel ?? (msg.author === 'pi' ? 'Pi' : 'You') }}
              </span>
              <span class="text-xs text-muted">{{ formatTime(msg.createdAt) }}</span>
            </div>
            <p class="text-default whitespace-pre-wrap">{{ msg.body }}</p>
          </div>

          <!-- PR 5: local-only "Pi is thinking…" placeholder while a
               comment-reply dispatch is in flight for this thread. The
               commentsMap observer clears it the moment a pi-authored
               message lands, so no timeout is needed. -->
          <div
            v-if="pendingPiThreads.has(thread.id)"
            class="flex items-center gap-2 text-xs italic text-muted"
          >
            <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
            <span>Pi is thinking…</span>
          </div>

          <div class="space-y-2 pt-2">
            <UTextarea
              v-model="replyBodies[thread.id]"
              :rows="2"
              placeholder="Reply…"
              class="w-full"
              @keydown.enter.meta.prevent="handleReply(thread.id)"
            />
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-check"
                  @click="handleResolve(thread.id)"
                >
                  Resolve
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-git-branch-plus"
                  :loading="creatingNodeForThread.has(thread.id)"
                  @click="handleCreateNode(thread.id)"
                >
                  Create node
                </UButton>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  :disabled="!(replyBodies[thread.id] ?? '').trim()"
                  @click="handleReply(thread.id)"
                >
                  Reply
                </UButton>
                <UButton
                  size="xs"
                  color="primary"
                  icon="i-lucide-sparkles"
                  :disabled="!(replyBodies[thread.id] ?? '').trim() || pendingPiThreads.has(thread.id)"
                  @click="handleAskPi(thread.id)"
                >
                  Ask Pi
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="resolvedThreads.length > 0" class="pt-2">
        <button
          type="button"
          class="text-xs text-muted hover:text-default transition-colors flex items-center gap-1"
          @click="showResolved = !showResolved"
        >
          <UIcon
            :name="showResolved ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="w-3 h-3"
          />
          {{ resolvedThreads.length }} resolved
        </button>
        <div v-if="showResolved" class="space-y-2 mt-2">
          <div
            v-for="thread in resolvedThreads"
            :key="thread.id"
            class="rounded-md border border-default bg-default/40 px-3 py-2 opacity-70"
          >
            <div class="text-xs text-muted italic line-clamp-1 mb-1">
              "{{ thread.anchor.quote }}"
            </div>
            <div class="text-xs text-default truncate">
              {{ thread.messages[0]?.body }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
