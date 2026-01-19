/**
 * AI Provider Registry
 *
 * Central registry of all available AI providers and their models.
 * Auto-imported when extending the @friendlyinternet/nuxt-crouton-ai layer.
 *
 * @example
 * ```ts
 * // In a server endpoint (no import needed - auto-imported)
 * const openai = AI_PROVIDERS.openai
 * console.log(openai.models) // List of available models
 *
 * // Get only configured providers
 * const available = getAvailableProviders(useRuntimeConfig())
 * ```
 */

import { OPENAI_PROVIDER, OPENAI_MODELS } from './openai'
import { ANTHROPIC_PROVIDER, ANTHROPIC_MODELS } from './anthropic'
import type { AIProviderInfo, AIModelInfo, AIRuntimeConfig } from './types'

// Note: Types are auto-imported from types.ts - no re-export needed

/**
 * Registry of all supported AI providers
 */
export const AI_PROVIDERS = {
  openai: OPENAI_PROVIDER,
  anthropic: ANTHROPIC_PROVIDER
} as const

/**
 * Type for provider IDs
 */
export type AIProviderId = keyof typeof AI_PROVIDERS

/**
 * Get list of providers that have API keys configured
 *
 * @param config - Runtime config with API keys
 * @returns Array of configured provider info
 */
export function getAvailableProviders(config: AIRuntimeConfig): AIProviderInfo[] {
  const available: AIProviderInfo[] = []

  if (config.openaiApiKey) {
    available.push(AI_PROVIDERS.openai)
  }

  if (config.anthropicApiKey) {
    available.push(AI_PROVIDERS.anthropic)
  }

  return available
}

/**
 * Get all models from all configured providers
 *
 * @param config - Runtime config with API keys
 * @returns Array of available models
 */
export function getAvailableModels(config: AIRuntimeConfig): AIModelInfo[] {
  const models: AIModelInfo[] = []

  if (config.openaiApiKey) {
    models.push(...OPENAI_MODELS)
  }

  if (config.anthropicApiKey) {
    models.push(...ANTHROPIC_MODELS)
  }

  return models
}

/**
 * Get provider info by ID
 *
 * @param providerId - Provider identifier
 * @returns Provider info or undefined
 */
export function getProviderById(providerId: string): AIProviderInfo | undefined {
  return AI_PROVIDERS[providerId as AIProviderId]
}

/**
 * Get model info by ID across all providers
 *
 * @param modelId - Model identifier
 * @returns Model info or undefined
 */
export function getModelById(modelId: string): AIModelInfo | undefined {
  for (const provider of Object.values(AI_PROVIDERS)) {
    const model = provider.models.find(m => m.id === modelId)
    if (model) return model
  }
  return undefined
}

/**
 * Detect provider ID from model ID
 *
 * @param modelId - Model identifier
 * @returns Provider ID or undefined
 */
export function detectProviderFromModel(modelId: string): AIProviderId | undefined {
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
    return 'openai'
  }
  if (modelId.startsWith('claude')) {
    return 'anthropic'
  }
  return undefined
}
