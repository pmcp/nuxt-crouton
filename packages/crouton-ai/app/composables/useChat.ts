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
import { computed, isRef, toRaw, unref } from 'vue'
import { useRuntimeConfig } from '#imports'
import type { AIChatOptions, AIMessage, AIToolCall } from '../types'

/**
 * Composable for AI-powered chat functionality
 *
 * Wraps the AI SDK's useChat composable with crouton-specific defaults
 * and optional team context integration.
 */
export function useChat(options: AIChatOptions = {}) {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI as { defaultProvider: string, defaultModel: string }

  // Try to get team context if nuxt-crouton is installed (provides useTeamContext)
  let teamId: string | undefined
  try {
    // @ts-expect-error - useTeamContext may not be available if nuxt-crouton isn't installed
    const { getTeamId } = useTeamContext()
    teamId = getTeamId()
  } catch {
    // nuxt-crouton not installed, continue without team context
  }

  // Build a reactive merged body that properly unwraps refs/computed
  // @ai-sdk/vue's useChat calls unref() on body at request time,
  // so passing a computed ref preserves reactivity
  const mergedBody = computed(() => {
    const extra = isRef(options.body) ? unref(options.body) : (options.body || {})
    return {
      teamId,
      provider: options.provider || defaults.defaultProvider,
      model: options.model || defaults.defaultModel,
      ...(extra as Record<string, unknown>)
    }
  })

  // Initialize AI SDK chat
  const chat = useAISDKChat({
    api: options.api || '/api/ai/chat',
    id: options.id,
    initialMessages: options.initialMessages,
    initialInput: options.initialInput,
    body: mergedBody,
    headers: options.headers,
    credentials: options.credentials,
    maxSteps: options.maxSteps,
    onToolCall: options.onToolCall as any,
    onFinish: (message) => {
      // Convert to our AIMessage type
      const aiMessage: AIMessage = {
        id: message.id,
        role: message.role as AIMessage['role'],
        content: typeof message.content === 'string'
          ? message.content
          : message.parts?.filter(p => p.type === 'text').map(p => (p as { text: string }).text).join('') || '',
        createdAt: message.createdAt
      }
      options.onFinish?.(aiMessage)
    },
    onError: (error) => {
      options.onError?.(error)
    },
    onResponse: options.onResponse
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
      createdAt: msg.createdAt
    }))
  })

  // Extract tool invocations from the latest assistant message
  const toolCalls = computed<AIToolCall[]>(() => {
    const raw = chat.messages.value
    const calls: AIToolCall[] = []
    for (const msg of raw) {
      if (msg.role !== 'assistant' || !msg.parts) continue
      for (const part of msg.parts) {
        if (part.type === 'tool-invocation') {
          const inv = part as { toolInvocation: { toolCallId: string, toolName: string, args: Record<string, unknown> } }
          calls.push({
            toolCallId: inv.toolInvocation.toolCallId,
            toolName: inv.toolInvocation.toolName,
            args: inv.toolInvocation.args
          })
        }
      }
    }
    return calls
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

    // Tool support
    rawMessages: chat.messages,
    toolCalls,

    // Crouton helpers
    clearMessages: () => chat.setMessages([]),

    // For persistence (consuming app implements storage)
    exportMessages: () => toRaw(messages.value),
    importMessages: (msgs: AIMessage[]) => {
      chat.setMessages(msgs.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt
      })))
    }
  }
}

// Re-export types for convenience
export type { AIChatOptions, AIMessage, AIToolCall } from '../types'
