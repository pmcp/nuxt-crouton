import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'mermaid',
  name: 'Mermaid Diagram',
  description: 'Generate diagrams from your thinking with AI + Mermaid',
  type: 'image',
  icon: 'i-lucide-git-fork',
  options: [
    {
      key: 'diagramType',
      label: 'Diagram Type',
      type: 'select',
      choices: ['auto', 'flowchart', 'mindmap', 'sequenceDiagram', 'erDiagram', 'stateDiagram-v2', 'graph TD'],
      default: 'auto',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      choices: ['auto', 'gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
      default: 'auto',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const modelId = (context.options?.model as string) || 'auto'
    const diagramType = (context.options?.diagramType as string) || 'auto'
    const resolvedModel = modelId === 'auto' ? ai.getDefaultModel() : modelId

    const diagramTypeInstruction = diagramType === 'auto'
      ? 'Choose the most appropriate Mermaid diagram type for the content (flowchart, mindmap, sequenceDiagram, erDiagram, stateDiagram-v2, etc.).'
      : `Use a Mermaid ${diagramType} diagram.`

    const userPrompt = context.prompt || context.nodeContent

    const result = await generateText({
      model: ai.model(resolvedModel),
      system: `You are a diagram generation expert. Your job is to convert ideas and concepts into clear, well-structured Mermaid diagrams.

Rules:
- ${diagramTypeInstruction}
- Output ONLY valid Mermaid syntax — no markdown fences, no explanation, no preamble.
- Keep node labels concise (max ~5 words per node).
- Use meaningful connections and labels on edges where helpful.
- For flowcharts, prefer TD (top-down) direction unless the content suggests otherwise.
- Ensure the diagram is syntactically valid Mermaid.`,
      prompt: `Create a Mermaid diagram for:\n\n${userPrompt}\n\nThinking context:\n${context.thinkingPath}`,
    })

    // Clean up: strip any accidental markdown fences
    let mermaidCode = result.text.trim()
    if (mermaidCode.startsWith('```')) {
      mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\n?/, '').replace(/\n?```$/, '')
    }

    // Render to image via mermaid.ink
    const encoded = Buffer.from(mermaidCode).toString('base64url')
    const imageUrl = `https://mermaid.ink/img/${encoded}?type=webp&bgColor=!white`

    return {
      artifacts: [
        {
          type: 'image',
          provider: 'mermaid',
          url: imageUrl,
          content: mermaidCode,
          prompt: userPrompt,
          metadata: { model: resolvedModel, diagramType },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Diagram] ${context.prompt || context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})