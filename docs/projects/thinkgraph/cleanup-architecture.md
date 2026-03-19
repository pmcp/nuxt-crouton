# ThinkGraph Cleanup: Deprecated Code Removal Architecture

## Summary

The PM pivot replaced canvases/nodes/decisions with projects/work-items. This document specifies exactly what to remove, what to keep, and the safe removal order.

## What STAYS (Do Not Remove)

### Collections (have DB tables, needed for data or active features)
- `canvases` — `layers/thinkgraph/collections/canvases/` + `schemas/canvas.json`
- `nodes` — `layers/thinkgraph/collections/nodes/` + `schemas/node.json`
- `projects` — `layers/thinkgraph/collections/projects/` + `schemas/project.json`
- `workItems` — `layers/thinkgraph/collections/workitems/` + `schemas/work-item.json`

### Pages (active)
- `app/pages/admin/[team]/projects.vue`
- `app/pages/admin/[team]/project/[projectId].vue`

### Components (active / new PM system)
- `ThinkgraphWorkitemsNode.vue` — work items node renderer
- `WorkItemTreeNode.vue` — tree node for projects
- `Settings/NotionSettings.vue` — settings page
- `ShortcutsHelp.vue` — keyboard shortcuts help (may be useful)

### Composables (active / new PM system)
- `useWorkDispatch.ts` — new dispatch system for work items

### Worker
- `apps/thinkgraph-worker/src/pm-tools.ts` — replacement for pi-extension.ts

### Server APIs (new)
- `server/api/teams/[id]/dispatch/webhook.post.ts`
- `server/api/teams/[id]/dispatch/work-item.post.ts`

---

## Removal Plan (8 Batches)

### Batch 1: Old Schemas
Remove these from `apps/thinkgraph/schemas/`:
- [x] `decision.json`
- [x] `graph.json`
- [x] `chat-conversation.json`
- [x] `inject-request.json`

### Batch 2: Old Collections + crouton.config.js cleanup
Remove collection directories from `layers/thinkgraph/collections/`:
- [x] `decisions/` (entire directory tree)
- [x] `graphs/` (entire directory tree)
- [x] `chatconversations/` (entire directory tree)
- [x] `injectrequests/` (entire directory tree)

Update `crouton.config.js`:
- Remove `injectRequests` from collections array (decisions, graphs, chatconversations already absent)
- Keep: `projects`, `workItems`, `canvases`, `nodes`

**After state of `crouton.config.js`:**
```js
export default {
  collections: [
    { name: 'projects', fieldsFile: './schemas/project.json' },
    { name: 'workItems', fieldsFile: './schemas/work-item.json', hierarchy: { enabled: true, parentField: 'parentId' } },
    { name: 'canvases', fieldsFile: './schemas/canvas.json' },
    { name: 'nodes', fieldsFile: './schemas/node.json', hierarchy: { enabled: true, parentField: 'parentId' } },
  ],
  targets: [{ layer: 'thinkgraph', collections: ['projects', 'workItems', 'canvases', 'nodes'] }],
  // ... rest unchanged
}
```

### Batch 3: Old Pages
Remove from `app/pages/admin/[team]/`:
- [x] `canvases.vue` — canvas list page
- [x] `canvas/[canvasId].vue` — canvas detail/editor page (1011 lines, the main old UI)
- [x] `canvas/` directory (now empty)
- [x] `graphs.vue` — graph list page

### Batch 4: Old Components
Remove from `app/components/`:
- [x] `ThinkgraphDecisionsNode.vue` — decision node renderer
- [x] `GraphEditor.vue` — main graph editor
- [x] `GraphFilters.vue` — graph filter panel
- [x] `NodeDetail.vue` — node detail sidebar
- [x] `SelectionBar.vue` — multi-select action bar
- [x] `QuickAdd.vue` — quick-add node dialog
- [x] `PathTypeModal.vue` — path type selection modal
- [x] `CanvasHighlight.vue` — canvas highlight overlay
- [x] `ContextInspector.vue` — context debug inspector
- [x] `SessionPanel.vue` — agent session panel
- [x] `ChatPanel.vue` — chat panel
- [x] `DispatchModal.vue` — dispatch modal (old node-based dispatch)
- [x] `ThinkingPathPanel.vue` — thinking path panel (references ThinkgraphDecision type)
- [x] `TerminalPanel.vue` — terminal panel (references old node system)

**Keep:**
- `ThinkgraphNodesNode.vue` — **REMOVE** (only used by canvas/[canvasId].vue which is being removed; no other references). The brief said "keep as stub if canvas page is still used" — since we're removing the canvas page, remove this too.

### Batch 5: Old Composables
Remove from `app/composables/`:
- [x] `useDecisionGraph.ts`
- [x] `useDecisionParser.ts`
- [x] `useBranchColors.ts`
- [x] `useNodeContextGenerator.ts`
- [x] `useContextGenerator.ts`
- [x] `useNodeContext.ts`
- [x] `useGraphCanvas.ts`
- [x] `useGraphActions.ts`
- [x] `useGraphPanels.ts`
- [x] `useGraphSelection.ts`
- [x] `useGraphFilters.ts`
- [x] `useGraphShortcuts.ts`
- [x] `useAgentSession.ts`
- [x] `useThinkgraphContext.ts` — provides context injection for old canvas page only

### Batch 6: Worker pi-extension.ts
Remove from `apps/thinkgraph-worker/src/`:
- [x] `pi-extension.ts` — replaced by `pm-tools.ts`

**Update** `apps/thinkgraph-worker/src/session-manager.ts`:
- Line 21: Remove `import { createThinkGraphTools } from './pi-extension.js'`
- Replace any usage of `createThinkGraphTools` with equivalent from `pm-tools.ts` (or remove if already migrated)

### Batch 7: Old Dispatch Services & Server APIs
Remove:
- [x] `server/utils/dispatch-services/` — entire directory (17 service files)
- [x] `server/utils/dispatch-registry.ts`
- [x] `server/plugins/dispatch-services.ts`
- [x] `server/api/teams/[id]/thinkgraph-decisions/` — entire directory (10 API endpoints for old decision dispatch, chat, expand, etc.)

These are all tied to the old canvas/decision system. The new PM dispatch goes through `server/api/teams/[id]/dispatch/work-item.post.ts`.

### Batch 8: Sidebar & Config Cleanup
Update `app/app.config.ts`:
1. Remove imports for deleted collections:
   - `thinkgraphDecisionsConfig`
   - `thinkgraphChatConversationsConfig`
   - `thinkgraphGraphsConfig`
   - `thinkgraphInjectRequestsConfig`
2. Remove from `croutonCollections`:
   - `thinkgraphDecisions`
   - `thinkgraphChatConversations`
   - `thinkgraphGraphs`
   - `thinkgraphInjectRequests`
3. Remove "Canvases" from `adminRoutes`:
   ```ts
   // REMOVE:
   { path: '/canvases', label: 'Canvases', icon: 'i-lucide-layout-dashboard' }
   ```

**Also clean up:**
- `app/utils/thinkgraph-config.ts` — check if only used by removed components. If so, remove it too.

**After state of `app.config.ts`:**
```ts
import { thinkgraphCanvasesConfig } from '../layers/thinkgraph/collections/canvases/app/composables/useThinkgraphCanvases'
import { thinkgraphNodesConfig } from '../layers/thinkgraph/collections/nodes/app/composables/useThinkgraphNodes'
import { thinkgraphProjectsConfig } from '../layers/thinkgraph/collections/projects/app/composables/useThinkgraphProjects'
import { thinkgraphWorkItemsConfig } from '../layers/thinkgraph/collections/workitems/app/composables/useThinkgraphWorkItems'

export default defineAppConfig({
  croutonCollections: {
    thinkgraphCanvases: thinkgraphCanvasesConfig,
    thinkgraphNodes: thinkgraphNodesConfig,
    thinkgraphProjects: thinkgraphProjectsConfig,
    thinkgraphWorkItems: thinkgraphWorkItemsConfig,
  },
  croutonApps: {
    thinkgraph: {
      id: 'thinkgraph',
      name: 'ThinkGraph',
      icon: 'i-lucide-brain-circuit',
      adminRoutes: [
        { path: '/projects', label: 'Projects', icon: 'i-lucide-folder-kanban' },
      ],
      dashboardRoutes: [],
      settingsRoutes: [],
    },
  },
})
```

---

## Dependency Graph (Removal Order Matters)

```
Batch 1 (schemas) ──→ no deps, safe first
Batch 2 (collections) ──→ depends on schemas being gone
Batch 3 (pages) ──→ imports components + composables (remove pages first so composable auto-imports don't error)
Batch 4 (components) ──→ imported by pages (pages removed in batch 3)
Batch 5 (composables) ──→ imported by components (components removed in batch 4)
Batch 6 (worker) ──→ independent, can go anytime
Batch 7 (server APIs) ──→ independent of frontend
Batch 8 (config) ──→ must go LAST (references collections)
```

**Run `pnpm typecheck` after each batch.** Fix any remaining import references immediately.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Canvas/nodes collections still have DB data | Keeping collection dirs + schemas, just removing UI |
| `thinkgraph-config.ts` used by kept code | Check references — only used by removed canvas components, safe to remove |
| `session-manager.ts` imports `pi-extension.ts` | Must update import to use `pm-tools.ts` or remove the import |
| `translationsUiConfig` import in app.config.ts | Keep — it's from crouton-i18n, unrelated to cleanup |

## File Count Summary

| Category | Files Removed |
|----------|--------------|
| Schemas | 4 |
| Collection dirs | 4 dirs (~40+ files) |
| Pages | 3 files + 1 dir |
| Components | 15 files |
| Composables | 14 files |
| Worker | 1 file |
| Server APIs | 10+ endpoint files |
| Server utils | 17 dispatch services + registry + plugin |
| Config updates | 2 files (edited, not removed) |
| **Total** | **~100+ files removed** |
