# Plan: Collection Display System & Publishable Pages

## Progressive Architecture

Crouton is progressive — each layer adds capability without requiring the others:

```
Layer 0: Collections (standalone CRUD — works alone)
  └─ List.vue, Form.vue, Detail.vue — full admin panel
  └─ No page concepts, no URLs, no SEO
  └─ This is the base. Every collection works here.

Layer 1: + crouton-pages (collections become publishable content)
  └─ Collections opt in with publishable: true
  └─ Page system provides: URL (slug), SEO, status, visibility
  └─ Collection still just provides: data + Detail view
  └─ The bridge is one-directional: pages reference collections, not the other way

Layer 2: + routing/sitemap (collections become a site)
  └─ Published collection pages appear in sitemap
  └─ Index pages list all published items of a type
  └─ SEO auto-filled from display config
```

**A collection never knows about pages.** Users can run `crouton generate` and get a working admin panel with detail views. Later they add `crouton-pages` and flip `publishable: true` — now those collections have public pages. No refactoring needed.

---

## Context

Crouton generates CRUD collections with `List.vue` and `Form.vue` per collection. Display components (Card, CardMini, Detail) either use generic core fallbacks or require manual creation. There's no way to give a collection a public-facing page without custom work.

This plan adds:
1. **Display config** in schemas so collections describe how their items should look
2. **Generated Detail.vue** per collection, with smart generic fallback in core
3. **Smart default Card/CardMini** in core that use display config
4. **Publishable collections** that auto-register as page types in crouton-pages

## Current State

### What exists

| Component | Per-collection? | Source | Quality |
|-----------|----------------|--------|---------|
| `List.vue` | Generated | crouton-cli | Full-featured (table, grid, tree, kanban) |
| `_Form.vue` | Generated | crouton-cli | Full-featured (tabs, validation, all field types) |
| `CroutonDefaultCard` | Generic fallback | crouton-core | Basic (shows label + ID, no field awareness) |
| `CroutonItemCardMini` | Generic fallback | crouton-core | Basic (shows display label, resolves custom `{Name}CardMini`) |
| `CroutonDetailLayout` | Generic wrapper | crouton-core | Shell only (header + slot, no field rendering) |
| `Detail.vue` | Not generated | - | `FormDynamicLoader` already tries `{Name}Detail` convention but nothing is generated |

### Component resolution (already works)

The system already resolves custom components by convention:
- `Collection.vue` → looks for `{CollectionName}Card`, falls back to `CroutonDefaultCard`
- `ItemCardMini.vue` → looks for `{CollectionName}CardMini`, falls back to generic badge
- `FormDynamicLoader` → for `action='view'`, tries `{ComponentName}Detail`, falls back to form

### Schema metadata (exists but not surfaced to runtime)

Schema JSON files contain field metadata like `area` (main/sidebar/meta), `group`, `displayAs` (badge), but the generated `use[Collection].ts` composable only exports: `name`, `layer`, `apiPath`, `componentName`, `defaultValues`, `columns`, `hierarchy`, `schema` (Zod).

The field-level metadata is consumed during generation but **not available at runtime**.

### Page type system (fully built)

- Apps register page types in `app.config.ts` with `croutonApps.{app}.pageTypes[]`
- Each type has: `id`, `name`, `component`, `category`, `configSchema`, `defaultProps`
- `usePageTypes()` aggregates all types with `fullId` = `appId:typeId`
- `Renderer.vue` resolves component by `fullId`, passes `page` + `config` as props
- Page records store `pageType`, `config` (JSON), `content`, `slug`, SEO fields, status, visibility
- `CollectionBlock` already exists for embedding collection lists in pages

---

## Phase 1: Display Config

**Goal**: Collections declare which fields are important for display contexts, and this info is available at runtime.

### 1.1 Add `display` section to schema format

Both schema formats (array and object) should support a top-level `display` key:

```json
{
  "name": "bikes",
  "label": "Bikes",
  "display": {
    "title": "name",
    "subtitle": "brand",
    "image": "photo",
    "badge": "status",
    "description": "summary"
  },
  "fields": [ ... ]
}
```

| Key | Purpose | Used by |
|-----|---------|---------|
| `title` | Primary identifier field | Card, CardMini, Detail, page title |
| `subtitle` | Secondary context | Card, Detail |
| `image` | Visual identifier field | Card, CardMini (avatar), Detail (hero) |
| `badge` | Status/category indicator | Card, CardMini |
| `description` | Summary text | Card (grid), Detail |

**All fields are optional.** Missing fields are auto-inferred at runtime by `useDisplayConfig()` (see 1.4).

**File to modify**: Schema type definitions in `packages/crouton-cli/` (wherever the schema interface is defined).

### 1.2 Surface display config in generated composable

The generated `use[Collection].ts` should include the display config:

```typescript
export const bikesConfig = {
  name: 'bikes',
  layer: 'store',
  apiPath: 'store-bikes',
  componentName: 'StoreBikesForm',
  defaultValues: { ... },
  columns: [ ... ],
  display: {
    title: 'name',
    subtitle: 'brand',
    image: 'photo',
    badge: 'status',
    description: 'summary'
  }
}
```

**File to modify**: Generator templates in `packages/crouton-cli/` that produce `use[Collection].ts`.

### 1.3 Surface field metadata at runtime

Currently, field `area`, `group`, `type`, and `displayAs` are only used during generation. For the Detail component to render fields intelligently, it needs to know field types and areas at runtime.

Add a `fields` array to the generated config:

```typescript
fields: [
  { name: 'name', type: 'string', label: 'Name', area: 'main' },
  { name: 'brand', type: 'string', label: 'Brand', area: 'main' },
  { name: 'photo', type: 'image', label: 'Photo', area: 'main' },
  { name: 'price', type: 'number', label: 'Price', area: 'sidebar' },
  { name: 'status', type: 'string', label: 'Status', area: 'sidebar', displayAs: 'badge' },
  { name: 'description', type: 'text', label: 'Description', area: 'main' },
]
```

This is a lightweight projection of the schema — just enough for display components. **Not the full schema JSON**, just the display-relevant fields.

**File to modify**: Same generator template as 1.2.

### 1.4 Build `useDisplayConfig()` with auto-inference

**File**: New composable in `packages/crouton-core/app/composables/useDisplayConfig.ts`

A composable that resolves display config for any collection — merging explicit config with inferred defaults for missing fields. This is the single entry point all display components use.

```typescript
export function useDisplayConfig(collectionName: string) {
  const collections = useCollections()
  const config = collections[collectionName]

  // Explicit display config (from schema)
  const explicit = config?.display ?? {}

  // Auto-infer missing fields from field metadata
  const fields = config?.fields ?? []
  const inferred = {
    title: findField(fields, ['title', 'name', 'label']) ?? firstFieldOfType(fields, 'string'),
    subtitle: findField(fields, ['subtitle', 'description', 'summary']),
    image: firstFieldOfType(fields, ['image', 'asset']),
    badge: findField(fields, ['status', 'state', 'category']) ?? firstFieldWithDisplayAs(fields, 'badge'),
    description: findField(fields, ['description', 'summary', 'excerpt']),
  }

  // Explicit overrides inferred
  return { ...inferred, ...stripUndefined(explicit) }
}
```

**Inference rules** (applied only when the explicit `display` config omits a field):

| Display key | Inference strategy |
|-------------|-------------------|
| `title` | Field named `title`, `name`, or `label` → first string field |
| `subtitle` | Field named `subtitle`, `description`, or `summary` (only if not already used as `title`) |
| `image` | First field of type `image` or `asset` |
| `badge` | Field named `status`, `state`, or `category` → first field with `displayAs: 'badge'` |
| `description` | Field named `description`, `summary`, or `excerpt` (only if not already used as `subtitle`) |

This means **every existing collection gets reasonable display behavior on day one** without touching any schema files. Collections with explicit `display` config get exact control.

### 1.5 Ensure display + fields are in `useCollections()`

The `useCollections()` composable (from `app.config.ts`) should expose display config and field metadata so `useDisplayConfig()` and core components can access them by collection name.

This happens naturally since the generated config is registered in `app.config.ts` under `croutonCollections.{name}` — just ensure `display` and `fields` are included in that registration.

---

## Phase 2: Display Components

**Goal**: Every collection gets a Detail.vue (completing the List/Form/Detail triad), and core provides smart fallback components for Card/CardMini.

### 2.1 Detail.vue and Card.vue per collection (AI generation — deferred)

> **Decision**: The CLI template generator for Detail.vue (previously "Path B") is **deferred**. The `CroutonDetail` generic fallback (2.2) covers the baseline for all collections at runtime. The AI generation path via the schema designer is the real goal for custom, domain-aware Detail/Card components — but it depends on [Schema Designer v2, Phase 4](./schema-designer-v2.md).

Detail and Card components are **presentational** — how you display a bike is different from how you display a team member. The schema designer (when ready) will generate domain-aware components:

- AI knows "bikes" should show the photo as a hero, specs in a grid, description as prose
- AI knows "team members" should show an avatar circle, role as a badge, contact info grouped
- User can edit the AI output directly — changes sync via Yjs
- Seed data powers the live preview

Output lands in the collection folder:

```
layers/[layer]/collections/[collection]/app/components/
├── List.vue      ← template-generated (already exists)
├── Form.vue      ← template-generated (already exists)
├── Detail.vue    ← AI-generated (future)
└── Card.vue      ← AI-generated (future, optional)
```

Until AI generation is available, `CroutonDetail` (2.2) serves as the generic fallback and `CroutonDefaultCard` (2.3) handles card rendering — both powered by display config and field metadata from Phase 1.

#### Field type rendering (v1 — keep it simple)

Display components handle these field types:

| Field type | Renders as |
|-----------|------------|
| `string` | Text paragraph |
| `number` | Formatted number |
| `boolean` | Check/cross icon with label |
| `date` | `CroutonDate` component |
| `image` / `asset` | Image with lightbox |
| `reference` | `CroutonItemCardMini` for the referenced item |
| `multi-reference` | Row of `CroutonItemCardMini` cards |
| `options` | Badge |

**Deferred to later** (not v1): `text`/`editor` (prose HTML rendering), `repeater` (recursive sub-items), `json` (collapsed viewer). The AI path may handle these earlier since it can reason about rendering.

### 2.2 Build `CroutonDetail` (generic fallback)

**File**: New component in `packages/crouton-core/app/components/Detail.vue`

This is the fallback when no generated or custom Detail.vue exists. It uses the same display config and field metadata to render a reasonable view for any collection.

**Props:**
```typescript
interface Props {
  item: Record<string, any>
  collection: string        // Collection name to look up config
  fields?: FieldMeta[]      // Override: pass fields directly
  exclude?: string[]        // Fields to hide
}
```

Same layout and field-type rendering as the generated Detail, but driven entirely by runtime config from `useCollections()`. No customization possible — if you need that, you have (or generate) a Detail.vue.

**Resolution chain:**
```
FormDynamicLoader (action='view')
  → {CollectionName}Detail (generated or user-customized)
  → CroutonDetail (generic fallback — NEW)
  → Form.vue (last resort, as today)
```

### 2.3 Improve `CroutonDefaultCard`

**File**: `packages/crouton-core/app/components/DefaultCard.vue` (or wherever it lives in the Nuxt module)

Current behavior: Shows item label + truncated ID. No field awareness.

New behavior: Read `display` config from `useCollections()` and render:

**List layout:**
```
┌─────────────────────────────────────────────┐
│ [image]  Title Text                  [badge] │
│          Subtitle text                       │
└─────────────────────────────────────────────┘
```

**Grid layout:**
```
┌─────────────────────┐
│ [  image/hero     ] │
│                     │
│ Title Text   [badge]│
│ Subtitle text       │
│ Description excerpt  │
└─────────────────────┘
```

**Fallback**: If no display config, fall back to current behavior (label + ID).

Props stay the same (`item`, `layout`, `collection`, `size`). The component just becomes smarter about what to show.

### 2.4 Improve `CroutonItemCardMini`

**File**: `packages/crouton-core/app/components/ItemCardMini.vue` (or equivalent)

Current behavior: Shows display label as badge. Already tries custom `{Name}CardMini`.

New behavior: When no custom component exists, use display config:

```
┌─────────────────────────────┐
│ [avatar/image] Title  [badge]│
└─────────────────────────────┘
```

- `image` field → tiny avatar/thumbnail
- `title` field → text label
- `badge` field → colored badge (if space permits)

Small change, big improvement for reference fields in tables.

### 2.5 Component resolution chain (updated)

After this phase, the resolution chain becomes:

```
Card:     {CollectionName}Card (AI-generated or manual) → CroutonDefaultCard (now display-aware)
CardMini: {CollectionName}CardMini (manual)              → CroutonItemCardMini (now display-aware)
Detail:   {CollectionName}Detail (AI or manual)          → CroutonDetail (generic fallback) → Form.vue (last resort)
```

- **Detail**: `CroutonDetail` handles all collections by default using display config + field metadata. AI-generated Detail.vue (future, via schema designer) or manual overrides take priority when present.
- **Card**: `CroutonDefaultCard` uses display config — good enough without generation. AI-generated Card.vue is optional.
- **CardMini**: Not generated — improved core component handles it well with display config.

---

## Phase 3: Publishable Collections

**Goal**: Collections can opt into having public pages via the existing page type system.

### 3.1 Add `publishable` flag to schema

```json
{
  "name": "bikes",
  "label": "Bikes",
  "publishable": true,
  "display": {
    "title": "name",
    "subtitle": "brand",
    "image": "photo"
  },
  "fields": [ ... ]
}
```

`publishable: true` is a signal to the generator. It does NOT add fields to the bikes table (SEO, slug, status live on the page record, not the collection).

### 3.2 Generator creates page type registration

When `publishable: true`, the generator adds to the collection's `app.config.ts` (or the layer's config):

```typescript
export default defineAppConfig({
  croutonApps: {
    store: {   // layer name
      id: 'store',
      name: 'Store',
      pageTypes: [
        {
          id: 'bikes-detail',
          name: 'Bike Page',
          component: 'CroutonCollectionPageRenderer',  // generic, see 3.3
          icon: 'i-lucide-file-text',
          category: 'collections',
          collection: 'bikes'  // NEW field on CroutonPageType
        }
      ]
    }
  }
})
```

### 3.3 Build `CroutonCollectionPageRenderer`

**File**: New component in `packages/crouton-pages/app/components/CollectionPageRenderer.vue`

This is the bridge between pages and collections. It receives a page record, extracts the collection item reference from `config`, fetches the item, and renders it.

```vue
<script setup lang="ts">
interface Props {
  page: PageRecord
}

const props = defineProps<Props>()

// Page type has collection name
const { getPageType } = usePageTypes()
const pageType = getPageType(props.page.pageType)
const collectionName = pageType?.collection

// Item ID stored in page config
const itemId = computed(() => props.page.config?.itemId)

// Fetch the collection item
const { data: item, pending } = await useFetch(
  `/api/teams/${props.page.teamId}/${collectionName}/${itemId.value}`
)

// Check for custom detail component, fall back to generic
const detailComponent = resolveCustomOrDefault(collectionName)
</script>

<template>
  <component
    :is="detailComponent"
    v-if="item"
    :item="item"
    :collection="collectionName"
    :page="page"
  />
</template>
```

**Resolution**: tries `{CollectionName}Detail` first, falls back to `CroutonDetail` (from Phase 2).

**Orphaned references**: When the referenced collection item is deleted or inaccessible (404/403), the renderer shows a graceful "item unavailable" placeholder. The page stays published with its title and SEO intact — only the collection content is missing. This avoids cascading deletes and keeps pages/collections independently managed.

### 3.4 Add `collection` field to `CroutonPageType` type

**File**: `packages/crouton-core/app/types/app.ts`

```typescript
interface CroutonPageType {
  id: string
  name: string
  component: string
  category?: string
  icon?: string
  requiresAuth?: boolean
  defaultProps?: Record<string, unknown>
  configSchema?: CroutonPageTypeConfigField[]
  collection?: string  // NEW: links this page type to a collection
}
```

### 3.5 Wire collection item picker into page form

When a user creates a page and selects a collection-linked page type, the form shows a collection item selector. **This is not new work** — the existing CRUD helpers already provide everything needed:

- **`CroutonFormReferenceSelect`** — searchable dropdown, single/multi-select
- **Inline creation** — "Create new" button opens slideover via `useCrouton()`
- **Auto-selection** — watches for new items, auto-selects after creation
- **Nested forms** — `useCrouton()` supports 5 levels deep

**Implementation**: Extend the page form (workspace editor) to detect when the selected page type has a `collection` field. When it does, render:

```vue
<CroutonFormReferenceSelect
  v-model="pageConfig.itemId"
  :collection="pageType.collection"
  :label="pageType.name"
/>
```

Select existing and create-new both come for free from the existing component.

The selected item ID is stored in `page.config.itemId`.

**File to modify**: `packages/crouton-pages/app/components/Workspace/Editor.vue`

### 3.6 Auto-populate page title from collection item

When a user selects an existing bike or creates a new one, auto-fill the page title and slug from the collection item's `display.title` field. User can override.

---

## Phase 4 (Future): Optional enhancements

Not part of this plan, but natural next steps (Layer 2 in the progressive architecture):

- **Card.vue generation**: Scaffold per-collection cards for collections that need heavy customization
- **Advanced field type rendering in Detail**: `text`/`editor` (prose HTML), `repeater` (recursive sub-items), `json` (collapsed viewer)
- **SEO auto-fill from display config**: Use display.description for meta description, display.image for og:image
- **Collection listing pages**: Auto-create index pages that list all published items of a collection type
- **Sitemap integration**: Published collection pages automatically appear in sitemap

---

## Implementation Order

```
Phase 1: Display Config (foundation — everything else depends on this)
  1.1  Schema display section
  1.2  Generated composable includes display
  1.3  Field metadata at runtime
  1.4  Build useDisplayConfig() with auto-inference
  1.5  Ensure display + fields are in useCollections()

Phase 2: Display Components (uses display config)
  2.1  [DEFERRED] AI generation for Detail.vue + Card.vue (depends on schema-designer-v2 Phase 4)
  2.2  Build CroutonDetail generic fallback in crouton-core
  2.3  Improve DefaultCard with display config
  2.4  Improve ItemCardMini with display config
  2.5  Wire up resolution chain

Phase 3: Publishable Collections (uses Detail + page types)
  3.1  Schema publishable flag
  3.2  Generator creates page type registration
  3.3  Build CollectionPageRenderer (with orphaned reference handling)
  3.4  Add collection field to CroutonPageType
  3.5  Wire FormReferenceSelect into page form (uses existing CRUD helpers)
  3.6  Auto-populate page title
```

**Build order for Phase 2**: 2.2 (generic fallback) first — this gives every collection a Detail view immediately. Then 2.3/2.4 (card improvements) in parallel. 2.5 wires up the resolution chain. AI generation (2.1) arrives later when the schema designer is ready.

Each phase is independently useful and progressive:
- **Phase 1 alone**: Better runtime metadata, auto-inferred display config for all existing collections
- **Phase 1 + 2**: Every collection gets List + Form + Detail — full CRUD view triad. Smart Card/CardMini for free. No pages needed.
- **Phase 1 + 2 + 3**: Collections can be published as pages. The page system adds URLs, SEO, status. Collections don't change.

---

## Files Changed/Created Summary

### New files
| File | Package | Purpose |
|------|---------|---------|
| `composables/useDisplayConfig.ts` | crouton-core | Resolves display config with auto-inference heuristic |
| `components/Detail.vue` | crouton-core | Generic fallback detail renderer |
| `components/CollectionPageRenderer.vue` | crouton-pages | Bridge between page record and collection item |

### New files (deferred — depends on schema-designer-v2)
| File | Package | Purpose |
|------|---------|---------|
| `Detail.vue` (per collection) | generated output | Per-collection detail view — AI generated |
| `Card.vue` (per collection) | generated output | Per-collection card — AI generated (optional) |
| AI component generation UI | schema-designer | Phase 4 of schema designer — see schema-designer-v2.md |

### Modified files
| File | Package | Change |
|------|---------|--------|
| Schema type definitions | crouton-cli | Add `display` and `publishable` to schema interface |
| Composable generator template | crouton-cli | Output `display` and `fields` in config |
| `app.config.ts` generator template | crouton-cli | Register page type when publishable |
| `DefaultCard.vue` | crouton-core | Use `useDisplayConfig()` for smart rendering |
| `ItemCardMini.vue` | crouton-core | Use `useDisplayConfig()` for avatar + label |
| `types/app.ts` | crouton-core | Add `collection` to `CroutonPageType` |
| `Workspace/Editor.vue` | crouton-pages | Wire `FormReferenceSelect` when page type has collection |

### No changes needed
| File | Why |
|------|-----|
| `Renderer.vue` | Already delegates to component from page type |
| `usePageTypes.ts` | Already aggregates all types |
| `FormDynamicLoader` | Already tries `{Name}Detail` convention |
| `Collection.vue` | Already resolves custom card components |
| Collection database schemas | SEO/slug/status live on page, not collection |

---

## Key Design Decisions

1. **Progressive by design** — collections work standalone as a full admin panel (List + Form + Detail). Adding crouton-pages makes them publishable. Adding routing/sitemap makes them a site. Each layer is optional and additive. Collections never know about pages.

2. **No fields added to collection tables** — publishing metadata (slug, SEO, status) lives on the page record. Collections stay pure domain data.

3. **Generic fallback first, AI generation later** — `CroutonDetail` in crouton-core serves as the baseline for all collections, powered by display config and field metadata. AI-generated Detail.vue and Card.vue (via schema designer, deferred) will produce domain-aware components when ready. The CLI template generator is **not needed** — the generic fallback covers the baseline, and AI generation is the real goal for custom components. See [Schema Designer v2 plan](./schema-designer-v2.md) for the AI path.

4. **`display` config is declarative, not prescriptive** — it says "this field is the title" not "render this field as an h1 in blue". Components decide how to render.

5. **Reuse existing CRUD helpers** — the item picker in the page form uses `CroutonFormReferenceSelect` (already built), `useCrouton()` for nested forms (already built), and auto-selection after creation (already built). No new picker infrastructure needed.

6. **Page owns the URL, collection owns the data** — a bike exists independently of any page. Deleting a page doesn't delete the bike. Multiple pages can reference the same bike. If a referenced item is deleted, the page shows an "item unavailable" placeholder — no cascading deletes.

7. **Auto-inference for existing collections** — `useDisplayConfig()` infers title/image/badge from field names and types, so every existing collection gets display behavior on day one without schema changes. Explicit `display` config overrides the heuristics.

8. **V1 field rendering is simple** — Display components handle the common field types well (string, number, boolean, date, image, reference, options). Complex types (editor/prose, repeater, json) are deferred — the AI path may handle them earlier since it can reason about rendering.

9. **Ship full field metadata, optimize later** — The full `fields` array ships in the collection config. For even large collections (30+ fields), this is small JSON (<2KB). Optimization (lazy-loading or filtering to display-relevant fields) only if it becomes a real problem.