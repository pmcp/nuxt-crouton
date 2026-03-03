/**
 * Shared AI provider detection — used by both client composables and server utilities.
 *
 * Single source of truth for mapping model ID prefixes to provider IDs.
 */

export type AIProviderId = 'openai' | 'anthropic'

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
