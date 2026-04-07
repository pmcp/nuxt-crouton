/**
 * Shared types for AI provider/model registry.
 *
 * Single source of truth for both client and server consumers — server
 * endpoints use these types directly, client composables can re-export
 * narrower aliases for public API stability.
 */

export type AIProviderId = 'openai' | 'anthropic'

/**
 * Information about a single AI model.
 */
export interface AIModelInfo {
  /** Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-20250514') */
  id: string
  /** Human-readable model name */
  name: string
  /** Description of model capabilities */
  description: string
  /** Context window size in tokens */
  contextWindow?: number
  /** Maximum output tokens */
  maxOutput?: number
}

/**
 * Information about an AI provider.
 */
export interface AIProviderInfo {
  /** Provider identifier (e.g., 'openai') */
  id: AIProviderId
  /** Human-readable provider name */
  name: string
  /** Description of the provider */
  description: string
  /** Provider website URL */
  website: string
  /** Available models */
  models: AIModelInfo[]
  /** Environment variable name for API key */
  envKey: string
}

/**
 * Runtime configuration interface for AI (server-side API key resolution).
 */
export interface AIRuntimeConfig {
  openaiApiKey?: string
  anthropicApiKey?: string
}
