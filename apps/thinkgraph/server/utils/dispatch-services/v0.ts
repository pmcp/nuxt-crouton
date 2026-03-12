import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'

registerDispatchService({
  id: 'v0',
  name: 'v0.dev',
  description: 'Generate a v0.dev-ready prompt for UI components',
  type: 'prototype',
  icon: 'i-lucide-layout-template',
  // No API keys needed — prompt-only service
  execute: async (context: DispatchContext): Promise<DispatchResult> => {
    const prompt = context.prompt
      ? `${context.prompt}\n\nContext:\n${context.thinkingPath}`
      : buildV0Prompt(context)

    return {
      artifacts: [
        {
          type: 'prototype',
          provider: 'v0',
          content: prompt,
          prompt: context.nodeContent,
          metadata: { openUrl: 'https://v0.dev/chat' },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[v0 Prompt] ${context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})

function buildV0Prompt(context: DispatchContext): string {
  return `Create a UI component for:

${context.nodeContent}

Context:
${context.thinkingPath}

Use shadcn/ui components, Tailwind CSS, and TypeScript. Make it responsive and interactive.`
}
