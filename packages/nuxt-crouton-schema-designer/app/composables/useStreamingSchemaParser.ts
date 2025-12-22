import { ref } from 'vue'
import type { SchemaField, FieldType, SchemaDesignerState, CollectionOptions } from '../types/schema'
import { FIELD_TYPES } from './useFieldTypes'

export interface ParsedSchema {
  collectionName?: string
  layerName?: string
  fields: SchemaField[]
  options?: Partial<CollectionOptions>
}

export interface ParseResult {
  success: boolean
  schema: ParsedSchema | null
  errors: string[]
  warnings: string[]
}

/**
 * Streaming schema parser for AI-generated JSON schemas
 *
 * Incrementally parses JSON as it streams from AI responses,
 * detecting complete field objects and schema metadata.
 */
export function useStreamingSchemaParser() {
  const validTypes = FIELD_TYPES.map(ft => ft.type)
  const processedFieldHashes = ref<Set<string>>(new Set())

  /**
   * Generate a hash for a field to track processed fields
   */
  function hashField(field: { name: string; type: string }): string {
    return `${field.name}:${field.type}`
  }

  /**
   * Generate a unique ID for a field
   */
  function generateFieldId(): string {
    return `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  /**
   * Extract JSON from AI response content (handles markdown code blocks)
   */
  function extractJSON(content: string): string | null {
    // Try to find JSON in code block first
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch?.[1]) {
      return codeBlockMatch[1].trim()
    }

    // Try to find raw JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch?.[0]) {
      return jsonMatch[0]
    }

    return null
  }

  /**
   * Parse complete field objects from potentially incomplete JSON
   * Uses regex to find complete field object patterns
   */
  function extractCompleteFields(jsonStr: string): Array<{ name: string; type: string; meta?: Record<string, unknown>; refTarget?: string }> {
    const fields: Array<{ name: string; type: string; meta?: Record<string, unknown>; refTarget?: string }> = []

    // Match complete field objects within the fields array
    // Pattern: { "name": "...", "type": "...", ... }
    const fieldPattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"(?:\s*,\s*"meta"\s*:\s*(\{[^}]*\}))?(?:\s*,\s*"refTarget"\s*:\s*"([^"]+)")?\s*\}/g

    let match
    while ((match = fieldPattern.exec(jsonStr)) !== null) {
      const [, name, type, metaStr, refTarget] = match
      if (name && type) {
        let meta: Record<string, unknown> = {}
        if (metaStr) {
          try {
            meta = JSON.parse(metaStr)
          } catch {
            // Ignore malformed meta
          }
        }

        fields.push({
          name,
          type,
          meta,
          ...(refTarget ? { refTarget } : {})
        })
      }
    }

    return fields
  }

  /**
   * Extract collection metadata from JSON string
   */
  function extractMetadata(jsonStr: string): { collectionName?: string; layerName?: string; options?: Partial<CollectionOptions> } {
    const result: { collectionName?: string; layerName?: string; options?: Partial<CollectionOptions> } = {}

    // Extract collectionName
    const collectionMatch = jsonStr.match(/"collectionName"\s*:\s*"([^"]+)"/)
    if (collectionMatch?.[1]) {
      result.collectionName = collectionMatch[1]
    }

    // Extract layerName
    const layerMatch = jsonStr.match(/"layerName"\s*:\s*"([^"]+)"/)
    if (layerMatch?.[1]) {
      result.layerName = layerMatch[1]
    }

    // Try to extract options object
    const optionsMatch = jsonStr.match(/"options"\s*:\s*(\{[^}]+\})/)
    if (optionsMatch?.[1]) {
      try {
        result.options = JSON.parse(optionsMatch[1])
      } catch {
        // Ignore malformed options
      }
    }

    return result
  }

  /**
   * Validate a field type against known types
   */
  function isValidFieldType(type: string): type is FieldType {
    return validTypes.includes(type as FieldType)
  }

  /**
   * Parse streaming content and return newly detected fields
   * Only returns fields that haven't been processed yet
   */
  function parseStreamingContent(content: string): SchemaField[] {
    const jsonStr = extractJSON(content)
    if (!jsonStr) return []

    const rawFields = extractCompleteFields(jsonStr)
    const newFields: SchemaField[] = []

    for (const raw of rawFields) {
      const hash = hashField(raw)

      // Skip already processed fields
      if (processedFieldHashes.value.has(hash)) continue

      // Validate field type
      if (!isValidFieldType(raw.type)) {
        console.warn(`Unknown field type: ${raw.type}`)
        continue
      }

      // Mark as processed
      processedFieldHashes.value.add(hash)

      // Create SchemaField
      newFields.push({
        id: generateFieldId(),
        name: raw.name,
        type: raw.type,
        meta: (raw.meta || {}) as SchemaField['meta'],
        ...(raw.refTarget ? { refTarget: raw.refTarget } : {})
      })
    }

    return newFields
  }

  /**
   * Parse a complete schema from finished AI response
   */
  function parseCompleteSchema(content: string): ParseResult {
    const errors: string[] = []
    const warnings: string[] = []

    const jsonStr = extractJSON(content)
    if (!jsonStr) {
      return {
        success: false,
        schema: null,
        errors: ['No JSON found in response'],
        warnings
      }
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      return {
        success: false,
        schema: null,
        errors: ['Invalid JSON format'],
        warnings
      }
    }

    const schema: ParsedSchema = {
      collectionName: typeof parsed.collectionName === 'string' ? parsed.collectionName : undefined,
      layerName: typeof parsed.layerName === 'string' ? parsed.layerName : undefined,
      fields: [],
      options: typeof parsed.options === 'object' ? parsed.options as Partial<CollectionOptions> : undefined
    }

    // Parse fields
    const rawFields = Array.isArray(parsed.fields) ? parsed.fields : []
    for (const raw of rawFields) {
      if (!raw || typeof raw !== 'object') continue

      const { name, type, meta, refTarget } = raw as Record<string, unknown>

      if (typeof name !== 'string' || !name) {
        errors.push('Field missing name')
        continue
      }

      if (typeof type !== 'string') {
        errors.push(`Field "${name}" missing type`)
        continue
      }

      if (!isValidFieldType(type)) {
        errors.push(`Unknown field type: ${type}`)
        continue
      }

      schema.fields.push({
        id: generateFieldId(),
        name,
        type,
        meta: (meta || {}) as SchemaField['meta'],
        ...(typeof refTarget === 'string' ? { refTarget } : {})
      })
    }

    // Check for required id field
    const hasIdField = schema.fields.some(f => f.name === 'id')
    if (!hasIdField && schema.fields.length > 0) {
      warnings.push('Schema is missing an "id" field - one will be added automatically')
    }

    return {
      success: errors.length === 0,
      schema: schema.fields.length > 0 ? schema : null,
      errors,
      warnings
    }
  }

  /**
   * Parse streaming content and return metadata updates
   */
  function parseStreamingMetadata(content: string): { collectionName?: string; layerName?: string; options?: Partial<CollectionOptions> } {
    const jsonStr = extractJSON(content)
    if (!jsonStr) return {}
    return extractMetadata(jsonStr)
  }

  /**
   * Reset the parser state (call when starting a new conversation)
   */
  function reset() {
    processedFieldHashes.value.clear()
  }

  return {
    parseStreamingContent,
    parseCompleteSchema,
    parseStreamingMetadata,
    reset,
    // For testing
    extractJSON,
    extractCompleteFields,
    isValidFieldType
  }
}
