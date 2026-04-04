<script setup lang="ts">
/**
 * NodeChatPanel — embedded per-node chat for the detail slideover.
 *
 * Features:
 * - Persists messages via chatconversations collection
 * - Slash commands: /break-down, /send-to-pi
 * - Action buttons inside chat for break-down and dispatch
 * - Exports conversation history for dispatch context
 */

const props = defineProps<{
  nodeId: string
  nodeName?: string
}>()

const emit = defineEmits<{
  'break-down': []
  'send-to-pi': []
}>()

const { teamId } = useTeamContext()

// ─── Context scope toggle ───
type ContextScope = 'node' | 'branch' | 'tree' | 'canvas'
const contextScope = ref<ContextScope>('branch')
const scopeOptions: { value: ContextScope; label: string; icon: string }[] = [
  { value: 'node', label: 'Node', icon: 'i-lucide-circle-dot' },
  { value: 'branch', label: 'Branch', icon: 'i-lucide-git-branch' },
  { value: 'tree', label: 'Tree', icon: 'i-lucide-git-fork' },
  { value: 'canvas', label: 'Canvas', icon: 'i-lucide-layout-dashboard' },
]

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
  api: `/api/teams/${teamId.value}/thinkgraph-nodes/chat`,
  body: computed(() => ({
    nodeId: props.nodeId,
    graphId: '',
    contextScope: contextScope.value,
  })),
  onFinish: () => {
    saveConversation()
  },
})

// ─── Persistence ───
const conversationId = ref<string | null>(null)
const isLoadingConversation = ref(false)
const apiBase = computed(() => `/api/teams/${teamId.value}/thinkgraph-chatconversations`)

async function loadConversation(nodeId: string) {
  isLoadingConversation.value = true
  conversationId.value = null
  clearMessages()
  try {
    const result = await $fetch<any>(apiBase.value, {
      query: { nodeId },
    })
    if (result?.id) {
      conversationId.value = result.id
      if (Array.isArray(result.messages) && result.messages.length > 0) {
        importMessages(result.messages)
      }
    }
  }
  catch {
    // No conversation yet — that's fine
  }
  finally {
    isLoadingConversation.value = false
  }
}

async function saveConversation() {
  const exported = exportMessages()
  if (!exported?.length) return
  try {
    if (conversationId.value) {
      await $fetch(`${apiBase.value}/${conversationId.value}`, {
        method: 'PATCH',
        body: {
          messages: exported,
          messageCount: exported.length,
          lastMessageAt: new Date().toISOString(),
        },
      })
    }
    else {
      const result = await $fetch<any>(apiBase.value, {
        method: 'POST',
        body: {
          nodeId: props.nodeId,
          title: props.nodeName || 'Chat',
          messages: exported,
          messageCount: exported.length,
          lastMessageAt: new Date().toISOString(),
        },
      })
      if (result?.id) {
        conversationId.value = result.id
      }
    }
  }
  catch (e) {
    console.warn('Failed to save conversation:', e)
  }
}

// ─── Slash commands ───
function onSubmit() {
  const trimmed = input.value.trim()
  if (!trimmed) return

  if (trimmed === '/break-down') {
    input.value = ''
    emit('break-down')
    return
  }
  if (trimmed === '/send-to-pi') {
    input.value = ''
    emit('send-to-pi')
    return
  }

  handleSubmit()
}

// ─── Format helper ───
function formatContent(content: string): string {
  return content.replace(/DECISION:\s*\{[^}]+\}/g, '').trim()
}

// ─── Auto-scroll ───
const messagesEl = ref<HTMLElement>()
watch(messages, () => {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}, { deep: true })

// ─── Load on mount / nodeId change ───
watch(() => props.nodeId, async (newId, oldId) => {
  if (oldId && messages.value.length > 0) {
    saveConversation()
  }
  await loadConversation(newId)
}, { immediate: true })

// ─── Public API for parent to get conversation history ───
defineExpose({
  getConversationHistory: () => exportMessages(),
})
</script>

<template>
  <div class="flex flex-col border border-default rounded-lg overflow-hidden bg-default" style="height: 380px;">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-default bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-message-square-text" class="size-3.5 text-violet-500" />
        <span class="text-xs font-medium">Chat</span>
      </div>
      <div class="flex items-center gap-1">
        <!-- Context scope toggle -->
        <div class="flex items-center rounded-md border border-default overflow-hidden">
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            :title="`Context: ${opt.label}`"
            class="px-1.5 py-0.5 transition-colors"
            :class="contextScope === opt.value
              ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'"
            @click="contextScope = opt.value"
          >
            <UIcon :name="opt.icon" class="size-3" />
          </button>
        </div>
        <UButton
          icon="i-lucide-send"
          size="xs"
          variant="ghost"
          color="neutral"
          title="Send to Pi"
          @click="emit('send-to-pi')"
        />
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      <div
        v-if="isLoadingConversation"
        class="h-full flex items-center justify-center text-neutral-400"
      >
        <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
      </div>

      <div
        v-else-if="messages.length === 0"
        class="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600"
      >
        <UIcon name="i-lucide-sparkles" class="size-6 mb-2 opacity-50" />
        <p class="text-xs text-center">Ask about this node</p>
        <p class="text-[10px] mt-1 opacity-60">
          Try <code class="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">/break-down</code>
          or <code class="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">/send-to-pi</code>
        </p>
      </div>

      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs"
            :class="msg.role === 'user'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'"
          >
            <p class="whitespace-pre-wrap leading-relaxed">{{ formatContent(msg.content) }}</p>
          </div>
        </div>
      </template>

      <div v-if="isLoading" class="flex justify-start">
        <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-2.5 py-1.5">
          <UIcon name="i-lucide-loader-2" class="size-3 animate-spin text-neutral-400" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="px-3 pb-1">
      <div class="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/10 rounded px-2 py-1">
        {{ error.message || 'Something went wrong' }}
      </div>
    </div>

    <!-- Input -->
    <form
      class="flex items-end gap-1.5 px-3 py-2 border-t border-default shrink-0"
      @submit.prevent="onSubmit"
    >
      <UTextarea
        v-model="input"
        placeholder="Ask about this node… or /break-down, /send-to-pi"
        :rows="1"
        autoresize
        class="flex-1"
        size="xs"
        :disabled="isLoadingConversation"
        @keydown.enter.exact.prevent="onSubmit"
      />
      <UButton
        type="submit"
        icon="i-lucide-arrow-up"
        size="xs"
        :loading="isLoading"
        :disabled="!input.trim() || isLoadingConversation"
      />
    </form>
  </div>
</template>
