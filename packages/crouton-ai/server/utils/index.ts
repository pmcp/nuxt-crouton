/**
 * Server utilities for @crouton/ai
 *
 * Import from '@crouton/ai/server':
 * ```ts
 * import { createAIProvider, streamText, AI_PROVIDERS } from '@crouton/ai/server'
 * ```
 */

// Provider factory
export { createAIProvider } from './ai'
export type { AIProviderFactory } from './ai'

// Provider registry and helpers
export {
  AI_PROVIDERS,
  getAvailableProviders,
  getAvailableModels,
  getProviderById,
  getModelById,
  detectProviderFromModel,
} from './providers'
export type {
  AIProviderId,
  AIProviderInfo,
  AIModelInfo,
  AIRuntimeConfig,
} from './providers'

// Re-export common AI SDK utilities for convenience
export { streamText, generateText } from 'ai'
