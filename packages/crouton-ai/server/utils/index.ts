/**
 * AI Provider Factory for server-side usage
 *
 * Creates AI providers configured from runtime config.
 * Auto-imported when extending the @fyit/crouton-ai layer.
 *
 * @example
 * ```ts
 * // In your server endpoint (createAIProvider is auto-imported)
 * import { streamText } from 'ai'
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

  /**
   * Get the default model ID based on configuration and available API keys
   * Priority: NUXT_AI_DEFAULT_MODEL > config.defaultModel > auto-detect from keys
   *
   * @returns Default model ID (e.g., 'claude-sonnet-4-20250514' or 'gpt-4o-mini')
   * @throws Error if no API keys are configured
   */
  getDefaultModel: () => string
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
  // On CF Workers, useRuntimeConfig() without event returns the module-init
  // snapshot where CF secrets aren't yet available. Fall back to process.env
  // for API keys since Nitro copies worker bindings to process.env per-request.
  const config = useRuntimeConfig(event)
  const anthropicKey = (anthropicKey as string)
    || process.env.NUXT_ANTHROPIC_API_KEY
    || process.env.NITRO_ANTHROPIC_API_KEY
    || ''
  const openaiKey = (openaiKey as string)
    || process.env.NUXT_OPENAI_API_KEY
    || process.env.NITRO_OPENAI_API_KEY
    || ''

  // Cache provider instances
  let openaiInstance: ReturnType<typeof createOpenAI> | null = null
  let anthropicInstance: ReturnType<typeof createAnthropic> | null = null

  return {
    openai: () => {
      if (!openaiKey) {
        throw new Error(
          '@fyit/crouton-ai: OpenAI API key not configured. '
          + 'Set NUXT_OPENAI_API_KEY environment variable or configure runtimeConfig.openaiApiKey'
        )
      }

      if (!openaiInstance) {
        openaiInstance = createOpenAI({
          apiKey: openaiKey as string
        })
      }

      return openaiInstance
    },

    anthropic: () => {
      if (!anthropicKey) {
        throw new Error(
          '@fyit/crouton-ai: Anthropic API key not configured. '
          + 'Set NUXT_ANTHROPIC_API_KEY environment variable or configure runtimeConfig.anthropicApiKey'
        )
      }

      if (!anthropicInstance) {
        anthropicInstance = createAnthropic({
          apiKey: anthropicKey as string
        })
      }

      return anthropicInstance
    },

    model: (modelId: string) => {
      const detected = detectProviderFromModel(modelId)

      if (detected === 'openai' || !detected) {
        // Default to OpenAI for unknown models
        const provider = createAIProvider(event).openai()
        return provider(modelId)
      }

      const provider = createAIProvider(event).anthropic()
      return provider(modelId)
    },

    getDefaultModel: () => {
      const croutonAIConfig = config.public?.croutonAI as { defaultModel?: string } | undefined

      // Priority: env var > config > auto-detect from API keys
      const envModel = config.aiDefaultModel as string | undefined
      if (envModel) return envModel

      if (croutonAIConfig?.defaultModel) return croutonAIConfig.defaultModel

      // Auto-detect based on available API keys (prefer Anthropic)
      if (anthropicKey) return 'claude-sonnet-4-20250514'
      if (openaiKey) return 'gpt-4o-mini'

      throw new Error(
        '@fyit/crouton-ai: No AI API key configured. '
        + 'Set NUXT_ANTHROPIC_API_KEY or NUXT_OPENAI_API_KEY environment variable'
      )
    }
  }
}
