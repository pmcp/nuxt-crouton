/**
 * AI Provider Factory for server-side usage
 *
 * Creates AI providers configured from runtime config.
 *
 * @example
 * ```ts
 * // In your server endpoint
 * import { createAIProvider, streamText } from '@friendlyinternet/nuxt-crouton-ai/server'
 *
 * export default defineEventHandler(async (event) => {
 *   const ai = createAIProvider(event)
 *   const result = await streamText({
 *     model: ai.model('gpt-4o'),
 *     messages
 *   })
 *   return result.toDataStreamResponse()
 * })
 * ```
 */

import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

export interface AIProviderFactory {
  /**
   * Get OpenAI provider instance
   * @returns OpenAI provider configured with API key from runtime config
   */
  openai: () => ReturnType<typeof createOpenAI>

  /**
   * Get Anthropic provider instance
   * @returns Anthropic provider configured with API key from runtime config
   */
  anthropic: () => ReturnType<typeof createAnthropic>

  /**
   * Get model from any provider based on model ID
   * Auto-detects provider from model name prefix
   *
   * @param modelId - Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-20250514')
   * @returns Language model instance ready for use with streamText/generateText
   */
  model: (modelId: string) => ReturnType<ReturnType<typeof createOpenAI>> | ReturnType<ReturnType<typeof createAnthropic>>
}

/**
 * Creates an AI provider factory with access to configured providers.
 *
 * @param event - Optional H3 event for accessing runtime config
 * @returns Provider factory with methods for each provider
 *
 * @example
 * ```ts
 * const ai = createAIProvider(event)
 *
 * // Use specific provider
 * const openai = ai.openai()
 * const model = openai('gpt-4o')
 *
 * // Or use model shorthand (auto-detects provider)
 * const model = ai.model('gpt-4o')
 * const claudeModel = ai.model('claude-sonnet-4-20250514')
 * ```
 */
export function createAIProvider(event?: H3Event): AIProviderFactory {
  const config = useRuntimeConfig(event)

  // Cache provider instances
  let openaiInstance: ReturnType<typeof createOpenAI> | null = null
  let anthropicInstance: ReturnType<typeof createAnthropic> | null = null

  return {
    openai: () => {
      if (!config.openaiApiKey) {
        throw new Error(
          '@friendlyinternet/nuxt-crouton-ai: OpenAI API key not configured. ' +
          'Set NUXT_OPENAI_API_KEY environment variable or configure runtimeConfig.openaiApiKey'
        )
      }

      if (!openaiInstance) {
        openaiInstance = createOpenAI({
          apiKey: config.openaiApiKey as string,
        })
      }

      return openaiInstance
    },

    anthropic: () => {
      if (!config.anthropicApiKey) {
        throw new Error(
          '@friendlyinternet/nuxt-crouton-ai: Anthropic API key not configured. ' +
          'Set NUXT_ANTHROPIC_API_KEY environment variable or configure runtimeConfig.anthropicApiKey'
        )
      }

      if (!anthropicInstance) {
        anthropicInstance = createAnthropic({
          apiKey: config.anthropicApiKey as string,
        })
      }

      return anthropicInstance
    },

    model: (modelId: string) => {
      // Auto-detect provider from model ID prefix
      if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
        const provider = createAIProvider(event).openai()
        return provider(modelId)
      }

      if (modelId.startsWith('claude')) {
        const provider = createAIProvider(event).anthropic()
        return provider(modelId)
      }

      // Default to OpenAI for unknown models
      const provider = createAIProvider(event).openai()
      return provider(modelId)
    }
  }
}
