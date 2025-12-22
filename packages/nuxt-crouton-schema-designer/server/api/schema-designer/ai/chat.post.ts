/**
 * AI Schema Chat Endpoint
 *
 * Streams AI responses for schema generation conversations.
 * Integrates with nuxt-crouton-ai for multi-provider support.
 *
 * Note: createAIProvider is auto-imported from nuxt-crouton-ai layer
 * when the parent app extends @friendlyinternet/nuxt-crouton-ai
 */

import { streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { messages, systemPrompt, model = 'claude-sonnet-4-5-20250929' } = body

  // createAIProvider is auto-imported from nuxt-crouton-ai layer
  // @ts-expect-error - auto-imported by nitro when AI layer is extended
  if (typeof createAIProvider !== 'function') {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI package not available. Please extend @friendlyinternet/nuxt-crouton-ai in your nuxt.config.ts'
    })
  }

  // @ts-expect-error - auto-imported by nitro
  const ai = createAIProvider(event)

  // Build messages with system prompt
  const fullMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages
  ]

  try {
    const result = await streamText({
      model: ai.model(model),
      messages: fullMessages
    })

    return result.toDataStreamResponse()
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e?.message || 'AI request failed'
    })
  }
})
