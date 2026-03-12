import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'ui-prototype',
  name: 'UI Prototype',
  description: 'Generate an interactive HTML prototype from your idea',
  type: 'prototype',
  icon: 'i-lucide-layout-template',
  options: [
    {
      key: 'style',
      label: 'Style',
      type: 'select',
      choices: ['modern-minimal', 'dashboard', 'mobile-app', 'landing-page', 'saas'],
      default: 'modern-minimal',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const model = ai.getDefaultModel()
    const style = (context.options?.style as string) || 'modern-minimal'

    const styleInstructions: Record<string, string> = {
      'modern-minimal': 'Clean, lots of whitespace, subtle shadows, neutral colors with one accent color.',
      'dashboard': 'Data-rich layout with cards, charts (use simple CSS bars/progress), sidebar navigation.',
      'mobile-app': 'Mobile-first (max-width: 390px centered), bottom nav, large touch targets, rounded corners.',
      'landing-page': 'Hero section, features grid, testimonials, CTA. Marketing-focused.',
      'saas': 'App shell with sidebar, top bar, content area. Professional and functional.',
    }

    const result = await generateText({
      model: ai.model(model),
      system: `You are a UI/UX designer who writes code. Generate a single, self-contained HTML file that serves as an interactive prototype.

RULES:
- Output ONLY the HTML. No explanation, no markdown fences, just the raw HTML starting with <!DOCTYPE html>.
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Include realistic placeholder content (names, numbers, text) — never use "Lorem ipsum".
- Add hover states, transitions, and micro-interactions using Tailwind classes.
- Make it interactive where possible (clickable tabs, toggles, modals) using minimal inline JavaScript.
- Use a cohesive color scheme. Style: ${styleInstructions[style]}
- Include appropriate icons using inline SVGs or Unicode symbols.
- The page must look polished and professional — like a real product, not a wireframe.
- Add a subtle "Prototype" badge in the corner so it's clear this is a concept.

IMPORTANT: The HTML must be completely self-contained. No external resources except the Tailwind CDN.`,
      prompt: `Create a UI prototype for:\n\n${context.prompt || context.nodeContent}\n\nThinking context:\n${context.thinkingPath}`,
    })

    // Clean up any accidental markdown wrapping
    let html = result.text.trim()
    if (html.startsWith('```')) {
      html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '')
    }

    // Save HTML to blob storage
    const filename = `dispatch/prototype-${Date.now()}.html`
    const blob = await hubBlob().put(filename, html, {
      contentType: 'text/html',
      addRandomSuffix: true,
    })

    return {
      artifacts: [
        {
          type: 'prototype',
          provider: 'ui-prototype',
          url: `/api/blob/${blob.pathname}`,
          content: html,
          prompt: context.prompt || context.nodeContent,
          metadata: { model, style },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[UI Prototype] ${context.prompt || context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})
