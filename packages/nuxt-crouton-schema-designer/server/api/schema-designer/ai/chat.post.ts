/**
 * AI Schema Chat Endpoint
 *
 * Streams AI responses for schema generation conversations.
 * Integrates with nuxt-crouton-ai for multi-provider support.
 */

import { streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const { messages, systemPrompt, model = 'gpt-4o' } = await readBody(event)

  // Try to get AI provider from nuxt-crouton-ai
  let ai: { model: (id: string) => ReturnType<ReturnType<typeof import('@ai-sdk/openai').createOpenAI>> }

  try {
    // Dynamic import to handle optional peer dependency
    const { createAIProvider } = await import('@friendlyinternet/nuxt-crouton-ai/server')
    ai = createAIProvider(event)
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI package not available. Please install @friendlyinternet/nuxt-crouton-ai'
    })
  }

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
  } catch (e) {
    console.error('AI streaming error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : 'AI request failed'
    })
  }
})
