<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import type { AIMessage } from '../types'

const props = defineProps<{
  message: AIMessage
  isStreaming?: boolean
}>()

const emit = defineEmits<{
  copy: [content: string]
}>()

const isUser = computed(() => props.message.role === 'user')
const isSystem = computed(() => props.message.role === 'system')

// Copy functionality
const copied = ref(false)
const { copy } = useClipboard()

async function handleCopy() {
  await copy(props.message.content)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
  emit('copy', props.message.content)
}

// Simple markdown-like rendering for code blocks
const formattedContent = computed(() => {
  return props.message.content
})

// Check if content contains code blocks
</script>

<template>
  <div
    class="flex gap-3 group"
    :class="[
      isUser ? 'flex-row-reverse' : 'flex-row',
      isSystem ? 'opacity-60' : ''
    ]"
  >
    <!-- Avatar -->
    <UAvatar
      :icon="isUser ? 'i-lucide-user' : isSystem ? 'i-lucide-settings' : 'i-lucide-sparkles'"
      :class="[
        isUser ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' : '',
        !isUser && !isSystem ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : ''
      ]"
      size="sm"
    />

    <!-- Message bubble -->
    <div class="flex-1 max-w-[85%] space-y-1">
      <div
        class="rounded-2xl px-4 py-2.5 relative"
        :class="[
          isUser
            ? 'bg-primary-500 text-white dark:bg-primary-600 ml-auto'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        ]"
      >
        <!-- Message content with prose styling -->
        <div
          class="text-sm leading-relaxed whitespace-pre-wrap break-words"
          :class="[
            !isUser ? 'prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-xs' : ''
          ]"
        >
          {{ formattedContent }}
        </div>

        <!-- Streaming indicator -->
        <span
          v-if="isStreaming && !isUser"
          class="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded-sm"
        />
      </div>

      <!-- Actions (copy button) -->
      <div
        v-if="!isUser && !isStreaming"
        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="copied ? 'Copied!' : 'Copy message'"
          @click="handleCopy"
        />
      </div>
    </div>
  </div>
</template>
