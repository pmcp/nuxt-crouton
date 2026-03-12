import { generateObject } from 'ai'
import { z } from 'zod/v3'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

const userStoriesSchema = z.object({
  summary: z.string().describe('Brief 1-line summary of the user stories generated'),
  stories: z.array(z.object({
    title: z.string().describe('Short title, e.g. "View Daily Predictions"'),
    persona: z.string().describe('The user persona, e.g. "restaurant manager"'),
    goal: z.string().describe('What the user wants to do'),
    benefit: z.string().describe('Why they want it'),
    acceptanceCriteria: z.array(z.string()).describe('3-5 acceptance criteria'),
    priority: z.enum(['Must', 'Should', 'Could']),
  })),
})

registerDispatchService({
  id: 'user-stories',
  name: 'User Stories',
  description: 'Generate user stories with acceptance criteria (one node per story)',
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

    const result = await generateObject({
      model: ai.model(model),
      schema: userStoriesSchema,
      system: `You are a product manager. Generate user stories from the given concept.
${scopeInstructions[scope] || scopeInstructions.mvp}

Be specific to the actual idea, not generic software stories. Base your stories on the full context provided, including any prototypes, code, or artifacts in the thinking path.`,
      prompt: `${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    const stories = result.object.stories

    // Build tree: each story becomes its own child node
    const tree = stories.map(story => {
      const storyText = `**${story.title}**\nAs a ${story.persona}, I want ${story.goal} so that ${story.benefit}\n\nAcceptance Criteria:\n${story.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}\n\nPriority: ${story.priority}`
      return {
        content: storyText,
        nodeType: 'insight',
      }
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'user-stories',
          content: stories.map((s, i) => `### US-${i + 1}: ${s.title}\nAs a ${s.persona}, I want ${s.goal} so that ${s.benefit}\n\nAcceptance Criteria:\n${s.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}\n\nPriority: ${s.priority}`).join('\n\n'),
          prompt: context.prompt || context.nodeContent,
          metadata: { model, scope, count: stories.length },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.object.summary,
      childNodeType: 'insight',
      _tree: tree,
    } as DispatchResult & { _tree: typeof tree }
  },
})
