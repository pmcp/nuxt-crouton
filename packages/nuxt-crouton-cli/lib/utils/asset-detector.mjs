/**
 * Asset Schema Detection Utility
 *
 * Detects if a schema represents an asset collection based on field patterns
 */

/**
 * Checks if a schema represents an asset collection
 * @param {Object} schema - The schema object to check
 * @returns {boolean} - True if schema is an asset collection
 */
export function isAssetSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return false
  }

  const fields = Object.keys(schema)

  // Asset collections typically have these core fields
  const hasFilename = fields.includes('filename')
  const hasPathname = fields.includes('pathname')
  const hasContentType = fields.includes('contentType')

  // A schema is an asset if it has at least filename + pathname
  // contentType is optional but common
  return hasFilename && hasPathname
}

/**
 * Checks if a field references an asset collection
 * @param {Object} field - The field object to check
 * @param {string} refTarget - The refTarget value
 * @returns {boolean} - True if field references assets
 */
export function referencesAssets(field, refTarget) {
  if (!field || !refTarget) {
    return false
  }

  // Check if refTarget contains 'asset' (case insensitive)
  const refTargetLower = refTarget.toLowerCase()
  const isAssetRef = refTargetLower.includes('asset') ||
                     refTargetLower.includes('file') ||
                     refTargetLower.includes('image') ||
                     refTargetLower.includes('media')

  return isAssetRef
}

/**
 * Determines the asset type from schema
 * @param {Object} schema - The schema object
 * @returns {string} - Asset type: 'image', 'file', or 'general'
 */
export function getAssetType(schema) {
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
 * @param {string} assetType - The type of asset ('image', 'file', 'general')
 * @returns {string} - Component name to use
 */
export function getAssetComponent(assetType = 'general') {
  // For now, we use the same picker for all asset types
  // In the future, we could have specialized pickers
  return 'CroutonAssetsPicker'
}
