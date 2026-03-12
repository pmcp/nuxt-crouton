import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

registerDispatchService({
  id: 'flux',
  name: 'Flux (fal.ai)',
  description: 'Generate images with Flux via fal.ai',
  type: 'image',
  icon: 'i-lucide-image-plus',
  envKeys: ['falApiKey'],
  options: [
    {
      key: 'imageSize',
      label: 'Size',
      type: 'select',
      choices: ['square_hd', 'landscape_4_3', 'landscape_16_9', 'portrait_4_3', 'portrait_16_9'],
      default: 'landscape_4_3',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const config = useRuntimeConfig(event)
    const imageSize = (context.options?.imageSize as string) || 'landscape_4_3'

    const imagePrompt = context.prompt
      || `Visual representation: ${context.nodeContent}`

    // fal.ai queue-based API
    const submitResponse = await $fetch<{ request_id: string }>(
      'https://queue.fal.run/fal-ai/flux/dev',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${config.falApiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          prompt: imagePrompt,
          image_size: imageSize,
          num_images: 1,
        },
      }
    )

    // Poll for result
    let result: any = null
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await $fetch<{ status: string; response_url?: string }>(
        `https://queue.fal.run/fal-ai/flux/dev/requests/${submitResponse.request_id}/status`,
        {
          headers: { 'Authorization': `Key ${config.falApiKey}` },
        }
      )

      if (statusResponse.status === 'COMPLETED') {
        result = await $fetch<any>(
          `https://queue.fal.run/fal-ai/flux/dev/requests/${submitResponse.request_id}`,
          {
            headers: { 'Authorization': `Key ${config.falApiKey}` },
          }
        )
        break
      }

      if (statusResponse.status === 'FAILED') {
        throw createError({ status: 500, statusText: 'Flux image generation failed' })
      }
    }

    if (!result) {
      throw createError({ status: 504, statusText: 'Flux image generation timed out' })
    }

    const imageUrl = result.images?.[0]?.url

    return {
      artifacts: [
        {
          type: 'image',
          provider: 'flux',
          url: imageUrl,
          prompt: imagePrompt,
          metadata: { imageSize },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Image] ${context.prompt || context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})
