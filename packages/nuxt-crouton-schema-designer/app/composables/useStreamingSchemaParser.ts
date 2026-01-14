import { ref } from 'vue'
import type { SchemaField, FieldType, SchemaDesignerState, CollectionOptions } from '../types/schema'
import { FIELD_TYPES } from './useFieldTypes'

export interface ParsedSchema {
  collectionName?: string
  layerName?: string
  fields: SchemaField[]
  options?: Partial<CollectionOptions>
}

export interface ParsedMultiCollection {
  layerName?: string
  collections: Array<{
    collectionName: string
    fields: SchemaField[]
    options?: Partial<CollectionOptions>
  }>
}

/**
 * Package suggestion from AI response
 */
export interface AIPackageSuggestion {
  packageId: string
  reason: string
  configuration?: Record<string, unknown>
}

/**
 * Full project suggestion including packages and collections
 */
export interface ParsedProjectSuggestion {
  projectName?: string
  baseLayerName?: string
  packages: AIPackageSuggestion[]
  collections: Array<{
    collectionName: string
    fields: SchemaField[]
    options?: Partial<CollectionOptions>
  }>
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
   * Parse multi-collection content from AI response
   * Handles the new format with collections array
   */
  function parseMultiCollectionContent(content: string): ParsedMultiCollection {
    const result: ParsedMultiCollection = {
      layerName: undefined,
      collections: []
    }

    const jsonStr = extractJSON(content)
    if (!jsonStr) return result

    // Check if this is the multi-collection format (has "collections" array)
    if (!jsonStr.includes('"collections"')) {
      return result
    }

    // Try to parse the complete JSON
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // JSON not complete yet, try to extract partial data
      return parsePartialMultiCollectionContent(jsonStr)
    }

    // Extract layer name
    if (typeof parsed.layerName === 'string') {
      result.layerName = parsed.layerName
    }

    // Extract collections
    if (Array.isArray(parsed.collections)) {
      for (const coll of parsed.collections) {
        if (!coll || typeof coll !== 'object') continue

        const collectionName = typeof coll.collectionName === 'string' ? coll.collectionName : ''
        if (!collectionName) continue

        const fields: SchemaField[] = []
        const rawFields = Array.isArray(coll.fields) ? coll.fields : []

        for (const raw of rawFields) {
          if (!raw || typeof raw !== 'object') continue

          const { name, type, meta, refTarget } = raw as Record<string, unknown>

          if (typeof name !== 'string' || !name) continue
          if (typeof type !== 'string' || !isValidFieldType(type)) continue

          const fieldHash = `${collectionName}:${name}:${type}`
          if (processedFieldHashes.value.has(fieldHash)) continue

          processedFieldHashes.value.add(fieldHash)

          fields.push({
            id: generateFieldId(),
            name,
            type,
            meta: (meta || {}) as SchemaField['meta'],
            ...(typeof refTarget === 'string' ? { refTarget } : {})
          })
        }

        if (fields.length > 0 || collectionName) {
          result.collections.push({
            collectionName,
            fields,
            options: typeof coll.options === 'object' ? coll.options as Partial<CollectionOptions> : undefined
          })
        }
      }
    }

    return result
  }

  /**
   * Parse partial multi-collection content when JSON is incomplete
   */
  function parsePartialMultiCollectionContent(jsonStr: string): ParsedMultiCollection {
    const result: ParsedMultiCollection = {
      layerName: undefined,
      collections: []
    }

    // Extract layer name
    const layerMatch = jsonStr.match(/"layerName"\s*:\s*"([^"]+)"/)
    if (layerMatch?.[1]) {
      result.layerName = layerMatch[1]
    }

    // Split the JSON string by collection objects more carefully
    // Find all collection blocks by looking for {"collectionName": patterns
    const collectionStarts: number[] = []
    const collectionNamePattern = /\{\s*"collectionName"\s*:\s*"([^"]+)"/g
    let nameMatch
    while ((nameMatch = collectionNamePattern.exec(jsonStr)) !== null) {
      collectionStarts.push(nameMatch.index)
    }

    // Process each collection block
    for (let i = 0; i < collectionStarts.length; i++) {
      const start = collectionStarts[i]
      // End is either the next collection start or end of string
      const end = collectionStarts[i + 1] || jsonStr.length

      const collectionBlock = jsonStr.slice(start, end)

      // Extract collection name from this block
      const nameMatch2 = collectionBlock.match(/"collectionName"\s*:\s*"([^"]+)"/)
      const collectionName = nameMatch2?.[1]
      if (!collectionName) continue

      // Extract fields array from this specific block only
      const fieldsMatch = collectionBlock.match(/"fields"\s*:\s*\[([\s\S]*?)(?:\]|$)/)
      if (!fieldsMatch) continue

      const fieldsStr = fieldsMatch[1] || ''

      // Extract fields from this collection's fields array
      const fields = extractCompleteFields(`{"fields": [${fieldsStr}]}`)
        .filter(f => {
          const hash = `${collectionName}:${f.name}:${f.type}`
          if (processedFieldHashes.value.has(hash)) return false
          processedFieldHashes.value.add(hash)
          return true
        })
        .map(f => ({
          id: generateFieldId(),
          name: f.name,
          type: f.type as FieldType,
          meta: (f.meta || {}) as SchemaField['meta'],
          ...(f.refTarget ? { refTarget: f.refTarget } : {})
        }))

      if (fields.length > 0) {
        // Check if we already have this collection in result
        const existingCollIdx = result.collections.findIndex(c => c.collectionName === collectionName)
        if (existingCollIdx >= 0) {
          result.collections[existingCollIdx]!.fields.push(...fields)
        } else {
          result.collections.push({
            collectionName,
            fields,
            options: undefined
          })
        }
      }
    }

    return result
  }

  /**
   * Parse full project suggestion including packages from AI response
   * This is the new format that includes projectName, baseLayerName, packages, and collections
   */
  function parseProjectSuggestion(content: string): ParsedProjectSuggestion {
    const result: ParsedProjectSuggestion = {
      projectName: undefined,
      baseLayerName: undefined,
      packages: [],
      collections: []
    }

    const jsonStr = extractJSON(content)
    if (!jsonStr) return result

    // Try to parse complete JSON first
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // JSON not complete yet, try partial extraction
      return parsePartialProjectSuggestion(jsonStr)
    }

    // Extract project metadata
    if (typeof parsed.projectName === 'string') {
      result.projectName = parsed.projectName
    }
    if (typeof parsed.baseLayerName === 'string') {
      result.baseLayerName = parsed.baseLayerName
    }

    // Extract packages
    if (Array.isArray(parsed.packages)) {
      for (const pkg of parsed.packages) {
        if (!pkg || typeof pkg !== 'object') continue
        const { packageId, reason, configuration } = pkg as Record<string, unknown>
        if (typeof packageId === 'string' && packageId) {
          result.packages.push({
            packageId,
            reason: typeof reason === 'string' ? reason : '',
            configuration: typeof configuration === 'object' && configuration !== null
              ? configuration as Record<string, unknown>
              : undefined
          })
        }
      }
    }

    // Extract collections (reuse multi-collection logic)
    if (Array.isArray(parsed.collections)) {
      for (const coll of parsed.collections) {
        if (!coll || typeof coll !== 'object') continue

        const collectionName = typeof coll.collectionName === 'string' ? coll.collectionName : ''
        if (!collectionName) continue

        const fields: SchemaField[] = []
        const rawFields = Array.isArray(coll.fields) ? coll.fields : []

        for (const raw of rawFields) {
          if (!raw || typeof raw !== 'object') continue

          const { name, type, meta, refTarget } = raw as Record<string, unknown>

          if (typeof name !== 'string' || !name) continue
          if (typeof type !== 'string' || !isValidFieldType(type)) continue

          const fieldHash = `${collectionName}:${name}:${type}`
          if (processedFieldHashes.value.has(fieldHash)) continue

          processedFieldHashes.value.add(fieldHash)

          fields.push({
            id: generateFieldId(),
            name,
            type,
            meta: (meta || {}) as SchemaField['meta'],
            ...(typeof refTarget === 'string' ? { refTarget } : {})
          })
        }

        if (fields.length > 0 || collectionName) {
          result.collections.push({
            collectionName,
            fields,
            options: typeof coll.options === 'object' ? coll.options as Partial<CollectionOptions> : undefined
          })
        }
      }
    }

    return result
  }

  /**
   * Parse partial project suggestion when JSON is incomplete
   */
  function parsePartialProjectSuggestion(jsonStr: string): ParsedProjectSuggestion {
    const result: ParsedProjectSuggestion = {
      projectName: undefined,
      baseLayerName: undefined,
      packages: [],
      collections: []
    }

    // Extract projectName
    const projectNameMatch = jsonStr.match(/"projectName"\s*:\s*"([^"]+)"/)
    if (projectNameMatch?.[1]) {
      result.projectName = projectNameMatch[1]
    }

    // Extract baseLayerName
    const baseLayerMatch = jsonStr.match(/"baseLayerName"\s*:\s*"([^"]+)"/)
    if (baseLayerMatch?.[1]) {
      result.baseLayerName = baseLayerMatch[1]
    }

    // Extract packages array
    const packagesMatch = jsonStr.match(/"packages"\s*:\s*\[([\s\S]*?)(?:\]|$)/)
    if (packagesMatch?.[1]) {
      const packagesStr = packagesMatch[1]
      // Extract individual package objects with optional configuration
      // This pattern handles packages with or without configuration
      const pkgPattern = /\{\s*"packageId"\s*:\s*"([^"]+)"(?:\s*,\s*"reason"\s*:\s*"([^"]*)")?(?:\s*,\s*"configuration"\s*:\s*(\{[^}]*\}))?\s*\}/g
      let pkgMatch
      while ((pkgMatch = pkgPattern.exec(packagesStr)) !== null) {
        const [, packageId, reason, configStr] = pkgMatch
        if (packageId) {
          let configuration: Record<string, unknown> | undefined
          if (configStr) {
            try {
              configuration = JSON.parse(configStr)
            } catch {
              // Ignore malformed config
            }
          }
          result.packages.push({
            packageId,
            reason: reason || '',
            configuration
          })
        }
      }
    }

    // Extract collections using existing partial logic
    const collectionsMatch = jsonStr.match(/"collections"\s*:\s*\[([\s\S]*)$/)
    if (collectionsMatch) {
      // Find all collection blocks
      const collectionStarts: number[] = []
      const collectionNamePattern = /\{\s*"collectionName"\s*:\s*"([^"]+)"/g
      let nameMatch
      while ((nameMatch = collectionNamePattern.exec(jsonStr)) !== null) {
        collectionStarts.push(nameMatch.index)
      }

      for (let i = 0; i < collectionStarts.length; i++) {
        const start = collectionStarts[i]
        const end = collectionStarts[i + 1] || jsonStr.length

        const collectionBlock = jsonStr.slice(start, end)

        const nameMatch2 = collectionBlock.match(/"collectionName"\s*:\s*"([^"]+)"/)
        const collectionName = nameMatch2?.[1]
        if (!collectionName) continue

        const fieldsMatch = collectionBlock.match(/"fields"\s*:\s*\[([\s\S]*?)(?:\]|$)/)
        if (!fieldsMatch) continue

        const fieldsStr = fieldsMatch[1] || ''

        const fields = extractCompleteFields(`{"fields": [${fieldsStr}]}`)
          .filter(f => {
            const hash = `${collectionName}:${f.name}:${f.type}`
            if (processedFieldHashes.value.has(hash)) return false
            processedFieldHashes.value.add(hash)
            return true
          })
          .map(f => ({
            id: generateFieldId(),
            name: f.name,
            type: f.type as FieldType,
            meta: (f.meta || {}) as SchemaField['meta'],
            ...(f.refTarget ? { refTarget: f.refTarget } : {})
          }))

        if (fields.length > 0) {
          const existingCollIdx = result.collections.findIndex(c => c.collectionName === collectionName)
          if (existingCollIdx >= 0) {
            result.collections[existingCollIdx]!.fields.push(...fields)
          } else {
            result.collections.push({
              collectionName,
              fields,
              options: undefined
            })
          }
        }
      }
    }

    return result
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
    parseMultiCollectionContent,
    parseProjectSuggestion,
    reset,
    // For testing
    extractJSON,
    extractCompleteFields,
    isValidFieldType
  }
}
