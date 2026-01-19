/**
 * Type definitions for AI providers
 */

/**
 * Information about a single AI model
 */
export interface AIModelInfo {
  /** Model identifier (e.g., 'gpt-4o') */
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
 * Information about an AI provider
 */
export interface AIProviderInfo {
  /** Provider identifier (e.g., 'openai') */
  id: string
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
 * Runtime configuration interface for AI
 */
export interface AIRuntimeConfig {
  openaiApiKey?: string
  anthropicApiKey?: string
}
