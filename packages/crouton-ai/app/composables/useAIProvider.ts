/**
 * useAIProvider composable - exposes AI provider configuration
 *
 * Provides access to configured AI providers and their available models.
 * Useful for building provider/model selector UIs.
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
import type { AIProvider, AIModel } from '../types'

/**
 * Static provider definitions with available models
 * Note: API key availability is checked server-side
 */
export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'],
  },
]

/**
 * Detailed model information
 */
export const AI_MODELS: Record<string, AIModel> = {
  // OpenAI models
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable OpenAI model, great for complex tasks',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and cost-effective for simpler tasks',
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'High capability with larger context window',
  },
  'o1': {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model for complex problems',
  },
  'o1-mini': {
    id: 'o1-mini',
    name: 'o1 Mini',
    description: 'Fast reasoning model',
  },
  // Anthropic models
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and speed',
  },
  'claude-opus-4-20250514': {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most capable Anthropic model',
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous generation, reliable performance',
  },
}

/**
 * Composable for accessing AI provider configuration
 *
 * Provides access to configured defaults and available providers/models
 * for building provider selection UIs.
 */
export function useAIProvider() {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI as { defaultProvider: string; defaultModel: string }

  return {
    /** The default provider from runtime config */
    defaultProvider: computed(() => defaults.defaultProvider),

    /** The default model from runtime config */
    defaultModel: computed(() => defaults.defaultModel),

    /** List of all available providers */
    providers: AI_PROVIDERS,

    /** Detailed model information by ID */
    models: AI_MODELS,

    /**
     * Get a provider by ID
     */
    getProvider: (providerId: string): AIProvider | undefined => {
      return AI_PROVIDERS.find(p => p.id === providerId)
    },

    /**
     * Get model information by ID
     */
    getModel: (modelId: string): AIModel | undefined => {
      return AI_MODELS[modelId]
    },

    /**
     * Get all models for a specific provider
     */
    getModelsForProvider: (providerId: string): AIModel[] => {
      const provider = AI_PROVIDERS.find(p => p.id === providerId)
      if (!provider) return []
      return provider.models
        .map(modelId => AI_MODELS[modelId])
        .filter((model): model is AIModel => model !== undefined)
    },

    /**
     * Check if a model belongs to a specific provider
     */
    isModelFromProvider: (modelId: string, providerId: string): boolean => {
      const provider = AI_PROVIDERS.find(p => p.id === providerId)
      return provider?.models.includes(modelId) || false
    },

    /**
     * Detect provider from model ID
     */
    detectProviderFromModel: (modelId: string): string | undefined => {
      if (modelId.startsWith('gpt') || modelId.startsWith('o1')) {
        return 'openai'
      }
      if (modelId.startsWith('claude')) {
        return 'anthropic'
      }
      return undefined
    },
  }
}

// Re-export types for convenience
export type { AIProvider, AIModel } from '../types'
