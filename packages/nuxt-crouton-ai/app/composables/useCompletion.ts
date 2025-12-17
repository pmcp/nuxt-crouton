/**
 * useCompletion composable - wraps AI SDK's useCompletion
 *
 * Provides text completion functionality for single-turn AI interactions.
 * Simpler than useChat for quick AI calls that don't require conversation history.
 *
 * @example
 * ```ts
 * const { completion, complete, isLoading } = useCompletion({
 *   api: '/api/ai/completion'
 * })
 *
 * // Trigger completion
 * await complete('Summarize this text: ...')
 * console.log(completion.value)
 * ```
 */

import { useCompletion as useAISDKCompletion } from '@ai-sdk/vue'
import { useRuntimeConfig } from '#imports'
import type { AICompletionOptions } from '../types'

/**
 * Composable for AI-powered text completion
 *
 * Wraps the AI SDK's useCompletion composable with crouton-specific defaults.
 * Use this for single-turn text generation, summarization, or quick AI tasks.
 */
export function useCompletion(options: AICompletionOptions = {}) {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI as { defaultProvider: string; defaultModel: string }

  // Try to get team context if nuxt-crouton is installed (provides useTeamContext)
  let teamId: string | undefined
  try {
    // @ts-expect-error - useTeamContext may not be available if nuxt-crouton isn't installed
    const { getTeamId } = useTeamContext()
    teamId = getTeamId()
  }
  catch {
    // nuxt-crouton not installed, continue without team context
  }

  // Initialize AI SDK completion
  const completionHelper = useAISDKCompletion({
    api: options.api || '/api/ai/completion',
    body: {
      teamId,
      provider: options.provider || defaults.defaultProvider,
      model: options.model || defaults.defaultModel,
      ...(options.body || {}),
    },
    headers: options.headers,
    credentials: options.credentials,
    onFinish: (_prompt, completionText) => {
      options.onFinish?.(completionText)
    },
    onError: (error) => {
      options.onError?.(error)
    },
    onResponse: options.onResponse,
  })

  return {
    // Core AI SDK returns
    completion: completionHelper.completion,
    complete: completionHelper.complete,
    input: completionHelper.input,
    handleSubmit: completionHelper.handleSubmit,
    isLoading: completionHelper.isLoading,
    error: completionHelper.error,
    stop: completionHelper.stop,
    setCompletion: completionHelper.setCompletion,
    data: completionHelper.data,

    // Crouton helpers
    clearCompletion: () => completionHelper.setCompletion(''),
  }
}

// Re-export types for convenience
export type { AICompletionOptions } from '../types'
