<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { AIChatOptions, AIMessage } from '../types'
import { useChat } from '../composables/useChat'

const props = withDefaults(defineProps<{
  api?: string
  systemPrompt?: string
  placeholder?: string
  emptyMessage?: string
  provider?: string
  model?: string
  initialMessages?: AIChatOptions['initialMessages']
}>(), {
  api: '/api/ai/chat',
  emptyMessage: 'Start a conversation...',
  placeholder: 'Type a message...'
})

const emit = defineEmits<{
  finish: [message: AIMessage]
  error: [error: Error]
}>()

// Initialize chat composable
const {
  messages,
  input,
  handleSubmit,
  isLoading,
  error,
  clearMessages
} = useChat({
  api: props.api,
  provider: props.provider,
  model: props.model,
  systemPrompt: props.systemPrompt,
  initialMessages: props.initialMessages,
  onFinish: (message) => emit('finish', message),
  onError: (err) => emit('error', err)
})

// Auto-scroll to bottom on new messages
const messagesContainer = ref<HTMLElement>()

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(messages, scrollToBottom, { deep: true })

// Handle form submit
function onSubmit() {
  if (input.value.trim()) {
    handleSubmit()
  }
}

// Expose methods for parent component control
defineExpose({
  messages,
  input,
  isLoading,
  error,
  clearMessages,
  handleSubmit
})
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Messages area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <!-- Empty state -->
      <div
        v-if="messages.length === 0"
        class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"
      >
        <UIcon name="i-lucide-message-square" class="w-12 h-12 mb-3 opacity-50" />
        <p class="text-sm">{{ emptyMessage }}</p>
      </div>

      <!-- Message list -->
      <AIMessage
        v-for="(message, index) in messages"
        :key="message.id || index"
        :message="message"
        :is-streaming="isLoading && index === messages.length - 1 && message.role === 'assistant'"
      />
    </div>

    <!-- Error alert -->
    <div v-if="error" class="px-4 pb-2">
      <UAlert
        color="error"
        variant="soft"
        :title="error.message || 'An error occurred'"
        icon="i-lucide-alert-circle"
        :close="true"
        @update:open="error = undefined"
      />
    </div>

    <!-- Input area -->
    <AIInput
      v-model="input"
      :loading="isLoading"
      :placeholder="placeholder"
      @submit="onSubmit"
    />
  </div>
</template>
