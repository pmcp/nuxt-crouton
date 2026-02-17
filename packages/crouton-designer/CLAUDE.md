# CLAUDE.md - @fyit/crouton-designer

## Package Purpose

AI-guided schema designer for Nuxt Crouton applications. Provides a multi-phase wizard (Intake → Collection Design → Seed Data → Review & Create) where users describe their app via AI chat and the system generates a complete Crouton collection schema with seed data, then scaffolds a full Nuxt app via a server-side endpoint.

## Key Files

| File | Purpose |
|------|---------|
| `app/pages/admin/[team]/designer/[id].vue` | Main designer page — phase orchestration, AI chat wiring, tool call handling |
| `app/pages/admin/[team]/designer/index.vue` | Project list page |
| `app/components/ChatPanel.vue` | Reusable AI chat panel with retry support |
| `app/components/IntakeSummaryCard.vue` | Phase 1 manual config form (app name, type, packages, etc.) |
| `app/components/CollectionEditor.vue` | Phase 2 collection/field CRUD UI |
| `app/components/FieldList.vue` | Sortable field list within a collection |
| `app/components/FieldRow.vue` | Single field editor row |
| `app/components/SeedDataPanel.vue` | Phase 3 seed data display with tabs per collection |
| `app/components/ReviewPanel.vue` | Phase 5 review, validation, and Create App trigger |
| `app/components/ValidationChecklist.vue` | Schema validation display |
| `app/components/GenerationSummary.vue` | Summary of what will be generated |
| `app/components/TwoPanelLayout.vue` | Collapsible chat + content layout |
| `app/composables/useCollectionEditor.ts` | Collection/field CRUD state management |
| `app/composables/useIntakePrompt.ts` | Builds Phase 1 AI system prompt |
| `app/composables/useCollectionDesignPrompt.ts` | Builds Phase 2 AI system prompt with tool definitions |
| `app/composables/useSeedDataPrompt.ts` | Builds Phase 3 AI system prompt for seed data generation |
| `app/composables/useSchemaValidation.ts` | Schema validation rules (errors + warnings) |
| `app/composables/useSchemaExport.ts` | Converts editor state to Crouton JSON schemas |
| `app/composables/useAppScaffold.ts` | Orchestrates Create App flow — artifact preview, POST to scaffold endpoint, step results |
| `app/composables/useFieldTypes.ts` | Field type definitions and metadata |
| `app/types/schema.ts` | ProjectConfig, DesignerProject, and related types |
| `server/api/scaffold-app.post.ts` | Server endpoint — runs CLI scaffold, writes schemas/seed, installs deps, runs doctor |
| `server/api/ai/designer-chat.post.ts` | AI chat endpoint (streams via Vercel AI SDK) |
| `i18n/locales/en.json` | All UI strings |
| `nuxt.config.ts` | Layer config — extends crouton-ai, registers components with `Designer` prefix |

## Architecture

### Phase System

```
Phase 1: Intake          Phase 2: Collections       Phase 3: Seed Data      Phase 5: Review & Create
─────────────────        ──────────────────────      ──────────────────      ──────────────────────────
Chat + Summary Card      Chat + Collection Editor    Chat + SeedDataPanel    Validation + Create App
AI sets config via       AI creates/edits via        AI generates sample     POST /api/scaffold-app →
set_app_config tool      create/update/delete tools  data via set_seed_data  CLI scaffold + schemas +
                                                                             seed + install + doctor
```

- Phases are stored on the `DesignerProject` record in the DB
- Chat messages are persisted per-phase and restored on navigation
- Backward navigation (to Phase 1) shows a warning modal
- Backward navigation from Phase 3+ to Phase 2 clears seed data (with confirmation)

### AI Integration

- Uses `useChat()` from `@fyit/crouton-ai` with `maxSteps: 5`
- Phase 1: Single tool (`set_app_config`) to update ProjectConfig
- Phase 2: Collection/field CRUD tools (`create_collection`, `add_field`, etc.)
- Phase 3: Single tool (`set_seed_data`) to replace seed data per collection
- Tool calls are handled in `onToolCall` callback, executed against `useCollectionEditor`
- On Phase 2 entry with no collections, auto-sends a proposal request
- On Phase 3 entry with no seed data, auto-sends a generation request

### Persistence

- Projects stored via `/api/designer-projects` REST endpoints (from crouton-core)
- Config auto-saves with 800ms debounce
- Seed data auto-saves with 800ms debounce (stored as JSON on project record)
- Chat messages saved on phase transitions
- Phase state persisted to DB

### Error Handling

- Chat errors show retry button in `ChatPanel`
- Phase 1 shows amber fallback banner when AI errors, pointing to manual form
- Tool call errors return `toolName` and `suggestion` for AI context

## Configuration

```typescript
// nuxt.config.ts (in consuming app)
export default defineNuxtConfig({
  extends: ['@fyit/crouton-designer']
  // Transitively extends @fyit/crouton-ai
})
```

## Common Tasks

### Add a new AI tool for Phase 2
1. Define the tool schema in `designer-chat.post.ts` under `getPhase2Tools()`
2. Add handler in `onToolCall` in `[id].vue`
3. Add corresponding method to `useCollectionEditor.ts` if needed

### Add a new AI tool for Phase 3 (Seed Data)
1. Define the tool schema in `designer-chat.post.ts` under `getPhase3Tools()`
2. Add handler in `onToolCall` in `[id].vue`
3. Update `useSeedDataPrompt.ts` if the prompt needs to reference the new tool

### Add a new intake config field
1. Add to `ProjectConfig` type in `app/types/schema.ts`
2. Add form field in `IntakeSummaryCard.vue`
3. Update `useIntakePrompt.ts` to include the field in the system prompt
4. Add tool parameter in `set_app_config` tool definition
5. Add i18n key in `i18n/locales/en.json`

### Add a validation rule
1. Add check in `useSchemaValidation.ts`
2. Add i18n key for the message in `en.json` under `designer.validation`

### Modify the scaffold/create flow
1. `server/api/scaffold-app.post.ts` — server-side orchestration (CLI scaffold, file writes, install, doctor)
2. `app/composables/useAppScaffold.ts` — client-side state (artifact preview, POST call, step result display)
3. `app/components/ReviewPanel.vue` — UI consuming `useAppScaffold`
4. The flow: ReviewPanel calls `createApp()` → composable POSTs to `/api/scaffold-app` → server runs CLI steps → returns step results → composable updates status → ReviewPanel shows results

### Modify the review/export format
1. Edit `useSchemaExport.ts` for JSON schema changes

## Dependencies

- **Extends**: `@fyit/crouton-ai` (AI chat, streaming, provider factory)
- **Peer**: `@fyit/crouton-core` (DB, team context, API utilities), `@nuxt/ui ^4.0.0`, `nuxt ^4.0.0`
- **Runtime**: `@vueuse/nuxt`
- **Server**: Node built-ins (`child_process`, `fs/promises`, `path`) — no additional deps

## Component Naming

All components auto-import with `Designer` prefix:
- `ChatPanel.vue` → `<DesignerChatPanel />`
- `CollectionEditor.vue` → `<DesignerCollectionEditor />`
- `IntakeSummaryCard.vue` → `<DesignerIntakeSummaryCard />`
- `SeedDataPanel.vue` → `<DesignerSeedDataPanel />`
- `ReviewPanel.vue` → `<DesignerReviewPanel />`
- `TwoPanelLayout.vue` → `<DesignerTwoPanelLayout />`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes (run from apps/crouton-designer)
```
