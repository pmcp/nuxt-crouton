/**
 * AI Translation API Endpoint
 *
 * Translates text from one language to another using AI.
 * Uses generateText (non-streaming) since translations are short.
 *
 * @example
 * POST /api/ai/translate
 * {
 *   "sourceText": "Hello world",
 *   "sourceLanguage": "en",
 *   "targetLanguage": "nl",
 *   "fieldType": "product_name",
 *   "existingTranslations": { "fr": "Bonjour le monde" }
 * }
 */
import { z } from 'zod'
import { generateText } from 'ai'
import { defineEventHandler, readBody, createError } from 'h3'
import { createAIProvider } from '../../utils/ai'
import { getLanguageName } from '../../../app/types/translation'
import { useRuntimeConfig } from '#imports'

const translateSchema = z.object({
  sourceText: z.string().min(1, 'Source text is required'),
  sourceLanguage: z.string().min(2).max(5).default('en'),
  targetLanguage: z.string().min(2).max(5),
  fieldType: z.string().optional(),
  existingTranslations: z.record(z.string(), z.string()).optional(),
  customInstructions: z.string().optional(),
  model: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // Read and validate request body
  const rawBody = await readBody<{
    sourceText: string
    sourceLanguage?: string
    targetLanguage: string
    fieldType?: string
    existingTranslations?: Record<string, string>
    customInstructions?: string
    model?: string
  }>(event)

  const parseResult = translateSchema.safeParse(rawBody)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Invalid request body'
    })
  }

  const body = parseResult.data

  // Don't translate to same language
  if (body.sourceLanguage === body.targetLanguage) {
    return {
      text: body.sourceText,
      confidence: 1
    }
  }

  // Build the AI prompt
  const sourceLang = getLanguageName(body.sourceLanguage)
  const targetLang = getLanguageName(body.targetLanguage)

  let prompt = `You are a professional translator. Your task is to translate text from ${sourceLang} to ${targetLang}.`

  // Add field type context
  if (body.fieldType) {
    const fieldContext = getFieldTypeContext(body.fieldType)
    if (fieldContext) {
      prompt += `\n\n${fieldContext}`
    }
  }

  // Add existing translations for consistency (only other languages, not source or target)
  if (body.existingTranslations && Object.keys(body.existingTranslations).length > 0) {
    const otherTranslations = Object.entries(body.existingTranslations)
      .filter(([lang, text]) => text && lang !== body.sourceLanguage && lang !== body.targetLanguage)

    if (otherTranslations.length > 0) {
      prompt += '\n\nFor consistency, here are existing translations in other languages:'
      for (const [lang, translation] of otherTranslations) {
        prompt += `\n- ${getLanguageName(lang)}: "${translation}"`
      }
    }
  }

  // Add custom instructions
  if (body.customInstructions) {
    prompt += `\n\nAdditional instructions: ${body.customInstructions}`
  }

  prompt += '\n\nIMPORTANT: Return ONLY the translated text in ' + targetLang + '. No explanations, no quotes, no prefixes.'
  prompt += `\n\n${sourceLang} text to translate:\n"""${body.sourceText}"""`

  try {
    // Get AI provider and default model from runtime config
    const config = useRuntimeConfig(event)
    const ai = createAIProvider(event)
    const croutonAIConfig = config.public?.croutonAI as { defaultModel?: string } | undefined

    // Determine default model (priority: env var > config > auto-detect from API keys)
    let defaultModel = (config.aiDefaultModel as string)  // NUXT_AI_DEFAULT_MODEL env var
      || croutonAIConfig?.defaultModel
    if (!defaultModel) {
      // Auto-detect based on available API keys
      if (config.anthropicApiKey) {
        defaultModel = 'claude-sonnet-4-20250514'
      } else if (config.openaiApiKey) {
        defaultModel = 'gpt-4o-mini'
      } else {
        throw new Error('No AI API key configured. Set NUXT_ANTHROPIC_API_KEY or NUXT_OPENAI_API_KEY')
      }
    }
    const model = body.model || defaultModel

    // Generate translation (non-streaming)
    const result = await generateText({
      model: ai.model(model),
      prompt,
      maxTokens: 1000,
      temperature: 0.3 // Lower temperature for more consistent translations
    })

    const text = result.text.trim()

    return {
      text,
      confidence: 0.9 // Could be enhanced with actual confidence scoring
    }
  } catch (error: any) {
    console.error('Translation error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Translation failed'
    })
  }
})

/**
 * Get context hints based on field type
 */
function getFieldTypeContext(fieldType: string): string | null {
  const contexts: Record<string, string> = {
    // Product fields
    product_name: 'This is a product name. Keep it concise and marketable.',
    product_description: 'This is a product description. Maintain a professional, compelling tone.',
    product_title: 'This is a product title. Keep it short and attention-grabbing.',

    // Content fields
    title: 'This is a title. Keep it concise and impactful.',
    description: 'This is a description. Maintain natural flow and clarity.',
    content: 'This is content text. Preserve the original tone and style.',
    summary: 'This is a summary. Keep it brief and informative.',

    // UI fields
    label: 'This is a UI label. Keep it very short (1-3 words).',
    button: 'This is button text. Keep it short and action-oriented.',
    placeholder: 'This is placeholder text. Keep it brief and helpful.',
    tooltip: 'This is tooltip text. Keep it concise but informative.',
    error: 'This is an error message. Keep it clear and helpful.',
    success: 'This is a success message. Keep it positive and brief.',

    // Email fields
    email_subject: 'This is an email subject line. Keep it attention-grabbing and under 60 characters.',
    email_body: 'This is email body content. Maintain a professional, friendly tone.',

    // Form fields
    name: 'This is a name field. Keep appropriate capitalization.',
    street: 'This is a street address. Keep local formatting.',
    city: 'This is a city name. Use local naming conventions.'
  }

  // Try exact match first
  if (contexts[fieldType]) {
    return contexts[fieldType]
  }

  // Try partial match
  for (const [key, context] of Object.entries(contexts)) {
    if (fieldType.toLowerCase().includes(key)) {
      return context
    }
  }

  return null
}
