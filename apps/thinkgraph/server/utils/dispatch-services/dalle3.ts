import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'dalle3',
  name: 'DALL-E 3',
  description: 'Generate images with OpenAI DALL-E 3',
  type: 'image',
  icon: 'i-lucide-image',
  envKeys: ['openaiApiKey'],
  options: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      choices: ['1024x1024', '1792x1024', '1024x1792'],
      default: '1024x1024',
    },
    {
      key: 'quality',
      label: 'Quality',
      type: 'select',
      choices: ['standard', 'hd'],
      default: 'standard',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const config = useRuntimeConfig(event)
    const size = (context.options?.size as string) || '1024x1024'
    const quality = (context.options?.quality as string) || 'standard'

    const imagePrompt = context.prompt
      || `Create a visual representation of this concept:\n\n${context.nodeContent}\n\nContext:\n${context.thinkingPath}`

    const response = await $fetch<{ data: Array<{ url: string; revised_prompt?: string }> }>(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size,
          quality,
        },
      }
    )

    const image = response.data[0]

    return {
      artifacts: [
        {
          type: 'image',
          provider: 'dalle3',
          url: image.url,
          prompt: image.revised_prompt || imagePrompt,
          metadata: { size, quality },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Image] ${context.prompt || context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})
