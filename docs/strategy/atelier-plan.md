# Atelier Plan

> **SUPERSEDED by the skill-chain approach.** See `atelier-strategy.md` → "The Generation Pipeline: Skills, Not UI". The creation flow moves from a visual builder to Claude Code skills (`/discover` → `/architect` → `/generate` → `/compose` → `/brand`). This document is kept as reference for what the skills need to accomplish — the block types, templates, composition model, and scaffold flow remain useful as skill input data.

## Overview (Original)

Build a visual app builder ("Atelier") as a standalone package + app. Users compose apps from pre-defined blocks instead of chatting with AI. The designer package is throwaway — Atelier replaces it as the primary app creation tool.

**Current status:** Phase A mostly complete. Block registry, templates, kanban canvas, Yjs collab, scaffold endpoint, and all 10 components are built. The generation pipeline (AI roles) is designed but not implemented. **Direction changed:** the UI phases are superseded by the skill chain; the pipeline design informs the skills.

## Architecture Decision

**Standalone package** (`crouton-atelier`) extending `@fyit/crouton` + `@fyit/crouton-collab` directly. The designer's AI/phase infrastructure is too coupled to reuse.

**Dependencies:**
- `@fyit/crouton` — core layer, components, composables
- `@fyit/crouton-collab` — Yjs sync, presence, WebSocket infrastructure

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

Each Atelier project gets a Yjs room via `crouton-collab`:

```typescript
// useAtelierSync.ts — wraps useCollabSync
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

Persistence: Y.Doc → binary updates via WebSocket → CollabRoom (Durable Object / Nitro handler) → D1 `yjs_collab_states` table. Project metadata (name, teamId) stored separately in `atelierProjects` DB table.

## Block Data (Phase A — Static)

Currently 10 blocks hardcoded in `app/data/blocks.ts`. Phase B migrates to package manifests.

### From `crouton-bookings`
| Block ID | Label | Visibility | Collections | Category |
|----------|-------|-----------|-------------|----------|
| `schedule` | Class schedule | public | bookings, locations | interaction |
| `book-now` | Book now | public | — (reuses schedule) | interaction |
| `my-bookings` | My bookings | auth | — (reuses schedule) | member |
| `manage-bookings` | Manage bookings | admin | — | admin |
| `manage-locations` | Manage locations | admin | locations | admin |

### From `crouton-pages`
| Block ID | Label | Visibility | Collections | Category |
|----------|-------|-----------|-------------|----------|
| `hero` | Hero section | public | — (pure content) | content |
| `text-page` | Text page | public | pages | content |
| `blog` | Blog | public | articles (generated) | content |

### From `crouton-auth`
| Block ID | Label | Visibility | Collections | Category |
|----------|-------|-----------|-------------|----------|
| `signup` | Sign up | public | — | member |
| `manage-contacts` | Manage contacts | admin | — (member list view) | admin |

## Templates

4 templates in `app/data/templates.ts`:

- **Yoga Studio**: hero, schedule, signup | my-bookings | manage-bookings, manage-locations, manage-contacts
- **Sports Club**: hero, schedule | my-bookings | manage-bookings, manage-contacts
- **Charity**: hero, text-page | — | manage-contacts
- **Blank**: empty canvas

## Composables

### `useBlockRegistry()`
```typescript
const { blocks, getBlock, byCategory, byPackage, byVisibility } = useBlockRegistry()
```

### `useAppComposition()`
```typescript
const {
  composition,          // Ref<AppComposition> — auto-synced from Y.Map
  addBlock,             // (blockId: string) => void
  removeBlock,          // (blockId: string) => void
  moveBlock,            // (blockId: string, newVisibility, newOrder) => void
  reorderBlocks,        // (visibility, blockIds: string[]) => void
  selectTemplate,       // (templateId: string) => void
  updateIdentity,       // (identity: Partial<Identity>) => void
  reset,                // () => void
  enabledPackages,      // ComputedRef<string[]>
  blocksByVisibility,   // ComputedRef<Record<Visibility, SelectedBlock[]>>
} = useAppComposition(projectId)
```

### `useAtelierSync()`
```typescript
const { ymap, connected, users } = useAtelierSync(projectId, teamId)
```

### `useAtelierScaffold()`
```typescript
const {
  appName, folderName, canGenerate, artifacts,
  status, steps, result, error, generate,
} = useAtelierScaffold(composition)
```

## Component Specs

### TemplateSelector
Full-page first step. Responsive card grid. Click populates composition via `selectTemplate()`.

### BlockPalette
iPhone: bottom sheet via FAB. Desktop: left sidebar. Grouped by category. Already-selected blocks dimmed.

### BlockCanvas
Kanban — three columns for Public / Members / Admin. Drag between columns changes visibility. Uses `CroutonKanbanColumn` + sortablejs.

### BlockCard
Compact card: icon + label + package badge. Tap opens BlockDetail. Draggable.

### BlockDetail
iPhone: bottom sheet. Desktop: `CroutonFormExpandableSlideOver`. Shows collection fields per block (read-only Phase A).

### PackageList
Auto-derived from `enabledPackages`. iPhone: collapsible section. Desktop: right sidebar.

### IdentityForm
App name, description, icon. Syncs via Yjs in real-time.

### GeneratePanel
Summary card, validation checklist, artifact preview, folder name input, "Create App" button, step-by-step progress, success state with dev/deploy commands.

### PresenceIndicator
Avatar stack of collaborators via `useCollabPresence()`.

### Fab
iPhone-only floating "+" button. Opens BlockPalette bottom sheet.

## Page Flow

### iPhone
```
Project List → TemplateSelector → Builder View
┌─────────────────────────┐
│  IdentityForm (collapse) │
├─────────────────────────┤
│  BlockCanvas             │
│  ┌───────────────────┐  │
│  │ Public (swipe →)  │  │
│  │ ┌───────────────┐ │  │
│  │ │ BlockCard     │ │  │
│  │ │ BlockCard     │ │  │
│  │ └───────────────┘ │  │
│  └───────────────────┘  │
│  PackageList (collapsed)│
├─────────────────────────┤
│  [Presence] [Generate]  │
│                    [+]  │
└─────────────────────────┘
```

### Desktop
```
┌──────────────┬───────────────────────────┬──────────────┐
│ Block        │   IdentityForm            │ Package      │
│ Palette      │   BlockCanvas (kanban)    │ List         │
│ (by category)│   ┌────┬────┬────┐       │ [Presence]   │
│              │   │Pub │Auth│Adm │       │              │
│              │   └────┴────┴────┘       │              │
│              │   [Generate App]         │              │
└──────────────┴───────────────────────────┴──────────────┘
```

## Scaffold Flow

Atelier builds a payload from composition state and calls `POST /api/atelier/scaffold-app`:

```typescript
{
  appName: composition.identity.name,
  config: { name: composition.identity.name, packages: enabledPackages.value },
  schemas: { /* from block collection definitions */ },
  seedData: { /* from block seed config */ },
  packageCollections: [ /* from block package mappings */ ],
}
```

The endpoint delegates to CLI via jiti (`scaffoldApp()`). Steps:
1. Scaffold app structure
2. Write schemas
3. Write seed data
4. Generate `crouton.config.js`
5. `pnpm install`
6. `crouton config` (generate collections)
7. Doctor validation

## Reusable Crouton Assets

### Components (use directly)
| Component | From | Use in Atelier |
|-----------|------|----------------|
| `CroutonFormExpandableSlideOver` | crouton-core | BlockDetail on desktop |
| `CroutonKanbanColumn` + `useKanban()` | crouton-core | BlockCanvas drag-drop |
| `CroutonDraggableList` / `CroutonDraggableItem` | crouton-core | Block reordering |
| `CroutonDefaultCard` | crouton-core | BlockCard rendering |
| `CroutonLoading` | crouton-core | Skeleton states |
| `CroutonValidationErrorSummary` | crouton-core | GeneratePanel validation |

### Composables (use directly)
| Composable | From | Use in Atelier |
|-----------|------|----------------|
| `useCrouton()` | crouton-core | Modal/slideover state |
| `useCroutonApps()` | crouton-core | Detect installed packages |
| `useCroutonShortcuts()` | crouton-core | Keyboard shortcuts |
| `useCollabSync()` | crouton-collab | Yjs Y.Map for composition |
| `useCollabPresence()` | crouton-collab | Collaborator presence |
| `useDisplayConfig()` | crouton-core | Field rendering in BlockDetail |

---

## Phases

### Phase A: Foundation — MOSTLY COMPLETE

Block types, registry, templates, kanban canvas with drag-drop between visibility columns, Yjs real-time collaboration, presence indicators, scaffold endpoint, all 10 components, project CRUD, iPhone layout.

**Remaining:**
- [ ] `apps/atelier/` runs and renders the builder
- [ ] `npx nuxt typecheck` passes
- [ ] Project deletion cleans up Yjs room (collab state purge)
- [ ] Template re-apply: reset composition + apply new template

### Phase B: Manifest Migration + Preview

**Goal:** Blocks come from packages, not hardcoded data. Users can preview what their app looks like.

**Manifest migration:**
1. Add `atelierBlocks?: ManifestAtelierBlock[]` to `provides` in `CroutonManifest`
2. Each package declares its atelier blocks in `crouton.manifest.ts` (bookings, pages, auth)
3. `useBlockRegistry()` reads from manifests instead of static `blocks.ts`
4. Delete `app/data/blocks.ts`

**Block customization:**
5. Field editing in BlockDetail (seed data tweaking, field overrides)
6. "Something else" custom block: name + description → stored for AI processing later

**Preview:**
7. Preview renderers per block (static mock data, realistic fakes for complex blocks)
8. Visibility switcher: toggle between public / auth / admin views
9. Identity reflected in preview (app name in hero, nav)

**Outcome:** Blocks are self-declared by packages. Users can inspect, tweak, and preview before generating.

### Phase C: Generation Pipeline

> **Prerequisite:** Run the pipeline once end-to-end manually (even as copy-paste between Claude conversations) before building UI. Validate the approach with a real app before investing in infrastructure.

**C.1: Architect**
- Prompt that takes user description + project context → outputs JSON schemas + seed data
- Must understand existing collections, installed packages, relationships
- Validate output against `CroutonManifest` schema types

**C.2: Designer**
- Prompt that takes schemas + project context → outputs layout hints ($list, $card) or custom Vue components
- Two modes: hints (cheap, CLI handles rendering) or custom components (when domain demands it)
- Only invoked for custom blocks; standard blocks skip AI entirely

**C.3: Visualization presets** (deterministic, not AI)
- Function that reads collection schemas + available packages (charts, maps)
- Field-shape heuristics: date + count → time series, status → donut, address → map
- Outputs pre-configured `CroutonBlockDefinition` entries for the generated layer's `app.config.ts`
- Graduate to AI role only when heuristics prove insufficient

**C.4: Editor**
- Prompt that takes app composition + all available blocks/components → outputs TipTap JSON per page
- Layout patterns: public → hero first, member → personal data first, admin → charts first
- Output is editable in `crouton-pages` editor — starting point, not locked layout

**Outcome:** "Something else" blocks get AI-designed schemas and components. Generated apps ship with composed pages and meaningful visualizations.

### Phase D: Scaffold Integration

**Goal:** Wire the full pipeline to generation.

1. Block-to-schema mapper: selected blocks → required collections → schema JSON files
2. Hint injection: $list, $card, $form hints from block definitions (requires CLI hint system)
3. Visibility config: generate route middleware or page metadata for auth-based visibility
4. Visualization config: embed chart presets and map configs from C.3 into generated app.config
5. Page content: embed Editor's TipTap JSON as page records in the generated database

**Outcome:** "Build this app" button generates a working Nuxt app with correct packages, schemas, hints, visualizations, page content, and visibility rules.

### Phase E: Automations — DEFERRED

Predefined rules mapping to `crouton:mutation` hooks + `crouton-events`:
- "When someone books → send confirmation email" (bookings + email)
- "When new sign-up → add to contacts" (forms + auth)
- "When invoice overdue 7 days → send reminder" (invoicing + email)

Each automation declares required packages. Only shown when those packages are active. Toggle on/off. Implementation via config entries that the generated app's event listener picks up.

Parked until Phases A–D are shipped.

---

## Design Guidelines

- Nuxt UI 4 only — UCard, UButton, UBadge, UModal, USlideover, UTabs
- Use Crouton components — CroutonKanbanColumn, CroutonFormExpandableSlideOver, CroutonDefaultCard
- Make it fun — transitions, hover effects, micro-interactions
- Bottom sheets on mobile — not modals
- Composition API — `<script setup lang="ts">` exclusively
- No Pinia — `useState()` for local state, Yjs Y.Map for shared composition state
- Collaborative — real-time sync via Yjs, presence indicators

## Reference Files

| File | Why |
|------|-----|
| `packages/crouton-atelier/CLAUDE.md` | Package documentation |
| `packages/crouton-core/shared/manifest.ts` | Manifest type definitions (for Phase B) |
| `packages/crouton-bookings/crouton.manifest.ts` | Manifest structure example |
| `packages/crouton-bookings/app/app.config.ts` | Package registration pattern |
| `packages/crouton-core/app/components/KanbanColumn.vue` | Column drag implementation |
| `packages/crouton-core/app/composables/useKanban.ts` | Kanban state composable |
| `packages/crouton-core/app/components/FormExpandableSlideOver.vue` | Maximizable slideover |
| `packages/crouton-collab/app/composables/useCollabSync.ts` | Yjs sync composable |
| `packages/crouton-collab/app/composables/useCollabPresence.ts` | Presence tracking |
| `packages/crouton-designer/app/composables/useAppScaffold.ts` | Scaffold pattern (inspiration) |
| `packages/crouton-designer/app/components/ReviewPanel.vue` | Review + generate UI (inspiration) |
| `packages/crouton-pages/app/utils/block-registry.ts` | Block registry pattern |
