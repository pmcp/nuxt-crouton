/**
 * OpenAI Provider Configuration
 *
 * Provider metadata and model definitions for OpenAI.
 */

import type { AIProviderInfo, AIModelInfo } from './types'

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
