import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'technical-spec',
  name: 'Technical Spec',
  description: 'Generate a technical specification or architecture outline',
  type: 'text',
  icon: 'i-lucide-file-cog',
  options: [
    {
      key: 'depth',
      label: 'Depth',
      type: 'select',
      choices: ['overview', 'detailed'],
      default: 'overview',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()
    const depth = (context.options?.depth as string) || 'overview'

    const depthInstructions: Record<string, string> = {
      overview: `Generate a high-level technical overview:
## System Overview
One paragraph describing the system.

## Tech Stack Recommendation
Suggested technologies with brief justification.

## Key Components
3-5 main components/services with responsibilities.

## Data Model
Key entities and their relationships (describe, don't use code).

## API Surface
Main endpoints or interfaces needed.

## Open Questions
2-3 technical unknowns that need investigation.`,
      detailed: `Generate a detailed technical specification:
## Architecture
System design with components and their interactions.

## Data Model
Entities, fields, relationships, and constraints.

## API Design
Endpoints with methods, inputs, and outputs.

## Authentication & Authorization
How users and permissions work.

## Infrastructure
Hosting, databases, caching, queues.

## Risks & Mitigations
Technical risks and how to handle them.

## Implementation Phases
Ordered list of what to build first.`,
    }

    const result = await generateText({
      model: ai.model(model),
      system: `You are a senior software architect. Generate a technical specification.
${depthInstructions[depth] || depthInstructions.overview}

Be opinionated. Pick specific technologies, don't hedge with "you could use X or Y".
Favor modern, pragmatic choices (Nuxt, Cloudflare, SQLite, etc. when appropriate).`,
      prompt: `${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    return {
      artifacts: [
        {
          type: 'text',
          provider: 'technical-spec',
          content: result.text,
          prompt: context.prompt || context.nodeContent,
          metadata: { model, depth },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: result.text.length > 200 ? result.text.slice(0, 197) + '...' : result.text,
      childNodeType: 'insight',
    }
  },
})
