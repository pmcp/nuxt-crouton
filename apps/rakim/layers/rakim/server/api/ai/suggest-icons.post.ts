/**
 * API endpoint to generate personality icon suggestions using AI
 *
 * Takes a personality description and returns 3 suggested emojis/icons
 * that match the personality.
 *
 * Priority: Unicode emoji > Lucide icon > fallback
 */

import { z } from 'zod'

const requestSchema = z.object({
  description: z.string().min(1).max(500),
  // Optional API key override (uses runtime config if not provided)
  anthropicApiKey: z.string().optional(),
})

interface IconSuggestion {
  /** The icon value - emoji (🤖) or lucide icon name (i-lucide-bot) */
  icon: string
  /** Type of icon */
  type: 'emoji' | 'lucide' | 'svg'
  /** Short label describing why this icon fits */
  label: string
}

interface SuggestIconsResponse {
  suggestions: IconSuggestion[]
  description: string
}

// Common Lucide icons that work well for personalities
const LUCIDE_PERSONALITY_ICONS = [
  'smile', 'frown', 'meh', 'laugh', 'angry',
  'heart', 'star', 'zap', 'flame', 'snowflake',
  'sun', 'moon', 'cloud', 'umbrella', 'rainbow',
  'rocket', 'plane', 'car', 'bike', 'ship',
  'home', 'building', 'castle', 'tent', 'mountain',
  'tree', 'flower', 'leaf', 'sprout', 'cactus',
  'dog', 'cat', 'bird', 'fish', 'bug',
  'coffee', 'beer', 'wine', 'pizza', 'apple',
  'music', 'headphones', 'mic', 'radio', 'tv',
  'book', 'pen', 'pencil', 'brush', 'palette',
  'camera', 'film', 'gamepad', 'puzzle', 'dice',
  'trophy', 'medal', 'crown', 'gem', 'gift',
  'briefcase', 'hammer', 'wrench', 'scissors', 'ruler',
  'shield', 'sword', 'target', 'flag', 'anchor',
  'bot', 'brain', 'eye', 'hand', 'footprints',
  'ghost', 'skull', 'alien', 'baby', 'glasses',
  'hat', 'shirt', 'watch', 'ring', 'badge',
]

export default defineEventHandler(async (event): Promise<SuggestIconsResponse> => {
  const body = await readValidatedBody(event, requestSchema.parse)

  // Get API key from body or runtime config
  const config = useRuntimeConfig()
  const apiKey = body.anthropicApiKey || config.anthropicApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Anthropic API key required',
    })
  }

  try {
    const response = await $fetch<{ content: Array<{ text: string }> }>(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: `You are helping pick icons for a chatbot personality. Given the personality description, suggest 3 Unicode emojis that best represent this personality.

Personality description: "${body.description}"

Rules:
- Return EXACTLY 3 emoji suggestions
- Prefer expressive face emojis, animals, objects, or symbols that match the vibe
- Each emoji should be a single Unicode character (no sequences like 👨‍🌾)
- Include a short 2-4 word label for each

Return ONLY a JSON array in this exact format, no other text:
[
  {"emoji": "🦘", "label": "Australian wildlife"},
  {"emoji": "😤", "label": "Angry expression"},
  {"emoji": "🌾", "label": "Farmer vibes"}
]`,
            },
          ],
        },
      }
    )

    const text = response?.content?.[0]?.text?.trim()
    if (!text) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let parsed: Array<{ emoji: string; label: string }>
    try {
      parsed = JSON.parse(text)
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON response from AI')
      }
    }

    // Validate and transform the response
    const suggestions: IconSuggestion[] = parsed.slice(0, 3).map((item) => ({
      icon: item.emoji,
      type: 'emoji' as const,
      label: item.label,
    }))

    // Ensure we have 3 suggestions (fallback to generic emojis if needed)
    while (suggestions.length < 3) {
      const fallbacks = ['🤖', '💬', '✨']
      suggestions.push({
        icon: fallbacks[suggestions.length] || '🤖',
        type: 'emoji',
        label: 'Default',
      })
    }

    return {
      suggestions,
      description: body.description,
    }
  } catch (error: any) {
    console.error('Icon suggestion failed:', error)

    // Return fallback suggestions on error
    return {
      suggestions: [
        { icon: '🤖', type: 'emoji', label: 'Robot assistant' },
        { icon: '💬', type: 'emoji', label: 'Chat bubble' },
        { icon: '✨', type: 'emoji', label: 'Magic sparkles' },
      ],
      description: body.description,
    }
  }
})
