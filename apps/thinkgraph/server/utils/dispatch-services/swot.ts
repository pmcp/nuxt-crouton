import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'swot',
  name: 'SWOT Analysis',
  description: 'Strengths, weaknesses, opportunities, threats',
  type: 'text',
  icon: 'i-lucide-shield',
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()

    const result = await generateText({
      model: ai.model(model),
      system: `You are a strategic analyst. Produce a SWOT analysis for the given idea.

Format:
## Strengths
- (3-4 internal advantages)

## Weaknesses
- (3-4 internal disadvantages)

## Opportunities
- (3-4 external factors to exploit)

## Threats
- (3-4 external risks)

## Strategic Implications
2-3 sentences on what this SWOT suggests the next move should be.

Be brutally honest. Don't sugarcoat weaknesses or threats.`,
      prompt: `${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'swot',
          content: result.text,
          prompt: context.prompt || context.nodeContent,
          metadata: { model },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.text.length > 200 ? result.text.slice(0, 197) + '...' : result.text,
      childNodeType: 'insight',
    }
  },
})
