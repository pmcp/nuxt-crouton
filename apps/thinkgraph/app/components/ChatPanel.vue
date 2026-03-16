<script setup lang="ts">

const props = defineProps<{
  nodeId?: string | null
  nodeName?: string
}>()

const emit = defineEmits<{
  addToGraph: [items: Array<{ content: string; nodeType: string }>]
  close: []
}>()

const { teamId } = useTeamContext()

import { THINKGRAPH_CONTEXT_NODE_IDS, THINKGRAPH_CONTEXT_MODE } from '~/utils/thinkgraph-inject'

// Inject context mode from parent
const contextNodeIds = inject(THINKGRAPH_CONTEXT_NODE_IDS, ref([]))
const contextMode = inject(THINKGRAPH_CONTEXT_MODE, ref<'path' | 'selection'>('path'))

const {
  messages,
  input,
  handleSubmit,
  isLoading,
  error,
  clearMessages,
  exportMessages,
  importMessages,
} = useChat({
  api: `/api/teams/${teamId.value}/thinkgraph-decisions/chat`,
  body: computed(() => ({
    nodeId: props.nodeId,
    ...(contextMode.value === 'selection' && contextNodeIds.value.length > 0
      ? { contextNodeIds: contextNodeIds.value }
      : {}),
  })),
  onFinish: () => {
    // Save conversation after each AI response (fire-and-forget)
    saveConversation()
  },
})

// ─── Persistence ────────────────────────────────────────────────
const conversationId = ref<string | null>(null)
const isLoadingConversation = ref(false)

const apiBase = computed(() => `/api/teams/${teamId.value}/thinkgraph-chatconversations`)

/**
 * Load an existing conversation for the current nodeId.
 * If no nodeId is provided, we use a special "global" key.
 */
async function loadConversation(nodeId: string | null | undefined) {
  isLoadingConversation.value = true
  conversationId.value = null
  clearMessages()
  addedIds.value = new Set()

  try {
    const lookupId = nodeId || '__global__'
    const result = await $fetch<any>(apiBase.value, {
      query: { nodeId: lookupId },
    })

    if (result && result.id) {
      conversationId.value = result.id
      if (result.messages && Array.isArray(result.messages) && result.messages.length > 0) {
        importMessages(result.messages)
      }
    }
  } catch {
    // No existing conversation found — that's fine, start fresh
  } finally {
    isLoadingConversation.value = false
  }
}

/**
 * Save the current conversation — creates or updates.
 * Fire-and-forget: does not block the UI.
 */
async function saveConversation() {
  const exported = exportMessages()
  if (!exported || exported.length === 0) return

  const nodeIdValue = props.nodeId || '__global__'

  try {
    if (conversationId.value) {
      // Update existing conversation
      await $fetch(`${apiBase.value}/${conversationId.value}`, {
        method: 'PATCH',
        body: {
          messages: exported,
          messageCount: exported.length,
          lastMessageAt: new Date().toISOString(),
        },
      })
    } else {
      // Create new conversation
      const result = await $fetch<any>(apiBase.value, {
        method: 'POST',
        body: {
          nodeId: nodeIdValue,
          title: props.nodeName || 'Chat',
          messages: exported,
          messageCount: exported.length,
          lastMessageAt: new Date().toISOString(),
        },
      })
      if (result && result.id) {
        conversationId.value = result.id
      }
    }
  } catch (e) {
    // Silently fail — don't disrupt the chat experience
    console.warn('Failed to save conversation:', e)
  }
}

// ─── Decision Extraction ────────────────────────────────────────

// Parse DECISION: blocks from assistant messages
const extractedDecisions = computed(() => {
  const decisions: Array<{ content: string; nodeType: string; messageId: string }> = []
  for (const msg of messages.value) {
    if (msg.role !== 'assistant') continue
    const regex = /DECISION:\s*(\{[^}]+\})/g
    let match
    while ((match = regex.exec(msg.content)) !== null) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.content) {
          decisions.push({
            content: parsed.content,
            nodeType: parsed.nodeType || 'idea',
            messageId: msg.id,
          })
        }
      } catch { /* skip invalid JSON */ }
    }
  }
  return decisions
})

const addedIds = ref<Set<string>>(new Set())

function addDecision(decision: { content: string; nodeType: string; messageId: string }) {
  const key = `${decision.messageId}-${decision.content}`
  if (addedIds.value.has(key)) return
  addedIds.value.add(key)
  emit('addToGraph', [{ content: decision.content, nodeType: decision.nodeType }])
}

function addAllDecisions() {
  const toAdd = extractedDecisions.value.filter(d => {
    const key = `${d.messageId}-${d.content}`
    return !addedIds.value.has(key)
  })
  if (toAdd.length === 0) return
  for (const d of toAdd) {
    addedIds.value.add(`${d.messageId}-${d.content}`)
  }
  emit('addToGraph', toAdd.map(d => ({ content: d.content, nodeType: d.nodeType })))
}

function onSubmit() {
  if (input.value.trim()) {
    handleSubmit()
  }
}

// Format message content: remove DECISION: blocks for display, render as clean text
function formatContent(content: string): string {
  return content.replace(/DECISION:\s*\{[^}]+\}/g, '').trim()
}

// Auto-scroll
const messagesEl = ref<HTMLElement>()
watch(messages, () => {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}, { deep: true })

// Load conversation on mount and when nodeId changes
watch(() => props.nodeId, async (newNodeId, oldNodeId) => {
  // Save current conversation before switching (fire-and-forget)
  if (oldNodeId !== undefined && messages.value.length > 0) {
    saveConversation()
  }
  await loadConversation(newNodeId)
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-message-square-text" class="size-4 text-violet-500" />
        <span class="text-sm font-medium">Think with AI</span>
        <span v-if="nodeName" class="text-xs text-neutral-400 truncate max-w-[150px]">
          — {{ nodeName }}
        </span>
      </div>
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="emit('close')"
      />
    </div>

    <!-- Extracted decisions banner -->
    <div
      v-if="extractedDecisions.length > 0"
      class="px-4 py-2 bg-violet-50 dark:bg-violet-900/10 border-b border-violet-200 dark:border-violet-800"
    >
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-medium text-violet-600 dark:text-violet-400">
          {{ extractedDecisions.length }} insight{{ extractedDecisions.length > 1 ? 's' : '' }} found
        </span>
        <UButton
          size="xs"
          variant="soft"
          color="primary"
          label="Add all"
          icon="i-lucide-plus"
          @click="addAllDecisions"
        />
      </div>
      <div class="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
        <button
          v-for="(d, i) in extractedDecisions"
          :key="i"
          class="flex items-center gap-2 text-left text-xs p-1.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors"
          :class="addedIds.has(`${d.messageId}-${d.content}`) ? 'opacity-40' : 'cursor-pointer'"
          :disabled="addedIds.has(`${d.messageId}-${d.content}`)"
          @click="addDecision(d)"
        >
          <UIcon
            :name="addedIds.has(`${d.messageId}-${d.content}`) ? 'i-lucide-check' : 'i-lucide-plus-circle'"
            class="size-3.5 shrink-0"
            :class="addedIds.has(`${d.messageId}-${d.content}`) ? 'text-emerald-500' : 'text-violet-500'"
          />
          <span class="truncate">{{ d.content }}</span>
          <span class="shrink-0 text-[10px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">{{ d.nodeType }}</span>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto p-4 space-y-3">
      <!-- Loading conversation indicator -->
      <div
        v-if="isLoadingConversation"
        class="h-full flex items-center justify-center text-neutral-400"
      >
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
      </div>

      <div
        v-else-if="messages.length === 0"
        class="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600"
      >
        <UIcon name="i-lucide-sparkles" class="size-8 mb-3 opacity-50" />
        <p class="text-sm text-center">
          {{ nodeId ? 'Ask about this node\'s thinking path' : 'Ask about your thinking graph' }}
        </p>
        <p class="text-xs mt-1 opacity-60">AI insights can be added to the graph</p>
      </div>

      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-xl px-3 py-2 text-sm"
            :class="msg.role === 'user'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'"
          >
            <p class="whitespace-pre-wrap leading-relaxed">{{ formatContent(msg.content) }}</p>
          </div>
        </div>
      </template>

      <div v-if="isLoading" class="flex justify-start">
        <div class="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-neutral-400" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="px-4 pb-2">
      <div class="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2">
        {{ error.message || 'Something went wrong' }}
      </div>
    </div>

    <!-- Input -->
    <form
      class="flex items-end gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800"
      @submit.prevent="onSubmit"
    >
      <UTextarea
        v-model="input"
        placeholder="Ask about your thinking..."
        :rows="1"
        autoresize
        class="flex-1"
        :disabled="isLoadingConversation"
        @keydown.enter.exact.prevent="onSubmit"
      />
      <UButton
        type="submit"
        icon="i-lucide-send"
        size="sm"
        :loading="isLoading"
        :disabled="!input.trim() || isLoadingConversation"
      />
    </form>
  </div>
</template>
