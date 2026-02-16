<script setup lang="ts">
import type { AIMessage } from '@fyit/crouton-ai/types'

const props = defineProps<{
  messages: AIMessage[]
  isLoading: boolean
  error?: Error | null
}>()

const emit = defineEmits<{
  send: [message: string]
}>()

const input = ref('')
const messagesContainer = ref<HTMLElement>()

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
  <div class="flex flex-col h-full">
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
            Describe your app and I'll help configure it.
          </p>
        </div>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
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

    <!-- Error display (A5.4) -->
    <div v-if="error" class="mx-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
      <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
      <span>AI response failed. Try sending your message again.</span>
    </div>

    <!-- Input area -->
    <div class="border-t border-[var(--ui-border)] p-3">
      <div class="flex gap-2">
        <UTextarea
          v-model="input"
          :rows="1"
          autoresize
          placeholder="Describe your app..."
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
