/**
 * Shared AI provider/model registry — single source of truth for both client
 * composables and server utilities.
 *
 * Server endpoints use this to validate models and check env-key availability.
 * Client composables expose this same data for building provider/model selectors.
 */

import type { AIModelInfo, AIProviderInfo, AIProviderId, AIRuntimeConfig } from '../types/ai-providers'

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS: AIModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable model for complex tasks',
    contextWindow: 128000,
    maxOutput: 16384
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and cost-effective for simpler tasks',
    contextWindow: 128000,
    maxOutput: 16384
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model',
    contextWindow: 200000,
    maxOutput: 100000
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    description: 'Faster reasoning model',
    contextWindow: 128000,
    maxOutput: 65536
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    description: 'Latest reasoning model',
    contextWindow: 200000,
    maxOutput: 100000
  }
]

/**
 * OpenAI provider information
 */
export const OPENAI_PROVIDER: AIProviderInfo = {
  id: 'openai',
  name: 'OpenAI',
  description: 'OpenAI GPT models including GPT-4o and reasoning models',
  website: 'https://openai.com',
  models: OPENAI_MODELS,
  envKey: 'NUXT_OPENAI_API_KEY'
}

/**
 * Available Anthropic models
 */
export const ANTHROPIC_MODELS: AIModelInfo[] = [
  // Claude 4.5 models (latest)
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    description: 'Smart model for complex agents and coding',
    contextWindow: 200000,
    maxOutput: 8192
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'Fastest model with near-frontier intelligence',
    contextWindow: 200000,
    maxOutput: 8192
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    description: 'Premium model combining maximum intelligence with practical performance',
    contextWindow: 200000,
    maxOutput: 8192
  },
  // Claude 4 models
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and capability',
    contextWindow: 200000,
    maxOutput: 8192
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most capable Claude 4 model',
    contextWindow: 200000,
    maxOutput: 8192
  },
  // Claude 3.5 models
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous generation balanced model',
    contextWindow: 200000,
    maxOutput: 8192
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and efficient for simple tasks',
    contextWindow: 200000,
    maxOutput: 8192
  }
]

/**
 * Anthropic provider information
 */
export const ANTHROPIC_PROVIDER: AIProviderInfo = {
  id: 'anthropic',
  name: 'Anthropic',
  description: 'Anthropic Claude models including Sonnet and Opus',
  website: 'https://anthropic.com',
  models: ANTHROPIC_MODELS,
  envKey: 'NUXT_ANTHROPIC_API_KEY'
}

/**
 * Registry of all supported AI providers
 */
export const AI_PROVIDERS: Record<AIProviderId, AIProviderInfo> = {
  openai: OPENAI_PROVIDER,
  anthropic: ANTHROPIC_PROVIDER
}

/**
 * Detect provider from a model ID based on naming prefix.
 *
 * - `gpt-*`, `o1-*`, `o3-*` → openai
 * - `claude-*` → anthropic
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

/**
 * Get list of providers that have API keys configured.
 */
export function getAvailableProviders(config: AIRuntimeConfig): AIProviderInfo[] {
  const available: AIProviderInfo[] = []
  if (config.openaiApiKey) available.push(OPENAI_PROVIDER)
  if (config.anthropicApiKey) available.push(ANTHROPIC_PROVIDER)
  return available
}

/**
 * Get all models from all configured providers.
 */
export function getAvailableModels(config: AIRuntimeConfig): AIModelInfo[] {
  const models: AIModelInfo[] = []
  if (config.openaiApiKey) models.push(...OPENAI_MODELS)
  if (config.anthropicApiKey) models.push(...ANTHROPIC_MODELS)
  return models
}

/**
 * Get provider info by ID.
 */
export function getProviderById(providerId: string): AIProviderInfo | undefined {
  return (AI_PROVIDERS as Record<string, AIProviderInfo>)[providerId]
}

/**
 * Get model info by ID across all providers.
 */
export function getModelById(modelId: string): AIModelInfo | undefined {
  for (const provider of Object.values(AI_PROVIDERS)) {
    const model = provider.models.find(m => m.id === modelId)
    if (model) return model
  }
  return undefined
}
