import type { CollectionWithFields, PackageCollectionEntry } from './useCollectionEditor'
import type { DisplayConfig } from '../types/schema'

export interface SchemaFile {
  /** Collection name (used as filename: `{name}.json`) */
  name: string
  /** Display config mapping fields to display roles */
  display?: DisplayConfig
  /** Whether this collection is publishable as a page type */
  publishable?: boolean
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
        publishable: col.publishable || undefined,
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

/**
 * Build schema JSON for package collections.
 * Merges manifest fields (read-only base) + user extension fields on top.
 * Returns a map of `{name}.json` → JSON string.
 */
export function getPackageSchemasAsJson(
  packageEntries: PackageCollectionEntry[],
): Map<string, string> {
  const result = new Map<string, string>()
  for (const pkg of packageEntries) {
    const schema: Record<string, SchemaFieldExport> = {}

    // 1. Manifest fields first (the package's own schema definition)
    if (pkg.manifestSchema) {
      for (const [name, def] of Object.entries(pkg.manifestSchema)) {
        schema[name] = def as SchemaFieldExport
      }
    }

    // 2. User-added extension fields layered on top
    for (const field of pkg.extensionFields) {
      const entry: SchemaFieldExport = { type: field.type }
      if (field.meta && Object.keys(field.meta).length > 0) {
        entry.meta = field.meta
      }
      if (field.refTarget) {
        entry.refTarget = field.refTarget
      }
      schema[field.name] = entry
    }

    result.set(`${pkg.name}.json`, JSON.stringify(schema, null, 2))
  }
  return result
}
