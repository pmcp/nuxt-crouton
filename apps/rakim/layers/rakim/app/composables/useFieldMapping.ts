/**
 * Composable for field mapping with fuzzy matching
 *
 * Provides utilities for auto-generating field mappings between AI fields
 * and Notion properties using similarity scoring.
 *
 * @example
 * ```ts
 * const { generateAutoMapping, calculateSimilarity } = useFieldMapping()
 *
 * const mapping = generateAutoMapping(notionSchema, {
 *   aiFields: ['priority', 'type', 'assignee']
 * })
 *
 * console.log(mapping)
 * // {
 * //   priority: {
 * //     notionProperty: 'Priority',
 * //     propertyType: 'select',
 * //     valueMap: { high: 'P1', medium: 'P2', low: 'P3' }
 * //   }
 * // }
 * ```
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

export interface GenerateMappingOptions {
  /**
   * AI fields to map
   * @default ['priority', 'type', 'assignee']
   */
  aiFields?: string[]

  /**
   * Minimum similarity threshold for matching (0-1)
   * @default 0.5
   */
  similarityThreshold?: number
}

/**
 * Simple client-side fuzzy matching
 *
 * Calculates similarity score between two strings using:
 * - Exact match: 1.0
 * - Substring match: 0.8
 * - Prefix match: proportional to matching length
 *
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score (0-1)
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
 *
 * @param aiField AI field name (e.g., 'priority')
 * @param properties Notion schema properties
 * @param threshold Minimum similarity threshold
 * @returns Best match or null if no match found
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
 * Maps AI values (low/medium/high) to Notion options using fuzzy matching.
 *
 * @param aiFieldType Type of AI field ('priority' or 'type')
 * @param notionOptions Available options in Notion property
 * @param threshold Minimum similarity threshold
 * @returns Value mapping object
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

/**
 * Generate complete auto-mapping from Notion schema
 *
 * @param schema Notion schema with properties
 * @param options Configuration options
 * @returns Complete field mapping object
 */
export function generateAutoMapping(
  schema: NotionSchemaForMapping,
  options: GenerateMappingOptions = {}
): Record<string, FieldMapping> {
  const {
    aiFields = ['priority', 'type', 'assignee'],
    similarityThreshold = 0.5
  } = options

  const mapping: Record<string, FieldMapping> = {}

  for (const aiField of aiFields) {
    const match = findBestMatch(aiField, schema.properties, similarityThreshold)

    if (match) {
      mapping[aiField] = {
        notionProperty: match.propertyName,
        propertyType: match.propertyType,
        valueMap: {}
      }

      // Generate value mapping for select/status fields
      if (match.propertyType === 'select' || match.propertyType === 'status') {
        const propInfo = schema.properties[match.propertyName]
        if (propInfo.options) {
          mapping[aiField].valueMap = generateValueMapping(aiField, propInfo.options)
        }
      }
    }
  }

  return mapping
}

/**
 * Get property type badge color for UI
 *
 * @param type Notion property type
 * @returns Color name for badge
 */
export function getPropertyTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'select': 'blue',
    'multi_select': 'purple',
    'status': 'green',
    'people': 'orange',
    'date': 'pink',
    'rich_text': 'gray',
    'title': 'gray'
  }

  return colorMap[type] || 'gray'
}

/**
 * Main composable for field mapping
 */
export function useFieldMapping() {
  return {
    /**
     * Calculate similarity between two strings
     */
    calculateSimilarity,

    /**
     * Find best matching Notion property
     */
    findBestMatch,

    /**
     * Generate value mapping for select fields
     */
    generateValueMapping,

    /**
     * Generate complete auto-mapping
     */
    generateAutoMapping,

    /**
     * Alias for generateAutoMapping (used by OutputManager)
     */
    autoMapFields: generateAutoMapping,

    /**
     * Get property type color for badges
     */
    getPropertyTypeColor,
  }
}
