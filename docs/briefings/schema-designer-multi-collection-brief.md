# Schema Designer: Multi-Collection App Design

## Current State

The schema designer currently supports:
- **Single collection per project** - One schema with fields, options, card template
- **AI chat** - Can generate fields for that single collection
- **Export** - JSON schema for one collection

**Key files:**
- `packages/nuxt-crouton-schema-designer/app/composables/useSchemaDesigner.ts` - Single collection state
- `packages/nuxt-crouton-schema-designer/app/composables/useSchemaAI.ts` - AI generation
- `packages/nuxt-crouton-schema-designer/app/types/schema.ts` - Type definitions
- `server/database/schema/schema-designer.ts` - Project persistence

## Desired State

Support designing **multiple related collections** for a complete app:

```
Project: "E-commerce App"
├── products (collection)
│   ├── name, price, description, images
│   └── references: category, vendor
├── categories (collection)
│   ├── name, slug, parentCategory
│   └── references: products (reverse)
├── orders (collection)
│   ├── status, total, items (repeater)
│   └── references: customer, products
├── customers (collection)
│   └── name, email, addresses (repeater)
└── vendors (collection)
    └── name, contactEmail, products (reverse)
```

### Key Capabilities

1. **Multi-collection projects** - Add/remove collections within one project
2. **Cross-collection references** - Define relationships between collections
3. **AI app generation** - "Create an e-commerce app" generates all collections
4. **Bulk export** - Export all schemas + layer config at once
5. **Visual relationship view** - See how collections connect

## Architecture Options

### Option A: Flat Collection List

```typescript
interface AppProject {
  id: string
  name: string
  layerName: string
  collections: CollectionSchema[]  // Array of collections
}

interface CollectionSchema {
  id: string
  collectionName: string
  fields: SchemaField[]
  options: CollectionOptions
  cardTemplate?: string
}
```

**Pros:** Simple, easy to implement
**Cons:** No explicit relationship modeling

### Option B: Graph-Based with Relationships

```typescript
interface AppProject {
  id: string
  name: string
  layerName: string
  collections: CollectionSchema[]
  relationships: Relationship[]  // Explicit edges
}

interface Relationship {
  id: string
  from: { collection: string, field: string }
  to: { collection: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}
```

**Pros:** Clear relationship modeling, better for visualization
**Cons:** More complex, relationships duplicated in fields

### Recommendation: Option A with Implicit Relationships

Keep it simple. Relationships are already defined via `reference` fields. We can derive the graph from field definitions:

```typescript
// Field already has reference info
interface SchemaField {
  type: 'reference'
  refTarget: string  // Target collection name
}

// Derive relationships dynamically
function getRelationships(collections: CollectionSchema[]) {
  return collections.flatMap(c =>
    c.fields
      .filter(f => f.type === 'reference')
      .map(f => ({
        from: c.collectionName,
        to: f.refTarget,
        field: f.name
      }))
  )
}
```

## UI/UX Design

### Main Layout Changes

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Project Name | Layer | Export All | Save            │
├──────────┬──────────────────────────────────────────────────┤
│ AI Chat  │  Collection Tabs: [products] [categories] [+]    │
│          ├──────────┬───────────────────┬──────────────────│
│          │ Field    │ Schema Builder    │ Preview/Code     │
│          │ Catalog  │                   │                  │
│          │          │                   │                  │
│          │          │                   │                  │
│          │          │                   │                  │
└──────────┴──────────┴───────────────────┴──────────────────┘
```

### New Components Needed

1. **CollectionTabs.vue** - Tab bar for switching collections
2. **CollectionManager.vue** - Add/rename/delete collections modal
3. **RelationshipDiagram.vue** - Visual graph of collection relationships
4. **BulkExportPanel.vue** - Export all collections at once

### Collection Tabs Behavior

- Click tab = switch to that collection's schema
- `[+]` button = add new collection (modal for name)
- Right-click tab = rename/delete options
- Drag tabs = reorder collections
- Tab shows indicator if collection has validation errors

### AI Chat Enhancements

**Current:** "Create a blog post collection with title, content, author"

**Enhanced:**
- "Create an e-commerce app with products, categories, and orders"
- "Add a reviews collection that references products"
- "Create a relationship between customers and orders"

AI should:
1. Recognize multi-collection requests
2. Generate multiple collections with proper references
3. Suggest related collections ("You have products, would you like categories?")

## Data Model Changes

### Database Schema Update

```typescript
// Current
schema_projects: {
  schema: json  // Single SchemaDesignerState
}

// New
schema_projects: {
  collections: json  // CollectionSchema[]
  // OR migrate schema -> collections[0] for backwards compat
}
```

### Migration Strategy

1. Add `collections` column (nullable)
2. On read: if `collections` null, wrap `schema` as `collections[0]`
3. On write: always use `collections`
4. Later: migrate all, remove `schema` column

## Composable Changes

### useSchemaDesigner.ts

```typescript
// Current
const state = ref<SchemaDesignerState>({
  collectionName: '',
  fields: [],
  ...
})

// New
const collections = ref<CollectionSchema[]>([])
const activeCollectionId = ref<string | null>(null)
const activeCollection = computed(() =>
  collections.value.find(c => c.id === activeCollectionId.value)
)

// Collection management
function addCollection(name: string)
function removeCollection(id: string)
function setActiveCollection(id: string)

// Field operations now scoped to active collection
function addField(field: SchemaField) {
  activeCollection.value?.fields.push(field)
}
```

### useSchemaAI.ts

Enhance to handle multi-collection responses:

```typescript
interface AIResponse {
  type: 'single' | 'multi'
  collections?: CollectionSchema[]
  fields?: SchemaField[]  // For single collection additions
}
```

## Export Changes

### Current Export

```json
{
  "collection": "products",
  "fields": [...]
}
```

### New Export Options

**Individual:** Same as current, per collection

**Bulk (all collections):**
```json
{
  "layer": "ecommerce",
  "collections": [
    { "name": "products", "fields": [...] },
    { "name": "categories", "fields": [...] }
  ]
}
```

**CLI command generation:**
```bash
pnpm crouton ecommerce products
pnpm crouton ecommerce categories
pnpm crouton ecommerce orders
# Or batch:
pnpm crouton ecommerce --all
```

## Implementation Phases

### Phase 1: Multi-Collection State (Foundation)
- [ ] Update types for multi-collection support
- [ ] Modify useSchemaDesigner for collection array
- [ ] Add collection management functions
- [ ] Database migration for collections column
- [ ] Backwards compatibility layer

### Phase 2: UI for Collection Management
- [ ] CollectionTabs component
- [ ] Add/rename/delete collection modals
- [ ] Update new.vue and [id].vue layouts
- [ ] Collection switching preserves scroll/state

### Phase 3: Dependent Field Support (CRITICAL)
- [ ] Add dependsOn UI in FieldEditor.vue
- [ ] Dropdown for parent field (same collection)
- [ ] Dropdown for source collection (project collections)
- [ ] Dropdown for source field (target collection's fields)
- [ ] displayAs selector (slotButtonGroup, etc.)
- [ ] Real-time validation of dependencies
- [ ] Visual indicator on fields with dependencies

### Phase 4: Enhanced AI Generation
- [ ] Update AI prompts for multi-collection
- [ ] Handle "create an app" requests
- [ ] Auto-suggest related collections
- [ ] Generate cross-collection references
- [ ] **AI generates dependsOn meta** for cascading fields

### Phase 5: Relationship Visualization
- [ ] RelationshipDiagram component (optional view)
- [ ] Show reference connections between collections
- [ ] Show dependent field connections (different line style)
- [ ] Click relationship to navigate

### Phase 6: Bulk Export
- [ ] BulkExportPanel with all collections
- [ ] Generate layer config snippet
- [ ] Batch CLI commands

## Dependent Fields (CRITICAL)

The crouton system has a powerful **dependent field** feature for cascading selections across collections. This is essential for multi-collection apps.

### How Dependent Fields Work

```json
{
  "slots": {
    "type": "array",
    "meta": {
      "dependsOn": "locationId",           // Parent field in THIS collection
      "dependsOnCollection": "locations",  // Collection to look up options
      "dependsOnField": "slots",           // Field in that collection with options
      "displayAs": "slotButtonGroup"       // Optional: UI variant
    }
  }
}
```

**Runtime behavior:**
1. User selects a `location` → triggers lookup
2. System fetches `locations` collection, finds matching record
3. Extracts `slots` field from that record
4. Populates dependent field with those options

### Generated Components for Dependent Fields

The CLI generates additional components when `dependsOn` is present:

```
collections/[collection]/app/components/[Field]/
├── Input.vue      - Edit single item (repeater)
├── Select.vue     - Cascading selection UI
└── CardMini.vue   - Display in tables/lists
```

### Multi-Collection Designer Impact

The schema designer MUST support:

1. **Defining dependsOn in UI**
   - When adding a field, show "Depends on" section
   - Dropdown: Select parent field (from same collection)
   - Dropdown: Select source collection (from project collections)
   - Dropdown: Select source field (from that collection's fields)

2. **Visual dependency indicators**
   - Show which fields depend on others
   - Show cross-collection dependencies in relationship diagram

3. **AI understanding**
   - AI should generate dependsOn when appropriate
   - Example: "slots that depend on location" → correct meta properties
   - AI should suggest: "This looks like it should depend on [field]"

4. **Validation**
   - Warn if dependsOn references non-existent field
   - Warn if dependsOnCollection doesn't exist in project
   - Warn if dependsOnField doesn't exist in target collection

### Example: Booking System

```
Project: "Court Booking System"
├── locations
│   ├── name: string
│   ├── address: string
│   └── slots: array (available time slots)
│
└── bookings
    ├── locationId: reference → locations
    └── bookedSlots: array
        └── meta:
            ├── dependsOn: "locationId"
            ├── dependsOnCollection: "locations"
            └── dependsOnField: "slots"
```

When user selects a location in booking form → bookedSlots shows only that location's available slots.

### UI for Dependent Field Configuration

```
┌─────────────────────────────────────────┐
│ Field: bookedSlots                      │
│ Type: array                             │
├─────────────────────────────────────────┤
│ ☑ This field depends on another field  │
│                                         │
│ Parent field:    [locationId ▼]         │
│ Source collection: [locations ▼]        │
│ Source field:    [slots ▼]              │
│                                         │
│ Display as:      [slotButtonGroup ▼]    │
└─────────────────────────────────────────┘
```

## Open Questions

1. **Reference field UI** - How to select target collection? Dropdown of existing collections?
2. **Circular references** - Allow? Warn? (e.g., User → Post → Comment → User)
3. **Collection templates** - Pre-built collection sets? (e-commerce, blog, CRM)
4. **Max collections** - Limit per project? (UX gets unwieldy with 20+ tabs)
5. **Dependent field validation** - Real-time validation as collections change?

## Success Criteria

- [ ] Can create project with 5+ collections
- [ ] AI can generate multi-collection app from single prompt
- [ ] References between collections work correctly
- [ ] **Dependent fields can be configured in UI** (dependsOn, dependsOnCollection, dependsOnField)
- [ ] **Dependent field validation** warns about missing references
- [ ] Export generates valid schemas for all collections (including dependent field meta)
- [ ] Existing single-collection projects still work

## Related Files

- `packages/nuxt-crouton-schema-designer/app/composables/useSchemaDesigner.ts`
- `packages/nuxt-crouton-schema-designer/app/composables/useSchemaAI.ts`
- `packages/nuxt-crouton-schema-designer/app/types/schema.ts`
- `packages/nuxt-crouton-schema-designer/server/database/schema/schema-designer.ts`
- `packages/nuxt-crouton-schema-designer/app/pages/schema-designer/new.vue`
- `packages/nuxt-crouton-schema-designer/app/pages/schema-designer/[id].vue`
