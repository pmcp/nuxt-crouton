/**
 * Shared field-mapping utilities
 *
 * Used by both client (useTriageFieldMapping composable) and server (field-mapping utils)
 * for fuzzy-matching AI field names to Notion properties.
 */

export interface FieldMapping {
  notionProperty: string
  propertyType: string
  valueMap: Record<string, string>
}

export interface NotionSchemaForMapping {
  properties: Record<string, {
    type: string
    options?: Array<{ name: string }>
  }>
}

/**
 * Simple string similarity score (0-1)
 *
 * - Exact match: 1.0
 * - Substring match: 0.8
 * - Prefix match: proportional to matching length
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1.0
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  const minLength = Math.min(s1.length, s2.length)
  let matchingChars = 0
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) matchingChars++
    else break
  }

  return matchingChars / Math.max(s1.length, s2.length)
}

/**
 * Find best matching Notion property for an AI field
 */
export function findBestMatch(
  aiField: string,
  properties: Record<string, any>,
  threshold = 0.5
): { propertyName: string; propertyType: string; score: number } | null {
  let bestMatch: { propertyName: string; propertyType: string; score: number } | null = null

  for (const [propName, propInfo] of Object.entries(properties)) {
    const score = calculateSimilarity(aiField, propName)

    if (score > threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        propertyName: propName,
        propertyType: propInfo.type,
        score
      }
    }
  }

  return bestMatch
}

/**
 * Generate value mapping for select fields
 *
 * Maps AI values (low/medium/high or bug/feature/etc) to Notion options using fuzzy matching.
 */
export function generateValueMapping(
  aiFieldType: string,
  notionOptions?: Array<{ name: string }>,
  threshold = 0.3
): Record<string, string> {
  if (!notionOptions || notionOptions.length === 0) return {}

  const valueMap: Record<string, string> = {}
  const aiValues = aiFieldType === 'priority'
    ? ['low', 'medium', 'high', 'urgent']
    : ['bug', 'feature', 'question', 'improvement']

  for (const aiValue of aiValues) {
    let bestMatch: { name: string; score: number } | null = null

    for (const option of notionOptions) {
      const score = calculateSimilarity(aiValue, option.name)
      if (score > threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { name: option.name, score }
      }
    }

    if (bestMatch) {
      valueMap[aiValue] = bestMatch.name
    }
  }

  return valueMap
}
