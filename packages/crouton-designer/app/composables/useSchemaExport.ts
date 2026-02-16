import type { CollectionWithFields } from './useCollectionEditor'
import type { DisplayConfig } from '../types/schema'

export interface SchemaFile {
  /** Collection name (used as filename: `{name}.json`) */
  name: string
  /** Display config mapping fields to display roles */
  display?: DisplayConfig
  /** The JSON schema object in crouton-cli format */
  schema: Record<string, SchemaFieldExport>
}

export interface SchemaFieldExport {
  type: string
  meta?: Record<string, any>
  refTarget?: string
  refScope?: string
}

/**
 * Converts designer DB state into crouton-cli JSON schema format.
 * One schema file per collection.
 */
export function useSchemaExport(collections: Ref<CollectionWithFields[]>) {
  const schemaFiles = computed<SchemaFile[]>(() => {
    return collections.value.map((col) => {
      const schema: Record<string, SchemaFieldExport> = {}

      // Sort fields by sortOrder if present
      const sortedFields = [...col.fields].sort((a, b) => {
        const aOrder = Number(a.sortOrder ?? 999)
        const bOrder = Number(b.sortOrder ?? 999)
        return aOrder - bOrder
      })

      for (const field of sortedFields) {
        const entry: SchemaFieldExport = {
          type: field.type
        }

        // Build meta — only include non-empty values
        if (field.meta && Object.keys(field.meta).length > 0) {
          const cleanMeta: Record<string, any> = {}
          for (const [key, value] of Object.entries(field.meta)) {
            // Skip null, undefined, empty strings, and false booleans (unless it's a meaningful default)
            if (value === null || value === undefined || value === '') continue
            if (key === 'required' && value === false) continue
            if (key === 'translatable' && value === false) continue
            if (key === 'readOnly' && value === false) continue
            if (key === 'unique' && value === false) continue
            if (key === 'creatable' && value === false) continue
            if (key === 'sortable' && value === false) continue
            cleanMeta[key] = value
          }
          if (Object.keys(cleanMeta).length > 0) {
            entry.meta = cleanMeta
          }
        }

        // Reference target
        if (field.refTarget) {
          entry.refTarget = field.refTarget
        }

        schema[field.name] = entry
      }

      return {
        name: col.name,
        display: col.display || undefined,
        schema
      }
    })
  })

  /**
   * Get the JSON string for a single collection schema
   */
  function buildSchemaOutput(file: SchemaFile): object {
    if (file.display) {
      return { display: file.display, fields: file.schema }
    }
    return file.schema
  }

  /**
   * Get the JSON string for a single collection schema
   */
  function getSchemaJson(collectionName: string): string | null {
    const file = schemaFiles.value.find(f => f.name === collectionName)
    if (!file) return null
    return JSON.stringify(buildSchemaOutput(file), null, 2)
  }

  /**
   * Get all schemas as a map of filename → JSON content
   */
  function getAllSchemasAsJson(): Map<string, string> {
    const result = new Map<string, string>()
    for (const file of schemaFiles.value) {
      result.set(`${file.name}.json`, JSON.stringify(buildSchemaOutput(file), null, 2))
    }
    return result
  }

  return {
    schemaFiles,
    getSchemaJson,
    getAllSchemasAsJson
  }
}
