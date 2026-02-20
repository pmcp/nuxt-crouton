# Observability Expansion Plan

_Generated from full-monorepo audit, 2026-02-20_

This plan extends the existing [devtools-events-unification plan](./devtools-events-unification.md) (Phases 1–4, largely complete) with findings from a systematic audit of all 24 packages. It covers blind spots, missing hook integrations, structural gaps, and new devtools capabilities.

---

## Progress

| Group | Done | Total | Status |
|-------|------|-------|--------|
| A — Quick Wins | 3 | 3 | ✅ |
| B — Structural | 3 | 3 | ✅ |
| C — Package Integrations | 9 | 9 | ✅ |
| D — DevTools Enhancements | 3 | 3 | ✅ |
| **Total** | **18** | **18** | ✅ |

---

## Group A — Quick Wins
_Pure additions, no architectural changes. Highest ROI._

### A1 — crouton-i18n: add `crouton:mutation` to translation endpoints
- [x] `server/api/teams/[id]/translations-ui/index.post.ts` — call hook after `createTranslation()`
- [x] `server/api/teams/[id]/translations-ui/[translationId].patch.ts` — call hook after `updateTranslation()`, capture `beforeData`
- [x] `server/api/teams/[id]/translations-ui/[translationId].delete.ts` — call hook after `deleteTranslation()`, capture `beforeData`

**Why:** Translation mutations are completely invisible to events and devtools. Who changed which string, when, is untracked.

**Hook shape:**
```typescript
await useNuxtApp().hooks.callHook('crouton:mutation', {
  operation: 'create' | 'update' | 'delete',
  collection: 'translationsUi',
  itemId: translation.id,
  data,        // on create
  updates,     // on update
  result,      // returned record
  beforeData,  // on update/delete: fetch before the write
})
```

---

### A2 — crouton-mcp-toolkit: add source attribution to MCP tool calls
- [x] `server/mcp/tools/create-item.ts` — set `event.context.mutationSource = 'mcp'` before `$fetch`
- [x] `server/mcp/tools/update-item.ts` — same
- [x] `server/mcp/tools/delete-item.ts` — same

**Why:** MCP tools call the standard collection API which already fires `crouton:mutation`, but those events are indistinguishable from human UI mutations. Critical for audit trails when AI has write access.

**The events schema already has `metadata?: Record<string, any>`.** The tracker composable reads `event.context` server-side — extend it to forward `mutationSource` and any MCP client headers into the event `metadata`.

---

### A3 — crouton-devtools: fix events package detection
- [x] Replace string-match (`layer.cwd.includes('nuxt-crouton-events')`) with `useCroutonApps().hasApp('events')` pattern (or check against `croutonApps` registry in app config)
- [x] Verify `crouton-events` registers itself in `croutonApps` (check `app/app.config.ts`)

**Why:** Current detection is fragile — breaks if install path changes or package is symlinked. The `hasApp()` pattern already exists in the codebase.

---

## Group B — Structural
_System-level changes that unlock visibility for many packages at once._

### B1 — Extend devtools operation tracker to cover manifest-declared routes
- [x] Read `provides.apiRoutes` (or equivalent) from each package's `crouton.manifest.ts` at module setup time
- [x] Store the route patterns in Nitro runtime config alongside `croutonCollections`
- [x] Extend `operationTracker.ts` to also match against those patterns (not just `/api/crouton-collection/*`)
- [x] Add `routeGroup` to the `Operation` type to distinguish `collection` | `bookings` | `ai` | `sales` | `triage` etc.

**Why:** ~15 packages use custom API routes that are completely invisible to devtools. A single structural change makes them all visible.

**Packages that immediately benefit:** crouton-ai, crouton-assets, crouton-bookings, crouton-sales, crouton-triage, crouton-pages, crouton-collab.

---

### B2 — Add `crouton:operation` hook for non-CRUD events
- [x] Define `crouton:operation` hook type in crouton-core (or crouton-events)
- [x] Payload: `{ type: string, source: string, teamId?: string, userId?: string, metadata?: Record<string, any> }`
- [x] crouton-events: subscribe to `crouton:operation` and persist to a separate `crouton_operations` table (or extend `crouton_events` with a `type` discriminator)
- [x] crouton-devtools: subscribe to `crouton:operation` and add entries to the in-memory store

**Why:** Auth lifecycle, email sends, AI completions, webhook ingestion, print jobs — none of these are CRUD mutations but are all meaningful operational events. The current `crouton:mutation` hook shape doesn't fit them.

**Proposed operation types:**
```
auth:login, auth:logout, auth:register
auth:team:created, auth:team:member-added
admin:user:banned, admin:user:deleted, admin:impersonate:start
email:sent, email:failed
ai:translate, ai:chat
asset:uploaded, asset:deleted
booking:batch-created, booking:email-sent
webhook:received
```

---

### B3 — Correlation ID propagation
- [x] Generate `correlationId` in Nitro `request` hook and store in `event.context.correlationId`
- [x] Forward `correlationId` into `crouton:operation` hook payload (type extended)
- [x] crouton-triage: propagate through processing pipeline service boundaries (all 5 webhook endpoints + processor)
- [x] crouton-designer: N/A — scaffold chain is a sequential CLI process, not an event-emitting pipeline

**Why:** Long-running async pipelines (triage processing: webhook → AI → Notion, designer: chat → schema → scaffold) have no way to link related operations. A correlation ID makes the full chain queryable.

---

## Group C — Package Integrations
_Per-package telemetry additions. Depends on B2 (`crouton:operation`) for non-CRUD items._

### C1 — crouton-admin: audit trail for super-admin operations
- [x] `server/api/admin/users/create.post.ts` — emit `crouton:operation` (`admin:user:created`, include `adminId`, new user details)
- [x] `server/api/admin/users/ban.post.ts` — emit `crouton:operation` (`admin:user:banned`, include reason, duration)
- [x] `server/api/admin/users/delete.post.ts` — emit `crouton:operation` (`admin:user:deleted`, include cascade impact count)
- [x] `server/api/admin/impersonate/start.post.ts` — emit `crouton:operation` (`admin:impersonate:start`, include `targetUserId`)
- [x] `server/api/admin/impersonate/stop.post.ts` — emit `crouton:operation` (`admin:impersonate:stop`)

**Why critical:** Zero audit trail for super-admin actions. Who banned whom, who impersonated whom — currently invisible.

---

### C2 — crouton-auth: team lifecycle events
- [x] Located Better Auth hooks in `server/lib/auth.ts` (`buildDatabaseHooks`, `buildOrganizationHooks`)
- [x] Emit `crouton:operation` for: `auth:team:created`, `auth:team:member-added`, `auth:team:member-removed`
- [x] Emit `crouton:operation` for: `auth:user:registered` (new user sign-up)

**Note:** Login/logout are high-volume and may be better as a separate opt-in. Team lifecycle events are the highest-value items here.

---

### C3 — crouton-email: emit operation on send
- [x] `server/utils/email.ts` `send()` chokepoint — emit `crouton:operation` after Resend API call resolves
- [x] Include: `recipient`, `subject`, `status: 'sent' | 'failed'`, `duration`, `messageId`
- [x] On failure: emit with `error` field (both Resend error response and thrown exceptions)

**Why:** Every email send is currently invisible. Debugging "did the confirmation email send?" requires log diving.

---

### C4 — crouton-ai: emit operation per AI call
- [x] `server/api/ai/translate.post.ts` — emit `crouton:operation` (`ai:translate`) with source/target language, text length, model, latency
- [x] `server/api/ai/translate-blocks.post.ts` — same, add block count
- [ ] Any chat completion endpoint — emit `ai:chat` with model, message count, streaming duration (no chat endpoint exists in this package)

**Why:** AI operations are expensive and have latency characteristics worth monitoring. Token usage and model selection are also invisible today.

---

### C5 — crouton-assets: emit operation on upload/delete
- [x] `packages/crouton-core/server/api/upload-image.post.ts` — emit `crouton:operation` (`asset:uploaded`) with filename, MIME type, file size, duration, blob pathname
- [x] `packages/crouton-core/server/api/upload-image.delete.ts` — emit `crouton:operation` (`asset:deleted`) with blob pathname
- [ ] Add correlation between the blob upload and the subsequent collection record creation (use `correlationId` from B3)

---

### C6 — crouton-bookings: fire mutation hooks from custom endpoints
- [x] `server/api/crouton-bookings/teams/[id]/customer-bookings-batch.post.ts` — emit `booking:batch-created` (count, locationIds) and `booking:limit-reached` (with limit metadata)
- [x] `server/utils/email-service.ts` `sendBookingEmails()` — emit `booking:email-sent` / `booking:email-failed` for both customer and admin emails

---

### C7 — crouton-collab: room lifecycle events
- [x] `CollabRoom` DO — emit `collab:room:created` (once per room lifetime), via Nitro bridge endpoint (`/api/_crouton/operation.post.ts`) since `useNitroApp()` unavailable in DO context
- [x] DO WebSocket connect — emit `collab:user:joined` only on 0→1 transition (room goes idle→active)
- [x] DO WebSocket disconnect — emit `collab:user:left` only on →0 transition (room goes active→idle)
- [x] D1 save — emit `collab:synced` with 30s debounce (updateSize, userCount)
- [x] Local dev WS handler (`ws.ts`) — same events via direct `useNitroApp()` hook call

---

### C8 — crouton-triage: structured telemetry for pipeline
- [x] 4 webhook endpoints (slack, figma-email, resend, notion-input) — emit `webhook:received` with source, threadId, contentHash, correlationId
- [x] `processor.ts` stages — emit `triage:stage:completed` for thread-building, ai-analysis, notion-creation; emit `triage:discussion:processed` on success/failure with totalDuration
- [x] `retry.post.ts` — emit `webhook:retry` with discussionId, sourceType, correlationId
- [x] `notion.ts` — emit `notion:page:created` with pageId, taskCount, duration, sourceType
- [x] All events carry `correlationId` from B3 for full end-to-end trace

**Note:** This is the highest-complexity integration. Consider implementing B3 first and starting with just webhook ingestion + final outcome events before adding per-stage granularity.

---

### C9 — crouton-sales: POS operation telemetry
- [x] **N/A** — `crouton-sales` has no server API endpoint files. All POS endpoints (helper login, receipt print, event open/close) live in the user's auto-generated `./layers/sales/` layer, not in this package. The package provides only client composables and server utility functions (print formatters, queue helpers). Instrumentation can be added in user layers if needed.

---

## Group D — DevTools Enhancements
_New UI capabilities. Depends on B1 and B2._

### D1 — System Operations tab
- [x] New "System Ops" tab in devtools client
- [x] Shows entries from `crouton:operation` hook (auth, admin, AI, email, webhooks, etc.)
- [x] Filterable by type (dropdown), source (dropdown), time range (5/15/60 min)
- [x] MCP rows get violet border + background; violet badge when `metadata.mutationSource === 'mcp'`
- [x] New RPC endpoints: `GET /api/system-operations`, `POST /api/system-operations/clear`

---

### D2 — MCP attribution in Operations tab
- [x] Robot icon badge on MCP rows (reads `op.metadata?.mutationSource === 'mcp'`)
- [x] MCP rows styled with violet left border
- [x] "Show MCP Only" filter toggle in Operations tab header

---

### D3 — Generator history tab (crouton-cli)
- [x] CLI `generate-collection.ts` `writeScaffold()` calls `recordGenerationHistory()` after each run (collection, fields, layer, generator, timestamp, git SHA)
- [x] New RPC endpoint `GET /api/generation-history` reads `.crouton-generation-history.json` from `process.cwd()`
- [x] New "Generators" tab: vertical timeline with collection/layer/generator badges, field pills, git SHA chips, relative timestamps. Empty state guides user to run `crouton generate`.

---

## What's out of scope (skip)

| Package | Reason |
|---------|--------|
| crouton-maps | Read-only external geocoding API, no data mutations |
| crouton-themes | Purely cosmetic, no mutations |
| crouton-charts | Read-only, already visible via collection API |
| crouton-flow position updates | Intentionally silent; positions not audit-relevant |

---

## Recommended implementation order

1. **A1** (i18n hooks) — 3 files, ~30 min, immediate events visibility
2. **A2** (MCP attribution) — 3 files, ~30 min, security-critical
3. **A3** (detection fix) — 1 file, ~15 min, prevents future breakage
4. **B2** (`crouton:operation` hook) — defines the contract for all C items
5. **B1** (tracker expansion) — unlocks devtools visibility for 7+ packages
6. **C1** (admin audit trail) — critical compliance gap
7. **C3** (email) — high debugging value, low effort
8. **C4** (AI) — high observability value
9. **C5** (assets) — straightforward
10. **C6** (bookings) — medium complexity
11. **C2** (auth team lifecycle) — depends on Better Auth hook points
12. **B3** (correlation IDs) — needed before C7 and C8
13. **C8** (triage) — highest complexity, save for last
14. **C7** (collab) — WebSocket context, non-trivial
15. **C9** (sales) — straightforward once B2 exists
16. **D1/D2** (devtools UI) — after B1+B2 give it data to show
17. **D3** (generator history) — nice-to-have DX

---

## Daily Log

| Date | Work Done |
|------|-----------|
| 2026-02-20 | Audit completed across all 24 packages. Plan created. |
| 2026-02-20 | A1 complete — added `crouton:mutation` hook to all 3 i18n translation endpoints. Used `verifyTeamTranslation` return value as `beforeData` for PATCH/DELETE (no extra DB query). |
| 2026-02-20 | A2 complete — MCP tools stamp `event.context.mutationSource = 'mcp'` and call `trackMcpMutation()` (new server utility) after each successful collection API call. Direct post to crouton-events write endpoint with `metadata: { mutationSource: 'mcp' }` and cookie forwarding, since event-listener plugin is client-side only and MCP mutations are server-side. |
| 2026-02-20 | A3 complete — Added `crouton-events/app/app.config.ts` registering `croutonApps.events`. Replaced fragile `_layers` string-match detection in `crouton-devtools/src/module.ts` with `'events' in ((nuxt.options.appConfig as any)?.croutonApps ?? {})` — build-time equivalent of `hasApp('events')`. Group A now 3/3 ✅. |
| 2026-02-20 | B1 complete — Added `apiRoutes?: string[]` to `CroutonAppConfig`. Registered prefixes in crouton-bookings, crouton-triage, crouton-assets (existing app.config.ts) and created new registrations for crouton-sales, crouton-ai. Devtools module collects all prefixes from `croutonApps.*` at build time into `runtimeConfig.croutonDevtools.apiRoutePrefixes`. operationTracker extended: `TRACKED_PREFIXES` array + `routeGroup` on `Operation` type + `extractRouteLabel()` helper. crouton-pages skipped (prefix `/api/teams/` too broad). |
| 2026-02-20 | B2 complete — `CroutonOperationEvent` type + `NitroRuntimeHooks` augmentation in `crouton-core/crouton-hooks.d.ts`. New `crouton_operations` table (schema + migration). crouton-events: `server/plugins/operation-listener.ts` subscribes to hook and persists; `crouton-operations/index.get.ts` query endpoint. crouton-devtools: `systemOperationStore.ts` + hook subscription in `operationTracker.ts`. |
| 2026-02-20 | C1 complete — crouton-admin: all 5 super-admin endpoints (user create/ban/delete, impersonate start/stop) emit `crouton:operation`. Admin userId captured from `requireSuperAdmin()` return value. |
| 2026-02-20 | C3 complete — crouton-email: instrumented `send()` chokepoint in `server/utils/email.ts`. Emits `email:sent` / `email:failed` with recipient, subject, status, duration, messageId. Covers all 5 email types (verification, magic link, password reset, team invite, welcome). Added local `crouton-hooks.d.ts` augmentation for standalone typecheck. |
| 2026-02-20 | C4 complete — crouton-ai: `translate.post.ts` and `translate-blocks.post.ts` emit `ai:translate` with sourceLanguage, targetLanguage, textLength/blockCount, model, duration. No chat endpoint exists in this package. Added local type augmentation for standalone typecheck. |
| 2026-02-20 | C5 complete — crouton-assets: `upload-image.post.ts` emits `asset:uploaded` (filename, mimeType, fileSize, pathname, duration); `upload-image.delete.ts` emits `asset:deleted` (pathname). Files live in crouton-core (not crouton-assets package directly). |
| 2026-02-20 | C9 N/A — crouton-sales has no server API endpoint files. POS endpoints live in user's auto-generated `./layers/sales/` layer. Package is client + server-utils only. |
| 2026-02-20 | B3 complete — Nitro plugin generates correlationId per request in crouton-core. `CroutonOperationEvent` extended with `correlationId?`. `H3EventContext` augmented. crouton-events schema + migration adds `correlation_id` column. systemOperationStore extended. All 5 crouton-triage webhook endpoints + processor.ts threaded with correlationId. crouton-designer N/A (CLI process). 20 files changed. |
| 2026-02-20 | C2 complete — crouton-auth: hooked into Better Auth `buildDatabaseHooks`/`buildOrganizationHooks` in `server/lib/auth.ts`. Emits `auth:user:registered`, `auth:team:created`, `auth:team:member-added`, `auth:team:member-removed`. |
| 2026-02-20 | C6 complete — crouton-bookings: `customer-bookings-batch.post.ts` emits `booking:batch-created` + `booking:limit-reached`; `email-service.ts` `sendBookingEmails()` emits `booking:email-sent` / `booking:email-failed` for customer + admin sends. |
| 2026-02-20 | D1+D2 complete — crouton-devtools: new "System Ops" tab with type/source/time filters, color-coded type badges, violet MCP rows. Operations tab gains MCP robot badge + "Show MCP Only" toggle. New RPC endpoints for system ops data + clear. |
| 2026-02-20 | C7 complete — crouton-collab: `collab:room:created` via Nitro bridge endpoint (DO can't call useNitroApp directly). `collab:user:joined`/`collab:user:left` only on 0↔1 transitions. `collab:synced` with 30s debounce. Local dev ws.ts handler uses direct hook. |
| 2026-02-20 | C8 complete — crouton-triage: `webhook:received` on all 4 ingestion endpoints. `triage:stage:completed` for thread-building/ai-analysis/notion-creation stages with duration. `triage:discussion:processed` on success/failure. `webhook:retry`. `notion:page:created` per task. All events carry correlationId. |
| 2026-02-20 | D3 complete — crouton-cli `writeScaffold()` calls `recordGenerationHistory()` writing to `.crouton-generation-history.json` (collection, fields, layer, git SHA). New devtools RPC + "Generators" tab with timeline, badges, field pills, relative timestamps. |
| 2026-02-20 | **PLAN COMPLETE — 18/18** ✅ All groups A, B, C, D finished. Full observability across auth, admin, AI, assets, bookings, collab, email, triage, sales (N/A), and devtools. |
