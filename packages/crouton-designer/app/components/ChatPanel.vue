<script setup lang="ts">
import type { AIMessage } from '@fyit/crouton-ai/types'

const props = defineProps<{
  messages: AIMessage[]
  isLoading: boolean
  error?: Error | null
}>()

const emit = defineEmits<{
  send: [message: string]
  retry: []
}>()

const input = ref('')
const messagesContainer = ref<HTMLElement>()
const { t } = useT()

function handleSend() {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// Auto-scroll to bottom on new messages
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
})
</script>

<template>
  <div class="flex flex-col h-full" role="log" aria-live="polite">
    <!-- Messages area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <div
        v-if="messages.length === 0"
        class="flex items-center justify-center h-full text-[var(--ui-text-muted)]"
      >
        <div class="text-center">
          <UIcon name="i-lucide-sparkles" class="size-8 mx-auto mb-2 opacity-50" />
          <p class="text-sm">
            {{ t('designer.chat.emptyState') }}
          </p>
        </div>
      </div>

      <template v-for="msg in messages" :key="msg.id">
        <!-- System messages rendered as centered phase dividers -->
        <div
          v-if="msg.role === 'system'"
          class="flex items-center gap-3 py-1"
        >
          <div class="flex-1 border-t border-[var(--ui-border)]" />
          <span class="text-xs text-[var(--ui-text-muted)] whitespace-nowrap">{{ msg.content.replace(/^---\s*|\s*---$/g, '') }}</span>
          <div class="flex-1 border-t border-[var(--ui-border)]" />
        </div>

        <!-- User/assistant messages -->
        <div
          v-else
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
            :class="msg.role === 'user'
              ? 'bg-[var(--ui-color-primary-500)] text-white'
              : 'bg-[var(--ui-bg-elevated)]'"
          >
            <div class="whitespace-pre-wrap">
              {{ msg.content }}
            </div>
          </div>
        </div>
      </template>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="flex justify-start">
        <div class="bg-[var(--ui-bg-elevated)] rounded-lg px-3 py-2">
          <div class="flex gap-1">
            <span class="size-1.5 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 0ms" />
            <span class="size-1.5 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 150ms" />
            <span class="size-1.5 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error display with retry -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :description="t('designer.chat.error')"
      class="mx-3"
    >
      <template #actions>
        <UButton
          size="xs"
          color="error"
          variant="soft"
          icon="i-lucide-refresh-cw"
          :label="t('designer.chat.retry')"
          @click="emit('retry')"
        />
      </template>
    </UAlert>

    <!-- Input area -->
    <div class="border-t border-[var(--ui-border)] p-3">
      <div class="flex gap-2">
        <UTextarea
          v-model="input"
          :rows="1"
          autoresize
          :placeholder="t('designer.chat.placeholder')"
          class="flex-1"
          :disabled="isLoading"
          @keydown="handleKeydown"
        />
        <UButton
          icon="i-lucide-send"
          color="primary"
          :disabled="!input.trim() || isLoading"
          :loading="isLoading"
          @click="handleSend"
        />
      </div>
    </div>
  </div>
</template>
