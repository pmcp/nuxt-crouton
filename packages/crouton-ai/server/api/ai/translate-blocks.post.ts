/**
 * AI Block Content Translation API Endpoint
 *
 * Translates block-based content (TipTap JSON) from one language to another.
 * Preserves the block structure while translating text content.
 *
 * @example
 * POST /api/ai/translate-blocks
 * {
 *   "content": { "type": "doc", "content": [...] },
 *   "sourceLanguage": "en",
 *   "targetLanguage": "nl"
 * }
 */
import { z } from 'zod'
import { generateText } from 'ai'
import { defineEventHandler, readBody, createError } from 'h3'
import { createAIProvider } from '../../utils/ai'
import { getLanguageName } from '../../../app/types/translation'
import { useRuntimeConfig } from '#imports'

const translateBlocksSchema = z.object({
  content: z.any(), // Block content JSON
  sourceLanguage: z.string().min(2).max(5).default('en'),
  targetLanguage: z.string().min(2).max(5),
  model: z.string().optional()
})

// Fields that should be translated in block attributes
const TRANSLATABLE_FIELDS = [
  'title',
  'headline',
  'description',
  'label',
  'content' // for richTextBlock
]

// Fields that contain arrays of objects with translatable content
const TRANSLATABLE_ARRAY_FIELDS = {
  links: ['label'],
  features: ['title', 'description'],
  cards: ['title', 'description']
}

interface TextExtraction {
  path: string
  text: string
}

/**
 * Extract all translatable text from block content
 */
function extractTranslatableText(content: any, path = ''): TextExtraction[] {
  const extractions: TextExtraction[] = []

  if (!content || typeof content !== 'object') return extractions

  // Handle arrays
  if (Array.isArray(content)) {
    content.forEach((item, index) => {
      extractions.push(...extractTranslatableText(item, `${path}[${index}]`))
    })
    return extractions
  }

  // Handle block content
  if (content.type === 'doc' && Array.isArray(content.content)) {
    content.content.forEach((block: any, index: number) => {
      extractions.push(...extractTranslatableText(block, `content[${index}]`))
    })
    return extractions
  }

  // Handle individual blocks
  if (content.attrs && typeof content.attrs === 'object') {
    const attrs = content.attrs

    // Extract simple translatable fields
    for (const field of TRANSLATABLE_FIELDS) {
      if (attrs[field] && typeof attrs[field] === 'string' && attrs[field].trim()) {
        extractions.push({
          path: `${path}.attrs.${field}`,
          text: attrs[field]
        })
      }
    }

    // Extract from array fields
    for (const [arrayField, subFields] of Object.entries(TRANSLATABLE_ARRAY_FIELDS)) {
      if (Array.isArray(attrs[arrayField])) {
        attrs[arrayField].forEach((item: any, itemIndex: number) => {
          for (const subField of subFields) {
            if (item[subField] && typeof item[subField] === 'string' && item[subField].trim()) {
              extractions.push({
                path: `${path}.attrs.${arrayField}[${itemIndex}].${subField}`,
                text: item[subField]
              })
            }
          }
        })
      }
    }
  }

  return extractions
}

/**
 * Apply translations back to the content structure
 */
function applyTranslations(content: any, translations: Map<string, string>): any {
  if (!content || typeof content !== 'object') return content

  // Deep clone to avoid mutating original
  const result = JSON.parse(JSON.stringify(content))

  // Apply each translation using its path
  for (const [path, translatedText] of translations) {
    setValueAtPath(result, path, translatedText)
  }

  return result
}

/**
 * Set a value at a given path in an object
 */
function setValueAtPath(obj: any, path: string, value: string): void {
  const parts = path.split(/\.|\[|\]\.?/).filter(Boolean)
  if (parts.length === 0) return

  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!part) continue

    const index = parseInt(part, 10)

    if (!isNaN(index)) {
      current = current[index]
    } else {
      current = current[part]
    }

    if (current === undefined) return
  }

  const lastPart = parts[parts.length - 1]
  if (!lastPart) return

  const lastIndex = parseInt(lastPart, 10)

  if (!isNaN(lastIndex)) {
    current[lastIndex] = value
  } else {
    current[lastPart] = value
  }
}

export default defineEventHandler(async (event) => {
  const rawBody = await readBody(event)
  const parseResult = translateBlocksSchema.safeParse(rawBody)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Invalid request body'
    })
  }

  const body = parseResult.data

  // Don't translate to same language
  if (body.sourceLanguage === body.targetLanguage) {
    return { content: body.content }
  }

  // Extract all translatable text
  const extractions = extractTranslatableText(body.content)

  if (extractions.length === 0) {
    return { content: body.content }
  }

  // Build translation prompt with all texts
  const sourceLang = getLanguageName(body.sourceLanguage)
  const targetLang = getLanguageName(body.targetLanguage)

  const textsToTranslate = extractions.map((e, i) => `[${i}] ${e.text}`).join('\n')

  const prompt = `You are a professional translator. Translate the following texts from ${sourceLang} to ${targetLang}.

These are UI texts from a webpage (titles, descriptions, button labels). Keep them concise and natural.

IMPORTANT: Return ONLY the translations in the same numbered format. Each line should be:
[number] translated text

${sourceLang} texts:
${textsToTranslate}

${targetLang} translations:`

  try {
    const config = useRuntimeConfig(event)
    const ai = createAIProvider(event)
    const croutonAIConfig = config.public?.croutonAI as { defaultModel?: string } | undefined
    const defaultModel = croutonAIConfig?.defaultModel || 'gpt-4o-mini'
    const model = body.model || defaultModel

    const result = await generateText({
      model: ai.model(model),
      prompt,
      maxTokens: 4000,
      temperature: 0.3
    })

    // Parse the translations from the response
    const translations = new Map<string, string>()
    const lines = result.text.trim().split('\n')

    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)$/)
      if (match && match[1] && match[2]) {
        const index = parseInt(match[1], 10)
        const translatedText = match[2].trim()
        const extraction = extractions[index]
        if (extraction) {
          translations.set(extraction.path, translatedText)
        }
      }
    }

    // Apply translations to content
    const translatedContent = applyTranslations(body.content, translations)

    return {
      content: translatedContent,
      translatedCount: translations.size,
      totalCount: extractions.length
    }
  } catch (error: any) {
    console.error('Block translation error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Block translation failed'
    })
  }
})
