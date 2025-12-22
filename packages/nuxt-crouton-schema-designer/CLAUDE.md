# CLAUDE.md - @crouton/schema-designer

## Package Purpose

Visual schema designer for Nuxt Crouton collections. Provides a drag-and-drop interface to design collection schemas, preview with mock data, and export JSON schemas ready for the crouton CLI. Supports saving schemas as projects with full CRUD persistence.

## Key Features

- **Visual Field Editor**: Add fields by clicking/dragging from a catalog
- **Field Type Support**: All crouton field types (string, text, number, boolean, date, etc.)
- **Meta Properties**: Configure required, maxLength, label, translatable, unique, etc.
- **Live Preview**: See mock data rendered in table/list/grid/cards layouts
- **Project Persistence**: Save schemas as projects with NuxtHub D1
- **Export Options**: JSON schema, crouton.config.js snippet, CLI command

## Key Files

| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Layer configuration |
| `app/types/schema.ts` | Type definitions for schema fields and state |
| `app/composables/useSchemaDesigner.ts` | Main state management composable |
| `app/composables/useSchemaProjects.ts` | Project CRUD composable |
| `app/composables/useFieldTypes.ts` | Field type registry |
| `app/composables/useMockData.ts` | Faker.js mock data generation |
| `app/composables/useSchemaExport.ts` | Export functionality |
| `app/components/SchemaDesigner/FormPreview.vue` | Form preview (must sync with generator) |
| `server/database/schema/schema-designer.ts` | Drizzle schema for projects table |

## Composables

| Composable | Purpose |
|------------|---------|
| `useSchemaDesigner()` | Main state: fields, collection settings, validation |
| `useSchemaProjects()` | Project CRUD: list, create, update, delete |
| `useFieldTypes()` | Field type definitions with icons and defaults |
| `useMockData()` | Generate fake data based on field names/types |
| `useSchemaExport()` | Export schema as JSON, config, or CLI command |

## Components

### Editor Components
- `SchemaDesigner/FieldCatalog.vue` - Sidebar with draggable field types
- `SchemaDesigner/SchemaBuilder.vue` - Main editing area
- `SchemaDesigner/FieldItem.vue` - Individual field display
- `SchemaDesigner/FieldEditor.vue` - Slideover for property editing
- `SchemaDesigner/PreviewPanel.vue` - Live preview with CroutonCollection
- `SchemaDesigner/ExportPanel.vue` - Export modal with tabs

### Project Components
- `SchemaDesigner/ProjectList.vue` - List of saved projects
- `SchemaDesigner/ProjectCard.vue` - Project card with actions

## Sync Requirements

### FormPreview.vue ↔ form-component.mjs

`FormPreview.vue` must stay in sync with the collection generator's form output.

When `packages/nuxt-crouton-cli/lib/generators/form-component.mjs` changes:
- Update field type → component mapping
- Update form layout structure (CroutonFormLayout slots)
- Update default values for field types

Key mappings to keep in sync:

| Field Type | Component | Notes |
|------------|-----------|-------|
| boolean | UCheckbox | NOT USwitch |
| string | UInput | size="xl" |
| text | UTextarea | size="xl" |
| number/decimal/integer | UInputNumber | |
| date | CroutonCalendar | Preview shows UInput placeholder |
| datetime | CroutonCalendar | Preview shows UInput placeholder |
| reference | CroutonFormReferenceSelect | Preview shows UInput placeholder |
| repeater | CroutonFormRepeater | Preview shows placeholder div |
| json | UTextarea | JSON formatting |
| array | UTextarea | Line-separated values |

Form structure must match generator:
- `CroutonFormLayout` with `#main`, `#sidebar`, `#footer` slots
- `UFormField` wrappers with `label`, `name`, `class="not-last:pb-4"`
- `meta.area` support for sidebar placement
- `CroutonFormActionButton` in footer

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| `schema-designer/index.vue` | `/schema-designer` | Projects list |
| `schema-designer/[id].vue` | `/schema-designer/:id` | Edit specific project |
| `schema-designer/new.vue` | `/schema-designer/new` | Create new project |

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/schema-projects` | List all projects |
| POST | `/api/schema-projects` | Create new project |
| GET | `/api/schema-projects/[id]` | Get project by ID |
| PUT | `/api/schema-projects/[id]` | Update project |
| DELETE | `/api/schema-projects/[id]` | Delete project |

## Database Schema

```typescript
// schema_projects table
{
  id: string           // UUID primary key
  name: string         // Project name
  layerName: string    // Target layer name
  collectionName: string // Collection name
  schema: json         // SchemaDesignerState
  options: json        // CollectionOptions
  teamId?: string      // Optional team scope
  userId?: string      // Creator
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-schema-designer'],

  // Required: NuxtHub for database persistence
  modules: ['@nuxthub/core'],
  hub: {
    db: 'sqlite'
  }
})
```

## Known TypeScript Limitations

This package has known type checking limitations when checked in isolation:

1. **`useDB` not found** - NuxtHub's `useDB` is auto-imported at runtime but TypeScript can't see it when checking the layer. This works correctly at runtime.

2. **`hub.db` type error** - The hub config type augmentation may not load correctly during isolated type checking.

These are common issues with Nuxt layers that depend on parent app module configurations. The package works correctly at runtime when the parent app has `@nuxthub/core` properly configured.

## Types

### SchemaField
```typescript
interface SchemaField {
  id: string
  name: string
  type: FieldType
  meta: FieldMeta
  refTarget?: string
}
```

### FieldType
```typescript
type FieldType = 'string' | 'text' | 'number' | 'decimal' | 'boolean' |
                 'date' | 'datetime' | 'uuid' | 'integer' | 'json' |
                 'repeater' | 'array'
```

### SchemaProject
```typescript
interface SchemaProject {
  id: string
  name: string
  layerName: string
  collectionName: string
  schema: SchemaDesignerState
  options: CollectionOptions
  teamId?: string
  userId?: string
  createdAt: string
  updatedAt: string
}
```

## Dependencies

- **Requires**: `@friendlyinternet/nuxt-crouton` (for CroutonCollection preview)
- **Uses**: `@faker-js/faker` for mock data generation
- **Works with**: NuxtHub D1 for persistence

## Testing

```bash
npx nuxt typecheck  # Run type checking
```

## Common Tasks

### Add the layer to your app
```typescript
export default defineNuxtConfig({
  extends: ['@crouton/schema-designer']
})
```

### Access schema designer
Navigate to `/schema-designer` in your app.

### Export and use a schema
1. Design your schema in the visual editor
2. Click "Export Schema"
3. Copy the JSON to `schemas/[collection].json`
4. Run `pnpm crouton [layer] [collection]`
