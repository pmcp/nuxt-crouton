# Schema Designer Package Integration — Build Plan

## One-liner

Transform schema-designer into an app designer with package discovery, configuration, and modular composition.

---

## The Problem

1. **No package awareness** — Schema designer creates custom collections but doesn't know about packages like `crouton-bookings`

2. **Manual integration** — Users must manually configure layer names, extends chains, and runtime config for packages

3. **Convention errors** — Critical conventions (e.g., layer MUST be named `bookings`) are easy to get wrong

4. **No cross-referencing** — Can't create references between custom collections and package collections

5. **Duplicate effort** — Package schemas exist but users can't see/use them in the designer

---

## The Solution

**Modular app composition:**
- Users build apps by combining packages + custom collections
- Each package declares a manifest with schemas, config options, and requirements
- Schema designer reads manifests and provides configuration UI
- Export generates correct extends chain, layer names, and runtime config

**Package manifest system:**
- Packages declare their collections, dependencies, and configuration
- Schema designer discovers and displays available packages
- Configuration options shown as forms in the UI
- Cross-references work across all collections (package + custom)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHEMA DESIGNER                                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    PACKAGE REGISTRY                                 │ │
│  │                                                                     │ │
│  │   Reads manifests from:                                             │ │
│  │   • Workspace packages (packages/crouton-*/crouton.manifest.ts)    │ │
│  │   • npm packages (@friendlyinternet/crouton-*)                     │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    PROJECT COMPOSER                                 │ │
│  │                                                                     │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │ │
│  │   │  Packages    │  │   Custom     │  │   Configuration      │    │ │
│  │   │  (selected)  │  │ Collections  │  │   (per package)      │    │ │
│  │   │              │  │              │  │                      │    │ │
│  │   │ • bookings   │  │ • staff      │  │ bookings:            │    │ │
│  │   │ • maps       │  │ • posts      │  │   email: true        │    │ │
│  │   │              │  │              │  │   mode: slots        │    │ │
│  │   └──────────────┘  └──────────────┘  └──────────────────────┘    │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    EXPORT GENERATOR                                 │ │
│  │                                                                     │ │
│  │   Outputs:                                                          │ │
│  │   • nuxt.config.ts (extends chain)                                  │ │
│  │   • crouton.config.js (all layers/collections)                      │ │
│  │   • Runtime config (package settings)                               │ │
│  │   • Schema JSON files (custom collections)                          │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Package Manifest Format

### Type Definition

```typescript
// packages/nuxt-crouton-schema-designer/app/types/package-manifest.ts

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
  dependencies: string[]          // ['@friendlyinternet/nuxt-crouton']

  // Collections this package provides
  collections: PackageCollection[]

  // Configuration options (shown as form)
  configuration: Record<string, ConfigOption>

  // Extension points
  extensionPoints: ExtensionPoint[]

  // What package provides (for documentation)
  provides: {
    composables: string[]
    components: ComponentInfo[]
    apiRoutes: string[]
  }
}

export interface PackageCollection {
  name: string                    // 'booking'
  tableName: string               // 'bookingsBookings'
  description: string             // 'Individual reservations'
  schema: SchemaField[]           // Full field definitions
  schemaPath: string              // './schemas/booking.json' (for reference)
  optional?: boolean              // Only included if condition met
  condition?: string              // 'config.email.enabled'
}

export interface ConfigOption {
  type: 'boolean' | 'string' | 'number' | 'select' | 'multiselect'
  label: string
  description?: string
  default: any
  options?: { value: string; label: string }[]  // For select/multiselect
  dependsOn?: string              // Show only if another option is set
}

export interface ExtensionPoint {
  collection: string              // Which collection can be extended
  allowedFields: string[]         // Field names that can be added
  description: string
}

export interface ComponentInfo {
  name: string                    // 'CroutonBookingPanel'
  description: string             // 'Main booking sidebar'
  props?: string[]                // Key props for documentation
}
```

### Example Manifest (crouton-bookings)

```typescript
// packages/crouton-bookings/crouton.manifest.ts

import type { PackageManifest } from '@friendlyinternet/nuxt-crouton-schema-designer'
import bookingSchema from './schemas/booking.json'
import locationSchema from './schemas/location.json'
import settingsSchema from './schemas/settings.json'
import emailTemplateSchema from './schemas/email-template.json'
import emailLogSchema from './schemas/email-log.json'

export default {
  id: 'crouton-bookings',
  name: 'Booking System',
  description: 'Slot-based and inventory booking with optional email notifications',
  icon: 'i-heroicons-calendar',
  version: '1.0.0',

  layer: {
    name: 'bookings',
    editable: false,
    reason: 'Table names are prefixed with "bookings" (e.g., bookingsBookings)'
  },

  dependencies: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth'
  ],

  collections: [
    {
      name: 'booking',
      tableName: 'bookingsBookings',
      description: 'Individual booking/reservation records',
      schema: bookingSchema,
      schemaPath: './schemas/booking.json'
    },
    {
      name: 'location',
      tableName: 'bookingsLocations',
      description: 'Bookable venues, resources, or items',
      schema: locationSchema,
      schemaPath: './schemas/location.json'
    },
    {
      name: 'settings',
      tableName: 'bookingsSettings',
      description: 'Team-wide booking configuration',
      schema: settingsSchema,
      schemaPath: './schemas/settings.json'
    },
    {
      name: 'email-template',
      tableName: 'bookingsEmailtemplates',
      description: 'Email notification templates',
      schema: emailTemplateSchema,
      schemaPath: './schemas/email-template.json',
      optional: true,
      condition: 'config.email.enabled'
    },
    {
      name: 'email-log',
      tableName: 'bookingsEmaillogs',
      description: 'Log of sent emails',
      schema: emailLogSchema,
      schemaPath: './schemas/email-log.json',
      optional: true,
      condition: 'config.email.enabled'
    }
  ],

  configuration: {
    'email.enabled': {
      type: 'boolean',
      label: 'Enable Email Notifications',
      description: 'Send booking confirmations, reminders, and follow-ups',
      default: false
    },
    'bookingModes': {
      type: 'multiselect',
      label: 'Booking Modes',
      description: 'How resources can be booked',
      default: ['slots'],
      options: [
        { value: 'slots', label: 'Time Slots (courts, rooms, appointments)' },
        { value: 'inventory', label: 'Inventory (equipment, tickets, rentals)' }
      ]
    }
  },

  extensionPoints: [
    {
      collection: 'booking',
      allowedFields: ['customData', 'metadata'],
      description: 'Add custom fields to booking records'
    },
    {
      collection: 'location',
      allowedFields: ['customData', 'metadata'],
      description: 'Add custom fields to locations'
    }
  ],

  provides: {
    composables: [
      'useBookingAvailability',
      'useBookingCart',
      'useCustomerBooking',
      'useBookingEmail',
      'useBookingFilters',
      'useBookingsList',
      'useBookingsSettings'
    ],
    components: [
      { name: 'CroutonBookingPanel', description: 'Main booking sidebar container' },
      { name: 'CroutonBookingCalendar', description: 'Calendar date picker' },
      { name: 'CroutonBookingWeekStrip', description: 'Week date navigation' },
      { name: 'CroutonBookingList', description: 'Bookings list with filters' },
      { name: 'CroutonBookingCard', description: 'Individual booking display' },
      { name: 'CroutonBookingCustomerBookingWizard', description: 'Full booking wizard' },
      { name: 'CroutonBookingAdminCalendar', description: 'Admin calendar view' }
    ],
    apiRoutes: [
      '/api/crouton-bookings/teams/[teamId]/availability',
      '/api/crouton-bookings/teams/[teamId]/customer-bookings',
      '/api/crouton-bookings/teams/[teamId]/customer-bookings-batch',
      '/api/crouton-bookings/teams/[teamId]/customer-locations'
    ]
  }
} satisfies PackageManifest
```

---

## Data Model Updates

### Project Schema Changes

```typescript
// packages/nuxt-crouton-schema-designer/app/types/schema.ts

// Existing (keep for backwards compat)
export interface CollectionSchema { ... }
export interface SchemaField { ... }

// NEW: Project with packages
export interface SchemaProject {
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
  schema?: any
  options?: any

  teamId?: string
  userId?: string
  createdAt: Date
  updatedAt: Date
}

export interface PackageInstance {
  packageId: string               // 'crouton-bookings'
  layerName: string               // From manifest or user input
  configuration: Record<string, any>
  extensions?: CollectionExtension[]
}

export interface CollectionExtension {
  collectionName: string          // 'booking'
  additionalFields: SchemaField[]
}
```

### Database Schema Update

```typescript
// apps/schema-designer/server/db/schema.ts

export const schemaProjects = sqliteTable('schema_projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),

  // Base layer for custom collections
  baseLayerName: text('base_layer_name').notNull().default('app'),

  // Selected packages (JSON array)
  packages: text('packages', { mode: 'json' }).$type<PackageInstance[]>(),

  // Custom collections (JSON array)
  collections: text('collections', { mode: 'json' }).$type<CollectionSchema[]>(),

  // Legacy fields (for migration)
  layerName: text('layer_name'),
  collectionName: text('collection_name'),
  schema: text('schema', { mode: 'json' }),
  options: text('options', { mode: 'json' }),

  teamId: text('team_id'),
  userId: text('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
})
```

---

## New Components

### Package Browser

```
packages/nuxt-crouton-schema-designer/app/components/SchemaDesigner/
├── PackageBrowser.vue            # Grid of available packages
├── PackageCard.vue               # Individual package card (add/remove)
├── PackageConfigPanel.vue        # Configuration form for selected package
├── PackageCollectionView.vue     # Read-only view of package collections
├── PackageInfoPanel.vue          # Composables, components, API routes
└── ProjectComposer.vue           # Main composition view (packages + custom)
```

### Component Specifications

#### PackageBrowser.vue
- Grid display of available packages from registry
- Search/filter functionality
- "Add to Project" action per package
- Shows: icon, name, description, collection count

#### PackageCard.vue
- Package identity (icon, name, description)
- Collection preview (count, names)
- Add/Remove toggle
- Configuration shortcut button

#### PackageConfigPanel.vue
- Dynamic form generated from manifest.configuration
- Conditional fields (dependsOn)
- Layer name display (editable if allowed)
- Dependency list (informational)

#### PackageCollectionView.vue
- Read-only field list for package collection
- Extension point indicator
- "Add Extension Field" button (if allowed)

#### ProjectComposer.vue
- Tab navigation: Packages | Custom Collections
- Package list with config status indicators
- Custom collection list with edit/delete
- AI prompt input for generating custom collections
- Export preview section

---

## New Composables

```
packages/nuxt-crouton-schema-designer/app/composables/
├── usePackageRegistry.ts         # Load/cache package manifests
├── usePackageConfig.ts           # Manage package configuration
├── useProjectComposer.ts         # Main state for package + custom composition
└── useExportGenerator.ts         # Generate nuxt.config, crouton.config, etc.
```

### Composable Specifications

#### usePackageRegistry.ts
```typescript
export function usePackageRegistry() {
  // State
  const packages = ref<PackageManifest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load manifests from workspace packages
  async function loadPackages(): Promise<void>

  // Get single package manifest
  function getPackage(id: string): PackageManifest | undefined

  // Check if package is available
  function isAvailable(id: string): boolean

  return { packages, loading, error, loadPackages, getPackage, isAvailable }
}
```

#### usePackageConfig.ts
```typescript
export function usePackageConfig(packageId: string) {
  // Get manifest
  const manifest = computed(() => getPackage(packageId))

  // Configuration state
  const config = ref<Record<string, any>>({})

  // Initialize with defaults
  function initDefaults(): void

  // Validate configuration
  function validate(): { valid: boolean; errors: string[] }

  // Get enabled collections (based on conditions)
  function getEnabledCollections(): PackageCollection[]

  return { manifest, config, initDefaults, validate, getEnabledCollections }
}
```

#### useProjectComposer.ts
```typescript
export function useProjectComposer() {
  // Project identity
  const projectName = ref('')
  const baseLayerName = ref('app')

  // Selected packages
  const packages = ref<PackageInstance[]>([])

  // Custom collections
  const collections = ref<CollectionSchema[]>([])

  // Package management
  function addPackage(packageId: string): void
  function removePackage(packageId: string): void
  function updatePackageConfig(packageId: string, config: Record<string, any>): void

  // Collection management (delegates to useSchemaDesigner)
  function addCollection(name: string): void
  function removeCollection(id: string): void

  // Cross-reference helpers
  function getAllCollections(): { source: 'package' | 'custom'; collection: CollectionSchema }[]
  function getRefTargets(): { value: string; label: string }[]

  // Validation
  const isValid = computed(() => ...)
  const validationErrors = computed(() => ...)

  // Save/Load
  function loadProject(project: SchemaProject): void
  function toProject(): SchemaProject

  return { ... }
}
```

#### useExportGenerator.ts
```typescript
export function useExportGenerator() {
  const composer = useProjectComposer()

  // Generate nuxt.config.ts content
  function generateNuxtConfig(): string

  // Generate crouton.config.js content
  function generateCroutonConfig(): string

  // Generate runtime config section
  function generateRuntimeConfig(): Record<string, any>

  // Generate schema JSON files for custom collections
  function generateSchemaFiles(): { path: string; content: string }[]

  // Generate complete export bundle
  function generateExportBundle(): ExportBundle

  return { generateNuxtConfig, generateCroutonConfig, generateRuntimeConfig, generateSchemaFiles, generateExportBundle }
}

interface ExportBundle {
  nuxtConfig: string
  croutonConfig: string
  schemas: { path: string; content: string }[]
  commands: string[]  // CLI commands to run
}
```

---

## API Updates

### New Endpoints

```
/api/schema-designer/packages
├── GET  /                        # List available packages (from registry)
└── GET  /[id]                    # Get single package manifest
```

### Package Registry API

```typescript
// packages/nuxt-crouton-schema-designer/server/api/schema-designer/packages/index.get.ts

export default defineEventHandler(async () => {
  // Load manifests from workspace packages
  const manifests = await loadPackageManifests()

  return manifests.map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    icon: m.icon,
    version: m.version,
    collectionCount: m.collections.length,
    layer: m.layer
  }))
})
```

```typescript
// packages/nuxt-crouton-schema-designer/server/api/schema-designer/packages/[id].get.ts

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const manifest = await loadPackageManifest(id)
  if (!manifest) {
    throw createError({ statusCode: 404, message: 'Package not found' })
  }

  return manifest
})
```

### Manifest Loading Strategy

```typescript
// packages/nuxt-crouton-schema-designer/server/utils/package-registry.ts

// Known packages in workspace (hardcoded for now, could be dynamic)
const WORKSPACE_PACKAGES = [
  'crouton-bookings',
  'crouton-maps',
  'nuxt-crouton-editor'
]

export async function loadPackageManifests(): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = []

  for (const pkg of WORKSPACE_PACKAGES) {
    try {
      // Dynamic import of manifest
      const manifest = await import(`@friendlyinternet/${pkg}/crouton.manifest`)
      manifests.push(manifest.default)
    } catch (e) {
      console.warn(`Could not load manifest for ${pkg}:`, e)
    }
  }

  return manifests
}
```

---

## UI Flow Updates

### Page Changes

```
/schema-designer/
├── index.vue                     # Projects list (existing)
├── new.vue                       # UPDATED: Start with composer flow
└── [id].vue                      # UPDATED: Edit with composer
```

### New Project Flow (new.vue)

```
Step 1: Project Setup
├── Project name
├── Base layer name
└── [Continue]

Step 2: Add Building Blocks
├── Package browser (add/remove packages)
├── Custom collection creator
│   ├── Manual: [+ Add Collection]
│   └── AI: "Describe what you need" → [Generate]
└── [Continue]

Step 3: Configure
├── Per-package configuration panels
├── Custom collection editor (existing SchemaBuilder)
└── [Continue]

Step 4: Review & Export
├── Project structure preview
├── Generated config preview
├── Export options (download, copy, generate)
└── [Save Project] [Export]
```

### Edit Project Flow ([id].vue)

```
Unified Editor View
├── Tab bar: [Package 1] [Package 2] [Custom Collections]
├── Active tab content:
│   ├── Package tab: PackageCollectionView (read-only + extensions)
│   └── Custom tab: Full SchemaBuilder (existing)
├── Right panel: Preview / Export
└── Footer: Validation status, Save button
```

---

## Build Phases

### Phase 1: Foundation (2 days) ✅

- [x] **Task 1.1**: Define TypeScript interfaces
  - Create `types/package-manifest.ts`
  - Create `types/project-composer.ts`
  - Update `types/schema.ts` with new project structure

- [x] **Task 1.2**: Create crouton-bookings manifest
  - Create `packages/crouton-bookings/crouton.manifest.ts`
  - Import existing JSON schemas
  - Define all configuration options
  - Document extension points

- [x] **Task 1.3**: Create package registry utility
  - Create `server/utils/package-registry.ts`
  - Implement manifest loading from workspace
  - Add caching layer

- [x] **Task 1.4**: Add package API endpoints
  - Create `GET /api/schema-designer/packages`
  - Create `GET /api/schema-designer/packages/[id]`
  - Test with crouton-bookings manifest

### Phase 2: Composables (2 days) ✅

- [x] **Task 2.1**: Create usePackageRegistry composable
  - Load packages from API
  - Cache in state
  - Provide search/filter helpers

- [x] **Task 2.2**: Create usePackageConfig composable
  - Initialize config from defaults
  - Handle conditional options (dependsOn)
  - Validate configuration

- [x] **Task 2.3**: Create useProjectComposer composable
  - Manage packages + custom collections
  - Integrate with existing useSchemaDesigner
  - Provide cross-reference helpers (getAllCollections)

- [x] **Task 2.4**: Create useExportGenerator composable
  - Generate nuxt.config.ts
  - Generate crouton.config.js
  - Generate schema JSON files
  - Generate CLI commands

### Phase 3: Components (3 days) ✅

- [x] **Task 3.1**: Create PackageCard component
  - Display package info (icon, name, description)
  - Add/Remove toggle
  - Collection count badge

- [x] **Task 3.2**: Create PackageBrowser component
  - Grid of PackageCards
  - Search/filter input
  - Loading state

- [x] **Task 3.3**: Create PackageConfigPanel component
  - Dynamic form from manifest.configuration
  - Conditional field visibility
  - Layer name display

- [x] **Task 3.4**: Create PackageCollectionView component
  - Read-only field list
  - Extension point indicators
  - Add extension field action

- [x] **Task 3.5**: Create ProjectComposer component
  - Tab layout: Packages | Custom
  - Package list with config indicators
  - Custom collection list
  - AI generation input

### Phase 4: Page Integration (2 days) ✅

- [x] **Task 4.1**: Update new.vue with composer flow
  - Add step navigation
  - Integrate ProjectComposer
  - Connect to existing SchemaBuilder

- [x] **Task 4.2**: Update [id].vue for unified editing
  - Package/Custom tab navigation
  - Read-only package view
  - Full editing for custom

- [x] **Task 4.3**: Update ExportPanel for combined export
  - Show nuxt.config.ts preview
  - Show crouton.config.js preview
  - Download bundle option

### Phase 5: Data Migration (1 day) ✅

- [x] **Task 5.1**: Update database schema
  - Add new columns (packages, baseLayerName)
  - Keep legacy columns for migration

- [x] **Task 5.2**: Create migration utility
  - Convert legacy single-collection projects
  - Map to new structure

- [x] **Task 5.3**: Update API handlers
  - Handle both old and new formats
  - Auto-migrate on load

### Phase 6: Cross-References (1 day) ✅

- [x] **Task 6.1**: Update FieldCatalog
  - Add "References" section
  - Show all collections (package + custom)
  - Enable cross-package refs

- [x] **Task 6.2**: Update reference field type
  - Support package collection targets
  - Show source indicator (package/custom)

### Phase 7: Polish & Testing (2 days)

- [x] **Task 7.1**: Add additional package manifests ✅
  - Added `crouton-sales` manifest (10 collections, print.enabled config)
  - Note: `nuxt-crouton-maps` and `nuxt-crouton-editor` are utility layers (components/composables only, no collections) - manifests not applicable
  - Updated package registry to include crouton-sales

- [ ] **Task 7.2**: End-to-end testing
  - Create project with bookings + custom
  - Configure packages
  - Export and verify output

- [ ] **Task 7.3**: Documentation
  - Update schema-designer README
  - Create package manifest authoring guide

---

## File Changes Summary

### New Files

```
packages/nuxt-crouton-schema-designer/
├── app/
│   ├── types/
│   │   └── package-manifest.ts           # Manifest interfaces
│   ├── composables/
│   │   ├── usePackageRegistry.ts         # Package discovery
│   │   ├── usePackageConfig.ts           # Package configuration
│   │   ├── useProjectComposer.ts         # Combined state management
│   │   └── useExportGenerator.ts         # Export generation
│   └── components/SchemaDesigner/
│       ├── PackageBrowser.vue            # Package grid
│       ├── PackageCard.vue               # Package card
│       ├── PackageConfigPanel.vue        # Config form
│       ├── PackageCollectionView.vue     # Read-only collection
│       ├── PackageInfoPanel.vue          # Composables/components info
│       └── ProjectComposer.vue           # Main composer view
└── server/
    ├── utils/
    │   └── package-registry.ts           # Manifest loading
    └── api/schema-designer/packages/
        ├── index.get.ts                  # List packages
        └── [id].get.ts                   # Get single package

packages/crouton-bookings/
└── crouton.manifest.ts                   # Bookings package manifest
```

### Modified Files

```
packages/nuxt-crouton-schema-designer/
├── app/
│   ├── types/schema.ts                   # Add project composer types
│   ├── composables/
│   │   └── useSchemaDesigner.ts          # Integrate with composer
│   ├── components/SchemaDesigner/
│   │   ├── FieldCatalog.vue              # Add references section
│   │   └── ExportPanel.vue               # Combined export
│   └── pages/schema-designer/
│       ├── new.vue                       # Composer flow
│       └── [id].vue                      # Unified editing
└── server/
    └── db/schema.ts                      # Add packages column

apps/schema-designer/
└── server/db/schema.ts                   # Sync schema changes
```

---

## Success Criteria

1. **Package Discovery** — User can browse and select packages from UI
2. **Configuration** — Package options shown as forms, layer name enforced
3. **Composition** — User can combine packages with custom collections
4. **Cross-References** — Custom collections can reference package collections
5. **Export** — Generated config includes all packages, layers, and settings
6. **Backwards Compatible** — Existing projects continue to work

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Manifest format changes | Version field in manifest, migration utilities |
| Package not found errors | Graceful fallback, clear error messages |
| Circular dependencies | Validation in composer, topological sort for extends |
| Large bundle size | Lazy-load manifests, only fetch selected packages |
| Breaking existing projects | Migration on load, keep legacy fields |

---

## Future Enhancements

1. **npm package discovery** — Fetch manifests from published packages
2. **MCP server integration** — AI can suggest packages based on description
3. **Package versioning** — Handle multiple versions of same package
4. **Custom package creation** — Users create their own package manifests
5. **Template marketplace** — Share pre-configured project templates

---

*This plan establishes a foundation for transforming the schema-designer into a full app designer with modular package composition.*
