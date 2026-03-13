import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'excalidraw',
  name: 'Excalidraw',
  description: 'Generate hand-drawn style diagrams with Excalidraw',
  type: 'image',
  icon: 'i-lucide-pencil-line',
  options: [
    {
      key: 'style',
      label: 'Diagram Style',
      type: 'select',
      choices: ['auto', 'architecture', 'flowchart', 'mindmap', 'wireframe', 'sequence', 'er-diagram'],
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
    const style = (context.options?.style as string) || 'auto'
    const resolvedModel = modelId === 'auto' ? ai.getDefaultModel() : modelId

    const styleInstruction = style === 'auto'
      ? 'Choose the most appropriate diagram style for the content.'
      : `Create a ${style}-style diagram.`

    const userPrompt = context.prompt || context.nodeContent

    const result = await generateText({
      model: ai.model(resolvedModel),
      system: `You are an Excalidraw diagram expert. Generate valid Excalidraw scene JSON to visualize ideas and concepts as hand-drawn style diagrams.

Rules:
- ${styleInstruction}
- Output ONLY a valid JSON object with "type": "excalidraw", "version": 2, "elements": [...], and "appState": {...}.
- No markdown fences, no explanation, no preamble — just the JSON.
- Use rectangle, diamond, ellipse, arrow, line, and text elements.
- Keep text labels concise (max ~5 words per element).
- Use logical positioning: elements should be spaced apart (~200px gaps), with arrows connecting related nodes.
- Set all elements to roughness: 1 (hand-drawn look).
- Use these colors for variety: "#1e1e1e" (default), "#e03131" (red), "#2f9e44" (green), "#1971c2" (blue), "#f08c00" (orange), "#6741d9" (purple).
- Set backgroundColor to "transparent" for most shapes, or use light fills like "#a5d8ff", "#b2f2bb", "#ffc9c9" sparingly for emphasis.
- For arrows: use type "arrow" with startBinding and endBinding referencing element IDs to connect shapes.
- The appState should include: { "viewBackgroundColor": "#ffffff", "gridSize": null }.
- Ensure all element IDs are unique strings.
- Every text label should be a separate text element with a containerId pointing to its parent shape, and the parent shape should have boundElements referencing the text ID.`,
      prompt: `Create an Excalidraw diagram for:\n\n${userPrompt}\n\nThinking context:\n${context.thinkingPath}`,
    })

    let excalidrawJson = result.text.trim()
    if (excalidrawJson.startsWith('```')) {
      excalidrawJson = excalidrawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    // Validate it's parseable JSON
    try {
      JSON.parse(excalidrawJson)
    }
    catch {
      throw createError({ status: 500, statusText: 'AI generated invalid Excalidraw JSON' })
    }

    // Create a data URI that can be imported into Excalidraw
    const encodedJson = Buffer.from(excalidrawJson).toString('base64')
    const dataUri = `data:application/json;base64,${encodedJson}`

    return {
      artifacts: [
        {
          type: 'prototype',
          provider: 'excalidraw',
          content: excalidrawJson,
          url: dataUri,
          prompt: userPrompt,
          metadata: {
            model: resolvedModel,
            style,
            openUrl: 'https://excalidraw.com',
          },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Excalidraw] ${context.prompt || context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})
