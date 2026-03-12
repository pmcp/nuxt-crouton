import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'text',
  name: 'Text Generation',
  description: 'Generate text with explicit model selection',
  type: 'text',
  icon: 'i-lucide-text',
  options: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      choices: ['auto', 'gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
      default: 'auto',
    },
    {
      key: 'tone',
      label: 'Tone',
      type: 'select',
      choices: ['analytical', 'creative', 'concise', 'detailed', 'persuasive'],
      default: 'analytical',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const modelId = (context.options?.model as string) || 'auto'
    const tone = (context.options?.tone as string) || 'analytical'
    const resolvedModel = modelId === 'auto' ? ai.getDefaultModel() : modelId

    const textPrompt = context.prompt || context.nodeContent

    const toneInstructions: Record<string, string> = {
      analytical: 'Be analytical, structured, and evidence-based.',
      creative: 'Be creative, imaginative, and explore unconventional angles.',
      concise: 'Be extremely concise. Use short sentences. Cut all filler.',
      detailed: 'Be thorough and detailed. Cover all aspects comprehensively.',
      persuasive: 'Be persuasive and compelling. Build a strong argument.',
    }

    const result = await generateText({
      model: ai.model(resolvedModel),
      system: `You are a skilled writer helping explore ideas. ${toneInstructions[tone] || toneInstructions.analytical}

Use the thinking context to inform your response but focus on the user's specific request.`,
      prompt: `${textPrompt}\n\nThinking context:\n${context.thinkingPath}`,
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'ai-text',
          content: result.text,
          prompt: textPrompt,
          metadata: { model: resolvedModel, tone },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.text.length > 200
        ? result.text.slice(0, 197) + '...'
        : result.text,
      childNodeType: 'insight',
    }
  },
})
