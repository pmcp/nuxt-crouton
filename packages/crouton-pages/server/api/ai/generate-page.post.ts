import { generateText } from 'ai'

const SYSTEM_PROMPT = `You are a web page content generator for a modern website CMS.
Generate a complete, compelling page structure based on the user's brief.

## Available Block Types

### heroBlock
Full-width hero section — always use this as the first block.
Attrs: { headline?: string, title: string, description?: string, orientation: 'vertical'|'horizontal', reverse: boolean, links: Link[], image?: string }

### sectionBlock
Feature grid section with icon-based feature cards.
Attrs: { title?: string, description?: string, orientation: 'vertical'|'horizontal', reverse: boolean, features: Feature[], links: Link[] }
Feature: { icon?: string, title: string, description?: string }

### ctaBlock
Call-to-action banner — use for conversion sections.
Attrs: { title: string, description?: string, variant: 'subtle'|'soft'|'outline'|'naked', orientation: 'horizontal'|'vertical', links: Link[] }

### cardGridBlock
Grid of cards — use for showcasing multiple items.
Attrs: { title?: string, description?: string, columns: 2|3|4, cards: Card[] }
Card: { title: string, description?: string, icon?: string, to?: string }

### separatorBlock
Visual divider between sections.
Attrs: { label?: string, icon?: string, type: 'solid'|'dashed'|'dotted' }

### richTextBlock
Rich text paragraph content.
Attrs: { content: string } — content is an HTML string

## Link format
{ label: string, to: string, color?: 'primary'|'secondary'|'neutral'|'error'|'warning'|'success', variant?: 'solid'|'soft'|'outline'|'ghost' }

## Icon format
Use Lucide icons: i-lucide-star, i-lucide-zap, i-lucide-shield, i-lucide-code, i-lucide-rocket, i-lucide-heart, i-lucide-check, i-lucide-users, i-lucide-globe, i-lucide-lock, i-lucide-chart-bar, i-lucide-layout, i-lucide-mail, i-lucide-phone, i-lucide-clock, i-lucide-trending-up, etc.

## Output Format

Return ONLY a valid JSON object — no markdown fences, no explanation, nothing else:
{
  "type": "doc",
  "content": [
    { "type": "heroBlock", "attrs": { ... } },
    { "type": "sectionBlock", "attrs": { ... } }
  ]
}

## Rules
- Always start with a heroBlock
- Include 3–5 blocks total, in a logical page flow
- Copy should be specific, compelling, and relevant to the brief
- Use placeholder links: to="#" or to="/contact"
- Orientation: prefer "vertical" for hero, "horizontal" for feature sections
- reverse: alternate true/false across sections for visual variety
- ctaBlock: typically the last or second-to-last block before footer`

export default defineEventHandler(async (event) => {
  const { brief } = await readBody<{ brief: string }>(event)

  if (!brief?.trim()) {
    throw createError({ status: 400, statusText: 'Brief is required' })
  }

  const ai = createAIProvider(event)
  const modelId = ai.getDefaultModel()

  const { text } = await generateText({
    model: ai.model(modelId),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Create a page for: ${brief.trim()}`
      }
    ]
  })

  // Strip markdown fences if the model added them anyway
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.type !== 'doc' || !Array.isArray(parsed.content)) {
      throw new Error('Invalid page structure returned')
    }
    return { content: JSON.stringify(parsed) }
  }
  catch {
    throw createError({
      status: 500,
      statusText: 'Failed to generate valid page structure. Try a more specific brief.'
    })
  }
})
