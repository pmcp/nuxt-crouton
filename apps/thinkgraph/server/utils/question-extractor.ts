/**
 * Extracts structured questions from analyst/reviewer output.
 *
 * Called from the webhook handler when signal is 'orange' — converts
 * free-form markdown output into a typed JSON artifact so the frontend
 * can render questions + options without fragile regex parsing.
 */
import { generateObject } from 'ai'
import { z } from 'zod/v3'

const questionsSchema = z.object({
  research: z.string().describe('The research/analysis content before the questions — keep the original markdown formatting'),
  questions: z.array(z.object({
    question: z.string().describe('The question text'),
    options: z.array(z.object({
      key: z.string().describe('Short key like a, b, c'),
      label: z.string().describe('The option text'),
    })).describe('Multiple-choice options, if any. Empty array if open-ended.'),
  })).describe('Questions that need human answers'),
})

export type StructuredQuestions = z.infer<typeof questionsSchema>

/**
 * Extract structured questions from markdown output.
 * Returns null if the output doesn't contain questions.
 */
export async function extractStructuredQuestions(
  output: string,
): Promise<StructuredQuestions | null> {
  if (!output || output.trim().length < 20) return null

  try {
    const ai = createAIProvider()
    const result = await generateObject({
      model: ai.model('claude-haiku-4-5-20251001'),
      schema: questionsSchema,
      messages: [
        {
          role: 'user',
          content: `Extract the research content and questions from this analyst output. Split into: (1) the research/findings section, and (2) the questions that need human answers with their options.\n\n${output}`,
        },
      ],
    })

    const structured = result.object as StructuredQuestions
    if (!structured.questions.length) return null
    return structured
  }
  catch (err) {
    console.error('[question-extractor] Failed to extract questions:', err)
    return null
  }
}
