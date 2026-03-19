<script setup lang="ts">
const props = defineProps<{
  projectId: string
  projectName?: string
  flowId?: string | null
}>()

const emit = defineEmits<{
  close: []
  createItem: [data: { title: string; type: string; brief: string }]
  focusNode: [nodeId: string]
}>()

const { teamId } = useTeamContext()

const {
  messages,
  input,
  handleSubmit,
  isLoading,
  error,
} = useChat({
  api: `/api/teams/${teamId.value}/project-assistant`,
  body: computed(() => ({
    projectId: props.projectId,
    flowId: props.flowId,
  })),
})

function onSubmit() {
  if (input.value.trim()) {
    handleSubmit()
  }
}

// Parse ACTION: blocks from assistant messages
const suggestedActions = computed(() => {
  const actions: Array<{ type: string; title: string; brief: string; messageId: string }> = []
  for (const msg of messages.value) {
    if (msg.role !== 'assistant') continue
    const actionMatch = msg.content.match(/ACTION:\s*(\w+)\s*[—–-]\s*(.+)/i)
    const briefMatch = msg.content.match(/BRIEF:\s*(.+)/i)
    if (actionMatch) {
      actions.push({
        type: actionMatch[1].toLowerCase(),
        title: actionMatch[2].trim(),
        brief: briefMatch ? briefMatch[1].trim() : '',
        messageId: msg.id,
      })
    }
  }
  return actions
})

const createdActions = ref<Set<string>>(new Set())

function createFromSuggestion(action: { type: string; title: string; brief: string; messageId: string }) {
  createdActions.value.add(action.messageId)
  emit('createItem', { title: action.title, type: action.type, brief: action.brief })
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
</script>

<template>
  <div class="flex flex-col h-full border-l border-default">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-sparkles" class="size-4 text-violet-500" />
        <span class="text-sm font-medium">Assistant</span>
      </div>
      <UButton icon="i-lucide-x" size="xs" variant="ghost" color="neutral" @click="emit('close')" />
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-muted">
        <UIcon name="i-lucide-sparkles" class="size-8 mb-3 opacity-50" />
        <p class="text-sm text-center">Ask me what to do next</p>
        <div class="flex flex-wrap gap-1.5 mt-3 justify-center">
          <button
            class="text-xs px-2 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted hover:text-default transition-colors"
            @click="input = 'What should I work on next?'; onSubmit()"
          >
            What's next?
          </button>
          <button
            class="text-xs px-2 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted hover:text-default transition-colors"
            @click="input = 'Triage the pending learnings — which are actionable?'; onSubmit()"
          >
            Triage learnings
          </button>
          <button
            class="text-xs px-2 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted hover:text-default transition-colors"
            @click="input = 'Summarize the project status'; onSubmit()"
          >
            Status summary
          </button>
        </div>
      </div>

      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[90%] rounded-xl px-3 py-2 text-sm"
            :class="msg.role === 'user'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'"
          >
            <p class="whitespace-pre-wrap leading-relaxed text-xs">{{ msg.content }}</p>
          </div>
        </div>
      </template>

      <div v-if="isLoading" class="flex justify-start">
        <div class="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-neutral-400" />
        </div>
      </div>
    </div>

    <!-- Suggested actions -->
    <div
      v-if="suggestedActions.length > 0"
      class="px-4 py-2 border-t border-default bg-violet-50 dark:bg-violet-900/10 space-y-1.5"
    >
      <p class="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-1">Suggested actions</p>
      <div v-for="action in suggestedActions" :key="action.messageId" class="flex items-center gap-2">
        <UButton
          v-if="!createdActions.has(action.messageId)"
          size="xs"
          variant="soft"
          color="primary"
          icon="i-lucide-plus"
          :label="`${action.type}: ${action.title}`"
          class="flex-1 justify-start text-left truncate"
          @click="createFromSuggestion(action)"
        />
        <div v-else class="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <UIcon name="i-lucide-check-circle" class="size-3.5" />
          <span class="truncate">{{ action.title }}</span>
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
    <form class="flex items-end gap-2 px-4 py-3 border-t border-default" @submit.prevent="onSubmit">
      <UTextarea
        v-model="input"
        placeholder="What should I do next?"
        :rows="1"
        autoresize
        class="flex-1"
        @keydown.enter.exact.prevent="onSubmit"
      />
      <UButton type="submit" icon="i-lucide-send" size="sm" :loading="isLoading" :disabled="!input.trim()" />
    </form>
  </div>
</template>
