import { registerDispatchService } from '../dispatch-registry'
import type { DispatchContext, DispatchResult } from '../dispatch-registry'
import type { H3Event } from 'h3'

async function generateWithGeminiFlash(prompt: string, apiKey: string, aspectRatio: string) {
  const response = await $fetch<any>(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio },
        },
      },
    },
  )

  const parts = response?.candidates?.[0]?.content?.parts
  const imagePart = parts?.find((p: any) => p.inlineData)
  if (!imagePart?.inlineData?.data) {
    throw createError({ status: 500, statusText: 'Gemini did not return an image' })
  }
  return imagePart.inlineData as { mimeType: string; data: string }
}

async function generateWithImagen(prompt: string, apiKey: string, aspectRatio: string) {
  const response = await $fetch<any>(
    'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: {
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
        },
      },
    },
  )

  const imageBytes = response?.predictions?.[0]?.bytesBase64Encoded
  if (!imageBytes) {
    throw createError({ status: 500, statusText: 'Imagen did not return an image' })
  }
  return { mimeType: 'image/png', data: imageBytes }
}

registerDispatchService({
  id: 'gemini',
  name: 'Gemini Image',
  description: 'Generate images with Google Gemini / Imagen',
  type: 'image',
  icon: 'i-lucide-sparkles',
  envKeys: ['geminiApiKey'],
  options: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      choices: ['imagen-4', 'gemini-flash'],
      default: 'imagen-4',
    },
    {
      key: 'aspectRatio',
      label: 'Aspect Ratio',
      type: 'select',
      choices: ['1:1', '3:4', '4:3', '9:16', '16:9'],
      default: '4:3',
    },
  ],
  execute: async (context: DispatchContext, event: H3Event): Promise<DispatchResult> => {
    const config = useRuntimeConfig(event)
    const aspectRatio = (context.options?.aspectRatio as string) || '4:3'
    const model = (context.options?.model as string) || 'imagen-4'

    const imagePrompt = context.prompt
      || `Visual representation: ${context.nodeContent}`

    const result = model === 'gemini-flash'
      ? await generateWithGeminiFlash(imagePrompt, config.geminiApiKey as string, aspectRatio)
      : await generateWithImagen(imagePrompt, config.geminiApiKey as string, aspectRatio)

    const ext = result.mimeType === 'image/webp' ? 'webp' : result.mimeType === 'image/jpeg' ? 'jpg' : 'png'

    // Save to blob storage and get a URL
    const filename = `dispatch/gemini-${Date.now()}.${ext}`
    const buffer = Buffer.from(result.data, 'base64')
    const blob = await hubBlob().put(filename, buffer, {
      contentType: result.mimeType,
      addRandomSuffix: true,
    })

    return {
      artifacts: [
        {
          type: 'image',
          provider: 'gemini',
          url: `/api/blob/${blob.pathname}`,
          prompt: imagePrompt,
          metadata: { aspectRatio, model },
          createdAt: new Date().toISOString(),
        },
      ],
      childContent: `[Image] ${context.prompt || context.nodeContent}`,
      childNodeType: 'idea',
    }
  },
})
