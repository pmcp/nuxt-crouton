import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'pitch',
  name: 'Pitch Draft',
  description: 'Generate a compelling pitch from your idea',
  type: 'text',
  icon: 'i-lucide-presentation',
  options: [
    {
      key: 'format',
      label: 'Format',
      type: 'select',
      choices: ['elevator-pitch', 'pitch-deck-outline', 'landing-page-copy'],
      default: 'elevator-pitch',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()
    const format = (context.options?.format as string) || 'elevator-pitch'

    const formatInstructions: Record<string, string> = {
      'elevator-pitch': `Write a 30-second elevator pitch. Structure:
1. Hook (one attention-grabbing sentence)
2. Problem (what's broken)
3. Solution (what we do differently)
4. Proof point (why it works)
5. Ask (what you want from the listener)

Keep it under 150 words. Conversational tone.`,
      'pitch-deck-outline': `Create a 10-slide pitch deck outline:
## Slide 1: Title
## Slide 2: Problem
## Slide 3: Solution
## Slide 4: How It Works
## Slide 5: Market Size
## Slide 6: Business Model
## Slide 7: Traction / Validation
## Slide 8: Competition
## Slide 9: Team (suggest roles needed)
## Slide 10: The Ask

For each slide, write the key message (1-2 sentences) and suggest a visual.`,
      'landing-page-copy': `Write landing page copy with:
## Hero
**Headline:** (max 8 words)
**Subheadline:** (max 20 words)
**CTA:** (button text)

## Problem Section
3 pain points with icons

## Solution Section
3 benefits with short descriptions

## Social Proof
Suggest 2 testimonial angles

## Final CTA
Urgency-driven closing`,
    }

    const result = await generateText({
      model: ai.model(model),
      system: `You are an expert copywriter and pitch consultant.
${formatInstructions[format] || formatInstructions['elevator-pitch']}

Be specific to the actual idea. No filler. Every word must earn its place.`,
      prompt: `${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'pitch',
          content: result.text,
          prompt: context.prompt || context.nodeContent,
          metadata: { model, format },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.text.length > 200 ? result.text.slice(0, 197) + '...' : result.text,
      childNodeType: 'insight',
    }
  },
})
