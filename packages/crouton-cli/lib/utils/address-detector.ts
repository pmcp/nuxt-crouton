/**
 * Utility to detect address-related fields in schema
 * Used by form generator to auto-add map/geocoding functionality
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

// Common address field name patterns
const ADDRESS_FIELD_PATTERNS = [
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

// Coordinate field patterns
const COORDINATE_FIELD_PATTERNS = [
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
export function isAddressField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase()
  return ADDRESS_FIELD_PATTERNS.some(pattern => normalized.includes(pattern))
}

/**
 * Check if a field name matches coordinate patterns
 */
export function isCoordinateField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase()
  return COORDINATE_FIELD_PATTERNS.some(pattern => normalized.includes(pattern))
}

/**
 * Detect if a collection has address fields that should trigger map/geocoding
 */
export function detectAddressFields(fields: Field[]): AddressDetectionResult {
  const addressFields = fields.filter(f => isAddressField(f.name))
  const coordinateFields = fields.filter(f => isCoordinateField(f.name))

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
