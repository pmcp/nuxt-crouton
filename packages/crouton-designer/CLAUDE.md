# CLAUDE.md - @fyit/crouton-designer

## Package Purpose

AI-guided schema designer for Nuxt Crouton applications. Provides a multi-phase wizard (Intake → Collection Design → Review & Generate) where users describe their app via AI chat and the system generates a complete Crouton collection schema as a downloadable ZIP.

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
| `app/components/ReviewPanel.vue` | Phase 5 review, validation, and ZIP download |
| `app/components/ValidationChecklist.vue` | Schema validation display |
| `app/components/GenerationSummary.vue` | Summary of what will be generated |
| `app/components/TwoPanelLayout.vue` | Collapsible chat + content layout |
| `app/composables/useCollectionEditor.ts` | Collection/field CRUD state management |
| `app/composables/useIntakePrompt.ts` | Builds Phase 1 AI system prompt |
| `app/composables/useCollectionDesignPrompt.ts` | Builds Phase 2 AI system prompt with tool definitions |
| `app/composables/useSchemaValidation.ts` | Schema validation rules (errors + warnings) |
| `app/composables/useSchemaExport.ts` | Converts editor state to Crouton JSON schemas |
| `app/composables/useSchemaDownload.ts` | ZIP generation with fflate |
| `app/composables/useFieldTypes.ts` | Field type definitions and metadata |
| `app/types/schema.ts` | ProjectConfig, DesignerProject, and related types |
| `server/api/ai/designer-chat.post.ts` | AI chat endpoint (streams via Vercel AI SDK) |
| `i18n/locales/en.json` | All UI strings |
| `nuxt.config.ts` | Layer config — extends crouton-ai, registers components with `Designer` prefix |

## Architecture

### Phase System

```
Phase 1: Intake          Phase 2: Collections       Phase 5: Review
─────────────────        ──────────────────────      ───────────────────
Chat + Summary Card      Chat + Collection Editor    Validation + ZIP
AI sets config via       AI creates/edits via        User downloads schemas
set_app_config tool      create/update/delete tools
```

- Phases are stored on the `DesignerProject` record in the DB
- Chat messages are persisted per-phase and restored on navigation
- Backward navigation (to Phase 1) shows a warning modal

### AI Integration

- Uses `useChat()` from `@fyit/crouton-ai` with `maxSteps: 5`
- Phase 1: Single tool (`set_app_config`) to update ProjectConfig
- Phase 2: Collection/field CRUD tools (`create_collection`, `add_field`, etc.)
- Tool calls are handled in `onToolCall` callback, executed against `useCollectionEditor`
- On Phase 2 entry with no collections, auto-sends a proposal request

### Persistence

- Projects stored via `/api/designer-projects` REST endpoints (from crouton-core)
- Config auto-saves with 800ms debounce
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
1. Define the tool schema in `useCollectionDesignPrompt.ts`
2. Add handler in `onToolCall` in `[id].vue`
3. Add corresponding method to `useCollectionEditor.ts` if needed

### Add a new intake config field
1. Add to `ProjectConfig` type in `app/types/schema.ts`
2. Add form field in `IntakeSummaryCard.vue`
3. Update `useIntakePrompt.ts` to include the field in the system prompt
4. Add tool parameter in `set_app_config` tool definition
5. Add i18n key in `i18n/locales/en.json`

### Add a validation rule
1. Add check in `useSchemaValidation.ts`
2. Add i18n key for the message in `en.json` under `designer.validation`

### Modify the review/export format
1. Edit `useSchemaExport.ts` for JSON schema changes
2. Edit `useSchemaDownload.ts` for ZIP structure changes

## Dependencies

- **Extends**: `@fyit/crouton-ai` (AI chat, streaming, provider factory)
- **Peer**: `@fyit/crouton-core` (DB, team context, API utilities), `@nuxt/ui ^4.0.0`, `nuxt ^4.0.0`
- **Runtime**: `fflate` (ZIP compression), `@vueuse/nuxt`

## Component Naming

All components auto-import with `Designer` prefix:
- `ChatPanel.vue` → `<DesignerChatPanel />`
- `CollectionEditor.vue` → `<DesignerCollectionEditor />`
- `IntakeSummaryCard.vue` → `<DesignerIntakeSummaryCard />`
- `ReviewPanel.vue` → `<DesignerReviewPanel />`
- `TwoPanelLayout.vue` → `<DesignerTwoPanelLayout />`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes (run from apps/crouton-designer)
```
