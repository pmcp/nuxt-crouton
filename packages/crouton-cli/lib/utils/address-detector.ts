/**
 * Utility to detect address-related fields in schema
 * Used by form generator to auto-add map/geocoding functionality
 *
 * In Phase 2 these patterns live in crouton-maps/crouton.manifest.ts.
 * These defaults remain so callers without manifest access still work.
 */

interface Field {
  name: string
  [key: string]: unknown
}

interface AddressDetectionResult {
  hasAddress: boolean
  addressFields: Field[]
  coordinateFields: Field[]
  hasCoordinates: boolean
}

// Default address field name patterns (matches crouton-maps manifest detects.fieldNamePatterns)
export const DEFAULT_ADDRESS_FIELD_PATTERNS = [
  'street',
  'address',
  'city',
  'town',
  'zip',
  'zipcode',
  'postal',
  'postalcode',
  'postcode',
  'country',
  'state',
  'province',
  'region',
]

// Default coordinate field patterns (matches crouton-maps manifest detects.coordinatePatterns)
export const DEFAULT_COORDINATE_FIELD_PATTERNS = [
  'latitude',
  'lat',
  'longitude',
  'lng',
  'lon',
  'location',
  'coordinates',
  'coords',
  'geocoordinates',
  'latlng',
  'lnglat',
]

/**
 * Check if a field name matches address patterns
 */
export function isAddressField(fieldName: string, patterns = DEFAULT_ADDRESS_FIELD_PATTERNS): boolean {
  const normalized = fieldName.toLowerCase()
  return patterns.some(pattern => normalized.includes(pattern))
}

/**
 * Check if a field name matches coordinate patterns
 */
export function isCoordinateField(fieldName: string, patterns = DEFAULT_COORDINATE_FIELD_PATTERNS): boolean {
  const normalized = fieldName.toLowerCase()
  return patterns.some(pattern => normalized.includes(pattern))
}

/**
 * Detect if a collection has address fields that should trigger map/geocoding.
 * Accepts optional pattern arrays — falls back to defaults when not provided.
 */
export function detectAddressFields(
  fields: Field[],
  patterns = DEFAULT_ADDRESS_FIELD_PATTERNS,
  coordinatePatterns = DEFAULT_COORDINATE_FIELD_PATTERNS,
): AddressDetectionResult {
  const addressFields = fields.filter(f => isAddressField(f.name, patterns))
  const coordinateFields = fields.filter(f => isCoordinateField(f.name, coordinatePatterns))

  return {
    hasAddress: addressFields.length > 0,
    addressFields,
    coordinateFields,
    hasCoordinates: coordinateFields.length > 0,
  }
}

/**
 * Get a suitable coordinate field name for storing geocoded results
 * Prefers 'location', 'coordinates', or the first coordinate field found
 */
export function getCoordinateFieldName(coordinateFields: Field[]): string | null {
  if (!coordinateFields || coordinateFields.length === 0) {
    return null
  }

  // Prefer 'location' or 'coordinates' if they exist
  const preferred = coordinateFields.find(f =>
    f.name === 'location'
    || f.name === 'coordinates'
    || f.name === 'coords',
  )

  if (preferred) {
    return preferred.name
  }

  // Otherwise return the first coordinate field
  return coordinateFields[0].name
}

/**
 * Build a geocoding query from address field values
 * Used in generated form components
 */
export function buildAddressQuery(addressValues: Record<string, unknown>): string {
  const parts: string[] = []

  // Common field names in typical order
  const fieldOrder = ['street', 'address', 'city', 'town', 'zip', 'zipcode', 'postal', 'postalcode', 'state', 'province', 'region', 'country']

  for (const fieldName of fieldOrder) {
    const value = addressValues[fieldName]
    if (value && typeof value === 'string' && value.trim()) {
      parts.push(value.trim())
    }
  }

  // Add any remaining address fields not in the order list
  for (const [fieldName, value] of Object.entries(addressValues)) {
    if (!fieldOrder.includes(fieldName) && value && typeof value === 'string' && value.trim()) {
      if (isAddressField(fieldName)) {
        parts.push(value.trim())
      }
    }
  }

  return parts.join(', ')
}
