/**
 * Asset Schema Detection Utility
 *
 * Detects if a schema represents an asset collection based on field patterns
 */

interface SchemaField {
  meta?: {
    pattern?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

type Schema = Record<string, SchemaField>

interface Field {
  type: string
  [key: string]: unknown
}

/**
 * Checks if a schema represents an asset collection
 */
export function isAssetSchema(schema: unknown): schema is Schema {
  if (!schema || typeof schema !== 'object') {
    return false
  }

  const fields = Object.keys(schema)

  // Asset collections typically have these core fields
  const hasFilename = fields.includes('filename')
  const hasPathname = fields.includes('pathname')

  // A schema is an asset if it has at least filename + pathname
  // contentType is optional but common
  return hasFilename && hasPathname
}

/**
 * Checks if a field references an asset collection
 */
export function referencesAssets(field: Field | null | undefined, refTarget?: string): boolean {
  if (!field) return false

  // Native image/file field types are always asset references
  if (field.type === 'image' || field.type === 'file') {
    return true
  }

  if (!refTarget) {
    return false
  }

  // Check if refTarget contains 'asset' (case insensitive)
  const refTargetLower = refTarget.toLowerCase()
  const isAssetRef = refTargetLower.includes('asset')
    || refTargetLower.includes('file')
    || refTargetLower.includes('image')
    || refTargetLower.includes('media')

  return isAssetRef
}

/**
 * Determines the asset type from schema
 */
export function getAssetType(schema: unknown): 'image' | 'file' | 'video' | 'audio' | 'general' | null {
  if (!isAssetSchema(schema)) {
    return null
  }

  const fields = Object.keys(schema)

  // Check for image-specific fields
  if (fields.includes('alt') || fields.includes('width') || fields.includes('height')) {
    return 'image'
  }

  // Check contentType patterns
  const contentTypeField = schema.contentType
  if (contentTypeField?.meta?.pattern) {
    const pattern = contentTypeField.meta.pattern
    if (pattern.includes('image')) return 'image'
    if (pattern.includes('video')) return 'video'
    if (pattern.includes('audio')) return 'audio'
  }

  return 'general'
}

/**
 * Gets the recommended component for an asset reference field
 */
export function getAssetComponent(_assetType = 'general'): string {
  // For now, we use the same picker for all asset types
  // In the future, we could have specialized pickers
  return 'CroutonAssetsPicker'
}
