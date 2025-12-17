/**
 * Anthropic Provider Configuration
 *
 * Provider metadata and model definitions for Anthropic Claude.
 */

import type { AIProviderInfo, AIModelInfo } from './types'

/**
 * Available Anthropic models
 */
export const ANTHROPIC_MODELS: AIModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and capability',
    contextWindow: 200000,
    maxOutput: 8192,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most capable Claude model',
    contextWindow: 200000,
    maxOutput: 8192,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous generation balanced model',
    contextWindow: 200000,
    maxOutput: 8192,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and efficient for simple tasks',
    contextWindow: 200000,
    maxOutput: 8192,
  },
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
  envKey: 'NUXT_ANTHROPIC_API_KEY',
}
