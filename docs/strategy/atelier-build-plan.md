# Atelier Builder — Build Plan

## Overview

Build a visual app builder ("Atelier") as a standalone package + app. Users compose apps from pre-defined blocks instead of chatting with AI. Phase A only — no AI, no scaffold wiring.

## Architecture Decision

**Standalone package** (`crouton-atelier`) extending `@fyit/crouton` directly — NOT crouton-designer. The designer's AI/phase infrastructure is too coupled. When Phase E (scaffold) arrives, call the designer's scaffold endpoint via `$fetch` or extract shared utilities to crouton-core.

## What to Create

### Package: `packages/crouton-atelier/`

```
packages/crouton-atelier/
├── package.json                    # @fyit/crouton-atelier
├── nuxt.config.ts                  # Extends @fyit/crouton, Atelier prefix
├── CLAUDE.md
├── app/
│   ├── app.config.ts               # croutonApps registration
│   ├── types/
│   │   └── blocks.ts               # Block, Template, AppComposition
│   ├── data/
│   │   ├── blocks.ts               # Static block declarations
│   │   └── templates.ts            # Pre-configured block sets
│   ├── composables/
│   │   ├── useBlockRegistry.ts     # Block lookup + filtering
│   │   └── useAppComposition.ts    # Reactive composition state
│   ├── components/
│   │   ├── TemplateSelector.vue    # Template grid
│   │   ├── BlockPalette.vue        # Available blocks by category
│   │   ├── BlockCanvas.vue         # Selected blocks by visibility tab
│   │   ├── BlockCard.vue           # Single block card (clickable)
│   │   ├── BlockDetail.vue         # Slideover: collections, fields, seed config
│   │   ├── PackageSidebar.vue      # Enabled packages list
│   │   └── IdentityForm.vue        # App name, description, icon
│   └── pages/
│       └── admin/[team]/atelier/
│           └── index.vue           # Builder page
```

### App: `apps/atelier/`

```
apps/atelier/
├── nuxt.config.ts                  # Extends crouton + crouton-atelier
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
  icon: string                                  // Lucide icon class
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
  icon: string
  blocks: string[]                              // Block IDs
  identity: { name: string; description: string }
}

interface AppComposition {
  identity: { name: string; description: string; icon: string }
  selectedBlocks: Block[]
  enabledPackages: string[]                     // Computed from selectedBlocks
}
```

## Block Data (Starting Set)

### From `crouton-bookings`
| Block ID | Label | Visibility | Collections |
|----------|-------|-----------|-------------|
| `schedule` | Class schedule | public | bookings, locations |
| `book-now` | Book now | public | — (reuses schedule collections) |
| `my-bookings` | My bookings | auth | — (reuses schedule collections) |
| `manage-bookings` | Manage bookings | admin | — |
| `manage-locations` | Manage locations | admin | locations |

### From `crouton-pages`
| Block ID | Label | Visibility | Collections |
|----------|-------|-----------|-------------|
| `hero` | Hero section | public | — (pure content) |
| `text-page` | Text page | public | pages |
| `blog` | Blog | public | articles |

### From `crouton-auth`
| Block ID | Label | Visibility | Collections |
|----------|-------|-----------|-------------|
| `signup` | Sign up | public | — |
| `manage-contacts` | Manage contacts | admin | contacts |

## Templates

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
// Returns all blocks with filtering
const { blocks, getBlock, byCategory, byPackage, byVisibility } = useBlockRegistry()
```

### `useAppComposition()`
```typescript
// Reactive composition state (useState internally)
const {
  composition,       // Ref<AppComposition>
  addBlock,          // (blockId: string) => void
  removeBlock,       // (blockId: string) => void
  reorderBlocks,     // (blockIds: string[]) => void
  selectTemplate,    // (templateId: string) => void
  reset,             // () => void
  enabledPackages,   // ComputedRef<string[]>
  blocksByVisibility // ComputedRef<Record<Visibility, Block[]>>
} = useAppComposition()
```

## Component Specs

### TemplateSelector
- Grid of UCard components, one per template
- Each card: icon, label, description, block count badge (UBadge)
- Click populates composition via `selectTemplate()`
- "Blank" option included
- Show after: page load (first step)

### BlockPalette
- Grouped by category with headers
- Each block: icon + label + package badge
- Already-selected blocks are dimmed/disabled
- Click calls `addBlock()`

### BlockCanvas
- UTabs with 3 tabs: Public / Members / Admin
- Each tab lists its blocks as BlockCards
- Remove button per card
- Reorder within tab (drag or move buttons)

### BlockCard
- UCard with: icon, label, package badge (UBadge), visibility indicator
- Hover: subtle lift/shadow
- Click: opens BlockDetail slideover

### BlockDetail
- USlideover (or UModal with `#content` slot)
- Header: block icon + label + description
- Body: for each collection the block provides:
  - Collection name as heading
  - Field table (name, type, meta) — read-only for Phase A
  - Seed data count toggle
- Footer: close button

### PackageSidebar
- Vertical list of enabled packages
- Each: package icon + name + list of blocks that activated it
- Auto-updates as blocks are added/removed

### IdentityForm
- UInput for app name
- UTextarea for description
- Inline at top of canvas or as a collapsible header

## Page Flow

```
1. TemplateSelector (full page)
   ↓ user picks template (or blank)
2. Builder view:
   ┌──────────────┬───────────────────────┬──────────────┐
   │              │                       │              │
   │  Block       │   BlockCanvas         │  Package     │
   │  Palette     │   (with UTabs)        │  Sidebar     │
   │              │                       │              │
   │  grouped by  │   IdentityForm        │  auto-       │
   │  category    │   ───────────         │  derived     │
   │              │   Public | Members |  │  packages    │
   │  click to    │   Admin tabs          │              │
   │  add         │                       │              │
   │              │   BlockCards here      │              │
   │              │                       │              │
   └──────────────┴───────────────────────┴──────────────┘

   Click any BlockCard → BlockDetail slideover opens
```

## Design Guidelines

- **Nuxt UI 4 only** — UCard, UButton, UBadge, UModal, USlideover, UTabs, etc.
- **Use Crouton components** where they exist (CroutonDefaultCard patterns, etc.)
- **Make it fun** — transitions, hover effects, micro-interactions. Blocks should feel like building with tangible pieces. Satisfying click-to-add, smooth reorder.
- **Composition API** — `<script setup lang="ts">` exclusively
- **No Pinia** — `useState()` for shared state
- **No AI** — Phase A is purely visual
- **No scaffold wiring** — Phase E concern
- **Static block data** — hardcoded in `app/data/`, not API-fetched

## Reference Files

| File | Why |
|------|-----|
| `docs/strategy/atelier-builder-plan.md` | Full strategic plan |
| `packages/crouton-bookings/app/app.config.ts` | Package registration pattern |
| `packages/crouton-designer/app/types/schema.ts` | Schema type reference (don't import) |
| `packages/crouton-designer/app/composables/useFieldTypes.ts` | Field type metadata (copy what's needed) |
| `packages/crouton-core/CLAUDE.md` | Core package documentation |

## Done When

- [ ] `packages/crouton-atelier/` exists with types, data, composables, components
- [ ] `apps/atelier/` runs and renders the builder
- [ ] Pick template → canvas populates with blocks
- [ ] Click block card → slideover shows collection details
- [ ] Package sidebar auto-updates from selected blocks
- [ ] `packages/crouton-atelier/CLAUDE.md` written
- [ ] `npx nuxt typecheck` passes