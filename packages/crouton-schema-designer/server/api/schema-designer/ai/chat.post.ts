/**
 * AI Schema Chat Endpoint
 *
 * Streams AI responses for schema generation conversations.
 * Integrates with nuxt-crouton-ai for multi-provider support.
 *
 * Note: createAIProvider is auto-imported from nuxt-crouton-ai layer
 * when the parent app extends @fyit/crouton-ai
 */

import { streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { messages, systemPrompt, model = 'claude-sonnet-4-5-20250929' } = body

  // createAIProvider is auto-imported from nuxt-crouton-ai layer
  // @ts-expect-error - auto-imported by nitro when AI layer is extended
  if (typeof createAIProvider !== 'function') {
    throw createError({
      status: 500,
      statusText: 'AI package not available. Please extend @fyit/crouton-ai in your nuxt.config.ts'
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
    console.log('[schema-ai-chat] Request received')
    console.log('[schema-ai-chat] Model:', model)
    console.log('[schema-ai-chat] Messages count:', messages?.length)
    console.log('[schema-ai-chat] System prompt length:', systemPrompt?.length)

    // Stream the response for real-time UI updates
    const result = streamText({
      model: ai.model(model),
      messages: fullMessages,
      onFinish: ({ text, usage }) => {
        console.log('[schema-ai-chat] Stream finished')
        console.log('[schema-ai-chat] Response length:', text?.length)
        console.log('[schema-ai-chat] Token usage:', usage)
      }
    })

    console.log('[schema-ai-chat] Streaming started')

    // Return as data stream for useChat compatibility
    return result.toDataStreamResponse()
  } catch (e: any) {
    console.error('[schema-ai-chat] Error:', e)
    console.error('[schema-ai-chat] Error message:', e?.message)
    console.error('[schema-ai-chat] Error stack:', e?.stack)
    throw createError({
      status: 500,
      statusText: e?.message || 'AI request failed'
    })
  }
})
