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

const {
  openThreads,
  resolvedThreads,
  focusedThreadId,
  focusThread,
  replyToComment,
  resolveComment,
} = useNodeComments()

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

function handleResolve(threadId: string) {
  resolveComment(threadId)
  if (focusedThreadId.value === threadId) focusThread(null)
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

          <div class="space-y-2 pt-2">
            <UTextarea
              v-model="replyBodies[thread.id]"
              :rows="2"
              placeholder="Reply…"
              class="w-full"
              @keydown.enter.meta.prevent="handleReply(thread.id)"
            />
            <div class="flex items-center justify-between gap-2">
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
                color="primary"
                :disabled="!(replyBodies[thread.id] ?? '').trim()"
                @click="handleReply(thread.id)"
              >
                Reply
              </UButton>
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
