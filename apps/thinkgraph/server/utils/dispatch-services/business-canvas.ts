import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'business-canvas',
  name: 'Business Model Canvas',
  description: 'Break down an idea into a structured business model',
  type: 'text',
  icon: 'i-lucide-layout-grid',
  options: [
    {
      key: 'style',
      label: 'Style',
      type: 'select',
      choices: ['lean-startup', 'traditional', 'social-enterprise'],
      default: 'lean-startup',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()
    const style = (context.options?.style as string) || 'lean-startup'

    const styleInstructions: Record<string, string> = {
      'lean-startup': 'Focus on hypotheses to test, MVP scope, and key metrics. Be scrappy.',
      'traditional': 'Be thorough with revenue streams, cost structure, and partnerships.',
      'social-enterprise': 'Include social impact metrics, beneficiary segments, and sustainability.',
    }

    const result = await generateText({
      model: ai.model(model),
      system: `You are a business strategist. Generate a Business Model Canvas for the given idea.
${styleInstructions[style] || styleInstructions['lean-startup']}

Output using this exact structure with markdown headers:
## Problem
## Customer Segments
## Value Proposition
## Channels
## Revenue Streams
## Key Resources
## Key Activities
## Key Partners
## Cost Structure
## Unfair Advantage

Keep each section to 2-3 bullet points. Be specific, not generic.`,
      prompt: `${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'business-canvas',
          content: result.text,
          prompt: context.prompt || context.nodeContent,
          metadata: { model, style },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.text.length > 200 ? result.text.slice(0, 197) + '...' : result.text,
      childNodeType: 'insight',
    }
  },
})
