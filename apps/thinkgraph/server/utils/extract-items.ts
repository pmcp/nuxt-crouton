/**
 * Extract structured work items from raw text using AI.
 *
 * Handles meeting transcripts, bullet lists, prose notes, brainstorming dumps.
 * Uses Claude Haiku for fast, cheap extraction — returns JSON array of items.
 */
import { generateText } from 'ai'
import { detectTemplate } from './template-detector'

export interface ExtractedItem {
  title: string
  brief: string
  template: string
  steps: string[]
}

const MAX_INPUT_CHARS = 8000

const EXTRACTION_PROMPT = `You extract structured work items from raw text. The text may be:
- A meeting transcript (with speaker names like "Alice:", "Bob:")
- Bullet points or numbered lists
- Prose notes or brainstorming
- Mixed format

For each distinct actionable item, extract:
- title: short headline, max 80 chars, action-oriented when possible
- brief: 1-3 sentence description with context
- template: one of "idea", "research", "task", "feature", "meta"
  - "meta" = improvements to ThinkGraph/pipeline/MCP tools itself
  - "research" = investigation, analysis, exploration, audit
  - "task" = concrete work item (fix, build, implement, refactor)
  - "feature" = larger feature involving deploy/launch/CI
  - "idea" = early-stage thought, not yet actionable

Rules:
- Deduplicate similar items — merge into one
- Skip small talk, greetings, filler, status updates with no action
- Extract decisions as tasks (they need follow-up)
- Extract action items as tasks
- Extract open questions as research items
- Keep titles concise and specific — not generic

Return ONLY a JSON array, no markdown fencing, no explanation:
[{"title": "...", "brief": "...", "template": "..."}]

If no actionable items found, return: []`

/**
 * Strip markdown code fences from AI output before parsing.
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim()
  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  return cleaned.trim()
}

/**
 * Extract structured items from raw text using AI.
 * Returns items with template validated by detectTemplate.
 */
export async function extractItemsFromText(rawText: string): Promise<ExtractedItem[]> {
  if (!rawText || rawText.trim().length < 20) return []

  const truncated = rawText.slice(0, MAX_INPUT_CHARS)

  try {
    const ai = createAIProvider()
    const { text } = await generateText({
      model: ai.model('claude-haiku-4-5-20251001'),
      maxTokens: 2000,
      messages: [
        { role: 'user', content: `${EXTRACTION_PROMPT}\n\n---\n\n${truncated}` },
      ],
    })

    const cleaned = cleanJsonOutput(text)
    const parsed = JSON.parse(cleaned)

    // Handle single object instead of array
    const items: Array<{ title: string; brief: string; template: string }> = Array.isArray(parsed) ? parsed : [parsed]

    // Validate and enrich with detectTemplate
    return items
      .filter(item => item.title && typeof item.title === 'string')
      .map((item) => {
        const detected = detectTemplate(item.title, item.brief)
        // detectTemplate overrides AI suggestion when it finds a strong signal
        // Only keep AI's suggestion if detectTemplate falls back to 'idea' and AI had something more specific
        const template = detected.template !== 'idea' ? detected.template : (item.template || 'idea')
        const steps = detected.template !== 'idea' ? detected.steps : (detected.steps)

        return {
          title: item.title.slice(0, 80),
          brief: item.brief || '',
          template,
          steps,
        }
      })
  }
  catch (err) {
    console.error('[extract-items] Failed to extract:', err instanceof Error ? err.message : err)
    return []
  }
}
