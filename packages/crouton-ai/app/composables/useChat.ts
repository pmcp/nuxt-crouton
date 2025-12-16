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
 */

import { useChat as useAISDKChat } from '@ai-sdk/vue'
import { computed, toRaw } from 'vue'
import { useRuntimeConfig } from '#imports'
import type { AIChatOptions, AIMessage } from '../types'

/**
 * Composable for AI-powered chat functionality
 *
 * Wraps the AI SDK's useChat composable with crouton-specific defaults
 * and optional team context integration.
 */
export function useChat(options: AIChatOptions = {}) {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI as { defaultProvider: string; defaultModel: string }

  // Try to get team context if @crouton/auth is available
  let teamId: string | undefined
  try {
    // @ts-expect-error - useTeam may not be available
    const { currentTeam } = useTeam()
    teamId = currentTeam?.value?.id
  }
  catch {
    // @crouton/auth not installed, continue without team context
  }

  // Initialize AI SDK chat
  const chat = useAISDKChat({
    api: options.api || '/api/ai/chat',
    id: options.id,
    initialMessages: options.initialMessages,
    initialInput: options.initialInput,
    body: {
      teamId,
      provider: options.provider || defaults.defaultProvider,
      model: options.model || defaults.defaultModel,
      ...(options.body || {}),
    },
    headers: options.headers,
    credentials: options.credentials,
    onFinish: (message) => {
      // Convert to our AIMessage type
      const aiMessage: AIMessage = {
        id: message.id,
        role: message.role as AIMessage['role'],
        content: typeof message.content === 'string'
          ? message.content
          : message.parts?.filter(p => p.type === 'text').map(p => (p as { text: string }).text).join('') || '',
        createdAt: message.createdAt,
      }
      options.onFinish?.(aiMessage)
    },
    onError: (error) => {
      options.onError?.(error)
    },
    onResponse: options.onResponse,
  })

  // Computed loading state (AI SDK uses 'status' in v4)
  const isLoading = computed(() => {
    return chat.status.value === 'streaming' || chat.status.value === 'submitted'
  })

  // Convert messages to our AIMessage format
  const messages = computed(() => {
    return chat.messages.value.map((msg): AIMessage => ({
      id: msg.id,
      role: msg.role as AIMessage['role'],
      content: typeof msg.content === 'string'
        ? msg.content
        : msg.parts?.filter(p => p.type === 'text').map(p => (p as { text: string }).text).join('') || '',
      createdAt: msg.createdAt,
    }))
  })

  return {
    // Core AI SDK returns (compatible types)
    messages,
    input: chat.input,
    handleSubmit: chat.handleSubmit,
    isLoading,
    status: chat.status,
    error: chat.error,
    stop: chat.stop,
    reload: chat.reload,
    setMessages: chat.setMessages,
    append: chat.append,
    data: chat.data,
    setData: chat.setData,
    id: chat.id,

    // Crouton helpers
    clearMessages: () => chat.setMessages([]),

    // For persistence (consuming app implements storage)
    exportMessages: () => toRaw(messages.value),
    importMessages: (msgs: AIMessage[]) => {
      chat.setMessages(msgs.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })))
    },
  }
}

// Re-export types for convenience
export type { AIChatOptions, AIMessage } from '../types'
