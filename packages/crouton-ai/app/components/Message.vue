<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard, useTimeoutFn } from '@vueuse/core'
import type { AIMessage } from '../types'

const props = defineProps<{
  message: AIMessage
  isStreaming?: boolean
}>()

const isUser = computed(() => props.message.role === 'user')
const isSystem = computed(() => props.message.role === 'system')

// Copy functionality
const { copy } = useClipboard()
const copied = ref(false)
const { start: resetCopied } = useTimeoutFn(() => { copied.value = false }, 2000, { immediate: false })

async function handleCopy() {
  await copy(props.message.content)
  copied.value = true
  resetCopied()
}


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
        >{{ message.content }}<span
            v-if="isStreaming && !isUser"
            class="ai-streaming-cursor"
          /></div>
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

<style scoped>
.ai-streaming-cursor {
  display: inline-block;
  width: 0.375rem;
  height: 1em;
  margin-left: 0.125rem;
  background-color: currentColor;
  border-radius: 0.125rem;
  vertical-align: text-bottom;
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}
</style>
