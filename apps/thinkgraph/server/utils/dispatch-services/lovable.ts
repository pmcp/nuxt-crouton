import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'

registerDispatchService({
  id: 'lovable',
  name: 'Lovable',
  description: 'Generate a Lovable-ready prompt for prototyping',
  type: 'prototype',
  icon: 'i-lucide-heart',
  // No API keys needed — prompt-only service
  execute: async (context: DispatchContext): Promise<DispatchResult> => {
    const prompt = context.prompt
      ? `${context.prompt}\n\nContext from ThinkGraph:\n${context.thinkingPath}`
      : buildLovablePrompt(context)

    return {
      artifacts: [
        {
          type: 'prototype',
          provider: 'lovable',
          content: prompt,
          prompt: context.nodeContent,
          metadata: { openUrl: `https://lovable.dev/projects/create` },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Lovable Prompt] ${context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})

function buildLovablePrompt(context: DispatchContext): string {
  return `Build a prototype for the following concept:

## Core Idea
${context.nodeContent}

## Thinking Context
${context.thinkingPath}

## Requirements
- Modern, clean UI using React + Tailwind CSS
- Mobile-responsive design
- Include realistic placeholder data
- Focus on the core user flow described above
- Make it interactive and functional`
}
