import type { SchemaField, CollectionOptions, CollectionSchema } from './schema'

/**
 * PackageManifest defines the structure for a Crouton package.
 * Packages declare their collections, configuration options, and extension points.
 */
export interface PackageManifest {
  // Identity
  id: string                      // 'crouton-bookings'
  name: string                    // 'Booking System'
  description: string             // 'Slot-based and inventory booking...'
  icon: string                    // 'i-heroicons-calendar'
  version: string                 // '1.0.0'

  // Layer requirements
  layer: {
    name: string                  // Required layer name or suggested default
    editable: boolean             // Can user change it?
    reason?: string               // Why it's required (shown in UI)
  }

  // Dependencies (auto-included in extends)
  dependencies: string[]          // ['@fyit/crouton']

  // Collections this package provides
  collections: PackageCollection[]

  // Configuration options (shown as form)
  configuration: Record<string, ConfigOption>

  // Extension points
  extensionPoints: ExtensionPoint[]

  // What package provides (for documentation)
  provides: PackageProvides
}

/**
 * PackageCollection represents a collection provided by a package.
 * Includes the full schema definition and metadata.
 */
export interface PackageCollection {
  name: string                    // 'booking'
  tableName: string               // 'bookingsBookings'
  description: string             // 'Individual reservations'
  schema: Record<string, PackageSchemaField> // Field definitions from JSON schema
  schemaPath: string              // './schemas/booking.json' (for reference)
  optional?: boolean              // Only included if condition met
  condition?: string              // 'config.email.enabled'
}

/**
 * PackageSchemaField is the raw field definition from JSON schemas.
 * This is the format used in package schema JSON files.
 */
export interface PackageSchemaField {
  type: string
  refTarget?: string
  meta: Record<string, unknown>
}

/**
 * ConfigOption defines a user-configurable setting for a package.
 */
export interface ConfigOption {
  type: 'boolean' | 'string' | 'number' | 'select' | 'multiselect'
  label: string
  description?: string
  default: unknown
  options?: ConfigSelectOption[]  // For select/multiselect
  dependsOn?: string              // Show only if another option is set
}

export interface ConfigSelectOption {
  value: string
  label: string
}

/**
 * ExtensionPoint defines where users can add custom fields to package collections.
 */
export interface ExtensionPoint {
  collection: string              // Which collection can be extended
  allowedFields: string[]         // Field names that can be added
  description: string
}

/**
 * ComponentInfo documents a component provided by the package.
 */
export interface ComponentInfo {
  name: string                    // 'CroutonBookingPanel'
  description: string             // 'Main booking sidebar'
  props?: string[]                // Key props for documentation
}

/**
 * PackageProvides documents what the package exports.
 */
export interface PackageProvides {
  composables: string[]
  components: ComponentInfo[]
  apiRoutes: string[]
}

// ===========================================
// Project Composer Types
// ===========================================

/**
 * PackageInstance represents a selected package within a project.
 */
export interface PackageInstance {
  packageId: string               // 'crouton-bookings'
  layerName: string               // From manifest or user input
  configuration: Record<string, unknown>
  extensions?: CollectionExtension[]
}

/**
 * CollectionExtension allows adding custom fields to package collections.
 */
export interface CollectionExtension {
  collectionName: string          // 'booking'
  additionalFields: SchemaField[]
}

/**
 * SchemaProjectWithPackages extends the project model to include packages.
 */
export interface SchemaProjectWithPackages {
  id: string
  name: string

  // Base layer for custom collections
  baseLayerName: string           // e.g., 'tennis-club'

  // Selected packages with configuration
  packages: PackageInstance[]

  // Custom collections (stored in baseLayerName)
  collections: CollectionSchema[]

  // Legacy support (single collection mode)
  // These are migrated to collections[] on load
  collectionName?: string
  layerName?: string
  schema?: unknown
  options?: CollectionOptions

  teamId?: string
  userId?: string
  createdAt: Date
  updatedAt: Date
}

// ===========================================
// Package Summary (for list views)
// ===========================================

/**
 * PackageSummary is a lightweight version of PackageManifest for list views.
 */
export interface PackageSummary {
  id: string
  name: string
  description: string
  icon: string
  version: string
  collectionCount: number
  layer: {
    name: string
    editable: boolean
    reason?: string
  }
}

/**
 * Convert a full manifest to a summary for list endpoints.
 */
export function toPackageSummary(manifest: PackageManifest): PackageSummary {
  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    icon: manifest.icon,
    version: manifest.version,
    collectionCount: manifest.collections.length,
    layer: manifest.layer
  }
}