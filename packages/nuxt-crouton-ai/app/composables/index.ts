/**
 * @friendlyinternet/nuxt-crouton-ai composables
 *
 * Re-exports all composables for convenient importing.
 */

export { useChat } from './useChat'
export { useCompletion } from './useCompletion'
export { useAIProvider, AI_PROVIDERS, AI_MODELS } from './useAIProvider'

// Re-export types
export type { AIChatOptions, AIMessage, AICompletionOptions, AIProvider, AIModel } from '../types'
