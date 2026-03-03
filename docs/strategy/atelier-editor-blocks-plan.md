# Atelier Phase B: Manifest-Driven Block Registration

> **Status: IMPLEMENTED** — Page editor blocks (chartBlock, mapBlock, collectionMapBlock) are now manifest-driven. See commits `b5fa0976..215733d8` on main.

## Context

The atelier build plan calls for **Phase B: Migrate block declarations to CroutonManifest**, discovered automatically via manifest-loader. This document covers the first implementation of manifest-driven blocks, starting with the **page editor blocks** (TipTap nodes like `chartBlock`, `mapBlock`).

Currently, page editor blocks for charts and maps are hardcoded in `crouton-pages` even though they belong to optional packages (`@fyit/crouton-charts`, `@fyit/crouton-maps`). This causes them to appear in the editor slash menu even when those packages aren't installed.

The fix follows the user's direction: **"it starts with the manifest: they declare what the packages offers. Then the CLI fills the crouton config or app config, whatever makes most sense."**

## Two Block Systems

The crouton ecosystem has two distinct "block" concepts:

| System | Purpose | Examples | Phase |
|--------|---------|----------|-------|
| **Atelier blocks** | App composition features on the kanban canvas | `schedule`, `blog`, `signup`, `manage-bookings` | Phase B (future — currently in `app/data/blocks.ts`) |
| **Page editor blocks** | TipTap nodes in the page content editor | `chartBlock`, `mapBlock`, `heroBlock`, `collectionMapBlock` | **This plan** |

Both will eventually be manifest-driven, using separate manifest fields:
- `provides.editorBlocks` — page editor TipTap blocks (this plan)
- `provides.atelierBlocks` — app composition blocks (future Phase B work)

## Architecture: Manifest → `app.config.ts` → Runtime

Same pattern as `croutonApps`:

```
crouton.manifest.ts          →  app/app.config.ts         →  useCroutonBlocks()
(source of truth,               (full runtime definition,     (composable reads
 lightweight metadata)           Nuxt deep-merges layers)      merged config)
                                                                    ↓
                                                              PageBlocks extension
                                                              creates TipTap nodes
                                                              dynamically
```

## Implementation Steps

### Step 1: Shared types + composable in `crouton-core`

**Modify: `packages/crouton-core/shared/manifest.ts`**
- Add `editorBlocks?: ManifestEditorBlock[]` to the `provides` interface
- Add `ManifestEditorBlock`: `{ type: string, name: string, description: string, icon: string, category: string }`
- Lightweight metadata — full runtime definition lives in `app.config.ts`

**New: `packages/crouton-core/app/types/block-definition.ts`**
`CroutonBlockDefinition` — full runtime block definition registered in `app.config.ts`:
- `type: string` — TipTap node name (e.g. `'chartBlock'`)
- `name`, `description`, `icon`, `category` (mirrors manifest)
- `defaultAttrs: Record<string, unknown>`
- `schema: BlockPropertySchema[]` — property panel fields
- `clientOnly?: boolean` — wraps renderer in `<ClientOnly>`
- `components: { editorView: string, renderer: string }` — auto-imported component names
- `propertyComponents?: Record<string, string>` — custom property editors
- `tiptap: { parseHTMLTag: string, attributes: Record<string, CroutonBlockTipTapAttribute> }` — declarative TipTap node config

**New: `packages/crouton-core/app/composables/useCroutonBlocks.ts`**
- Reads `useAppConfig().croutonBlocks`
- Returns: `blocks`, `blocksList`, `getBlock(type)`, `hasBlock(type)`

### Step 2: Extension factory + generic NodeView in `crouton-pages`

**New: `packages/crouton-pages/app/editor/extensions/addon-block-factory.ts`**
- `createAddonBlockExtension(def)` → TipTap `Node` from `CroutonBlockDefinition`
- Converts `def.tiptap.attributes` to TipTap `addAttributes()` config
- Uses `AddonBlockView` as generic NodeView
- Generates `insert{PascalType}` and `update{PascalType}` commands

**New: `packages/crouton-pages/app/components/Blocks/Views/AddonBlockView.vue`**
- Generic NodeView wrapper
- Looks up definition from `useCroutonBlocks()` by `node.type.name`
- Renders `<component :is="def.components.editorView">` with TipTap props

### Step 3: Move chart block to `crouton-charts`

**Move files:**
| From (`crouton-pages`) | To (`crouton-charts`) |
|---|---|
| `Blocks/Views/ChartBlockView.vue` | `Blocks/ChartBlockView.vue` |
| `Blocks/Render/ChartBlock.vue` | `Blocks/ChartBlockRender.vue` |
| `Blocks/Properties/ChartPresetPicker.vue` | `Blocks/ChartPresetPicker.vue` |

**Add to manifest (`crouton-charts/crouton.manifest.ts`):**
```ts
provides: {
  editorBlocks: [
    { type: 'chartBlock', name: 'Chart', description: 'Collection data chart', icon: 'i-lucide-chart-bar', category: 'data' }
  ]
}
```

**Register in `crouton-charts/app/app.config.ts`** — add `croutonBlocks.chartBlock` with full `CroutonBlockDefinition` (defaultAttrs, schema, tiptap config, component names)

### Step 4: Move map blocks to `crouton-maps`

**Move files:**
| From (`crouton-pages`) | To (`crouton-maps`) |
|---|---|
| `Blocks/Views/MapBlockView.vue` | `Blocks/MapBlockView.vue` |
| `Blocks/Views/CollectionMapBlockView.vue` | `Blocks/CollectionMapBlockView.vue` |
| `Blocks/Render/MapBlock.vue` | `Blocks/MapBlockRender.vue` |
| `Blocks/Render/CollectionMapBlock.vue` | `Blocks/CollectionMapBlockRender.vue` |

**Add to manifest (`crouton-maps/crouton.manifest.ts`):**
```ts
provides: {
  editorBlocks: [
    { type: 'mapBlock', name: 'Map', ... },
    { type: 'collectionMapBlock', name: 'Collection Map', ... }
  ]
}
```

**Create `crouton-maps/app/app.config.ts`** — `croutonApps.maps` + `croutonBlocks.mapBlock` + `croutonBlocks.collectionMapBlock`

### Step 5: Update `crouton-pages` consumers

**`app/types/blocks.ts`** — Remove chart/map types from `BlockType`, `BlockAttrs`; widen `PageBlock.type` to `BlockType | string`

**`app/utils/block-registry.ts`** — Remove chart/map definitions; `getBlockMenuItems()` returns core blocks only

**`app/editor/extensions/page-blocks.ts`** — Remove chart/map imports; add `addonBlocks?: CroutonBlockDefinition[]` option; loop and create extensions dynamically

**`app/components/Editor/BlockEditor.vue`** — Remove `hasApp()` band-aid; use `useCroutonBlocks()` to get addon blocks; merge into suggestion items

**`app/components/Editor/BlockEditorWithPreview.vue`** — Same changes

**`app/components/BlockContent.vue`** — Remove hardcoded chart/map entries from `blockComponents`; fall back to `useCroutonBlocks()` for renderer lookup; use `def.clientOnly` for dynamic `<ClientOnly>` wrapping

**`app/components/Editor/BlockPropertyPanel.vue`** — Fall back to `useCroutonBlocks().getBlock()` for schema; resolve custom property components from `def.propertyComponents`

**`app/editor/extensions/block-commands.ts`** — Generic `default` case: `editor.chain().focus()[insertCommandName]().run()`

### Step 6: Delete old files from `crouton-pages`

- `app/editor/extensions/chart-block.ts`
- `app/editor/extensions/map-block.ts`
- `app/editor/extensions/collection-map-block.ts`
- All moved View/Render/Properties components

## Key Files

| File | Action |
|---|---|
| `packages/crouton-core/shared/manifest.ts` | **Modify** — add `editorBlocks` to `provides` |
| `packages/crouton-core/app/types/block-definition.ts` | **Create** — runtime block type |
| `packages/crouton-core/app/composables/useCroutonBlocks.ts` | **Create** — registry composable |
| `packages/crouton-pages/app/editor/extensions/addon-block-factory.ts` | **Create** — TipTap factory |
| `packages/crouton-pages/app/components/Blocks/Views/AddonBlockView.vue` | **Create** — generic NodeView |
| `packages/crouton-charts/crouton.manifest.ts` | **Modify** — add `editorBlocks` |
| `packages/crouton-charts/app/app.config.ts` | **Modify** — add `croutonBlocks` |
| `packages/crouton-maps/crouton.manifest.ts` | **Modify** — add `editorBlocks` |
| `packages/crouton-maps/app/app.config.ts` | **Create** — apps + blocks |
| `packages/crouton-pages/app/types/blocks.ts` | **Modify** — remove chart/map |
| `packages/crouton-pages/app/utils/block-registry.ts` | **Modify** — remove chart/map |
| `packages/crouton-pages/app/editor/extensions/page-blocks.ts` | **Modify** — addon support |
| `packages/crouton-pages/app/components/Editor/BlockEditor.vue` | **Modify** |
| `packages/crouton-pages/app/components/Editor/BlockEditorWithPreview.vue` | **Modify** |
| `packages/crouton-pages/app/components/BlockContent.vue` | **Modify** |
| `packages/crouton-pages/app/components/Editor/BlockPropertyPanel.vue` | **Modify** |
| `packages/crouton-pages/app/editor/extensions/block-commands.ts` | **Modify** |

## Backward Compatibility

- TipTap node names unchanged (`chartBlock`, `mapBlock`, `collectionMapBlock`) — saved content works
- Missing addon package → "Unknown block type" fallback (correct)
- `parseHTML` tag selectors unchanged — pasted HTML recognized

## Future: Atelier blocks via manifests

Once this infrastructure exists, the same pattern extends to atelier composition blocks:
- Add `provides.atelierBlocks` to manifests (separate from `editorBlocks`)
- Replace `crouton-atelier/app/data/blocks.ts` with manifest discovery
- `useBlockRegistry()` reads from manifests instead of static data

## Verification

1. `npx nuxt typecheck` in `apps/bikeshed` (maps, no charts)
2. `npx nuxt typecheck` in `apps/crouton-playground` (both)
3. Dev server bikeshed: chart block NOT in `/` menu, map blocks present
4. Dev server playground: chart + map blocks both present
5. Existing pages with chart/map blocks still render

## First implementation action

Save this as `docs/strategy/atelier-editor-blocks-plan.md` before starting code changes.