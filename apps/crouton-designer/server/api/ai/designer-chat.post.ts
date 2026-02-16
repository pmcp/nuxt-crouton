import { streamText, tool } from 'ai'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { messages, system, provider, model } = await readBody(event)

  const ai = createAIProvider(event)
  const modelId = model || ai.getDefaultModel()

  const result = streamText({
    model: ai.model(modelId),
    system,
    messages,
    tools: {
      set_app_config: tool({
        description: 'Set or update the app configuration. Call this whenever the user provides information about their app. Partial updates merge with existing values — only include fields you want to change.',
        parameters: z.object({
          name: z.string().optional().describe('App name'),
          description: z.string().optional().describe('Short description of what the app does'),
          appType: z.enum(['saas', 'cms', 'internal-tool', 'marketplace', 'social', 'ecommerce', 'other']).optional().describe('Type of application'),
          multiTenant: z.boolean().optional().describe('Whether the app supports multiple teams/organizations'),
          authType: z.enum(['email-password', 'oauth', 'both']).optional().describe('Authentication method'),
          languages: z.array(z.string()).optional().describe('Supported languages as ISO codes (e.g. ["en", "nl", "fr"])'),
          defaultLocale: z.string().optional().describe('Default language ISO code'),
          packages: z.array(z.string()).optional().describe('Crouton packages to include (e.g. ["crouton-editor", "crouton-i18n"])')
        }),
        execute: async (args) => {
          // Return the args as confirmation — the client handles the actual state update
          return { success: true, config: args }
        }
      })
    },
    maxSteps: 2
  })

  return result.toDataStreamResponse()
})
