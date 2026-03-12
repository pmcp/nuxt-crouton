import { generateText } from 'ai'
import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'code',
  name: 'Code Generation',
  description: 'Generate code from your thinking context',
  type: 'code',
  icon: 'i-lucide-code',
  // Uses existing AI providers — no extra keys needed beyond what crouton-ai requires
  options: [
    {
      key: 'language',
      label: 'Language',
      type: 'select',
      choices: ['typescript', 'python', 'javascript', 'vue', 'react', 'sql', 'auto'],
      default: 'auto',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const ai = createAIProvider(event)
    const language = (context.options?.language as string) || 'auto'

    const codePrompt = context.prompt
      || `Generate code that implements the following concept:\n\n${context.nodeContent}`

    const languageHint = language !== 'auto'
      ? `Write the code in ${language}.`
      : 'Choose the most appropriate language.'

    const result = await generateText({
      model: ai.model(ai.getDefaultModel()),
      system: `You are an expert programmer. Generate clean, well-structured code based on the user's concept and thinking context. ${languageHint}

Respond with ONLY the code, wrapped in a single markdown code block with the language specified. No explanations outside the code block.`,
      prompt: `${codePrompt}\n\nThinking context:\n${context.thinkingPath}`,
    })

    // Strip markdown fences — handle various formats (```lang, ``` lang, leading whitespace)
    let code = result.text.trim()
    const codeMatch = code.match(/^```(\w+)?\s*\n([\s\S]*?)```\s*$/s)
    const detectedLang = codeMatch?.[1] || language
    if (codeMatch) {
      code = codeMatch[2].trim()
    } else if (code.startsWith('```')) {
      // Fallback: just strip first and last lines if they're fences
      const lines = code.split('\n')
      if (lines[0].startsWith('```')) lines.shift()
      if (lines[lines.length - 1]?.trim() === '```') lines.pop()
      code = lines.join('\n').trim()
    }

    return {
      artifacts: [
        {
          type: 'code',
          provider: 'ai-code',
          content: code,
          prompt: codePrompt,
          metadata: { language: detectedLang, model: ai.getDefaultModel() },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Code: ${detectedLang}] ${context.nodeContent}`,
      childNodeType: 'decision',
    }
  },
})
