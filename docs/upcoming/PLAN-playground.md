# Nuxt Crouton Playground Implementation Plan

## Overview

Create a playground demo site showcasing nuxt-crouton's capabilities. This is a working demo with real CRUD operations, not documentation or Storybook - actual interactive examples that developers can explore.

**Location:** `apps/playground/`

**Live URL (proposed):** `https://playground.nuxt-crouton.dev/`

---

## Goals

1. **Showcase all packages** working together
2. **Demonstrate features** that aren't obvious from docs
3. **Provide copy-paste examples** for common patterns
4. **Highlight "wow moments"** - things that make developers go "oh, that's nice"
5. **Serve as integration test** - if playground works, packages work

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| UI | Nuxt UI v3 |
| Database | SQLite (via Drizzle) |
| Hosting | Cloudflare Pages / NuxtHub |
| Auth | Optional - demo mode without auth |

### Crouton Packages Used

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',           // Core
    '@friendlyinternet/nuxt-crouton-i18n',      // Translations
    '@friendlyinternet/nuxt-crouton-editor',    // Rich text
    '@friendlyinternet/nuxt-crouton-flow',      // Flow visualization
  ],
})
```

---

## Demo Collections

### Collection 1: `tags`

**Purpose:** Simplest possible CRUD - baseline demo

**Schema:** `schemas/tags.json`
```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true, "maxLength": 50 } },
  "slug": { "type": "string", "meta": { "maxLength": 50 } },
  "color": { "type": "string", "meta": { "maxLength": 7 } },
  "order": { "type": "number" }
}
```

**Config:**
```javascript
{
  name: 'tags',
  sortable: true  // Adds order field + reorder endpoint
}
```

**Features demonstrated:**
- [x] Basic create/update/delete
- [x] Table layout with sorting
- [x] Drag-to-reorder rows (sortable)
- [x] Bulk selection
- [x] Bulk delete
- [x] Form validation (Zod)
- [x] Keyboard shortcuts (if implemented)
- [x] Export to CSV/JSON (if implemented)

---

### Collection 2: `categories`

**Purpose:** Hierarchy + i18n demo

**Schema:** `schemas/categories.json`
```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "name": { "type": "string", "meta": { "required": true } },
  "description": { "type": "text" },
  "icon": { "type": "string", "meta": { "maxLength": 50 } },
  "color": { "type": "string", "meta": { "maxLength": 7 } }
}
```

**Config:**
```javascript
{
  name: 'categories',
  hierarchy: true,  // Adds parentId, path, depth, order
  translations: ['name', 'description']
}
```

**Features demonstrated:**
- [x] Tree layout with expand/collapse
- [x] Drag-drop hierarchy reordering
- [x] Move to different parent
- [x] Move to root
- [x] Auto-expand on drag hover
- [x] Circular reference prevention
- [x] i18n TranslationsInput
- [x] Language switcher
- [x] Locale-aware display

---

### Collection 3: `posts`

**Purpose:** Full-featured collection - "the kitchen sink"

**Schema:** `schemas/posts.json`
```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "title": { "type": "string", "meta": { "required": true, "maxLength": 200 } },
  "slug": { "type": "string", "meta": { "unique": true, "maxLength": 200 } },
  "excerpt": { "type": "text" },
  "content": { "type": "text" },
  "status": { "type": "string", "meta": { "maxLength": 20 } },
  "publishedAt": { "type": "date" },
  "featuredImage": { "type": "string" },
  "categoryId": { "type": "string", "refTarget": "categories" },
  "metadata": {
    "type": "repeater",
    "meta": {
      "repeaterComponent": "MetadataItem",
      "addLabel": "Add Metadata Field",
      "sortable": true
    }
  }
}
```

**Config:**
```javascript
{
  name: 'posts',
  translations: ['title', 'excerpt', 'content']
}
```

**Features demonstrated:**
- [x] Rich text editor (TipTap)
- [x] Reference select (category)
- [x] Inline creation from reference select
- [x] Repeater field with custom component
- [x] Drag-reorder repeater items
- [x] Multiple layout views (table, grid, cards, list)
- [x] Layout switching UI
- [x] Responsive layout presets
- [x] Server pagination
- [x] Search & filtering
- [x] Nested forms (edit post → create category)
- [x] 5-level deep nesting demo
- [x] Form with tabs
- [x] Validation error summary across tabs
- [x] Detail page with prose styling

---

### Collection 4: `decisions`

**Purpose:** Vue Flow integration demo

**Schema:** `schemas/decisions.json`
```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "title": { "type": "string", "meta": { "required": true } },
  "description": { "type": "text" },
  "type": { "type": "string", "meta": { "maxLength": 20 } },
  "status": { "type": "string", "meta": { "maxLength": 20 } },
  "position": { "type": "json" }
}
```

**Config:**
```javascript
{
  name: 'decisions',
  hierarchy: true  // For parent-child edges
}
```

**Features demonstrated:**
- [x] Flow canvas with Vue Flow
- [x] Dagre auto-layout
- [x] Drag nodes to reposition
- [x] Position persistence
- [x] Custom node component
- [x] Node click → open slideover
- [x] Node double-click → edit
- [x] Drag item from sidebar TO flow
- [x] Ghost node preview during drag
- [x] Auto-create node on drop
- [x] Edge connections from parentId
- [x] Controls (zoom, pan, fit)
- [x] Minimap
- [x] Dark mode support

---

### Collection 5: `options` (Flow Sidebar Items)

**Purpose:** Items to drag onto flow canvas

**Schema:** `schemas/options.json`
```json
{
  "id": { "type": "string", "meta": { "primaryKey": true } },
  "title": { "type": "string", "meta": { "required": true } },
  "description": { "type": "text" },
  "icon": { "type": "string" },
  "category": { "type": "string" }
}
```

**Features demonstrated:**
- [x] CroutonDraggableItem wrapper
- [x] Drag source for flow integration

---

## Page Structure

```
apps/playground/
├── app/
│   ├── pages/
│   │   ├── index.vue                    # Landing with feature cards
│   │   │
│   │   ├── basics/
│   │   │   └── index.vue                # Tags demo (simplest CRUD)
│   │   │
│   │   ├── hierarchy/
│   │   │   └── index.vue                # Categories tree + i18n
│   │   │
│   │   ├── content/
│   │   │   ├── index.vue                # Posts list with layouts
│   │   │   └── [id].vue                 # Post detail page
│   │   │
│   │   ├── flow/
│   │   │   └── index.vue                # Decision flow canvas
│   │   │
│   │   └── features/
│   │       ├── layouts.vue              # Layout switcher demo
│   │       ├── nested-forms.vue         # 5-level nesting demo
│   │       ├── drag-drop.vue            # Various drag interactions
│   │       ├── shortcuts.vue            # Keyboard shortcuts demo
│   │       └── export.vue               # Export functionality demo
│   │
│   ├── components/
│   │   ├── PlaygroundHeader.vue         # Site header with nav
│   │   ├── PlaygroundSidebar.vue        # Navigation sidebar
│   │   ├── FeatureCard.vue              # Feature showcase card
│   │   ├── CodePreview.vue              # Show code alongside demo
│   │   ├── DemoContainer.vue            # Wrapper with title/description
│   │   │
│   │   ├── MetadataItem.vue             # Repeater item for posts
│   │   ├── DecisionsNode.vue            # Custom flow node
│   │   └── OptionsCard.vue              # Draggable option card
│   │
│   └── layouts/
│       └── default.vue                  # Main layout with sidebar
│
├── layers/
│   └── playground/
│       └── collections/
│           ├── tags/
│           ├── categories/
│           ├── posts/
│           ├── decisions/
│           └── options/
│
├── schemas/
│   ├── tags.json
│   ├── categories.json
│   ├── posts.json
│   ├── decisions.json
│   └── options.json
│
├── crouton.config.js
├── nuxt.config.ts
└── package.json
```

---

## Page Specifications

### Landing Page (`index.vue`)

**Purpose:** Overview of what crouton does, links to demos

**Sections:**
1. Hero with tagline
2. Feature grid (cards linking to demos)
3. Package overview
4. Quick start code snippet
5. Links to docs

**Feature Cards:**
| Feature | Demo Link | Icon |
|---------|-----------|------|
| Basic CRUD | /basics | `i-lucide-database` |
| Tree & Hierarchy | /hierarchy | `i-lucide-git-branch` |
| Rich Content | /content | `i-lucide-file-text` |
| Flow Builder | /flow | `i-lucide-workflow` |
| Layout Modes | /features/layouts | `i-lucide-layout-grid` |
| Nested Forms | /features/nested-forms | `i-lucide-layers` |
| Keyboard Shortcuts | /features/shortcuts | `i-lucide-keyboard` |
| Data Export | /features/export | `i-lucide-download` |

---

### Basics Page (`/basics`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Tags                                    [+ New] │
├─────────────────────────────────────────────────┤
│ [Search...]           [Export ▼] [Delete (3)]   │
├─────────────────────────────────────────────────┤
│ ☰ □ Name          Color    Actions              │
│ ☰ □ JavaScript    #f7df1e  [Edit] [Delete]      │
│ ☰ □ TypeScript    #3178c6  [Edit] [Delete]      │
│ ☰ □ Vue           #42b883  [Edit] [Delete]      │
│ ☰ □ Nuxt          #00dc82  [Edit] [Delete]      │
└─────────────────────────────────────────────────┘
  Drag ☰ to reorder │ ⌘N New │ ⌘K Search │ ⌘⌫ Delete
```

**Interactions:**
- Sortable table rows
- Bulk select + delete
- Keyboard shortcut hints shown at bottom
- Export dropdown (CSV, JSON)

---

### Hierarchy Page (`/hierarchy`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Categories                     [EN ▼] [+ New]   │
├─────────────────────────────────────────────────┤
│ ▼ Technology (3)                                │
│   ├─ Frontend                                   │
│   │  ├─ React                                   │
│   │  └─ Vue                                     │
│   └─ Backend                                    │
│      └─ Node.js                                 │
│ ▼ Design (2)                                    │
│   ├─ UI/UX                                      │
│   └─ Branding                                   │
└─────────────────────────────────────────────────┘
  Drag items to reorder or change parent
```

**Interactions:**
- Tree layout with expand/collapse
- Drag to reorder within level
- Drag to different parent
- Language switcher (EN/NL/FR)
- Auto-expand collapsed nodes on drag hover

---

### Content Page (`/content`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Posts                                           │
├─────────────────────────────────────────────────┤
│ [Search...]  Status: [All ▼]  [Table|Grid|List] │
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│ │ Post 1  │ │ Post 2  │ │ Post 3  │   (Grid)   │
│ │ Draft   │ │ Published│ │ Draft   │             │
│ └─────────┘ └─────────┘ └─────────┘             │
├─────────────────────────────────────────────────┤
│ Page 1 of 5                    [<] [1] [2] [>]  │
└─────────────────────────────────────────────────┘
```

**Interactions:**
- Toggle between table/grid/cards/list layouts
- Server-side pagination
- Filter by status
- Search posts
- Click card → detail page

---

### Content Detail Page (`/content/[id]`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Back to Posts                         [Edit]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Getting Started with Nuxt Crouton              │
│  ─────────────────────────────────────────────  │
│  Category: Technology > Frontend                │
│  Published: Dec 15, 2024                        │
│                                                 │
│  <Article content rendered as prose...>         │
│                                                 │
│  Metadata:                                      │
│  • reading_time: 5 min                          │
│  • difficulty: beginner                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Components used:**
- `CroutonContentArticle` or `CroutonDetailLayout`
- Prose styling for content
- Metadata display

---

### Flow Page (`/flow`)

**Layout:**
```
┌──────────┬──────────────────────────────────────┐
│ Options  │                                      │
├──────────┤                                      │
│ ┌──────┐ │      ┌─────────┐                     │
│ │ Yes  │ │      │ Start   │                     │
│ └──────┘ │      └────┬────┘                     │
│ ┌──────┐ │           │                          │
│ │ No   │ │      ┌────▼────┐                     │
│ └──────┘ │      │ Decision│                     │
│ ┌──────┐ │      └────┬────┘                     │
│ │ Maybe│ │      ┌────┴────┐                     │
│ └──────┘ │  ┌───▼───┐ ┌───▼───┐                 │
│          │  │ Path A│ │ Path B│                 │
│ Drag to  │  └───────┘ └───────┘                 │
│ canvas → │                                      │
│          │  [Zoom] [Fit] [━━━━━━━ Minimap]      │
└──────────┴──────────────────────────────────────┘
```

**Interactions:**
- Drag items from sidebar onto canvas
- Ghost node appears during drag
- Node auto-created on drop
- Click node → slideover with details
- Double-click → edit mode
- Drag nodes to reposition
- Edges auto-generated from parentId

---

### Layouts Feature Page (`/features/layouts`)

**Purpose:** Interactive demo of all layout modes

**Content:**
- Same data shown in table, list, grid, cards
- Toggle buttons to switch
- Responsive preset selector
- Side-by-side comparison view

---

### Nested Forms Feature Page (`/features/nested-forms`)

**Purpose:** Demonstrate 5-level deep nesting

**Scenario:**
1. Edit a Post (Level 1)
2. Click "+" on category → Create Category (Level 2)
3. Click "Add Parent" → Create Parent Category (Level 3)
4. In parent, click "+" on icon → Browse Icons (Level 4)
5. Create custom icon → Icon Editor (Level 5)

**UI:** Show breadcrumb trail + slideover stack visualization

---

### Shortcuts Feature Page (`/features/shortcuts`)

**Purpose:** Interactive keyboard shortcut demo

**Content:**
- List of all shortcuts with descriptions
- Live detection of pressed keys
- Try-it section where shortcuts work
- Platform-aware display (⌘ vs Ctrl)

---

### Export Feature Page (`/features/export`)

**Purpose:** Demonstrate export capabilities

**Content:**
- Export current view (CSV, JSON)
- Export with filters applied
- Custom field selection
- Transform examples (flatten references)
- Preview exported data

---

## Custom Components to Build

### `MetadataItem.vue` (Repeater Item)

```vue
<script setup lang="ts">
interface Props {
  modelValue: { id: string; key: string; value: string } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
}>()

const localValue = computed({
  get: () => props.modelValue || { id: nanoid(), key: '', value: '' },
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="flex gap-2">
    <UFormField label="Key" class="flex-1">
      <UInput v-model="localValue.key" placeholder="e.g., reading_time" />
    </UFormField>
    <UFormField label="Value" class="flex-1">
      <UInput v-model="localValue.value" placeholder="e.g., 5 min" />
    </UFormField>
  </div>
</template>
```

---

### `DecisionsNode.vue` (Flow Node)

```vue
<script setup lang="ts">
interface Props {
  data: {
    id: string
    title: string
    description?: string
    type?: string
    status?: string
  }
  selected?: boolean
  dragging?: boolean
}

defineProps<Props>()

const statusColors = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
}
</script>

<template>
  <div
    class="decision-node p-3 bg-white dark:bg-neutral-800 rounded-lg border-2 min-w-[150px]"
    :class="{
      'border-primary-500 shadow-lg': selected,
      'border-neutral-200 dark:border-neutral-700': !selected,
      'opacity-50': dragging,
    }"
  >
    <div class="flex items-center gap-2 mb-1">
      <UIcon :name="data.type === 'start' ? 'i-lucide-play' : 'i-lucide-git-branch'" />
      <span class="font-medium truncate">{{ data.title }}</span>
    </div>
    <p v-if="data.description" class="text-sm text-muted truncate">
      {{ data.description }}
    </p>
    <UBadge v-if="data.status" :color="statusColors[data.status]" size="xs" class="mt-2">
      {{ data.status }}
    </UBadge>
  </div>
</template>
```

---

### `CodePreview.vue` (Show Code + Demo)

```vue
<script setup lang="ts">
interface Props {
  code: string
  language?: string
  title?: string
}

defineProps<Props>()

const showCode = ref(false)
</script>

<template>
  <div class="demo-container border rounded-lg overflow-hidden">
    <div class="flex justify-between items-center p-3 bg-muted/30 border-b">
      <span class="font-medium">{{ title || 'Demo' }}</span>
      <UButton
        variant="ghost"
        size="xs"
        @click="showCode = !showCode"
      >
        {{ showCode ? 'Hide Code' : 'Show Code' }}
      </UButton>
    </div>
    
    <!-- Demo content -->
    <div class="p-4">
      <slot />
    </div>
    
    <!-- Code preview -->
    <Transition>
      <div v-if="showCode" class="border-t">
        <pre class="p-4 text-sm overflow-auto bg-neutral-900 text-neutral-100"><code>{{ code }}</code></pre>
      </div>
    </Transition>
  </div>
</template>
```

---

## crouton.config.js

```javascript
export default {
  dialect: 'sqlite',
  
  collections: [
    { name: 'tags', fieldsFile: './schemas/tags.json', sortable: true },
    { name: 'categories', fieldsFile: './schemas/categories.json', hierarchy: true },
    { name: 'posts', fieldsFile: './schemas/posts.json' },
    { name: 'decisions', fieldsFile: './schemas/decisions.json', hierarchy: true },
    { name: 'options', fieldsFile: './schemas/options.json' },
  ],
  
  targets: [
    {
      layer: 'playground',
      collections: ['tags', 'categories', 'posts', 'decisions', 'options']
    }
  ],
  
  translations: {
    collections: {
      categories: ['name', 'description'],
      posts: ['title', 'excerpt', 'content']
    }
  },
  
  flags: {
    useMetadata: true,
    force: false
  }
}
```

---

## app.config.ts

```typescript
export default defineAppConfig({
  croutonCollections: {
    playgroundTags: {
      layer: 'playground',
      apiPath: 'playground-tags',
    },
    playgroundCategories: {
      layer: 'playground',
      apiPath: 'playground-categories',
      references: { parentId: 'playgroundCategories' },
    },
    playgroundPosts: {
      layer: 'playground',
      apiPath: 'playground-posts',
      references: { categoryId: 'playgroundCategories' },
    },
    playgroundDecisions: {
      layer: 'playground',
      apiPath: 'playground-decisions',
      references: { parentId: 'playgroundDecisions' },
    },
    playgroundOptions: {
      layer: 'playground',
      apiPath: 'playground-options',
    },
  },
})
```

---

## Seed Data

Create `server/seed.ts` or `scripts/seed.ts` with sample data:

```typescript
// Sample tags
const tags = [
  { name: 'JavaScript', slug: 'javascript', color: '#f7df1e' },
  { name: 'TypeScript', slug: 'typescript', color: '#3178c6' },
  { name: 'Vue', slug: 'vue', color: '#42b883' },
  { name: 'Nuxt', slug: 'nuxt', color: '#00dc82' },
  { name: 'React', slug: 'react', color: '#61dafb' },
]

// Sample categories (with hierarchy)
const categories = [
  { id: 'tech', name: 'Technology', parentId: null },
  { id: 'tech-frontend', name: 'Frontend', parentId: 'tech' },
  { id: 'tech-backend', name: 'Backend', parentId: 'tech' },
  { id: 'design', name: 'Design', parentId: null },
  { id: 'design-ui', name: 'UI/UX', parentId: 'design' },
]

// Sample posts
const posts = [
  {
    title: 'Getting Started with Nuxt Crouton',
    slug: 'getting-started',
    excerpt: 'Learn how to build CRUD interfaces in 30 seconds.',
    content: '<p>Welcome to Nuxt Crouton...</p>',
    status: 'published',
    categoryId: 'tech-frontend',
  },
  // ... more posts
]

// Sample flow decisions
const decisions = [
  { id: 'start', title: 'Start', type: 'start', parentId: null, position: { x: 250, y: 0 } },
  { id: 'q1', title: 'Need CRUD?', type: 'decision', parentId: 'start', position: { x: 250, y: 100 } },
  { id: 'yes', title: 'Use Crouton', type: 'action', parentId: 'q1', position: { x: 100, y: 200 } },
  { id: 'no', title: 'Build Custom', type: 'action', parentId: 'q1', position: { x: 400, y: 200 } },
]
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)

- [ ] Create `apps/playground/` directory structure
- [ ] Set up `nuxt.config.ts` with all layers
- [ ] Create `crouton.config.js`
- [ ] Generate all collections
- [ ] Create basic layout with sidebar navigation
- [ ] Implement landing page

### Phase 2: Basic Demos (Day 2)

- [ ] Tags page (basic CRUD + sortable)
- [ ] Categories page (tree + i18n)
- [ ] Test all CRUD operations work

### Phase 3: Advanced Demos (Day 3)

- [ ] Posts page with layout switching
- [ ] Post detail page
- [ ] Rich text editor integration
- [ ] Repeater field with MetadataItem

### Phase 4: Flow Demo (Day 4)

- [ ] Flow page with canvas
- [ ] Options sidebar with draggable items
- [ ] DecisionsNode custom component
- [ ] Drag-to-flow integration

### Phase 5: Feature Pages (Day 5)

- [ ] Layouts feature page
- [ ] Nested forms demo
- [ ] Keyboard shortcuts demo (if implemented)
- [ ] Export demo (if implemented)

### Phase 6: Polish (Day 6)

- [ ] Seed data
- [ ] Code preview components
- [ ] Mobile responsiveness
- [ ] Dark mode testing
- [ ] Performance optimization

### Phase 7: Deployment (Day 7)

- [ ] Configure NuxtHub / Cloudflare Pages
- [ ] Set up domain
- [ ] CI/CD pipeline
- [ ] Link from main docs

---

## Success Metrics

1. **All CRUD operations work** - Create, Read, Update, Delete for each collection
2. **All layouts render** - Table, List, Grid, Cards, Tree
3. **Drag-drop works** - Reordering, hierarchy changes, flow drops
4. **i18n works** - Language switching, translated content
5. **Nested forms work** - At least 3-level deep nesting demonstrated
6. **Flow works** - Drag from sidebar, position persistence
7. **Mobile works** - Responsive layouts, touch-friendly
8. **No console errors** - Clean browser console

---

## Open Questions

1. **Auth:** Do we want demo auth or fully open? 
   - Recommendation: Open with fake teamId for simplicity

2. **Data persistence:** Reset on deploy or persist?
   - Recommendation: Seed on deploy, users can modify but expect resets

3. **Multiplayer flow demo:** Worth the Durable Objects setup?
   - Recommendation: Phase 2, show static flow first

4. **Code examples:** Inline or separate repo/gist links?
   - Recommendation: Inline with CodePreview component

---

## Estimated Total Effort

| Phase | Effort |
|-------|--------|
| Foundation | 4-6 hours |
| Basic Demos | 4-6 hours |
| Advanced Demos | 6-8 hours |
| Flow Demo | 4-6 hours |
| Feature Pages | 4-6 hours |
| Polish | 4-6 hours |
| Deployment | 2-4 hours |

**Total: ~28-42 hours (4-6 days)**
