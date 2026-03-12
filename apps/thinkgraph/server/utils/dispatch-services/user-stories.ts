import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'user-stories',
  name: 'User Stories',
  description: 'Generate user stories with acceptance criteria',
  type: 'text',
  icon: 'i-lucide-list-checks',
  options: [
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      choices: ['mvp', 'full', 'spike'],
      default: 'mvp',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()
    const scope = (context.options?.scope as string) || 'mvp'

    const scopeInstructions: Record<string, string> = {
      mvp: 'Generate 3-5 user stories for the smallest viable version. Focus on core value only.',
      full: 'Generate 8-12 user stories covering the full feature set. Include edge cases.',
      spike: 'Generate 2-3 technical spike stories to explore unknowns and validate feasibility.',
    }

    const result = await generateText({
      model: ai.model(model),
      system: `You are a product manager. Generate user stories from the given concept.
${scopeInstructions[scope] || scopeInstructions.mvp}

Format each story as:
### US-N: [Title]
**As a** [persona], **I want** [goal] **so that** [benefit]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

**Priority:** [Must/Should/Could]

Be specific to the actual idea, not generic software stories.`,
      prompt: `${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'user-stories',
          content: result.text,
          prompt: context.prompt || context.nodeContent,
          metadata: { model, scope },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.text.length > 200 ? result.text.slice(0, 197) + '...' : result.text,
      childNodeType: 'insight',
    }
  },
})
