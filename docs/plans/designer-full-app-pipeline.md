# Designer → Full App Pipeline (Seed + Scaffold + CLI + Deploy)

**Date**: 2026-02-16
**Status**: Planning
**Depends on**: Schema Designer v2 Phase A (complete)

## Problem

The Schema Designer currently ends by downloading a ZIP of schema JSON files. The developer then manually creates ~12 boilerplate files, wires dependencies, writes a `crouton.config.js`, and runs a multi-step deploy process. This defeats the purpose of the designer — the last mile is still manual.

## Goal

The designer produces a **complete, running app** with one click. It writes directly to the monorepo `apps/` folder, auto-runs `crouton config` to generate all collections, and includes a deploy script.

```
Phase 1 (Intake) → Phase 2 (Collections) → Phase 3 (Seed Data) → Phase 5 (Create App)
```

Phase 5 changes from "Download ZIP" to "Create App" — writes scaffold, runs CLI, app is ready for `pnpm dev`.

---

## Task Breakdown

### Task 1: Update Types & Phase System

**File:** `packages/crouton-designer/app/types/schema.ts`

- Update `DesignerPhase` from `1 | 2 | 5` to `1 | 2 | 3 | 5`
- Add `PhaseMessages` key for `3`
- Add seed data types:
  ```typescript
  export interface SeedEntry { [fieldName: string]: any }
  export type SeedDataMap = Record<string, SeedEntry[]>
  ```
- Add `seedData?: SeedDataMap` to `ProjectConfig` (stored in project's config JSON column — no new DB table needed)

---

### Task 2: Add Phase 3 AI Tools

**File:** `packages/crouton-designer/server/api/ai/designer-chat.post.ts`

- Add `getPhase3Tools()` with one tool:
  ```
  generate_seed_data(collectionName, entries[], count)
  ```
  AI returns full entry arrays per collection. Auto-generated fields (id, teamId, timestamps) excluded.

- Update phase routing:
  ```typescript
  const tools = phase === '3' ? getPhase3Tools()
              : phase === '2' ? getPhase2Tools()
              : getPhase1Tools()
  ```

---

### Task 3: Create Seed Data Prompt Composable

**File:** `packages/crouton-designer/app/composables/useSeedDataPrompt.ts` (NEW)

- `buildSeedDataPrompt(config, collections, existingSeedData)`
- System prompt instructs AI to:
  - Generate contextually appropriate data (real-ish names matching the app type, not lorem ipsum)
  - Respect relationships (reference fields point to other seed entries)
  - Default 5-10 entries per collection
  - Include current collections + fields as context
  - Include existing seed data for iterative refinement

---

### Task 4: Create SeedDataPanel Component

**File:** `packages/crouton-designer/app/components/SeedDataPanel.vue` (NEW)

- Two-panel layout: chat (1/3) + tables (2/3)
- Right panel: tab per collection, each with `UTable` showing seed data
- Tables are read-only
- "Regenerate" button per tab
- On Phase 3 entry with no seed data, auto-sends AI message to generate all
- Props: `projectId`, `config`, `collections` (CollectionWithFields[]), `seedData` (SeedDataMap)
- Emits: `update:seedData`

---

### Task 5: Wire Phase 3 into [id].vue

**File:** `packages/crouton-designer/app/pages/admin/[team]/designer/[id].vue`

1. **Add phase to stepper** (between '2' and '5'):
   ```typescript
   { slot: 'seed', title: 'Seed Data', icon: 'i-lucide-sprout', value: '3' }
   ```

2. **Add seed data state** initialized from `projectRecord.config.seedData`

3. **Phase 3 system prompt** in computed `systemPrompt`:
   ```typescript
   if (currentPhase.value === '3') {
     return buildSeedDataPrompt(projectConfig.value, collectionsWithFields, seedData.value)
   }
   ```
   Requires loading collections for Phase 3 context — fetch once when entering Phase 3.

4. **Phase 3 tool call handler**:
   ```typescript
   if (toolCall.toolName === 'generate_seed_data') {
     seedData.value = { ...seedData.value, [args.collectionName]: args.entries }
     debouncedSaveSeedData()
     return { success: true, collectionName: args.collectionName, count: args.entries.length }
   }
   ```

5. **Transitions**:
   - Phase 2 "Continue" button → `continueToSeedData()` (saves chat, sets phase to '3')
   - Phase 3 "Continue" button → `continueToReview()` (saves chat, sets phase to '5')

6. **Backward navigation**: Phase 3→2 cascade-deletes seed data with warning

7. **Persist seed data** via PATCH to project config JSON

8. **Template slot**:
   ```vue
   <template #seed>
     <DesignerSeedDataPanel ... />
     <!-- Continue to Review button -->
   </template>
   ```

---

### Task 6: Create App Scaffold Server Endpoint

**File:** `packages/crouton-designer/server/api/ai/scaffold-app.post.ts` (NEW)

This is the core change — a server endpoint writes files directly to the monorepo and runs the CLI.

**Request body:**
```typescript
{
  appName: string            // kebab-case app name
  config: ProjectConfig      // from Phase 1
  schemas: Record<string, string>  // collectionName → JSON content
  seedData?: SeedDataMap     // from Phase 3
}
```

**What it does:**
1. Resolve monorepo root (walk up from `process.cwd()` until finding root `pnpm-workspace.yaml`)
2. Create `apps/{appName}/` directory
3. Write all scaffold files (templates inline):

| File | Key Variables |
|------|---------------|
| `package.json` | `appName`, resolved package deps from `config.packages` |
| `nuxt.config.ts` | extends array from packages, hub config, CF stubs |
| `crouton.config.js` | features, collections[], targets[], dialect, seed flags |
| `wrangler.toml` | `{appName}-db`, `{appName}-kv` with placeholder IDs |
| `app.vue` | Static (always the same) |
| `app/assets/css/main.css` | Static |
| `app/app.config.ts` | Placeholder with comment |
| `server/db/schema.ts` | Auth export + placeholder |
| `server/db/translations-ui.ts` | Static (from bike-sheds) |
| `server/utils/_cf-stubs/index.ts` | Static |
| `server/utils/_cf-stubs/client.ts` | Static |
| `.env.example` | Feature-dependent vars |
| `.gitignore` | Standard Nuxt ignores |
| `scripts/deploy.sh` | Deploy automation script |
| `schemas/{name}.json` | Schema files |
| `schemas/{name}.seed.json` | Seed data files (if Phase 3 completed) |

4. Run `pnpm install` from the app directory
5. Run `pnpm crouton config ./crouton.config.js` to generate all collections
6. Return success with file list and any CLI output

**Template logic for key files:**

**package.json**: Map `config.packages` through module registry logic. Core: `@fyit/crouton`, `@fyit/crouton-core`. Features: map package aliases (e.g. `editor` → `@fyit/crouton-editor`). Always include `@fyit/crouton-i18n` if languages configured. Dev: `@fyit/crouton-cli`, `drizzle-kit`, `wrangler`. All `"workspace:*"`.

**nuxt.config.ts**: Build extends array — `@fyit/crouton-core` always first, then non-bundled feature packages, then `./layers/{layerName}` for each target. Include hub, CF preset, nitro stubs. Note: bundled packages (auth, i18n, admin) are NOT added to extends separately.

**crouton.config.js**: Features from packages. Collections from schema files. Targets grouping collections into layers (one layer per collection for simplicity). `seed: true` for collections with seed data.

**scripts/deploy.sh**: Check wrangler auth, create CF Pages project, D1, KV, update wrangler.toml IDs, prompt for secrets, migrate, deploy.

**Error handling**: Return structured errors per step. If CLI fails, still return partial success (files were written). UI shows which steps succeeded.

---

### Task 7: Create App Scaffold Composable (Client)

**File:** `packages/crouton-designer/app/composables/useAppScaffold.ts` (NEW)

Replaces `useSchemaDownload`. Client-side composable that:
- Builds the artifact list (all files that will be created)
- Calls the server endpoint to scaffold + run CLI
- Tracks progress state (writing → installing → generating → done)
- Returns errors if any step fails

```typescript
export function useAppScaffold(
  collections: Ref<CollectionWithFields[]>,
  config: Ref<ProjectConfig>,
  seedData: Ref<SeedDataMap>
) {
  const { schemaFiles, getAllSchemasAsJson } = useSchemaExport(collections)

  const artifacts = computed<ArtifactFile[]>(() => { /* all scaffold files */ })

  const status = ref<'idle' | 'writing' | 'installing' | 'generating' | 'done' | 'error'>('idle')
  const progress = ref<string[]>([])
  const error = ref<string | null>(null)

  async function createApp() {
    status.value = 'writing'
    const result = await $fetch('/api/ai/scaffold-app', {
      method: 'POST',
      body: { appName, config, schemas, seedData }
    })
    // Update status based on result
  }

  return { artifacts, status, progress, error, createApp }
}
```

---

### Task 8: Update ReviewPanel

**File:** `packages/crouton-designer/app/components/ReviewPanel.vue`

Major update — changes from "Download ZIP" to "Create App":

1. Use `useAppScaffold` instead of `useSchemaDownload`
2. Artifacts list shows ALL scaffold files grouped by category:
   - **Config**: package.json, nuxt.config.ts, crouton.config.js, wrangler.toml
   - **App**: app.vue, main.css, app.config.ts
   - **Server**: schema.ts, translations-ui.ts, CF stubs
   - **Schemas**: collection JSON files
   - **Seed Data**: seed JSON files (if any)
   - **Scripts**: deploy.sh
3. "Download Schemas" button → "Create App" button
4. Progress indicator during creation (writing → installing → generating → done)
5. Post-creation shows:
   - Success message with file count
   - `cd apps/{name} && pnpm dev` command
   - Deploy script instructions

---

### Task 9: i18n Keys

**File:** `packages/crouton-designer/i18n/locales/en.json`

- Phase 3: `designer.phases.seed`, `designer.phases.seedDescription`, `designer.seed.*`
- Phase 5 updates: `designer.review.createApp`, `designer.review.creating`, `designer.review.appCreated`, etc.

---

### Task 10: Update CLAUDE.md

**File:** `packages/crouton-designer/CLAUDE.md`

- Update phase diagram (1→2→3→5)
- Add new components and composables
- Add scaffold-app server endpoint
- Update architecture section

---

## Implementation Order

```
Task 1  (Types)           ← Foundation, everything depends on this
Task 2  (AI Tools)        ╗
Task 3  (Seed Prompt)     ╠═ Parallel group (Phase 3 backend)
Task 4  (SeedDataPanel)   ╝
Task 5  (Wire Phase 3)    ← Needs 2, 3, 4
Task 6  (Server Endpoint) ← Can start parallel with 2-5 (independent)
Task 7  (Client Scaffold) ← Needs 6
Task 8  (ReviewPanel)     ← Needs 7
Task 9  (i18n)            ← Parallel with any task
Task 10 (Docs)            ← Last
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Output mode | Direct write to `apps/` folder | Solo dev tool running locally. No ZIP dance |
| Auto-run CLI | Yes, after scaffold | Fully hands-off: click "Create App" → app is ready |
| Seed data storage | `ProjectConfig.seedData` JSON column | No new DB table, no new API endpoints |
| Seed file format | `schemas/{name}.seed.json` | Colocated with schema, picked up by crouton config |
| Deploy script | `scripts/deploy.sh` (written, not auto-run) | Requires wrangler auth + interactive secrets |
| Scaffold templates | Inline strings in server endpoint | Zero deps, consistent, templates are just config |
| Layer grouping | One layer per collection | Simple default, manually adjustable after scaffold |
| Package resolution | Inline logic matching `framework-packages.mjs` | Replicate the simple mapping server-side |

---

## Reference Files

| File | Why |
|------|-----|
| `apps/bike-sheds/` | Real example of deployed app — template source |
| `packages/crouton-cli/lib/module-registry.mjs` | Module definitions (package names, bundled flags) |
| `packages/crouton-cli/lib/utils/framework-packages.mjs` | Feature→extends resolution |
| `packages/crouton-designer/app/composables/useSchemaDownload.ts` | Current ZIP approach to replace |
| `packages/crouton-designer/app/composables/useSchemaExport.ts` | Schema JSON generation (reuse) |
| `packages/crouton-designer/app/pages/admin/[team]/designer/[id].vue` | Phase orchestration hub |
| `packages/crouton-designer/server/api/ai/designer-chat.post.ts` | AI tool definitions |
| `docs/briefings/app-scaffold-and-deploy-brief.md` | Scaffold/deploy requirements |
| `docs/plans/schema-designer-v2.md` | Original designer plan (Phase 3 seed data spec) |

---

## Verification

1. **Phase 3**: Phase 1 → Phase 2 (2+ collections) → Phase 3 → AI generates seed data → tables display → iterate via chat → back to Phase 2 → seed data cleared
2. **Create App**: All phases → "Create App" → `apps/{name}/` created with all files → `crouton config` ran → `pnpm dev` works
3. **Typecheck**: `npx nuxt typecheck` from `apps/crouton-designer/`
4. **Resumability**: Close browser in Phase 3, reopen → seed data restored
5. **Deploy**: `bash scripts/deploy.sh` in generated app → prompts correctly