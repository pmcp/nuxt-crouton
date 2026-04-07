/**
 * useAIProvider composable - exposes AI provider configuration
 *
 * Provides access to configured AI providers and their available models.
 * Useful for building provider/model selector UIs.
 *
 * Backed by the shared AI provider registry in `shared/utils/ai-providers.ts`
 * — the same definitions the server uses, so client and server can never
 * drift out of sync.
 *
 * @example
 * ```ts
 * const { defaultProvider, defaultModel, providers } = useAIProvider()
 *
 * // Build a model selector
 * const currentProvider = providers.find(p => p.id === defaultProvider.value)
 * const availableModels = currentProvider?.models || []
 * ```
 */

import { computed } from 'vue'
import { useRuntimeConfig } from '#imports'
import {
  AI_PROVIDERS as SHARED_AI_PROVIDERS,
  detectProviderFromModel,
  getModelById,
  getProviderById
} from '../../shared/utils/ai-providers'
import type { AIModelInfo, AIProviderInfo } from '../../shared/types/ai-providers'
import type { AIProvider, AIModel } from '../types'

/**
 * Static provider definitions, projected from the shared registry.
 *
 * The client `AIProvider` shape is `{ id, name, models: string[] }`, while
 * the shared `AIProviderInfo` shape carries full `AIModelInfo[]`. We project
 * down here so existing consumers of `AI_PROVIDERS` keep working.
 */
export const AI_PROVIDERS: AIProvider[] = Object.values(SHARED_AI_PROVIDERS).map(
  (info: AIProviderInfo): AIProvider => ({
    id: info.id,
    name: info.name,
    models: info.models.map(m => m.id)
  })
)

/**
 * Detailed model information by ID, projected from the shared registry.
 */
export const AI_MODELS: Record<string, AIModel> = Object.fromEntries(
  Object.values(SHARED_AI_PROVIDERS).flatMap(provider =>
    provider.models.map((model: AIModelInfo) => [
      model.id,
      { id: model.id, name: model.name, description: model.description }
    ])
  )
)

/**
 * Composable for accessing AI provider configuration
 *
 * Provides access to configured defaults and available providers/models
 * for building provider selection UIs.
 */
export function useAIProvider() {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI as { defaultProvider: string, defaultModel: string }

  return {
    /** The default provider from runtime config */
    defaultProvider: computed(() => defaults.defaultProvider),

    /** The default model from runtime config */
    defaultModel: computed(() => defaults.defaultModel),

    /** List of all available providers (projected from shared registry) */
    providers: AI_PROVIDERS,

    /** Detailed model information by ID (projected from shared registry) */
    models: AI_MODELS,

    /**
     * Get a provider by ID
     */
    getProvider: (providerId: string): AIProvider | undefined => {
      return AI_PROVIDERS.find(p => p.id === providerId)
    },

    /**
     * Get model information by ID — uses shared registry directly so
     * descriptions stay rich (contextWindow, maxOutput available via getModelById).
     */
    getModel: (modelId: string): AIModel | undefined => {
      return AI_MODELS[modelId]
    },

    /**
     * Get all models for a specific provider
     */
    getModelsForProvider: (providerId: string): AIModel[] => {
      const provider = getProviderById(providerId)
      if (!provider) return []
      return provider.models.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description
      }))
    },

    /**
     * Check if a model belongs to a specific provider
     */
    isModelFromProvider: (modelId: string, providerId: string): boolean => {
      const provider = getProviderById(providerId)
      return provider?.models.some(m => m.id === modelId) || false
    },

    /**
     * Detect provider from model ID (delegates to shared util)
     */
    detectProviderFromModel,

    /**
     * Get full server-side model info (id + name + description + contextWindow + maxOutput).
     * Use this when you need richer metadata than the projected `AIModel`.
     */
    getModelInfo: getModelById
  }
}

// Re-export types for convenience
export type { AIProvider, AIModel } from '../types'
