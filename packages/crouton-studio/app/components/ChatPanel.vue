<script setup lang="ts">
/**
 * @crouton-studio
 * Chat panel component for Studio
 *
 * Displays message list with user/assistant styling and input field
 */

import type { StudioMessage } from '../types/studio'

interface Props {
  messages: StudioMessage[]
  isLoading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  send: [content: string]
}>()

const input = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// Auto-scroll to bottom when new messages arrive
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
})

function handleSubmit() {
  if (!input.value.trim() || props.isLoading) return
  emit('send', input.value)
  input.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

function getArtifactIcon(type: string): string {
  switch (type) {
    case 'collection':
      return 'i-heroicons-table-cells'
    case 'component':
      return 'i-heroicons-cube'
    case 'page':
      return 'i-heroicons-document-text'
    case 'composable':
      return 'i-heroicons-code-bracket'
    default:
      return 'i-heroicons-document'
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Messages area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <!-- Empty state -->
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
        <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-8 h-8 text-primary-500" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Start a conversation
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Describe what you want to build. For example: "Create a tasks collection with title, status, and assignee fields"
        </p>
      </div>

      <!-- Messages -->
      <template v-else>
        <div
          v-for="message in messages"
          :key="message.id"
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-2xl px-4 py-3"
            :class="[
              message.role === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            ]"
          >
            <!-- Message content -->
            <div class="text-sm whitespace-pre-wrap">
              {{ message.content || (isLoading ? '' : '...') }}
            </div>

            <!-- Loading indicator for assistant -->
            <div
              v-if="message.role === 'assistant' && isLoading && !message.content"
              class="flex items-center gap-1 py-1"
            >
              <span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
            </div>

            <!-- Artifact indicators -->
            <div
              v-if="message.artifacts && message.artifacts.length > 0"
              class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"
            >
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="artifact in message.artifacts"
                  :key="artifact.id"
                  :color="artifact.type === 'collection' ? 'primary' : artifact.type === 'component' ? 'success' : 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  <UIcon :name="getArtifactIcon(artifact.type)" class="w-3 h-3 mr-1" />
                  {{ artifact.name }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Loading indicator when waiting for response -->
      <div v-if="isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user'" class="flex justify-start">
        <div class="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="border-t border-gray-200 dark:border-gray-700 p-4">
      <div class="flex gap-2">
        <UTextarea
          v-model="input"
          :rows="1"
          autoresize
          :maxrows="5"
          placeholder="Describe what you want to build..."
          class="flex-1"
          :disabled="isLoading"
          @keydown="handleKeydown"
        />
        <UButton
          color="primary"
          icon="i-heroicons-paper-airplane"
          :loading="isLoading"
          :disabled="!input.trim() || isLoading"
          @click="handleSubmit"
        />
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  </div>
</template>
