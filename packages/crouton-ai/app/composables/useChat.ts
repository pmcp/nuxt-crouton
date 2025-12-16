/**
 * useChat composable - wraps AI SDK's useChat
 *
 * Provides real-time streaming chat functionality with multi-provider support.
 *
 * @example
 * ```ts
 * const { messages, input, handleSubmit, isLoading } = useChat({
 *   api: '/api/ai/chat',
 *   model: 'gpt-4o'
 * })
 * ```
 *
 * Full implementation in Phase 3.
 */

import { ref } from 'vue'
import type { AIChatOptions, AIMessage } from '../types'

// Stub export - full implementation in Phase 3
export function useChat(_options: AIChatOptions = {}) {
  // Will be implemented with @ai-sdk/vue in Phase 3
  console.warn('@crouton/ai: useChat not yet implemented. See Phase 3 of implementation plan.')

  return {
    messages: ref<AIMessage[]>([]),
    input: ref(''),
    handleSubmit: () => {},
    isLoading: ref(false),
    error: ref<Error | null>(null),
    stop: () => {},
    reload: () => {},
    setMessages: (_messages: AIMessage[]) => {},
    append: (_message: AIMessage) => {},
    clearMessages: () => {},
    exportMessages: () => [] as AIMessage[],
    importMessages: (_msgs: AIMessage[]) => {},
  }
}
