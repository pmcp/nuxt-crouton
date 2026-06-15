# Atelier Builder — Build Plan

## Overview

Build a visual app builder ("Atelier") as a standalone package + app. Users compose apps from pre-defined blocks instead of chatting with AI. The designer package is throwaway — Atelier replaces it as the primary app creation tool, taking the best patterns from it.

**Key decisions (2026-02-23):**
- Collaborative in real-time via Yjs (not just durable)
- Per-project rooms (multiple designs coexist per team)
- Kanban-style drag between visibility tabs
- Own scaffold/generate implementation (inspired by designer, not imported)
- Block data hardcoded Phase A, migrate to manifest later
- iPhone-first, responsive up
- FAB + bottom sheet for mobile block palette

## Architecture Decision

**Standalone package** (`crouton-atelier`) extending `@fyit/crouton` + `@fyit/crouton-collab` directly. The designer is throwaway — take its best patterns (scaffold orchestration, artifact preview, step progress) but reimplement in Atelier.

**Dependencies:**
- `@fyit/crouton` — core layer, components, composables
- `@fyit/crouton-collab` — Yjs sync, presence, WebSocket infrastructure

## What to Create

### Package: `packages/crouton-atelier/`

```
packages/crouton-atelier/
├── package.json                    # @fyit/crouton-atelier
├── nuxt.config.ts                  # Extends @fyit/crouton + crouton-collab
├── CLAUDE.md
├── app/
│   ├── app.config.ts               # croutonApps registration
│   ├── types/
│   │   └── blocks.ts               # Block, Template, AtelierProject, AppComposition
│   ├── data/
│   │   ├── blocks.ts               # Static block declarations (Phase A)
│   │   └── templates.ts            # Pre-configured block sets
│   ├── composables/
│   │   ├── useBlockRegistry.ts     # Block lookup + filtering
│   │   ├── useAppComposition.ts    # Reactive composition state (backed by Yjs Y.Map)
│   │   ├── useAtelierSync.ts       # Yjs room management (wraps useCollabSync)
│   │   └── useAtelierScaffold.ts   # Generate flow (inspired by designer's useAppScaffold)
│   ├── components/
│   │   ├── TemplateSelector.vue    # Template grid (full-page first step)
│   │   ├── BlockPalette.vue        # Bottom sheet (mobile) / sidebar (desktop)
│   │   ├── BlockCanvas.vue         # Kanban: visibility columns with drag between
│   │   ├── BlockCard.vue           # Single block card (draggable, clickable)
│   │   ├── BlockDetail.vue         # Bottom sheet (mobile) / slideover (desktop)
│   │   ├── PackageList.vue         # Enabled packages (inline on mobile, sidebar desktop)
│   │   ├── IdentityForm.vue        # App name, description, icon
│   │   ├── GeneratePanel.vue       # Review + create app (inspired by designer ReviewPanel)
│   │   ├── PresenceIndicator.vue   # Show collaborators in the room
│   │   └── Fab.vue                 # Floating action button for mobile "add block"
│   └── pages/
│       └── admin/[team]/atelier/
│           ├── index.vue           # Project list
│           └── [id].vue            # Builder page
├── server/
│   ├── api/
│   │   └── atelier/
│   │       └── scaffold-app.post.ts  # Generate endpoint (inspired by designer)
│   └── database/
│       └── schema.ts               # AtelierProject table (name, teamId, etc.)
```

### App: `apps/atelier/`

```
apps/atelier/
├── nuxt.config.ts                  # Extends crouton + crouton-collab + crouton-atelier
├── package.json
├── app.vue
└── app/pages/index.vue
```

## Types

```typescript
// app/types/blocks.ts

interface Block {
  id: string                                    // e.g. "schedule"
  label: string                                 // e.g. "Class schedule"
  description: string                           // e.g. "Sessions people can book"
  icon: string                                  // Iconify format: "i-lucide-calendar"
  package: string                               // Which crouton package provides this
  visibility: 'public' | 'auth' | 'admin'      // Default visibility level
  collections: BlockCollection[]                // Schemas this block needs
  category: 'content' | 'data' | 'interaction' | 'member' | 'admin'
}

interface BlockCollection {
  name: string                                  // e.g. "bookings"
  fields: BlockField[]                          // Field definitions
  seedCount?: number                            // Default seed data count
}

interface BlockField {
  name: string
  type: string                                  // Crouton field type
  meta?: Record<string, any>
}

interface Template {
  id: string                                    // e.g. "yoga-studio"
  label: string                                 // e.g. "Yoga Studio"
  description: string
  icon: string                                  // Iconify format
  blocks: string[]                              // Block IDs
  identity: { name: string; description: string }
}

interface AtelierProject {
  id: string
  teamId: string
  name: string
  composition: AppComposition
  createdAt: number
  updatedAt: number
}

interface AppComposition {
  identity: { name: string; description: string; icon: string }
  selectedBlocks: SelectedBlock[]               // Blocks with their assigned visibility
  enabledPackages: string[]                     // Computed from selectedBlocks
}

interface SelectedBlock {
  blockId: string                               // References Block.id
  visibility: 'public' | 'auth' | 'admin'      // Can differ from block default
  order: number                                 // Position within visibility group
}
```

## Collaboration Architecture

### Yjs Integration

Each Atelier project gets a Yjs room via `crouton-collab`:

```typescript
// useAtelierSync.ts — wraps useCollabSync from crouton-collab
const { ymap, data, connected } = useCollabSync({
  roomId: `atelier:${projectId}`,
  roomType: 'atelier',
  structure: 'map',
  teamId
})

// Y.Map structure:
// {
//   identity: { name, description, icon },
//   blocks: [{ blockId, visibility, order }, ...],
// }
```

### Presence

```typescript
// useCollabPresence from crouton-collab
// Show which collaborators are in the room, what they're hovering/dragging
const { users, sendAwareness } = useCollabPresence({
  roomId: `atelier:${projectId}`,
  teamId
})
```

### Persistence Flow

```
Client (Y.Doc with AppComposition as Y.Map)
    ↓ binary updates via WebSocket
CollabRoom (Durable Object in prod / Nitro handler in dev)
    ↓ debounced persist
D1 yjs_collab_states table
```

Additionally, `AtelierProject` metadata (name, teamId) stored in a regular DB table — Yjs handles the composition state only.

## Block Data (Starting Set)

### From `crouton-bookings`
| Block ID | Label | Icon | Visibility | Collections | Category |
|----------|-------|------|-----------|-------------|----------|
| `schedule` | Class schedule | `i-lucide-calendar` | public | bookings, locations | interaction |
| `book-now` | Book now | `i-lucide-ticket` | public | — (reuses schedule) | interaction |
| `my-bookings` | My bookings | `i-lucide-bookmark` | auth | — (reuses schedule) | member |
| `manage-bookings` | Manage bookings | `i-lucide-clipboard-list` | admin | — | admin |
| `manage-locations` | Manage locations | `i-lucide-map-pin` | admin | locations | admin |

### From `crouton-pages`
| Block ID | Label | Icon | Visibility | Collections | Category |
|----------|-------|------|-----------|-------------|----------|
| `hero` | Hero section | `i-lucide-image` | public | — (pure content) | content |
| `text-page` | Text page | `i-lucide-file-text` | public | pages | content |
| `blog` | Blog | `i-lucide-pen-line` | public | articles | content |

### From `crouton-auth`
| Block ID | Label | Icon | Visibility | Collections | Category |
|----------|-------|------|-----------|-------------|----------|
| `signup` | Sign up | `i-lucide-user-plus` | public | — | member |
| `manage-contacts` | Manage contacts | `i-lucide-users` | admin | contacts | admin |

**Phase B:** Migrate block declarations to `CroutonManifest` (`blocks?: ManifestBlock[]`), discovered automatically via `manifest-loader.ts`.

## Templates

Located in `crouton-atelier/app/data/templates.ts`.

### Yoga Studio
- **Public**: hero, schedule, signup
- **Auth**: my-bookings
- **Admin**: manage-bookings, manage-locations, manage-contacts

### Sports Club
- **Public**: hero, schedule
- **Auth**: my-bookings
- **Admin**: manage-bookings, manage-contacts

### Charity
- **Public**: hero, text-page
- **Admin**: manage-contacts

### Blank
- Empty canvas

## Composables

### `useBlockRegistry()`
```typescript
// Read-only block lookup + filtering. Static data in Phase A.
const { blocks, getBlock, byCategory, byPackage, byVisibility } = useBlockRegistry()
```

### `useAppComposition()`
```typescript
// Reactive composition state backed by Yjs Y.Map.
// All mutations sync to collaborators in real-time.
const {
  composition,          // Ref<AppComposition> — auto-synced from Y.Map
  addBlock,             // (blockId: string) => void
  removeBlock,          // (blockId: string) => void
  moveBlock,            // (blockId: string, newVisibility: Visibility, newOrder: number) => void
  reorderBlocks,        // (visibility: Visibility, blockIds: string[]) => void
  selectTemplate,       // (templateId: string) => void
  updateIdentity,       // (identity: Partial<Identity>) => void
  reset,                // () => void
  enabledPackages,      // ComputedRef<string[]>
  blocksByVisibility,   // ComputedRef<Record<Visibility, SelectedBlock[]>>
} = useAppComposition(projectId)
```

### `useAtelierSync()`
```typescript
// Wraps crouton-collab's useCollabSync for Atelier-specific rooms.
const { ymap, connected, users } = useAtelierSync(projectId, teamId)
```

### `useAtelierScaffold()`
```typescript
// Generate flow — inspired by designer's useAppScaffold.
// Builds ScaffoldRequest from composition, calls scaffold endpoint, tracks progress.
const {
  appName,
  folderName,
  canGenerate,          // ComputedRef<boolean> — has identity + blocks
  artifacts,            // ComputedRef<ArtifactGroup[]> — preview of generated files
  status,               // Ref<'idle' | 'generating' | 'done' | 'error'>
  steps,                // Ref<StepResult[]> — real-time step progress
  result,               // Ref<ScaffoldResult | null>
  error,                // Ref<string | null>
  generate,             // () => Promise<void>
} = useAtelierScaffold(composition)
```

## Component Specs

### TemplateSelector
- Full-page first step (before entering builder)
- Responsive card grid: 1 col on iPhone, 2 on tablet, 3+ on desktop
- Each card: icon, label, description, block count badge (UBadge)
- Click populates composition via `selectTemplate()`
- "Blank" option included — starts with empty canvas
- Smooth transition into builder view

### BlockPalette
- **iPhone**: Bottom sheet triggered by FAB (floating "+" button)
- **Desktop**: Left sidebar panel
- Grouped by category with headers
- Each block: icon + label + package badge
- Already-selected blocks are dimmed/disabled
- Tap/click calls `addBlock()` and shows brief toast confirmation
- Sheet auto-dismisses on iPhone after adding (or stays open with "keep adding" toggle)

### BlockCanvas
- **Kanban layout** — three columns for Public / Members / Admin
- **iPhone**: Horizontal swipe between visibility groups (or stacked with headers)
- **Desktop**: Side-by-side columns
- Drag blocks between columns to change visibility (uses existing `KanbanColumn` + sortablejs)
- Drag within column to reorder
- Remove button per card (swipe-to-delete on mobile?)
- Empty state per column: friendly prompt ("Add public-facing blocks here")
- Shows `PresenceIndicator` for collaborators

### BlockCard
- Compact card: icon + label + package badge (UBadge)
- Hover (desktop): subtle lift/shadow
- Tap/click: opens BlockDetail
- Draggable handle visible on desktop, long-press to drag on mobile
- Presence highlight when another user is interacting with this block

### BlockDetail
- **iPhone**: Bottom sheet (full-height draggable)
- **Desktop**: `CroutonFormExpandableSlideOver` (maximizable)
- Header: block icon + label + description
- Body: for each collection the block provides:
  - Collection name as heading
  - Field list (name, type, meta) — read-only for Phase A
  - Seed data count toggle
- Footer: close button

### PackageList
- **iPhone**: Collapsible section within canvas view
- **Desktop**: Right sidebar panel
- Each: package icon + name + count of blocks that activated it
- Auto-updates reactively as blocks are added/removed
- Derived from `enabledPackages` computed

### IdentityForm
- UInput for app name
- UTextarea for description
- Icon picker (optional)
- **iPhone**: Collapsible card at top of canvas
- **Desktop**: Inline header above canvas
- Changes sync in real-time via Yjs

### GeneratePanel
- Triggered by "Generate" button (bottom bar on mobile, top-right on desktop)
- **Inspired by designer's ReviewPanel** — reimplemented in Atelier:
  - Summary card (app name, block count, packages)
  - Validation checklist (has identity? has blocks? no conflicts?)
  - Artifact preview grouped by category (config, app, server, schema)
  - Folder name input with conflict detection (409 handling)
  - "Create App" button
  - Step-by-step progress display during generation
  - Success state with copy-to-clipboard dev/deploy commands

### PresenceIndicator
- Avatar stack of collaborators in the current room
- Shows who's online via `useCollabPresence()`
- Subtle: doesn't dominate the UI

### Fab
- Floating action button ("+" icon)
- iPhone only (hidden on desktop where sidebar is visible)
- Fixed bottom-right position
- Opens BlockPalette bottom sheet on tap

## Page Flow

### iPhone (Primary)

```
1. Project List (/admin/[team]/atelier/)
   ↓ tap "New" or existing project

2. TemplateSelector (full page, card grid)
   ↓ tap template (or blank)

3. Builder View:
   ┌─────────────────────────┐
   │  IdentityForm (collapsible) │
   ├─────────────────────────┤
   │                         │
   │  BlockCanvas             │
   │  ┌───────────────────┐  │
   │  │ Public (swipe →)  │  │
   │  │ ┌───────────────┐ │  │
   │  │ │ BlockCard     │ │  │
   │  │ │ BlockCard     │ │  │
   │  │ └───────────────┘ │  │
   │  └───────────────────┘  │
   │                         │
   │  PackageList (collapsed)│
   │                         │
   ├─────────────────────────┤
   │  [Presence] [Generate]  │
   │                    [+]  │  ← FAB
   └─────────────────────────┘

   Tap [+] → BlockPalette bottom sheet
   Tap BlockCard → BlockDetail bottom sheet
   Tap [Generate] → GeneratePanel
```

### Desktop (Responsive)

```
1. Project List (/admin/[team]/atelier/)
   ↓ click "New" or existing project

2. TemplateSelector (full page, wider grid)
   ↓ click template (or blank)

3. Builder View:
   ┌──────────────┬───────────────────────────┬──────────────┐
   │              │                           │              │
   │  Block       │   IdentityForm            │  Package     │
   │  Palette     │   ─────────────           │  List        │
   │              │   BlockCanvas (kanban)     │              │
   │  grouped by  │   ┌────┬────┬────┐        │  auto-       │
   │  category    │   │Pub │Auth│Adm │        │  derived     │
   │              │   │    │    │    │        │              │
   │  click to    │   │    │    │    │        │  [Presence]  │
   │  add         │   └────┴────┴────┘        │              │
   │              │                           │              │
   │              │   [Generate App]          │              │
   └──────────────┴───────────────────────────┴──────────────┘

   Click any BlockCard → BlockDetail slideover opens
```

## Reusable Crouton Assets

### Components (use directly)
| Component | From | Use in Atelier |
|-----------|------|----------------|
| `CroutonFormExpandableSlideOver` | crouton-core | BlockDetail on desktop |
| `CroutonKanbanColumn` + `useKanban()` | crouton-core | BlockCanvas drag between visibility |
| `CroutonDraggableList` / `CroutonDraggableItem` | crouton-core | Block reordering within columns |
| `CroutonDefaultCard` | crouton-core | BlockCard rendering |
| `CroutonLoading` | crouton-core | Skeleton states |
| `CroutonValidationErrorSummary` | crouton-core | GeneratePanel validation |

### Composables (use directly)
| Composable | From | Use in Atelier |
|-----------|------|----------------|
| `useCrouton()` | crouton-core | Modal/slideover state (nested up to 5 levels) |
| `useCroutonApps()` | crouton-core | Detect installed packages |
| `useCroutonShortcuts()` | crouton-core | Keyboard shortcuts |
| `useCollabSync()` | crouton-collab | Yjs Y.Map for composition state |
| `useCollabPresence()` | crouton-collab | Collaborator presence |
| `useDisplayConfig()` | crouton-core | Smart field rendering in BlockDetail |

### Patterns (follow these)
| Pattern | From | Apply to |
|---------|------|----------|
| Kanban drag-drop | `KanbanColumn.vue` + sortablejs | BlockCanvas visibility columns |
| Local state isolation | `BlockPropertyPanel.vue` (crouton-pages) | BlockDetail edits |
| Block registry | `block-registry.ts` (crouton-pages) | useBlockRegistry pattern |
| Auto-save debounce | Designer `[id].vue` | Project metadata persistence |
| Step progress display | Designer `ReviewPanel.vue` | GeneratePanel scaffold steps |
| Artifact preview | Designer `ReviewPanel.vue` | GeneratePanel file preview |
| Folder conflict handling | Designer `useAppScaffold.ts` | GeneratePanel 409 handling |

### Libraries (already in crouton-core)
| Library | Version | Used for |
|---------|---------|----------|
| `sortablejs` | ^1.15.6 | Kanban drag-drop |
| `yjs` | ^13.6.0 | CRDT state sync (via crouton-collab) |
| `y-protocols` | ^1.0.0 | Yjs wire protocol (via crouton-collab) |

## Scaffold / Generate Flow

Atelier builds the same payload that the designer sends to `POST /api/scaffold-app`:

```typescript
// useAtelierScaffold builds this from composition state:
{
  appName: composition.identity.name,
  config: {
    name: composition.identity.name,
    packages: enabledPackages.value   // derived from selected blocks
  },
  schemas: { /* from block collection definitions */ },
  seedData: { /* from block seed config */ },
  packageCollections: [ /* from block package mappings */ ],
}
```

The scaffold endpoint **reuses** the designer's `scaffold-app.post.ts` pattern — importing from `crouton-cli` via jiti. No reimplementation; Atelier calls the same CLI functions (`scaffoldApp`, subprocess for `pnpm crouton config`). The endpoint lives in `crouton-atelier` but delegates entirely to CLI. Steps:
1. Scaffold app via `crouton-cli` (`scaffoldApp()` imported via jiti)
2. Write schemas
3. Write seed data
4. Generate `crouton.config.js`
5. `pnpm install`
6. `crouton config` (generate collections)
7. Doctor validation

## Design Guidelines

- **iPhone-first** — design for 375px, scale up
- **Nuxt UI 4 only** — UCard, UButton, UBadge, UModal, USlideover, UTabs, etc.
- **Use Crouton components** — CroutonKanbanColumn, CroutonFormExpandableSlideOver, CroutonDefaultCard, etc.
- **Make it fun** — transitions, hover effects, micro-interactions. Blocks should feel like building with tangible pieces. Satisfying tap-to-add, smooth drag-reorder, playful template selection.
- **Bottom sheets on mobile** — not modals. Native-feeling pull-up sheets.
- **Composition API** — `<script setup lang="ts">` exclusively
- **No Pinia** — `useState()` for local state, Yjs Y.Map for shared composition state
- **No AI** — Phase A is purely visual
- **Static block data** — hardcoded in `app/data/`, migrate to manifest in Phase B
- **Collaborative** — real-time sync via Yjs, presence indicators

## Reference Files

| File | Why |
|------|-----|
| `docs/strategy/atelier-builder-plan.md` | Full strategic plan |
| `packages/crouton-bookings/app/app.config.ts` | Package registration pattern |
| `packages/crouton-bookings/crouton.manifest.ts` | Manifest structure (for Phase B block migration) |
| `packages/crouton-core/shared/manifest.ts` | Manifest type definitions |
| `packages/crouton-core/app/components/Kanban.vue` | Kanban drag-drop pattern |
| `packages/crouton-core/app/components/KanbanColumn.vue` | Column drag implementation |
| `packages/crouton-core/app/composables/useKanban.ts` | Kanban state composable |
| `packages/crouton-core/app/components/FormExpandableSlideOver.vue` | Maximizable slideover |
| `packages/crouton-collab/app/composables/useCollabSync.ts` | Yjs sync composable |
| `packages/crouton-collab/app/composables/useCollabPresence.ts` | Presence tracking |
| `packages/crouton-collab/app/types/collab.ts` | Collab type definitions |
| `packages/crouton-designer/app/composables/useAppScaffold.ts` | Scaffold pattern (inspiration) |
| `packages/crouton-designer/app/components/ReviewPanel.vue` | Review + generate UI (inspiration) |
| `packages/crouton-designer/server/api/scaffold-app.post.ts` | Scaffold endpoint (inspiration) |
| `packages/crouton-designer/app/composables/useFieldTypes.ts` | Field type metadata (copy what's needed) |
| `packages/crouton-pages/app/utils/block-registry.ts` | Block registry pattern |
| `packages/crouton-pages/app/composables/usePageBlocks.ts` | Block composable pattern |
| `packages/crouton-core/CLAUDE.md` | Core package documentation |

## Done When

- [x] `packages/crouton-atelier/` exists with types, data, composables, components
- [ ] `apps/atelier/` runs and renders the builder
- [x] Project CRUD (create, list, open, delete)
- [x] Pick template → canvas populates with blocks
- [x] Kanban drag between visibility tabs works
- [x] Click/tap block card → detail sheet/slideover shows collection info
- [x] Package list auto-updates from selected blocks
- [x] Yjs collaboration works (open in two browsers, see real-time sync)
- [x] Presence indicators show collaborators
- [x] Generate button → scaffold endpoint → app created
- [x] iPhone layout works (FAB, bottom sheets, responsive canvas)
- [x] `packages/crouton-atelier/CLAUDE.md` written
- [ ] `npx nuxt typecheck` passes
- [ ] Project deletion cleans up Yjs room (collab state purge)
- [ ] Template re-apply: reset composition + apply new template

## Future Phases

- **Phase B**: Migrate blocks to `CroutonManifest` (auto-discovery from packages)
- **Phase C**: Block customization (field editing, seed data tweaking in builder)
- **Phase D**: AI assistant (chat sidebar like designer, but for block suggestions)
- **Phase E**: Advanced scaffold (custom collections beyond block defaults)