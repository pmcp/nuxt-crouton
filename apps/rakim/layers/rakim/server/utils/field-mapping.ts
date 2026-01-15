/**
 * Field Mapping Utilities
 *
 * Provides utilities for mapping AI-detected fields to Notion properties:
 * - Fuzzy matching of field names (e.g., "priority" → "Priority")
 * - Value transformation (e.g., "high" → "P1")
 * - Auto-generation of field mappings from Notion schema
 */

/**
 * Calculate simple string similarity score (0-1)
 * Uses lowercase comparison and partial matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  // Exact match
  if (s1 === s2) return 1.0

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // Check if they start the same way
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
function findBestMatch(
  aiField: string,
  notionProperties: Record<string, any>
): { propertyName: string; propertyType: string; score: number } | null {
  let bestMatch: { propertyName: string; propertyType: string; score: number } | null = null

  for (const [propName, propInfo] of Object.entries(notionProperties)) {
    const score = calculateSimilarity(aiField, propName)

    if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
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
 * Generate smart value mapping for select fields
 * Maps AI values to Notion select options using fuzzy matching
 */
function generateValueMapping(
  aiFieldType: string,
  notionOptions?: Array<{ name: string; color?: string; id?: string }>
): Record<string, string> {
  if (!notionOptions || notionOptions.length === 0) {
    return {}
  }

  const valueMap: Record<string, string> = {}

  // Priority field - map common priority levels
  if (aiFieldType === 'priority') {
    const priorityValues = ['low', 'medium', 'high', 'urgent']

    for (const aiValue of priorityValues) {
      // Find best matching option
      let bestMatch: { name: string; score: number } | null = null

      for (const option of notionOptions) {
        const score = calculateSimilarity(aiValue, option.name)
        if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { name: option.name, score }
        }
      }

      if (bestMatch) {
        valueMap[aiValue] = bestMatch.name
      }
    }
  }

  // Type field - map common task types
  if (aiFieldType === 'type') {
    const typeValues = ['bug', 'feature', 'question', 'improvement']

    for (const aiValue of typeValues) {
      let bestMatch: { name: string; score: number } | null = null

      for (const option of notionOptions) {
        const score = calculateSimilarity(aiValue, option.name)
        if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { name: option.name, score }
        }
      }

      if (bestMatch) {
        valueMap[aiValue] = bestMatch.name
      }
    }
  }

  return valueMap
}

/**
 * Generate default field mappings from Notion schema
 *
 * Fuzzy matches AI fields to Notion properties and generates smart value mappings.
 *
 * @param notionSchema - Schema from /api/notion/schema/:databaseId
 * @returns Field mapping configuration
 */
export function generateDefaultMapping(notionSchema: {
  properties: Record<string, any>
}): Record<string, any> {
  const mapping: Record<string, any> = {}

  // AI fields that can be mapped (from DetectedTask interface)
  const aiFields = ['priority', 'type', 'assignee', 'dueDate', 'tags', 'domain']

  for (const aiField of aiFields) {
    const match = findBestMatch(aiField, notionSchema.properties)

    if (match) {
      mapping[aiField] = {
        notionProperty: match.propertyName,
        propertyType: match.propertyType,
        valueMap: {}
      }

      // Generate value mapping for select/multi_select/status fields
      if (
        match.propertyType === 'select' ||
        match.propertyType === 'multi_select' ||
        match.propertyType === 'status'
      ) {
        const propInfo = notionSchema.properties[match.propertyName]
        if (propInfo.options) {
          mapping[aiField].valueMap = generateValueMapping(aiField, propInfo.options)
        }
      }
    }
  }

  return mapping
}

/**
 * Transform AI value to Notion-compatible value
 *
 * Performs case-insensitive fuzzy matching to transform AI values
 * into Notion property values.
 *
 * @param aiValue - Value from AI (e.g., "high", "bug")
 * @param selectOptions - Available Notion select options
 * @param valueMap - Optional explicit value mapping
 * @returns Transformed value or original if no match
 */
export function transformValue(
  aiValue: string | null | undefined,
  selectOptions?: Array<{ name: string }>,
  valueMap?: Record<string, string>
): string | null {
  // Handle null/undefined
  if (!aiValue) {
    return null
  }

  // Check explicit value map first
  if (valueMap) {
    const mapped = valueMap[aiValue.toLowerCase()]
    if (mapped) {
      return mapped
    }
  }

  // If no select options, return original value
  if (!selectOptions || selectOptions.length === 0) {
    return aiValue
  }

  // Fuzzy match against available options
  let bestMatch: { name: string; score: number } | null = null

  for (const option of selectOptions) {
    const score = calculateSimilarity(aiValue, option.name)

    // Use a lower threshold (0.3) for fuzzy matching
    if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name: option.name, score }
    }
  }

  // Return best match if found, otherwise original value
  return bestMatch ? bestMatch.name : aiValue
}
